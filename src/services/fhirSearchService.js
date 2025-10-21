// import fhirService from './fhirService.js';
// import Patient from '../models/Patient.js';
// import Doctor from '../models/Doctor.js';
// import Appointment from '../models/Appointment.js';
// import { generatePhoneVariations, normalizePhoneNumber } from '../utils/phoneUtils.js';

// /**
//  * Service to search FHIR server and import data to MongoDB
//  */
// class FHIRSearchService {

//     /**
//      * Search for patient by phone number in FHIR server
//      * If found, import to MongoDB
//      * ✅ UPDATED: Now tries multiple phone formats to find existing patients
//      */
//     async findOrImportPatientByPhone(phoneNumber) {
//         try {
//             console.log(`🔍 Searching for patient with phone: ${phoneNumber}`);

//             // ==================== GENERATE PHONE VARIATIONS ====================
//             // This handles cases where user enters phone without country code
//             const phoneVariations = generatePhoneVariations(phoneNumber);
//             console.log(`   Trying phone formats: ${phoneVariations.join(', ')}`);

//             // ==================== STEP 1: CHECK MONGODB WITH ALL VARIATIONS ====================
//             let patient = null;
            
//             // Try to find patient with any of the phone variations
//             for (const phoneVariation of phoneVariations) {
//                 patient = await Patient.findOne({ phone: phoneVariation });
//                 if (patient) {
//                     console.log(`✅ Patient found in MongoDB with phone: ${phoneVariation}`);
//                     break;
//                 }
//             }

//             // If found and already synced, return immediately
//             if (patient && patient.fhirSyncStatus === 'synced') {
//                 console.log(`   Patient already synced: ${patient._id}`);
//                 return {
//                     success: true,
//                     source: 'mongodb',
//                     patient: patient
//                 };
//             }

//             // ==================== STEP 2: SEARCH FHIR WITH ALL VARIATIONS ====================
//             let fhirSearchResult = null;
            
//             for (const phoneVariation of phoneVariations) {
//                 console.log(`   Searching FHIR with: ${phoneVariation}`);
                
//                 fhirSearchResult = await fhirService.searchPatients({
//                     telecom: phoneVariation
//                 });

//                 if (fhirSearchResult.success && fhirSearchResult.total > 0) {
//                     console.log(`✅ Patient found in FHIR with phone: ${phoneVariation}`);
//                     break;
//                 }
//             }

//             // ==================== STEP 3: HANDLE SEARCH RESULTS ====================
//             if (!fhirSearchResult || !fhirSearchResult.success || fhirSearchResult.total === 0) {
//                 console.log(`❌ No patient found in FHIR with any phone format`);

//                 // Return existing MongoDB patient if exists
//                 if (patient) {
//                     console.log(`   Returning existing MongoDB patient (not in FHIR)`);
//                     return {
//                         success: true,
//                         source: 'mongodb_only',
//                         patient: patient
//                     };
//                 }

//                 return {
//                     success: false,
//                     message: 'Patient not found in FHIR or MongoDB'
//                 };
//             }

//             // ==================== STEP 4: IMPORT FROM FHIR ====================
//             const fhirPatient = fhirSearchResult.entries[0].resource;
//             console.log(`📥 Importing patient from FHIR: ${fhirPatient.id}`);

//             // Convert FHIR Patient to MongoDB format
//             const mongoPatientData = this.convertFHIRPatientToMongo(fhirPatient);
            
//             // Normalize the phone number for consistency
//             if (mongoPatientData.phone) {
//                 mongoPatientData.phone = normalizePhoneNumber(mongoPatientData.phone);
//             }

//             if (patient) {
//                 // Update existing patient
//                 Object.assign(patient, mongoPatientData);
//                 patient.fhirId = fhirPatient.id;
//                 patient.fhirSyncStatus = 'synced';
//                 patient.fhirLastSync = new Date();
//                 patient._skipFhirSync = true; // Prevent re-sync to FHIR
//                 await patient.save();
//                 console.log(`✅ Updated existing MongoDB patient from FHIR: ${patient._id}`);
//             } else {
//                 // Create new patient in MongoDB
//                 patient = new Patient({
//                     ...mongoPatientData,
//                     fhirId: fhirPatient.id,
//                     fhirSyncStatus: 'synced',
//                     fhirLastSync: new Date()
//                 });
//                 patient._skipFhirSync = true; // Prevent re-sync to FHIR
//                 await patient.save();
//                 console.log(`✅ Created new MongoDB patient from FHIR: ${patient._id}`);
//             }

