
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


import Appointment from "../models/Appointment.js";
import Doctor from "../models/Doctor.js";
import Hospital from "../models/Hospital.js";
import Patient from "../models/Patient.js";

/**
 * Book appointment - Now with automatic FHIR sync
 */
export const bookAppointment = async ({
    patient_firstname,
    patient_lastname,
    patient_phone,
    patient_dob,
    patient_age,
    doctor_name,
    date,
    time,
    reason,
    hospitalContext
}) => {
    try {
        // Step 1: Find or create patient (auto-syncs to FHIR)
        let patient = await Patient.findOne({ phone: patient_phone });
        if (!patient) {
            patient = new Patient({
                firstName: patient_firstname,
                lastName: patient_lastname,
                phone: patient_phone,
                dob: patient_dob,
                age: patient_age
            });
            await patient.save(); // Auto-syncs to FHIR via post-save hook
            console.log(`New patient created and synced to FHIR: ${patient.fhirId}`);
        }

        // Step 2: Find doctor
        const doctor = await Doctor.findOne({ name: doctor_name });
        if (!doctor) {
            return { success: false, message: "Doctor not found" };
        }

        // Ensure doctor is synced to FHIR
        if (!doctor.fhirId) {
            console.log('🔄 Doctor not in FHIR, syncing now...');
            await doctor.syncToFHIR();
            console.log(`Doctor synced to FHIR: ${doctor.fhirId}`);
        }

        const hospital = await Hospital.findById(hospitalContext.hospitalId);
        if (!hospital) {
            return { success: false, message: "Hospital context not found" };
        }

        // Ensure hospital is synced to FHIR
        if (!hospital.fhirId) {
            console.log('🔄 Hospital not in FHIR, syncing now...');
            await hospital.syncToFHIR();
            console.log(`Hospital synced to FHIR: ${hospital.fhirId}`);
        }

        // Step 3: Build appointment Date object
        const dateTime = new Date(`${date}T${time}:00`);

        // Step 4: Create appointment (auto-syncs to FHIR)
        const appointment = new Appointment({
            patient: patient._id,
            doctor: doctor._id,
            hospital: hospital._id,
            dateTime,
            reason,
            status: 'scheduled'
        });

        await appointment.save(); // Auto-syncs to FHIR via post-save hook

        // Reload to get FHIR IDs
        await appointment.populate(['patient', 'doctor', 'hospital']);

        console.log(`Appointment created and synced to FHIR: ${appointment.fhirId}`);

        return {
            success: true,
            message: `Appointment booked with ${doctor_name} on ${date} at ${time}`,
            appointmentId: appointment._id,
            patientId: patient._id,
            fhirAppointmentId: appointment.fhirId,
            fhirPatientId: patient.fhirId,
            syncStatus: {
                patient: patient.fhirSyncStatus,
                doctor: doctor.fhirSyncStatus,
                appointment: appointment.fhirSyncStatus
            }
        };
    } catch (error) {
        console.error("Error booking appointment:", error);
        return {
            success: false,
            message: "Error booking appointment",
            error: error.message
        };
    }
};

/**
 * Reschedule appointment - Updates both MongoDB and FHIR
 */
export const rescheduleAppointmentByDetails = async (rescheduleData) => {
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

        // Find patient
        const patient = await Patient.findOne({ phone: patient_phone });
        if (!patient) {
            return { success: false, message: "Patient not found" };
        }

        // Find doctor
        const doctor = await Doctor.findOne({ name: original_doctor });
        if (!doctor) {
            return { success: false, message: "Doctor not found" };
        }

        // Find original appointment
        const originalDateTime = new Date(`${original_date}T${original_time}:00`);
        const appointment = await Appointment.findOne({
            patient: patient._id,
            doctor: doctor._id,
            dateTime: originalDateTime
        });

        if (!appointment) {
            return { success: false, message: "Original appointment not found" };
        }

        // Update appointment
        const newDateTime = new Date(`${new_date}T${new_time}:00`);
        appointment.dateTime = newDateTime;
        appointment.status = 'rescheduled';

        await appointment.save(); // Auto-syncs update to FHIR

        console.log(`Appointment rescheduled and synced to FHIR: ${appointment.fhirId}`);

        return {
            success: true,
            message: `Appointment rescheduled to ${new_date} at ${new_time}`,
            appointmentId: appointment._id,
            fhirAppointmentId: appointment.fhirId,
            fhirSyncStatus: appointment.fhirSyncStatus
        };
    } catch (error) {
        console.error("Error rescheduling appointment:", error);
        return {
            success: false,
            message: "Error rescheduling appointment",
            error: error.message
        };
    }
};

