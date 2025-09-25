import Patient from "../models/Patient";

// Update patient info from successful appointment booking
export const updatePatientFromCall = async (appointmentData) => {
    try {
        const updateData = {
            name: appointmentData.patient_name,
            lastAppointment: new Date(`${appointmentData.date}T${appointmentData.time}:00`),
            preferredDoctor: appointmentData.doctor_name,
            $push: {
                callDetails: {
                    date: new Date(),
                    reason: appointmentData.reason,
                    requestedDoctor: appointmentData.doctor_name,
                    notes: `Appointment booked for ${appointmentData.date} at ${appointmentData.time}`
                }
            }
        };

        await Patient.findByIdAndUpdate(patientId, updateData);
        console.log('Updated patient info from appointment booking');
    } catch (error) {
        console.error('Error updating patient from call:', error);
    }
}

// Update patient information
export const updatePatientInfo = async (patientId, info) => {
    try {
        const updateData = {};
        if (info.name) updateData.name = info.name;
        if (info.age) updateData.age = info.age;
        if (info.gender) updateData.gender = info.gender;
        if (info.preferred_doctor) updateData.preferredDoctor = info.preferred_doctor;
        if (info.preferred_time) updateData.preferredTime = info.preferred_time;

        await Patient.findByIdAndUpdate(patientId, updateData);
        return { success: true, message: "Patient information updated successfully" };
    } catch (error) {
        console.error('Error updating patient info:', error);
        return { success: false, message: "Failed to update patient information" };
    }
}