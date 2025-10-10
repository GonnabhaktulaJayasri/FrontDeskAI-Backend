import axios from 'axios';
import 'dotenv/config';

const FHIR_BASE_URL = process.env.FHIR_BASE_URL || 'https://hapi.fhir.org/baseR4';

class FHIRService {
    constructor() {
        this.baseURL = FHIR_BASE_URL;
        this.axios = axios.create({
            baseURL: this.baseURL,
            headers: {
                'Content-Type': 'application/fhir+json',
                'Accept': 'application/fhir+json'
            }
        });
    }

    // ==================== PATIENT OPERATIONS ====================
    
    /**
     * Convert MongoDB Patient to FHIR Patient resource
     */
    convertToFHIRPatient(mongoPatient) {
        const fhirPatient = {
            resourceType: 'Patient',
            id: mongoPatient.fhirId || undefined,
            identifier: [{
                system: 'http://your-hospital.com/patient-id',
                value: mongoPatient._id.toString()
            }],
            name: [{
                use: 'official',
                family: mongoPatient.lastName,
                given: [mongoPatient.firstName]
            }],
            telecom: [{
                system: 'phone',
                value: mongoPatient.phone,
                use: 'mobile'
            }],
            birthDate: mongoPatient.dob ? new Date(mongoPatient.dob).toISOString().split('T')[0] : undefined,
            active: true
        };

        // Add email if exists
        if (mongoPatient.email) {
            fhirPatient.telecom.push({
                system: 'email',
                value: mongoPatient.email
            });
        }

        return fhirPatient;
    }

    /**
     * Create Patient in FHIR server
     */
    async createPatient(mongoPatient) {
        try {
            const fhirPatient = this.convertToFHIRPatient(mongoPatient);
            const response = await this.axios.post('/Patient', fhirPatient);
            
            console.log('Patient created in FHIR server:', response.data.id);
            
            return {
                success: true,
                fhirId: response.data.id,
                data: response.data
            };
        } catch (error) {
            console.error('Error creating FHIR patient:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data || error.message
            };
        }
    }

    /**
     * Update Patient in FHIR server
     */
    async updatePatient(fhirId, mongoPatient) {
        try {
            const fhirPatient = this.convertToFHIRPatient(mongoPatient);
            fhirPatient.id = fhirId;
            
            const response = await this.axios.put(`/Patient/${fhirId}`, fhirPatient);
            
            console.log('Patient updated in FHIR server:', fhirId);
            
            return {
                success: true,
                data: response.data
            };
        } catch (error) {
            console.error('Error updating FHIR patient:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data || error.message
            };
        }
    }

    /**
     * Get Patient from FHIR server
     */
    async getPatient(fhirId) {
        try {
            const response = await this.axios.get(`/Patient/${fhirId}`);
            return {
                success: true,
                data: response.data
            };
        } catch (error) {
            console.error('Error fetching FHIR patient:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data || error.message
            };
        }
    }

    /**
     * Search Patients in FHIR server
     */
    async searchPatients(searchParams) {
        try {
            const response = await this.axios.get('/Patient', { params: searchParams });
            return {
                success: true,
                data: response.data,
                total: response.data.total,
                entries: response.data.entry || []
            };
        } catch (error) {
            console.error('Error searching FHIR patients:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data || error.message
            };
        }
    }

    // ==================== APPOINTMENT OPERATIONS ====================

    /**
     * Convert MongoDB Appointment to FHIR Appointment resource
     */
    convertToFHIRAppointment(mongoAppointment, patientFhirId, practitionerFhirId) {
        const fhirAppointment = {
            resourceType: 'Appointment',
            id: mongoAppointment.fhirId || undefined,
            identifier: [{
                system: 'http://your-hospital.com/appointment-id',
                value: mongoAppointment._id.toString()
            }],
            status: this.mapAppointmentStatus(mongoAppointment.status),
            description: mongoAppointment.reason,
            start: new Date(mongoAppointment.dateTime).toISOString(),
            end: new Date(new Date(mongoAppointment.dateTime).getTime() + 30 * 60000).toISOString(), // 30 min default
            participant: [
                {
                    actor: {
                        reference: `Patient/${patientFhirId}`
                    },
                    required: 'required',
                    status: 'accepted'
                },
                {
                    actor: {
                        reference: `Practitioner/${practitionerFhirId}`
                    },
                    required: 'required',
                    status: 'accepted'
                }
            ]
        };

        return fhirAppointment;
    }

