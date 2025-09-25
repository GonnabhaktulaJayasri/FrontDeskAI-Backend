import mongoose from "mongoose";

const doctorSchema = new mongoose.Schema({
    name: { type: String, required: true },
    specialty: { type: String },
    availability: [{
        date: { type: String },  // "2025-09-03"
        time: { type: String },  // "10:00"
        status: { type: String, enum: ["available", "booked"], default: "available" }
    }]
}, { timestamps: true });

export default mongoose.model("Doctor", doctorSchema);

