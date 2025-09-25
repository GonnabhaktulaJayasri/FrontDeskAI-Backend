import mongoose from "mongoose";

// PrescriptionRefill Schema (add this to your models)
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
    requestSource: { type: String, default: 'phone_call' }
});

export default mongoose.model("PrescriptionRefill", prescriptionRefillSchema);