    /**
     * Map MongoDB appointment status to FHIR status
     */
    mapAppointmentStatus(mongoStatus) {
        const statusMap = {
            'initiated': 'proposed',
            'scheduled': 'booked',
            'confirmed': 'booked',
            'rescheduled': 'booked',
            'cancelled': 'cancelled',
            'completed': 'fulfilled',
            'no_show': 'noshow'
        };
        return statusMap[mongoStatus] || 'proposed';
    }

    /**
     * Create Appointment in FHIR server
     */
    async createAppointment(mongoAppointment, patientFhirId, practitionerFhirId) {
        try {
            const fhirAppointment = this.convertToFHIRAppointment(
                mongoAppointment,
                patientFhirId,
                practitionerFhirId
            );
            
            const response = await this.axios.post('/Appointment', fhirAppointment);
            
            console.log('Appointment created in FHIR server:', response.data.id);
            
            return {
                success: true,
                fhirId: response.data.id,
                data: response.data
            };
        } catch (error) {
            console.error('Error creating FHIR appointment:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data || error.message
            };
        }
    }

    /**
     * Update Appointment in FHIR server
     */
    async updateAppointment(fhirId, mongoAppointment, patientFhirId, practitionerFhirId) {
        try {
            const fhirAppointment = this.convertToFHIRAppointment(
                mongoAppointment,
                patientFhirId,
                practitionerFhirId
            );
            fhirAppointment.id = fhirId;
            
            const response = await this.axios.put(`/Appointment/${fhirId}`, fhirAppointment);
            
            console.log('Appointment updated in FHIR server:', fhirId);
            
            return {
                success: true,
                data: response.data
            };
        } catch (error) {
            console.error('Error updating FHIR appointment:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data || error.message
            };
        }
    }

    /**
     * Get Appointment from FHIR server
     */
    async getAppointment(fhirId) {
        try {
            const response = await this.axios.get(`/Appointment/${fhirId}`);
            return {
                success: true,
                data: response.data
            };
        } catch (error) {
            console.error('Error fetching FHIR appointment:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data || error.message
            };
        }
    }

    /**
     * Search Appointments in FHIR server
     */
    async searchAppointments(searchParams) {
        try {
            const response = await this.axios.get('/Appointment', { params: searchParams });
            return {
                success: true,
                data: response.data,
                total: response.data.total,
                entries: response.data.entry || []
            };
        } catch (error) {
            console.error('Error searching FHIR appointments:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data || error.message
            };
        }
    }

    // ==================== PRACTITIONER OPERATIONS ====================

    /**
     * Convert MongoDB Doctor to FHIR Practitioner resource
     */
    convertToFHIRPractitioner(mongoDoctor) {
        const fhirPractitioner = {
            resourceType: 'Practitioner',
            id: mongoDoctor.fhirId || undefined,
            identifier: [{
                system: 'http://your-hospital.com/doctor-id',
                value: mongoDoctor._id.toString()
            }],
            active: true,
            name: [{
                use: 'official',
                text: mongoDoctor.name,
                family: mongoDoctor.name.split(' ').pop(),
                given: mongoDoctor.name.split(' ').slice(0, -1)
            }],
            telecom: mongoDoctor.phone ? [{
                system: 'phone',
                value: mongoDoctor.phone
            }] : undefined
        };

        // Add specialty if exists
        if (mongoDoctor.specialty) {
            fhirPractitioner.qualification = [{
                code: {
                    coding: [{
                        system: 'http://terminology.hl7.org/CodeSystem/v2-0360',
                        code: mongoDoctor.specialty,
                        display: mongoDoctor.specialty
                    }]
                }
            }];
        }

        return fhirPractitioner;
    }

    /**
     * Create Practitioner in FHIR server
     */
    async createPractitioner(mongoDoctor) {
        try {
            const fhirPractitioner = this.convertToFHIRPractitioner(mongoDoctor);
            const response = await this.axios.post('/Practitioner', fhirPractitioner);
            
            console.log('Practitioner created in FHIR server:', response.data.id);
            
            return {
                success: true,
                fhirId: response.data.id,
                data: response.data
            };
        } catch (error) {
            console.error('Error creating FHIR practitioner:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data || error.message
            };
        }
    }

