// Create controllers/messageController.js

import messageService from "../services/messageService.js";
import Patient from "../models/Patient.js";
import Appointment from "../models/Appointment.js";

/**
 * Handle incoming SMS messages from Twilio
 */
export const handleIncomingSMS = async (req, res) => {
    try {
        console.log('Incoming SMS webhook:', req.body);

        // Process the incoming message
        const result = await messageService.processIncomingMessage(req);

        // Send 200 response to acknowledge webhook
        res.status(200).send();

        if (result.success) {
            console.log('SMS processed successfully:', result);
        } else {
            console.log('SMS processing result:', result);
        }

    } catch (error) {
        console.error('Error handling incoming SMS:', error);
        res.status(500).send('Error processing SMS');
    }
};

/**
 * Handle incoming WhatsApp messages from Twilio
 */
export const handleIncomingWhatsApp = async (req, res) => {
    try {
        console.log('Incoming WhatsApp webhook:', req.body);

        // Process the incoming message (same logic as SMS)
        const result = await messageService.processIncomingMessage(req);

        // Send 200 response to acknowledge webhook
        res.status(200).send();

        if (result.success) {
            console.log('WhatsApp message processed successfully:', result);
        } else {
            console.log('WhatsApp processing result:', result);
        }

    } catch (error) {
        console.error('Error handling incoming WhatsApp:', error);
        res.status(500).send('Error processing WhatsApp message');
    }
};

/**
 * Handle message delivery status updates from Twilio
 */
export const handleMessageStatus = async (req, res) => {
    try {
        const { MessageSid, MessageStatus, From, To } = req.body;

        console.log(`Message ${MessageSid} status: ${MessageStatus}`);

        // Find and update the message interaction
        const cleanFrom = From ? From.replace('whatsapp:', '') : null;
        const cleanTo = To ? To.replace('whatsapp:', '') : null;

        // Determine which phone number is the patient's
        const patientPhone = cleanFrom === process.env.TWILIO_PHONE ? cleanTo : cleanFrom;

        if (patientPhone) {
            const updateResult = await Patient.findOneAndUpdate(
                {
                    phone: patientPhone,
                    'messageInteractions.messageSid': MessageSid
                },
                {
                    $set: {
                        'messageInteractions.$.deliveredAt': MessageStatus === 'delivered' ? new Date() : undefined,
                        'messageInteractions.$.readAt': MessageStatus === 'read' ? new Date() : undefined,
                        'messageInteractions.$.status': MessageStatus
                    }
                }
            );

            if (updateResult) {
                console.log(`Updated message interaction for patient ${patientPhone}`);
            }
        }

        res.status(200).send();

    } catch (error) {
        console.error('Error handling message status:', error);
        res.status(500).send('Error processing message status');
    }
};

/**
 * Send manual reminder message
 */
export const sendManualReminder = async (req, res) => {
    try {
        const { appointmentId, method = 'sms', reminderType = '24h' } = req.body;

        if (!appointmentId) {
            return res.status(400).json({
                success: false,
                error: 'Appointment ID is required'
            });
        }

        const result = await messageService.sendAppointmentReminder(
            appointmentId,
            reminderType,
            method
        );

        res.json(result);

    } catch (error) {
        console.error('Error sending manual reminder:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to send reminder message',
            details: error.message
        });
    }
};

/**
 * Send manual follow-up message
 */
export const sendManualFollowUp = async (req, res) => {
    try {
        const { appointmentId, method = 'sms', followUpType = 'post_appointment' } = req.body;

        if (!appointmentId) {
            return res.status(400).json({
                success: false,
                error: 'Appointment ID is required'
            });
        }

        const result = await messageService.sendFollowUpMessage(
            appointmentId,
            followUpType,
            method
        );

        res.json(result);

    } catch (error) {
        console.error('Error sending manual follow-up:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to send follow-up message',
            details: error.message
        });
    }
};

/**
 * Update patient communication preferences
 */
export const updateCommunicationPreferences = async (req, res) => {
    try {
        const { patientId } = req.params;
        const preferences = req.body;

        const updatedPatient = await Patient.findByIdAndUpdate(
            patientId,
            { $set: { communicationPreferences: preferences } },
            { new: true, runValidators: true }
        );

        if (!updatedPatient) {
            return res.status(404).json({
                success: false,
                error: 'Patient not found'
            });
        }

        res.json({
            success: true,
            message: 'Communication preferences updated',
            preferences: updatedPatient.communicationPreferences
        });

    } catch (error) {
        console.error('Error updating communication preferences:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update preferences',
            details: error.message
        });
    }
};

/**
 * Opt patient into WhatsApp
 */
