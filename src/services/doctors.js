import Doctor from "../models/Doctor.js";

export async function checkDoctorAvailability({ doctor_name, date, specialty }) {
    // Build query dynamically based on provided parameters
    const query = {};
    if (doctor_name) query.name = new RegExp(`^${doctor_name}$`, 'i'); // case-insensitive
    if (specialty) query.specialty = new RegExp(`^${specialty}$`, 'i');

    const doctors = await Doctor.find(query);
    if (!doctors || doctors.length === 0) {
        return { available: false, reason: "No matching doctor found" };
    }

    // Collect availability info for each matching doctor
    const results = doctors.map(doc => {
        let slots = doc.availability;

        // Filter by date if provided
        if (date) {
            slots = slots.filter(s => s.date === date);
        }

        // Only available slots
        const availableSlots = slots.filter(s => s.status === "available");

        return {
            doctor_name: doc.name,
            specialty: doc.specialty,
            available: availableSlots.length > 0,
            slots: availableSlots
        };
    });

    return { results };
}

