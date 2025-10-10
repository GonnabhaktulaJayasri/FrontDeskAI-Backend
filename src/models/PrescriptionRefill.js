// import mongoose from "mongoose";

// // PrescriptionRefill Schema (add this to your models)
// const prescriptionRefillSchema = new mongoose.Schema({
//     patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
//     prescribingDoctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
//     medicationName: { type: String, required: true },
//     dosage: String,
//     lastRefillDate: Date,
//     reasonForRefill: { 
//         type: String, 
//         enum: ['routine_refill', 'lost_medication', 'going_on_trip', 'urgent_need', 'other'],
//         required: true 
//     },
//     urgency: { 
//         type: String, 
//         enum: ['routine', 'urgent', 'emergency'], 
//         default: 'routine' 
//     },
//     pharmacyName: String,
//     additionalNotes: String,
//     status: { 
//         type: String, 
//         enum: ['pending', 'approved', 'denied', 'dispensed'], 
//         default: 'pending' 
//     },
//     requestedAt: { type: Date, default: Date.now },
//     processedAt: Date,
//     requestSource: { type: String, default: 'phone_call' }
// });

// export default mongoose.model("PrescriptionRefill", prescriptionRefillSchema);

import mongoose from "mongoose";
import fhirService from "../services/fhirService.js";

const prescriptionRefillSchema = new mongoose.Schema({
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    prescribingDoctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
    medicationName: { type: String, required: true },
    dosage: String,
    lastRefillDate: Date,
    reasonForRefill: { 
        type: String, 
        enum: ['routine_refill', 'lost_medication', 'going_on_trip', 'urgent_need', 'other'],
        required: true 
    },
    urgency: { 
        type: String, 
        enum: ['routine', 'urgent', 'emergency'], 
        default: 'routine' 
    },
    pharmacyName: String,
    additionalNotes: String,
    status: { 
        type: String, 
        enum: ['pending', 'approved', 'denied', 'dispensed'], 
        default: 'pending' 
    },
    requestedAt: { type: Date, default: Date.now },
    processedAt: Date,
    requestSource: { type: String, default: 'phone_call' },
    
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
    fhirSyncError: String
}, { 
    timestamps: true 
});

// Indexes
prescriptionRefillSchema.index({ patient: 1, requestedAt: -1 });
prescriptionRefillSchema.index({ prescribingDoctor: 1 });
prescriptionRefillSchema.index({ status: 1 });
// prescriptionRefillSchema.index({ fhirId: 1 });
prescriptionRefillSchema.index({ fhirSyncStatus: 1 });

// MIDDLEWARE: After saving prescription, sync to FHIR server
prescriptionRefillSchema.post('save', async function(doc, next) {
    try {
        if (doc._skipFhirSync) {
            return next();
        }

        // Need to populate patient and doctor for FHIR sync
        await doc.populate(['patient', 'prescribingDoctor']);

        // Ensure patient and doctor have FHIR IDs
        if (!doc.patient?.fhirId || !doc.prescribingDoctor?.fhirId) {
            console.warn('Cannot sync prescription to FHIR: Patient or Doctor missing FHIR ID');
            return next();
        }

        let result;
        if (doc.fhirId) {
            result = await fhirService.updateMedicationRequest(
                doc.fhirId,
                doc,
                doc.patient.fhirId,
                doc.prescribingDoctor.fhirId
            );
        } else {
            result = await fhirService.createMedicationRequest(
                doc,
                doc.patient.fhirId,
                doc.prescribingDoctor.fhirId
            );
        }

        if (result.success) {
            await mongoose.model('PrescriptionRefill').updateOne(
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
            await mongoose.model('PrescriptionRefill').updateOne(
                { _id: doc._id },
                {
                    $set: {
                        fhirSyncStatus: 'error',
                        fhirSyncError: JSON.stringify(result.error)
                    }
                }
            );
            console.error('FHIR sync error for prescription:', doc._id, result.error);
        }

        next();
    } catch (error) {
        console.error('Error in FHIR sync middleware:', error);
        next();
    }
});

// INSTANCE METHODS

prescriptionRefillSchema.methods.syncToFHIR = async function() {
    try {
        await this.populate(['patient', 'prescribingDoctor']);

        if (!this.patient?.fhirId || !this.prescribingDoctor?.fhirId) {
            return { 
                success: false, 
                error: 'Patient or Doctor missing FHIR ID. Sync them first.' 
            };
        }

        let result;
        if (this.fhirId) {
            result = await fhirService.updateMedicationRequest(
                this.fhirId,
                this,
                this.patient.fhirId,
                this.prescribingDoctor.fhirId
            );
        } else {
            result = await fhirService.createMedicationRequest(
                this,
                this.patient.fhirId,
                this.prescribingDoctor.fhirId
            );
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
        console.error('Error syncing prescription to FHIR:', error);
        return { success: false, error: error.message };
    }
};

prescriptionRefillSchema.methods.fetchFromFHIR = async function() {
    if (!this.fhirId) {
        return { success: false, error: 'No FHIR ID available' };
    }

    try {
        return await fhirService.getMedicationRequest(this.fhirId);
    } catch (error) {
        console.error('Error fetching prescription from FHIR:', error);
        return { success: false, error: error.message };
    }
};

// STATIC METHODS

prescriptionRefillSchema.statics.searchInFHIR = async function(searchParams) {
    try {
        return await fhirService.searchMedicationRequests(searchParams);
    } catch (error) {
        console.error('Error searching prescriptions in FHIR:', error);
        return { success: false, error: error.message };
    }
};

export default mongoose.model("PrescriptionRefill", prescriptionRefillSchema);