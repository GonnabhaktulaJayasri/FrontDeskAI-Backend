import mongoose from "mongoose";

const hospitalSchema = new mongoose.Schema({
    name: { type: String, required: true },
    saasId: { type: mongoose.Schema.Types.ObjectId, unique: true }, // SaaS tenant ID
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phonenumber: { type: String, required: false },  // changed to String to allow +91, etc.
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
    createdAt: { type: Date, default: Date.now },
    logoutAt: { type: Date, default: null }
});

hospitalSchema.index({ twilioPhoneNumber: 1 }, { unique: true, sparse: true });
hospitalSchema.index({ twilioPhoneSid: 1 }, { unique: true, sparse: true });

export default mongoose.model("Hospital", hospitalSchema);
