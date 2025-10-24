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


// import fhirService from './fhirService.js';
// import Patient from '../models/Patient.js';
// import Doctor from '../models/Doctor.js';
// import { generatePhoneVariations, normalizePhoneNumber } from '../utils/phoneUtils.js';

// /**
//  * Service to search FHIR server and manage patient data
//  * ✅ FHIR/EMR is the authoritative source - always create there first
//  */
// class FHIRSearchService {

//     /**
//      * ✅ NEW: Update patient in FHIR/EMR FIRST, then MongoDB
//      * This ensures EMR is always the source of truth
//      */
//     async updatePatientInEMR(patientId, field, value) {
//         try {
//             console.log(`📝 Updating patient ${field} in FHIR/EMR first...`);

//             // Get patient from MongoDB
//             const patient = await Patient.findById(patientId);
//             if (!patient) {
//                 return {
//                     success: false,
//                     error: 'Patient not found in MongoDB'
//                 };
//             }

//             // Check if patient has FHIR ID
//             if (!patient.fhirId) {
//                 console.warn(`⚠️ Patient ${patientId} has no FHIR ID, syncing first...`);
//                 const syncResult = await patient.syncToFHIR();
//                 if (!syncResult.success) {
//                     return {
//                         success: false,
//                         error: 'Failed to sync patient to FHIR before update'
//                     };
//                 }
//             }

//             // ==================== STEP 1: UPDATE IN FHIR/EMR FIRST ====================
//             console.log(`🏥 Updating ${field} in FHIR/EMR: ${value}`);

//             // Update the field in patient object
//             patient[field] = value;

//             // Update in FHIR using the patient object
//             const fhirResult = await fhirService.updatePatient(patient.fhirId, patient);

//             if (!fhirResult.success) {
//                 console.error(`❌ Failed to update patient in FHIR:`, fhirResult.error);
//                 return {
//                     success: false,
//                     error: `Failed to update patient in EMR: ${fhirResult.error}`
//                 };
//             }

//             console.log(`✅ Patient updated in FHIR/EMR: ${patient.fhirId}`);

//             // ==================== STEP 2: NOW UPDATE IN MONGODB ====================
//             console.log(`💾 Updating patient in MongoDB...`);

//             patient[field] = value;
//             patient.fhirSyncStatus = 'synced';
//             patient.fhirLastSync = new Date();
//             patient._skipFhirSync = true; // Don't sync back to FHIR (already done)
//             await patient.save();

//             console.log(`✅ Patient updated in MongoDB: ${patient._id}`);
//             console.log(`🔗 Updated field: ${field} = ${value}`);

//             return {
//                 success: true,
//                 patient: patient,
//                 field: field,
//                 value: value,
//                 fhirSynced: true,
//                 message: `${field} updated successfully in FHIR and MongoDB`
//             };

//         } catch (error) {
//             console.error('❌ Error updating patient:', error);
//             return {
//                 success: false,
//                 error: error.message
//             };
//         }
//     }

//     /**
//      * ✅ NEW: Update multiple patient fields in FHIR/EMR FIRST, then MongoDB
//      */
//     async updateMultipleFieldsInEMR(patientId, updates) {
//         try {
//             console.log(`📝 Updating multiple patient fields in FHIR/EMR first...`);

//             // Get patient from MongoDB
//             const patient = await Patient.findById(patientId);
//             if (!patient) {
//                 return {
//                     success: false,
//                     error: 'Patient not found in MongoDB'
//                 };
//             }

//             // Check if patient has FHIR ID
//             if (!patient.fhirId) {
//                 console.warn(`⚠️ Patient ${patientId} has no FHIR ID, syncing first...`);
//                 const syncResult = await patient.syncToFHIR();
//                 if (!syncResult.success) {
//                     return {
//                         success: false,
//                         error: 'Failed to sync patient to FHIR before update'
//                     };
//                 }
//             }

//             // ==================== STEP 1: UPDATE IN FHIR/EMR FIRST ====================
//             console.log(`🏥 Updating fields in FHIR/EMR:`, Object.keys(updates));

//             // Update the fields in patient object
//             Object.keys(updates).forEach(field => {
//                 patient[field] = updates[field];
//             });

//             // Update in FHIR using the patient object
//             const fhirResult = await fhirService.updatePatient(patient.fhirId, patient);

//             if (!fhirResult.success) {
//                 console.error(`❌ Failed to update patient in FHIR:`, fhirResult.error);
//                 return {
//                     success: false,
//                     error: `Failed to update patient in EMR: ${fhirResult.error}`
//                 };
//             }

