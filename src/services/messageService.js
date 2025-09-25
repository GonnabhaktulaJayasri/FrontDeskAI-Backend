// Create services/messageService.js

import twilio from "twilio";
import Patient from "../models/Patient.js";
import Appointment from "../models/Appointment.js";
import callService from "./callService.js";
import 'dotenv/config';

class MessageService {
    constructor() {
        this.twilioClient = null;
        this.initializeTwilio();
    }

    initializeTwilio() {
        if (process.env.TWILIO_SID && process.env.TWILIO_AUTH) {
            this.twilioClient = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH);
        }
    }

    /**
     * Send appointment reminder message
     */
    async sendAppointmentReminder(appointmentId, reminderType = '24h', method = 'sms') {
        try {
            const appointment = await Appointment.findById(appointmentId)
                .populate('patient', 'name phone communicationPreferences messageInteractions whatsappOptIn')
                .populate('doctor', 'name specialty');

            if (!appointment) {
                throw new Error('Appointment not found');
            }

            const patient = appointment.patient;
            if (!patient.canReceiveMessages(method)) {
                console.log(`Patient ${patient._id} cannot receive ${method} messages`);
                return { success: false, reason: 'messaging_not_allowed' };
            }

            // Generate message content
            const messageContent = this.generateReminderMessage(appointment, reminderType);
            
            // Send message
            const result = await this.sendMessage(patient.phone, messageContent, method);
            
            if (result.success) {
                // Log interaction
                await this.logMessageInteraction(patient._id, {
                    type: 'appointment_reminder',
                    method: method,
                    messageSid: result.messageSid,
                    appointmentId: appointmentId,
                    templateUsed: `reminder_${reminderType}`,
                    messageContent: messageContent
                });

                // Update appointment reminder status
                await Appointment.findByIdAndUpdate(appointmentId, {
                    $set: {
                        [`reminderCalls.${reminderType}.status`]: 'sent_message',
                        [`reminderCalls.${reminderType}.sentAt`]: new Date(),
                        [`reminderCalls.${reminderType}.method`]: method,
                        [`reminderCalls.${reminderType}.messageSid`]: result.messageSid
                    }
                });
            }

            return result;

        } catch (error) {
            console.error('Error sending appointment reminder message:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Send follow-up message
     */
    async sendFollowUpMessage(appointmentId, followUpType = 'post_appointment', method = 'sms') {
        try {
            const appointment = await Appointment.findById(appointmentId)
                .populate('patient', 'name phone communicationPreferences messageInteractions whatsappOptIn')
                .populate('doctor', 'name specialty');

            if (!appointment) {
                throw new Error('Appointment not found');
            }

            const patient = appointment.patient;
            if (!patient.canReceiveMessages(method)) {
                return { success: false, reason: 'messaging_not_allowed' };
            }

            // Generate follow-up message
            const messageContent = this.generateFollowUpMessage(appointment, followUpType);
            
            // Send message
            const result = await this.sendMessage(patient.phone, messageContent, method);
            
            if (result.success) {
                // Log interaction
                await this.logMessageInteraction(patient._id, {
                    type: 'follow_up',
                    method: method,
                    messageSid: result.messageSid,
                    appointmentId: appointmentId,
                    templateUsed: `followup_${followUpType}`,
                    messageContent: messageContent
                });

                // Update follow-up status
                await Appointment.findByIdAndUpdate(appointmentId, {
                    $set: {
                        'followUpCall.status': 'sent_message',
                        'followUpCall.sentAt': new Date(),
                        'followUpCall.method': method,
                        'followUpCall.messageSid': result.messageSid
                    }
                });
            }

            return result;

        } catch (error) {
            console.error('Error sending follow-up message:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Core message sending function
     */
    async sendMessage(phoneNumber, messageContent, method = 'sms') {
        try {
            this.validateTwilioConfig();

            let messageOptions = {
                to: phoneNumber,
                body: messageContent
            };

            if (method === 'whatsapp') {
                messageOptions.from = `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`;
                messageOptions.to = `whatsapp:${phoneNumber}`;
            } else {
                messageOptions.from = process.env.TWILIO_PHONE;
            }

            const message = await this.twilioClient.messages.create(messageOptions);

            return {
                success: true,
                messageSid: message.sid,
                status: message.status,
                method: method,
                to: phoneNumber
            };

        } catch (error) {
            console.error('Error sending message:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Process incoming message responses
     */
    async processIncomingMessage(req) {
        try {
            const { From, To, Body, MessageSid, SmsStatus } = req.body;
            
            // Determine if this is WhatsApp or SMS
            const isWhatsApp = From.startsWith('whatsapp:') || To.startsWith('whatsapp:');
            const cleanFrom = From.replace('whatsapp:', '');
            
            // Find patient
            const patient = await Patient.findOne({ phone: cleanFrom });
            if (!patient) {
                console.log('Unknown patient message from:', cleanFrom);
                return { success: false, reason: 'patient_not_found' };
            }

            // Find the most recent message interaction
            const recentInteraction = patient.messageInteractions
                .sort((a, b) => b.sentAt - a.sentAt)[0];

            if (!recentInteraction) {
                console.log('No recent message interaction found for patient:', patient._id);
                return { success: false, reason: 'no_recent_interaction' };
            }

            // Update interaction with response
            await Patient.findOneAndUpdate(
                { _id: patient._id, 'messageInteractions._id': recentInteraction._id },
                {
                    $set: {
                        'messageInteractions.$.respondedAt': new Date(),
                        'messageInteractions.$.responseContent': Body,
                        'messageInteractions.$.sentiment': this.analyzeSentiment(Body)
                    }
                }
            );

            // Process the response based on content
            const response = await this.processMessageResponse(patient, recentInteraction, Body, isWhatsApp);
            
            return response;

        } catch (error) {
            console.error('Error processing incoming message:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Process and respond to message content
     */
    async processMessageResponse(patient, interaction, messageBody, isWhatsApp = false) {
        try {
            const response = messageBody.toLowerCase().trim();
            
            // Determine response type based on interaction type
            if (interaction.type === 'appointment_reminder') {
                return await this.handleReminderResponse(patient, interaction, response, isWhatsApp);
            } else if (interaction.type === 'follow_up') {
                return await this.handleFollowUpResponse(patient, interaction, response, isWhatsApp);
            }

            // Default response for unknown interaction types
            return await this.sendHelpMessage(patient.phone, isWhatsApp ? 'whatsapp' : 'sms');

        } catch (error) {
            console.error('Error processing message response:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Handle appointment reminder responses
     */
    async handleReminderResponse(patient, interaction, response, isWhatsApp) {
        try {
            const method = isWhatsApp ? 'whatsapp' : 'sms';
            let replyMessage = '';
            let shouldMakeCall = false;

            // Analyze response
            if (this.isConfirmation(response)) {
                // Patient confirmed appointment
                replyMessage = `Great! Your appointment is confirmed. We'll see you then. If you need to make changes, please call us at ${process.env.HOSPITAL_MAIN_PHONE}.`;
                
                // Update appointment status
                if (interaction.appointmentId) {
                    await Appointment.findByIdAndUpdate(interaction.appointmentId, {
                        $set: {
                            'reminderCalls.24_hour.response': 'confirmed',
                            'reminderCalls.1_hour.response': 'confirmed'
                        }
                    });
                }

            } else if (this.isRescheduleRequest(response)) {
                // Patient wants to reschedule
                replyMessage = `I understand you need to reschedule. I'll have someone call you shortly to help with that. Or you can call us directly at ${process.env.HOSPITAL_MAIN_PHONE}.`;
                shouldMakeCall = true;

            } else if (this.isCancellation(response)) {
                // Patient wants to cancel
                replyMessage = `I understand you need to cancel. I'll have someone call you to confirm and help with rescheduling if needed.`;
                shouldMakeCall = true;

            } else if (this.isCallRequest(response)) {
                // Patient explicitly requested a call
                replyMessage = `Of course! Someone will call you shortly.`;
                shouldMakeCall = true;

            } else {
                // Unclear response - offer call
                replyMessage = `I didn't quite understand your response. Would you like me to have someone call you? Reply "YES" for a call or "HELP" for options.`;
                
                // Mark for potential escalation
                await Patient.findOneAndUpdate(
                    { _id: patient._id, 'messageInteractions._id': interaction._id },
                    { $set: { 'messageInteractions.$.escalationRequested': true } }
                );
            }

            // Send reply message
            const replyResult = await this.sendMessage(patient.phone, replyMessage, method);

            // Make call if requested/needed
            if (shouldMakeCall && patient.communicationPreferences.allowCalls) {
                setTimeout(async () => {
                    await this.escalateToCall(patient._id, interaction, 'patient_request');
                }, 2000); // Small delay to ensure message is sent first
            }

            return {
                success: true,
                action: shouldMakeCall ? 'escalated_to_call' : 'responded',
                replyMessage: replyMessage,
                replyMessageSid: replyResult.messageSid
            };

        } catch (error) {
            console.error('Error handling reminder response:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Handle follow-up responses
     */
    async handleFollowUpResponse(patient, interaction, response, isWhatsApp) {
        try {
            const method = isWhatsApp ? 'whatsapp' : 'sms';
            let replyMessage = '';
            let shouldMakeCall = false;

            if (this.isPositiveResponse(response)) {
                replyMessage = `That's wonderful to hear! Thank you for the update. If you have any concerns later, don't hesitate to contact us.`;
                
            } else if (this.hasHealthConcerns(response)) {
                replyMessage = `I understand you have some concerns. A healthcare professional will call you shortly to discuss this further.`;
                shouldMakeCall = true;
                
            } else if (this.isCallRequest(response)) {
                replyMessage = `Of course! Someone will call you shortly.`;
                shouldMakeCall = true;
                
            } else {
                replyMessage = `Thank you for your response. If you need any assistance, please call us at ${process.env.HOSPITAL_MAIN_PHONE}.`;
            }

            // Send reply
            const replyResult = await this.sendMessage(patient.phone, replyMessage, method);

            // Make call if needed
            if (shouldMakeCall && patient.communicationPreferences.allowCalls) {
                setTimeout(async () => {
                    await this.escalateToCall(patient._id, interaction, 'health_concerns');
                }, 2000);
            }

            return {
                success: true,
                action: shouldMakeCall ? 'escalated_to_call' : 'responded',
                replyMessage: replyMessage,
                replyMessageSid: replyResult.messageSid
            };

        } catch (error) {
            console.error('Error handling follow-up response:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Escalate message conversation to phone call
     */
    async escalateToCall(patientId, interaction, reason) {
        try {
            const patient = await Patient.findById(patientId);
            if (!patient || !patient.communicationPreferences.allowCalls) {
                console.log('Cannot escalate to call - patient does not allow calls');
                return { success: false, reason: 'calls_not_allowed' };
            }

            // Create call context based on interaction type
            let callType = 'general';
            let callReason = `Follow-up from ${interaction.method} message`;
            
            if (interaction.type === 'appointment_reminder') {
                callType = 'appointment_management';
                callReason = 'Appointment reminder response - needs assistance';
            } else if (interaction.type === 'follow_up') {
                callType = 'follow_up';
                callReason = 'Health follow-up - patient has concerns';
            }

            // Make the call
            const callResult = await callService.makeOutboundCall({
                phoneNumber: patient.phone,
                reason: callReason,
                callType: callType,
                patientId: patientId,
                appointmentId: interaction.appointmentId,
                escalationReason: reason,
                originalMessageInteraction: interaction._id
            });

            if (callResult.success) {
                // Update interaction to mark as escalated
                await Patient.findOneAndUpdate(
                    { _id: patientId, 'messageInteractions._id': interaction._id },
                    {
                        $set: {
                            'messageInteractions.$.escalatedToCall': true,
                            'messageInteractions.$.callSid': callResult.call.sid
                        }
                    }
                );
            }

            return callResult;

        } catch (error) {
            console.error('Error escalating to call:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Generate appointment reminder message templates
     */
    generateReminderMessage(appointment, reminderType) {
        const patientName = appointment.patient.name || 'Patient';
        const doctorName = appointment.doctor.name;
        const appointmentDate = appointment.dateTime.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        const appointmentTime = appointment.dateTime.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });

        const hospitalName = process.env.HOSPITAL_NAME || 'Our Medical Center';
        const hospitalPhone = process.env.HOSPITAL_MAIN_PHONE;

        let message = '';

        if (reminderType === '24h' || reminderType === '24_hour') {
            message = `Hi ${patientName}! Reminder: You have an appointment with Dr. ${doctorName} TOMORROW (${appointmentDate}) at ${appointmentTime}. 

Please reply:
✅ YES to confirm
📞 CALL for phone assistance  
🔄 RESCHEDULE if you need to change
❌ CANCEL if you can't make it

${hospitalName} | ${hospitalPhone}`;

        } else if (reminderType === '1h' || reminderType === '1_hour') {
            message = `Hi ${patientName}! Your appointment with Dr. ${doctorName} is in 1 HOUR (${appointmentTime}).

Reply YES to confirm or CALL if you need assistance.

Location: ${hospitalName}
Phone: ${hospitalPhone}`;
        }

        return message;
    }

    /**
     * Generate follow-up message templates
     */
    generateFollowUpMessage(appointment, followUpType) {
        const patientName = appointment.patient.name || 'Patient';
        const doctorName = appointment.doctor.name;
        const visitDate = appointment.dateTime.toLocaleDateString();
        const hospitalName = process.env.HOSPITAL_NAME || 'Our Medical Center';
        const hospitalPhone = process.env.HOSPITAL_MAIN_PHONE;

        let message = '';

        if (followUpType === 'post_appointment') {
            message = `Hi ${patientName}! How are you feeling after your visit with Dr. ${doctorName} on ${visitDate}?

Please reply with:
😊 GOOD if you're feeling better
😐 SAME if no change
😟 WORSE if you're not feeling well
📞 CALL if you have questions

We care about your recovery!

${hospitalName} | ${hospitalPhone}`;
        }

        return message;
    }

    /**
     * Response analysis methods
     */
    isConfirmation(response) {
        const confirmationWords = ['yes', 'y', 'ok', 'okay', 'confirm', 'confirmed', '✅', 'good'];
        return confirmationWords.some(word => response.includes(word));
    }

    isRescheduleRequest(response) {
        const rescheduleWords = ['reschedule', 'change', 'move', 'different time', 'can\'t make', '🔄'];
        return rescheduleWords.some(word => response.includes(word));
    }

    isCancellation(response) {
        const cancelWords = ['cancel', 'cancelled', 'can\'t come', 'unable to attend', '❌'];
        return cancelWords.some(word => response.includes(word));
    }

    isCallRequest(response) {
        const callWords = ['call', 'phone', 'speak', 'talk', '📞'];
        return callWords.some(word => response.includes(word));
    }

    isPositiveResponse(response) {
        const positiveWords = ['good', 'better', 'fine', 'great', 'well', 'okay', '😊'];
        return positiveWords.some(word => response.includes(word));
    }

    hasHealthConcerns(response) {
        const concernWords = ['worse', 'bad', 'pain', 'hurt', 'concern', 'worried', 'problem', '😟'];
        return concernWords.some(word => response.includes(word));
    }

    analyzeSentiment(message) {
        const positive = ['good', 'great', 'fine', 'better', 'happy', 'thanks'];
        const negative = ['bad', 'worse', 'pain', 'hurt', 'angry', 'upset'];
        
        const lowerMessage = message.toLowerCase();
        
        if (positive.some(word => lowerMessage.includes(word))) return 'positive';
        if (negative.some(word => lowerMessage.includes(word))) return 'negative';
        
        return 'neutral';
    }

    /**
     * Helper methods
     */
    async logMessageInteraction(patientId, interactionData) {
        try {
            await Patient.findByIdAndUpdate(patientId, {
                $push: { messageInteractions: interactionData }
            });
        } catch (error) {
            console.error('Error logging message interaction:', error);
        }
    }

    async sendHelpMessage(phoneNumber, method = 'sms') {
        const helpMessage = `Hello! I'm the automated assistant from ${process.env.HOSPITAL_NAME || 'Our Medical Center'}.

For appointment reminders, reply:
• YES - to confirm
• RESCHEDULE - to change time  
• CANCEL - to cancel
• CALL - for phone assistance

For other help, call: ${process.env.HOSPITAL_MAIN_PHONE}`;

        return await this.sendMessage(phoneNumber, helpMessage, method);
    }

    validateTwilioConfig() {
        if (!process.env.TWILIO_SID || !process.env.TWILIO_AUTH) {
            throw new Error("Missing Twilio credentials");
        }
        if (!process.env.TWILIO_PHONE) {
            throw new Error("Missing Twilio phone number configuration");
        }
    }
}

// Create singleton instance
const messageService = new MessageService();
export default messageService;