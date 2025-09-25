import express from "express";
import Patient from "../models/Patient.js";

const router = express.Router();

// Lookup patient by phone (normalized)
router.get("/lookup/:phone", async (req, res) => {
    try {
        const rawPhone = req.params.phone;
        if (!rawPhone) {
            return res.status(400).json({ success: false, error: "Phone number is required" });
        }

        // Simple normalization (strip non-digits, add + if missing)
        const cleaned = rawPhone.replace(/\D/g, "");
        const normalized = rawPhone.startsWith("+") ? rawPhone : `+${cleaned}`;

        const patient = await Patient.findOne({ phoneNumber: normalized })
            .populate("preferredDoctor"); // only works if you defined preferredDoctor as ref

        if (!patient) {
            return res.json({ success: true, found: false });
        }

        res.json({ success: true, found: true, patient });
    } catch (err) {
        console.error("Error in /lookup/:phone", err);
        res.status(500).json({ success: false, error: err.message });
    }
});


// Create new patient
router.post("/", async (req, res) => {
    try {
        const patient = new Patient(req.body);
        await patient.save();
        res.json(patient);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
