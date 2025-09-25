import twilio from "twilio";
import Patient from "../models/Patient.js";
import CallLog from "../models/CallLog.js";
import Hospital from "../models/Hospital.js";
import Call from "../models/Call.js";
import Appointment from "../models/Appointment.js";
import callService from "../services/callService.js";
import 'dotenv/config';

const VoiceResponse = twilio.twiml.VoiceResponse;

/**
 * Handle inbound calls from Twilio
 */
export const inboundCall = async (req, res) => {
    try {
        const callerId = req.body.From;
        const callSid = req.body.CallSid;
        const to = req.body.To;

        let patient = await Patient.findOne({ phone: callerId });
        if (!patient) {
            patient = new Patient({ phone: callerId });
            await patient.save();
        }

        let hospital = await Hospital.findOne({ phonenumber: to });
        if (!hospital) {
            console.warn(`No hospital found for number: ${to}`);
        }

        // Create call record
        const call = new Call({
            type: "inbound",
            status: "completed",
            callSid: callSid,
            from: callerId,
            to: to,
            patient: patient._id,
            hospitalId: hospital?._id,
        });
        await call.save();

        const hospitalData = hospital
            ? {
                id: hospital._id.toString(),
                name: hospital.name,
                phone: hospital.phonenumber,
                email: hospital.email,
                address: hospital.hospitalAddress,
                website: hospital.hospitalWebsite,
                weekdayHours: hospital.weekdayHours || "8:00 AM - 8:00 PM",
                weekendHours: hospital.weekendHours || "9:00 AM - 5:00 PM",
                emergencyHours: hospital.emergencyHours || "24/7",
                departments: hospital.departments || [],
            }
            : null;

        // Store context for inbound calls (similar to outbound pattern)
        global.callContextMap = global.callContextMap || new Map();
        const contextKey = `inbound_${call._id}`;

        const callContext = {
            type: 'inbound',
            callType: 'general',
            patientId: patient._id.toString(),
            callRecordId: call._id.toString(),
            from: callerId,
            to: to,
            patientName: patient.name,
            hospital: hospitalData,
            contextKey: contextKey,
            timestamp: Date.now()
        };

        // Store context by multiple keys for lookup flexibility
        global.callContextMap.set(contextKey, callContext);
        global.callContextMap.set(callSid, callContext); // Also store by Twilio SID

        // Update call context with actual Twilio SID (similar to outbound pattern)
        const context = global.callContextMap.get(contextKey);
        context.twilioCallSid = callSid;
        global.callContextMap.set(callSid, context); // Also store by Twilio SID
        global.callContextMap.set(contextKey, context);

        // Tell Twilio to stream audio to our backend with context key
        const twiml = new VoiceResponse();
        twiml.connect().stream({
            url: `${process.env.BASE_URL.replace(/^https?:\/\//, "wss://")}/api/calls/stream?contextKey=${contextKey}`
        });

        res.type("text/xml");
        res.send(twiml.toString());
    } catch (err) {
        console.error("Inbound call error:", err);
        res.status(500).send("Error handling inbound call");
    }
};

/**
 * Make outbound call to a specific patient by phone number
 */
export const outboundCall = async (req, res) => {
    try {

        const { phoneNumber, reason, callType = 'general' } = req.body;

        const result = await callService.makeOutboundCall({
            phoneNumber,
            reason,
            callType,
            hospitalId: req.hospitalId,
            appointmentId: req.body.appointmentId,
            reminderType: req.body.reminderType,
            reminderData: req.body.reminderData,
            followUpData: req.body.followUpData,
            patientId: req.body.patientId
        });

        res.json(result);
    } catch (err) {
        console.error("Outbound call error:", err);
        res.status(500).json({
            error: "Failed to make outbound call",
            details: err.message,
            code: err.code
        });
    }
};

/**
 * Generate TwiML for outbound calls that connects to streaming
 */
export const outboundTwiml = async (req, res) => {
    try {
        const { contextKey } = req.query;

        if (!contextKey) {
            console.error("No context key provided for outbound call");
            return res.status(400).send("Missing context key");
        }

        const twiml = new VoiceResponse();
        twiml.connect().stream({
            url: `${process.env.BASE_URL.replace(/^https?:\/\//, "wss://")}/api/calls/stream?contextKey=${contextKey}`
        });

        res.type("text/xml");
        res.send(twiml.toString());
    } catch (err) {
        console.error("Outbound TwiML error:", err);
        res.status(500).send("Error generating outbound TwiML");
    }
};

/**
 * Make appointment reminder call
 */
export const makeAppointmentReminderCall = async (req, res) => {
    try {
        const { appointmentId, reminderType } = req.body; // Add reminderType

        const result = await callService.makeAppointmentReminderCall(
            appointmentId,
            reminderType,
            req.hospitalId
        );

        res.json(result);
    } catch (err) {
        console.error("Appointment reminder call error:", err);
        res.status(500).json({
            error: "Failed to make appointment reminder call",
            details: err.message
        });
    }
};

/**
 * Make follow-up call
 */
