{/* without emr */ }
// import Appointment from "../models/Appointment.js";
// import Doctor from "../models/Doctor.js";
// import Patient from "../models/Patient.js";

// export const bookAppointment = async ({ patient_firstname, patient_lastname, patient_phone, patient_dob, patient_age, doctor_name, date, time, reason }) => {
//     try {
//         // Step 1: Find or create patient
//         let patient = await Patient.findOne({ phone: patient_phone });
//         if (!patient) {
//             patient = new Patient({ firstName: patient_firstname, lastName: patient_lastname, phone: patient_phone, dob: patient_dob, age: patient_age });
//             await patient.save();
//         }

//         // Step 2: Find doctor
//         const doctor = await Doctor.findOne({ name: doctor_name });
//         if (!doctor) {
//             return { success: false, message: "Doctor not found" };
//         }

//         // Step 3: Build appointment Date object
//         const dateTime = new Date(`${date}T${time}:00`);

//         // Step 4: Create appointment
//         const appointment = new Appointment({
//             patient: patient._id,
//             doctor: doctor._id,
//             dateTime,
//             reason
//         });

//         await appointment.save();

//         return {
//             success: true,
//             message: `Appointment booked with ${doctor_name} on ${date} at ${time}`,
//             appointmentId: appointment._id,
//             patientId: patient._id
//         };
//     } catch (error) {
//         console.error("Error booking appointment:", error);
//         return {
//             success: false,
//             message: "Error booking appointment",
//             error: error.message
//         };
//     }
// }

// export const rescheduleAppointmentByDetails = async (rescheduleData) => {
//     try {
//         const {
//             patient_name,
//             patient_phone,
//             original_doctor,
//             original_date,
//             original_time,
//             new_date,
//             new_time
//         } = rescheduleData;

//         // Find patient with more flexible matching
//         let patientQuery = {};
//         if (patient_name) patientQuery.name = new RegExp(patient_name.trim(), 'i');
//         if (patient_phone) {
//             // Clean phone number - remove spaces, dashes, parentheses
//             const cleanPhone = patient_phone.replace(/[\s\-\(\)]/g, '');
//             patientQuery.$or = [
//                 { phone: patient_phone },        // ADDED: your model uses 'phone'
//                 { phone: cleanPhone },            // ADDED
//                 { phoneNumber: patient_phone },   // Keep for backward compatibility
//                 { phoneNumber: cleanPhone },
//                 { phone: new RegExp(cleanPhone.slice(-10)) },
//                 { phoneNumber: new RegExp(cleanPhone.slice(-10)) }
//             ];
//         }

//         const patient = await Patient.findOne(patientQuery);

//         if (!patient) {
//             return { 
//                 success: false, 
//                 message: `Patient "${patient_name}" not found. Please verify the name and phone number.`
//             };
//         }

//         // Find doctor with flexible matching
//         const doctorQuery = { name: new RegExp(original_doctor.trim(), 'i') };
//         const doctor = await Doctor.findOne(doctorQuery);

//         if (!doctor) {
//             return { 
//                 success: false, 
//                 message: `Doctor "${original_doctor}" not found. Please verify the doctor's name.`
//             };
//         }

//         // Create date objects with timezone handling
//         const originalDateTime = new Date(`${original_date}T${original_time}:00`);

//         // First, let's see what appointments exist for this patient and doctor
//         const allAppointments = await Appointment.find({
//             patient: patient._id,
//             doctor: doctor._id,
//             status: { $ne: 'cancelled' }
//         }).sort({ dateTime: 1 });

//         // Try to find exact match first
//         let appointment = await Appointment.findOne({
//             patient: patient._id,
//             doctor: doctor._id,
//             dateTime: originalDateTime,
//             status: { $ne: 'cancelled' }
//         });

//         // If exact match fails, try date range (same day)
//         if (!appointment) {

//             const startOfDay = new Date(`${original_date}T00:00:00`);
//             const endOfDay = new Date(`${original_date}T23:59:59`);

//             const dayAppointments = await Appointment.find({
//                 patient: patient._id,
//                 doctor: doctor._id,
//                 dateTime: { $gte: startOfDay, $lte: endOfDay },
//                 status: { $ne: 'cancelled' }
//             });

//             // Try to find closest time match
//             appointment = dayAppointments.find(apt => {
//                 const aptTime = apt.dateTime.toTimeString().slice(0, 5);
//                 return aptTime === original_time;
//             });

//             // If still not found, take the first appointment of the day
//             if (!appointment && dayAppointments.length > 0) {
//                 appointment = dayAppointments[0];
//             }
//         }

//         if (!appointment) {
//             return {
//                 success: false,
//                 message: `No appointment found for Dr. ${original_doctor} on ${original_date}. Available appointments: ${allAppointments.length > 0 ? allAppointments.map(apt => apt.dateTime.toLocaleDateString()).join(', ') : 'None'}`
//             };
//         }

//         // Check if new slot is available (optional - you might want to skip this)
//         const newDateTime = new Date(`${new_date}T${new_time}:00`);
//         const conflictingAppointment = await Appointment.findOne({
//             doctor: doctor._id,
//             dateTime: newDateTime,
//             status: { $in: ['confirmed', 'scheduled', 'rescheduled'] },
//             _id: { $ne: appointment._id }
//         });

//         if (conflictingAppointment) {
//             return {
//                 success: false,
//                 message: `Dr. ${original_doctor} already has an appointment at ${new_time} on ${new_date}. Please choose a different time.`
//             };
//         }

//         // Update appointment
//         const oldDateTime = appointment.dateTime;
//         appointment.dateTime = newDateTime;
//         appointment.status = 'rescheduled';
//         appointment.rescheduledAt = new Date();
//         appointment.rescheduledFrom = oldDateTime;

//         await appointment.save();

//         return {
//             success: true,
//             message: `Appointment successfully rescheduled from ${original_date} ${original_time} to ${new_date} ${new_time} with Dr. ${doctor.name}`,
//             appointment_id: appointment._id,
//             confirmation_number: `APT-${appointment._id.toString().slice(-6).toUpperCase()}`,
//             old_time: `${original_date} ${original_time}`,
//             new_time: `${new_date} ${new_time}`,
//             doctor: doctor.name
//         };

//     } catch (error) {
//         console.error('Error rescheduling appointment:', error);
//         return { 
//             success: false, 
//             message: `Error rescheduling appointment: ${error.message}`
//         };
//     }
// };

// export const cancelAppointmentByDetails = async (cancelData) => {
//     try {
//         const {
//             patient_name,
//             patient_phone,
//             doctor_name,
//             appointment_date,
//             appointment_time,
//             reason
//         } = cancelData;

//         // Find patient with flexible matching
//         let patientQuery = {};
//         if (patient_name) patientQuery.name = new RegExp(patient_name.trim(), 'i');
//         if (patient_phone) {
//             const cleanPhone = patient_phone.replace(/[\s\-\(\)]/g, '');
//             patientQuery.$or = [
//                 { phoneNumber: patient_phone },
//                 { phoneNumber: cleanPhone },
//                 { phoneNumber: new RegExp(cleanPhone.slice(-10)) }
//             ];
//         }

//         let patient = await Patient.findOne(patientQuery);

//         // If patient not found and we have both name and phone, try name-only search
//         if (!patient && patient_name && patient_phone) {
//             patient = await Patient.findOne({
//                 name: new RegExp(patient_name.trim(), 'i')
//             });
//         }

//         if (!patient) {
//             // Let's see what patients exist with similar names
//             const similarPatients = await Patient.find({
//                 name: new RegExp(patient_name.split(' ')[0], 'i')
//             }).select('name phoneNumber');

//             return { 
//                 success: false, 
//                 message: `Patient "${patient_name}" not found. Similar patients: ${similarPatients.map(p => `${p.name} (${p.phoneNumber})`).join(', ')}`
//             };
//         }

//         // Find doctor
//         const doctorQuery = { name: new RegExp(doctor_name.trim(), 'i') };
//         const doctor = await Doctor.findOne(doctorQuery);

//         if (!doctor) {
//             // Let's see what doctors exist with similar names
//             const similarDoctors = await Doctor.find({
//                 name: new RegExp(doctor_name.split(' ')[0], 'i')
//             }).select('name specialty');

//             return { 
//                 success: false, 
//                 message: `Doctor "${doctor_name}" not found. Similar doctors: ${similarDoctors.map(d => `${d.name} (${d.specialty})`).join(', ')}`
//             };
//         }

