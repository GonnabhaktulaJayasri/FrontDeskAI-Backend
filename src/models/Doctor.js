// import mongoose from "mongoose";

// const doctorSchema = new mongoose.Schema({
//     name: { type: String, required: true },
//     specialty: { type: String },
//     availability: [{
//         date: { type: String },  // "2025-09-03"
//         time: { type: String },  // "10:00"
//         status: { type: String, enum: ["available", "booked"], default: "available" }
//     }]
// }, { timestamps: true });

// export default mongoose.model("Doctor", doctorSchema);

import mongoose from "mongoose";
import fhirService from "../services/fhirService.js";

const doctorSchema = new mongoose.Schema({
    name: { type: String, required: true },
    specialty: { type: String },
    availability: [{
        date: { type: String },  // "2025-09-03"
        time: { type: String },  // "10:00"
        status: { type: String, enum: ["available", "booked"], default: "available" }
    }],

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
    schedule: {
        monday: { start: String, end: String, available: { type: Boolean, default: true } },
        tuesday: { start: String, end: String, available: { type: Boolean, default: true } },
        wednesday: { start: String, end: String, available: { type: Boolean, default: true } },
        thursday: { start: String, end: String, available: { type: Boolean, default: true } },
        friday: { start: String, end: String, available: { type: Boolean, default: true } },
        saturday: { start: String, end: String, available: { type: Boolean, default: false } },
        sunday: { start: String, end: String, available: { type: Boolean, default: false } }
    },
    hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital' }
}, {
    timestamps: true
});

// Indexes
doctorSchema.index({ name: 1 });
doctorSchema.index({ specialty: 1 });
// doctorSchema.index({ fhirId: 1 });
doctorSchema.index({ fhirSyncStatus: 1 });

// MIDDLEWARE: After saving doctor, sync to FHIR server
doctorSchema.post('save', async function (doc, next) {
    try {
        if (doc._skipFhirSync) {
            return next();
        }

        let result;
        if (doc.fhirId) {
            result = await fhirService.updatePractitioner(doc.fhirId, doc);
        } else {
            result = await fhirService.createPractitioner(doc);
        }

        if (result.success) {
            await mongoose.model('Doctor').updateOne(
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
            await mongoose.model('Doctor').updateOne(
                { _id: doc._id },
                {
                    $set: {
                        fhirSyncStatus: 'error',
                        fhirSyncError: JSON.stringify(result.error)
                    }
                }
            );
            console.error('FHIR sync error for doctor:', doc._id, result.error);
        }

        next();
    } catch (error) {
        console.error('Error in FHIR sync middleware:', error);
        next();
    }
});

// INSTANCE METHODS

doctorSchema.methods.syncToFHIR = async function () {
    try {
        let result;
        if (this.fhirId) {
            result = await fhirService.updatePractitioner(this.fhirId, this);
        } else {
            result = await fhirService.createPractitioner(this);
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
        console.error('Error syncing doctor to FHIR:', error);
        return { success: false, error: error.message };
    }
};

doctorSchema.methods.fetchFromFHIR = async function () {
    if (!this.fhirId) {
        return { success: false, error: 'No FHIR ID available' };
    }

    try {
        return await fhirService.getPractitioner(this.fhirId);
    } catch (error) {
        console.error('Error fetching doctor from FHIR:', error);
        return { success: false, error: error.message };
    }
};

export default mongoose.model("Doctor", doctorSchema);