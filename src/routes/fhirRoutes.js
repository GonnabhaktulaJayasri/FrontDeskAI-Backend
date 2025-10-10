import express from 'express';
import Patient from '../models/Patient.js';
import Doctor from '../models/Doctor.js';
import Appointment from '../models/Appointment.js';
import PrescriptionRefill from '../models/PrescriptionRefill.js';
import Hospital from '../models/Hospital.js';
import fhirService from '../services/fhirService.js';

const router = express.Router();

// ==================== PATIENT FHIR ROUTES ====================

/**
 * POST /api/fhir/patients/sync
 * Manually sync a specific patient to FHIR server
 */
router.post('/patients/sync/:patientId', async (req, res) => {
    try {
        const patient = await Patient.findById(req.params.patientId);
        
        if (!patient) {
            return res.status(404).json({ 
                success: false, 
                message: 'Patient not found' 
            });
        }

        const result = await patient.syncToFHIR();
        
        res.json({
            success: result.success,
            message: result.success ? 'Patient synced to FHIR successfully' : 'Failed to sync patient',
            fhirId: patient.fhirId,
            data: result.data,
            error: result.error
        });
    } catch (error) {
        console.error('Error in sync patient route:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error syncing patient', 
            error: error.message 
        });
    }
});

/**
 * POST /api/fhir/patients/sync-all
 * Sync all patients to FHIR server
 */
router.post('/patients/sync-all', async (req, res) => {
    try {
        const result = await Patient.syncAllToFHIR();
        
        res.json({
            success: result.success,
            message: `Synced ${result.synced} out of ${result.total} patients`,
            ...result
        });
    } catch (error) {
        console.error('Error in sync all patients route:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error syncing patients', 
            error: error.message 
        });
    }
});

/**
 * GET /api/fhir/patients/:patientId
 * Fetch patient from FHIR server
 */
router.get('/patients/:patientId', async (req, res) => {
    try {
        const patient = await Patient.findById(req.params.patientId);
        
        if (!patient) {
            return res.status(404).json({ 
                success: false, 
                message: 'Patient not found in MongoDB' 
            });
        }

        const result = await patient.fetchFromFHIR();
        
        res.json({
            success: result.success,
            mongoData: patient,
            fhirData: result.data,
            error: result.error
        });
    } catch (error) {
        console.error('Error fetching patient from FHIR:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error fetching patient', 
            error: error.message 
        });
    }
});

/**
 * GET /api/fhir/patients/search
 * Search patients in FHIR server
 * Query params: name, phone, birthdate, etc.
 */
router.get('/patients/search', async (req, res) => {
    try {
        const searchParams = req.query;
        const result = await Patient.searchInFHIR(searchParams);
        
        res.json({
            success: result.success,
            total: result.total,
            entries: result.entries,
            data: result.data,
            error: result.error
        });
    } catch (error) {
        console.error('Error searching patients in FHIR:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error searching patients', 
            error: error.message 
        });
    }
});

// ==================== APPOINTMENT FHIR ROUTES ====================

/**
 * POST /api/fhir/appointments/sync/:appointmentId
 * Manually sync a specific appointment to FHIR server
 */
router.post('/appointments/sync/:appointmentId', async (req, res) => {
    try {
        const appointment = await Appointment.findById(req.params.appointmentId)
            .populate('patient')
            .populate('doctor');
        
        if (!appointment) {
            return res.status(404).json({ 
                success: false, 
                message: 'Appointment not found' 
            });
        }

        const result = await appointment.syncToFHIR();
        
        res.json({
            success: result.success,
            message: result.success ? 'Appointment synced to FHIR successfully' : 'Failed to sync appointment',
            fhirId: appointment.fhirId,
            data: result.data,
            error: result.error
        });
    } catch (error) {
        console.error('Error in sync appointment route:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error syncing appointment', 
            error: error.message 
        });
    }
});

/**
 * GET /api/fhir/appointments/:appointmentId
 * Fetch appointment from FHIR server
 */
router.get('/appointments/:appointmentId', async (req, res) => {
    try {
        const appointment = await Appointment.findById(req.params.appointmentId)
            .populate('patient')
            .populate('doctor');
        
        if (!appointment) {
            return res.status(404).json({ 
                success: false, 
                message: 'Appointment not found in MongoDB' 
            });
        }

        const result = await appointment.fetchFromFHIR();
        
        res.json({
            success: result.success,
            mongoData: appointment,
            fhirData: result.data,
            error: result.error
        });
    } catch (error) {
        console.error('Error fetching appointment from FHIR:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error fetching appointment', 
            error: error.message 
        });
    }
});

/**
 * GET /api/fhir/appointments/search
 * Search appointments in FHIR server
 * Query params: patient, practitioner, date, status, etc.
 */
router.get('/appointments/search', async (req, res) => {
    try {
        const searchParams = req.query;
        const result = await Appointment.searchInFHIR(searchParams);
        
        res.json({
            success: result.success,
            total: result.total,
            entries: result.entries,
            data: result.data,
            error: result.error
        });
    } catch (error) {
        console.error('Error searching appointments in FHIR:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error searching appointments', 
            error: error.message 
        });
    }
});