    /**
     * Get Practitioner from FHIR server
     */
    async getPractitioner(fhirId) {
        try {
            const response = await this.axios.get(`/Practitioner/${fhirId}`);
            return {
                success: true,
                data: response.data
            };
        } catch (error) {
            console.error('Error fetching FHIR practitioner:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data || error.message
            };
        }
    }

    /**
     * Search Practitioners in FHIR server
     */
    async searchPractitioners(searchParams) {
        try {
            const response = await this.axios.get('/Practitioner', { params: searchParams });
            return {
                success: true,
                data: response.data,
                total: response.data.total,
                entries: response.data.entry || []
            };
        } catch (error) {
            console.error('Error searching FHIR practitioners:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data || error.message
            };
        }
    }

    /**
     * Update Practitioner in FHIR server
     */
    async updatePractitioner(fhirId, mongoDoctor) {
        try {
            const fhirPractitioner = this.convertToFHIRPractitioner(mongoDoctor);
            fhirPractitioner.id = fhirId;
            
            const response = await this.axios.put(`/Practitioner/${fhirId}`, fhirPractitioner);
            
            console.log('Practitioner updated in FHIR server:', fhirId);
            
            return {
                success: true,
                data: response.data
            };
        } catch (error) {
            console.error('Error updating FHIR practitioner:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data || error.message
            };
        }
    }

    // ==================== MEDICATION REQUEST OPERATIONS ====================

    /**
     * Convert Prescription Refill to FHIR MedicationRequest
     */
    convertToFHIRMedicationRequest(prescriptionRefill, patientFhirId, practitionerFhirId) {
        return {
            resourceType: 'MedicationRequest',
            id: prescriptionRefill.fhirId || undefined,
            identifier: [{
                system: 'http://your-hospital.com/prescription-id',
                value: prescriptionRefill._id.toString()
            }],
            status: this.mapPrescriptionStatus(prescriptionRefill.status),
            intent: 'order',
            medicationCodeableConcept: {
                text: prescriptionRefill.medicationName
            },
            subject: {
                reference: `Patient/${patientFhirId}`
            },
            requester: {
                reference: `Practitioner/${practitionerFhirId}`
            },
            authoredOn: prescriptionRefill.requestedAt ? new Date(prescriptionRefill.requestedAt).toISOString() : new Date().toISOString(),
            dosageInstruction: prescriptionRefill.dosage ? [{
                text: prescriptionRefill.dosage
            }] : undefined,
            note: prescriptionRefill.additionalNotes ? [{
                text: prescriptionRefill.additionalNotes
            }] : undefined
        };
    }

    /**
     * Map prescription status to FHIR status
     */
    mapPrescriptionStatus(mongoStatus) {
        const statusMap = {
            'pending': 'active',
            'approved': 'active',
            'denied': 'cancelled',
            'dispensed': 'completed'
        };
        return statusMap[mongoStatus] || 'active';
    }

    /**
     * Create MedicationRequest in FHIR server
     */
    async createMedicationRequest(prescriptionRefill, patientFhirId, practitionerFhirId) {
        try {
            const fhirMedicationRequest = this.convertToFHIRMedicationRequest(
                prescriptionRefill,
                patientFhirId,
                practitionerFhirId
            );
            
            const response = await this.axios.post('/MedicationRequest', fhirMedicationRequest);
            
            console.log('MedicationRequest created in FHIR server:', response.data.id);
            
            return {
                success: true,
                fhirId: response.data.id,
                data: response.data
            };
        } catch (error) {
            console.error('Error creating FHIR MedicationRequest:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data || error.message
            };
        }
    }

    /**
     * Update MedicationRequest in FHIR server
     */
    async updateMedicationRequest(fhirId, prescriptionRefill, patientFhirId, practitionerFhirId) {
        try {
            const fhirMedicationRequest = this.convertToFHIRMedicationRequest(
                prescriptionRefill,
                patientFhirId,
                practitionerFhirId
            );
            fhirMedicationRequest.id = fhirId;
            
            const response = await this.axios.put(`/MedicationRequest/${fhirId}`, fhirMedicationRequest);
            
            console.log('MedicationRequest updated in FHIR server:', fhirId);
            
            return {
                success: true,
                data: response.data
            };
        } catch (error) {
            console.error('Error updating FHIR MedicationRequest:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data || error.message
            };
        }
    }

    /**
     * Get MedicationRequest from FHIR server
     */
    async getMedicationRequest(fhirId) {
        try {
            const response = await this.axios.get(`/MedicationRequest/${fhirId}`);
            return {
                success: true,
                data: response.data
            };
        } catch (error) {
            console.error('Error fetching FHIR MedicationRequest:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data || error.message
            };
        }
    }