/**
 * Cancel appointment - Updates both MongoDB and FHIR
 */
export const cancelAppointmentByDetails = async (cancelData) => {
    try {
        const {
            patient_phone,
            doctor_name,
            date,
            time
        } = cancelData;

        // Find patient
        const patient = await Patient.findOne({ phone: patient_phone });
        if (!patient) {
            return { success: false, message: "Patient not found" };
        }

        // Find doctor
        const doctor = await Doctor.findOne({ name: doctor_name });
        if (!doctor) {
            return { success: false, message: "Doctor not found" };
        }

        // Find appointment
        const dateTime = new Date(`${date}T${time}:00`);
        const appointment = await Appointment.findOne({
            patient: patient._id,
            doctor: doctor._id,
            dateTime: dateTime
        });

        if (!appointment) {
            return { success: false, message: "Appointment not found" };
        }

        // Update appointment status
        appointment.status = 'cancelled';
        await appointment.save(); // Auto-syncs update to FHIR

        console.log(`Appointment cancelled and synced to FHIR: ${appointment.fhirId}`);

        return {
            success: true,
            message: "Appointment cancelled successfully",
            appointmentId: appointment._id,
            fhirAppointmentId: appointment.fhirId,
            fhirSyncStatus: appointment.fhirSyncStatus
        };
    } catch (error) {
        console.error("Error cancelling appointment:", error);
        return {
            success: false,
            message: "Error cancelling appointment",
            error: error.message
        };
    }
};

/**
 * Find patient appointments - Can search both MongoDB and FHIR
 */
export const findPatientAppointments = async (patientPhone, searchInFHIR = false) => {
    try {
        const patient = await Patient.findOne({ phone: patientPhone });
        if (!patient) {
            return { success: false, message: "Patient not found" };
        }

        // Get appointments from MongoDB
        const mongoAppointments = await Appointment.find({
            patient: patient._id
        })
            .populate('doctor')
            .sort({ dateTime: -1 });

        const result = {
            success: true,
            source: 'MongoDB',
            patientId: patient._id,
            fhirPatientId: patient.fhirId,
            appointments: mongoAppointments
        };

        // Optionally also search FHIR server
        if (searchInFHIR && patient.fhirId) {
            const fhirResult = await Appointment.searchInFHIR({
                patient: patient.fhirId,
                _sort: '-date'
            });

            if (fhirResult.success) {
                result.fhirAppointments = fhirResult.entries;
                result.source = 'MongoDB + FHIR';
            }
        }

        return result;
    } catch (error) {
        console.error("Error finding patient appointments:", error);
        return {
            success: false,
            message: "Error finding appointments",
            error: error.message
        };
    }
};

/**
 * Sync existing appointment to FHIR
 */
export const syncAppointmentToFHIR = async (appointmentId) => {
    try {
        const appointment = await Appointment.findById(appointmentId)
            .populate(['patient', 'doctor']);

        if (!appointment) {
            return { success: false, message: "Appointment not found" };
        }

        const result = await appointment.syncToFHIR();

        return {
            success: result.success,
            message: result.success
                ? "Appointment synced to FHIR successfully"
                : "Failed to sync appointment to FHIR",
            appointmentId: appointment._id,
            fhirId: appointment.fhirId,
            error: result.error
        };
    } catch (error) {
        console.error("Error syncing appointment:", error);
        return {
            success: false,
            message: "Error syncing appointment",
            error: error.message
        };
    }
};