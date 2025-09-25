import express from 'express';
import {
    startFollowUpService,
    stopFollowUpService,
    getFollowUpServiceStatus,
    triggerFollowUpCheck,
    triggerManualFollowUp,
    toggleAppointmentFollowUp,
    getFollowUpStats,
    getAppointmentFollowUps
} from '../controllers/followUpController.js';

const router = express.Router();

// Service management routes
router.post('/service/start', startFollowUpService);
router.post('/service/stop', stopFollowUpService);
router.get('/service/status', getFollowUpServiceStatus);
router.post('/service/check', triggerFollowUpCheck);

// Follow-up management routes
router.post('/appointments/:appointmentId/trigger', triggerManualFollowUp);
router.patch('/appointments/:appointmentId/toggle', toggleAppointmentFollowUp);

// Statistics and reporting routes
router.get('/stats', getFollowUpStats);
router.get('/appointments', getAppointmentFollowUps);

export default router;