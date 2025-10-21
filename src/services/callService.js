// import twilio from "twilio";
// import Patient from "../models/Patient.js";
// import Call from "../models/Call.js";
// import Appointment from "../models/Appointment.js";
// import Hospital from "../models/Hospital.js";
// import 'dotenv/config';

// class CallService {
//     constructor() {
//         this.twilioClient = null;
//         this.initializeTwilio();
//     }

//     initializeTwilio() {
//         if (process.env.TWILIO_SID && process.env.TWILIO_AUTH) {
//             this.twilioClient = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH);
//         }
//     }

//     /**
//      * Make an outbound call - core logic without HTTP dependencies
//      */
//     async makeOutboundCall(options) {
//         const {
//             phoneNumber,
//             reason,
//             callType = 'general',
//             appointmentId,
//             reminderType,
//             reminderData,
//             followUpData,
//             patientId
//         } = options;

//         try {
//             // Validate environment
//             this.validateTwilioConfig();

//             if (!phoneNumber) {
//                 throw new Error("Phone number is required");
//             }

//             let from = process.env.TWILIO_PHONE;
//             let patient = null;

//             // If patientId provided, use it; otherwise look up by phone
//             if (patientId) {
//                 patient = await Patient.findById(patientId);
//                 if (!patient) {
//                     throw new Error("Patient not found with provided ID");
//                 }
//             } else {
//                 // Look up patient by phone number
//                 console.log('Looking up patient by phone number:', phoneNumber);
//                 patient = await Patient.findOne({ phone: phoneNumber });

//                 if (!patient) {
//                     console.log('Patient not found, creating new patient record');
//                     patient = new Patient({
//                         phone: phoneNumber,
//                         name: `Patient ${phoneNumber.slice(-4)}`
//                     });
//                     await patient.save();
//                     console.log('Created new patient:', patient._id);
//                 } else {
//                     console.log('Found existing patient:', patient._id, patient.name);
//                 }
//             }

//             let hospital = await Hospital.findOne({ phonenumber: from });
//             if (!hospital) {
//                 console.warn(`No hospital found for number: ${from}`);
//             }

//             // Create call record BEFORE making the call
//             const callRecord = new Call({
//                 type: "outbound",
//                 status: "initiated",
//                 from: process.env.TWILIO_PHONE,
//                 to: phoneNumber,
//                 patient: patient._id,
//                 reason: reason || "Outbound call",
//                 hospitalId: hospital?._id,
//                 metadata: {
//                     callType: callType,
//                     originalPhoneInput: phoneNumber,
//                     appointmentId: appointmentId,
//                     reminderType: reminderType
//                 }
//             });
//             await callRecord.save();

//             const hospitalData = hospital
//                 ? {
//                     id: hospital._id.toString(),
//                     name: hospital.name,
//                     phone: hospital.phonenumber,
//                     email: hospital.email,
//                     address: hospital.hospitalAddress,
//                     website: hospital.hospitalWebsite,
//                     weekdayHours: hospital.weekdayHours || "8:00 AM - 8:00 PM",
//                     weekendHours: hospital.weekendHours || "9:00 AM - 5:00 PM",
//                     emergencyHours: hospital.emergencyHours || "24/7",
//                     departments: hospital.departments || [],
//                 }
//                 : null;

//             // Store enhanced context for outbound calls
//             global.callContextMap = global.callContextMap || new Map();
//             const contextKey = `outbound_${callRecord._id}`;

//             const callContext = {
//                 type: 'outbound',
//                 callType: callType,
//                 patientId: patient._id.toString(),
//                 callRecordId: callRecord._id.toString(),
//                 from: process.env.TWILIO_PHONE,
//                 to: phoneNumber,
//                 reason: reason,
//                 patientName: patient.name,
//                 contextKey: contextKey,
//                 appointmentId: appointmentId,
//                 reminderType: reminderType,
//                 reminderData: reminderData,
//                 followUpData: followUpData,
//                 hospital:hospitalData,
//                 timestamp: Date.now()
//             };

//             // Store context by multiple keys for lookup flexibility
//             global.callContextMap.set(contextKey, callContext);

//             // Make the actual Twilio call
//             const call = await this.twilioClient.calls.create({
//                 from: process.env.TWILIO_PHONE,
//                 to: phoneNumber,
//                 url: `${process.env.BASE_URL}/api/calls/outbound-twiml?contextKey=${contextKey}`,
//                 statusCallback: `${process.env.BASE_URL}/api/calls/status`,
//                 statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed','no_answer'],
//                 statusCallbackMethod: 'POST'
//             });