//             console.log(`✅ Patient updated in FHIR/EMR: ${patient.fhirId}`);

//             // ==================== STEP 2: NOW UPDATE IN MONGODB ====================
//             console.log(`💾 Updating patient in MongoDB...`);

//             Object.keys(updates).forEach(field => {
//                 patient[field] = updates[field];
//             });
//             patient.fhirSyncStatus = 'synced';
//             patient.fhirLastSync = new Date();
//             patient._skipFhirSync = true; // Don't sync back to FHIR (already done)
//             await patient.save();

//             console.log(`✅ Patient updated in MongoDB: ${patient._id}`);

//             return {
//                 success: true,
//                 patient: patient,
//                 updates: updates,
//                 fhirSynced: true,
//                 message: `Patient updated successfully in FHIR and MongoDB`
//             };

//         } catch (error) {
//             console.error('❌ Error updating patient:', error);
//             return {
//                 success: false,
//                 error: error.message
//             };
//         }
//     }

//     /**
//      * ✅ NEW: Create new patient in FHIR/EMR FIRST, then MongoDB
//      * This ensures EMR is always the source of truth
//      */
//     async createNewPatientWithSync(patientData) {
//         try {
//             console.log(`📝 Creating new patient in FHIR/EMR first:`, {
//                 firstName: patientData.firstName,
//                 lastName: patientData.lastName,
//                 phone: patientData.phone,
//                 email: patientData.email,
//                 age: patientData.age,
//                 gender: patientData.gender,
//                 dob: patientData.dob
//             });

//             // Validate required fields
//             if (!patientData.phone || !patientData.firstName || !patientData.lastName) {
//                 return {
//                     success: false,
//                     error: 'Missing required fields: phone, firstName, lastName'
//                 };
//             }

//             // Normalize phone
//             const normalizedPhone = normalizePhoneNumber(patientData.phone);

//             // ==================== STEP 1: CREATE IN FHIR/EMR FIRST ====================
//             console.log(`🏥 Creating patient in FHIR/EMR...`);

//             // Prepare FHIR-compatible patient data
//             const fhirPatientData = {
//                 firstName: patientData.firstName,
//                 lastName: patientData.lastName,
//                 phone: normalizedPhone,
//                 email: patientData.email || '',
//                 dob: patientData.dob ? new Date(patientData.dob) : undefined,
//                 age: patientData.age || null,
//                 gender: patientData.gender || null,
//                 address: patientData.address || {}
//             };

//             // Create in FHIR using a temporary MongoDB patient object for conversion
//             const tempPatient = new Patient(fhirPatientData);
//             const fhirResult = await fhirService.createPatient(tempPatient);

//             if (!fhirResult.success) {
//                 console.error(`❌ Failed to create patient in FHIR:`, fhirResult.error);
//                 return {
//                     success: false,
//                     error: `Failed to create patient in EMR: ${fhirResult.error}`
//                 };
//             }

//             const fhirId = fhirResult.fhirId;
//             console.log(`✅ Patient created in FHIR/EMR: ${fhirId}`);

//             // ==================== STEP 2: NOW CREATE IN MONGODB ====================
//             console.log(`💾 Creating patient in MongoDB...`);

//             // Check if already exists (shouldn't happen, but safety check)
//             const existing = await Patient.findOne({ 
//                 $or: [
//                     { phone: normalizedPhone },
//                     { fhirId: fhirId }
//                 ]
//             });

//             if (existing) {
//                 console.log(`⚠️ Patient already exists in MongoDB: ${existing._id}`);
//                 // Update with FHIR ID
//                 existing.fhirId = fhirId;
//                 existing.fhirSyncStatus = 'synced';
//                 existing.fhirLastSync = new Date();
//                 existing._skipFhirSync = true;
//                 await existing.save();

//                 return {
//                     success: true,
//                     patient: existing,
//                     fhirSynced: true,
//                     alreadyExists: true,
//                     message: 'Patient already existed in MongoDB, updated with FHIR ID'
//                 };
//             }