//             return {
//                 success: true,
//                 source: 'fhir',
//                 patient: patient,
//                 fhirPatient: fhirPatient
//             };

//         } catch (error) {
//             console.error('❌ Error in findOrImportPatientByPhone:', error);

//             // Fallback: Try MongoDB with all phone variations
//             const phoneVariations = generatePhoneVariations(phoneNumber);
//             for (const phoneVariation of phoneVariations) {
//                 const patient = await Patient.findOne({ phone: phoneVariation });
//                 if (patient) {
//                     console.log(`⚠️ Fallback: Found patient in MongoDB: ${patient._id}`);
//                     return {
//                         success: true,
//                         source: 'mongodb_fallback',
//                         patient: patient,
//                         error: error.message
//                     };
//                 }
//             }

//             return {
//                 success: false,
//                 error: error.message
//             };
//         }
//     }

//     /**
//      * Convert FHIR Patient resource to MongoDB Patient format
//      */
//     convertFHIRPatientToMongo(fhirPatient) {
//         const name = fhirPatient.name?.[0] || {};
//         const telecom = fhirPatient.telecom || [];

//         // Extract phone
//         const phoneObj = telecom.find(t => t.system === 'phone');
//         const phone = phoneObj?.value || '';

//         // Extract email
//         const emailObj = telecom.find(t => t.system === 'email');
//         const email = emailObj?.value || '';

//         // Extract address
//         const address = fhirPatient.address?.[0] || {};

//         return {
//             firstName: name.given?.[0] || '',
//             lastName: name.family || '',
//             phone: phone,
//             email: email,
//             dob: fhirPatient.birthDate ? new Date(fhirPatient.birthDate) : undefined,
//             gender: fhirPatient.gender,
//             address: {
//                 street: address.line?.[0] || '',
//                 city: address.city || '',
//                 state: address.state || '',
//                 zipCode: address.postalCode || '',
//                 country: address.country || ''
//             }
//         };
//     }

//     /**
//      * Search for practitioner by name in FHIR server
//      * If found, import to MongoDB
//      */
//     async findOrImportDoctorByName(doctorName) {
//         try {
//             console.log(`Searching FHIR for practitioner: ${doctorName}`);

//             // First check MongoDB
//             let doctor = await Doctor.findOne({ name: doctorName });
//             if (doctor && doctor.fhirSyncStatus === 'synced') {
//                 console.log(`Doctor found in MongoDB (already synced): ${doctor._id}`);
//                 return {
//                     success: true,
//                     source: 'mongodb',
//                     doctor: doctor
//                 };
//             }

//             // Search FHIR server by name
//             const fhirSearchResult = await fhirService.searchPractitioners({
//                 name: doctorName
//             });

//             if (!fhirSearchResult.success || fhirSearchResult.total === 0) {
//                 console.log(`No practitioner found in FHIR for: ${doctorName}`);

//                 if (doctor) {
//                     return {
//                         success: true,
//                         source: 'mongodb_only',
//                         doctor: doctor
//                     };
//                 }

//                 return {
//                     success: false,
//                     message: 'Practitioner not found in FHIR or MongoDB'
//                 };
//             }

//             // Practitioner found in FHIR
//             const fhirPractitioner = fhirSearchResult.entries[0].resource;
//             console.log(`Practitioner found in FHIR: ${fhirPractitioner.id}`);

//             const mongoDoctorData = this.convertFHIRPractitionerToMongo(fhirPractitioner);

