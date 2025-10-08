// import messageService from "../services/messageService.js";
// import Message from "../models/Message.js";
// /**
//  * Handle Twilio Conversations API messages (unified messaging)
//  */
// export const handleIncomingMessage = async (req, res) => {
//     try {
//         const {
//             EventType,
//             Author,
//             Body,
//             MessageSid,
//             ConversationSid,
//             Source,
//             MessagingServiceSid,
//             ParticipantSid
//         } = req.body;

//         // Only process messages added to conversations
//         if (EventType !== 'onMessageAdded') {
//             console.log(`Ignoring conversation event: ${EventType}`);
//             return res.status(200).send();
//         }

//         // Skip messages sent by our service (check if Author is our Twilio phone number)
//         if (Author === process.env.TWILIO_PHONE ||
//             Author === process.env.TWILIO_WHATSAPP_NUMBER ||
//             Author?.startsWith('whatsapp:' + process.env.TWILIO_PHONE?.replace('+', ''))) {
//             console.log('Skipping outbound message from our service');
//             return res.status(200).send();
//         }

//         // Skip if no message body (system messages, delivery receipts, etc.)
//         if (!Body || Body.trim().length === 0) {
//             console.log('Skipping message without body');
//             return res.status(200).send();
//         }

//         // Determine if this is WhatsApp based on Source or Author format
//         const isWhatsApp = Source === 'WhatsApp' || Author?.startsWith('whatsapp:');

//         // Create a compatible request object for our AI service
//         const fakeReq = {
//             body: {
//                 From: Author, // Keep original format for WhatsApp detection
//                 To: process.env.TWILIO_PHONE || '+1234567890', // FIXED: Provide fallback
//                 Body: Body,
//                 MessageSid: MessageSid,
//                 ConversationSid: ConversationSid,
//                 SmsStatus: 'received'
//             }
//         };

//         // Process with enhanced AI service
//         const result = await messageService.processIncomingMessage(fakeReq);

//         res.status(200).send();

//         if (result.success) {
//             console.log('Conversation message processed successfully:', {
//                 action: result.action,
//                 responseTime: result.responseTime + 'ms',
//                 needsEscalation: result.needsEscalation
//             });
//         } else {
//             console.log('Conversation processing failed:', result.error);
//         }

//     } catch (error) {
//         console.error('Error handling Twilio conversation:', error);
//         res.status(200).send();
//     }
// };

// /**
//  * Start AI-powered appointment reminder conversation
//  */
// export const startAppointmentReminderMessage = async (req, res) => {
//     try {
//         const { appointmentId, method = 'sms', reminderType = 'appointment_reminder' } = req.body;

//         if (!appointmentId) {
//             return res.status(400).json({
//                 success: false,
//                 error: 'Appointment ID is required'
//             });
//         }
//         const result = await messageService.startMessageConversation(
//             appointmentId,
//             reminderType,
//             method
//         );

//         if (result.success) {
//             res.json({
//                 success: true,
//                 message: 'AI appointment reminder started successfully',
//                 conversationId: result.conversationId,
//                 messageSid: result.messageSid,
//                 method: method,
//                 note: 'Patient will receive AI-powered reminder and can respond for full assistance'
//             });
//         } else {
//             res.status(400).json({
//                 success: false,
//                 error: 'Failed to start appointment reminder',
//                 reason: result.reason || result.error
//             });
//         }

//     } catch (error) {
//         console.error('Error starting appointment reminder:', error);
//         res.status(500).json({
//             success: false,
//             error: 'Failed to start appointment reminder conversation',
//             details: error.message
//         });
//     }
// };

// /**
//  * Start AI-powered follow-up conversation
//  */
// export const startFollowUpMessage = async (req, res) => {
//     try {
//         const { appointmentId, method = 'sms', followUpType = 'follow_up' } = req.body;

//         if (!appointmentId) {
//             return res.status(400).json({
//                 success: false,
//                 error: 'Appointment ID is required'
//             });
//         }

//         const result = await messageService.startMessageConversation(
//             appointmentId,
//             followUpType,
//             method
//         );

//         if (result.success) {
//             res.json({
//                 success: true,
//                 message: 'AI follow-up conversation started successfully',
//                 conversationId: result.conversationId,
//                 messageSid: result.messageSid,
//                 method: method,
//                 note: 'Patient will receive AI-powered follow-up and can respond for assistance'
//             });
//         } else {
//             res.status(400).json({
//                 success: false,
//                 error: 'Failed to start follow-up conversation',
//                 reason: result.reason || result.error
//             });
//         }

