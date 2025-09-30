import twilio from "twilio";
import Patient from "../models/Patient.js";
import Appointment from "../models/Appointment.js";
import Message from "../models/Message.js";
import Hospital from "../models/Hospital.js";
import { bookAppointment, findPatientAppointments, cancelAppointmentByDetails, rescheduleAppointmentByDetails } from "./appointment.js";
import { checkDoctorAvailability } from "./doctors.js";
import { processPrescriptionRefill } from './prescriptionRefill.js';
import callService from './callService.js';
import OpenAI from 'openai';
import 'dotenv/config';

class MessageService {
    constructor() {
        this.twilioClient = null;
        this.openai = null;
        this.initializeTwilio();
        this.initializeOpenAI();

        // Track active reminder/follow-up conversations
        this.activeConversations = new Map();

        // Performance tracking
        this.performanceStats = {
            totalRequests: 0,
            aiProcessed: 0,
            remindersSent: 0,
            followUpsSent: 0,
            callsTriggered: 0,
            appointmentsConfirmed: 0,
            appointmentsRescheduled: 0,
            appointmentsCancelled: 0,
            errors: 0
        };
    }

    initializeTwilio() {
        if (process.env.TWILIO_SID && process.env.TWILIO_AUTH) {
            this.twilioClient = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH);
            console.log('Twilio Messages API initialized');
        } else {
            console.error('❌ Twilio credentials missing');
        }
    }

    initializeOpenAI() {
        if (process.env.OPENAI_API_KEY) {
            this.openai = new OpenAI({
                apiKey: process.env.OPENAI_API_KEY,
            });
            console.log('OpenAI GPT-4o-mini initialized');
        } else {
            console.error('❌ OpenAI API key missing');
        }
    }

    /**
     * Check if this is an active reminder/follow-up conversation
     */
    async isReminderFollowupConversation(phoneNumber) {
        try {
            // Check in-memory cache first (fast)
            if (this.activeConversations.has(phoneNumber)) {
                const conversation = this.activeConversations.get(phoneNumber);

                // Check if still active (within 24 hours)
                const hoursSinceStart = (Date.now() - conversation.startedAt) / (1000 * 60 * 60);
                if (hoursSinceStart < 24) {
                    console.log(`Active ${conversation.type} conversation for ${phoneNumber}`);
                    return true;
                } else {
                    this.activeConversations.delete(phoneNumber);
                }
            }

            // Check database (slower but persistent)
            const recentMessage = await Message.findOne({
                $or: [
                    { from: phoneNumber },
                    { to: phoneNumber }
                ],
                isReminderFollowup: true,
                createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
            }).sort({ createdAt: -1 });

            if (recentMessage) {
                console.log(`Recent reminder/follow-up found in DB for ${phoneNumber}`);

                // Restore to in-memory cache
                this.activeConversations.set(phoneNumber, {
                    appointmentId: recentMessage.appointment,
                    type: recentMessage.conversationType || 'reminder',
                    startedAt: recentMessage.createdAt.getTime()
                });

                return true;
            }

            console.log(`ℹ️ No active conversation for ${phoneNumber}`);
            return false;

        } catch (error) {
            console.error('Error checking conversation:', error);
            return false;
        }
    }

    /**
     * Process incoming message (ONLY for reminder/follow-up conversations)
     */
    async processIncomingMessage(req) {
        const startTime = Date.now();
        this.performanceStats.totalRequests++;

        try {
            const { From, To, Body, MessageSid } = req.body;

            const isWhatsApp = From.startsWith('whatsapp:');
            const cleanFrom = From.replace('whatsapp:', '');
            const cleanTo = To.replace('whatsapp:', '');
            const message = Body.trim();

            console.log(`\n🤖 Processing ${isWhatsApp ? 'WhatsApp' : 'SMS'} from ${cleanFrom}`);
            console.log(`💬 Message: "${message}"`);

            // Get or create patient
            let patient = await Patient.findOne({ phone: cleanFrom });
            if (!patient) {
                patient = new Patient({
                    phone: cleanFrom,
                    communicationPreferences: {
                        preferredMethod: isWhatsApp ? 'whatsapp' : 'sms'
                    }
                });
                await patient.save();
            }

            // Get hospital
            const hospital = await this.getHospital();

            // Get conversation details
            const conversation = this.activeConversations.get(cleanFrom);
            const appointmentId = conversation?.appointmentId;

            // Save incoming message
            await Message.create({
                from: cleanFrom,
                to: cleanTo,
                body: message,
                direction: 'inbound',
                status: 'received',
                messageSid: MessageSid,
                patient: patient._id,
                method: isWhatsApp ? 'whatsapp' : 'sms',
                isReminderFollowup: true,
                appointment: appointmentId,
                conversationType: conversation?.type
            });

            // Get AI response
            const aiResponse = await this.getAIResponse(
                message,
                patient,
                hospital,
                appointmentId
            );

            // Send response
            if (aiResponse.shouldRespond) {
                const result = await this.sendMessage(
                    cleanFrom,
                    aiResponse.message,
                    isWhatsApp ? 'whatsapp' : 'sms'
                );

                // Save outbound message
                await Message.create({
                    from: cleanTo,
                    to: cleanFrom,
                    body: aiResponse.message,
                    direction: 'outbound',
                    status: 'sent',
                    messageSid: result.messageSid,
                    patient: patient._id,
                    method: isWhatsApp ? 'whatsapp' : 'sms',
                    isReminderFollowup: true,
                    appointment: appointmentId,
                    conversationType: conversation?.type
                });
            }

            // Update stats
            this.updateStats(aiResponse.action);

            // End conversation if needed
            if (aiResponse.conversationEnded) {
                this.activeConversations.delete(cleanFrom);
                console.log(`Conversation ended for ${cleanFrom}`);
            }

            this.performanceStats.aiProcessed++;
            console.log(`Processed in ${Date.now() - startTime}ms - Action: ${aiResponse.action}\n`);

            return {
                success: true,
                action: aiResponse.action,
                responseTime: Date.now() - startTime
            };

        } catch (error) {
            console.error('❌ Error processing message:', error);
            this.performanceStats.errors++;
            return { success: false, error: error.message };
        }
    }

    /**
     * Get AI response using OpenAI GPT-4o-mini with ALL functions
     */
    async getAIResponse(message, patient, hospital, appointmentId) {
        try {
            if (!this.openai) {
                throw new Error('OpenAI not initialized');
            }

            // Get appointment details
            const appointment = appointmentId ?
                await Appointment.findById(appointmentId).populate('doctor') :
                null;

            // Build system message
            const systemMessage = this.buildSystemMessage(patient, hospital, appointment);

            // Get conversation history
            const history = await this.getConversationHistory(patient._id, 5);

            const messages = [
                { role: "system", content: systemMessage },
                ...history,
                { role: "user", content: message }
            ];

            console.log('Calling OpenAI GPT-4o-mini...');

            const completion = await this.openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: messages,
                tools: this.getAllFunctionTools(),
                tool_choice: "auto",
                temperature: 0.7,
                max_tokens: 1000
            });

            const assistantMessage = completion.choices[0].message;

            // Handle function calls
            if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
                console.log(`AI calling ${assistantMessage.tool_calls.length} function(s)`);
                return await this.handleFunctionCalls(
                    assistantMessage,
                    patient,
                    hospital,
                    appointment
                );
            }

            // Handle text response
            if (assistantMessage.content) {
                return {
                    shouldRespond: true,
                    message: assistantMessage.content,
                    action: 'ai_text_response',
                    conversationEnded: false
                };
            }

            throw new Error('No response from OpenAI');

        } catch (error) {
            console.error('❌ OpenAI error:', error.message);
            return {
                shouldRespond: true,
                message: "I'm having trouble processing your message. Our team will call you shortly.",
                action: 'error',
                conversationEnded: true
            };
        }
    }

    /**
     * Build enhanced system message
     */
    buildSystemMessage(patient, hospital, appointment) {
        const hospitalName = hospital.name || 'Our Medical Center';
        const patientName = patient?.name || 'the patient';

        let appointmentInfo = '';
        if (appointment) {
            const date = appointment.dateTime.toLocaleDateString();
            const time = appointment.dateTime.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit'
            });
            appointmentInfo = `
APPOINTMENT DETAILS:
- Doctor: Dr. ${appointment.doctor?.name || 'TBD'}
- Date: ${date}
- Time: ${time}
- Status: ${appointment.status}`;
        }

        return `You are an AI assistant for ${hospitalName}, helping ${patientName} via text message about their appointment.

PATIENT: ${patientName} (${patient.phone})
HOSPITAL: ${hospitalName}${appointmentInfo}

CRITICAL CONVERSATION FLOW:

1. If patient wants to CONFIRM:
   → Use confirm_appointment_attendance function
   → Update status to 'confirmed' in DB

2. If patient wants to RESCHEDULE:
   → FIRST use ask_communication_preference function with action="reschedule"
   → Wait for patient response (TEXT or CALL)
   → If patient says "TEXT": Use reschedule_appointment function
   → If patient says "CALL": Use trigger_call_to_patient function

3. If patient wants to CANCEL:
   → FIRST use ask_communication_preference function with action="cancel"
   → Wait for patient response (TEXT or CALL)
   → If patient says "TEXT": Use cancel_appointment function
   → If patient says "CALL": Use trigger_call_to_patient function

4. If patient says "call me", "I want to talk", "phone me":
   → Use trigger_call_to_patient function IMMEDIATELY

5. For other requests:
   → Use appropriate function (get_my_appointments, check_doctor_availability, etc.)

YOUR FUNCTIONS (Same as phone system):
get_my_appointments - Show appointments
book_appointment - Book new appointment
reschedule_appointment - Reschedule via text (ONLY if they chose TEXT)
cancel_appointment - Cancel via text (ONLY if they chose TEXT)
check_doctor_availability - Check schedules
prescription_refill - Handle refills
update_patient_info - Update info
trigger_call_to_patient - Call patient (when they choose CALL or request it)
ask_communication_preference - Ask TEXT or CALL (REQUIRED before reschedule/cancel)
confirm_appointment_attendance - Confirm they're coming

RULES:
- ALWAYS ask TEXT or CALL preference before reschedule/cancel
- Use trigger_call_to_patient when patient chooses CALL or explicitly requests call
- Update appointment status in DB after every action
- Be concise (text message format, not essays)
- Use emojis appropriately
- Always confirm actions taken

Remember: Help them manage their appointment efficiently via text or call!`;
    }

    /**
     * Get ALL function tools (same as callAssistant.js)
     */
    getAllFunctionTools() {
        return [
            {
                type: "function",
                function: {
                    name: "get_my_appointments",
                    description: "Show patient their appointments",
                    parameters: {
                        type: "object",
                        properties: {
                            include_past: { type: "boolean", default: false },
                            limit: { type: "number", default: 5 }
                        }
                    }
                }
            },
            {
                type: "function",
                function: {
                    name: "check_doctor_availability",
                    description: "Check doctor availability on a specific date",
                    parameters: {
                        type: "object",
                        properties: {
                            doctor_name: { type: "string" },
                            date: { type: "string", description: "Date in YYYY-MM-DD format" },
                            specialty: { type: "string" }
                        },
                        required: ["date"]
                    }
                }
            },
            {
                type: "function",
                function: {
                    name: "book_appointment",
                    description: "Book new appointment",
                    parameters: {
                        type: "object",
                        properties: {
                            patient_name: { type: "string" },
                            patient_phone: { type: "string" },
                            doctor_name: { type: "string" },
                            date: { type: "string", description: "YYYY-MM-DD" },
                            time: { type: "string", description: "HH:MM" },
                            reason: { type: "string" }
                        },
                        required: ["doctor_name", "date", "time", "reason"]
                    }
                }
            },
            {
                type: "function",
                function: {
                    name: "reschedule_appointment",
                    description: "Reschedule appointment via text. Use ONLY if patient explicitly chose TEXT communication.",
                    parameters: {
                        type: "object",
                        properties: {
                            patient_name: { type: "string" },
                            patient_phone: { type: "string" },
                            old_date: { type: "string", description: "Current appointment date YYYY-MM-DD" },
                            new_date: { type: "string", description: "New appointment date YYYY-MM-DD" },
                            new_time: { type: "string", description: "New time HH:MM" }
                        },
                        required: ["patient_phone", "old_date", "new_date", "new_time"]
                    }
                }
            },
            {
                type: "function",
                function: {
                    name: "cancel_appointment",
                    description: "Cancel appointment via text. Use ONLY if patient explicitly chose TEXT communication.",
                    parameters: {
                        type: "object",
                        properties: {
                            patient_name: { type: "string" },
                            patient_phone: { type: "string" },
                            appointment_date: { type: "string", description: "YYYY-MM-DD" },
                            reason: { type: "string" }
                        },
                        required: ["patient_phone", "appointment_date"]
                    }
                }
            },
            {
                type: "function",
                function: {
                    name: "prescription_refill",
                    description: "Request prescription refill",
                    parameters: {
                        type: "object",
                        properties: {
                            medication_name: { type: "string" },
                            patient_name: { type: "string" },
                            patient_phone: { type: "string" },
                            pharmacy_name: { type: "string" }
                        },
                        required: ["medication_name", "patient_phone"]
                    }
                }
            },
            {
                type: "function",
                function: {
                    name: "update_patient_info",
                    description: "Update patient information",
                    parameters: {
                        type: "object",
                        properties: {
                            name: { type: "string" },
                            age: { type: "number" },
                            gender: { type: "string", enum: ["male", "female", "other"] },
                            preferred_doctor: { type: "string" },
                            preferred_time: { type: "string" }
                        }
                    }
                }
            },
            {
                type: "function",
                function: {
                    name: "trigger_call_to_patient",
                    description: "Trigger AI phone call to patient. Use when: 1) Patient explicitly requests call ('call me', 'I want to talk'), 2) Patient chooses CALL over TEXT for reschedule/cancel, 3) Complex issues better handled by voice",
                    parameters: {
                        type: "object",
                        properties: {
                            reason: {
                                type: "string",
                                description: "Reason for call (e.g., 'patient requested call', 'reschedule appointment', 'cancel appointment')"
                            },
                            urgency: {
                                type: "string",
                                enum: ["urgent", "normal"],
                                default: "normal",
                                description: "urgent = call immediately, normal = call within 10 min"
                            },
                            call_type: {
                                type: "string",
                                enum: ["appointment_management", "prescription_refill", "general_inquiry", "follow_up"],
                                default: "appointment_management"
                            },
                            context: {
                                type: "string",
                                description: "Additional context about what patient needs"
                            }
                        },
                        required: ["reason", "call_type"]
                    }
                }
            },
            {
                type: "function",
                function: {
                    name: "ask_communication_preference",
                    description: "Ask patient if they prefer TEXT or CALL. MUST use this BEFORE rescheduling or canceling appointments.",
                    parameters: {
                        type: "object",
                        properties: {
                            action: {
                                type: "string",
                                enum: ["reschedule", "cancel"],
                                description: "What action patient wants to take"
                            },
                            context: {
                                type: "string",
                                description: "Additional context"
                            }
                        },
                        required: ["action"]
                    }
                }
            },
            {
                type: "function",
                function: {
                    name: "confirm_appointment_attendance",
                    description: "Confirm patient will attend their appointment",
                    parameters: {
                        type: "object",
                        properties: {
                            appointment_date: { type: "string", description: "YYYY-MM-DD" },
                            patient_phone: { type: "string" },
                            confirmation_note: { type: "string" }
                        },
                        required: ["appointment_date", "patient_phone"]
                    }
                }
            }
        ];
    }

    /**
     * Handle function calls from OpenAI
     */
    async handleFunctionCalls(assistantMessage, patient, hospital, appointment) {
        try {
            const toolCall = assistantMessage.tool_calls[0];
            const functionName = toolCall.function.name;
            const functionArgs = JSON.parse(toolCall.function.arguments);

            console.log(`🔧 Executing: ${functionName}`);
            console.log(`📋 Args:`, JSON.stringify(functionArgs, null, 2));

            // Fill in patient info if missing
            if (!functionArgs.patient_phone) functionArgs.patient_phone = patient.phone;
            if (!functionArgs.patient_name && patient.name) functionArgs.patient_name = patient.name;

            // Route to handler
            switch (functionName) {
                case 'get_my_appointments':
                    return await this.handleGetAppointments(patient, functionArgs);

                case 'check_doctor_availability':
                    return await this.handleCheckAvailability(functionArgs, hospital);

                case 'book_appointment':
                    return await this.handleBookAppointment(patient, functionArgs, hospital);

                case 'reschedule_appointment':
                    return await this.handleReschedule(patient, functionArgs, appointment);

                case 'cancel_appointment':
                    return await this.handleCancel(patient, functionArgs, appointment);

                case 'prescription_refill':
                    return await this.handlePrescriptionRefill(patient, functionArgs);

                case 'update_patient_info':
                    return await this.handleUpdatePatientInfo(patient, functionArgs);

                case 'trigger_call_to_patient':
                    return await this.triggerCallToPatient(patient, hospital, functionArgs);

                case 'ask_communication_preference':
                    return await this.askCommunicationPreference(functionArgs);

                case 'confirm_appointment_attendance':
                    return await this.confirmAppointment(patient, functionArgs, appointment);

                default:
                    return {
                        shouldRespond: true,
                        message: "I'm here to help with your appointment. What would you like to do?",
                        action: 'unknown_function',
                        conversationEnded: false
                    };
            }

        } catch (error) {
            console.error('❌ Function error:', error);
            return {
                shouldRespond: true,
                message: "I encountered an error. Would you like me to call you? Reply CALL or TEXT",
                action: 'function_error',
                conversationEnded: false
            };
        }
    }

    /**
     * FUNCTION HANDLERS
     */

    async handleGetAppointments(patient, args) {
        try {
            const appointments = await findPatientAppointments({
                patient_phone: patient.phone,
                include_past: args.include_past,
                limit: args.limit || 5
            });

            if (!appointments || appointments.length === 0) {
                return {
                    shouldRespond: true,
                    message: "You don't have any upcoming appointments.",
                    action: 'no_appointments',
                    conversationEnded: false
                };
            }

            let message = `📅 Your appointments:\n\n`;
            appointments.forEach((apt, i) => {
                const date = new Date(apt.dateTime).toLocaleDateString();
                const time = new Date(apt.dateTime).toLocaleTimeString('en-US', {
                    hour: '2-digit', minute: '2-digit'
                });
                message += `${i + 1}. Dr. ${apt.doctor.name}\n   ${date} at ${time}\n   ${apt.reason}\n\n`;
            });

            return {
                shouldRespond: true,
                message: message.trim(),
                action: 'appointments_listed',
                conversationEnded: false
            };

        } catch (error) {
            console.error('Error getting appointments:', error);
            return {
                shouldRespond: true,
                message: "Error getting appointments. Would you like me to call you? Reply CALL",
                action: 'error',
                conversationEnded: false
            };
        }
    }

    async handleCheckAvailability(args, hospital) {
        try {
            const availability = await checkDoctorAvailability(
                args.doctor_name,
                args.date,
                args.specialty,
                hospital._id
            );

            if (availability.available) {
                const slots = availability.availableSlots?.slice(0, 3).join(', ') || 'various times';
                return {
                    shouldRespond: true,
                    message: `${args.doctor_name || 'that doctor'} is available on ${args.date}!\n\nAvailable: ${slots}\n\nWould you like to book?`,
                    action: 'doctor_available',
                    conversationEnded: false
                };
            }

            return {
                shouldRespond: true,
                message: `Not available on ${args.date}. Reply CALL for alternatives`,
                action: 'not_available',
                conversationEnded: false
            };

        } catch (error) {
            return {
                shouldRespond: true,
                message: "Error checking availability. Reply CALL",
                action: 'error',
                conversationEnded: false
            };
        }
    }

    async handleBookAppointment(patient, args, hospital) {
        try {
            const result = await bookAppointment({
                ...args,
                hospitalId: hospital._id
            });

            if (result.success) {
                return {
                    shouldRespond: true,
                    message: `Appointment booked!\n\n${args.date} at ${args.time}\nDr. ${args.doctor_name}\n\nYou'll receive a reminder!`,
                    action: 'appointment_booked',
                    conversationEnded: true
                };
            }

            return {
                shouldRespond: true,
                message: "Having trouble booking. Reply CALL for help",
                action: 'booking_failed',
                conversationEnded: false
            };

        } catch (error) {
            return {
                shouldRespond: true,
                message: "Error booking. Reply CALL",
                action: 'error',
                conversationEnded: false
            };
        }
    }

    async handleReschedule(patient, args, appointment) {
        try {
            const result = await rescheduleAppointmentByDetails(args);

            if (result.success && appointment) {
                // Update DB status
                await Appointment.findByIdAndUpdate(appointment._id, {
                    $set: {
                        status: 'rescheduled',
                        'reminders.24_hour.response': 'rescheduled',
                        lastStatusUpdate: new Date()
                    }
                });

                this.performanceStats.appointmentsRescheduled++;

                return {
                    shouldRespond: true,
                    message: `Appointment rescheduled!\n\nNew date: ${args.new_date}\nNew time: ${args.new_time}\n\nYou'll receive a reminder!`,
                    action: 'rescheduled',
                    conversationEnded: true
                };
            }

            return {
                shouldRespond: true,
                message: "Having trouble rescheduling. Reply CALL for help",
                action: 'reschedule_failed',
                conversationEnded: false
            };

        } catch (error) {
            return {
                shouldRespond: true,
                message: "Error rescheduling. Reply CALL",
                action: 'error',
                conversationEnded: false
            };
        }
    }

    async handleCancel(patient, args, appointment) {
        try {
            const result = await cancelAppointmentByDetails(args);

            if (result.success && appointment) {
                // Update DB status
                await Appointment.findByIdAndUpdate(appointment._id, {
                    $set: {
                        status: 'cancelled',
                        cancelledAt: new Date(),
                        cancelledVia: 'sms',
                        cancellationReason: args.reason || 'Patient requested',
                        'reminders.24_hour.response': 'cancelled',
                        lastStatusUpdate: new Date()
                    }
                });

                this.performanceStats.appointmentsCancelled++;

                return {
                    shouldRespond: true,
                    message: `Appointment cancelled.\n\nWe hope everything is okay. If you need to reschedule later, just let us know!`,
                    action: 'cancelled',
                    conversationEnded: true
                };
            }

            return {
                shouldRespond: true,
                message: "Having trouble cancelling. Reply CALL for help",
                action: 'cancel_failed',
                conversationEnded: false
            };

        } catch (error) {
            return {
                shouldRespond: true,
                message: "Error cancelling. Reply CALL",
                action: 'error',
                conversationEnded: false
            };
        }
    }

    async handlePrescriptionRefill(patient, args) {
        try {
            const result = await processPrescriptionRefill({
                ...args,
                patient_name: patient.name
            });

            if (result.success) {
                return {
                    shouldRespond: true,
                    message: `💊 Prescription refill requested!\n\nMedication: ${args.medication_name}\n\nOur pharmacy will process within 24-48 hours.`,
                    action: 'refill_requested',
                    conversationEnded: true
                };
            }

            return {
                shouldRespond: true,
                message: "Having trouble with refill. Reply CALL for help",
                action: 'refill_failed',
                conversationEnded: false
            };

        } catch (error) {
            return {
                shouldRespond: true,
                message: "Error processing refill. Reply CALL",
                action: 'error',
                conversationEnded: false
            };
        }
    }

    async handleUpdatePatientInfo(patient, args) {
        try {
            const updateData = {};
            if (args.name) updateData.name = args.name;
            if (args.age) updateData.age = args.age;
            if (args.gender) updateData.gender = args.gender;
            if (args.preferred_doctor) updateData.preferredDoctor = args.preferred_doctor;
            if (args.preferred_time) updateData.preferredTime = args.preferred_time;

            await Patient.findByIdAndUpdate(patient._id, { $set: updateData });

            return {
                shouldRespond: true,
                message: `Your information has been updated!`,
                action: 'info_updated',
                conversationEnded: true
            };

        } catch (error) {
            return {
                shouldRespond: true,
                message: "Error updating info. Reply CALL",
                action: 'error',
                conversationEnded: false
            };
        }
    }

    async triggerCallToPatient(patient, hospital, args) {
        try {
            const { reason, urgency = 'normal', call_type = 'appointment_management', context } = args;

            console.log(`📞 Triggering call to ${patient.phone}`);
            console.log(`📋 Reason: ${reason} | Type: ${call_type} | Urgency: ${urgency}`);

            const callParams = {
                phoneNumber: patient.phone,
                patientId: patient._id,
                hospitalId: hospital._id,
                reason: reason,
                callType: call_type,
                priority: urgency === 'urgent' ? 'high' : 'normal',
                escalationContext: {
                    escalatedFrom: 'messaging',
                    originalContext: context || reason,
                    timestamp: new Date(),
                    messageTriggered: true
                }
            };

            const callResult = await callService.makeOutboundCall(callParams);

            if (callResult.success) {
                this.performanceStats.callsTriggered++;

                const waitTime = urgency === 'urgent' ? 'immediately' : 'within 5-10 minutes';

                return {
                    shouldRespond: true,
                    message: `📞 ${urgency === 'urgent' ? 'Calling you RIGHT NOW!' : `Perfect! We'll call you ${waitTime}.`}\n\nPlease keep your phone nearby!`,
                    action: 'call_triggered',
                    conversationEnded: true,
                    callSid: callResult.call?.sid
                };
            }

            return {
                shouldRespond: true,
                message: `Having trouble calling. Please call us at ${hospital.phonenumber || process.env.HOSPITAL_MAIN_PHONE}`,
                action: 'call_failed',
                conversationEnded: true
            };

        } catch (error) {
            console.error('❌ Call trigger error:', error);
            return {
                shouldRespond: true,
                message: `Error setting up call. Please call us at ${hospital.phonenumber || process.env.HOSPITAL_MAIN_PHONE}`,
                action: 'call_error',
                conversationEnded: true
            };
        }
    }

    async askCommunicationPreference(args) {
        const { action, context } = args;

        const messages = {
            reschedule: "I can help you reschedule! 📅\n\nWould you like to:\n\n📱 TEXT - Reschedule via messages\n📞 CALL - I'll call you to reschedule\n\nReply TEXT or CALL",
            cancel: "I understand you need to cancel.\n\nWould you like to:\n\n📱 TEXT - Cancel via message\n📞 CALL - I'll call you\n\nReply TEXT or CALL"
        };

        return {
            shouldRespond: true,
            message: messages[action] || "Would you prefer TEXT or CALL? Reply TEXT or CALL",
            action: 'preference_asked',
            conversationEnded: false
        };
    }

    async confirmAppointment(patient, args, appointment) {
        try {
            if (appointment) {
                await Appointment.findByIdAndUpdate(appointment._id, {
                    $set: {
                        status: 'confirmed',
                        'reminders.24_hour.response': 'confirmed',
                        'reminders.24_hour.confirmedAt': new Date(),
                        lastStatusUpdate: new Date()
                    }
                });

                this.performanceStats.appointmentsConfirmed++;
            }

            return {
                shouldRespond: true,
                message: `Great! Your appointment is confirmed. We'll see you then!`,
                action: 'confirmed',
                conversationEnded: true
            };

        } catch (error) {
            return {
                shouldRespond: true,
                message: "Confirmed! See you at your appointment!",
                action: 'confirmed',
                conversationEnded: true
            };
        }
    }

    /**
  * Start message conversation (initiates reminder/follow-up)
  */
    async startMessageConversation(appointmentId, conversationType, method = 'sms') {
        try {
            const appointment = await Appointment.findById(appointmentId)
                .populate('patient')
                .populate('doctor')
                .populate('hospital');

            if (!appointment || !appointment.patient?.phone) {
                return { success: false, error: 'Invalid appointment or patient phone missing' };
            }

            const patient = appointment.patient;
            const hospital = appointment?.hospital;
            console.log(hospital)

            let message = '';

            // Appointment Reminder
            if (conversationType === 'appointment_reminder' || conversationType === '24_hour' || conversationType === '1_hour') {
                const timeUntil = conversationType === '1_hour' ? 'in 1 hour' : 'tomorrow';
                const date = appointment.dateTime.toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric'
                });
                const time = appointment.dateTime.toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true
                });

                const doctorSpecialty = appointment.doctor?.specialty ? ` (${appointment.doctor.specialty})` : '';
                const appointmentReason = appointment.reason || 'consultation';

                message = `Hi! 👋 This is a reminder from ${hospital?.name}

You have an appointment ${timeUntil}:

📅 Date: ${date}
🕐 Time: ${time}
👨‍⚕️ Doctor: ${appointment.doctor.name}${doctorSpecialty}
📋 Reason: ${appointmentReason}

Please reply:
- "CONFIRM" to confirm
- "RESCHEDULE" if you need to change the time
- "CANCEL" if you need to cancel
- "CALL" if you'd like us to call you

Thank you! 🏥`;

                this.performanceStats.remindersSent++;
            }
            // Follow-up
            else if (conversationType === 'follow_up') {
                const appointmentDate = appointment.dateTime.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric'
                });

                message = `Hi! 👋 This is a follow-up from ${hospital.name}

We hope you're feeling better after your visit with ${appointment.doctor.name} on ${appointmentDate}.

How are you feeling?

Please reply:
- "GOOD" - Feeling better
- "SAME" - No change
- "WORSE" - Not feeling well
- "CALL" - I'd like to speak with someone

We care about your recovery! 🏥`;

                this.performanceStats.followUpsSent++;
            }

            // Send message
            const result = await this.sendMessage(patient.phone, message, method);

            if (result.success) {
                // Mark conversation as ACTIVE
                this.activeConversations.set(patient.phone, {
                    appointmentId: appointmentId,
                    type: conversationType,
                    startedAt: Date.now()
                });

                console.log(`Conversation started for ${patient.phone} - Type: ${conversationType}`);

                // Save to DB
                await Message.create({
                    from: method === 'whatsapp' ? `whatsapp:${process.env.TWILIO_PHONE}` : process.env.TWILIO_PHONE,
                    to: patient.phone,
                    body: message,
                    direction: 'outbound',
                    status: 'sent',
                    messageSid: result.messageSid,
                    patient: patient._id,
                    method: method,
                    isReminderFollowup: true,
                    appointment: appointmentId,
                    conversationType: conversationType
                });

                // Update appointment
                const updateField = conversationType.includes('reminder') || conversationType.includes('hour')
                    ? `reminders.${conversationType === '1_hour' ? '1_hour' : '24_hour'}`
                    : 'followUp';

                await Appointment.findByIdAndUpdate(appointmentId, {
                    $set: {
                        [`${updateField}.sentAt`]: new Date(),
                        [`${updateField}.messageSid`]: result.messageSid,
                        [`${updateField}.status`]: 'sent',
                        [`${updateField}.method`]: method
                    }
                });

                console.log(`${conversationType} sent successfully`);
                return { success: true, messageSid: result.messageSid };
            }

            return { success: false, error: 'Failed to send message' };

        } catch (error) {
            console.error('❌ Error starting conversation:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Send message via Twilio Messages API
     */
    async sendMessage(to, message, method = 'sms') {
        try {
            if (!this.twilioClient) {
                throw new Error('Twilio not initialized');
            }

            const fromNumber = process.env.TWILIO_PHONE;
            const toNumber = method === 'whatsapp' ? `whatsapp:${to}` : to;
            const fromFormatted = method === 'whatsapp' ? `whatsapp:${fromNumber}` : fromNumber;

            const result = await this.twilioClient.messages.create({
                body: message,
                from: fromFormatted,
                to: toNumber
            });

            console.log(`${method.toUpperCase()} sent: ${result.sid}`);
            return { success: true, messageSid: result.sid };

        } catch (error) {
            console.error(`❌ Error sending ${method}:`, error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get conversation history for context
     */
    async getConversationHistory(patientId, limit = 5) {
        try {
            const messages = await Message.find({
                patient: patientId,
                isReminderFollowup: true
            })
                .sort({ createdAt: -1 })
                .limit(limit * 2);

            return messages.reverse().map(msg => ({
                role: msg.direction === 'inbound' ? 'user' : 'assistant',
                content: msg.body
            }));

        } catch (error) {
            console.error('Error getting history:', error);
            return [];
        }
    }

    /**
     * Get hospital
     */
    async getHospital() {
        try {
            let hospital = await Hospital.findOne();

            if (!hospital) {
                hospital = {
                    _id: 'default',
                    name: process.env.HOSPITAL_NAME || 'Our Medical Center',
                    phonenumber: process.env.HOSPITAL_MAIN_PHONE
                };
            }

            return hospital;
        } catch (error) {
            return {
                _id: 'default',
                name: 'Our Medical Center',
                phonenumber: process.env.HOSPITAL_MAIN_PHONE
            };
        }
    }

    /**
     * Update performance stats
     */
    updateStats(action) {
        switch (action) {
            case 'confirmed':
                this.performanceStats.appointmentsConfirmed++;
                break;
            case 'rescheduled':
                this.performanceStats.appointmentsRescheduled++;
                break;
            case 'cancelled':
                this.performanceStats.appointmentsCancelled++;
                break;
            case 'call_triggered':
                this.performanceStats.callsTriggered++;
                break;
        }
    }

    /**
     * Get performance stats (for API)
     */
    getPerformanceStats() {
        return {
            ...this.performanceStats,
            activeConversations: this.activeConversations.size,
            avgResponseTime: this.performanceStats.totalRequests > 0
                ? Math.round(this.performanceStats.responseTimeSum / this.performanceStats.totalRequests)
                : 0
        };
    }

    /**
     * Get conversations (for API)
     */
    async getConversations(query, limit) {
        try {
            return await Message.find(query)
                .sort({ createdAt: -1 })
                .limit(parseInt(limit));
        } catch (error) {
            return [];
        }
    }
}

// Export singleton
const messageService = new MessageService();
export default messageService;