//         // Let's first see ALL appointments for this patient
//         const allPatientAppointments = await Appointment.find({
//             patient: patient._id
//         }).populate('doctor', 'name').sort({ dateTime: 1 });

//         // Now let's see appointments with this specific doctor
//         const doctorAppointments = await Appointment.find({
//             patient: patient._id,
//             doctor: doctor._id
//         }).sort({ dateTime: 1 });

//         // Build appointment query
//         let appointmentQuery = {
//             patient: patient._id,
//             doctor: doctor._id,
//             status: { $ne: 'cancelled' }
//         };

//         if (appointment_date) {
//             if (appointment_time) {
//                 // Try exact match first
//                 const exactDateTime = new Date(`${appointment_date}T${appointment_time}:00`);
//                 appointmentQuery.dateTime = exactDateTime;
//             } else {
//                 // Date range match
//                 const startOfDay = new Date(`${appointment_date}T00:00:00`);
//                 const endOfDay = new Date(`${appointment_date}T23:59:59`);
//                 appointmentQuery.dateTime = { $gte: startOfDay, $lte: endOfDay };
//             }
//         }

//         let appointment = await Appointment.findOne(appointmentQuery);

//         // If exact match fails and we have time, try flexible time matching
//         if (!appointment && appointment_date && appointment_time) {
//             const startOfDay = new Date(`${appointment_date}T00:00:00`);
//             const endOfDay = new Date(`${appointment_date}T23:59:59`);

//             const dayAppointments = await Appointment.find({
//                 patient: patient._id,
//                 doctor: doctor._id,
//                 dateTime: { $gte: startOfDay, $lte: endOfDay },
//                 status: { $ne: 'cancelled' }
//             });

//            dayAppointments.forEach((apt, index) => {
//                 const aptTime = apt.dateTime.toTimeString().slice(0, 5);
//                 const aptDate = apt.dateTime.toISOString().split('T')[0];
//                 });

//             // Try to find time match
//             appointment = dayAppointments.find(apt => {
//                 const aptTime = apt.dateTime.toTimeString().slice(0, 5);
//                 return aptTime === appointment_time;
//             });

//             if (appointment) {
//             } else if (dayAppointments.length > 0) {
//                 appointment = dayAppointments[0];
//             }
//         }

//         if (!appointment) {
//             return {
//                 success: false,
//                 message: `No appointment found for Dr. ${doctor.name} on ${appointment_date}${appointment_time ? ` at ${appointment_time}` : ''}. Check the appointment details and try again.`
//             };
//         }

//         // Cancel the appointment
//         const originalStatus = appointment.status;
//         appointment.status = 'cancelled';
//         appointment.cancellationReason = reason || 'Patient requested';
//         appointment.cancelledAt = new Date();

//         await appointment.save();

//         return {
//             success: true,
//             message: `Appointment on ${appointment_date}${appointment_time ? ` at ${appointment_time}` : ''} with Dr. ${doctor.name} has been cancelled`,
//             cancelled_appointment: {
//                 id: appointment._id,
//                 doctor: doctor.name,
//                 date: appointment.dateTime.toISOString().split('T')[0],
//                 time: appointment.dateTime.toTimeString().slice(0, 5),
//                 reason: reason || 'Patient requested',
//                 previous_status: originalStatus
//             }
//         };

//     } catch (error) {
//         return { 
//             success: false, 
//             message: `Error cancelling appointment: ${error.message}. Please check the server logs for more details.`
//         };
//     }
// };

// export const findPatientAppointments = async (searchParams) => {
//     try {
//         const { patient_name, patient_phone, doctor_name, date_from } = searchParams;

//         // Build query to find patient
//         let patientQuery = {};
//         if (patient_name) patientQuery.name = new RegExp(patient_name, 'i');
//         if (patient_phone) patientQuery.phoneNumber = patient_phone;

//         const patient = await Patient.findOne(patientQuery);
//         if (!patient) {
//             return { success: false, message: "Patient not found with provided details" };
//         }

//         // Build appointment query
//         let appointmentQuery = { patient: patient._id };

//         if (doctor_name) {
//             const doctor = await Doctor.findOne({ name: new RegExp(doctor_name, 'i') });
//             if (doctor) appointmentQuery.doctor = doctor._id;
//         }

//         if (date_from) {
//             appointmentQuery.dateTime = { $gte: new Date(date_from) };
//         }

//         const appointments = await Appointment.find(appointmentQuery)
//             .populate('doctor', 'name')
//             .populate('patient', 'name')
//             .sort({ dateTime: 1 });

//         const appointmentList = appointments.map(apt => ({
//             id: apt._id,
//             doctor: apt.doctor.name,
//             date: apt.dateTime.toISOString().split('T')[0],
//             time: apt.dateTime.toTimeString().slice(0, 5),
//             reason: apt.reason,
//             status: apt.status
//         }));

//         return {
//             success: true,
//             appointments: appointmentList,
//             message: `Found ${appointments.length} appointment(s)`
//         };
//     } catch (error) {
//         console.error('Error finding appointments:', error);
//         return { success: false, message: "Error searching for appointments" };
//     }
// };

// export const getAppointments = async ({ patient_id, doctor_id, upcoming = true }) => {
//     try {
//         const query = {};
//         if (patient_id) query.patient = patient_id;
//         if (doctor_id) query.doctor = doctor_id;

//         // Filter upcoming or past appointments
//         if (upcoming) {
//             query.dateTime = { $gte: new Date() }; // future
//         } else {
//             query.dateTime = { $lt: new Date() }; // past
//         }

//         const appointments = await Appointment.find(query)
//             .populate("patient", "name phone")
//             .populate("doctor", "name specialty")
//             .sort({ dateTime: 1 }); // soonest first

//         return {
//             success: true,
//             count: appointments.length,
//             appointments: appointments.map(a => ({
//                 appointmentId: a._id,
//                 patient: a.patient,
//                 doctor: a.doctor,
//                 dateTime: a.dateTime,
//                 status: a.status,
//                 reason: a.reason,
//             }))
//         };
//     } catch (error) {
//         console.error("Error fetching appointments:", error);
//         return { success: false, message: "Error fetching appointments", error: error.message };
//     }
// };

{/* with emr */ }
// import Appointment from "../models/Appointment.js";
// import Doctor from "../models/Doctor.js";
// import Hospital from "../models/Hospital.js";
// import Patient from "../models/Patient.js";

// /**
//  * Book appointment - Now with automatic FHIR sync
//  */
// export const bookAppointment = async ({
//     patient_firstname,
//     patient_lastname,
//     patient_phone,
//     patient_dob,
//     patient_age,
//     doctor_name,
//     date,
//     time,
//     reason,
//     hospitalContext
// }) => {
//     try {
//         // Step 1: Find or create patient (auto-syncs to FHIR)
//         let patient = await Patient.findOne({ phone: patient_phone });
//         if (!patient) {
//             patient = new Patient({
//                 firstName: patient_firstname,
//                 lastName: patient_lastname,
//                 phone: patient_phone,
//                 dob: patient_dob,
//                 age: patient_age
//             });
//             await patient.save(); // Auto-syncs to FHIR via post-save hook
//             console.log(`New patient created and synced to FHIR: ${patient.fhirId}`);
//         }

//         // Step 2: Find doctor
//         const doctor = await Doctor.findOne({ name: doctor_name });
//         if (!doctor) {
//             return { success: false, message: "Doctor not found" };
//         }

//         // Ensure doctor is synced to FHIR
//         if (!doctor.fhirId) {
//             console.log('🔄 Doctor not in FHIR, syncing now...');
//             await doctor.syncToFHIR();
//             console.log(`Doctor synced to FHIR: ${doctor.fhirId}`);
//         }

//         const hospital = await Hospital.findById(hospitalContext.hospitalId);
//         if (!hospital) {
//             return { success: false, message: "Hospital context not found" };
//         }

//         // Ensure hospital is synced to FHIR
//         if (!hospital.fhirId) {
//             console.log('🔄 Hospital not in FHIR, syncing now...');
//             await hospital.syncToFHIR();
//             console.log(`Hospital synced to FHIR: ${hospital.fhirId}`);
//         }

//         // Step 3: Build appointment Date object
//         const dateTime = new Date(`${date}T${time}:00`);