//     } catch (error) {
//         console.error('Error starting follow-up conversation:', error);
//         res.status(500).json({
//             success: false,
//             error: 'Failed to start follow-up conversation',
//             details: error.message
//         });
//     }
// };

// /**
//  * Get conversation history for a patient
//  */
// export const getConversationHistory = async (req, res) => {
//     try {
//         const { patientId } = req.params;
//         const { limit = 50, method } = req.query;

//         if (!patientId) {
//             return res.status(400).json({
//                 success: false,
//                 error: 'Patient ID is required'
//             });
//         }

//         const query = { patient: patientId };
//         if (method) {
//             query.method = method; // Filter by sms or whatsapp
//         }

//         const conversations = await Message.find(query)
//             .populate('patient', 'name phone')
//             .populate('hospital', 'name')
//             .populate('appointment', 'dateTime doctor')
//             .sort({ lastActivity: -1 })
//             .limit(parseInt(limit));

//         res.json({
//             success: true,
//             conversations: conversations,
//             total: conversations.length
//         });

//     } catch (error) {
//         console.error('Error fetching conversation history:', error);
//         res.status(500).json({
//             success: false,
//             error: 'Failed to fetch conversation history',
//             details: error.message
//         });
//     }
// };

// /**
//  * Get AI service performance statistics
//  */
// export const getPerformanceStats = async (req, res) => {
//     try {
//         const stats = messageService.getPerformanceStats();

//         res.json({
//             success: true,
//             performance: stats,
//             timestamp: new Date(),
//             note: 'AI Message Service Performance Metrics'
//         });

//     } catch (error) {
//         console.error('Error fetching performance stats:', error);
//         res.status(500).json({
//             success: false,
//             error: 'Failed to fetch performance statistics',
//             details: error.message
//         });
//     }
// };

// /**
//  * Manually escalate a conversation to human agent
//  */
// export const escalateConversation = async (req, res) => {
//     try {
//         const { conversationId, reason, priority = 'medium' } = req.body;

//         if (!conversationId) {
//             return res.status(400).json({
//                 success: false,
//                 error: 'Conversation ID is required'
//             });
//         }

//         const conversation = await Message.findById(conversationId)
//             .populate('patient')
//             .populate('hospital');

//         if (!conversation) {
//             return res.status(404).json({
//                 success: false,
//                 error: 'Conversation not found'
//             });
//         }

//         // Handle escalation
//         await messageService.handleEscalation(
//             conversation.patient,
//             conversation.hospital,
//             'manual_escalation',
//             reason || 'Manual escalation requested'
//         );

//         // Update conversation status
//         await Message.findByIdAndUpdate(conversationId, {
//             status: 'escalated',
//             escalatedAt: new Date(),
//             escalationReason: reason
//         });

//         res.json({
//             success: true,
//             message: 'Conversation escalated to human agent successfully',
//             conversationId: conversationId,
//             patient: conversation.patient.name,
//             phone: conversation.patient.phone,
//             escalatedAt: new Date()
//         });

//     } catch (error) {
//         console.error('Error escalating conversation:', error);
//         res.status(500).json({
//             success: false,
//             error: 'Failed to escalate conversation',
//             details: error.message
//         });
//     }
// };

// /**
//  * Send manual message (admin override)
//  */
// export const sendManualMessage = async (req, res) => {
//     try {
//         const { patientPhone, message, method = 'sms' } = req.body;

//         if (!patientPhone || !message) {
//             return res.status(400).json({
//                 success: false,
//                 error: 'Patient phone and message are required'
//             });
//         }

//         const result = await messageService.sendMessage(patientPhone, message, method);

//         if (result.success) {
//             res.json({
//                 success: true,
//                 message: 'Manual message sent successfully',
//                 messageSid: result.messageSid,
//                 method: method,
//                 sentAt: new Date()
//             });
//         } else {
//             res.status(400).json({
//                 success: false,
//                 error: 'Failed to send manual message',
//                 details: result.error
//             });
//         }

//     } catch (error) {
//         console.error('Error sending manual message:', error);
//         res.status(500).json({
//             success: false,
//             error: 'Failed to send manual message',
//             details: error.message
//         });
//     }
// };