//             // Create new MongoDB record
//             const newPatientData = {
//                 firstName: patientData.firstName,
//                 lastName: patientData.lastName,
//                 phone: normalizedPhone,
//                 email: patientData.email || '',
//                 age: patientData.age || null,
//                 dob: patientData.dob ? new Date(patientData.dob) : null,
//                 gender: patientData.gender || null,
//                 address: patientData.address || {
//                     street: '',
//                     city: '',
//                     state: '',
//                     zipCode: '',
//                     country: ''
//                 },
//                 fhirId: fhirId,  // ← Link to FHIR record
//                 fhirSyncStatus: 'synced',
//                 fhirLastSync: new Date(),
//                 createdAt: new Date(),
//                 updatedAt: new Date()
//             };

//             const patient = new Patient(newPatientData);
//             patient._skipFhirSync = true; // Don't sync back to FHIR (already there)
//             await patient.save();

//             console.log(`✅ Patient created in MongoDB: ${patient._id}`);
//             console.log(`🔗 Linked MongoDB ↔ FHIR: ${patient._id} ↔ ${fhirId}`);

//             return {
//                 success: true,
//                 patient: patient,
//                 fhirSynced: true,
//                 message: 'Patient created successfully in FHIR and MongoDB'
//             };

//         } catch (error) {
//             console.error('❌ Error creating patient:', error);
//             return {
//                 success: false,
//                 error: error.message
//             };
//         }
//     }

//     /**
//      * Search for patient by phone number in FHIR/EMR server FIRST
//      * MongoDB is only used as a cache/fallback
//      */
//     async findOrImportPatientByPhone(phoneNumber) {
//         try {
//             console.log(`🔍 Searching for patient with phone: ${phoneNumber}`);

//             const phoneVariations = generatePhoneVariations(phoneNumber);
//             console.log(`   Phone formats: ${phoneVariations.join(', ')}`);

//             // ==================== STEP 1: SEARCH EMR/FHIR FIRST ====================
//             let fhirSearchResult = null;
//             let matchedPhoneVariation = null;

//             console.log(`📡 Checking EMR/FHIR (authoritative source)...`);
//             for (const phoneVariation of phoneVariations) {
//                 console.log(`   Trying FHIR with: ${phoneVariation}`);

//                 fhirSearchResult = await fhirService.searchPatients({
//                     telecom: phoneVariation
//                 });

//                 if (fhirSearchResult.success && fhirSearchResult.total > 0) {
//                     matchedPhoneVariation = phoneVariation;
//                     console.log(`✅ Patient found in EMR/FHIR with phone: ${phoneVariation}`);
//                     break;
//                 }
//             }

//             // ==================== STEP 2: PATIENT FOUND IN EMR ====================
//             if (fhirSearchResult && fhirSearchResult.success && fhirSearchResult.total > 0) {
//                 const fhirPatient = fhirSearchResult.entries[0].resource;
//                 console.log(`📥 Patient found in EMR: ${fhirPatient.id}`);

//                 const mongoPatientData = this.convertFHIRPatientToMongo(fhirPatient);

//                 // ✅ Check if conversion failed
//                 if (!mongoPatientData) {
//                     console.warn(`⚠️ FHIR patient has incomplete data`);
//                     return {
//                         success: false,
//                         message: 'Patient found in FHIR but has incomplete data'
//                     };
//                 }

//                 if (mongoPatientData.phone) {
//                     mongoPatientData.phone = normalizePhoneNumber(mongoPatientData.phone);
//                 }

//                 // Check if patient exists in MongoDB
//                 let patient = null;
//                 for (const phoneVariation of phoneVariations) {
//                     patient = await Patient.findOne({ phone: phoneVariation });
//                     if (patient) {
//                         console.log(`   Found existing MongoDB record: ${patient._id}`);
//                         break;
//                     }
//                 }

//                 // if (patient) {
//                 //     // Update existing
//                 //     console.log(`📝 Updating MongoDB with latest EMR data...`);
//                 //     Object.assign(patient, mongoPatientData);
//                 //     patient.fhirId = fhirPatient.id;
//                 //     patient.fhirSyncStatus = 'synced';
//                 //     patient.fhirLastSync = new Date();
//                 //     patient._skipFhirSync = true;
//                 //     await patient.save();
//                 //     console.log(`✅ Updated MongoDB patient from EMR: ${patient._id}`);
//                 // } else {
//                 //     // Create new
//                 //     console.log(`📝 Creating new MongoDB record from EMR data...`);
//                 //     patient = new Patient({
//                 //         ...mongoPatientData,
//                 //         fhirId: fhirPatient.id,
//                 //         fhirSyncStatus: 'synced',
//                 //         fhirLastSync: new Date()
//                 //     });
//                 //     patient._skipFhirSync = true;
//                 //     await patient.save();
//                 //     console.log(`✅ Created MongoDB patient from EMR: ${patient._id}`);
//                 // }