//         // Step 4: Create appointment (auto-syncs to FHIR)
//         const appointment = new Appointment({
//             patient: patient._id,
//             doctor: doctor._id,
//             hospital: hospital._id,
//             dateTime,
//             reason,
//             status: 'scheduled'
//         });

//         await appointment.save(); // Auto-syncs to FHIR via post-save hook

//         // Reload to get FHIR IDs
//         await appointment.populate(['patient', 'doctor', 'hospital']);

//         console.log(`Appointment created and synced to FHIR: ${appointment.fhirId}`);

//         return {
//             success: true,
//             message: `Appointment booked with ${doctor_name} on ${date} at ${time}`,
//             appointmentId: appointment._id,
//             patientId: patient._id,
//             fhirAppointmentId: appointment.fhirId,
//             fhirPatientId: patient.fhirId,
//             syncStatus: {
//                 patient: patient.fhirSyncStatus,
//                 doctor: doctor.fhirSyncStatus,
//                 appointment: appointment.fhirSyncStatus
//             }
//         };
//     } catch (error) {
//         console.error("Error booking appointment:", error);
//         return {
//             success: false,
//             message: "Error booking appointment",
//             error: error.message
//         };
//     }
// };

// /**
//  * Reschedule appointment - Updates both MongoDB and FHIR
//  */
// export const rescheduleAppointmentByDetails = async (rescheduleData) => {
//     try {
//         const {
//             patient_name,
//             patient_phone,
//             original_doctor,
//             original_date,
//             original_time,
//             new_date,
//             new_time
//         } = rescheduleData;

//         // Find patient
//         const patient = await Patient.findOne({ phone: patient_phone });
//         if (!patient) {
//             return { success: false, message: "Patient not found" };
//         }

//         // Find doctor
//         const doctor = await Doctor.findOne({ name: original_doctor });
//         if (!doctor) {
//             return { success: false, message: "Doctor not found" };
//         }

//         // Find original appointment
//         const originalDateTime = new Date(`${original_date}T${original_time}:00`);
//         const appointment = await Appointment.findOne({
//             patient: patient._id,
//             doctor: doctor._id,
//             dateTime: originalDateTime
//         });

//         if (!appointment) {
//             return { success: false, message: "Original appointment not found" };
//         }

//         // Update appointment
//         const newDateTime = new Date(`${new_date}T${new_time}:00`);
//         appointment.dateTime = newDateTime;
//         appointment.status = 'rescheduled';

//         await appointment.save(); // Auto-syncs update to FHIR

//         console.log(`Appointment rescheduled and synced to FHIR: ${appointment.fhirId}`);

//         return {
//             success: true,
//             message: `Appointment rescheduled to ${new_date} at ${new_time}`,
//             appointmentId: appointment._id,
//             fhirAppointmentId: appointment.fhirId,
//             fhirSyncStatus: appointment.fhirSyncStatus
//         };
//     } catch (error) {
//         console.error("Error rescheduling appointment:", error);
//         return {
//             success: false,
//             message: "Error rescheduling appointment",
//             error: error.message
//         };
//     }
// };

// /**
//  * Cancel appointment - Updates both MongoDB and FHIR
//  */
// export const cancelAppointmentByDetails = async (cancelData) => {
//     try {
//         const {
//             patient_phone,
//             doctor_name,
//             date,
//             time
//         } = cancelData;

//         // Find patient
//         const patient = await Patient.findOne({ phone: patient_phone });
//         if (!patient) {
//             return { success: false, message: "Patient not found" };
//         }

//         // Find doctor
//         const doctor = await Doctor.findOne({ name: doctor_name });
//         if (!doctor) {
//             return { success: false, message: "Doctor not found" };
//         }

//         // Find appointment
//         const dateTime = new Date(`${date}T${time}:00`);
//         const appointment = await Appointment.findOne({
//             patient: patient._id,
//             doctor: doctor._id,
//             dateTime: dateTime
//         });

//         if (!appointment) {
//             return { success: false, message: "Appointment not found" };
//         }

//         // Update appointment status
//         appointment.status = 'cancelled';
//         await appointment.save(); // Auto-syncs update to FHIR

//         console.log(`Appointment cancelled and synced to FHIR: ${appointment.fhirId}`);

//         return {
//             success: true,
//             message: "Appointment cancelled successfully",
//             appointmentId: appointment._id,
//             fhirAppointmentId: appointment.fhirId,
//             fhirSyncStatus: appointment.fhirSyncStatus
//         };
//     } catch (error) {
//         console.error("Error cancelling appointment:", error);
//         return {
//             success: false,
//             message: "Error cancelling appointment",
//             error: error.message
//         };
//     }
// };

// /**
//  * Find patient appointments - Can search both MongoDB and FHIR
//  */
// export const findPatientAppointments = async (patientPhone, searchInFHIR = false) => {
//     try {
//         const patient = await Patient.findOne({ phone: patientPhone });
//         if (!patient) {
//             return { success: false, message: "Patient not found" };
//         }

//         // Get appointments from MongoDB
//         const mongoAppointments = await Appointment.find({
//             patient: patient._id
//         })
//             .populate('doctor')
//             .sort({ dateTime: -1 });

//         const result = {
//             success: true,
//             source: 'MongoDB',
//             patientId: patient._id,
//             fhirPatientId: patient.fhirId,
//             appointments: mongoAppointments
//         };

//         // Optionally also search FHIR server
//         if (searchInFHIR && patient.fhirId) {
//             const fhirResult = await Appointment.searchInFHIR({
//                 patient: patient.fhirId,
//                 _sort: '-date'
//             });

//             if (fhirResult.success) {
//                 result.fhirAppointments = fhirResult.entries;
//                 result.source = 'MongoDB + FHIR';
//             }
//         }

//         return result;
//     } catch (error) {
//         console.error("Error finding patient appointments:", error);
//         return {
//             success: false,
//             message: "Error finding appointments",
//             error: error.message
//         };
//     }
// };

// /**
//  * Sync existing appointment to FHIR
//  */
// export const syncAppointmentToFHIR = async (appointmentId) => {
//     try {
//         const appointment = await Appointment.findById(appointmentId)
//             .populate(['patient', 'doctor']);

//         if (!appointment) {
//             return { success: false, message: "Appointment not found" };
//         }

//         const result = await appointment.syncToFHIR();

//         return {
//             success: result.success,
//             message: result.success
//                 ? "Appointment synced to FHIR successfully"
//                 : "Failed to sync appointment to FHIR",
//             appointmentId: appointment._id,
//             fhirId: appointment.fhirId,
//             error: result.error
//         };
//     } catch (error) {
//         console.error("Error syncing appointment:", error);
//         return {
//             success: false,
//             message: "Error syncing appointment",
//             error: error.message
//         };
//     }
// };

{/*for family */ }

// EMR-ONLY APPOINTMENT BOOKING
// This version works DIRECTLY with FHIR/EMR without MongoDB
// EMR-ONLY APPOINTMENT BOOKING
// This version works DIRECTLY with FHIR/EMR without MongoDB
// EMR-ONLY APPOINTMENT BOOKING
// This version works DIRECTLY with FHIR/EMR without MongoDB

import fhirService from "../services/fhirService.js";
import fhirSearchService from "../services/fhirSearchService.js";

/**
 * Booking types supported
 */
export const BOOKING_TYPES = {
    SELF: 'self',
    FAMILY: 'family',
    CARE_CENTER: 'care_center'
};

/**
 * Check if patient exists in FHIR - EMR ONLY
 */
