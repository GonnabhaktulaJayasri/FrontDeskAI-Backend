import fhirService from './fhirService.js';
import Patient from '../models/Patient.js';
import Doctor from '../models/Doctor.js';
import Appointment from '../models/Appointment.js';

/**
 * Service to search FHIR server and import data to MongoDB
 */
class FHIRSearchService {

    /**
     * Search for patient by phone number in FHIR server
     * If found, import to MongoDB
     */
    async findOrImportPatientByPhone(phoneNumber) {
        try {
            console.log(`Searching FHIR for patient with phone: ${phoneNumber}`);

            // First check MongoDB
            let patient = await Patient.findOne({ phone: phoneNumber });
            if (patient && patient.fhirSyncStatus === 'synced') {
                console.log(`Patient found in MongoDB (already synced): ${patient._id}`);
                return {
                    success: true,
                    source: 'mongodb',
                    patient: patient
                };
            }

            // Search FHIR server by phone number
            const fhirSearchResult = await fhirService.searchPatients({
                telecom: phoneNumber
            });

            if (!fhirSearchResult.success || fhirSearchResult.total === 0) {
                console.log(`No patient found in FHIR for phone: ${phoneNumber}`);

                // Return existing MongoDB patient if exists
                if (patient) {
                    return {
                        success: true,
                        source: 'mongodb_only',
                        patient: patient
                    };
                }

                return {
                    success: false,
                    message: 'Patient not found in FHIR or MongoDB'
                };
            }

            // Patient found in FHIR - import to MongoDB
            const fhirPatient = fhirSearchResult.entries[0].resource;
            console.log(`Patient found in FHIR: ${fhirPatient.id}`);

            // Convert FHIR Patient to MongoDB format
            const mongoPatientData = this.convertFHIRPatientToMongo(fhirPatient);

            if (patient) {
                // Update existing patient
                Object.assign(patient, mongoPatientData);
                patient.fhirId = fhirPatient.id;
                patient.fhirSyncStatus = 'synced';
                patient.fhirLastSync = new Date();
                patient._skipFhirSync = true; // Prevent re-sync to FHIR
                await patient.save();
                console.log(`Updated existing MongoDB patient from FHIR: ${patient._id}`);
            } else {
                // Create new patient in MongoDB
                patient = new Patient({
                    ...mongoPatientData,
                    fhirId: fhirPatient.id,
                    fhirSyncStatus: 'synced',
                    fhirLastSync: new Date()
                });
                patient._skipFhirSync = true; // Prevent re-sync to FHIR
                await patient.save();
                console.log(`Created new MongoDB patient from FHIR: ${patient._id}`);
            }

            return {
                success: true,
                source: 'fhir',
                patient: patient,
                fhirPatient: fhirPatient
            };

        } catch (error) {
            console.error('Error in findOrImportPatientByPhone:', error);

            // Fallback to MongoDB
            const patient = await Patient.findOne({ phone: phoneNumber });
            if (patient) {
                return {
                    success: true,
                    source: 'mongodb_fallback',
                    patient: patient,
                    error: error.message
                };
            }

            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Convert FHIR Patient resource to MongoDB Patient format
     */
    convertFHIRPatientToMongo(fhirPatient) {
        const name = fhirPatient.name?.[0] || {};
        const telecom = fhirPatient.telecom || [];

        // Extract phone
        const phoneObj = telecom.find(t => t.system === 'phone');
        const phone = phoneObj?.value || '';

        // Extract email
        const emailObj = telecom.find(t => t.system === 'email');
        const email = emailObj?.value || '';

        // Extract address
        const address = fhirPatient.address?.[0] || {};

        return {
            firstName: name.given?.[0] || '',
            lastName: name.family || '',
            phone: phone,
            email: email,
            dob: fhirPatient.birthDate ? new Date(fhirPatient.birthDate) : undefined,
            gender: fhirPatient.gender,
            address: {
                street: address.line?.[0] || '',
                city: address.city || '',
                state: address.state || '',
                zipCode: address.postalCode || '',
                country: address.country || ''
            }
        };
    }

    /**
     * Search for practitioner by name in FHIR server
     * If found, import to MongoDB
     */
    async findOrImportDoctorByName(doctorName) {
        try {
            console.log(`Searching FHIR for practitioner: ${doctorName}`);

            // First check MongoDB
            let doctor = await Doctor.findOne({ name: doctorName });
            if (doctor && doctor.fhirSyncStatus === 'synced') {
                console.log(`Doctor found in MongoDB (already synced): ${doctor._id}`);
                return {
                    success: true,
                    source: 'mongodb',
                    doctor: doctor
                };
            }

            // Search FHIR server by name
            const fhirSearchResult = await fhirService.searchPractitioners({
                name: doctorName
            });

            if (!fhirSearchResult.success || fhirSearchResult.total === 0) {
                console.log(`No practitioner found in FHIR for: ${doctorName}`);

                if (doctor) {
                    return {
                        success: true,
                        source: 'mongodb_only',
                        doctor: doctor
                    };
                }

                return {
                    success: false,
                    message: 'Practitioner not found in FHIR or MongoDB'
                };
            }

            // Practitioner found in FHIR
            const fhirPractitioner = fhirSearchResult.entries[0].resource;
            console.log(`Practitioner found in FHIR: ${fhirPractitioner.id}`);

            const mongoDoctorData = this.convertFHIRPractitionerToMongo(fhirPractitioner);

            if (doctor) {
                Object.assign(doctor, mongoDoctorData);
                doctor.fhirId = fhirPractitioner.id;
                doctor.fhirSyncStatus = 'synced';
                doctor.fhirLastSync = new Date();
                doctor._skipFhirSync = true;
                await doctor.save();
                console.log(`Updated existing MongoDB doctor from FHIR: ${doctor._id}`);
            } else {
                doctor = new Doctor({
                    ...mongoDoctorData,
                    fhirId: fhirPractitioner.id,
                    fhirSyncStatus: 'synced',
                    fhirLastSync: new Date()
                });
                doctor._skipFhirSync = true;
                await doctor.save();
                console.log(`Created new MongoDB doctor from FHIR: ${doctor._id}`);
            }

            return {
                success: true,
                source: 'fhir',
                doctor: doctor,
                fhirPractitioner: fhirPractitioner
            };

        } catch (error) {
            console.error('Error in findOrImportDoctorByName:', error);

            const doctor = await Doctor.findOne({ name: doctorName });
            if (doctor) {
                return {
                    success: true,
                    source: 'mongodb_fallback',
                    doctor: doctor,
                    error: error.message
                };
            }

            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Convert FHIR Practitioner to MongoDB Doctor format
     */
    convertFHIRPractitionerToMongo(fhirPractitioner) {
        const name = fhirPractitioner.name?.[0] || {};
        const telecom = fhirPractitioner.telecom || [];

        const phoneObj = telecom.find(t => t.system === 'phone');
        const phone = phoneObj?.value || '';

        const emailObj = telecom.find(t => t.system === 'email');
        const email = emailObj?.value || '';

        // Extract specialty
        const specialty = fhirPractitioner.qualification?.[0]?.code?.coding?.[0]?.display || '';

        return {
            name: name.text || `${name.given?.join(' ') || ''} ${name.family || ''}`.trim(),
            phone: phone,
            email: email,
            specialty: specialty
        };
    }

    /**
     * Search FHIR for practitioners (for general search)
     */
    async searchPractitioners(searchParams) {
        try {
            return await fhirService.searchPractitioners(searchParams);
        } catch (error) {
            console.error('Error searching practitioners in FHIR:', error);
            return { success: false, error: error.message };
        }
    }
}

export default new FHIRSearchService();