//                 return {
//                     success: true,
//                     source: 'fhir',
//                     patient: patient,
//                     fhirPatient: fhirPatient,
//                     matchedPhone: matchedPhoneVariation
//                 };
//             }

//             // ==================== STEP 3: NOT IN EMR - CHECK MONGODB ====================
//             console.log(`❌ Patient not found in EMR/FHIR`);
//             console.log(`🔍 Checking MongoDB as fallback...`);

//             let patient = null;
//             for (const phoneVariation of phoneVariations) {
//                 patient = await Patient.findOne({ phone: phoneVariation });
//                 if (patient) {
//                     console.log(`⚠️ Found in MongoDB only: ${patient._id}`);
//                     break;
//                 }
//             }

//             if (patient) {
//                 return {
//                     success: true,
//                     source: 'mongodb_only',
//                     patient: patient,
//                     warning: 'Patient not found in EMR'
//                 };
//             }

//             // ==================== STEP 4: NOT FOUND ANYWHERE ====================
//             console.log(`❌ Patient not found in EMR or MongoDB`);
//             return {
//                 success: false,
//                 message: 'Patient not found'
//             };

//         } catch (error) {
//             console.error('❌ Error in findOrImportPatientByPhone:', error);
//             return {
//                 success: false,
//                 error: error.message
//             };
//         }
//     }

//     /**
//      * Convert FHIR Patient to MongoDB format
//      * ✅ Enhanced to handle empty names properly
//      */
//     convertFHIRPatientToMongo(fhirPatient) {
//         const name = fhirPatient.name?.[0] || {};
//         const telecom = fhirPatient.telecom || [];

//         let firstName = '';
//         let lastName = '';

//         // Try name.given and name.family
//         if (name.given && name.given.length > 0) {
//             firstName = name.given[0];
//         }
//         if (name.family) {
//             lastName = name.family;
//         }

//         // ✅ If empty, try parsing name.text
//         if ((!firstName || !lastName) && name.text) {
//             const nameParts = name.text.split(' ');
//             if (nameParts.length > 0 && !firstName) {
//                 firstName = nameParts[0];
//             }
//             if (nameParts.length > 1 && !lastName) {
//                 lastName = nameParts.slice(1).join(' ');
//             }
//         }

//         // ✅ MODIFIED: Use placeholder if no firstName found
//         if (!firstName || firstName.trim() === '') {
//             firstName = 'Unknown';
//         }

//         const phoneObj = telecom.find(t => t.system === 'phone');
//         let phone = phoneObj?.value || '';
//         if (phone) {
//             phone = normalizePhoneNumber(phone);
//         }

//         const emailObj = telecom.find(t => t.system === 'email');
//         const email = emailObj?.value || '';

//         const address = fhirPatient.address?.[0] || {};

//         let age = null;
//         if (fhirPatient.birthDate) {
//             const birthDate = new Date(fhirPatient.birthDate);
//             const today = new Date();
//             age = today.getFullYear() - birthDate.getFullYear();
//             const monthDiff = today.getMonth() - birthDate.getMonth();
//             if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
//                 age--;
//             }
//         }

//         return {
//             firstName: firstName.trim(),
//             lastName: lastName.trim() || 'Not Provided',
//             phone: phone,
//             email: email,
//             dob: fhirPatient.birthDate ? new Date(fhirPatient.birthDate) : undefined,
//             age: age,
//             gender: fhirPatient.gender,
//             address: {
//                 street: address.line?.[0] || '',
//                 city: address.city || '',
//                 state: address.state || '',
//                 zipCode: address.postalCode || '',
//                 country: address.country || ''
//             },
//             incompleteFromFHIR: !firstName || firstName === 'Unknown' // Flag for incomplete data
//         };
//     }

//     /**
//      * Search for practitioner by name
//      */
//     async findOrImportDoctorByName(doctorName) {
//         try {
//             console.log(`🔍 Searching FHIR for practitioner: ${doctorName}`);

//             const fhirSearchResult = await fhirService.searchPractitioners({
//                 name: doctorName
//             });

//             if (!fhirSearchResult.success || fhirSearchResult.total === 0) {
//                 const doctor = await Doctor.findOne({ name: doctorName });
//                 if (doctor) {
//                     return { success: true, source: 'mongodb_only', doctor };
//                 }
//                 return { success: false, message: 'Practitioner not found' };
//             }