export const makeFollowUpCall = async (req, res) => {
    try {
        const { patientId, followUpType, appointmentId, notes } = req.body;

        const result = await callService.makeFollowUpCall({
            patientId,
            followUpType,
            appointmentId,
            notes,
            hospitalId: req.hospitalId
        });

        res.json(result);
    } catch (err) {
        console.error("Follow-up call error:", err);
        res.status(500).json({
            error: "Failed to make follow-up call",
            details: err.message
        });
    }
};

/**
 * End call
 */
export const endCall = async (req, res) => {
    try {
        const { callSid } = req.body;
        const result = await callService.endCall(callSid);
        res.json(result);
    } catch (err) {
        console.error("End call error:", err);
        res.status(500).json({ error: "Failed to end call" });
    }
};

/**
 * Transfer active call to hospital staff
 */
export const transferCall = async (req, res) => {
    try {
        const { callSid, reason, department = 'general' } = req.body;

        if (!callSid) {
            return res.status(400).json({
                error: 'Call SID is required'
            });
        }

        // Get hospital phone number
        const hospital = await Hospital.findById(req.hospitalId);
        const transferNumber = hospital?.phonenumber || process.env.HOSPITAL_MAIN_PHONE;

        if (!transferNumber) {
            return res.status(400).json({
                error: 'Hospital phone number not configured'
            });
        }

        // Initialize Twilio client
        const twilioClient = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH);

        // Create transfer TwiML
        const transferTwiml = `
            <Response>
                <Say voice="alice">Please hold while I transfer you to our ${department} department.</Say>
                <Dial timeout="30" record="false" callerId="${process.env.TWILIO_PHONE}">
                    <Number>${transferNumber}</Number>
                </Dial>
                <Say voice="alice">I'm sorry, but no one is available right now. Please try calling ${transferNumber} directly or leave a message after the tone.</Say>
                <Record timeout="60" transcribe="false" maxLength="300" />
                <Say voice="alice">Thank you for your message. Someone will get back to you soon. Goodbye.</Say>
            </Response>
        `;

        // Execute transfer
        await twilioClient.calls(callSid).update({
            twiml: transferTwiml
        });

        // Log the transfer
        await CallLog.create({
            callSid: callSid,
            actionTaken: 'transferred_to_human',
            transferReason: reason,
            transferDepartment: department,
            transferredAt: new Date(),
            transferNumber: transferNumber
        });

        console.log(`Call ${callSid} transferred to ${transferNumber} (${department})`);

        res.json({
            success: true,
            message: `Call transferred to ${department} department`,
            transferNumber: transferNumber,
            department: department
        });

    } catch (error) {
        console.error('Transfer call error:', error);
        res.status(500).json({
            error: 'Failed to transfer call',
            details: error.message
        });
    }
};

/**
 * Handle call status updates from Twilio
 */
export const handleCallStatus = async (req, res) => {
    try {
        const { CallSid, CallStatus } = req.body;

        const call = await Call.findOneAndUpdate(
            { callSid: CallSid },
            { $set: { status: CallStatus, updatedAt: new Date() } },
            { new: true }
        );

        if (!call) {
            console.warn(`No call record found for CallSid ${CallSid}`);
            return res.sendStatus(200);
        }

        console.log(`Call ${CallSid} status updated to ${CallStatus}`);

        // Handle appointment reminder status updates
        if (call?.metadata?.callType === "appointment_reminder" && call.metadata.appointmentId) {
            const reminderType = call.metadata.reminderType || 'manual';
            await Appointment.findByIdAndUpdate(call.metadata.appointmentId, {
                $set: {
                    [`reminderCalls.${reminderType}.status`]: CallStatus === "completed" ? "answered" : CallStatus,
                    [`reminderCalls.${reminderType}.callSid`]: CallSid,
                    [`reminderCalls.${reminderType}.updatedAt`]: new Date()
                }
            });
        }

        // Handle follow-up call status updates
        if (call?.metadata?.callType === "follow_up" && call.metadata.appointmentId) {
            const status = this.mapCallStatusToFollowUpStatus(CallStatus);
            await Appointment.findByIdAndUpdate(call.metadata.appointmentId, {
                $set: {
                    'followUpCall.status': status,
                    'followUpCall.callSid': CallSid,
                    'followUpCall.lastStatusUpdate': new Date()
                }
            });
        }

        res.sendStatus(200);
    } catch (err) {
        console.error("Error handling call status update:", err);
        res.sendStatus(500);
    }
};

/**
 * Map Twilio call status to our follow-up status
 */
const mapCallStatusToFollowUpStatus = (twilioStatus) => {
    switch (twilioStatus) {
        case 'completed':
            return 'answered';
        case 'busy':
            return 'busy';
        case 'no-answer':
        case 'failed':
            return 'no_answer';
        case 'canceled':
            return 'canceled';
        default:
            return 'in_progress';
    }
};

/**
 * Fetch call logs from DB
 */
export const callLogs = async (req, res) => {
    try {
        const logs = await CallLog.find().populate("patient", "phone name");
        res.json(logs);
    } catch (err) {
        console.error("Call logs error:", err);
        res.status(500).json({ error: "Failed to fetch call logs" });
    }
};