// export default {
//     handleIncomingMessage,
//     startAppointmentReminderMessage,
//     startFollowUpMessage,
//     getConversationHistory,
//     getPerformanceStats,
//     escalateConversation,
// };

import messageService from "../services/messageService.js";
import Message from "../models/Message.js";
import Hospital from "../models/Hospital.js";

/**
 * Handle Twilio Conversations API messages (unified messaging)
 */
export const handleIncomingMessage = async (req, res) => {
    try {
        const {
            EventType,
            Author,
            Body,
            MessageSid,
            ConversationSid,
            Source,
            MessagingServiceSid,
            ParticipantSid
        } = req.body;

        // Only process messages added to conversations
        if (EventType !== 'onMessageAdded') {
            console.log(`Ignoring conversation event: ${EventType}`);
            return res.status(200).send();
        }

        // Identify which hospital this message is for by the To number
        const toNumber = req.body.To?.replace('whatsapp:', '');
        let hospital = null;
        
        if (toNumber) {
            hospital = await Hospital.findOne({ twilioPhoneNumber: toNumber });
        }
        
        if (!hospital) {
            console.warn(`No hospital found for number: ${toNumber}`);
            // Try to find any hospital as fallback
            hospital = await Hospital.findOne();
        }

        if (!hospital || !hospital.twilioPhoneNumber) {
            console.error('No hospital with Twilio number found');
            return res.status(200).send();
        }

        // Skip messages sent by this hospital's service
        const hospitalTwilioNumber = hospital.twilioPhoneNumber;
        if (Author === hospitalTwilioNumber ||
            Author === `whatsapp:${hospitalTwilioNumber}` ||
            Author?.startsWith('whatsapp:' + hospitalTwilioNumber?.replace('+', ''))) {
            console.log('Skipping outbound message from our service');
            return res.status(200).send();
        }

        // Skip if no message body (system messages, delivery receipts, etc.)
        if (!Body || Body.trim().length === 0) {
            console.log('Skipping message without body');
            return res.status(200).send();
        }

        // Determine if this is WhatsApp based on Source or Author format
        const isWhatsApp = Source === 'WhatsApp' || Author?.startsWith('whatsapp:');

        // Create a compatible request object for our AI service
        const fakeReq = {
            body: {
                From: Author,
                To: hospitalTwilioNumber,
                Body: Body,
                MessageSid: MessageSid,
                ConversationSid: ConversationSid,
                SmsStatus: 'received'
            }
        };

        // Process with enhanced AI service, passing hospital info
        const result = await messageService.processIncomingMessage(fakeReq, hospital._id);

        res.status(200).send();

        if (result.success) {
            console.log('Conversation message processed successfully:', {
                action: result.action,
                responseTime: result.responseTime + 'ms',
                needsEscalation: result.needsEscalation
            });
        } else {
            console.log('Conversation processing failed:', result.error);
        }

    } catch (error) {
        console.error('Error handling Twilio conversation:', error);
        res.status(200).send();
    }
};

/**
 * Start AI-powered appointment reminder conversation
 */
export const startAppointmentReminderMessage = async (req, res) => {
    try {
        const { appointmentId, method = 'sms', reminderType = 'appointment_reminder' } = req.body;

        if (!appointmentId) {
            return res.status(400).json({
                success: false,
                error: 'Appointment ID is required'
            });
        }

        // hospitalId should come from auth middleware (req.hospitalId)
        const result = await messageService.startMessageConversation(
            appointmentId,
            reminderType,
            method,
            req.hospitalId
        );

        if (result.success) {
            res.json({
                success: true,
                message: 'AI appointment reminder started successfully',
                conversationId: result.conversationId,
                messageSid: result.messageSid,
                method: method,
                note: 'Patient will receive AI-powered reminder and can respond for full assistance'
            });
        } else {
            res.status(400).json({
                success: false,
                error: 'Failed to start appointment reminder',
                reason: result.reason || result.error
            });
        }

    } catch (error) {
        console.error('Error starting appointment reminder:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to start appointment reminder conversation',
            details: error.message
        });
    }
};

/**
 * Start AI-powered follow-up conversation
 */
