import express from "express";
import Doctor from "../models/Doctor.js";

const router = express.Router();

// Check availability
router.get("/:doctorId/availability/:date", async (req, res) => {
    try {
        const doctor = await Doctor.findById(req.params.doctorId);
        if (!doctor) return res.status(404).json({ error: "Doctor not found" });

        const availableSlots = doctor.availability.filter(a => a.date === req.params.date);
        res.json({ doctor: doctor.name, slots: availableSlots });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create doctor
router.post("/", async (req, res) => {
    try {
        const doctor = new Doctor(req.body);
        await doctor.save();
        res.json(doctor);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