export async function checkPatientExists(searchCriteria, bookingType) {
    try {
        console.log('ðŸ” Searching patient in FHIR:', searchCriteria);

        let searchResult = null;
        let searchMethod = '';

        // Try to find by phone first
        if (searchCriteria.phone) {
            searchResult = await fhirSearchService.findOrImportPatientByPhone(searchCriteria.phone, true);
            searchMethod = 'phone';
        }
        // Try by identifier (for care center patient ID)
        else if (searchCriteria.patient_id && bookingType === 'care_center') {
            searchResult = await fhirSearchService.findPatientByIdentifier(searchCriteria.patient_id, true);
            searchMethod = 'patient_id';
        }
        // Try by name and birthdate
        else if (searchCriteria.first_name && searchCriteria.dob) {
            searchResult = await fhirSearchService.findPatientByNameAndDOB(
                searchCriteria.first_name,
                searchCriteria.last_name || '',
                searchCriteria.dob,
                true
            );
            searchMethod = 'name_and_dob';
        }
        else {
            return {
                success: true,
                patient_exists: false,
                message: "Insufficient search criteria",
                next_step: "collect_more_info"
            };
        }

        if (searchResult.success && searchResult.patient) {
            // Get appointment history
            const historyResult = await fhirSearchService.getPatientAppointmentHistory(
                searchResult.patient.fhirId,
                3
            );

            const lastVisit = historyResult.appointments.length > 0
                ? historyResult.appointments[0].dateTime.toLocaleDateString()
                : 'No previous visits';

            return {
                success: true,
                patient_exists: true,
                patient: {
                    fhirId: searchResult.patient.fhirId,
                    name: `${searchResult.patient.firstName} ${searchResult.patient.lastName}`,
                    phone: searchResult.patient.phone,
                    last_visit: lastVisit,
                    total_visits: historyResult.total
                },
                search_method: searchMethod,
                message: `Found existing patient in EMR. Last visit: ${lastVisit}`
            };
        } else {
            return {
                success: true,
                patient_exists: false,
                message: "Patient not found in EMR. Will create new patient record.",
                next_step: "collect_full_patient_info"
            };
        }

    } catch (error) {
        console.error('Error checking patient in FHIR:', error);
        return {
            success: false,
            error: error.message,
            message: "Error checking patient records in EMR"
        };
    }
}

/**
 * Book appointment in FHIR only
 */
export async function bookAppointment(bookingData) {
    try {
        console.log('ðŸ“… Booking appointment in FHIR only:', bookingData.bookingType);

        let patientFhirId, patientName, patientPhone;
        let callerFhirId = null;
        if (!bookingData.bookingType) {
            console.log('📋 Processing simple booking format');

            // Create patient from simple format
            const patientResult = await findOrCreatePatientInFHIR(
                bookingData.patient_phone,
                `${bookingData.patient_firstname} ${bookingData.patient_lastname || ''}`.trim()
            );

            if (!patientResult.success) {
                return { success: false, message: 'Failed to create patient in EMR' };
            }

            patientFhirId = patientResult.fhirId;
            patientName = patientResult.name;
            patientPhone = patientResult.phone;

            // Build doctorInfo if not provided
            if (!bookingData.doctorInfo) {
                bookingData.doctorInfo = {
                    name: bookingData.doctor_name,
                    specialty: bookingData.specialty || 'General Practice'
                };
            }

            // Build appointmentDateTime if not provided
            if (!bookingData.appointmentDateTime) {
                bookingData.appointmentDateTime = new Date(`${bookingData.date}T${bookingData.time}:00`);
            }

            // Set default bookingType for extension
            bookingData.bookingType = 'SIMPLE';
        }
        // Handle different booking types
        else if (bookingData.bookingType === BOOKING_TYPES.SELF) {
            const result = await findOrCreatePatientInFHIR(
                bookingData.callerPhone,
                bookingData.callerName
            );
            if (!result.success) {
                return { success: false, message: 'Failed to create patient in EMR' };
            }
            patientFhirId = result.fhirId;
            patientName = result.name;
            patientPhone = result.phone;
        }
        else if (bookingData.bookingType === BOOKING_TYPES.FAMILY) {
            const callerResult = await findOrCreatePatientInFHIR(
                bookingData.callerPhone,
                bookingData.callerName
            );
            if (callerResult.success) {
                callerFhirId = callerResult.fhirId;
            }

            const familyResult = await handleFamilyBookingFHIR(
                callerFhirId,
                bookingData.patientInfo
            );
            if (!familyResult.success) {
                return { success: false, message: 'Failed to create family member in EMR' };
            }
            patientFhirId = familyResult.fhirId;
            patientName = familyResult.name;
            patientPhone = familyResult.phone;
        }
        else if (bookingData.bookingType === BOOKING_TYPES.CARE_CENTER) {
            const careCenterResult = await handleCareCenterBookingFHIR(bookingData.patientInfo);
            if (!careCenterResult.success) {
                return { success: false, message: 'Failed to create care center patient in EMR' };
            }
            patientFhirId = careCenterResult.fhirId;
            patientName = careCenterResult.name;
            patientPhone = careCenterResult.phone;
        }

        // Find or create doctor
        const doctorResult = await findOrCreateDoctorInFHIR(bookingData.doctorInfo);
        if (!doctorResult.success) {
            return { success: false, message: 'Failed to find doctor in EMR' };
        }

        // Check availability
        const availabilityResult = await checkDoctorAvailabilityFHIR(
            doctorResult.fhirId,
            bookingData.appointmentDateTime
        );

        if (!availabilityResult.available) {
            const alternativeSlots = await findAvailableSlotsFHIR(
                doctorResult.fhirId,
                bookingData.appointmentDateTime
            );
            return {
                success: false,
                message: 'Doctor not available at requested time',
                alternative_slots: alternativeSlots
            };
        }

        // Create appointment in FHIR
        const confirmationNumber = `APT-${Date.now().toString().slice(-6)}`;

        const appointmentResource = {
            resourceType: 'Appointment',
            status: 'booked',
            description: bookingData.reason || 'General consultation',
            start: bookingData.appointmentDateTime.toISOString(),
            end: new Date(bookingData.appointmentDateTime.getTime() + 30 * 60000).toISOString(),
            participant: [
                {
                    actor: {
                        reference: `Patient/${patientFhirId}`,
                        display: patientName
                    },
                    status: 'accepted'
                },
                {
                    actor: {
                        reference: `Practitioner/${doctorResult.fhirId}`,
                        display: doctorResult.name
                    },
                    status: 'accepted'
                }
            ],
            extension: [
                {
                    url: 'http://hospital.com/confirmation-number',
                    valueString: confirmationNumber
                },
                {
                    url: 'http://hospital.com/booking-type',
                    valueString: bookingData.bookingType
                }
            ]
        };

        if (callerFhirId && bookingData.bookingType === BOOKING_TYPES.FAMILY) {
            appointmentResource.extension.push({
                url: 'http://hospital.com/booked-by',
                valueReference: {
                    reference: `Patient/${callerFhirId}`
                }
            });
        }

        const createResult = await fhirService.axios.post('/Appointment', appointmentResource);
        const createdAppointment = createResult.data;

        console.log('âœ… Appointment created in FHIR:', createdAppointment.id);

        return {
            success: true,
            message: `Appointment booked successfully for ${patientName}`,
            appointment: {
                fhirId: createdAppointment.id,
                confirmationNumber: confirmationNumber,
                patientName: patientName,
                doctorName: doctorResult.name,
                dateTime: bookingData.appointmentDateTime,
                reason: bookingData.reason
            }
        };

    } catch (error) {
        console.error('âŒ Error booking appointment:', error);
        return {
            success: false,
            message: 'Failed to book appointment in EMR',
            error: error.message
        };
    }
}

/**
 * Find appointments in FHIR
 */
