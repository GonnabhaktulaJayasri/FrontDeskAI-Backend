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

// import mongoose from "mongoose";

// const patientSchema = new mongoose.Schema({
//     phone: { type: String, required: true, unique: true },
//     firstName: { type: String, required: true, },
//     lastName: { type: String, required: true, },
//     email: { type: String, required: true, },
//     age: { type: Number, required: true, },
//     dob: { type: Date, required: true, },
//     gender: { type: String, enum: ["male", "female", "other"], required: true, },

//     // Last confirmed appointment
//     lastAppointment: { type: Date },

//     // Preferences
//     preferredDoctor: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor" },
//     preferredDate: { type: String },
//     preferredTime: { type: String },

//     // ENHANCED: Communication Preferences
//     communicationPreferences: {
//         preferredMethod: {
//             type: String,
//             enum: ['call', 'sms', 'whatsapp', 'both_messages'],
//             default: 'sms'
//         },
//         allowSMS: { type: Boolean, default: true },
//         allowWhatsApp: { type: Boolean, default: false },
//         allowCalls: { type: Boolean, default: true },
//         language: { type: String, default: 'en' },
//         timezone: { type: String, default: 'America/New_York' },

//         // Message interaction preferences
//         autoEscalateToCall: { type: Boolean, default: false }, // If they prefer messages but allow call escalation
//         responseTimeoutHours: { type: Number, default: 4 }, // Hours to wait before escalating
//         quietHours: {
//             enabled: { type: Boolean, default: false },
//             startTime: { type: String, default: '22:00' }, // 10 PM
//             endTime: { type: String, default: '08:00' } // 8 AM
//         }
//     },

//     // Message interaction history
//     messageInteractions: [{
//         type: {
//             type: String,
//             enum: ['appointment_reminder', 'follow_up', 'general', 'escalation_request']
//         },
//         method: {
//             type: String,
//             enum: ['sms', 'whatsapp']
//         },
//         messageSid: String,
//         sentAt: { type: Date, default: Date.now },
//         deliveredAt: Date,
//         readAt: Date,
//         respondedAt: Date,
//         response: String,
//         escalatedToCall: { type: Boolean, default: false },
//         callSid: String, // If escalated to call
//         appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },

//         // Message content tracking
//         templateUsed: String,
//         messageContent: String,
//         responseContent: String,
//         sentiment: {
//             type: String,
//             enum: ['positive', 'neutral', 'negative', 'confused']
//         }
//     }],

//     // Call-specific captured info (existing)
//     callDetails: [
//         {
//             date: { type: Date, default: Date.now },
//             reason: { type: String },
//             symptoms: { type: String },
//             requestedDoctor: { type: String },
//             notes: { type: String },
//         }
//     ],

//     // WhatsApp specific data
//     whatsappOptIn: {
//         status: { type: Boolean, default: false },
//         optInDate: Date,
//         optOutDate: Date,
//         source: String // 'manual', 'website', 'call', 'sms'
//     }

// }, { timestamps: true });

// // Methods for communication preference management
// patientSchema.methods.getPreferredContactMethod = function () {
//     const prefs = this.communicationPreferences;

//     // Check quiet hours
//     if (prefs.quietHours.enabled) {
//         const now = new Date();
//         const currentTime = now.toTimeString().slice(0, 5);
//         const { startTime, endTime } = prefs.quietHours;

//         if (currentTime >= startTime || currentTime <= endTime) {
//             // During quiet hours, prefer messages over calls
//             if (prefs.allowSMS || prefs.allowWhatsApp) {
//                 return prefs.allowWhatsApp ? 'whatsapp' : 'sms';
//             }
//         }
//     }

//     return prefs.preferredMethod;
// };

// patientSchema.methods.canReceiveMessages = function (type = 'sms') {
//     if (type === 'whatsapp') {
//         return this.communicationPreferences.allowWhatsApp &&
//             this.whatsappOptIn.status;
//     }
//     return this.communicationPreferences.allowSMS;
// };

// patientSchema.methods.shouldEscalateToCall = function (messageType, hoursSinceMessage = 0) {
//     const prefs = this.communicationPreferences;

//     // If they don't allow calls, never escalate
//     if (!prefs.allowCalls) return false;

//     // If auto-escalation is disabled, only escalate on explicit request
//     if (!prefs.autoEscalateToCall) return false;

//     // Check if enough time has passed
//     return hoursSinceMessage >= prefs.responseTimeoutHours;
// };

// export default mongoose.model("Patient", patientSchema);

import mongoose from "mongoose";
import fhirService from "../services/fhirService.js";

