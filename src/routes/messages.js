import express from "express";
import messageController from "../controllers/messageController.js";

const router = express.Router();

// ============= TWILIO WEBHOOK ROUTES =============
router.post('/webhook/conversations', messageController.handleIncomingMessage);

router.post('/reminders/appointment', messageController.startAppointmentReminderMessage);

router.post('/follow-up', messageController.startFollowUpMessage);

router.get('/conversations/:patientId', messageController.getConversationHistory);

/**
 * Manually escalate a conversation to human agent
 * POST /api/messages/escalate
 * Body: { conversationId, reason?, priority? }
 */
router.post('/escalate', messageController.escalateConversation);

// ============= ADMIN & MONITORING ROUTES =============
/**
 * Get AI service performance statistics
 * GET /api/messages/stats/performance
 */
router.get('/stats/performance', messageController.getPerformanceStats);

// ============= BULK OPERATIONS =============
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

/**
 * Send bulk follow-up messages
 * POST /api/messages/bulk/follow-ups
 * Body: { appointmentIds: [], method?: 'sms'|'whatsapp' }
 */
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

// ============= TESTING & DEBUG ROUTES =============
/**
 * Test AI message processing (for development)
 * POST /api/messages/test/process
 * Body: { message, patientPhone?, hospitalPhone? }
 */
router.post('/test/process', async (req, res) => {
    try {
        const { message, patientPhone = '+1234567890', hospitalPhone = process.env.TWILIO_PHONE_NUMBER } = req.body;

        if (!message) {
            return res.status(400).json({
                success: false,
                error: 'Message is required for testing'
            });
        }

        // Create fake Twilio request for testing
        const fakeReq = {
            body: {
                From: patientPhone,
                To: hospitalPhone,
                Body: message,
                MessageSid: `TEST_MSG_${Date.now()}`,
                SmsStatus: 'received'
            }
        };

        console.log(`🧪 Testing AI processing for message: "${message}"`);

        // Import the service to test processing without sending actual messages
        const enhancedMessageService = (await import('../services/enhancedMessageService.js')).default;
        
        // Temporarily disable actual message sending for testing
        const originalSendMessage = enhancedMessageService.sendMessage;
        enhancedMessageService.sendMessage = async (to, msg, method) => {
            console.log(`🧪 TEST: Would send ${method} to ${to}: ${msg.substring(0, 100)}...`);
            return { success: true, messageSid: `TEST_${Date.now()}` };
        };

        const result = await enhancedMessageService.processIncomingMessage(fakeReq);

        // Restore original method
        enhancedMessageService.sendMessage = originalSendMessage;

        res.json({
            success: true,
            testResult: result,
            testMessage: message,
            note: 'This is a test - no actual messages were sent'
        });

    } catch (error) {
        console.error('🚨 Error testing message processing:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to test message processing',
            details: error.message
        });
    }
});

/**
 * Health check for message service
 * GET /api/messages/health
 */
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

// import express from 'express';
// import messageHandler from '../services/messageHandler.js';
// import messageService from '../services/messageService.js';

// const router = express.Router();

// /**
//  * Webhook for incoming Twilio Conversations messages
//  */
// router.post('/webhook/conversations', async (req, res) => {
//     try {
//         console.log('Incoming message from:', req.body.From);
//         console.log('Message body:', req.body.Body);

//         // Use the reply handler
//         const result = await messageHandler.handleIncomingMessage(req);

//         if (result.success) {
//             console.log('Reply processed:', result.action);
//         } else {
//             console.log('Not processed:', result.reason);
//         }

//         res.status(200).send('OK');
//     } catch (error) {
//         console.error('Webhook error:', error);
//         res.status(200).send('OK'); // Always return 200 to Twilio
//     }
// });

// /**
//  * Webhook for Twilio Conversations status updates
//  */
// router.post('/status', async (req, res) => {
//     try {
//         const { EventType, ConversationSid, MessageSid, DeliveryStatus } = req.body;

//         console.log('Message status update:', EventType, DeliveryStatus);

//         // Handle delivery status updates
//         if (EventType === 'onMessageUpdated' && DeliveryStatus) {
//             // Could update message delivery status in database here
//             console.log(`Message ${MessageSid} status: ${DeliveryStatus}`);
//         }

//         res.sendStatus(200);

//     } catch (error) {
//         console.error('Error handling status webhook:', error);
//         res.sendStatus(500);
//     }
// });

// /**
//  * Test endpoint to send a message (for development)
//  */
// router.post('/test-send', async (req, res) => {
//     try {
//         const { appointmentId, type, method } = req.body;

//         if (type === 'reminder') {
//             const result = await messageService.sendAppointmentReminder(
//                 appointmentId,
//                 '24_hour',
//                 method || 'auto'
//             );
//             res.json(result);
//         } else if (type === 'follow-up') {
//             const result = await messageService.sendFollowUpMessage(
//                 appointmentId,
//                 method || 'auto'
//             );
//             res.json(result);
//         } else {
//             res.status(400).json({ error: 'Invalid type' });
//         }

//     } catch (error) {
//         console.error('Error sending test message:', error);
//         res.status(500).json({ error: error.message });
//     }
// });

// export default router;