export async function getAppointments(req, res) {
    try {
        const { patient_id, doctor_id, upcoming } = req.query;

        // Build FHIR search parameters
        const searchParams = {};

        if (patient_id) {
            searchParams.patient = patient_id;
        }

        if (doctor_id) {
            searchParams.practitioner = doctor_id;
        }

        // Filter by date
        if (upcoming !== "false") {
            // Future appointments
            searchParams.date = `ge${new Date().toISOString()}`;
        } else {
            // Past appointments
            searchParams.date = `lt${new Date().toISOString()}`;
        }

        // Add sort parameter (ascending for upcoming, descending for past)
        searchParams._sort = upcoming !== "false" ? 'date' : '-date';
        searchParams._count = 50; // Limit results

        console.log('ðŸ” Searching appointments in FHIR:', searchParams);

        const response = await fhirService.axios.get('/Appointment', {
            params: searchParams
        });

        const appointments = response.data?.entry || [];

        // Format appointments for response
        const formattedAppointments = await Promise.all(
            appointments.map(async (entry) => {
                const apt = entry.resource;

                // Get patient and practitioner details
                const patientRef = apt.participant?.find(p => p.actor?.reference?.startsWith('Patient/'));
                const practitionerRef = apt.participant?.find(p => p.actor?.reference?.startsWith('Practitioner/'));

                let patientDetails = null;
                let doctorDetails = null;

                if (patientRef) {
                    try {
                        const patientId = patientRef.actor.reference.split('/')[1];
                        const patientResponse = await fhirService.axios.get(`/Patient/${patientId}`);
                        const patient = patientResponse.data;
                        patientDetails = {
                            fhirId: patient.id,
                            name: `${patient.name[0]?.given[0] || ''} ${patient.name[0]?.family || ''}`.trim(),
                            phone: patient.telecom?.find(t => t.system === 'phone')?.value || ''
                        };
                    } catch (err) {
                        console.error('Error fetching patient:', err);
                    }
                }

                if (practitionerRef) {
                    try {
                        const practitionerId = practitionerRef.actor.reference.split('/')[1];
                        const practitionerResponse = await fhirService.axios.get(`/Practitioner/${practitionerId}`);
                        const practitioner = practitionerResponse.data;
                        doctorDetails = {
                            fhirId: practitioner.id,
                            name: `${practitioner.name[0]?.given[0] || ''} ${practitioner.name[0]?.family || ''}`.trim(),
                            specialty: practitioner.qualification?.[0]?.code?.text || 'General'
                        };
                    } catch (err) {
                        console.error('Error fetching practitioner:', err);
                    }
                }

                // Extract confirmation number from extensions
                const confirmationNumber = apt.extension?.find(
                    ext => ext.url === 'http://hospital.com/confirmation-number'
                )?.valueString;

                return {
                    appointmentId: apt.id,
                    confirmationNumber: confirmationNumber,
                    patient: patientDetails,
                    doctor: doctorDetails,
                    dateTime: new Date(apt.start),
                    status: apt.status,
                    reason: apt.description
                };
            })
        );

        res.status(200).json({
            success: true,
            count: formattedAppointments.length,
            appointments: formattedAppointments
        });

    } catch (error) {
        console.error("Error fetching appointments from FHIR:", error);
        res.status(500).json({
            success: false,
            message: "Error fetching appointments from EMR",
            error: error.message
        });
    }
}

/**
 * Reschedule appointment in FHIR
 */
export async function rescheduleAppointmentByDetails(rescheduleData) {
    try {
        const {
            patient_name,
            patient_phone,
            original_doctor,
            original_date,
            original_time,
            new_date,
            new_time
        } = rescheduleData;

        console.log('ðŸ”„ Rescheduling appointment in FHIR:', rescheduleData);

        // Step 1: Find patient by phone
        const patientResult = await fhirSearchService.findOrImportPatientByPhone(patient_phone, true);
        if (!patientResult.success || !patientResult.patient) {
            return { success: false, message: "Patient not found in EMR" };
        }
        const patientFhirId = patientResult.patient.fhirId;

        // Step 2: Find doctor by name
        const doctorResult = await findOrCreateDoctorInFHIR({ name: original_doctor });
        if (!doctorResult.success) {
            return { success: false, message: "Doctor not found in EMR" };
        }
        const doctorFhirId = doctorResult.fhirId;

        // Step 3: Find the appointment
        const originalDateTime = new Date(`${original_date}T${original_time}:00`);
        const originalDateISO = originalDateTime.toISOString();

        const searchParams = {
            patient: patientFhirId,
            practitioner: doctorFhirId,
            date: originalDateISO
        };

        const response = await fhirService.axios.get('/Appointment', {
            params: searchParams
        });

        const appointments = response.data?.entry || [];
        if (appointments.length === 0) {
            return { success: false, message: "Original appointment not found in EMR" };
        }

        const appointment = appointments[0].resource;

        // Step 4: Check availability for new time
        const newDateTime = new Date(`${new_date}T${new_time}:00`);
        const availabilityResult = await checkDoctorAvailabilityFHIR(
            doctorFhirId,
            newDateTime
        );

        if (!availabilityResult.available) {
            const alternativeSlots = await findAvailableSlotsFHIR(
                doctorFhirId,
                newDateTime
            );
            return {
                success: false,
                message: 'Doctor not available at requested time',
                alternative_slots: alternativeSlots
            };
        }

        // Step 5: Update appointment
        appointment.start = newDateTime.toISOString();
        appointment.end = new Date(newDateTime.getTime() + 30 * 60000).toISOString();
        appointment.status = 'booked'; // Keep as booked, just rescheduled

        // Add rescheduled extension
        appointment.extension = appointment.extension || [];
        appointment.extension.push({
            url: 'http://hospital.com/rescheduled',
            valueBoolean: true
        });
        appointment.extension.push({
            url: 'http://hospital.com/original-date',
            valueDateTime: originalDateISO
        });

        await fhirService.axios.put(`/Appointment/${appointment.id}`, appointment);

        console.log('âœ… Appointment rescheduled in FHIR:', appointment.id);

        return {
            success: true,
            message: `Appointment rescheduled to ${new_date} at ${new_time}`,
            appointment: {
                fhirId: appointment.id,
                patientName: patient_name,
                doctorName: original_doctor,
                newDateTime: newDateTime,
                originalDateTime: originalDateTime
            }
        };

    } catch (error) {
        console.error("âŒ Error rescheduling appointment:", error);
        return {
            success: false,
            message: "Error rescheduling appointment in EMR",
            error: error.message
        };
    }
}

/**
 * Cancel appointment in FHIR
 */
export async function cancelAppointmentByDetails(cancelData) {
    try {
        const {
            patient_phone,
            doctor_name,
            date,
            time
        } = cancelData;

        console.log('âŒ Cancelling appointment in FHIR:', cancelData);

        // Step 1: Find patient by phone
        const patientResult = await fhirSearchService.findOrImportPatientByPhone(patient_phone, true);
        if (!patientResult.success || !patientResult.patient) {
            return { success: false, message: "Patient not found in EMR" };
        }
        const patientFhirId = patientResult.patient.fhirId;

        // Step 2: Find doctor by name
        const doctorResult = await findOrCreateDoctorInFHIR({ name: doctor_name });
        if (!doctorResult.success) {
            return { success: false, message: "Doctor not found in EMR" };
        }
        const doctorFhirId = doctorResult.fhirId;

        // Step 3: Find the appointment
        const appointmentDateTime = new Date(`${date}T${time}:00`);
        const dateTimeISO = appointmentDateTime.toISOString();

        const searchParams = {
            patient: patientFhirId,
            practitioner: doctorFhirId,
            date: dateTimeISO
        };

        const response = await fhirService.axios.get('/Appointment', {
            params: searchParams
        });

        const appointments = response.data?.entry || [];
        if (appointments.length === 0) {
            return { success: false, message: "Appointment not found in EMR" };
        }

        const appointment = appointments[0].resource;

        // Step 4: Update appointment status to cancelled
        appointment.status = 'cancelled';

        // Add cancellation extension
        appointment.extension = appointment.extension || [];
        appointment.extension.push({
            url: 'http://hospital.com/cancelled-date',
            valueDateTime: new Date().toISOString()
        });

        await fhirService.axios.put(`/Appointment/${appointment.id}`, appointment);

        console.log('âœ… Appointment cancelled in FHIR:', appointment.id);

        return {
            success: true,
            message: "Appointment cancelled successfully",
            appointment: {
                fhirId: appointment.id,
                patientPhone: patient_phone,
                doctorName: doctor_name,
                dateTime: appointmentDateTime
            }
        };

    } catch (error) {
        console.error("âŒ Error cancelling appointment:", error);
        return {
            success: false,
            message: "Error cancelling appointment in EMR",
            error: error.message
        };
    }
}

/**
 * Find patient appointments by phone
 */
export async function findPatientAppointments(searchData) {
    try {
        const { patient_phone, include_past = false, limit = 5 } = searchData;

        console.log('ðŸ” Finding patient appointments in FHIR:', searchData);

        // Find patient by phone
        const patientResult = await fhirSearchService.findOrImportPatientByPhone(patient_phone, true);
        if (!patientResult.success || !patientResult.patient) {
            return {
                success: false,
                message: "Patient not found in EMR",
                appointments: []
            };
        }

        const patientFhirId = patientResult.patient.fhirId;

        // Get appointment history
        const historyResult = await fhirSearchService.getPatientAppointmentHistory(
            patientFhirId,
            limit,
            include_past
        );

        if (!historyResult.success) {
            return {
                success: false,
                message: "Error fetching appointments from EMR",
                appointments: []
            };
        }

        // Format appointments
        const formattedAppointments = historyResult.appointments.map(apt => ({
            fhirId: apt.fhirId,
            confirmationNumber: apt.confirmationNumber,
            doctorName: apt.doctorName,
            dateTime: apt.dateTime,
            status: apt.status,
            reason: apt.reason
        }));

        return {
            success: true,
            message: `Found ${formattedAppointments.length} appointments`,
            count: formattedAppointments.length,
            total: historyResult.total,
            patient: {
                fhirId: patientFhirId,
                name: `${patientResult.patient.firstName} ${patientResult.patient.lastName}`,
                phone: patient_phone
            },
            appointments: formattedAppointments
        };

    } catch (error) {
        console.error("âŒ Error finding patient appointments:", error);
        return {
            success: false,
            message: "Error finding patient appointments in EMR",
            error: error.message,
            appointments: []
        };
    }
}