//             const fhirPractitioner = fhirSearchResult.entries[0].resource;
//             const mongoDoctorData = this.convertFHIRPractitionerToMongo(fhirPractitioner);

//             let doctor = await Doctor.findOne({ name: doctorName });

//             if (doctor) {
//                 Object.assign(doctor, mongoDoctorData);
//                 doctor.fhirId = fhirPractitioner.id;
//                 doctor.fhirSyncStatus = 'synced';
//                 doctor._skipFhirSync = true;
//                 await doctor.save();
//             } else {
//                 doctor = new Doctor({
//                     ...mongoDoctorData,
//                     fhirId: fhirPractitioner.id,
//                     fhirSyncStatus: 'synced'
//                 });
//                 doctor._skipFhirSync = true;
//                 await doctor.save();
//             }

//             return { success: true, source: 'fhir', doctor, fhirPractitioner };

//         } catch (error) {
//             console.error('❌ Error finding doctor:', error);
//             return { success: false, error: error.message };
//         }
//     }

//     convertFHIRPractitionerToMongo(fhirPractitioner) {
//         const name = fhirPractitioner.name?.[0] || {};
//         const telecom = fhirPractitioner.telecom || [];

//         const phoneObj = telecom.find(t => t.system === 'phone');
//         let phone = phoneObj?.value || '';
//         if (phone) phone = normalizePhoneNumber(phone);

//         const emailObj = telecom.find(t => t.system === 'email');
//         const email = emailObj?.value || '';

//         const specialty = fhirPractitioner.qualification?.[0]?.code?.coding?.[0]?.display || '';

//         return {
//             name: name.text || `${name.given?.join(' ') || ''} ${name.family || ''}`.trim(),
//             phone,
//             email,
//             specialty
//         };
//     }
// }

// export default new FHIRSearchService();

import fhirService from './fhirService.js';
import Patient from '../models/Patient.js';
import Doctor from '../models/Doctor.js';
import { generatePhoneVariations, normalizePhoneNumber } from '../utils/phoneUtils.js';

/**
 * Service to search FHIR server and manage patient data
 * ✅ FHIR/EMR is the authoritative source - always create there first
 */
class FHIRSearchService {

