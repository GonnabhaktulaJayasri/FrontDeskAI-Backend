import mongoose from "mongoose";

const callSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: "Hospital" },

  // Basic call info
  type: { type: String, enum: ["inbound", "outbound"], required: true },
  status: { type: String, enum: ["initiated", "completed", "missed"], default: "" },
  duration: Number, // in seconds

  // Optional but useful for analytics
  callSid: { type: String },     // Twilio Call SID
  from: { type: String },        // Caller number
  to: { type: String },          // Hospital number
  patient: { type: mongoose.Schema.Types.ObjectId, ref: "Patient" }, // quick link

  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("Call", callSchema);