export const optInWhatsApp = async (req, res) => {
    try {
        const { phone } = req.body;
        const { source = 'manual' } = req.body;

        if (!phone) {
            return res.status(400).json({
                success: false,
                error: 'Phone number is required'
            });
        }

        const updatedPatient = await Patient.findOneAndUpdate(
            { phone: phone },
            {
                $set: {
                    'whatsappOptIn.status': true,
                    'whatsappOptIn.optInDate': new Date(),
                    'whatsappOptIn.source': source,
                    'communicationPreferences.allowWhatsApp': true
                }
            },
            { new: true, upsert: true }
        );

        res.json({
            success: true,
            message: 'Patient opted into WhatsApp successfully',
            patient: {
                id: updatedPatient._id,
                phone: updatedPatient.phone,
                whatsappOptIn: updatedPatient.whatsappOptIn
            }
        });

    } catch (error) {
        console.error('Error opting into WhatsApp:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to opt into WhatsApp',
            details: error.message
        });
    }
};

/**
 * Opt patient out of WhatsApp
 */
export const optOutWhatsApp = async (req, res) => {
    try {
        const { phone } = req.body;

        if (!phone) {
            return res.status(400).json({
                success: false,
                error: 'Phone number is required'
            });
        }

        const updatedPatient = await Patient.findOneAndUpdate(
            { phone: phone },
            {
                $set: {
                    'whatsappOptIn.status': false,
                    'whatsappOptIn.optOutDate': new Date(),
                    'communicationPreferences.allowWhatsApp': false
                }
            },
            { new: true }
        );

        if (!updatedPatient) {
            return res.status(404).json({
                success: false,
                error: 'Patient not found'
            });
        }

        res.json({
            success: true,
            message: 'Patient opted out of WhatsApp',
            patient: {
                id: updatedPatient._id,
                phone: updatedPatient.phone,
                whatsappOptIn: updatedPatient.whatsappOptIn
            }
        });

    } catch (error) {
        console.error('Error opting out of WhatsApp:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to opt out of WhatsApp',
            details: error.message
        });
    }
};

/**
 * Get patient message history
 */
export const getMessageHistory = async (req, res) => {
    try {
        const { patientId } = req.params;
        const { limit = 20, page = 1, type } = req.query;

        const patient = await Patient.findById(patientId);
        if (!patient) {
            return res.status(404).json({
                success: false,
                error: 'Patient not found'
            });
        }

        let messageInteractions = patient.messageInteractions;

        // Filter by type if specified
        if (type) {
            messageInteractions = messageInteractions.filter(interaction =>
                interaction.type === type
            );
        }

        // Sort by most recent first
        messageInteractions.sort((a, b) => b.sentAt - a.sentAt);

        // Pagination
        const startIndex = (page - 1) * limit;
        const paginatedMessages = messageInteractions.slice(startIndex, startIndex + limit);

        res.json({
            success: true,
            messages: paginatedMessages,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: messageInteractions.length,
                totalPages: Math.ceil(messageInteractions.length / limit)
            }
        });

    } catch (error) {
        console.error('Error getting message history:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get message history',
            details: error.message
        });
    }
};

/**
 * Get messaging statistics
 */
export const getMessagingStats = async (req, res) => {
    try {
        const { days = 30 } = req.query;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(days));

        const stats = await Patient.aggregate([
            {
                $match: {
                    'messageInteractions.sentAt': { $gte: startDate }
                }
            },
            {
                $unwind: '$messageInteractions'
            },
            {
                $match: {
                    'messageInteractions.sentAt': { $gte: startDate }
                }
            },
            {
                $group: {
                    _id: {
                        type: '$messageInteractions.type',
                        method: '$messageInteractions.method'
                    },
                    count: { $sum: 1 },
                    responded: {
                        $sum: {
                            $cond: [{ $ne: ['$messageInteractions.respondedAt', null] }, 1, 0]
                        }
                    },
                    escalatedToCalls: {
                        $sum: {
                            $cond: [{ $eq: ['$messageInteractions.escalatedToCall', true] }, 1, 0]
                        }
                    }
                }
            },
            {
                $group: {
                    _id: null,
                    byType: {
                        $push: {
                            type: '$_id.type',
                            method: '$_id.method',
                            sent: '$count',
                            responded: '$responded',
                            responseRate: {
                                $multiply: [{ $divide: ['$responded', '$count'] }, 100]
                            },
                            escalatedToCalls: '$escalatedToCalls'
                        }
                    },
                    totalSent: { $sum: '$count' },
                    totalResponded: { $sum: '$responded' },
                    totalEscalated: { $sum: '$escalatedToCalls' }
                }
            }
        ]);

        const result = stats[0] || {
            byType: [],
            totalSent: 0,
            totalResponded: 0,
            totalEscalated: 0
        };

        result.overallResponseRate = result.totalSent > 0
            ? Math.round((result.totalResponded / result.totalSent) * 100)
            : 0;

        result.escalationRate = result.totalSent > 0
            ? Math.round((result.totalEscalated / result.totalSent) * 100)
            : 0;

        res.json({
            success: true,
            stats: result,
            dateRange: {
                days: parseInt(days),
                from: startDate.toISOString(),
                to: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('Error getting messaging stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get messaging statistics',
            details: error.message
        });
    }
};