const patientSchema = new mongoose.Schema({
    firstName: { type: String, required: true },
    lastName: { type: String, },
    phone: { type: String, required: true, unique: true },
    email: { type: String },
    dob: { type: Date },
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
            default: 'sms'
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
    },

    // FHIR Integration fields
    fhirId: {
        type: String,
        index: true,
        sparse: true
    },
    fhirLastSync: {
        type: Date
    },
    fhirSyncStatus: {
        type: String,
        enum: ['pending', 'synced', 'error'],
        default: 'pending'
    },
    fhirSyncError: String,

    // Additional fields
    address: {
        street: String,
        city: String,
        state: String,
        zipCode: String,
        country: String
    },
    emergencyContact: {
        name: String,
        phone: String,
        relationship: String
    },
    notes: String
}, {
    timestamps: true
});

// Indexes
patientSchema.index({ phone: 1 });
patientSchema.index({ email: 1 });
// patientSchema.index({ fhirId: 1 });
patientSchema.index({ fhirSyncStatus: 1 });

// MIDDLEWARE: After saving patient, sync to FHIR server
patientSchema.post('save', async function (doc, next) {
    try {
        // Skip FHIR sync if it's already syncing or if explicitly disabled
        if (doc._skipFhirSync) {
            return next();
        }

        // Create or update in FHIR server
        let result;
        if (doc.fhirId) {
            result = await fhirService.updatePatient(doc.fhirId, doc);
        } else {
            result = await fhirService.createPatient(doc);
        }

        if (result.success) {
            // Update the document with FHIR ID without triggering another save hook
            await mongoose.model('Patient').updateOne(
                { _id: doc._id },
                {
                    $set: {
                        fhirId: result.fhirId || doc.fhirId,
                        fhirLastSync: new Date(),
                        fhirSyncStatus: 'synced',
                        fhirSyncError: null
                    }
                }
            );
        } else {
            // Log sync error but don't fail the save operation
            await mongoose.model('Patient').updateOne(
                { _id: doc._id },
                {
                    $set: {
                        fhirSyncStatus: 'error',
                        fhirSyncError: JSON.stringify(result.error)
                    }
                }
            );
            console.error('FHIR sync error for patient:', doc._id, result.error);
        }

        next();
    } catch (error) {
        console.error('Error in FHIR sync middleware:', error);
        // Don't fail the save operation due to FHIR sync issues
        next();
    }
});

// INSTANCE METHODS

/**
 * Manually sync this patient to FHIR server
 */
patientSchema.methods.syncToFHIR = async function () {
    try {
        let result;
        if (this.fhirId) {
            result = await fhirService.updatePatient(this.fhirId, this);
        } else {
            result = await fhirService.createPatient(this);
        }

        if (result.success) {
            this._skipFhirSync = true; // Prevent recursive saves
            this.fhirId = result.fhirId || this.fhirId;
            this.fhirLastSync = new Date();
            this.fhirSyncStatus = 'synced';
            this.fhirSyncError = null;
            await this.save();
            delete this._skipFhirSync;
        } else {
            this._skipFhirSync = true;
            this.fhirSyncStatus = 'error';
            this.fhirSyncError = JSON.stringify(result.error);
            await this.save();
            delete this._skipFhirSync;
        }

        return result;
    } catch (error) {
        console.error('Error syncing patient to FHIR:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Fetch patient data from FHIR server
 */
patientSchema.methods.fetchFromFHIR = async function () {
    if (!this.fhirId) {
        return { success: false, error: 'No FHIR ID available' };
    }

    try {
        const result = await fhirService.getPatient(this.fhirId);
        return result;
    } catch (error) {
        console.error('Error fetching patient from FHIR:', error);
        return { success: false, error: error.message };
    }
};

// STATIC METHODS

/**
 * Sync all patients to FHIR server (bulk operation)
 */
patientSchema.statics.syncAllToFHIR = async function () {
    try {
        const patients = await this.find({ fhirSyncStatus: { $ne: 'synced' } });
        const results = await fhirService.syncAllPatients(patients);

        // Update patients with results
        for (const result of results) {
            if (result.success) {
                await this.updateOne(
                    { _id: result.mongoId },
                    {
                        $set: {
                            fhirId: result.fhirId,
                            fhirLastSync: new Date(),
                            fhirSyncStatus: 'synced',
                            fhirSyncError: null
                        }
                    }
                );
            } else {
                await this.updateOne(
                    { _id: result.mongoId },
                    {
                        $set: {
                            fhirSyncStatus: 'error',
                            fhirSyncError: JSON.stringify(result.error)
                        }
                    }
                );
            }
        }

        return {
            success: true,
            total: results.length,
            synced: results.filter(r => r.success).length,
            errors: results.filter(r => !r.success).length,
            results
        };
    } catch (error) {
        console.error('Error syncing all patients to FHIR:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Search patients in FHIR server
 */
patientSchema.statics.searchInFHIR = async function (searchParams) {
    try {
        return await fhirService.searchPatients(searchParams);
    } catch (error) {
        console.error('Error searching patients in FHIR:', error);
        return { success: false, error: error.message };
    }
};

export default mongoose.model("Patient", patientSchema);