// ==================== DOCTOR/PRACTITIONER FHIR ROUTES ====================

/**
 * POST /api/fhir/doctors/sync/:doctorId
 * Manually sync a specific doctor to FHIR server
 */
router.post('/doctors/sync/:doctorId', async (req, res) => {
    try {
        const doctor = await Doctor.findById(req.params.doctorId);
        
        if (!doctor) {
            return res.status(404).json({ 
                success: false, 
                message: 'Doctor not found' 
            });
        }

        const result = await doctor.syncToFHIR();
        
        res.json({
            success: result.success,
            message: result.success ? 'Doctor synced to FHIR successfully' : 'Failed to sync doctor',
            fhirId: doctor.fhirId,
            data: result.data,
            error: result.error
        });
    } catch (error) {
        console.error('Error in sync doctor route:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error syncing doctor', 
            error: error.message 
        });
    }
});

/**
 * GET /api/fhir/doctors/:doctorId
 * Fetch doctor from FHIR server
 */
router.get('/doctors/:doctorId', async (req, res) => {
    try {
        const doctor = await Doctor.findById(req.params.doctorId);
        
        if (!doctor) {
            return res.status(404).json({ 
                success: false, 
                message: 'Doctor not found in MongoDB' 
            });
        }

        const result = await doctor.fetchFromFHIR();
        
        res.json({
            success: result.success,
            mongoData: doctor,
            fhirData: result.data,
            error: result.error
        });
    } catch (error) {
        console.error('Error fetching doctor from FHIR:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error fetching doctor', 
            error: error.message 
        });
    }
});

// ==================== PRESCRIPTION/MEDICATION REQUEST ROUTES ====================

/**
 * POST /api/fhir/prescriptions/sync/:prescriptionId
 * Manually sync a specific prescription to FHIR server
 */
router.post('/prescriptions/sync/:prescriptionId', async (req, res) => {
    try {
        const prescription = await PrescriptionRefill.findById(req.params.prescriptionId)
            .populate('patient')
            .populate('prescribingDoctor');
        
        if (!prescription) {
            return res.status(404).json({ 
                success: false, 
                message: 'Prescription not found' 
            });
        }

        const result = await prescription.syncToFHIR();
        
        res.json({
            success: result.success,
            message: result.success ? 'Prescription synced to FHIR successfully' : 'Failed to sync prescription',
            fhirId: prescription.fhirId,
            data: result.data,
            error: result.error
        });
    } catch (error) {
        console.error('Error in sync prescription route:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error syncing prescription', 
            error: error.message 
        });
    }
});

/**
 * GET /api/fhir/prescriptions/:prescriptionId
 * Fetch prescription from FHIR server
 */
router.get('/prescriptions/:prescriptionId', async (req, res) => {
    try {
        const prescription = await PrescriptionRefill.findById(req.params.prescriptionId)
            .populate('patient')
            .populate('prescribingDoctor');
        
        if (!prescription) {
            return res.status(404).json({ 
                success: false, 
                message: 'Prescription not found in MongoDB' 
            });
        }

        const result = await prescription.fetchFromFHIR();
        
        res.json({
            success: result.success,
            mongoData: prescription,
            fhirData: result.data,
            error: result.error
        });
    } catch (error) {
        console.error('Error fetching prescription from FHIR:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error fetching prescription', 
            error: error.message 
        });
    }
});

/**
 * GET /api/fhir/prescriptions/search
 * Search prescriptions in FHIR server
 * Query params: patient, practitioner, medication, status, etc.
 */
router.get('/prescriptions/search', async (req, res) => {
    try {
        const searchParams = req.query;
        const result = await PrescriptionRefill.searchInFHIR(searchParams);
        
        res.json({
            success: result.success,
            total: result.total,
            entries: result.entries,
            data: result.data,
            error: result.error
        });
    } catch (error) {
        console.error('Error searching prescriptions in FHIR:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error searching prescriptions', 
            error: error.message 
        });
    }
});

// ==================== HOSPITAL/ORGANIZATION FHIR ROUTES ====================

/**
 * POST /api/fhir/hospitals/sync/:hospitalId
 * Manually sync a specific hospital to FHIR server
 */
router.post('/hospitals/sync/:hospitalId', async (req, res) => {
    try {
        const hospital = await Hospital.findById(req.params.hospitalId);
        
        if (!hospital) {
            return res.status(404).json({ 
                success: false, 
                message: 'Hospital not found' 
            });
        }

        const result = await hospital.syncToFHIR();
        
        res.json({
            success: result.success,
            message: result.success ? 'Hospital synced to FHIR successfully' : 'Failed to sync hospital',
            fhirId: hospital.fhirId,
            data: result.data,
            error: result.error
        });
    } catch (error) {
        console.error('Error in sync hospital route:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error syncing hospital', 
            error: error.message 
        });
    }
});

