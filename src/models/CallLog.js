// models/CallLog.js
import mongoose from "mongoose";

const callLogSchema = new mongoose.Schema({
    patient: { type: mongoose.Schema.Types.ObjectId, ref: "Patient", required: true },
    callSid: { type: String, required: true },
    from: String,
    to: String,
    type: String,
    startTime: { type: Date, default: Date.now },
    endTime: Date,
    duration: Number, // in seconds
    transcript: [
        {
            speaker: { type: String, enum: ['User', 'AI'] },
            text: String,
            timestamp: { type: Date, default: Date.now }
        }
    ],
    intent: String,
    entities: { type: mongoose.Schema.Types.Mixed, default: {} },
    actionTaken: {
        type: String,
        enum: ['in_progress', 'completed', 'conversation_only'],
        default: 'in_progress'
    },
    transferReason: String,
    transferDepartment: {
        type: String,
        enum: ['general', 'billing', 'scheduling', 'medical', 'emergency']
    },
    transferredAt: Date,
    transferNumber: String
}, { timestamps: true });

export default mongoose.model("CallLog", callLogSchema);