export const startFollowUpMessage = async (req, res) => {
    try {
        const { appointmentId, method = 'sms', followUpType = 'follow_up' } = req.body;

        if (!appointmentId) {
            return res.status(400).json({
                success: false,
                error: 'Appointment ID is required'
            });
        }

        const result = await messageService.startMessageConversation(
            appointmentId,
            followUpType,
            method,
            req.hospitalId
        );

        if (result.success) {
            res.json({
                success: true,
                message: 'AI follow-up conversation started successfully',
                conversationId: result.conversationId,
                messageSid: result.messageSid,
                method: method,
                note: 'Patient will receive AI-powered follow-up and can respond for assistance'
            });
        } else {
            res.status(400).json({
                success: false,
                error: 'Failed to start follow-up conversation',
                reason: result.reason || result.error
            });
        }

    } catch (error) {
        console.error('Error starting follow-up conversation:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to start follow-up conversation',
            details: error.message
        });
    }
};

/**
 * Get conversation history for a patient
 */
export const getConversationHistory = async (req, res) => {
    try {
        const { patientId } = req.params;
        const { limit = 50, method } = req.query;

        if (!patientId) {
            return res.status(400).json({
                success: false,
                error: 'Patient ID is required'
            });
        }

        const query = { patient: patientId };
        if (method) {
            query.method = method;
        }

        const conversations = await Message.find(query)
            .populate('patient', 'name phone')
            .populate('hospital', 'name')
            .populate('appointment', 'dateTime doctor')
            .sort({ lastActivity: -1 })
            .limit(parseInt(limit));

        res.json({
            success: true,
            conversations: conversations,
            total: conversations.length
        });

    } catch (error) {
        console.error('Error fetching conversation history:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch conversation history',
            details: error.message
        });
    }
};

/**
 * Get AI service performance statistics
 */
export const getPerformanceStats = async (req, res) => {
    try {
        const stats = messageService.getPerformanceStats();

        res.json({
            success: true,
            performance: stats,
            timestamp: new Date(),
            note: 'AI Message Service Performance Metrics'
        });

    } catch (error) {
        console.error('Error fetching performance stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch performance statistics',
            details: error.message
        });
    }
};

/**
 * Manually escalate a conversation to human agent
 */
export const escalateConversation = async (req, res) => {
    try {
        const { conversationId, reason, priority = 'medium' } = req.body;

        if (!conversationId) {
            return res.status(400).json({
                success: false,
                error: 'Conversation ID is required'
            });
        }

        const conversation = await Message.findById(conversationId)
            .populate('patient')
            .populate('hospital');

        if (!conversation) {
            return res.status(404).json({
                success: false,
                error: 'Conversation not found'
            });
        }

        // Handle escalation
        await messageService.handleEscalation(
            conversation.patient,
            conversation.hospital,
            'manual_escalation',
            reason || 'Manual escalation requested'
        );

        // Update conversation status
        await Message.findByIdAndUpdate(conversationId, {
            status: 'escalated',
            escalatedAt: new Date(),
            escalationReason: reason
        });

        res.json({
            success: true,
            message: 'Conversation escalated to human agent successfully',
            conversationId: conversationId,
            patient: conversation.patient.name,
            phone: conversation.patient.phone,
            escalatedAt: new Date()
        });

    } catch (error) {
        console.error('Error escalating conversation:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to escalate conversation',
            details: error.message
        });
    }
};

/**
 * Send manual message (admin override)
 */
export const sendManualMessage = async (req, res) => {
    try {
        const { patientPhone, message, method = 'sms' } = req.body;

        if (!patientPhone || !message) {
            return res.status(400).json({
                success: false,
                error: 'Patient phone and message are required'
            });
        }

        // Get hospital from auth middleware
        const result = await messageService.sendMessage(
            patientPhone,
            message,
            method,
            req.hospitalId
        );

        if (result.success) {
            res.json({
                success: true,
                message: 'Manual message sent successfully',
                messageSid: result.messageSid,
                method: method,
                sentAt: new Date()
            });
        } else {
            res.status(400).json({
                success: false,
                error: 'Failed to send manual message',
                details: result.error
            });
        }

    } catch (error) {
        console.error('Error sending manual message:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to send manual message',
            details: error.message
        });
    }
};

export default {
    handleIncomingMessage,
    startAppointmentReminderMessage,
    startFollowUpMessage,
    getConversationHistory,
    getPerformanceStats,
    escalateConversation,
};