//             if (doctor) {
//                 Object.assign(doctor, mongoDoctorData);
//                 doctor.fhirId = fhirPractitioner.id;
//                 doctor.fhirSyncStatus = 'synced';
//                 doctor.fhirLastSync = new Date();
//                 doctor._skipFhirSync = true;
//                 await doctor.save();
//                 console.log(`Updated existing MongoDB doctor from FHIR: ${doctor._id}`);
//             } else {
//                 doctor = new Doctor({
//                     ...mongoDoctorData,
//                     fhirId: fhirPractitioner.id,
//                     fhirSyncStatus: 'synced',
//                     fhirLastSync: new Date()
//                 });
//                 doctor._skipFhirSync = true;
//                 await doctor.save();
//                 console.log(`Created new MongoDB doctor from FHIR: ${doctor._id}`);
//             }

//             return {
//                 success: true,
//                 source: 'fhir',
//                 doctor: doctor,
//                 fhirPractitioner: fhirPractitioner
//             };

//         } catch (error) {
//             console.error('Error in findOrImportDoctorByName:', error);

//             const doctor = await Doctor.findOne({ name: doctorName });
//             if (doctor) {
//                 return {
//                     success: true,
//                     source: 'mongodb_fallback',
//                     doctor: doctor,
//                     error: error.message
//                 };
//             }

//             return {
//                 success: false,
//                 error: error.message
//             };
//         }
//     }

//     /**
//      * Convert FHIR Practitioner to MongoDB Doctor format
//      */
//     convertFHIRPractitionerToMongo(fhirPractitioner) {
//         const name = fhirPractitioner.name?.[0] || {};
//         const telecom = fhirPractitioner.telecom || [];

//         const phoneObj = telecom.find(t => t.system === 'phone');
//         const phone = phoneObj?.value || '';

//         const emailObj = telecom.find(t => t.system === 'email');
//         const email = emailObj?.value || '';

//         // Extract specialty
//         const specialty = fhirPractitioner.qualification?.[0]?.code?.coding?.[0]?.display || '';

//         return {
//             name: name.text || `${name.given?.join(' ') || ''} ${name.family || ''}`.trim(),
//             phone: phone,
//             email: email,
//             specialty: specialty
//         };
//     }

//     /**
//      * Search FHIR for practitioners (for general search)
//      */
//     async searchPractitioners(searchParams) {
//         try {
//             return await fhirService.searchPractitioners(searchParams);
//         } catch (error) {
//             console.error('Error searching practitioners in FHIR:', error);
//             return { success: false, error: error.message };
//         }
//     }
// }

// export default new FHIRSearchService();


import fhirService from './fhirService.js';
import Patient from '../models/Patient.js';
import Doctor from '../models/Doctor.js';
import Appointment from '../models/Appointment.js';
import { generatePhoneVariations, normalizePhoneNumber } from '../utils/phoneUtils.js';

/**
 * Service to search FHIR server and import data to MongoDB
 * ✅ CORRECTED: Always checks EMR/FHIR FIRST (single source of truth)
 */
class FHIRSearchService {