//             // Update call record with Twilio SID
//             await Call.findByIdAndUpdate(callRecord._id, {
//                 callSid: call.sid,
//                 status: call.status,
//                 metadata: {
//                     ...callRecord.metadata,
//                     contextKey: contextKey
//                 }
//             });

//             // Update context with actual Twilio SID
//             const context = global.callContextMap.get(contextKey);
//             context.twilioCallSid = call.sid;
//             global.callContextMap.set(call.sid, context);
//             global.callContextMap.set(contextKey, context);

//             return {
//                 success: true,
//                 call: {
//                     sid: call.sid,
//                     status: call.status,
//                     from: call.from,
//                     to: call.to,
//                     patientId: patient._id,
//                     patientName: patient.name,
//                     callRecordId: callRecord._id,
//                     contextKey: contextKey,
//                     callType: callType,
//                     reason: reason
//                 },
//                 patient: {
//                     id: patient._id,
//                     name: patient.name,
//                     phone: patient.phone,
//                 }
//             };

//         } catch (error) {
//             console.error("Outbound call service error:", error);
//             throw error;
//         }
//     }

//     /**
//      * Make appointment reminder call - core logic
//      */
//     async makeAppointmentReminderCall(appointmentId, reminderType, hospitalId) {
//         try {
//             const appointment = await Appointment.findById(appointmentId)
//                 .populate('patient', 'phone name')
//                 .populate('doctor', 'name specialty');

//             if (!appointment) {
//                 throw new Error("Appointment not found");
//             }

//             const reminderData = {
//                 appointmentDate: appointment.dateTime.toLocaleDateString(),
//                 appointmentTime: appointment.dateTime.toLocaleTimeString('en-US', {
//                     hour: '2-digit',
//                     minute: '2-digit'
//                 }),
//                 doctorName: appointment.doctor.name,
//                 doctorSpecialty: appointment.doctor.specialty,
//                 reason: appointment.reason,
//                 confirmationNumber: `APT-${appointment._id.toString().slice(-6).toUpperCase()}`,
//                 reminderType: reminderType || 'manual'
//             };

//             return await this.makeOutboundCall({
//                 phoneNumber: appointment.patient.phone,
//                 reason: `Appointment reminder - ${reminderType || 'manual'}`,
//                 callType: "appointment_reminder",
//                 appointmentId: appointmentId,
//                 reminderData: reminderData,
//                 reminderType: reminderType,
//                 hospitalId: hospitalId,
//                 patientId: appointment.patient._id
//             });

//         } catch (error) {
//             console.error("Appointment reminder call service error:", error);
//             throw error;
//         }
//     }

//     /**
//      * Make follow-up call - core logic
//      */
//     async makeFollowUpCall(options) {
//         const { patientId, followUpType, appointmentId, notes, hospitalId } = options;

//         try {
//             const patient = await Patient.findById(patientId);
//             if (!patient) {
//                 throw new Error("Patient not found");
//             }

//             let followUpData = {
//                 followUpType: followUpType, // 'post_appointment', 'check_in', 'prescription_reminder'
//                 notes: notes
//             };

//             if (appointmentId) {
//                 const appointment = await Appointment.findById(appointmentId)
//                     .populate('doctor', 'name specialty');
//                 if (appointment) {
//                     followUpData.lastAppointment = {
//                         date: appointment.dateTime.toLocaleDateString(),
//                         doctor: appointment.doctor.name,
//                         reason: appointment.reason
//                     };
//                 }
//             }

//             return await this.makeOutboundCall({
//                 patientId: patientId,
//                 phoneNumber: patient.phone,
//                 reason: `Follow-up call - ${followUpType}`,
//                 callType: "follow_up",
//                 followUpData: followUpData,
//                 hospitalId: hospitalId,
//                 appointmentId: appointmentId
//             });

//         } catch (error) {
//             console.error("Follow-up call service error:", error);
//             throw error;
//         }
//     }

//     /**
//      * End a call
//      */
//     async endCall(callSid) {
//         try {
//             await this.twilioClient.calls(callSid).update({ status: "completed" });
//             return { success: true };
//         } catch (error) {
//             console.error("End call service error:", error);
//             throw error;
//         }
//     }

//     /**
//      * Validate Twilio configuration
//      */
//     validateTwilioConfig() {
//         if (!process.env.TWILIO_SID || !process.env.TWILIO_AUTH) {
//             throw new Error("Missing Twilio credentials");
//         }
//         if (!process.env.TWILIO_PHONE) {
//             throw new Error("Missing Twilio phone number configuration");
//         }
//         if (!process.env.BASE_URL) {
//             throw new Error("Missing BASE_URL configuration");
//         }
//     }
// }