/**
 * POST /api/fhir/hospitals/sync-all
 * Sync all hospitals to FHIR server
 */
router.post('/hospitals/sync-all', async (req, res) => {
    try {
        const result = await Hospital.syncAllToFHIR();
        
        res.json({
            success: result.success,
            message: `Synced ${result.synced} out of ${result.total} hospitals`,
            ...result
        });
    } catch (error) {
        console.error('Error in sync all hospitals route:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error syncing hospitals', 
            error: error.message 
        });
    }
});

/**
 * GET /api/fhir/hospitals/:hospitalId
 * Fetch hospital from FHIR server
 */
router.get('/hospitals/:hospitalId', async (req, res) => {
    try {
        const hospital = await Hospital.findById(req.params.hospitalId);
        
        if (!hospital) {
            return res.status(404).json({ 
                success: false, 
                message: 'Hospital not found in MongoDB' 
            });
        }

        const result = await hospital.fetchFromFHIR();
        
        res.json({
            success: result.success,
            mongoData: hospital,
            fhirData: result.data,
            error: result.error
        });
    } catch (error) {
        console.error('Error fetching hospital from FHIR:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error fetching hospital', 
            error: error.message 
        });
    }
});

/**
 * GET /api/fhir/hospitals/search
 * Search hospitals in FHIR server
 * Query params: name, address, type, etc.
 */
router.get('/hospitals/search', async (req, res) => {
    try {
        const searchParams = req.query;
        const result = await Hospital.searchInFHIR(searchParams);
        
        res.json({
            success: result.success,
            total: result.total,
            entries: result.entries,
            data: result.data,
            error: result.error
        });
    } catch (error) {
        console.error('Error searching hospitals in FHIR:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error searching hospitals', 
            error: error.message 
        });
    }
});

// ==================== SYNC STATUS ROUTES ====================

/**
 * GET /api/fhir/sync-status
 * Get sync status for all resources
 */
router.get('/sync-status', async (req, res) => {
    try {
        const hospitalStats = await Hospital.aggregate([
            { $group: { _id: '$fhirSyncStatus', count: { $sum: 1 } } }
        ]);

        const patientStats = await Patient.aggregate([
            { $group: { _id: '$fhirSyncStatus', count: { $sum: 1 } } }
        ]);

        const doctorStats = await Doctor.aggregate([
            { $group: { _id: '$fhirSyncStatus', count: { $sum: 1 } } }
        ]);

        const appointmentStats = await Appointment.aggregate([
            { $group: { _id: '$fhirSyncStatus', count: { $sum: 1 } } }
        ]);

        const prescriptionStats = await PrescriptionRefill.aggregate([
            { $group: { _id: '$fhirSyncStatus', count: { $sum: 1 } } }
        ]);

        res.json({
            success: true,
            hospitals: hospitalStats,
            patients: patientStats,
            doctors: doctorStats,
            appointments: appointmentStats,
            prescriptions: prescriptionStats
        });
    } catch (error) {
        console.error('Error getting sync status:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error getting sync status', 
            error: error.message 
        });
    }
});

/**
 * POST /api/fhir/retry-failed
 * Retry syncing all failed resources
 */
router.post('/retry-failed', async (req, res) => {
    try {
        const results = {
            hospitals: [],
            patients: [],
            doctors: [],
            appointments: [],
            prescriptions: []
        };

        // Retry failed hospitals
        const failedHospitals = await Hospital.find({ fhirSyncStatus: 'error' });
        for (const hospital of failedHospitals) {
            const result = await hospital.syncToFHIR();
            results.hospitals.push({ id: hospital._id, success: result.success });
        }

        // Retry failed patients
        const failedPatients = await Patient.find({ fhirSyncStatus: 'error' });
        for (const patient of failedPatients) {
            const result = await patient.syncToFHIR();
            results.patients.push({ id: patient._id, success: result.success });
        }

        // Retry failed doctors
        const failedDoctors = await Doctor.find({ fhirSyncStatus: 'error' });
        for (const doctor of failedDoctors) {
            const result = await doctor.syncToFHIR();
            results.doctors.push({ id: doctor._id, success: result.success });
        }

        // Retry failed appointments
        const failedAppointments = await Appointment.find({ fhirSyncStatus: 'error' })
            .populate('patient')
            .populate('doctor');
        for (const appointment of failedAppointments) {
            const result = await appointment.syncToFHIR();
            results.appointments.push({ id: appointment._id, success: result.success });
        }

        // Retry failed prescriptions
        const failedPrescriptions = await PrescriptionRefill.find({ fhirSyncStatus: 'error' })
            .populate('patient')
            .populate('prescribingDoctor');
        for (const prescription of failedPrescriptions) {
            const result = await prescription.syncToFHIR();
            results.prescriptions.push({ id: prescription._id, success: result.success });
        }

        res.json({
            success: true,
            message: 'Retry completed',
            results
        });
    } catch (error) {
        console.error('Error retrying failed syncs:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error retrying failed syncs', 
            error: error.message 
        });
    }
});

export default router;