    /**
     * Search MedicationRequests in FHIR server
     */
    async searchMedicationRequests(searchParams) {
        try {
            const response = await this.axios.get('/MedicationRequest', { params: searchParams });
            return {
                success: true,
                data: response.data,
                total: response.data.total,
                entries: response.data.entry || []
            };
        } catch (error) {
            console.error('Error searching FHIR MedicationRequests:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data || error.message
            };
        }
    }

    // ==================== ORGANIZATION (HOSPITAL) OPERATIONS ====================

    /**
     * Convert MongoDB Hospital to FHIR Organization resource
     */
    convertToFHIROrganization(mongoHospital) {
        const fhirOrganization = {
            resourceType: 'Organization',
            id: mongoHospital.fhirId || undefined,
            identifier: [{
                system: 'http://your-hospital.com/hospital-id',
                value: mongoHospital._id.toString()
            }],
            active: true,
            type: [{
                coding: [{
                    system: 'http://terminology.hl7.org/CodeSystem/organization-type',
                    code: 'prov',
                    display: 'Healthcare Provider'
                }]
            }],
            name: mongoHospital.name,
            telecom: []
        };

        // Add phone number
        if (mongoHospital.phonenumber) {
            fhirOrganization.telecom.push({
                system: 'phone',
                value: mongoHospital.phonenumber,
                use: 'work'
            });
        }

        // Add email
        if (mongoHospital.email) {
            fhirOrganization.telecom.push({
                system: 'email',
                value: mongoHospital.email,
                use: 'work'
            });
        }

        // Add website
        if (mongoHospital.hospitalWebsite) {
            fhirOrganization.telecom.push({
                system: 'url',
                value: mongoHospital.hospitalWebsite,
                use: 'work'
            });
        }

        // Add address
        if (mongoHospital.hospitalAddress) {
            fhirOrganization.address = [{
                use: 'work',
                type: 'physical',
                text: mongoHospital.hospitalAddress
            }];
        }

        return fhirOrganization;
    }

    /**
     * Create Organization in FHIR server
     */
    async createOrganization(mongoHospital) {
        try {
            const fhirOrganization = this.convertToFHIROrganization(mongoHospital);
            const response = await this.axios.post('/Organization', fhirOrganization);
            
            console.log('Organization created in FHIR server:', response.data.id);
            
            return {
                success: true,
                fhirId: response.data.id,
                data: response.data
            };
        } catch (error) {
            console.error('Error creating FHIR organization:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data || error.message
            };
        }
    }

    /**
     * Update Organization in FHIR server
     */
    async updateOrganization(fhirId, mongoHospital) {
        try {
            const fhirOrganization = this.convertToFHIROrganization(mongoHospital);
            fhirOrganization.id = fhirId;
            
            const response = await this.axios.put(`/Organization/${fhirId}`, fhirOrganization);
            
            console.log('Organization updated in FHIR server:', fhirId);
            
            return {
                success: true,
                data: response.data
            };
        } catch (error) {
            console.error('Error updating FHIR organization:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data || error.message
            };
        }
    }

    /**
     * Get Organization from FHIR server
     */
    async getOrganization(fhirId) {
        try {
            const response = await this.axios.get(`/Organization/${fhirId}`);
            return {
                success: true,
                data: response.data
            };
        } catch (error) {
            console.error('Error fetching FHIR organization:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data || error.message
            };
        }
    }

    /**
     * Search Organizations in FHIR server
     */
    async searchOrganizations(searchParams) {
        try {
            const response = await this.axios.get('/Organization', { params: searchParams });
            return {
                success: true,
                data: response.data,
                total: response.data.total,
                entries: response.data.entry || []
            };
        } catch (error) {
            console.error('Error searching FHIR organizations:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data || error.message
            };
        }
    }

    // ==================== BULK SYNC OPERATIONS ====================

    /**
     * Sync all patients to FHIR server
     */
    async syncAllPatients(patients) {
        const results = [];
        
        for (const patient of patients) {
            if (patient.fhirId) {
                const result = await this.updatePatient(patient.fhirId, patient);
                results.push({ mongoId: patient._id, ...result });
            } else {
                const result = await this.createPatient(patient);
                results.push({ mongoId: patient._id, ...result });
            }
        }
        
        return results;
    }
}

export default new FHIRService();