// // Create singleton instance
// const callService = new CallService();
// export default callService;

import twilio from "twilio";
import Patient from "../models/Patient.js";
import Call from "../models/Call.js";
import Appointment from "../models/Appointment.js";
import Hospital from "../models/Hospital.js";
import 'dotenv/config';

class CallService {
    constructor() {
        this.twilioClient = null;
        this.initializeTwilio();
    }

    initializeTwilio() {
        if (process.env.TWILIO_SID && process.env.TWILIO_AUTH) {
            this.twilioClient = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH);
        }
    }

    /**
     * Make an outbound call - core logic without HTTP dependencies
     */
    async makeOutboundCall(options) {
        const {
            phoneNumber,
            reason,
            callType = 'general',
            appointmentId,
            reminderType,
            reminderData,
            followUpData,
            patientId,
            hospitalId,
            metadata
        } = options;

        try {
            // Validate environment
            this.validateTwilioConfig();

            if (!phoneNumber) {
                throw new Error("Phone number is required");
            }

            if (!hospitalId) {
                throw new Error("Hospital ID is required");
            }

            // Get hospital and their Twilio number
            const hospital = await Hospital.findById(hospitalId);
            if (!hospital) {
                throw new Error("Hospital not found");
            }

            if (!hospital.twilioPhoneNumber) {
                throw new Error("Hospital does not have a Twilio phone number configured");
            }

            const hospitalTwilioNumber = hospital.twilioPhoneNumber;
            let patient = null;

            // If patientId provided, use it; otherwise look up by phone
            if (patientId) {
                patient = await Patient.findById(patientId);
                if (!patient) {
                    throw new Error("Patient not found with provided ID");
                }
            } else {
                // Look up patient by phone number
                console.log('Looking up patient by phone number:', phoneNumber);
                patient = await Patient.findOne({ phone: phoneNumber });

                if (!patient) {
                    console.log('Patient not found, creating new patient record');
                    patient = new Patient({
                        phone: phoneNumber,
                        name: `Patient ${phoneNumber.slice(-4)}`
                    });
                    await patient.save();
                    console.log('Created new patient:', patient._id);
                } else {
                    console.log('Found existing patient:', patient._id, patient.name);
                }
            }

            const callMetadata = {
                callType: callType,
                originalPhoneInput: phoneNumber,
                appointmentId: appointmentId,
                reminderType: reminderType,
                ...(metadata || {})  // ✅ Merge additional metadata if provided
            };

            // Create call record BEFORE making the call
            const callRecord = new Call({
                type: "outbound",
                status: "initiated",
                from: hospitalTwilioNumber,
                to: phoneNumber,
                patient: patient._id,
                reason: reason || "Outbound call",
                hospitalId: hospital._id,
                metadata: callMetadata
            });
            await callRecord.save();

            const hospitalData = {
                id: hospital._id.toString(),
                name: hospital.name,
                phone: hospital.phonenumber,
                twilioPhone: hospital.twilioPhoneNumber,
                email: hospital.email,
                address: hospital.hospitalAddress,
                website: hospital.hospitalWebsite,
                weekdayHours: hospital.weekdayHours || "8:00 AM - 8:00 PM",
                weekendHours: hospital.weekendHours || "9:00 AM - 5:00 PM",
                emergencyHours: hospital.emergencyHours || "24/7",
                departments: hospital.departments || [],
            };

            // Store enhanced context for outbound calls
            global.callContextMap = global.callContextMap || new Map();
            const contextKey = `outbound_${callRecord._id}`;

            const callContext = {
                type: 'outbound',
                callType: callType,
                patientId: patient._id.toString(),
                callRecordId: callRecord._id.toString(),
                from: hospitalTwilioNumber,
                to: phoneNumber,
                reason: reason,
                patientName: patient.name,
                contextKey: contextKey,
                appointmentId: appointmentId,
                reminderType: reminderType,
                reminderData: reminderData,
                followUpData: followUpData,
                hospital: hospitalData,
                metadata: metadata || {},
                timestamp: Date.now()
            };

            // Store context by multiple keys for lookup flexibility
            global.callContextMap.set(contextKey, callContext);

            // Make the actual Twilio call using hospital's Twilio number
            const call = await this.twilioClient.calls.create({
                from: hospitalTwilioNumber,
                to: phoneNumber,
                url: `${process.env.BASE_URL}/api/calls/outbound-twiml?contextKey=${contextKey}`,
                statusCallback: `${process.env.BASE_URL}/api/calls/status`,
                statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed', 'no_answer'],
                statusCallbackMethod: 'POST'
            });

            // Update call record with Twilio SID
            await Call.findByIdAndUpdate(callRecord._id, {
                callSid: call.sid,
                status: call.status,
                metadata: {
                    ...(callRecord.metadata || {}),
                    contextKey: contextKey,
                    twilioCallSid: call.sid
                },
            },
                { new: true }
            );

            // Update context with actual Twilio SID
            const context = global.callContextMap.get(contextKey);
            context.twilioCallSid = call.sid;
            global.callContextMap.set(call.sid, context);
            global.callContextMap.set(contextKey, context);

            return {
                success: true,
                call: {
                    sid: call.sid,
                    status: call.status,
                    from: call.from,
                    to: call.to,
                    patientId: patient._id,
                    patientName: patient.name,
                    callRecordId: callRecord._id,
                    contextKey: contextKey,
                    callType: callType,
                    reason: reason,
                    hospitalId: hospital._id,
                    hospitalName: hospital.name
                },
                patient: {
                    id: patient._id,
                    name: patient.name,
                    phone: patient.phone,
                }
            };

        } catch (error) {
            console.error("Outbound call service error:", error);
            throw error;
        }
    }

    /**
     * Make appointment reminder call - core logic
     */
    async makeAppointmentReminderCall(appointmentId, reminderType, hospitalId) {
        try {
            if (!hospitalId) {
                throw new Error("Hospital ID is required");
            }

            const appointment = await Appointment.findById(appointmentId)
                .populate('patient', 'phone name')
                .populate('doctor', 'name specialty');

            if (!appointment) {
                throw new Error("Appointment not found");
            }

            const reminderData = {
                appointmentDate: appointment.dateTime.toLocaleDateString(),
                appointmentTime: appointment.dateTime.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit'
                }),
                doctorName: appointment.doctor.name,
                doctorSpecialty: appointment.doctor.specialty,
                reason: appointment.reason,
                confirmationNumber: `APT-${appointment._id.toString().slice(-6).toUpperCase()}`,
                reminderType: reminderType || 'manual'
            };

            return await this.makeOutboundCall({
                phoneNumber: appointment.patient.phone,
                reason: `Appointment reminder - ${reminderType || 'manual'}`,
                callType: "appointment_reminder",
                appointmentId: appointmentId,
                reminderData: reminderData,
                reminderType: reminderType,
                hospitalId: hospitalId,
                patientId: appointment.patient._id
            });

        } catch (error) {
            console.error("Appointment reminder call service error:", error);
            throw error;
        }
    }

    /**
     * Make follow-up call - core logic
     */
    async makeFollowUpCall(options) {
        const { patientId, followUpType, appointmentId, notes, hospitalId } = options;

        try {
            if (!hospitalId) {
                throw new Error("Hospital ID is required");
            }

            const patient = await Patient.findById(patientId);
            if (!patient) {
                throw new Error("Patient not found");
            }

            let followUpData = {
                followUpType: followUpType, // 'post_appointment', 'check_in', 'prescription_reminder'
                notes: notes
            };

            if (appointmentId) {
                const appointment = await Appointment.findById(appointmentId)
                    .populate('doctor', 'name specialty');
                if (appointment) {
                    followUpData.lastAppointment = {
                        date: appointment.dateTime.toLocaleDateString(),
                        doctor: appointment.doctor.name,
                        reason: appointment.reason
                    };
                }
            }

            return await this.makeOutboundCall({
                patientId: patientId,
                phoneNumber: patient.phone,
                reason: `Follow-up call - ${followUpType}`,
                callType: "follow_up",
                followUpData: followUpData,
                hospitalId: hospitalId,
                appointmentId: appointmentId
            });

        } catch (error) {
            console.error("Follow-up call service error:", error);
            throw error;
        }
    }

    /**
     * End a call
     */
    async endCall(callSid) {
        try {
            await this.twilioClient.calls(callSid).update({ status: "completed" });
            return { success: true };
        } catch (error) {
            console.error("End call service error:", error);
            throw error;
        }
    }

    /**
     * Validate Twilio configuration
     */
    validateTwilioConfig() {
        if (!process.env.TWILIO_SID || !process.env.TWILIO_AUTH) {
            throw new Error("Missing Twilio credentials");
        }
        if (!process.env.BASE_URL) {
            throw new Error("Missing BASE_URL configuration");
        }
    }
}

// Create singleton instance
const callService = new CallService();
export default callService;