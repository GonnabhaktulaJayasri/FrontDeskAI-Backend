// import mongoose from "mongoose";

// const patientSchema = new mongoose.Schema({
//     phone: { type: String, required: true, unique: true }, // Caller ID
//     name: { type: String },
//     age: { type: Number },
//     gender: { type: String, enum: ["male", "female", "other"] },

//     // Last confirmed appointment
//     lastAppointment: { type: Date },

//     // Preferences
//     preferredDoctor: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor" },
//     preferredDate: { type: String },   // "2025-09-12"
//     preferredTime: { type: String },   // "10:00"

//     // Call-specific captured info
//     callDetails: [
//         {
//             date: { type: Date, default: Date.now }, // when call happened
//             reason: { type: String },                // "fever", "follow-up", etc.
//             symptoms: { type: String },              // free text
//             requestedDoctor: { type: String },       // caller may mention a doctor name
//             notes: { type: String },                 // any extra notes from conversation
//         }
//     ],

// }, { timestamps: true });

// export default mongoose.model("Patient", patientSchema);

import mongoose from "mongoose";

const patientSchema = new mongoose.Schema({
    phone: { type: String, required: true, unique: true },
    name: { type: String },
    age: { type: Number },
    gender: { type: String, enum: ["male", "female", "other"] },

    // Last confirmed appointment
    lastAppointment: { type: Date },

    // Preferences
    preferredDoctor: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor" },
    preferredDate: { type: String },
    preferredTime: { type: String },

    // ENHANCED: Communication Preferences
    communicationPreferences: {
        preferredMethod: {
            type: String,
            enum: ['call', 'sms', 'whatsapp', 'both_messages'],
            default: 'call'
        },
        allowSMS: { type: Boolean, default: true },
        allowWhatsApp: { type: Boolean, default: false },
        allowCalls: { type: Boolean, default: true },
        language: { type: String, default: 'en' },
        timezone: { type: String, default: 'America/New_York' },
        
        // Message interaction preferences
        autoEscalateToCall: { type: Boolean, default: false }, // If they prefer messages but allow call escalation
        responseTimeoutHours: { type: Number, default: 4 }, // Hours to wait before escalating
        quietHours: {
            enabled: { type: Boolean, default: false },
            startTime: { type: String, default: '22:00' }, // 10 PM
            endTime: { type: String, default: '08:00' } // 8 AM
        }
    },

    // Message interaction history
    messageInteractions: [{
        type: { 
            type: String, 
            enum: ['appointment_reminder', 'follow_up', 'general', 'escalation_request'] 
        },
        method: { 
            type: String, 
            enum: ['sms', 'whatsapp'] 
        },
        messageSid: String,
        sentAt: { type: Date, default: Date.now },
        deliveredAt: Date,
        readAt: Date,
        respondedAt: Date,
        response: String,
        escalatedToCall: { type: Boolean, default: false },
        callSid: String, // If escalated to call
        appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
        
        // Message content tracking
        templateUsed: String,
        messageContent: String,
        responseContent: String,
        sentiment: { 
            type: String, 
            enum: ['positive', 'neutral', 'negative', 'confused'] 
        }
    }],

    // Call-specific captured info (existing)
    callDetails: [
        {
            date: { type: Date, default: Date.now },
            reason: { type: String },
            symptoms: { type: String },
            requestedDoctor: { type: String },
            notes: { type: String },
        }
    ],

    // WhatsApp specific data
    whatsappOptIn: {
        status: { type: Boolean, default: false },
        optInDate: Date,
        optOutDate: Date,
        source: String // 'manual', 'website', 'call', 'sms'
    }

}, { timestamps: true });

// Methods for communication preference management
patientSchema.methods.getPreferredContactMethod = function() {
    const prefs = this.communicationPreferences;
    
    // Check quiet hours
    if (prefs.quietHours.enabled) {
        const now = new Date();
        const currentTime = now.toTimeString().slice(0, 5);
        const { startTime, endTime } = prefs.quietHours;
        
        if (currentTime >= startTime || currentTime <= endTime) {
            // During quiet hours, prefer messages over calls
            if (prefs.allowSMS || prefs.allowWhatsApp) {
                return prefs.allowWhatsApp ? 'whatsapp' : 'sms';
            }
        }
    }
    
    return prefs.preferredMethod;
};

patientSchema.methods.canReceiveMessages = function(type = 'sms') {
    if (type === 'whatsapp') {
        return this.communicationPreferences.allowWhatsApp && 
               this.whatsappOptIn.status;
    }
    return this.communicationPreferences.allowSMS;
};

patientSchema.methods.shouldEscalateToCall = function(messageType, hoursSinceMessage = 0) {
    const prefs = this.communicationPreferences;
    
    // If they don't allow calls, never escalate
    if (!prefs.allowCalls) return false;
    
    // If auto-escalation is disabled, only escalate on explicit request
    if (!prefs.autoEscalateToCall) return false;
    
    // Check if enough time has passed
    return hoursSinceMessage >= prefs.responseTimeoutHours;
};

export default mongoose.model("Patient", patientSchema);