/**
 * Helper: Find or create patient in FHIR
 */
async function findOrCreatePatientInFHIR(phone, name) {
    try {
        const result = await fhirSearchService.findOrImportPatientByPhone(phone, true);

        if (result.success && result.patient) {
            return {
                success: true,
                fhirId: result.patient.fhirId,
                name: `${result.patient.firstName} ${result.patient.lastName}`,
                phone: result.patient.phone
            };
        }

        // Create new patient
        const [firstName, ...lastNameParts] = name.split(' ');
        const lastName = lastNameParts.join(' ') || '';

        const patientResource = {
            resourceType: 'Patient',
            name: [{
                given: [firstName],
                family: lastName,
                use: 'official'
            }],
            telecom: [{
                system: 'phone',
                value: phone,
                use: 'mobile'
            }],
            active: true
        };

        const createResult = await fhirService.axios.post('/Patient', patientResource);
        const createdPatient = createResult.data;

        console.log('âœ… New patient created in FHIR:', createdPatient.id);

        return {
            success: true,
            fhirId: createdPatient.id,
            name: name,
            phone: phone
        };

    } catch (error) {
        console.error('Error finding/creating patient in FHIR:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Helper: Handle family booking in FHIR
 */
async function handleFamilyBookingFHIR(callerFhirId, patientInfo) {
    try {
        const { name, phone, relationship, dob, age } = patientInfo;

        // Try to find family member first
        if (phone) {
            const result = await findOrCreatePatientInFHIR(phone, name);
            if (result.success) {
                // Create RelatedPerson resource to link caller and family member
                if (callerFhirId) {
                    const relatedPersonResource = {
                        resourceType: 'RelatedPerson',
                        patient: {
                            reference: `Patient/${result.fhirId}`
                        },
                        relationship: [{
                            coding: [{
                                system: 'http://terminology.hl7.org/CodeSystem/v3-RoleCode',
                                code: relationship || 'FAMMEMB',
                                display: relationship || 'Family Member'
                            }]
                        }],
                        extension: [{
                            url: 'http://hospital.com/booked-by',
                            valueReference: {
                                reference: `Patient/${callerFhirId}`
                            }
                        }]
                    };

                    await fhirService.axios.post('/RelatedPerson', relatedPersonResource);
                }

                return result;
            }
        }

        // Create new family member
        const [firstName, ...lastNameParts] = name.split(' ');
        const lastName = lastNameParts.join(' ') || '';

        const patientResource = {
            resourceType: 'Patient',
            name: [{
                given: [firstName],
                family: lastName,
                use: 'official'
            }],
            telecom: phone ? [{
                system: 'phone',
                value: phone,
                use: 'mobile'
            }] : [],
            birthDate: dob || null,
            active: true,
            extension: []
        };

        if (age) {
            patientResource.extension.push({
                url: 'http://hospital.com/age',
                valueInteger: parseInt(age)
            });
        }

        const createResult = await fhirService.axios.post('/Patient', patientResource);
        const createdPatient = createResult.data;

        // Create RelatedPerson link
        if (callerFhirId) {
            const relatedPersonResource = {
                resourceType: 'RelatedPerson',
                patient: {
                    reference: `Patient/${createdPatient.id}`
                },
                relationship: [{
                    coding: [{
                        system: 'http://terminology.hl7.org/CodeSystem/v3-RoleCode',
                        code: relationship || 'FAMMEMB',
                        display: relationship || 'Family Member'
                    }]
                }],
                extension: [{
                    url: 'http://hospital.com/booked-by',
                    valueReference: {
                        reference: `Patient/${callerFhirId}`
                    }
                }]
            };

            await fhirService.axios.post('/RelatedPerson', relatedPersonResource);
        }

        return {
            success: true,
            fhirId: createdPatient.id,
            name: name,
            phone: phone || generatePlaceholderPhone()
        };

    } catch (error) {
        console.error('Error handling family booking in FHIR:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Helper: Handle care center booking in FHIR
 */
async function handleCareCenterBookingFHIR(patientInfo) {
    try {
        const { name, patient_id, care_center_name, dob, age } = patientInfo;

        // Try to find by patient ID first
        if (patient_id) {
            const result = await fhirSearchService.findPatientByIdentifier(patient_id, true);
            if (result.success && result.patient) {
                return {
                    success: true,
                    fhirId: result.patient.fhirId,
                    name: `${result.patient.firstName} ${result.patient.lastName}`,
                    phone: result.patient.phone
                };
            }
        }

        // Create new care center patient
        const [firstName, ...lastNameParts] = name.split(' ');
        const lastName = lastNameParts.join(' ') || '';

        const patientResource = {
            resourceType: 'Patient',
            identifier: patient_id ? [{
                system: 'http://hospital.com/care-center-patient-id',
                value: patient_id
            }] : [],
            name: [{
                given: [firstName],
                family: lastName,
                use: 'official'
            }],
            telecom: [{
                system: 'phone',
                value: generatePlaceholderPhone(),
                use: 'mobile'
            }],
            birthDate: dob || null,
            active: true,
            extension: []
        };

        if (age) {
            patientResource.extension.push({
                url: 'http://hospital.com/age',
                valueInteger: parseInt(age)
            });
        }

        if (care_center_name) {
            patientResource.extension.push({
                url: 'http://hospital.com/care-center',
                valueString: care_center_name
            });
        }

        const createResult = await fhirService.axios.post('/Patient', patientResource);
        const createdPatient = createResult.data;

        return {
            success: true,
            fhirId: createdPatient.id,
            name: name,
            phone: createdPatient.telecom[0].value
        };

    } catch (error) {
        console.error('Error handling care center booking in FHIR:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Helper: Find or create doctor in FHIR
 */
async function findOrCreateDoctorInFHIR(doctorInfo) {
    try {
        const { name, specialty } = doctorInfo;

        // Search for existing doctor
        const searchParams = {
            name: name
        };

        const response = await fhirService.axios.get('/Practitioner', {
            params: searchParams
        });

        const practitioners = response.data?.entry || [];

        if (practitioners.length > 0) {
            const practitioner = practitioners[0].resource;
            return {
                success: true,
                fhirId: practitioner.id,
                name: `${practitioner.name[0]?.given[0] || ''} ${practitioner.name[0]?.family || ''}`.trim(),
                specialty: practitioner.qualification?.[0]?.code?.text || specialty || 'General'
            };
        }

        // Create new practitioner
        const [firstName, ...lastNameParts] = name.split(' ');
        const lastName = lastNameParts.join(' ') || '';

        const practitionerResource = {
            resourceType: 'Practitioner',
            name: [{
                given: [firstName],
                family: lastName,
                use: 'official'
            }],
            active: true,
            qualification: specialty ? [{
                code: {
                    text: specialty
                }
            }] : []
        };

        const createResult = await fhirService.axios.post('/Practitioner', practitionerResource);
        const createdPractitioner = createResult.data;

        console.log('âœ… New practitioner created in FHIR:', createdPractitioner.id);

        return {
            success: true,
            fhirId: createdPractitioner.id,
            name: name,
            specialty: specialty || 'General'
        };

    } catch (error) {
        console.error('Error finding/creating doctor in FHIR:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Helper: Check doctor availability in FHIR
 */
async function checkDoctorAvailabilityFHIR(doctorFhirId, requestedDateTime) {
    try {
        const startTime = new Date(requestedDateTime);
        const endTime = new Date(startTime.getTime() + 30 * 60000); // 30 min slot

        // Search for conflicting appointments
        const searchParams = {
            practitioner: doctorFhirId,
            date: `ge${startTime.toISOString()}`,
            status: 'booked,confirmed'
        };

        const response = await fhirService.axios.get('/Appointment', {
            params: searchParams
        });

        const appointments = response.data?.entry || [];

        // Check for time conflicts
        const hasConflict = appointments.some(entry => {
            const apt = entry.resource;
            const aptStart = new Date(apt.start);
            const aptEnd = new Date(apt.end);

            return (
                (startTime >= aptStart && startTime < aptEnd) ||
                (endTime > aptStart && endTime <= aptEnd) ||
                (startTime <= aptStart && endTime >= aptEnd)
            );
        });

        return {
            available: !hasConflict,
            doctorFhirId: doctorFhirId,
            requestedDateTime: requestedDateTime
        };

    } catch (error) {
        console.error('Error checking availability in FHIR:', error);
        return {
            available: false,
            error: error.message
        };
    }
}

/**
 * Helper: Find available slots in FHIR
 */
async function findAvailableSlotsFHIR(doctorFhirId, startDate, days = 7) {
    try {
        const slots = [];
        const currentDate = new Date(startDate);
        currentDate.setHours(9, 0, 0, 0); // Start at 9 AM

        for (let day = 0; day < days; day++) {
            for (let hour = 9; hour < 17; hour++) { // 9 AM to 5 PM
                const slotTime = new Date(currentDate);
                slotTime.setHours(hour, 0, 0, 0);

                const availabilityResult = await checkDoctorAvailabilityFHIR(
                    doctorFhirId,
                    slotTime
                );

                if (availabilityResult.available) {
                    slots.push({
                        dateTime: slotTime,
                        date: slotTime.toISOString().split('T')[0],
                        time: slotTime.toTimeString().split(' ')[0].substring(0, 5)
                    });

                    if (slots.length >= 5) break; // Return first 5 available slots
                }
            }

            if (slots.length >= 5) break;
            currentDate.setDate(currentDate.getDate() + 1);
        }

        return slots;

    } catch (error) {
        console.error('Error finding available slots:', error);
        return [];
    }
}

/**
 * Update patient metadata
 */
export async function updatePatientMetadata(patientFhirId, info) {
    try {
        console.log('Updating patient metadata in FHIR:', patientFhirId);

        const currentPatient = await fhirService.axios.get(`/Patient/${patientFhirId}`);

        if (!currentPatient.data) {
            return {
                success: false,
                message: "Patient not found in EMR"
            };
        }

        const fhirPatient = currentPatient.data;
        fhirPatient.extension = fhirPatient.extension || [];

        // Update medical history
        if (info.medical_history) {
            const medHistoryExtIndex = fhirPatient.extension.findIndex(
                ext => ext.url === 'http://hospital.com/medical-history'
            );

            if (medHistoryExtIndex !== -1) {
                fhirPatient.extension[medHistoryExtIndex].valueString = info.medical_history;
            } else {
                fhirPatient.extension.push({
                    url: 'http://hospital.com/medical-history',
                    valueString: info.medical_history
                });
            }
        }

        if (info.preferred_doctor) {
            const doctorResult = await findOrCreateDoctorInFHIR({
                name: info.preferred_doctor
            });

            if (doctorResult.success) {
                fhirPatient.extension = fhirPatient.extension || [];
                const prefDoctorExtIndex = fhirPatient.extension.findIndex(
                    ext => ext.url === 'http://hospital.com/preferred-practitioner'
                );

                if (prefDoctorExtIndex !== -1) {
                    fhirPatient.extension[prefDoctorExtIndex].valueReference = {
                        reference: `Practitioner/${doctorResult.fhirId}`,
                        display: doctorResult.name
                    };
                } else {
                    fhirPatient.extension.push({
                        url: 'http://hospital.com/preferred-practitioner',
                        valueReference: {
                            reference: `Practitioner/${doctorResult.fhirId}`,
                            display: doctorResult.name
                        }
                    });
                }
            }
        }

        if (info.preferred_time) {
            fhirPatient.extension = fhirPatient.extension || [];
            const prefTimeExtIndex = fhirPatient.extension.findIndex(
                ext => ext.url === 'http://hospital.com/preferred-time'
            );

            if (prefTimeExtIndex !== -1) {
                fhirPatient.extension[prefTimeExtIndex].valueString = info.preferred_time;
            } else {
                fhirPatient.extension.push({
                    url: 'http://hospital.com/preferred-time',
                    valueString: info.preferred_time
                });
            }
        }

        await fhirService.axios.put(`/Patient/${patientFhirId}`, fhirPatient);

        return {
            success: true,
            message: "Patient information updated successfully in EMR",
            fhirId: patientFhirId
        };

    } catch (error) {
        console.error('âŒ Error updating patient:', error);
        return {
            success: false,
            message: "Failed to update patient information in EMR",
            error: error.message
        };
    }
}

/**
 * Generate placeholder phone
 */
function generatePlaceholderPhone() {
    return `+1999${Math.floor(Math.random() * 10000000).toString().padStart(7, '0')}`;
}
/**
 * Update patient information in FHIR only
 */
export async function updatePatientInfo(patientFhirId, info) {
    try {
        console.log('ðŸ”„ Updating patient in FHIR:', patientFhirId);

        // First, get the current patient from FHIR
        const currentPatient = await fhirService.axios.get(`/Patient/${patientFhirId}`);

        if (!currentPatient.data) {
            return {
                success: false,
                message: "Patient not found in EMR"
            };
        }

        const fhirPatient = currentPatient.data;

        // Update name if provided
        if (info.name || info.first_name || info.last_name) {
            const firstName = info.first_name || info.name?.split(' ')[0];
            const lastName = info.last_name || info.name?.split(' ').slice(1).join(' ');

            fhirPatient.name = [{
                use: 'official',
                family: lastName || fhirPatient.name[0]?.family || '',
                given: [firstName || fhirPatient.name[0]?.given[0] || '']
            }];
        }

        // Update email
        if (info.email) {
            const existingEmail = fhirPatient.telecom?.findIndex(t => t.system === 'email');
            if (existingEmail !== -1) {
                fhirPatient.telecom[existingEmail].value = info.email;
            } else {
                fhirPatient.telecom = fhirPatient.telecom || [];
                fhirPatient.telecom.push({
                    system: 'email',
                    value: info.email,
                    use: 'home'
                });
            }
        }

        // Update phone
        if (info.phone) {
            const existingPhone = fhirPatient.telecom?.findIndex(t => t.system === 'phone');
            if (existingPhone !== -1) {
                fhirPatient.telecom[existingPhone].value = info.phone;
            } else {
                fhirPatient.telecom = fhirPatient.telecom || [];
                fhirPatient.telecom.push({
                    system: 'phone',
                    value: info.phone,
                    use: 'mobile'
                });
            }
        }

        // Update date of birth
        if (info.dob) {
            let dobDate;
            if (info.dob.length === 8) {
                // Format: YYYYMMDD
                const year = info.dob.substring(0, 4);
                const month = info.dob.substring(4, 6);
                const day = info.dob.substring(6, 8);
                dobDate = `${year}-${month}-${day}`;
            } else {
                // Assume ISO format or parseable date
                dobDate = new Date(info.dob).toISOString().split('T')[0];
            }
            fhirPatient.birthDate = dobDate;
        }

        // Update gender
        if (info.gender) {
            fhirPatient.gender = info.gender.toLowerCase();
        }

        // Update age (store in extension)
        if (info.age) {
            fhirPatient.extension = fhirPatient.extension || [];
            const ageExtIndex = fhirPatient.extension.findIndex(
                ext => ext.url === 'http://hospital.com/age'
            );

            if (ageExtIndex !== -1) {
                fhirPatient.extension[ageExtIndex].valueInteger = parseInt(info.age);
            } else {
                fhirPatient.extension.push({
                    url: 'http://hospital.com/age',
                    valueInteger: parseInt(info.age)
                });
            }
        }

        // Update preferred doctor (store in extension)
        if (info.preferred_doctor) {
            // Search for doctor in FHIR
            const doctorResult = await findOrCreateDoctorInFHIR({
                name: info.preferred_doctor
            });

            if (doctorResult.success) {
                fhirPatient.extension = fhirPatient.extension || [];
                const prefDoctorExtIndex = fhirPatient.extension.findIndex(
                    ext => ext.url === 'http://hospital.com/preferred-practitioner'
                );

                if (prefDoctorExtIndex !== -1) {
                    fhirPatient.extension[prefDoctorExtIndex].valueReference = {
                        reference: `Practitioner/${doctorResult.fhirId}`,
                        display: doctorResult.name
                    };
                } else {
                    fhirPatient.extension.push({
                        url: 'http://hospital.com/preferred-practitioner',
                        valueReference: {
                            reference: `Practitioner/${doctorResult.fhirId}`,
                            display: doctorResult.name
                        }
                    });
                }
            }
        }

        // Update preferred time (store in extension)
        if (info.preferred_time) {
            fhirPatient.extension = fhirPatient.extension || [];
            const prefTimeExtIndex = fhirPatient.extension.findIndex(
                ext => ext.url === 'http://hospital.com/preferred-time'
            );

            if (prefTimeExtIndex !== -1) {
                fhirPatient.extension[prefTimeExtIndex].valueString = info.preferred_time;
            } else {
                fhirPatient.extension.push({
                    url: 'http://hospital.com/preferred-time',
                    valueString: info.preferred_time
                });
            }
        }

        // Update the patient in FHIR
        const updateResult = await fhirService.axios.put(
            `/Patient/${patientFhirId}`,
            fhirPatient
        );

        console.log('âœ… Patient updated in FHIR:', patientFhirId);

        return {
            success: true,
            message: "Patient information updated successfully in EMR",
            fhirId: patientFhirId
        };

    } catch (error) {
        console.error('âŒ Error updating patient in FHIR:', error);
        return {
            success: false,
            message: "Failed to update patient information in EMR",
            error: error.message
        };
    }
}

/**
 * Update patient from appointment booking in FHIR only
 */
export async function updatePatientFromCall(appointmentData) {
    try {
        const { patientFhirId, doctor_name, date, time, reason } = appointmentData;

        if (!patientFhirId) {
            console.log('No patient FHIR ID provided for update');
            return;
        }

        console.log('ðŸ”„ Updating patient from call in FHIR:', patientFhirId);

        // Get current patient
        const currentPatient = await fhirService.axios.get(`/Patient/${patientFhirId}`);

        if (!currentPatient.data) {
            console.error('Patient not found in FHIR');
            return;
        }

        const fhirPatient = currentPatient.data;

        // Initialize extensions array if it doesn't exist
        fhirPatient.extension = fhirPatient.extension || [];

        // Update last appointment date
        const lastApptExtIndex = fhirPatient.extension.findIndex(
            ext => ext.url === 'http://hospital.com/last-appointment'
        );

        const lastAppointmentDate = new Date(`${date}T${time}:00`).toISOString();

        if (lastApptExtIndex !== -1) {
            fhirPatient.extension[lastApptExtIndex].valueDateTime = lastAppointmentDate;
        } else {
            fhirPatient.extension.push({
                url: 'http://hospital.com/last-appointment',
                valueDateTime: lastAppointmentDate
            });
        }

        // Update preferred doctor if provided
        if (doctor_name) {
            const doctorResult = await findOrCreateDoctorInFHIR({ name: doctor_name });

            if (doctorResult.success) {
                const prefDoctorExtIndex = fhirPatient.extension.findIndex(
                    ext => ext.url === 'http://hospital.com/preferred-practitioner'
                );

                if (prefDoctorExtIndex !== -1) {
                    fhirPatient.extension[prefDoctorExtIndex].valueReference = {
                        reference: `Practitioner/${doctorResult.fhirId}`,
                        display: doctorResult.name
                    };
                } else {
                    fhirPatient.extension.push({
                        url: 'http://hospital.com/preferred-practitioner',
                        valueReference: {
                            reference: `Practitioner/${doctorResult.fhirId}`,
                            display: doctorResult.name
                        }
                    });
                }
            }
        }

        // Add call note (using Communication resource)
        const communicationResource = {
            resourceType: 'Communication',
            status: 'completed',
            subject: {
                reference: `Patient/${patientFhirId}`
            },
            sent: new Date().toISOString(),
            payload: [{
                contentString: `Appointment booked for ${date} at ${time}. Reason: ${reason}. Requested doctor: ${doctor_name || 'Not specified'}`
            }],
            category: [{
                coding: [{
                    system: 'http://terminology.hl7.org/CodeSystem/communication-category',
                    code: 'notification',
                    display: 'Notification'
                }]
            }]
        };

        // Create communication record
        await fhirService.axios.post('/Communication', communicationResource);

        // Update patient
        await fhirService.axios.put(`/Patient/${patientFhirId}`, fhirPatient);

        console.log('âœ… Patient updated from call in FHIR');

    } catch (error) {
        console.error('âŒ Error updating patient from call in FHIR:', error);
    }
}

/**
 * Load patient data from FHIR only
 */
export async function loadPatientData(patientFhirId) {
    try {
        console.log('📥 Loading patient data from FHIR:', patientFhirId);

        // Get patient from FHIR
        const patientResult = await fhirService.getPatient(patientFhirId);

        if (!patientResult.data) {
            return null;
        }

        const fhirPatient = patientResult.data;

        // Get appointment history - SEARCH by patient reference
        const appointmentsResult = await fhirService.searchAppointments({
            patient: patientFhirId,
            _sort: '-date', // Most recent first
            _count: 100 // Adjust as needed
        });

        const appointments = appointmentsResult.data?.entry || [];
        const totalVisits = appointments.length;
        const lastVisit = appointments.length > 0
            ? new Date(appointments[0].resource.start)
            : null;

        // Extract extensions
        const extensions = fhirPatient.extension || [];
        const ageExt = extensions.find(ext => ext.url === 'http://hospital.com/age');
        const prefDoctorExt = extensions.find(ext => ext.url === 'http://hospital.com/preferred-practitioner');
        const prefTimeExt = extensions.find(ext => ext.url === 'http://hospital.com/preferred-time');

        // Build patient data object
        const patientData = {
            fhirId: fhirPatient.id,
            firstName: fhirPatient.name[0]?.given[0] || '',
            lastName: fhirPatient.name[0]?.family || '',
            phone: fhirPatient.telecom?.find(t => t.system === 'phone')?.value || '',
            email: fhirPatient.telecom?.find(t => t.system === 'email')?.value || '',
            dob: fhirPatient.birthDate || null,
            age: ageExt?.valueInteger || null,
            gender: fhirPatient.gender || null,
            preferredDoctor: prefDoctorExt?.valueReference?.display || null,
            preferredTime: prefTimeExt?.valueString || null,
            lastVisit: lastVisit,
            totalVisits: totalVisits
        };

        // Load upcoming appointments
        const now = new Date();
        const upcomingAppointmentsResult = await fhirService.searchAppointments({
            patient: patientFhirId,
            date: `ge${now.toISOString().split('T')[0]}`, // Greater than or equal to today
            status: 'booked,confirmed',
            _sort: 'date',
            _count: 10
        });

        const upcomingAppointments = [];
        const upcomingEntries = upcomingAppointmentsResult.data?.entry || [];

        for (const entry of upcomingEntries) {
            const apt = entry.resource;

            // Get doctor details
            const doctorRef = apt.participant?.find(p =>
                p.actor?.reference?.startsWith('Practitioner/')
            )?.actor?.reference;

            let doctorName = 'Unknown';
            let doctorSpecialty = '';

            if (doctorRef) {
                const doctorId = doctorRef.split('/')[1];
                try {
                    const doctorResult = await fhirService.getPractitioner(doctorId);
                    if (doctorResult.data) {
                        doctorName = doctorResult.data.name?.[0]?.text ||
                            `${doctorResult.data.name?.[0]?.given?.[0] || ''} ${doctorResult.data.name?.[0]?.family || ''}`.trim();
                        doctorSpecialty = doctorResult.data.qualification?.[0]?.code?.text || '';
                    }
                } catch (err) {
                    console.error('Error fetching doctor details:', err);
                }
            }

            const appointmentDate = new Date(apt.start);
            const confirmationExt = apt.extension?.find(ext =>
                ext.url === 'http://hospital.com/confirmation-number'
            );

            upcomingAppointments.push({
                id: apt.id,
                doctor: doctorName,
                specialty: doctorSpecialty,
                date: appointmentDate.toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                }),
                time: appointmentDate.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit'
                }),
                reason: apt.description || 'General consultation',
                status: apt.status,
                confirmationNumber: confirmationExt?.valueString || `APT-${apt.id.slice(-6).toUpperCase()}`
            });
        }

        console.log('Patient data loaded from emr:', patientData);
        console.log('Upcoming appointments loaded:', upcomingAppointments.length);

        // Return both patient data and appointments
        return {
            patientData,
            upcomingAppointments
        };

    } catch (error) {
        console.error('❌ Error loading patient data from FHIR:', error);
        return null;
    }
}