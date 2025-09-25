import Doctor from "../models/Doctor.js";
import Patient from "../models/Patient.js";
import PrescriptionRefill from "../models/PrescriptionRefill.js";

export const processPrescriptionRefill = async (refillData) => {
    try {
        const {
            patient_name,
            patient_phone,
            medication_name,
            prescribing_doctor,
            dosage,
            last_refill_date,
            reason_for_refill,
            urgency,
            pharmacy_name,
            additional_notes
        } = refillData;

        // Find patient
        let patientQuery = {};
        if (patient_name) patientQuery.name = new RegExp(patient_name, 'i');
        if (patient_phone) patientQuery.phoneNumber = patient_phone;

        const patient = await Patient.findOne(patientQuery);
        if (!patient) {
            return { success: false, message: "Patient not found" };
        }

        // Find prescribing doctor
        const doctor = await Doctor.findOne({ name: new RegExp(prescribing_doctor, 'i') });
        if (!doctor) {
            return {
                success: false,
                message: `Dr. ${prescribing_doctor} not found in our system. Please verify the doctor's name.`
            };
        }

        // Create prescription refill request (assuming you have a PrescriptionRefill model)
        const refillRequest = new PrescriptionRefill({
            patient: patient._id,
            prescribingDoctor: doctor._id,
            medicationName: medication_name,
            dosage: dosage,
            lastRefillDate: last_refill_date ? new Date(last_refill_date) : null,
            reasonForRefill: reason_for_refill,
            urgency: urgency || 'routine',
            pharmacyName: pharmacy_name,
            additionalNotes: additional_notes,
            status: 'pending',
            requestedAt: new Date(),
            requestSource: 'phone_call'
        });

        await refillRequest.save();

        // Determine timeline based on urgency
        let timelineMessage = "";
        switch (urgency) {
            case 'emergency':
                timelineMessage = "Emergency refills are processed within 2-4 hours during business hours.";
                break;
            case 'urgent':
                timelineMessage = "Urgent refills are typically processed within 24 hours.";
                break;
            default:
                timelineMessage = "Routine refills are processed within 48-72 hours.";
        }

        return {
            success: true,
            message: `Prescription refill request submitted successfully for ${medication_name}. ${timelineMessage}`,
            refill_request: {
                id: refillRequest._id,
                reference_number: `RX-${refillRequest._id.toString().slice(-6).toUpperCase()}`,
                medication: medication_name,
                doctor: prescribing_doctor,
                urgency: urgency || 'routine',
                status: 'pending_doctor_approval',
                estimated_processing: urgency === 'emergency' ? '2-4 hours' : urgency === 'urgent' ? '24 hours' : '48-72 hours'
            },
            next_steps: [
                "Your doctor will review the refill request",
                "You'll receive a call when ready for pickup",
                "Bring your ID when picking up the medication",
                pharmacy_name ? `Prescription will be sent to ${pharmacy_name}` : "Please specify your preferred pharmacy"
            ]
        };
    } catch (error) {
        console.error('Error processing prescription refill:', error);
        return { success: false, message: "Error processing prescription refill request" };
    }
};

export const processPrescriptionRefillEnhanced = async (refillData) => {
    try {
        // Validate required fields
        const requiredFields = ['patient_name', 'medication_name', 'medication_strength', 'prescribing_doctor', 'pharmacy_name'];
        const missingFields = requiredFields.filter(field => !refillData[field]);

        if (missingFields.length > 0) {
            return {
                success: false,
                error: 'missing_information',
                missing_fields: missingFields,
                message: `I need some additional information: ${missingFields.join(', ')}`
            };
        }

        // Check for early refill
        let isEarlyRefill = false;
        if (refillData.last_refill_date && refillData.days_supply_last_refill) {
            const lastRefillDate = new Date(refillData.last_refill_date);
            const expectedNextRefillDate = new Date(lastRefillDate);
            expectedNextRefillDate.setDate(expectedNextRefillDate.getDate() + (refillData.days_supply_last_refill * 0.8)); // 80% rule

            if (new Date() < expectedNextRefillDate) {
                isEarlyRefill = true;
            }
        }

        // Check for controlled substance patterns (basic screening)
        const controlledSubstanceKeywords = ['oxycodone', 'hydrocodone', 'adderall', 'xanax', 'lorazepam', 'clonazepam', 'diazepam'];
        const isLikelyControlled = controlledSubstanceKeywords.some(keyword =>
            refillData.medication_name.toLowerCase().includes(keyword)
        );

        // Process the refill request
        const refillResult = await processPrescriptionRefill({
            ...refillData,
            is_early_refill: isEarlyRefill,
            is_controlled_substance: isLikelyControlled,
            verification_required: isLikelyControlled || isEarlyRefill || refillData.urgency === 'emergency'
        });

        return {
            success: refillResult.success,
            refill_id: refillResult.refill_id,
            estimated_ready_time: refillResult.estimated_ready_time,
            requires_doctor_approval: refillResult.requires_doctor_approval || isEarlyRefill,
            requires_verification: isLikelyControlled || isEarlyRefill,
            is_early_refill: isEarlyRefill,
            pharmacy_contact: refillData.pharmacy_name,
            message: refillResult.message,
            next_steps: refillResult.next_steps,
            warnings: refillResult.warnings || [],
            // Include detailed response for AI to communicate
            detailed_response: {
                medication_info: `${refillData.medication_name} ${refillData.medication_strength}`,
                prescribing_doctor: refillData.prescribing_doctor,
                pharmacy: refillData.pharmacy_name,
                urgency: refillData.urgency,
                side_effects_reported: refillData.side_effects || 'None reported',
                taking_as_prescribed: refillData.taking_as_prescribed
            }
        };

    } catch (error) {
        console.error('Error processing enhanced prescription refill:', error);
        return {
            success: false,
            error: 'processing_error',
            message: 'There was an issue processing your refill request. Let me transfer you to our pharmacy team.'
        };
    }
};