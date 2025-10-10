// import mongoose from "mongoose";

// const hospitalSchema = new mongoose.Schema({
//     name: { type: String, required: true },
//     saasId: { type: mongoose.Schema.Types.ObjectId, unique: true }, // SaaS tenant ID
//     email: { type: String, required: true, unique: true },
//     password: { type: String, required: true },
//     phonenumber: { type: String, required: false },  // changed to String to allow +91, etc.
//     plan: { type: String, enum: ["free", "premium"], default: "free" },
//     hospitalAddress: { type: String },
//     hospitalWebsite: { type: String },
//     weekdayHours: { type: String },
//     weekendHours: { type: String },
//     twilioPhoneNumber: {
//         type: String,
//         unique: true,
//         sparse: true
//     },
//     twilioPhoneSid: {
//         type: String,
//         unique: true,
//         sparse: true
//     },
//     twilioMessagingServiceSid: {
//         type: String,
//         unique: true,
//         sparse: true 
//     },
//     createdAt: { type: Date, default: Date.now },
//     logoutAt: { type: Date, default: null }
// });

// hospitalSchema.index({ twilioPhoneNumber: 1 }, { unique: true, sparse: true });
// hospitalSchema.index({ twilioPhoneSid: 1 }, { unique: true, sparse: true });

// export default mongoose.model("Hospital", hospitalSchema);

import mongoose from "mongoose";
import fhirService from "../services/fhirService.js";

const hospitalSchema = new mongoose.Schema({
    name: { type: String, required: true },
    saasId: { type: mongoose.Schema.Types.ObjectId, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phonenumber: { type: String, required: false },
    plan: { type: String, enum: ["free", "premium"], default: "free" },
    hospitalAddress: { type: String },
    hospitalWebsite: { type: String },
    weekdayHours: { type: String },
    weekendHours: { type: String },
    twilioPhoneNumber: {
        type: String,
        unique: true,
        sparse: true
    },
    twilioPhoneSid: {
        type: String,
        unique: true,
        sparse: true
    },
    twilioMessagingServiceSid: {
        type: String,
        unique: true,
        sparse: true
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

    createdAt: { type: Date, default: Date.now },
    logoutAt: { type: Date, default: null }
});

// // Indexes
// hospitalSchema.index({ twilioPhoneNumber: 1 }, { unique: true, sparse: true });
// hospitalSchema.index({ twilioPhoneSid: 1 }, { unique: true, sparse: true });
// hospitalSchema.index({ fhirId: 1 });
hospitalSchema.index({ fhirSyncStatus: 1 });
hospitalSchema.index({ email: 1 });

// MIDDLEWARE: After saving hospital, sync to FHIR server
hospitalSchema.post('save', async function (doc, next) {
    try {
        if (doc._skipFhirSync) {
            return next();
        }

        let result;
        if (doc.fhirId) {
            result = await fhirService.updateOrganization(doc.fhirId, doc);
        } else {
            result = await fhirService.createOrganization(doc);
        }

        if (result.success) {
            await mongoose.model('Hospital').updateOne(
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
            await mongoose.model('Hospital').updateOne(
                { _id: doc._id },
                {
                    $set: {
                        fhirSyncStatus: 'error',
                        fhirSyncError: JSON.stringify(result.error)
                    }
                }
            );
            console.error('FHIR sync error for hospital:', doc._id, result.error);
        }

        next();
    } catch (error) {
        console.error('Error in FHIR sync middleware:', error);
        next();
    }
});

// INSTANCE METHODS

hospitalSchema.methods.syncToFHIR = async function () {
    try {
        let result;
        if (this.fhirId) {
            result = await fhirService.updateOrganization(this.fhirId, this);
        } else {
            result = await fhirService.createOrganization(this);
        }

        if (result.success) {
            this._skipFhirSync = true;
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
        console.error('Error syncing hospital to FHIR:', error);
        return { success: false, error: error.message };
    }
};

hospitalSchema.methods.fetchFromFHIR = async function () {
    if (!this.fhirId) {
        return { success: false, error: 'No FHIR ID available' };
    }

    try {
        return await fhirService.getOrganization(this.fhirId);
    } catch (error) {
        console.error('Error fetching hospital from FHIR:', error);
        return { success: false, error: error.message };
    }
};

// STATIC METHODS

hospitalSchema.statics.syncAllToFHIR = async function () {
    try {
        const hospitals = await this.find({ fhirSyncStatus: { $ne: 'synced' } });
        const results = [];

        for (const hospital of hospitals) {
            const result = await hospital.syncToFHIR();
            results.push({
                mongoId: hospital._id,
                name: hospital.name,
                ...result
            });
        }

        return {
            success: true,
            total: results.length,
            synced: results.filter(r => r.success).length,
            errors: results.filter(r => !r.success).length,
            results
        };
    } catch (error) {
        console.error('Error syncing all hospitals to FHIR:', error);
        return { success: false, error: error.message };
    }
};

hospitalSchema.statics.searchInFHIR = async function (searchParams) {
    try {
        return await fhirService.searchOrganizations(searchParams);
    } catch (error) {
        console.error('Error searching hospitals in FHIR:', error);
        return { success: false, error: error.message };
    }
};

export default mongoose.model("Hospital", hospitalSchema);