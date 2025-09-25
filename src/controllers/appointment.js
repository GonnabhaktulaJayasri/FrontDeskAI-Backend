import Appointment from "../models/Appointment.js";
import Patient from "../models/Patient.js";
import { outboundCall } from "./callController.js";

export const getAppointments = async (req, res) => {
    try {
        const { patient_id, doctor_id, upcoming } = req.query;

        const query = {};
        if (patient_id) query.patient = patient_id;
        if (doctor_id) query.doctor = doctor_id;

        // Filter upcoming or past appointments
        if (upcoming !== "false") {
            query.dateTime = { $gte: new Date() }; // future
        } else {
            query.dateTime = { $lt: new Date() }; // past
        }

        const appointments = await Appointment.find(query)
            .populate("patient", "name phone")
            .populate("doctor", "name specialty")
            .sort({ dateTime: 1 }); // soonest first

        res.status(200).json({
            success: true,
            count: appointments.length,
            appointments: appointments.map(a => ({
                appointmentId: a._id,
                patient: a.patient,
                doctor: a.doctor,
                dateTime: a.dateTime,
                status: a.status,
                reason: a.reason,
            }))
        });
    } catch (error) {
        console.error("Error fetching appointments:", error);
        res.status(500).json({
            success: false,
            message: "Error fetching appointments",
            error: error.message
        });
    }
};
