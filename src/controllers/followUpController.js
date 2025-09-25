
import Appointment from '../models/Appointment.js';
import followUpService from '../services/followUpScheduler.js';

/**
 * Start the follow-up service
 */
export const startFollowUpService = async (req, res) => {
    try {
        followUpService.start();
        res.json({
            success: true,
            message: 'Follow-up service started',
            status: followUpService.getStatus()
        });
    } catch (error) {
        console.error('Error starting follow-up service:', error);
        res.status(500).json({
            error: 'Failed to start follow-up service',
            details: error.message
        });
    }
};

/**
 * Stop the follow-up service
 */
export const stopFollowUpService = async (req, res) => {
    try {
        followUpService.stop();
        res.json({
            success: true,
            message: 'Follow-up service stopped',
            status: followUpService.getStatus()
        });
    } catch (error) {
        console.error('Error stopping follow-up service:', error);
        res.status(500).json({
            error: 'Failed to stop follow-up service',
            details: error.message
        });
    }
};

/**
 * Get follow-up service status
 */
export const getFollowUpServiceStatus = async (req, res) => {
    try {
        const status = followUpService.getStatus();
        const stats = await followUpService.getFollowUpStats();

        res.json({
            success: true,
            service: status,
            statistics: stats
        });
    } catch (error) {
        console.error('Error getting follow-up service status:', error);
        res.status(500).json({
            error: 'Failed to get service status',
            details: error.message
        });
    }
};

/**
 * Manually trigger follow-up check (for testing)
 */
export const triggerFollowUpCheck = async (req, res) => {
    try {
        console.log('Manual follow-up check triggered');
        await followUpService.checkAndScheduleFollowUps();

        res.json({
            success: true,
            message: 'Follow-up check completed successfully'
        });
    } catch (error) {
        console.error('Error in manual follow-up check:', error);
        res.status(500).json({
            error: 'Failed to trigger follow-up check',
            details: error.message
        });
    }
};

/**
 * Manually trigger a follow-up call for a specific appointment
 */
export const triggerManualFollowUp = async (req, res) => {
    try {
        const { appointmentId } = req.params;

        if (!appointmentId) {
            return res.status(400).json({
                error: 'Appointment ID is required'
            });
        }

        const result = await followUpService.triggerManualFollowUp(appointmentId, req.hospitalId);

        if (result.success) {
            res.json({
                success: true,
                message: 'Follow-up call triggered successfully',
                callSid: result.callSid
            });
        } else {
            res.status(400).json({
                error: 'Failed to trigger follow-up call',
                details: result.error
            });
        }
    } catch (error) {
        console.error('Error triggering manual follow-up:', error);
        res.status(500).json({
            error: 'Failed to trigger manual follow-up',
            details: error.message
        });
    }
};

/**
 * Enable/disable follow-ups for a specific appointment
 */
export const toggleAppointmentFollowUp = async (req, res) => {
    try {
        const { appointmentId } = req.params;
        const { enabled } = req.body;

        if (!appointmentId) {
            return res.status(400).json({
                error: 'Appointment ID is required'
            });
        }

        if (typeof enabled !== 'boolean') {
            return res.status(400).json({
                error: 'enabled field must be a boolean'
            });
        }

        const result = await followUpService.toggleFollowUpEnabled(appointmentId, enabled);

        if (result.success) {
            res.json({
                success: true,
                message: `Follow-up ${enabled ? 'enabled' : 'disabled'} for appointment`
            });
        } else {
            res.status(400).json({
                error: 'Failed to toggle follow-up',
                details: result.error
            });
        }
    } catch (error) {
        console.error('Error toggling appointment follow-up:', error);
        res.status(500).json({
            error: 'Failed to toggle appointment follow-up',
            details: error.message
        });
    }
};

/**
 * Get follow-up statistics
 */
export const getFollowUpStats = async (req, res) => {
    try {
        const { days = 30 } = req.query;
        const stats = await followUpService.getFollowUpStats(parseInt(days));

        res.json({
            success: true,
            statistics: stats
        });
    } catch (error) {
        console.error('Error getting follow-up statistics:', error);
        res.status(500).json({
            error: 'Failed to get follow-up statistics',
            details: error.message
        });
    }
};

/**
 * Get follow-up details for appointments
 */
export const getAppointmentFollowUps = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            status,
            patientId,
            startDate,
            endDate
        } = req.query;

        const query = {
            'followUpCall': { $exists: true }
        };

        // Add filters
        if (status) {
            query['followUpCall.status'] = status;
        }

        if (patientId) {
            query['patient'] = patientId;
        }

        if (startDate || endDate) {
            query['dateTime'] = {};
            if (startDate) query['dateTime'].$gte = new Date(startDate);
            if (endDate) query['dateTime'].$lte = new Date(endDate);
        }

        const appointments = await Appointment.find(query)
            .populate('patient', 'name phone')
            .populate('doctor', 'name specialty')
            .sort({ 'followUpCall.scheduledAt': -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await Appointment.countDocuments(query);

        res.json({
            success: true,
            appointments: appointments.map(apt => ({
                id: apt._id,
                dateTime: apt.dateTime,
                patient: apt.patient,
                doctor: apt.doctor,
                reason: apt.reason,
                followUpCall: apt.followUpCall,
                status: apt.status
            })),
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Error getting appointment follow-ups:', error);
        res.status(500).json({
            error: 'Failed to get appointment follow-ups',
            details: error.message
        });
    }
};