    /**
     * ✅ NEW: Update patient in FHIR/EMR FIRST, then MongoDB
     * This ensures EMR is always the source of truth
     */
    async updatePatientInEMR(patientId, field, value) {
        try {
            console.log(`📝 Updating patient ${field} in FHIR/EMR first...`);

            // Get patient from MongoDB
            const patient = await Patient.findById(patientId);
            if (!patient) {
                return {
                    success: false,
                    error: 'Patient not found in MongoDB'
                };
            }

            // Check if patient has FHIR ID
            if (!patient.fhirId) {
                console.warn(`⚠️ Patient ${patientId} has no FHIR ID, syncing first...`);
                const syncResult = await patient.syncToFHIR();
                if (!syncResult.success) {
                    return {
                        success: false,
                        error: 'Failed to sync patient to FHIR before update'
                    };
                }
            }

            // ==================== STEP 1: UPDATE IN FHIR/EMR FIRST ====================
            console.log(`🏥 Updating ${field} in FHIR/EMR: ${value}`);

            // Update the field in patient object
            patient[field] = value;

            // Update in FHIR using the patient object
            const fhirResult = await fhirService.updatePatient(patient.fhirId, patient);

            if (!fhirResult.success) {
                console.error(`❌ Failed to update patient in FHIR:`, fhirResult.error);
                return {
                    success: false,
                    error: `Failed to update patient in EMR: ${fhirResult.error}`
                };
            }

            console.log(`✅ Patient updated in FHIR/EMR: ${patient.fhirId}`);

            // ==================== STEP 2: NOW UPDATE IN MONGODB ====================
            console.log(`💾 Updating patient in MongoDB...`);

            patient[field] = value;
            patient.fhirSyncStatus = 'synced';
            patient.fhirLastSync = new Date();
            patient._skipFhirSync = true; // Don't sync back to FHIR (already done)
            await patient.save();

            console.log(`✅ Patient updated in MongoDB: ${patient._id}`);
            console.log(`🔗 Updated field: ${field} = ${value}`);

            return {
                success: true,
                patient: patient,
                field: field,
                value: value,
                fhirSynced: true,
                message: `${field} updated successfully in FHIR and MongoDB`
            };

        } catch (error) {
            console.error('❌ Error updating patient:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * ✅ NEW: Update multiple patient fields in FHIR/EMR FIRST, then MongoDB
     */
    async updateMultipleFieldsInEMR(patientId, updates) {
        try {
            console.log(`📝 Updating multiple patient fields in FHIR/EMR first...`);

            // Get patient from MongoDB
            const patient = await Patient.findById(patientId);
            if (!patient) {
                return {
                    success: false,
                    error: 'Patient not found in MongoDB'
                };
            }

            // Check if patient has FHIR ID
            if (!patient.fhirId) {
                console.warn(`⚠️ Patient ${patientId} has no FHIR ID, syncing first...`);
                const syncResult = await patient.syncToFHIR();
                if (!syncResult.success) {
                    return {
                        success: false,
                        error: 'Failed to sync patient to FHIR before update'
                    };
                }
            }

            // ==================== STEP 1: UPDATE IN FHIR/EMR FIRST ====================
            console.log(`🏥 Updating fields in FHIR/EMR:`, Object.keys(updates));

            // Update the fields in patient object
            Object.keys(updates).forEach(field => {
                patient[field] = updates[field];
            });

            // Update in FHIR using the patient object
            const fhirResult = await fhirService.updatePatient(patient.fhirId, patient);

            if (!fhirResult.success) {
                console.error(`❌ Failed to update patient in FHIR:`, fhirResult.error);
                return {
                    success: false,
                    error: `Failed to update patient in EMR: ${fhirResult.error}`
                };
            }

            console.log(`✅ Patient updated in FHIR/EMR: ${patient.fhirId}`);

            // ==================== STEP 2: NOW UPDATE IN MONGODB ====================
            console.log(`💾 Updating patient in MongoDB...`);

            Object.keys(updates).forEach(field => {
                patient[field] = updates[field];
            });
            patient.fhirSyncStatus = 'synced';
            patient.fhirLastSync = new Date();
            patient._skipFhirSync = true; // Don't sync back to FHIR (already done)
            await patient.save();

            console.log(`✅ Patient updated in MongoDB: ${patient._id}`);

            return {
                success: true,
                patient: patient,
                updates: updates,
                fhirSynced: true,
                message: `Patient updated successfully in FHIR and MongoDB`
            };

        } catch (error) {
            console.error('❌ Error updating patient:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * ✅ NEW: Create new patient in FHIR/EMR FIRST, then MongoDB
     * This ensures EMR is always the source of truth
     */
    async createNewPatientWithSync(patientData) {
        try {
            console.log(`📝 Creating new patient in FHIR/EMR first:`, {
                firstName: patientData.firstName,
                lastName: patientData.lastName,
                phone: patientData.phone,
                email: patientData.email,
                age: patientData.age,
                gender: patientData.gender,
                dob: patientData.dob
            });

            // Validate required fields
            if (!patientData.phone || !patientData.firstName || !patientData.lastName) {
                return {
                    success: false,
                    error: 'Missing required fields: phone, firstName, lastName'
                };
            }

            // Normalize phone
            const normalizedPhone = normalizePhoneNumber(patientData.phone);

            // ==================== STEP 1: CREATE IN FHIR/EMR FIRST ====================
            console.log(`🏥 Creating patient in FHIR/EMR...`);

            // Prepare FHIR-compatible patient data
            const fhirPatientData = {
                firstName: patientData.firstName,
                lastName: patientData.lastName,
                phone: normalizedPhone,
                email: patientData.email || '',
                dob: patientData.dob ? new Date(patientData.dob) : undefined,
                age: patientData.age || null,
                gender: patientData.gender || null,
                address: patientData.address || {}
            };

            // Create in FHIR using a temporary MongoDB patient object for conversion
            const tempPatient = new Patient(fhirPatientData);
            const fhirResult = await fhirService.createPatient(null, tempPatient);

            if (!fhirResult.success) {
                console.error(`❌ Failed to create patient in FHIR:`, fhirResult.error);
                return {
                    success: false,
                    error: `Failed to create patient in EMR: ${fhirResult.error}`
                };
            }

            console.log(`✅ Patient created in FHIR/EMR: ${fhirResult.fhirId}`);

            // ==================== STEP 2: NOW CREATE IN MONGODB ====================
            console.log(`💾 Creating patient in MongoDB...`);

            const patient = new Patient({
                ...patientData,
                phone: normalizedPhone,
                fhirId: fhirResult.fhirId,
                fhirSyncStatus: 'synced',
                fhirLastSync: new Date()
            });
            patient._skipFhirSync = true; // Don't sync back to FHIR (already there)
            await patient.save();

            console.log(`✅ Patient created in MongoDB: ${patient._id}`);
            console.log(`🔗 Linked to FHIR ID: ${patient.fhirId}`);

            return {
                success: true,
                patient: patient,
                fhirId: fhirResult.fhirId,
                message: 'Patient created successfully in FHIR and MongoDB'
            };

        } catch (error) {
            console.error('❌ Error creating patient:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Search for patient by phone number in FHIR/EMR first, then MongoDB
     * ✅ EMR is authoritative source - check there first
     * ✅ Optimized to check +91 or +1 formats directly
     */
    async findOrImportPatientByPhone(phoneNumber) {
        try {
            // Generate smart phone variations (prioritize international formats)
            const phoneVariations = generatePhoneVariations(phoneNumber);
            console.log(`   Checking formats: ${phoneVariations.join(', ')}`);

            // ==================== STEP 1: SEARCH EMR/FHIR FIRST ====================
            let fhirSearchResult = null;
            let matchedPhoneVariation = null;

            for (const phoneVariation of phoneVariations) {
                console.log(`   Trying FHIR with: ${phoneVariation}`);

                fhirSearchResult = await fhirService.searchPatients({
                    telecom: phoneVariation
                });

                if (fhirSearchResult.success && fhirSearchResult.total > 0) {
                    matchedPhoneVariation = phoneVariation;
                    break;
                }
            }

            // ==================== STEP 2: PATIENT FOUND IN EMR ====================
            if (fhirSearchResult && fhirSearchResult.success && fhirSearchResult.total > 0) {
                const fhirPatient = fhirSearchResult.entries[0].resource;

                const mongoPatientData = this.convertFHIRPatientToMongo(fhirPatient);

                // ✅ Check if conversion failed
                if (!mongoPatientData) {
                    console.warn(`⚠️ FHIR patient has incomplete data`);
                    return {
                        success: false,
                        message: 'Patient found in FHIR but has incomplete data'
                    };
                }

                if (mongoPatientData.phone) {
                    mongoPatientData.phone = normalizePhoneNumber(mongoPatientData.phone);
                }

                // ✅ Create or update MongoDB record from EMR data
                // Check if patient exists in MongoDB by fhirId first (most reliable)
                let patient = await Patient.findOne({ fhirId: fhirPatient.id });

                if (!patient) {
                    // Fallback: search by phone variations
                    for (const phoneVariation of phoneVariations) {
                        patient = await Patient.findOne({ phone: phoneVariation });
                        if (patient) {
                            break;
                        }
                    }
                }

                if (patient) {
                    // Update existing
                    Object.assign(patient, mongoPatientData);
                    patient.fhirId = fhirPatient.id;
                    patient.fhirSyncStatus = 'synced';
                    patient.fhirLastSync = new Date();
                    patient._skipFhirSync = true;
                    await patient.save();
                } else {
                    // Create ne
                    patient = new Patient({
                        ...mongoPatientData,
                        fhirId: fhirPatient.id,
                        fhirSyncStatus: 'synced',
                        fhirLastSync: new Date()
                    });
                    patient._skipFhirSync = true;
                    await patient.save();
                }

                return {
                    success: true,
                    source: 'fhir',
                    patient: patient,
                    fhirPatient: fhirPatient,
                    matchedPhone: matchedPhoneVariation
                };
            }

            // ==================== STEP 3: NOT IN EMR - CHECK MONGODB ====================
            console.log(`❌ Patient not found in EMR/FHIR`);
            console.log(`🔍 Checking MongoDB as fallback...`);

            let patient = null;
            for (const phoneVariation of phoneVariations) {
                patient = await Patient.findOne({ phone: phoneVariation });
                if (patient) {
                    console.log(`⚠️ Found in MongoDB only: ${patient._id}`);
                    break;
                }
            }

            if (patient) {
                return {
                    success: true,
                    source: 'mongodb_only',
                    patient: patient,
                    warning: 'Patient not found in EMR'
                };
            }

            // ==================== STEP 4: NOT FOUND ANYWHERE ====================
            console.log(`❌ Patient not found in EMR or MongoDB`);
            return {
                success: false,
                message: 'Patient not found'
            };

        } catch (error) {
            console.error('❌ Error in findOrImportPatientByPhone:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    /**
     * Convert FHIR Patient to MongoDB format
     * ✅ Enhanced to handle empty names properly
     */
    convertFHIRPatientToMongo(fhirPatient) {
        const name = fhirPatient.name?.[0] || {};
        const telecom = fhirPatient.telecom || [];

        let firstName = '';
        let lastName = '';

        // Try name.given and name.family
        if (name.given && name.given.length > 0) {
            firstName = name.given[0];
        }
        if (name.family) {
            lastName = name.family;
        }

        // ✅ If empty, try parsing name.text
        if ((!firstName || !lastName) && name.text) {
            const nameParts = name.text.split(' ');
            if (nameParts.length > 0 && !firstName) {
                firstName = nameParts[0];
            }
            if (nameParts.length > 1 && !lastName) {
                lastName = nameParts.slice(1).join(' ');
            }
        }

        // ✅ MODIFIED: Use placeholder if no firstName found
        if (!firstName || firstName.trim() === '') {
            firstName = 'Unknown';
        }

        const phoneObj = telecom.find(t => t.system === 'phone');
        let phone = phoneObj?.value || '';
        if (phone) {
            phone = normalizePhoneNumber(phone);
        }

        const emailObj = telecom.find(t => t.system === 'email');
        const email = emailObj?.value || '';

        const address = fhirPatient.address?.[0] || {};

        let age = null;
        if (fhirPatient.birthDate) {
            const birthDate = new Date(fhirPatient.birthDate);
            const today = new Date();
            age = today.getFullYear() - birthDate.getFullYear();
            const monthDiff = today.getMonth() - birthDate.getMonth();
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                age--;
            }
        }

        return {
            firstName: firstName.trim(),
            lastName: lastName.trim() || 'Not Provided',
            phone: phone,
            email: email,
            dob: fhirPatient.birthDate ? new Date(fhirPatient.birthDate) : undefined,
            age: age,
            gender: fhirPatient.gender,
            address: {
                street: address.line?.[0] || '',
                city: address.city || '',
                state: address.state || '',
                zipCode: address.postalCode || '',
                country: address.country || ''
            },
            incompleteFromFHIR: !firstName || firstName === 'Unknown' // Flag for incomplete data
        };
    }

    /**
     * Search for practitioner by name
     */
    async findOrImportDoctorByName(doctorName) {
        try {
            console.log(`🔍 Searching FHIR for practitioner: ${doctorName}`);

            const fhirSearchResult = await fhirService.searchPractitioners({
                name: doctorName
            });

            if (!fhirSearchResult.success || fhirSearchResult.total === 0) {
                const doctor = await Doctor.findOne({ name: doctorName });
                if (doctor) {
                    return { success: true, source: 'mongodb_only', doctor };
                }
                return { success: false, message: 'Practitioner not found' };
            }

            const fhirPractitioner = fhirSearchResult.entries[0].resource;
            const mongoDoctorData = this.convertFHIRPractitionerToMongo(fhirPractitioner);

            let doctor = await Doctor.findOne({ name: doctorName });

            if (doctor) {
                Object.assign(doctor, mongoDoctorData);
                doctor.fhirId = fhirPractitioner.id;
                doctor.fhirSyncStatus = 'synced';
                doctor._skipFhirSync = true;
                await doctor.save();
            } else {
                doctor = new Doctor({
                    ...mongoDoctorData,
                    fhirId: fhirPractitioner.id,
                    fhirSyncStatus: 'synced'
                });
                doctor._skipFhirSync = true;
                await doctor.save();
            }

            return { success: true, source: 'fhir', doctor, fhirPractitioner };

        } catch (error) {
            console.error('❌ Error finding doctor:', error);
            return { success: false, error: error.message };
        }
    }

    convertFHIRPractitionerToMongo(fhirPractitioner) {
        const name = fhirPractitioner.name?.[0] || {};
        const telecom = fhirPractitioner.telecom || [];

        const phoneObj = telecom.find(t => t.system === 'phone');
        let phone = phoneObj?.value || '';
        if (phone) phone = normalizePhoneNumber(phone);

        const emailObj = telecom.find(t => t.system === 'email');
        const email = emailObj?.value || '';

        const specialty = fhirPractitioner.qualification?.[0]?.code?.coding?.[0]?.display || '';

        return {
            name: name.text || `${name.given?.join(' ') || ''} ${name.family || ''}`.trim(),
            phone,
            email,
            specialty
        };
    }
}

export default new FHIRSearchService();