    /**
     * Search for patient by phone number in FHIR/EMR server FIRST
     * MongoDB is only used as a cache/fallback
     * ✅ EMR is the authoritative source
     */
    async findOrImportPatientByPhone(phoneNumber) {
        try {
            console.log(`🔍 Searching for patient with phone: ${phoneNumber}`);

            // Generate phone variations (with/without country code)
            const phoneVariations = generatePhoneVariations(phoneNumber);
            console.log(`   Phone formats: ${phoneVariations.join(', ')}`);

            // ==================== STEP 1: SEARCH EMR/FHIR FIRST ====================
            // ✅ ALWAYS check EMR first - it's the single source of truth
            let fhirSearchResult = null;
            
            console.log(`📡 Checking EMR/FHIR (authoritative source)...`);
            for (const phoneVariation of phoneVariations) {
                console.log(`   Trying FHIR with: ${phoneVariation}`);
                
                fhirSearchResult = await fhirService.searchPatients({
                    telecom: phoneVariation
                });

                if (fhirSearchResult.success && fhirSearchResult.total > 0) {
                    console.log(`✅ Patient found in EMR/FHIR with phone: ${phoneVariation}`);
                    break;
                }
            }

            // ==================== STEP 2: PATIENT FOUND IN EMR ====================
            if (fhirSearchResult && fhirSearchResult.success && fhirSearchResult.total > 0) {
                const fhirPatient = fhirSearchResult.entries[0].resource;
                console.log(`📥 Patient found in EMR: ${fhirPatient.id}`);

                // Convert FHIR Patient to MongoDB format
                const mongoPatientData = this.convertFHIRPatientToMongo(fhirPatient);
                
                // Normalize the phone number for consistency
                if (mongoPatientData.phone) {
                    mongoPatientData.phone = normalizePhoneNumber(mongoPatientData.phone);
                }

                // Check if patient already exists in MongoDB
                let patient = null;
                for (const phoneVariation of phoneVariations) {
                    patient = await Patient.findOne({ phone: phoneVariation });
                    if (patient) {
                        console.log(`   Found existing MongoDB record: ${patient._id}`);
                        break;
                    }
                }

                // if (patient) {
                //     // Update existing MongoDB patient with latest EMR data
                //     console.log(`📝 Updating MongoDB with latest EMR data...`);
                //     Object.assign(patient, mongoPatientData);
                //     patient.fhirId = fhirPatient.id;
                //     patient.fhirSyncStatus = 'synced';
                //     patient.fhirLastSync = new Date();
                //     patient._skipFhirSync = true; // Prevent re-sync to FHIR
                //     await patient.save();
                //     console.log(`✅ Updated MongoDB patient from EMR: ${patient._id}`);
                // } else {
                //     // Create new patient in MongoDB from EMR data
                //     console.log(`📝 Creating new MongoDB record from EMR data...`);
                //     patient = new Patient({
                //         ...mongoPatientData,
                //         fhirId: fhirPatient.id,
                //         fhirSyncStatus: 'synced',
                //         fhirLastSync: new Date()
                //     });
                //     patient._skipFhirSync = true;
                //     await patient.save();
                //     console.log(`✅ Created MongoDB patient from EMR: ${patient._id}`);
                // }

                return {
                    success: true,
                    source: 'fhir',  // Always 'fhir' when found in EMR
                    patient: patient,
                    fhirPatient: fhirPatient
                };
            }

            // ==================== STEP 3: NOT IN EMR - CHECK MONGODB AS FALLBACK ====================
            console.log(`❌ Patient not found in EMR/FHIR`);
            console.log(`🔍 Checking MongoDB as fallback...`);
            
            let patient = null;
            for (const phoneVariation of phoneVariations) {
                patient = await Patient.findOne({ phone: phoneVariation });
                if (patient) {
                    console.log(`⚠️ Found in MongoDB only (not synced with EMR): ${patient._id}`);
                    break;
                }
            }

            if (patient) {
                return {
                    success: true,
                    source: 'mongodb_only',  // Not in EMR
                    patient: patient,
                    warning: 'Patient not found in EMR - using local MongoDB record'
                };
            }

            // ==================== STEP 4: NOT FOUND ANYWHERE ====================
            console.log(`❌ Patient not found in EMR or MongoDB`);
            return {
                success: false,
                message: 'Patient not found in FHIR/EMR or MongoDB'
            };

        } catch (error) {
            console.error('❌ Error in findOrImportPatientByPhone:', error);

            // ==================== ERROR FALLBACK: CHECK MONGODB ====================
            console.log(`⚠️ EMR search failed, checking MongoDB as emergency fallback...`);
            
            const phoneVariations = generatePhoneVariations(phoneNumber);
            for (const phoneVariation of phoneVariations) {
                const patient = await Patient.findOne({ phone: phoneVariation });
                if (patient) {
                    console.log(`⚠️ Fallback: Found patient in MongoDB: ${patient._id}`);
                    return {
                        success: true,
                        source: 'mongodb_fallback',
                        patient: patient,
                        error: error.message,
                        warning: 'EMR unavailable - using cached MongoDB data'
                    };
                }
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

            // Search FHIR server by name
            const fhirSearchResult = await fhirService.searchPractitioners({
                name: doctorName
            });

            if (!fhirSearchResult.success || fhirSearchResult.total === 0) {
                console.log(`No practitioner found in FHIR for: ${doctorName}`);

                // Fallback to MongoDB
                const doctor = await Doctor.findOne({ name: doctorName });
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

            // Check if exists in MongoDB
            let doctor = await Doctor.findOne({ name: doctorName });
            
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