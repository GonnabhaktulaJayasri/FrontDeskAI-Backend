import express from "express";
import messageController from "../controllers/messageController.js";

const router = express.Router();

router.post('/webhook/conversations', messageController.handleIncomingMessage);

router.post('/reminders/appointment', messageController.startAppointmentReminderMessage);

router.post('/follow-up', messageController.startFollowUpMessage);

router.get('/conversations/:patientId', messageController.getConversationHistory);

router.post('/escalate', messageController.escalateConversation);

router.get('/stats/performance', messageController.getPerformanceStats);

router.post('/bulk/reminders', async (req, res) => {
    try {
        const { appointmentIds, method = 'sms' } = req.body;

        if (!appointmentIds || !Array.isArray(appointmentIds)) {
            return res.status(400).json({
                success: false,
                error: 'appointmentIds array is required'
            });
        }

        console.log(`📮 Starting bulk reminders for ${appointmentIds.length} appointments via ${method}`);

        const results = [];
        const errors = [];

        // Process each appointment with delay to avoid rate limits
        for (const appointmentId of appointmentIds) {
            try {
                const result = await messageController.startAppointmentReminderMessage({
                    body: { appointmentId, method, reminderType: 'appointment_reminder' }
                });

                results.push({
                    appointmentId,
                    success: true,
                    conversationId: result?.conversationId
                });

                // Add small delay to avoid overwhelming Twilio API
                await new Promise(resolve => setTimeout(resolve, 1000));

            } catch (error) {
                console.error(`❌ Error sending reminder for appointment ${appointmentId}:`, error);
                errors.push({
                    appointmentId,
                    success: false,
                    error: error.message
                });
            }
        }

        res.json({
            success: true,
            message: `Bulk reminders processed: ${results.length} successful, ${errors.length} failed`,
            results: results,
            errors: errors,
            summary: {
                total: appointmentIds.length,
                successful: results.length,
                failed: errors.length,
                method: method
            }
        });

    } catch (error) {
        console.error('🚨 Error processing bulk reminders:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to process bulk reminders',
            details: error.message
        });
    }
});

router.post('/bulk/follow-ups', async (req, res) => {
    try {
        const { appointmentIds, method = 'sms' } = req.body;

        if (!appointmentIds || !Array.isArray(appointmentIds)) {
            return res.status(400).json({
                success: false,
                error: 'appointmentIds array is required'
            });
        }

        console.log(`📮 Starting bulk follow-ups for ${appointmentIds.length} appointments via ${method}`);

        const results = [];
        const errors = [];

        for (const appointmentId of appointmentIds) {
            try {
                const result = await messageController.startFollowUpMessage({
                    body: { appointmentId, method, followUpType: 'follow_up' }
                });

                results.push({
                    appointmentId,
                    success: true,
                    conversationId: result?.conversationId
                });

                await new Promise(resolve => setTimeout(resolve, 1000));

            } catch (error) {
                console.error(`❌ Error sending follow-up for appointment ${appointmentId}:`, error);
                errors.push({
                    appointmentId,
                    success: false,
                    error: error.message
                });
            }
        }

        res.json({
            success: true,
            message: `Bulk follow-ups processed: ${results.length} successful, ${errors.length} failed`,
            results: results,
            errors: errors,
            summary: {
                total: appointmentIds.length,
                successful: results.length,
                failed: errors.length,
                method: method
            }
        });

    } catch (error) {
        console.error('🚨 Error processing bulk follow-ups:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to process bulk follow-ups',
            details: error.message
        });
    }
});

router.get('/health', (req, res) => {
    try {
        // Import the service to check its status
        const enhancedMessageService = require('../services/enhancedMessageService.js').default;
        const stats = enhancedMessageService.getPerformanceStats();

        res.json({
            success: true,
            status: 'healthy',
            service: 'Enhanced AI Message Service',
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            performance: stats,
            timestamp: new Date(),
            version: '2.0.0-ai-enhanced'
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            status: 'unhealthy',
            error: error.message,
            timestamp: new Date()
        });
    }
});

export default router;