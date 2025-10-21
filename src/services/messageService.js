// import twilio from "twilio";
// import Patient from "../models/Patient.js";
// import Appointment from "../models/Appointment.js";
// import Message from "../models/Message.js";
// import Hospital from "../models/Hospital.js";
// import { bookAppointment, findPatientAppointments, cancelAppointmentByDetails, rescheduleAppointmentByDetails } from "./appointment.js";
// import { checkDoctorAvailability } from "./doctors.js";
// import { processPrescriptionRefill } from './prescriptionRefill.js';
// import callService from './callService.js';
// import OpenAI from 'openai';
// import 'dotenv/config';

// class MessageService {
//     constructor() {
//         this.twilioClient = null;
//         this.openai = null;
//         this.initializeTwilio();
//         this.initializeOpenAI();

//         // Track active reminder/follow-up conversations
//         this.activeConversations = new Map();

//         // Cache WhatsApp availability (phone -> {hasWhatsApp: bool, checkedAt: timestamp})
//         this.whatsappCache = new Map();
//         this.CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

//         // Performance tracking
//         this.performanceStats = {
//             totalRequests: 0,
//             aiProcessed: 0,
//             remindersSent: 0,
//             followUpsSent: 0,
//             callsTriggered: 0,
//             appointmentsConfirmed: 0,
//             appointmentsRescheduled: 0,
//             appointmentsCancelled: 0,
//             whatsappSent: 0,
//             smsSent: 0,
//             errors: 0
//         };
//     }

//     initializeTwilio() {
//         if (process.env.TWILIO_SID && process.env.TWILIO_AUTH) {
//             this.twilioClient = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH);
//         } else {
//             console.error('Twilio credentials missing');
//         }
//     }

//     initializeOpenAI() {
//         if (process.env.OPENAI_API_KEY) {
//             this.openai = new OpenAI({
//                 apiKey: process.env.OPENAI_API_KEY,
//             });
//         } else {
//             console.error('OpenAI API key missing');
//         }
//     }

//     /**
//      * Check if a phone number has WhatsApp using Twilio Lookup API
//      */
//     async checkWhatsAppAvailability(phoneNumber) {
//         try {
//             // Clean the phone number
//             const cleanNumber = phoneNumber.replace('whatsapp:', '').replace('+', '').trim();
//             const formattedNumber = cleanNumber.startsWith('+') ? cleanNumber : `+${cleanNumber}`;

//             // Check cache first
//             const cached = this.whatsappCache.get(formattedNumber);
//             if (cached && (Date.now() - cached.checkedAt) < this.CACHE_TTL) {
//                 console.log(`📱 WhatsApp status (cached): ${formattedNumber} - ${cached.hasWhatsApp ? 'Available' : 'Not available'}`);
//                 return cached.hasWhatsApp;
//             }

//             if (!this.twilioClient) {
//                 console.log('⚠️ Twilio client not initialized, defaulting to SMS');
//                 return false;
//             }

//             console.log(`🔍 Checking WhatsApp availability for: ${formattedNumber}`);

//             // Use Twilio Lookup API v2 to check WhatsApp
//             const lookupResult = await this.twilioClient.lookups.v2
//                 .phoneNumbers(formattedNumber)
//                 .fetch({ fields: 'line_type_intelligence' });

//             // Check if the number has WhatsApp
//             // Note: This requires Twilio Lookup v2 with proper add-ons
//             const hasWhatsApp = lookupResult.lineTypeIntelligence?.carrier_name?.toLowerCase().includes('whatsapp') ||
//                 false; // Conservative default

//             // Alternative: Try sending a test WhatsApp message (if you have WhatsApp Business API)
//             // This is more reliable but costs a message credit
//             const whatsappAvailable = await this.verifyWhatsAppByTest(formattedNumber);

//             // Cache the result
//             this.whatsappCache.set(formattedNumber, {
//                 hasWhatsApp: whatsappAvailable,
//                 checkedAt: Date.now()
//             });

//             console.log(`✅ WhatsApp check complete: ${formattedNumber} - ${whatsappAvailable ? 'Available' : 'Not available'}`);
//             return whatsappAvailable;

//         } catch (error) {
//             console.error('❌ Error checking WhatsApp availability:', error.message);
//             // Default to SMS on error
//             return false;
//         }
//     }

//     /**
//      * Verify WhatsApp by attempting to send a test message
//      * (More reliable but costs a message credit)
//      */
//     async verifyWhatsAppByTest(phoneNumber) {
//         try {
//             // This is a conservative approach - we won't actually send
//             // Instead, we'll check if WhatsApp sandbox or production is configured

//             // For production: Check if number is registered with WhatsApp Business API
//             // For sandbox: Assume WhatsApp is available for testing

//             // Simple heuristic: If patient has received WhatsApp before, they have it
//             const patient = await Patient.findOne({ phone: phoneNumber });
//             if (patient?.communicationPreferences?.whatsappAvailable !== undefined) {
//                 return patient.communicationPreferences.whatsappAvailable;
//             }

//             // Check recent messages to see if they came from WhatsApp
//             const recentWhatsAppMessage = await Message.findOne({
//                 'messages.from': new RegExp(`whatsapp:.*${phoneNumber.replace('+', '')}`)
//             });

//             return !!recentWhatsAppMessage;

//         } catch (error) {
//             console.error('Error verifying WhatsApp:', error);
//             return false;
//         }
//     }

//     /**
//      * Automatically determine the best communication method
//      */
//     async determineBestMethod(phoneNumber, patientId = null) {
//         try {
//             // First check patient preferences
//             if (patientId) {
//                 const patient = await Patient.findById(patientId);
//                 if (patient?.communicationPreferences?.preferredMethod) {
//                     const preferred = patient.communicationPreferences.preferredMethod;

//                     // If they prefer WhatsApp, verify it's still available
//                     if (preferred === 'whatsapp') {
//                         const hasWhatsApp = await this.checkWhatsAppAvailability(phoneNumber);
//                         if (hasWhatsApp) {
//                             console.log(`📱 Using preferred method: WhatsApp`);
//                             return 'whatsapp';
//                         }
//                         console.log(`📱 WhatsApp preferred but not available, falling back to SMS`);
//                     }

//                     // Otherwise use their preference
//                     console.log(`📱 Using preferred method: ${preferred}`);
//                     return preferred;
//                 }
//             }

//             // Check if WhatsApp is available
//             const hasWhatsApp = await this.checkWhatsAppAvailability(phoneNumber);
//             const method = hasWhatsApp ? 'whatsapp' : 'sms';

//             // Update patient record if we found WhatsApp
//             if (patientId && hasWhatsApp) {
//                 await Patient.findByIdAndUpdate(patientId, {
//                     $set: {
//                         'communicationPreferences.whatsappAvailable': true,
//                         'communicationPreferences.lastWhatsAppCheck': new Date()
//                     }
//                 });
//             }

//             console.log(`📱 Auto-selected method: ${method.toUpperCase()}`);
//             return method;

//         } catch (error) {
//             console.error('Error determining best method:', error);
//             return 'sms'; // Safe fallback
//         }
//     }

//     /**
//      * Send message with automatic WhatsApp/SMS selection
//      */
//     async sendMessageAuto(to, message, patientId = null) {
//         try {
//             // Determine the best method
//             const method = await this.determineBestMethod(to, patientId);

//             // Send using the selected method
//             const result = await this.sendMessage(to, message, method);

//             // If WhatsApp fails, automatically retry with SMS
//             if (!result.success && method === 'whatsapp') {
//                 console.log('⚠️ WhatsApp failed, retrying with SMS...');

//                 // Update cache to indicate WhatsApp not available
//                 const cleanNumber = to.replace('whatsapp:', '').replace('+', '').trim();
//                 const formattedNumber = cleanNumber.startsWith('+') ? cleanNumber : `+${cleanNumber}`;
//                 this.whatsappCache.set(formattedNumber, {
//                     hasWhatsApp: false,
//                     checkedAt: Date.now()
//                 });

//                 // Update patient record
//                 if (patientId) {
//                     await Patient.findByIdAndUpdate(patientId, {
//                         $set: { 'communicationPreferences.whatsappAvailable': false }
//                     });
//                 }

//                 // Retry with SMS
//                 return await this.sendMessage(to, message, 'sms');
//             }

//             return result;

//         } catch (error) {
//             console.error('Error in sendMessageAuto:', error);
//             return { success: false, error: error.message };
//         }
//     }

//     /**
//      * Send message via Twilio Messages API
//      */
//     async sendMessage(to, message, method = 'sms') {
//         try {
//             if (!this.twilioClient) {
//                 throw new Error('Twilio not initialized');
//             }

//             const fromNumber = process.env.TWILIO_PHONE;
//             const cleanTo = to.replace('whatsapp:', '').trim();
//             const toNumber = method === 'whatsapp' ? `whatsapp:${cleanTo}` : cleanTo;
//             const fromFormatted = method === 'whatsapp' ? `whatsapp:${fromNumber}` : fromNumber;

//             const result = await this.twilioClient.messages.create({
//                 body: message,
//                 from: fromFormatted,
//                 to: toNumber
//             });

//             // Update stats
//             if (method === 'whatsapp') {
//                 this.performanceStats.whatsappSent++;
//             } else {
//                 this.performanceStats.smsSent++;
//             }

//             console.log(`✅ ${method.toUpperCase()} sent: ${result.sid}`);
//             return { success: true, messageSid: result.sid, method: method };

//         } catch (error) {
//             console.error(`❌ Error sending ${method}:`, error);
//             return { success: false, error: error.message, method: method };
//         }
//     }

//     async isReminderFollowupConversation(phoneNumber) {
//         try {
//             if (this.activeConversations.has(phoneNumber)) {
//                 const conversation = this.activeConversations.get(phoneNumber);
//                 const hoursSinceStart = (Date.now() - conversation.startedAt) / (1000 * 60 * 60);
//                 if (hoursSinceStart < 24) {
//                     console.log(`Active ${conversation.type} conversation for ${phoneNumber}`);
//                     return true;
//                 } else {
//                     this.activeConversations.delete(phoneNumber);
//                 }
//             }

//             const patient = await Patient.findOne({ phone: phoneNumber });
//             if (!patient) return false;

//             const today = new Date();
//             today.setHours(0, 0, 0, 0);

//             const recentConversation = await Message.findOne({
//                 patient: patient._id,
//                 isReminderFollowup: true,
//                 conversationDate: today,
//                 conversationStatus: 'active'
//             });

//             if (recentConversation) {
//                 console.log(`Recent reminder/follow-up found in DB for ${phoneNumber}`);
//                 this.activeConversations.set(phoneNumber, {
//                     appointmentId: recentConversation.appointment,
//                     type: recentConversation.conversationType || 'reminder',
//                     startedAt: recentConversation.createdAt.getTime()
//                 });
//                 return true;
//             }

//             console.log(`ℹ️ No active conversation for ${phoneNumber}`);
//             return false;
//         } catch (error) {
//             console.error('Error checking conversation:', error);
//             return false;
//         }
//     }

//     async processIncomingMessage(req) {
//         const startTime = Date.now();
//         this.performanceStats.totalRequests++;

//         try {
//             const { From, To, Body, MessageSid, ConversationSid } = req.body;

//             if (!From || !Body) {
//                 console.log('Missing From or Body in request');
//                 return { success: false, error: 'Missing required fields' };
//             }

//             const isWhatsApp = From.startsWith('whatsapp:');
//             const cleanFrom = From.replace('whatsapp:', '');
//             const cleanTo = To ? To.replace('whatsapp:', '') : (process.env.TWILIO_PHONE || '');
//             const message = Body.trim();

//             console.log(`\n🤖 Processing ${isWhatsApp ? 'WhatsApp' : 'SMS'} from ${cleanFrom}`);
//             console.log(`💬 Message: "${message}"`);

//             let patient = await Patient.findOne({ phone: cleanFrom });
//             if (!patient) {
//                 patient = new Patient({
//                     phone: cleanFrom,
//                     communicationPreferences: {
//                         preferredMethod: isWhatsApp ? 'whatsapp' : 'sms'
//                     }
//                 });
//                 await patient.save();
//             }

//             const hospital = await this.getHospital();

//             let conversationMeta = this.activeConversations.get(cleanFrom);
//             if (!conversationMeta) {
//                 conversationMeta = this.activeConversations.get(patient.phone);
//             }

//             let appointmentId = conversationMeta?.appointmentId;

//             if (!appointmentId) {
//                 console.log('No active conversation found, checking database...');
//                 const today = new Date();
//                 today.setHours(0, 0, 0, 0);

//                 const todayConversation = await Message.findOne({
//                     patient: patient._id,
//                     isReminderFollowup: true,
//                     conversationDate: today,
//                     appointment: { $exists: true, $ne: null }
//                 }).sort({ lastMessageAt: -1 });

//                 if (todayConversation && todayConversation.appointment) {
//                     appointmentId = todayConversation.appointment;
//                     this.activeConversations.set(cleanFrom, {
//                         appointmentId: appointmentId,
//                         type: todayConversation.conversationType || 'reminder',
//                         startedAt: todayConversation.createdAt.getTime(),
//                         flowType: todayConversation.metadata?.flowType
//                     });
//                     this.activeConversations.set(patient.phone, {
//                         appointmentId: appointmentId,
//                         type: todayConversation.conversationType || 'reminder',
//                         startedAt: todayConversation.createdAt.getTime(),
//                         flowType: todayConversation.metadata?.flowType
//                     });
//                     console.log(`Restored conversation from DB for appointment: ${appointmentId}`);
//                 } else {
//                     console.log('No recent appointment found in DB');
//                 }
//             }

//             console.log(`Appointment ID: ${appointmentId || 'NONE'}`);

//             const conversation = await Message.findOrCreateTodayConversation(patient._id, {
//                 method: isWhatsApp ? 'whatsapp' : 'sms',
//                 isReminderFollowup: true,
//                 appointment: appointmentId,
//                 conversationType: conversationMeta?.type,
//                 conversationSid: ConversationSid,
//                 hospital: hospital._id
//             });

//             await conversation.addMessage({
//                 from: cleanFrom,
//                 to: cleanTo,
//                 body: message,
//                 direction: 'inbound',
//                 messageSid: MessageSid,
//                 status: 'received'
//             });

//             const aiResponse = await this.getAIResponse(
//                 message,
//                 patient,
//                 hospital,
//                 appointmentId
//             );

//             // Track flow state after showing availability
//             if (aiResponse.action === 'doctor_available') {
//                 const currentFlow = this.activeConversations.get(cleanFrom) || {};
//                 if (!currentFlow.flowType || currentFlow.flowType !== 'reschedule') {
//                     this.activeConversations.set(cleanFrom, {
//                         ...currentFlow,
//                         flowType: 'booking',
//                         flowStartedAt: Date.now()
//                     });
//                     this.activeConversations.set(patient.phone, {
//                         ...currentFlow,
//                         flowType: 'booking',
//                         flowStartedAt: Date.now()
//                     });
//                 }
//             }

//             if (aiResponse.shouldRespond) {
//                 const result = await this.sendMessage(
//                     cleanFrom,
//                     aiResponse.message,
//                     isWhatsApp ? 'whatsapp' : 'sms'
//                 );

//                 await conversation.addMessage({
//                     from: cleanTo,
//                     to: cleanFrom,
//                     body: aiResponse.message,
//                     direction: 'outbound',
//                     messageSid: result.messageSid,
//                     status: 'sent'
//                 });
//             }

//             this.updateStats(aiResponse.action);

//             if (aiResponse.conversationEnded) {
//                 await conversation.complete();
//                 this.activeConversations.delete(cleanFrom);
//                 this.activeConversations.delete(patient.phone);
//                 console.log(`Conversation ended for ${cleanFrom}`);
//             }

//             this.performanceStats.aiProcessed++;
//             console.log(`Processed in ${Date.now() - startTime}ms - Action: ${aiResponse.action}\n`);

//             return {
//                 success: true,
//                 action: aiResponse.action,
//                 responseTime: Date.now() - startTime,
//                 appointmentId: appointmentId
//             };

//         } catch (error) {
//             console.error('Error processing message:', error);
//             this.performanceStats.errors++;
//             return { success: false, error: error.message };
//         }
//     }

//     async getAIResponse(message, patient, hospital, appointmentId) {
//         try {
//             if (!this.openai) {
//                 throw new Error('OpenAI not initialized');
//             }

//             const appointment = appointmentId ?
//                 await Appointment.findById(appointmentId).populate('doctor') :
//                 null;

//             const systemMessage = this.buildSystemMessage(patient, hospital, appointment);
//             const history = await Message.getConversationHistory(patient._id, 5);

//             const messages = [
//                 { role: "system", content: systemMessage },
//                 ...history,
//                 { role: "user", content: message }
//             ];

//             console.log('Calling OpenAI GPT-4o-mini...');

//             const completion = await this.openai.chat.completions.create({
//                 model: "gpt-4o-mini",
//                 messages: messages,
//                 tools: this.getAllFunctionTools(),
//                 tool_choice: "auto",
//                 temperature: 0.7,
//                 max_tokens: 1000
//             });

//             const assistantMessage = completion.choices[0].message;

//             if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
//                 console.log(`AI calling ${assistantMessage.tool_calls.length} function(s)`);
//                 return await this.handleFunctionCalls(
//                     assistantMessage,
//                     patient,
//                     hospital,
//                     appointment
//                 );
//             }

//             if (assistantMessage.content) {
//                 return {
//                     shouldRespond: true,
//                     message: assistantMessage.content,
//                     action: 'ai_text_response',
//                     conversationEnded: false
//                 };
//             }

//             throw new Error('No response from OpenAI');

//         } catch (error) {
//             console.error('OpenAI error:', error.message);
//             return {
//                 shouldRespond: true,
//                 message: "I'm having trouble processing your message. Our team will call you shortly.",
//                 action: 'error',
//                 conversationEnded: true
//             };
//         }
//     }

//     buildSystemMessage(patient, hospital, appointment) {
//         const hospitalName = hospital.name || 'Our Medical Center';
//         const patientName = patient?.name || 'the patient';

//         const today = new Date();
//         const todayFormatted = today.toISOString().split('T')[0];
//         const todayReadable = today.toLocaleDateString('en-US', {
//             weekday: 'long',
//             month: 'long',
//             day: 'numeric',
//             year: 'numeric'
//         });

//         const conversationState = this.activeConversations.get(patient.phone);
//         const flowType = conversationState?.flowType;
//         const isInFlow = conversationState?.flowStartedAt &&
//             (Date.now() - conversationState.flowStartedAt) < 10 * 60 * 1000;

//         let flowContext = '';
//         if (isInFlow && flowType === 'reschedule') {
//             flowContext = `\n\nCURRENT FLOW: RESCHEDULE
// The patient is rescheduling their existing appointment. When they pick a date/time, use reschedule_appointment function.`;
//         } else if (isInFlow && flowType === 'booking') {
//             flowContext = `\n\nCURRENT FLOW: NEW BOOKING
// The patient is booking a new appointment. When they pick a date/time, use book_appointment function.`;
//         }

//         let appointmentInfo = '';
//         if (appointment) {
//             const date = appointment.dateTime.toLocaleDateString();
//             const time = appointment.dateTime.toLocaleTimeString('en-US', {
//                 hour: '2-digit',
//                 minute: '2-digit'
//             });
//             appointmentInfo = `
// APPOINTMENT DETAILS:
// - Doctor: Dr. ${appointment.doctor?.name || 'TBD'}
// - Date: ${date}
// - Time: ${time}
// - Status: ${appointment.status}`;
//         }

//         return `You are an AI assistant for ${hospitalName}, helping ${patientName} via text message about their appointment.

// CURRENT DATE: ${todayReadable} (${todayFormatted})

// PATIENT: ${patientName} (${patient.phone})
// HOSPITAL: ${hospitalName}${appointmentInfo}${flowContext}

// CRITICAL CONVERSATION FLOW:

// 1. If patient wants to CONFIRM existing appointment:
//    → Patient may say "YES", "CONFIRM", "OK"
//    → Use confirm_appointment_attendance function

// 2. If patient says "reschedule", "change appointment", "move my appointment":
//    → FIRST use ask_communication_preference function with action="reschedule"
//    → After they choose TEXT, they may ask for available dates
//    → Show them available slots using check_doctor_availability
//    → When they pick a slot, use reschedule_appointment function

// 3. If patient asks "which dates available" or "when can I see doctor" (WITHOUT mentioning reschedule):
//    → They want to book NEW appointment
//    → Show them available slots using check_doctor_availability
//    → When they pick a slot, use book_appointment function

// 4. If patient wants to CANCEL their appointment:
//    → Patient may say "NO", "CANCEL IT", "cancel appointment"
//    → FIRST use ask_communication_preference function with action="cancel"
//    → If they reply "TEXT": Use cancel_appointment function
//    → If they reply "CALL": Use trigger_call_to_patient function

// 5. If patient says "call me", "I want to talk", "phone me":
//    → Use trigger_call_to_patient function IMMEDIATELY

// DECISION LOGIC FOR DATE/TIME SELECTION:
// - If in RESCHEDULE flow → use reschedule_appointment
// - If in BOOKING flow → use book_appointment
// - If unclear → use book_appointment (default to booking new)

// IMPORTANT RULES:
// - NEVER ask the same preference question twice in a row
// - If patient says "TEXT" or "CALL" as a standalone message, they're answering your preference question
// - After they choose TEXT for reschedule, show them available dates immediately
// - When checking availability, ALWAYS use ${todayFormatted} as the starting date
// - NEVER check dates in the past
// - Be concise (text message format)

// IMPORTANT: NEVER tell users to reply with just the word "CANCEL" - Twilio will unsubscribe them!

// Remember: Track the conversation flow to know whether to book or reschedule!`;
//     }

//     getAllFunctionTools() {
//         return [
//             {
//                 type: "function",
//                 function: {
//                     name: "get_my_appointments",
//                     description: "Show patient their appointments",
//                     parameters: {
//                         type: "object",
//                         properties: {
//                             include_past: { type: "boolean", default: false },
//                             limit: { type: "number", default: 5 }
//                         }
//                     }
//                 }
//             },
//             {
//                 type: "function",
//                 function: {
//                     name: "check_doctor_availability",
//                     description: "Check doctor availability. Use TODAY'S date when patient asks 'which dates available'. NEVER use past dates.",
//                     parameters: {
//                         type: "object",
//                         properties: {
//                             doctor_name: { type: "string" },
//                             date: {
//                                 type: "string",
//                                 description: "Date in YYYY-MM-DD format. Use CURRENT DATE from system message for general availability."
//                             },
//                             specialty: { type: "string" }
//                         },
//                         required: ["date"]
//                     }
//                 }
//             },
//             {
//                 type: "function",
//                 function: {
//                     name: "book_appointment",
//                     description: "Book new appointment. Use when patient selects a slot from shown availability in BOOKING flow.",
//                     parameters: {
//                         type: "object",
//                         properties: {
//                             patient_name: { type: "string" },
//                             patient_phone: { type: "string" },
//                             doctor_name: { type: "string" },
//                             date: { type: "string", description: "YYYY-MM-DD" },
//                             time: { type: "string", description: "HH:MM" },
//                             reason: { type: "string" }
//                         },
//                         required: ["doctor_name", "date", "time", "reason"]
//                     }
//                 }
//             },
//             {
//                 type: "function",
//                 function: {
//                     name: "reschedule_appointment",
//                     description: "Reschedule appointment. Use ONLY in RESCHEDULE flow when patient chose TEXT.",
//                     parameters: {
//                         type: "object",
//                         properties: {
//                             patient_name: { type: "string" },
//                             patient_phone: { type: "string" },
//                             old_date: { type: "string", description: "Current appointment date YYYY-MM-DD" },
//                             new_date: { type: "string", description: "New appointment date YYYY-MM-DD" },
//                             new_time: { type: "string", description: "New time HH:MM" }
//                         },
//                         required: ["patient_phone", "old_date", "new_date", "new_time"]
//                     }
//                 }
//             },
//             {
//                 type: "function",
//                 function: {
//                     name: "cancel_appointment",
//                     description: "Cancel appointment via text. Use ONLY if patient explicitly chose TEXT communication.",
//                     parameters: {
//                         type: "object",
//                         properties: {
//                             patient_name: { type: "string" },
//                             patient_phone: { type: "string" },
//                             appointment_date: { type: "string", description: "YYYY-MM-DD" },
//                             reason: { type: "string" }
//                         },
//                         required: ["patient_phone", "appointment_date"]
//                     }
//                 }
//             },
//             {
//                 type: "function",
//                 function: {
//                     name: "prescription_refill",
//                     description: "Request prescription refill",
//                     parameters: {
//                         type: "object",
//                         properties: {
//                             medication_name: { type: "string" },
//                             patient_name: { type: "string" },
//                             patient_phone: { type: "string" },
//                             pharmacy_name: { type: "string" }
//                         },
//                         required: ["medication_name", "patient_phone"]
//                     }
//                 }
//             },
//             {
//                 type: "function",
//                 function: {
//                     name: "update_patient_info",
//                     description: "Update patient information",
//                     parameters: {
//                         type: "object",
//                         properties: {
//                             name: { type: "string" },
//                             age: { type: "number" },
//                             gender: { type: "string", enum: ["male", "female", "other"] },
//                             preferred_doctor: { type: "string" },
//                             preferred_time: { type: "string" }
//                         }
//                     }
//                 }
//             },
//             {
//                 type: "function",
//                 function: {
//                     name: "trigger_call_to_patient",
//                     description: "Trigger AI phone call to patient.",
//                     parameters: {
//                         type: "object",
//                         properties: {
//                             reason: {
//                                 type: "string",
//                                 description: "Reason for call"
//                             },
//                             urgency: {
//                                 type: "string",
//                                 enum: ["urgent", "normal"],
//                                 default: "normal"
//                             },
//                             call_type: {
//                                 type: "string",
//                                 enum: ["appointment_management", "prescription_refill", "general_inquiry", "follow_up"],
//                                 default: "appointment_management"
//                             },
//                             context: {
//                                 type: "string"
//                             }
//                         },
//                         required: ["reason", "call_type"]
//                     }
//                 }
//             },
//             {
//                 type: "function",
//                 function: {
//                     name: "ask_communication_preference",
//                     description: "Ask patient if they prefer TEXT or CALL. MUST use BEFORE rescheduling or canceling.",
//                     parameters: {
//                         type: "object",
//                         properties: {
//                             action: {
//                                 type: "string",
//                                 enum: ["reschedule", "cancel"]
//                             },
//                             context: { type: "string" }
//                         },
//                         required: ["action"]
//                     }
//                 }
//             },
//             {
//                 type: "function",
//                 function: {
//                     name: "confirm_appointment_attendance",
//                     description: "Confirm patient will attend their appointment",
//                     parameters: {
//                         type: "object",
//                         properties: {
//                             appointment_date: { type: "string", description: "YYYY-MM-DD" },
//                             patient_phone: { type: "string" },
//                             confirmation_note: { type: "string" }
//                         },
//                         required: ["appointment_date", "patient_phone"]
//                     }
//                 }
//             }
//         ];
//     }

//     async handleFunctionCalls(assistantMessage, patient, hospital, appointment) {
//         try {
//             const toolCall = assistantMessage.tool_calls[0];
//             const functionName = toolCall.function.name;
//             const functionArgs = JSON.parse(toolCall.function.arguments);

//             console.log(`Executing: ${functionName}`);
//             console.log(`Args:`, JSON.stringify(functionArgs, null, 2));

//             if (!functionArgs.patient_phone) functionArgs.patient_phone = patient.phone;
//             if (!functionArgs.patient_name && patient.name) functionArgs.patient_name = patient.name;

//             switch (functionName) {
//                 case 'get_my_appointments':
//                     return await this.handleGetAppointments(patient, functionArgs);
//                 case 'check_doctor_availability':
//                     return await this.handleCheckAvailability(functionArgs, hospital);
//                 case 'book_appointment':
//                     return await this.handleBookAppointment(patient, functionArgs, hospital);
//                 case 'reschedule_appointment':
//                     return await this.handleReschedule(patient, functionArgs, appointment);
//                 case 'cancel_appointment':
//                     return await this.handleCancel(patient, functionArgs, appointment);
//                 case 'prescription_refill':
//                     return await this.handlePrescriptionRefill(patient, functionArgs);
//                 case 'update_patient_info':
//                     return await this.handleUpdatePatientInfo(patient, functionArgs);
//                 case 'trigger_call_to_patient':
//                     return await this.triggerCallToPatient(patient, hospital, functionArgs);
//                 case 'ask_communication_preference':
//                     const result = await this.askCommunicationPreference(functionArgs, patient);
//                     // Set flow type
//                     if (result.flowType) {
//                         const currentConv = this.activeConversations.get(patient.phone) || {};
//                         this.activeConversations.set(patient.phone, {
//                             ...currentConv,
//                             flowType: result.flowType,
//                             flowStartedAt: Date.now()
//                         });
//                         const cleanPhone = patient.phone.replace('whatsapp:', '').replace('+', '');
//                         this.activeConversations.set(cleanPhone, {
//                             ...currentConv,
//                             flowType: result.flowType,
//                             flowStartedAt: Date.now()
//                         });
//                     }
//                     return result;
//                 case 'confirm_appointment_attendance':
//                     return await this.confirmAppointment(patient, functionArgs, appointment);
//                 default:
//                     return {
//                         shouldRespond: true,
//                         message: "I'm here to help with your appointment. What would you like to do?",
//                         action: 'unknown_function',
//                         conversationEnded: false
//                     };
//             }

//         } catch (error) {
//             console.error('Function error:', error);
//             return {
//                 shouldRespond: true,
//                 message: "I encountered an error. Would you like me to call you? Reply CALL or TEXT",
//                 action: 'function_error',
//                 conversationEnded: false
//             };
//         }
//     }

//     /**
//      * FUNCTION HANDLERS
//      */

//     async handleGetAppointments(patient, args) {
//         try {
//             const appointments = await findPatientAppointments({
//                 patient_phone: patient.phone,
//                 include_past: args.include_past,
//                 limit: args.limit || 5
//             });

//             if (!appointments || appointments.length === 0) {
//                 return {
//                     shouldRespond: true,
//                     message: "You don't have any upcoming appointments.",
//                     action: 'no_appointments',
//                     conversationEnded: false
//                 };
//             }

//             let message = `Your appointments:\n\n`;
//             appointments.forEach((apt, i) => {
//                 const date = new Date(apt.dateTime).toLocaleDateString();
//                 const time = new Date(apt.dateTime).toLocaleTimeString('en-US', {
//                     hour: '2-digit', minute: '2-digit'
//                 });
//                 message += `${i + 1}. Dr. ${apt.doctor.name}\n   ${date} at ${time}\n   ${apt.reason}\n\n`;
//             });

//             return {
//                 shouldRespond: true,
//                 message: message.trim(),
//                 action: 'appointments_listed',
//                 conversationEnded: false
//             };

//         } catch (error) {
//             console.error('Error getting appointments:', error);
//             return {
//                 shouldRespond: true,
//                 message: "Error getting appointments. Would you like me to call you? Reply CALL",
//                 action: 'error',
//                 conversationEnded: false
//             };
//         }
//     }

//     async handleCheckAvailability(args, hospital) {
//         try {
//             const requestedDate = new Date(args.date);
//             const today = new Date();
//             today.setHours(0, 0, 0, 0);

//             // Check if date is in the past
//             if (requestedDate < today) {
//                 return {
//                     shouldRespond: true,
//                     message: `That date has already passed. Please provide a future date.`,
//                     action: 'invalid_date',
//                     conversationEnded: false
//                 };
//             }

//             const availability = await checkDoctorAvailability(
//                 args.doctor_name,
//                 args.date,
//                 args.specialty,
//                 hospital._id
//             );

//             // Handle the results array structure
//             if (availability.results && availability.results.length > 0) {
//                 let availableDoctors = availability.results.filter(doc => doc.available && doc.slots && doc.slots.length > 0);

//                 // Filter to only the requested doctor if specified
//                 if (args.doctor_name) {
//                     availableDoctors = availableDoctors.filter(doc =>
//                         doc.doctor_name.toLowerCase().includes(args.doctor_name.toLowerCase()) ||
//                         args.doctor_name.toLowerCase().includes(doc.doctor_name.toLowerCase())
//                     );
//                 }

//                 if (availableDoctors.length === 0) {
//                     const doctorText = args.doctor_name ? `${args.doctor_name}` : 'doctors';
//                     return {
//                         shouldRespond: true,
//                         message: `${doctorText} is not available soon. Reply CALL to find alternative dates or doctors.`,
//                         action: 'not_available',
//                         conversationEnded: false
//                     };
//                 }

//                 const doc = availableDoctors[0];

//                 // Filter slots: only FUTURE dates and status 'available'
//                 const now = new Date();
//                 const futureAvailableSlots = doc.slots.filter(slot => {
//                     const slotDate = new Date(slot.date);
//                     slotDate.setHours(0, 0, 0, 0);
//                     return slotDate >= today && slot.status === 'available';
//                 });

//                 if (futureAvailableSlots.length === 0) {
//                     return {
//                         shouldRespond: true,
//                         message: `${doc.doctor_name} has no upcoming available slots. Reply CALL to discuss alternatives.`,
//                         action: 'not_available',
//                         conversationEnded: false
//                     };
//                 }

//                 // Build response showing available slots
//                 let message = `${doc.doctor_name} (${doc.specialty}) availability:\n\n`;

//                 // Show up to 8 future available slots
//                 const slotsToShow = futureAvailableSlots.slice(0, 8);
//                 const formattedSlots = slotsToShow.map(slot => {
//                     const slotDate = new Date(slot.date);
//                     const dateStr = slotDate.toLocaleDateString('en-US', {
//                         month: 'short',
//                         day: 'numeric'
//                     });

//                     // Convert 24hr time to 12hr format
//                     const [hours, minutes] = slot.time.split(':');
//                     const hour = parseInt(hours);
//                     const ampm = hour >= 12 ? 'PM' : 'AM';
//                     const hour12 = hour % 12 || 12;
//                     const timeStr = `${hour12}:${minutes} ${ampm}`;

//                     return `- ${dateStr} at ${timeStr}`;
//                 });

//                 message += formattedSlots.join('\n');

//                 if (futureAvailableSlots.length > 8) {
//                     message += `\n\n+${futureAvailableSlots.length - 8} more slots available`;
//                 }

//                 message += `\n\nReply with your preferred date and time to book, or CALL for help.`;

//                 return {
//                     shouldRespond: true,
//                     message: message,
//                     action: 'doctor_available',
//                     conversationEnded: false
//                 };
//             }

//             // Fallback if no results
//             return {
//                 shouldRespond: true,
//                 message: `No availability found. Reply CALL to speak with us.`,
//                 action: 'not_available',
//                 conversationEnded: false
//             };

//         } catch (error) {
//             console.error('Error checking availability:', error);
//             return {
//                 shouldRespond: true,
//                 message: "Error checking availability. Reply CALL for help.",
//                 action: 'error',
//                 conversationEnded: false
//             };
//         }
//     }

//     async handleBookAppointment(patient, args, hospital) {
//         try {
//             const result = await bookAppointment({
//                 ...args,
//                 hospitalId: hospital._id
//             });

//             if (result.success) {
//                 return {
//                     shouldRespond: true,
//                     message: `Appointment booked!\n\n${args.date} at ${args.time}\nDr. ${args.doctor_name}\n\nYou'll receive a reminder!`,
//                     action: 'appointment_booked',
//                     conversationEnded: true
//                 };
//             }

//             return {
//                 shouldRespond: true,
//                 message: "Having trouble booking. Reply CALL for help",
//                 action: 'booking_failed',
//                 conversationEnded: false
//             };

//         } catch (error) {
//             return {
//                 shouldRespond: true,
//                 message: "Error booking. Reply CALL",
//                 action: 'error',
//                 conversationEnded: false
//             };
//         }
//     }

//     async handleReschedule(patient, args, appointment) {
//         try {
//             let actualAppointment = appointment;

//             if (!actualAppointment || !actualAppointment.doctor) {
//                 // Try to find from active conversations
//                 const conversationMeta = this.activeConversations.get(patient.phone);
//                 if (conversationMeta?.appointmentId) {
//                     actualAppointment = await Appointment.findById(conversationMeta.appointmentId)
//                         .populate('doctor');
//                 }
//             }

//             // If still no appointment, search by patient
//             if (!actualAppointment) {
//                 actualAppointment = await Appointment.findOne({
//                     patient: patient._id,
//                     status: { $in: ['scheduled', 'initiated', 'confirmed'] },
//                     dateTime: { $gte: new Date() } // Future appointments only
//                 })
//                     .populate('doctor')
//                     .sort({ dateTime: 1 }); // Get nearest future appointment
//             }

//             if (!actualAppointment) {
//                 return {
//                     shouldRespond: true,
//                     message: "Couldn't find your appointment to reschedule. Reply CALL for help.",
//                     action: 'appointment_not_found',
//                     conversationEnded: false
//                 };
//             }

//             // Extract ACTUAL appointment details
//             const aptDate = new Date(actualAppointment.dateTime);
//             const originalDate = aptDate.toISOString().split('T')[0];
//             const originalTime = aptDate.toTimeString().slice(0, 5);
//             const originalDoctor = actualAppointment.doctor.name;

//             // Call the reschedule function with correct field names
//             const result = await rescheduleAppointmentByDetails({
//                 patient_name: patient.name,
//                 patient_phone: patient.phone, // Your function will need to handle 'phone' field
//                 original_doctor: originalDoctor,
//                 original_date: originalDate,
//                 original_time: originalTime,
//                 new_date: args.new_date,
//                 new_time: args.new_time
//             });

//             if (result.success) {
//                 // Update appointment status fields
//                 await Appointment.findByIdAndUpdate(actualAppointment._id, {
//                     $set: {
//                         'reminders.24_hour.response': 'rescheduled',
//                         'reminders.1_hour.response': 'rescheduled',
//                         lastStatusUpdate: new Date()
//                     }
//                 });

//                 this.performanceStats.appointmentsRescheduled++;

//                 // Format date for response
//                 const newDate = new Date(`${args.new_date}T${args.new_time}:00`);
//                 const formattedDate = newDate.toLocaleDateString('en-US', {
//                     weekday: 'long',
//                     month: 'long',
//                     day: 'numeric'
//                 });
//                 const formattedTime = newDate.toLocaleTimeString('en-US', {
//                     hour: 'numeric',
//                     minute: '2-digit',
//                     hour12: true
//                 });

//                 return {
//                     shouldRespond: true,
//                     message: `Appointment rescheduled!\n\nNew date: ${formattedDate}\nNew time: ${formattedTime}\nDoctor: ${originalDoctor}\n\nYou'll receive a reminder!`,
//                     action: 'rescheduled',
//                     conversationEnded: true
//                 };
//             } else {
//                 console.log('Reschedule failed:', result.message);
//                 return {
//                     shouldRespond: true,
//                     message: "Having trouble rescheduling. Reply CALL for help.",
//                     action: 'reschedule_failed',
//                     conversationEnded: false
//                 };
//             }

//         } catch (error) {
//             console.error('Reschedule error:', error);
//             return {
//                 shouldRespond: true,
//                 message: "Error rescheduling. Reply CALL for help.",
//                 action: 'error',
//                 conversationEnded: false
//             };
//         }
//     }

//     async handleCancel(patient, args, appointment) {
//         try {
//             // Get the appointment details if we have the appointment object
//             let doctorName = appointment?.doctor?.name;
//             let appointmentDate = null;
//             let appointmentTime = null;

//             // If we have the appointment object, get exact details
//             if (appointment) {
//                 const aptDate = new Date(appointment.dateTime);
//                 appointmentDate = aptDate.toISOString().split('T')[0];
//                 appointmentTime = aptDate.toTimeString().slice(0, 5);
//                 doctorName = appointment.doctor.name;
//             }

//             // If no doctor name from appointment, try to find the appointment
//             if (!doctorName && args.appointment_date) {
//                 const searchDate = new Date(args.appointment_date);
//                 const nextDay = new Date(searchDate);
//                 nextDay.setDate(nextDay.getDate() + 1);

//                 const foundApt = await Appointment.findOne({
//                     patient: patient._id,
//                     dateTime: {
//                         $gte: searchDate,
//                         $lt: nextDay
//                     },
//                     status: { $in: ['scheduled', 'initiated', 'confirmed'] }
//                 }).populate('doctor');

//                 if (foundApt) {
//                     doctorName = foundApt.doctor.name;
//                     const aptDate = new Date(foundApt.dateTime);
//                     appointmentDate = aptDate.toISOString().split('T')[0];
//                     appointmentTime = aptDate.toTimeString().slice(0, 5);
//                 }
//             }

//             if (!doctorName) {
//                 return {
//                     shouldRespond: true,
//                     message: "Couldn't find your appointment details. Reply CALL for help.",
//                     action: 'appointment_not_found',
//                     conversationEnded: false
//                 };
//             }

//             // Call the cancel function with proper argument names
//             const result = await cancelAppointmentByDetails({
//                 patient_name: patient.name || args.patient_name,
//                 patient_phone: patient.phone,
//                 doctor_name: doctorName,
//                 appointment_date: appointmentDate,
//                 appointment_time: appointmentTime,
//                 reason: args.reason || 'Patient requested via text'
//             });

//             if (result.success) {
//                 // Update appointment status fields
//                 if (appointment) {
//                     await Appointment.findByIdAndUpdate(appointment._id, {
//                         $set: {
//                             cancelledVia: 'sms',
//                             'reminders.24_hour.response': 'cancelled',
//                             'reminders.1_hour.response': 'cancelled',
//                             lastStatusUpdate: new Date()
//                         }
//                     });
//                 }

//                 this.performanceStats.appointmentsCancelled++;

//                 return {
//                     shouldRespond: true,
//                     message: `Appointment cancelled.\n\nWe hope everything is okay. If you need to reschedule later, just let us know!`,
//                     action: 'cancelled',
//                     conversationEnded: true
//                 };
//             } else {
//                 console.log('Cancel failed:', result.message);
//                 return {
//                     shouldRespond: true,
//                     message: "Having trouble cancelling. Reply CALL for help.",
//                     action: 'cancel_failed',
//                     conversationEnded: false
//                 };
//             }

//         } catch (error) {
//             console.error('Cancel error:', error);
//             return {
//                 shouldRespond: true,
//                 message: "Error cancelling. Reply CALL for help.",
//                 action: 'error',
//                 conversationEnded: false
//             };
//         }
//     }

//     async handlePrescriptionRefill(patient, args) {
//         try {
//             const result = await processPrescriptionRefill({
//                 ...args,
//                 patient_name: patient.name
//             });

//             if (result.success) {
//                 return {
//                     shouldRespond: true,
//                     message: `Prescription refill requested!\n\nMedication: ${args.medication_name}\n\nOur pharmacy will process within 24-48 hours.`,
//                     action: 'refill_requested',
//                     conversationEnded: true
//                 };
//             }

//             return {
//                 shouldRespond: true,
//                 message: "Having trouble with refill. Reply CALL for help",
//                 action: 'refill_failed',
//                 conversationEnded: false
//             };

//         } catch (error) {
//             return {
//                 shouldRespond: true,
//                 message: "Error processing refill. Reply CALL",
//                 action: 'error',
//                 conversationEnded: false
//             };
//         }
//     }

//     async handleUpdatePatientInfo(patient, args) {
//         try {
//             const updateData = {};
//             if (args.name) updateData.name = args.name;
//             if (args.age) updateData.age = args.age;
//             if (args.gender) updateData.gender = args.gender;
//             if (args.preferred_doctor) updateData.preferredDoctor = args.preferred_doctor;
//             if (args.preferred_time) updateData.preferredTime = args.preferred_time;

//             await Patient.findByIdAndUpdate(patient._id, { $set: updateData });

//             return {
//                 shouldRespond: true,
//                 message: `Your information has been updated!`,
//                 action: 'info_updated',
//                 conversationEnded: true
//             };

//         } catch (error) {
//             return {
//                 shouldRespond: true,
//                 message: "Error updating info. Reply CALL",
//                 action: 'error',
//                 conversationEnded: false
//             };
//         }
//     }

//     async triggerCallToPatient(patient, hospital, args) {
//         try {
//             const { reason, urgency = 'normal', call_type = 'appointment_management', context } = args;

//             console.log(`Triggering call to ${patient.phone}`);
//             console.log(`Reason: ${reason} | Type: ${call_type} | Urgency: ${urgency}`);

//             const callParams = {
//                 phoneNumber: patient.phone,
//                 patientId: patient._id,
//                 hospitalId: hospital._id,
//                 reason: reason,
//                 callType: call_type,
//                 priority: urgency === 'urgent' ? 'high' : 'normal',
//                 escalationContext: {
//                     escalatedFrom: 'messaging',
//                     originalContext: context || reason,
//                     timestamp: new Date(),
//                     messageTriggered: true
//                 }
//             };

//             const callResult = await callService.makeOutboundCall(callParams);

//             if (callResult.success) {
//                 this.performanceStats.callsTriggered++;

//                 const waitTime = urgency === 'urgent' ? 'immediately' : 'within 5-10 minutes';

//                 return {
//                     shouldRespond: true,
//                     message: `${urgency === 'urgent' ? 'Calling you RIGHT NOW!' : `Perfect! We'll call you ${waitTime}.`}\n\nPlease keep your phone nearby!`,
//                     action: 'call_triggered',
//                     conversationEnded: true,
//                     callSid: callResult.call?.sid
//                 };
//             }

//             return {
//                 shouldRespond: true,
//                 message: `Having trouble calling. Please call us at ${hospital.phonenumber || process.env.HOSPITAL_MAIN_PHONE}`,
//                 action: 'call_failed',
//                 conversationEnded: true
//             };

//         } catch (error) {
//             console.error('Call trigger error:', error);
//             return {
//                 shouldRespond: true,
//                 message: `Error setting up call. Please call us at ${hospital.phonenumber || process.env.HOSPITAL_MAIN_PHONE}`,
//                 action: 'call_error',
//                 conversationEnded: true
//             };
//         }
//     }

//     async askCommunicationPreference(args, patient) {
//         const { action, context } = args;

//         const messages = {
//             reschedule: "I can help you reschedule!\n\nWould you like to:\n\n- TEXT - Reschedule via messages\n- CALL - I'll call you to reschedule\n\nReply TEXT or CALL",
//             cancel: "I understand you need to cancel your appointment.\n\nWould you like to:\n\n- TEXT - Cancel via message\n- CALL - I'll call you\n\nReply TEXT or CALL"
//         };

//         return {
//             shouldRespond: true,
//             message: messages[action] || "Would you prefer TEXT or CALL? Reply TEXT or CALL",
//             action: 'preference_asked',
//             flowType: action,
//             conversationEnded: false
//         };
//     }

//     async confirmAppointment(patient, args, appointment) {
//         try {
//             console.log(`Confirming appointment:`, {
//                 hasAppointment: !!appointment,
//                 appointmentId: appointment?._id,
//                 patientPhone: args.patient_phone,
//                 appointmentDate: args.appointment_date
//             });

//             // Determine which reminder type is being confirmed
//             const conversationMeta = this.activeConversations.get(patient.phone) ||
//                 this.activeConversations.get(args.patient_phone);

//             const reminderType = conversationMeta?.type || '24_hour'; // Default to 24_hour
//             const isOneHourReminder = reminderType === '1_hour' || reminderType === 'one_hour';
//             const is24HourReminder = reminderType === '24_hour' || reminderType === 'appointment_reminder';

//             console.log(`Confirming via ${reminderType} reminder`);

//             let appointmentToUpdate = appointment;

//             if (!appointmentToUpdate && args.patient_phone && args.appointment_date) {
//                 console.log('No appointment passed, searching by date and patient...');
//                 const searchDate = new Date(args.appointment_date);
//                 const nextDay = new Date(searchDate);
//                 nextDay.setDate(nextDay.getDate() + 1);

//                 appointmentToUpdate = await Appointment.findOne({
//                     patient: patient._id,
//                     dateTime: {
//                         $gte: searchDate,
//                         $lt: nextDay
//                     },
//                     status: { $in: ['scheduled', 'initiated'] }
//                 });
//             }

//             if (appointmentToUpdate) {
//                 // Build update object based on which reminder is being confirmed
//                 const updateFields = {
//                     status: 'confirmed',
//                     lastStatusUpdate: new Date()
//                 };

//                 if (is24HourReminder) {
//                     // Only update 24-hour reminder fields
//                     updateFields['reminders.24_hour.response'] = 'confirmed';
//                     updateFields['reminders.24_hour.confirmedAt'] = new Date();
//                     console.log('Updating 24-hour reminder confirmation only');
//                 } else if (isOneHourReminder) {
//                     // Only update 1-hour reminder fields
//                     updateFields['reminders.1_hour.response'] = 'confirmed';
//                     updateFields['reminders.1_hour.confirmedAt'] = new Date();
//                     console.log('Updating 1-hour reminder confirmation only');
//                 }

//                 const updated = await Appointment.findByIdAndUpdate(
//                     appointmentToUpdate._id,
//                     { $set: updateFields },
//                     { new: true }
//                 );

//                 console.log(`Appointment status updated:`, {
//                     id: updated._id,
//                     status: updated.status,
//                     reminderType: reminderType,
//                     reminderResponse: is24HourReminder
//                         ? updated.reminders?.['24_hour']?.response
//                         : updated.reminders?.['1_hour']?.response
//                 });

//                 this.performanceStats.appointmentsConfirmed++;

//                 return {
//                     shouldRespond: true,
//                     message: `Great! Your appointment is confirmed. We'll see you then!`,
//                     action: 'confirmed',
//                     conversationEnded: true
//                 };
//             } else {
//                 console.log(`No appointment found to confirm`);
//                 return {
//                     shouldRespond: true,
//                     message: "Confirmed! See you at your appointment!",
//                     action: 'confirmed',
//                     conversationEnded: true
//                 };
//             }

//         } catch (error) {
//             console.error('Error confirming appointment:', error);
//             return {
//                 shouldRespond: true,
//                 message: "Confirmed! See you at your appointment!",
//                 action: 'confirmed',
//                 conversationEnded: true
//             };
//         }
//     }

//     /**
//      * Start message conversation (initiates reminder/follow-up)
//      */
//     async startMessageConversation(appointmentId, conversationType, method = 'sms') {
//         try {
//             const appointment = await Appointment.findById(appointmentId)
//                 .populate('patient')
//                 .populate('doctor')
//                 .populate('hospital');

//             if (!appointment || !appointment.patient?.phone) {
//                 return { success: false, error: 'Invalid appointment or patient phone missing' };
//             }

//             // UPDATED: Check if reminder already sent using static method
//             const alreadySent = await Message.hasReminderBeenSent(appointmentId, conversationType);
//             if (alreadySent) {
//                 console.log(`Reminder already sent for appointment ${appointmentId} today`);
//                 return {
//                     success: false,
//                     error: 'Reminder already sent today',
//                     reason: 'duplicate_prevention'
//                 };
//             }

//             const patient = appointment.patient;
//             const hospital = appointment?.hospital;

//             let message = '';

//             // Appointment Reminder
//             if (conversationType === 'appointment_reminder' || conversationType === '24_hour' || conversationType === '1_hour') {
//                 const timeUntil = conversationType === '1_hour' ? 'in 1 hour' : 'tomorrow';
//                 const date = appointment.dateTime.toLocaleDateString('en-US', {
//                     weekday: 'long',
//                     month: 'long',
//                     day: 'numeric'
//                 });
//                 const time = appointment.dateTime.toLocaleTimeString('en-US', {
//                     hour: 'numeric',
//                     minute: '2-digit',
//                     hour12: true
//                 });

//                 const doctorSpecialty = appointment.doctor?.specialty ? ` (${appointment.doctor.specialty})` : '';
//                 const appointmentReason = appointment.reason || 'consultation';

//                 message = `Hi! 👋

// You have an appointment ${timeUntil}:

// 📅 Date: ${date}
// 🕐 Time: ${time}
// 👨‍⚕️ Doctor: ${appointment.doctor.name}${doctorSpecialty}
// Reason: ${appointmentReason}

// Please reply:
// - "YES" to confirm
// - "RESCHEDULE" if you need to change the time
// - "NO" if you need to cancel
// - "CALL" if you'd like us to call you

// Thank you!`;

//                 this.performanceStats.remindersSent++;
//             }
//             // Follow-up
//             else if (conversationType === 'follow_up') {
//                 const appointmentDate = appointment.dateTime.toLocaleDateString('en-US', {
//                     month: 'short',
//                     day: 'numeric'
//                 });

//                 message = `Hi! 👋

// We hope you're feeling better after your visit with ${appointment.doctor.name} on ${appointmentDate}.

// How are you feeling?

// Please reply:
// - "GOOD" - Feeling better
// - "SAME" - No change
// - "WORSE" - Not feeling well
// - "CALL" - I'd like to speak with someone

// We care about your recovery!`;

//                 this.performanceStats.followUpsSent++;
//             }

//             // Send message
//             const result = await this.sendMessage(patient.phone, message, method);

//             if (result.success) {
//                 // Mark conversation as ACTIVE - store with both phone formats
//                 this.activeConversations.set(patient.phone, {
//                     appointmentId: appointmentId,
//                     type: conversationType,
//                     startedAt: Date.now()
//                 });

//                 // Also store with clean phone number
//                 const cleanPhone = patient.phone.replace('whatsapp:', '').replace('+', '');
//                 this.activeConversations.set(cleanPhone, {
//                     appointmentId: appointmentId,
//                     type: conversationType,
//                     startedAt: Date.now()
//                 });

//                 console.log(`Conversation started for ${patient.phone} - Type: ${conversationType}`);

//                 // UPDATED: Find or create today's conversation and add message
//                 const conversation = await Message.findOrCreateTodayConversation(patient?._id, {
//                     method: method,
//                     isReminderFollowup: true,
//                     appointment: appointmentId,
//                     conversationType: conversationType,
//                     hospital: hospital?._id
//                 });

//                 await conversation.addMessage({
//                     from: method === 'whatsapp' ? `whatsapp:${process.env.TWILIO_PHONE}` : process.env.TWILIO_PHONE,
//                     to: patient.phone,
//                     body: message,
//                     direction: 'outbound',
//                     messageSid: result.messageSid,
//                     status: 'sent'
//                 });

//                 // Update appointment
//                 const updateField = conversationType.includes('reminder') || conversationType.includes('hour')
//                     ? `reminders.${conversationType === '1_hour' ? '1_hour' : '24_hour'}`
//                     : 'followUp';

//                 await Appointment.findByIdAndUpdate(appointmentId, {
//                     $set: {
//                         [`${updateField}.sentAt`]: new Date(),
//                         [`${updateField}.messageSid`]: result.messageSid,
//                         [`${updateField}.status`]: 'sent',
//                         [`${updateField}.method`]: method
//                     }
//                 });

//                 console.log(`${conversationType} sent successfully`);
//                 return { success: true, messageSid: result.messageSid };
//             }

//             return { success: false, error: 'Failed to send message' };

//         } catch (error) {
//             console.error('❌ Error starting conversation:', error);
//             return { success: false, error: error.message };
//         }
//     }

//     /**
//      * Send message via Twilio Messages API
//      */
//     async sendMessage(to, message, method = 'sms') {
//         try {
//             if (!this.twilioClient) {
//                 throw new Error('Twilio not initialized');
//             }

//             const fromNumber = process.env.TWILIO_PHONE;
//             const toNumber = method === 'whatsapp' ? `whatsapp:${to}` : to;
//             const fromFormatted = method === 'whatsapp' ? `whatsapp:${fromNumber}` : fromNumber;

//             const result = await this.twilioClient.messages.create({
//                 body: message,
//                 from: fromFormatted,
//                 to: toNumber
//             });

//             console.log(`${method.toUpperCase()} sent: ${result.sid}`);
//             return { success: true, messageSid: result.sid };

//         } catch (error) {
//             console.error(`❌ Error sending ${method}:`, error);
//             return { success: false, error: error.message };
//         }
//     }

//     /**
//      * Get hospital
//      */
//     async getHospital() {
//         try {
//             let hospital = await Hospital.findOne();

//             if (!hospital) {
//                 hospital = {
//                     _id: 'default',
//                     name: process.env.HOSPITAL_NAME || 'Our Medical Center',
//                     phonenumber: process.env.HOSPITAL_MAIN_PHONE
//                 };
//             }

//             return hospital;
//         } catch (error) {
//             return {
//                 _id: 'default',
//                 name: 'Our Medical Center',
//                 phonenumber: process.env.HOSPITAL_MAIN_PHONE
//             };
//         }
//     }

//     /**
//      * Update performance stats
//      */
//     updateStats(action) {
//         switch (action) {
//             case 'confirmed':
//                 this.performanceStats.appointmentsConfirmed++;
//                 break;
//             case 'rescheduled':
//                 this.performanceStats.appointmentsRescheduled++;
//                 break;
//             case 'cancelled':
//                 this.performanceStats.appointmentsCancelled++;
//                 break;
//             case 'call_triggered':
//                 this.performanceStats.callsTriggered++;
//                 break;
//         }
//     }

//     /**
//      * Get performance stats (for API)
//      */
//     getPerformanceStats() {
//         return {
//             ...this.performanceStats,
//             activeConversations: this.activeConversations.size,
//             avgResponseTime: this.performanceStats.totalRequests > 0
//                 ? Math.round(this.performanceStats.responseTimeSum / this.performanceStats.totalRequests)
//                 : 0
//         };
//     }

//     /**
//      * Get conversations (for API)
//      */
//     async getConversations(query, limit) {
//         try {
//             return await Message.find(query)
//                 .sort({ conversationDate: -1 })
//                 .limit(parseInt(limit));
//         } catch (error) {
//             return [];
//         }
//     }
// }

// const messageService = new MessageService();
// export default messageService;

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

        // Cache WhatsApp availability (phone -> {hasWhatsApp: bool, checkedAt: timestamp})
        this.whatsappCache = new Map();
        this.CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

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
            whatsappSent: 0,
            smsSent: 0,
            errors: 0
        };
    }

    initializeTwilio() {
        if (process.env.TWILIO_SID && process.env.TWILIO_AUTH) {
            this.twilioClient = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH);
        } else {
            console.error('Twilio credentials missing');
        }
    }

    initializeOpenAI() {
        if (process.env.OPENAI_API_KEY) {
            this.openai = new OpenAI({
                apiKey: process.env.OPENAI_API_KEY,
            });
        } else {
            console.error('OpenAI API key missing');
        }
    }

    /**
     * Check if a phone number has WhatsApp using Twilio Lookup API
     */
    async checkWhatsAppAvailability(phoneNumber) {
        try {
            // Clean the phone number
            const cleanNumber = phoneNumber.replace('whatsapp:', '').replace('+', '').trim();
            const formattedNumber = cleanNumber.startsWith('+') ? cleanNumber : `+${cleanNumber}`;

            // Check cache first
            const cached = this.whatsappCache.get(formattedNumber);
            if (cached && (Date.now() - cached.checkedAt) < this.CACHE_TTL) {
                console.log(`📱 WhatsApp status (cached): ${formattedNumber} - ${cached.hasWhatsApp ? 'Available' : 'Not available'}`);
                return cached.hasWhatsApp;
            }

            if (!this.twilioClient) {
                console.log('⚠️ Twilio client not initialized, defaulting to SMS');
                return false;
            }

            console.log(`🔍 Checking WhatsApp availability for: ${formattedNumber}`);

            // Use Twilio Lookup API v2 to check WhatsApp
            const lookupResult = await this.twilioClient.lookups.v2
                .phoneNumbers(formattedNumber)
                .fetch({ fields: 'line_type_intelligence' });

            // Check if the number has WhatsApp
            const hasWhatsApp = lookupResult.lineTypeIntelligence?.carrier_name?.toLowerCase().includes('whatsapp') || false;

            // Alternative: Try sending a test WhatsApp message (if you have WhatsApp Business API)
            const whatsappAvailable = await this.verifyWhatsAppByTest(formattedNumber);

            // Cache the result
            this.whatsappCache.set(formattedNumber, {
                hasWhatsApp: whatsappAvailable,
                checkedAt: Date.now()
            });

            console.log(`✅ WhatsApp check complete: ${formattedNumber} - ${whatsappAvailable ? 'Available' : 'Not available'}`);
            return whatsappAvailable;

        } catch (error) {
            console.error('❌ Error checking WhatsApp availability:', error.message);
            return false;
        }
    }

    /**
     * Verify WhatsApp by checking patient history
     */
    async verifyWhatsAppByTest(phoneNumber) {
        try {
            const patient = await Patient.findOne({ phone: phoneNumber });
            if (patient?.communicationPreferences?.whatsappAvailable !== undefined) {
                return patient.communicationPreferences.whatsappAvailable;
            }

            // Check recent messages to see if they came from WhatsApp
            const recentWhatsAppMessage = await Message.findOne({
                'messages.from': new RegExp(`whatsapp:.*${phoneNumber.replace('+', '')}`)
            });

            return !!recentWhatsAppMessage;

        } catch (error) {
            console.error('Error verifying WhatsApp:', error);
            return false;
        }
    }

    /**
     * Automatically determine the best communication method
     */
    async determineBestMethod(phoneNumber, patientId = null) {
        try {
            // First check patient preferences
            if (patientId) {
                const patient = await Patient.findById(patientId);
                if (patient?.communicationPreferences?.preferredMethod) {
                    const preferred = patient.communicationPreferences.preferredMethod;

                    // If they prefer WhatsApp, verify it's still available
                    if (preferred === 'whatsapp') {
                        const hasWhatsApp = await this.checkWhatsAppAvailability(phoneNumber);
                        if (hasWhatsApp) {
                            console.log(`📱 Using preferred method: WhatsApp`);
                            return 'whatsapp';
                        }
                        console.log(`📱 WhatsApp preferred but not available, falling back to SMS`);
                    }

                    console.log(`📱 Using preferred method: ${preferred}`);
                    return preferred;
                }
            }

            // Check if WhatsApp is available
            const hasWhatsApp = await this.checkWhatsAppAvailability(phoneNumber);
            const method = hasWhatsApp ? 'whatsapp' : 'sms';

            // Update patient record if we found WhatsApp
            if (patientId && hasWhatsApp) {
                await Patient.findByIdAndUpdate(patientId, {
                    $set: {
                        'communicationPreferences.whatsappAvailable': true,
                        'communicationPreferences.lastWhatsAppCheck': new Date()
                    }
                });
            }

            console.log(`📱 Auto-selected method: ${method.toUpperCase()}`);
            return method;

        } catch (error) {
            console.error('Error determining best method:', error);
            return 'sms';
        }
    }

    /**
     * Send message with automatic WhatsApp/SMS selection
     */
    async sendMessageAuto(to, message, patientId = null, hospitalId) {
        try {
            const method = await this.determineBestMethod(to, patientId);
            const result = await this.sendMessage(to, message, method, hospitalId);

            // If WhatsApp fails, automatically retry with SMS
            if (!result.success && method === 'whatsapp') {
                console.log('⚠️ WhatsApp failed, retrying with SMS...');

                const cleanNumber = to.replace('whatsapp:', '').replace('+', '').trim();
                const formattedNumber = cleanNumber.startsWith('+') ? cleanNumber : `+${cleanNumber}`;
                this.whatsappCache.set(formattedNumber, {
                    hasWhatsApp: false,
                    checkedAt: Date.now()
                });

                if (patientId) {
                    await Patient.findByIdAndUpdate(patientId, {
                        $set: { 'communicationPreferences.whatsappAvailable': false }
                    });
                }

                return await this.sendMessage(to, message, 'sms', hospitalId);
            }

            return result;

        } catch (error) {
            console.error('Error in sendMessageAuto:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Send message via Twilio Messages API
     */
    async sendMessage(to, message, method = 'sms', hospitalId) {
        try {
            if (!this.twilioClient) {
                throw new Error('Twilio not initialized');
            }

            const hospital = await Hospital.findById(hospitalId);
            if (!hospital || !hospital.twilioPhoneNumber) {
                throw new Error('Hospital Twilio number not configured');
            }

            const fromNumber = hospital.twilioPhoneNumber;
            const cleanTo = to.replace('whatsapp:', '').trim();
            const toNumber = method === 'whatsapp' ? `whatsapp:${cleanTo}` : cleanTo;
            const fromFormatted = method === 'whatsapp' ? `whatsapp:${fromNumber}` : fromNumber;

            const result = await this.twilioClient.messages.create({
                body: message,
                from: fromFormatted,
                to: toNumber
            });

            // Update stats
            if (method === 'whatsapp') {
                this.performanceStats.whatsappSent++;
            } else {
                this.performanceStats.smsSent++;
            }

            console.log(`✅ ${method.toUpperCase()} sent: ${result.sid}`);
            return { success: true, messageSid: result.sid, method: method };

        } catch (error) {
            console.error(`❌ Error sending ${method}:`, error);
            return { success: false, error: error.message, method: method };
        }
    }

    async isReminderFollowupConversation(phoneNumber) {
        try {
            if (this.activeConversations.has(phoneNumber)) {
                const conversation = this.activeConversations.get(phoneNumber);
                const hoursSinceStart = (Date.now() - conversation.startedAt) / (1000 * 60 * 60);
                if (hoursSinceStart < 24) {
                    console.log(`Active ${conversation.type} conversation for ${phoneNumber}`);
                    return true;
                } else {
                    this.activeConversations.delete(phoneNumber);
                }
            }

            const patient = await Patient.findOne({ phone: phoneNumber });
            if (!patient) return false;

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const recentConversation = await Message.findOne({
                patient: patient._id,
                isReminderFollowup: true,
                conversationDate: today,
                conversationStatus: 'active'
            });

            if (recentConversation) {
                console.log(`Recent reminder/follow-up found in DB for ${phoneNumber}`);
                this.activeConversations.set(phoneNumber, {
                    appointmentId: recentConversation.appointment,
                    type: recentConversation.conversationType || 'reminder',
                    startedAt: recentConversation.createdAt.getTime()
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

    async processIncomingMessage(req, hospitalId) {
        const startTime = Date.now();
        this.performanceStats.totalRequests++;

        try {
            const { From, To, Body, MessageSid, ConversationSid } = req.body;

            if (!From || !Body) {
                console.log('Missing From or Body in request');
                return { success: false, error: 'Missing required fields' };
            }

            // Get hospital
            const hospital = await Hospital.findById(hospitalId);
            if (!hospital || !hospital.twilioPhoneNumber) {
                throw new Error('Hospital not found or Twilio number not configured');
            }

            const isWhatsApp = From.startsWith('whatsapp:');
            const cleanFrom = From.replace('whatsapp:', '');
            const cleanTo = To ? To.replace('whatsapp:', '') : hospital.twilioPhoneNumber;
            const message = Body.trim();

            console.log(`\n🤖 Processing ${isWhatsApp ? 'WhatsApp' : 'SMS'} from ${cleanFrom}`);
            console.log(`💬 Message: "${message}"`);

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

            let conversationMeta = this.activeConversations.get(cleanFrom);
            if (!conversationMeta) {
                conversationMeta = this.activeConversations.get(patient.phone);
            }

            let appointmentId = conversationMeta?.appointmentId;

            if (!appointmentId) {
                console.log('No active conversation found, checking database...');
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                const todayConversation = await Message.findOne({
                    patient: patient._id,
                    isReminderFollowup: true,
                    conversationDate: today,
                    appointment: { $exists: true, $ne: null }
                }).sort({ lastMessageAt: -1 });

                if (todayConversation && todayConversation.appointment) {
                    appointmentId = todayConversation.appointment;
                    this.activeConversations.set(cleanFrom, {
                        appointmentId: appointmentId,
                        type: todayConversation.conversationType || 'reminder',
                        startedAt: todayConversation.createdAt.getTime(),
                        flowType: todayConversation.metadata?.flowType
                    });
                    this.activeConversations.set(patient.phone, {
                        appointmentId: appointmentId,
                        type: todayConversation.conversationType || 'reminder',
                        startedAt: todayConversation.createdAt.getTime(),
                        flowType: todayConversation.metadata?.flowType
                    });
                    console.log(`Restored conversation from DB for appointment: ${appointmentId}`);
                } else {
                    console.log('No recent appointment found in DB');
                }
            }

            console.log(`Appointment ID: ${appointmentId || 'NONE'}`);

            const conversation = await Message.findOrCreateTodayConversation(patient._id, {
                method: isWhatsApp ? 'whatsapp' : 'sms',
                isReminderFollowup: true,
                appointment: appointmentId,
                conversationType: conversationMeta?.type,
                conversationSid: ConversationSid,
                hospital: hospital._id
            });

            await conversation.addMessage({
                from: cleanFrom,
                to: cleanTo,
                body: message,
                direction: 'inbound',
                messageSid: MessageSid,
                status: 'received'
            });

            const aiResponse = await this.getAIResponse(
                message,
                patient,
                hospital,
                appointmentId
            );

            // Track flow state after showing availability
            if (aiResponse.action === 'doctor_available') {
                const currentFlow = this.activeConversations.get(cleanFrom) || {};
                if (!currentFlow.flowType || currentFlow.flowType !== 'reschedule') {
                    this.activeConversations.set(cleanFrom, {
                        ...currentFlow,
                        flowType: 'booking',
                        flowStartedAt: Date.now()
                    });
                    this.activeConversations.set(patient.phone, {
                        ...currentFlow,
                        flowType: 'booking',
                        flowStartedAt: Date.now()
                    });
                }
            }

            if (aiResponse.shouldRespond) {
                const result = await this.sendMessage(
                    cleanFrom,
                    aiResponse.message,
                    isWhatsApp ? 'whatsapp' : 'sms',
                    hospitalId
                );

                await conversation.addMessage({
                    from: cleanTo,
                    to: cleanFrom,
                    body: aiResponse.message,
                    direction: 'outbound',
                    messageSid: result.messageSid,
                    status: 'sent'
                });
            }

            this.updateStats(aiResponse.action);

            if (aiResponse.conversationEnded) {
                await conversation.complete();
                this.activeConversations.delete(cleanFrom);
                this.activeConversations.delete(patient.phone);
                console.log(`Conversation ended for ${cleanFrom}`);
            }

            this.performanceStats.aiProcessed++;
            console.log(`✅ Processed in ${Date.now() - startTime}ms - Action: ${aiResponse.action}\n`);

            return {
                success: true,
                action: aiResponse.action,
                responseTime: Date.now() - startTime,
                appointmentId: appointmentId
            };

        } catch (error) {
            console.error('❌ Error processing message:', error);
            this.performanceStats.errors++;
            return { success: false, error: error.message };
        }
    }

    async getAIResponse(message, patient, hospital, appointmentId) {
        try {
            if (!this.openai) {
                throw new Error('OpenAI not initialized');
            }

            const appointment = appointmentId ?
                await Appointment.findById(appointmentId).populate('doctor') :
                null;

            const systemMessage = this.buildSystemMessage(patient, hospital, appointment);
            const history = await Message.getConversationHistory(patient._id, 5);

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

            if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
                console.log(`AI calling ${assistantMessage.tool_calls.length} function(s)`);
                return await this.handleFunctionCalls(
                    assistantMessage,
                    patient,
                    hospital,
                    appointment
                );
            }

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
            console.error('OpenAI error:', error.message);
            return {
                shouldRespond: true,
                message: "I'm having trouble processing your message. Our team will call you shortly.",
                action: 'error',
                conversationEnded: true
            };
        }
    }

    buildSystemMessage(patient, hospital, appointment) {
        const hospitalName = hospital.name || 'Our Medical Center';
        const patientName = patient?.name || 'the patient';

        const today = new Date();
        const todayFormatted = today.toISOString().split('T')[0];
        const todayReadable = today.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        });

        const conversationState = this.activeConversations.get(patient.phone);
        const flowType = conversationState?.flowType;
        const isInFlow = conversationState?.flowStartedAt &&
            (Date.now() - conversationState.flowStartedAt) < 10 * 60 * 1000;

        let flowContext = '';
        if (isInFlow && flowType === 'reschedule') {
            flowContext = `\n\nCURRENT FLOW: RESCHEDULE
The patient is rescheduling their existing appointment. When they pick a date/time, use reschedule_appointment function.`;
        } else if (isInFlow && flowType === 'booking') {
            flowContext = `\n\nCURRENT FLOW: NEW BOOKING
The patient is booking a new appointment. When they pick a date/time, use book_appointment function.`;
        }

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

CURRENT DATE: ${todayReadable} (${todayFormatted})

PATIENT: ${patientName} (${patient.phone})
HOSPITAL: ${hospitalName}${appointmentInfo}${flowContext}

CRITICAL CONVERSATION FLOW:

1. If patient wants to CONFIRM existing appointment:
   → Patient may say "YES", "CONFIRM", "OK"
   → Use confirm_appointment_attendance function

2. If patient says "reschedule", "change appointment", "move my appointment":
   → FIRST use ask_communication_preference function with action="reschedule"
   → After they choose TEXT, they may ask for available dates
   → Show them available slots using check_doctor_availability
   → When they pick a slot, use reschedule_appointment function

3. If patient asks "which dates available" or "when can I see doctor" (WITHOUT mentioning reschedule):
   → They want to book NEW appointment
   → Show them available slots using check_doctor_availability
   → When they pick a slot, use book_appointment function

4. If patient wants to CANCEL their appointment:
   → Patient may say "NO", "CANCEL IT", "cancel appointment"
   → FIRST use ask_communication_preference function with action="cancel"
   → If they reply "TEXT": Use cancel_appointment function
   → If they reply "CALL": Use trigger_call_to_patient function

5. If patient says "call me", "I want to talk", "phone me":
   → Use trigger_call_to_patient function IMMEDIATELY

DECISION LOGIC FOR DATE/TIME SELECTION:
- If in RESCHEDULE flow → use reschedule_appointment
- If in BOOKING flow → use book_appointment
- If unclear → use book_appointment (default to booking new)

IMPORTANT RULES:
- NEVER ask the same preference question twice in a row
- If patient says "TEXT" or "CALL" as a standalone message, they're answering your preference question
- After they choose TEXT for reschedule, show them available dates immediately
- When checking availability, ALWAYS use ${todayFormatted} as the starting date
- NEVER check dates in the past
- Be concise (text message format)

IMPORTANT: NEVER tell users to reply with just the word "CANCEL" - Twilio will unsubscribe them!

Remember: Track the conversation flow to know whether to book or reschedule!`;
    }

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
                    description: "Check doctor availability. Use TODAY'S date when patient asks 'which dates available'. NEVER use past dates.",
                    parameters: {
                        type: "object",
                        properties: {
                            doctor_name: { type: "string" },
                            date: {
                                type: "string",
                                description: "Date in YYYY-MM-DD format. Use CURRENT DATE from system message for general availability."
                            },
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
                    description: "Book new appointment. Use when patient selects a slot from shown availability in BOOKING flow.",
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
                    description: "Reschedule appointment. Use ONLY in RESCHEDULE flow when patient chose TEXT.",
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
                    description: "Trigger AI phone call to patient.",
                    parameters: {
                        type: "object",
                        properties: {
                            reason: {
                                type: "string",
                                description: "Reason for call"
                            },
                            urgency: {
                                type: "string",
                                enum: ["urgent", "normal"],
                                default: "normal"
                            },
                            call_type: {
                                type: "string",
                                enum: ["appointment_management", "prescription_refill", "general_inquiry", "follow_up"],
                                default: "appointment_management"
                            },
                            context: {
                                type: "string"
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
                    description: "Ask patient if they prefer TEXT or CALL. MUST use BEFORE rescheduling or canceling.",
                    parameters: {
                        type: "object",
                        properties: {
                            action: {
                                type: "string",
                                enum: ["reschedule", "cancel"]
                            },
                            context: { type: "string" }
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

    async handleFunctionCalls(assistantMessage, patient, hospital, appointment) {
        try {
            const toolCall = assistantMessage.tool_calls[0];
            const functionName = toolCall.function.name;
            const functionArgs = JSON.parse(toolCall.function.arguments);

            console.log(`Executing: ${functionName}`);
            console.log(`Args:`, JSON.stringify(functionArgs, null, 2));

            if (!functionArgs.patient_phone) functionArgs.patient_phone = patient.phone;
            if (!functionArgs.patient_name && patient.name) functionArgs.patient_name = patient.name;

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
                    const result = await this.askCommunicationPreference(functionArgs, patient);
                    if (result.flowType) {
                        const currentConv = this.activeConversations.get(patient.phone) || {};
                        this.activeConversations.set(patient.phone, {
                            ...currentConv,
                            flowType: result.flowType,
                            flowStartedAt: Date.now()
                        });
                        const cleanPhone = patient.phone.replace('whatsapp:', '').replace('+', '');
                        this.activeConversations.set(cleanPhone, {
                            ...currentConv,
                            flowType: result.flowType,
                            flowStartedAt: Date.now()
                        });
                    }
                    return result;
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
            console.error('Function error:', error);
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

            let message = `Your appointments:\n\n`;
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
            const requestedDate = new Date(args.date);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (requestedDate < today) {
                return {
                    shouldRespond: true,
                    message: `That date has already passed. Please provide a future date.`,
                    action: 'invalid_date',
                    conversationEnded: false
                };
            }

            const availability = await checkDoctorAvailability(
                args.doctor_name,
                args.date,
                args.specialty,
                hospital._id
            );

            if (availability.results && availability.results.length > 0) {
                let availableDoctors = availability.results.filter(doc => doc.available && doc.slots && doc.slots.length > 0);

                if (args.doctor_name) {
                    availableDoctors = availableDoctors.filter(doc =>
                        doc.doctor_name.toLowerCase().includes(args.doctor_name.toLowerCase()) ||
                        args.doctor_name.toLowerCase().includes(doc.doctor_name.toLowerCase())
                    );
                }

                if (availableDoctors.length === 0) {
                    const doctorText = args.doctor_name ? `${args.doctor_name}` : 'doctors';
                    return {
                        shouldRespond: true,
                        message: `${doctorText} is not available soon. Reply CALL to find alternative dates or doctors.`,
                        action: 'not_available',
                        conversationEnded: false
                    };
                }

                const doc = availableDoctors[0];
                const now = new Date();
                const futureAvailableSlots = doc.slots.filter(slot => {
                    const slotDate = new Date(slot.date);
                    slotDate.setHours(0, 0, 0, 0);
                    return slotDate >= today && slot.status === 'available';
                });

                if (futureAvailableSlots.length === 0) {
                    return {
                        shouldRespond: true,
                        message: `${doc.doctor_name} has no upcoming available slots. Reply CALL to discuss alternatives.`,
                        action: 'not_available',
                        conversationEnded: false
                    };
                }

                let message = `${doc.doctor_name} (${doc.specialty}) availability:\n\n`;

                const slotsToShow = futureAvailableSlots.slice(0, 8);
                const formattedSlots = slotsToShow.map(slot => {
                    const slotDate = new Date(slot.date);
                    const dateStr = slotDate.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric'
                    });

                    const [hours, minutes] = slot.time.split(':');
                    const hour = parseInt(hours);
                    const ampm = hour >= 12 ? 'PM' : 'AM';
                    const hour12 = hour % 12 || 12;
                    const timeStr = `${hour12}:${minutes} ${ampm}`;

                    return `- ${dateStr} at ${timeStr}`;
                });

                message += formattedSlots.join('\n');

                if (futureAvailableSlots.length > 8) {
                    message += `\n\n+${futureAvailableSlots.length - 8} more slots available`;
                }

                message += `\n\nReply with your preferred date and time to book, or CALL for help.`;

                return {
                    shouldRespond: true,
                    message: message,
                    action: 'doctor_available',
                    conversationEnded: false
                };
            }

            return {
                shouldRespond: true,
                message: `No availability found. Reply CALL to speak with us.`,
                action: 'not_available',
                conversationEnded: false
            };

        } catch (error) {
            console.error('Error checking availability:', error);
            return {
                shouldRespond: true,
                message: "Error checking availability. Reply CALL for help.",
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
            let actualAppointment = appointment;

            if (!actualAppointment || !actualAppointment.doctor) {
                const conversationMeta = this.activeConversations.get(patient.phone);
                if (conversationMeta?.appointmentId) {
                    actualAppointment = await Appointment.findById(conversationMeta.appointmentId)
                        .populate('doctor');
                }
            }

            if (!actualAppointment) {
                actualAppointment = await Appointment.findOne({
                    patient: patient._id,
                    status: { $in: ['scheduled', 'initiated', 'confirmed'] },
                    dateTime: { $gte: new Date() }
                })
                    .populate('doctor')
                    .sort({ dateTime: 1 });
            }

            if (!actualAppointment) {
                return {
                    shouldRespond: true,
                    message: "Couldn't find your appointment to reschedule. Reply CALL for help.",
                    action: 'appointment_not_found',
                    conversationEnded: false
                };
            }

            const aptDate = new Date(actualAppointment.dateTime);
            const originalDate = aptDate.toISOString().split('T')[0];
            const originalTime = aptDate.toTimeString().slice(0, 5);
            const originalDoctor = actualAppointment.doctor.name;

            const result = await rescheduleAppointmentByDetails({
                patient_name: patient.name,
                patient_phone: patient.phone,
                original_doctor: originalDoctor,
                original_date: originalDate,
                original_time: originalTime,
                new_date: args.new_date,
                new_time: args.new_time
            });

            if (result.success) {
                await Appointment.findByIdAndUpdate(actualAppointment._id, {
                    $set: {
                        'reminders.24_hour.response': 'rescheduled',
                        'reminders.1_hour.response': 'rescheduled',
                        lastStatusUpdate: new Date()
                    }
                });

                this.performanceStats.appointmentsRescheduled++;

                const newDate = new Date(`${args.new_date}T${args.new_time}:00`);
                const formattedDate = newDate.toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric'
                });
                const formattedTime = newDate.toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true
                });

                return {
                    shouldRespond: true,
                    message: `Appointment rescheduled!\n\nNew date: ${formattedDate}\nNew time: ${formattedTime}\nDoctor: ${originalDoctor}\n\nYou'll receive a reminder!`,
                    action: 'rescheduled',
                    conversationEnded: true
                };
            } else {
                console.log('Reschedule failed:', result.message);
                return {
                    shouldRespond: true,
                    message: "Having trouble rescheduling. Reply CALL for help.",
                    action: 'reschedule_failed',
                    conversationEnded: false
                };
            }

        } catch (error) {
            console.error('Reschedule error:', error);
            return {
                shouldRespond: true,
                message: "Error rescheduling. Reply CALL for help.",
                action: 'error',
                conversationEnded: false
            };
        }
    }

    async handleCancel(patient, args, appointment) {
        try {
            let doctorName = appointment?.doctor?.name;
            let appointmentDate = null;
            let appointmentTime = null;

            if (appointment) {
                const aptDate = new Date(appointment.dateTime);
                appointmentDate = aptDate.toISOString().split('T')[0];
                appointmentTime = aptDate.toTimeString().slice(0, 5);
                doctorName = appointment.doctor.name;
            }

            if (!doctorName && args.appointment_date) {
                const searchDate = new Date(args.appointment_date);
                const nextDay = new Date(searchDate);
                nextDay.setDate(nextDay.getDate() + 1);

                const foundApt = await Appointment.findOne({
                    patient: patient._id,
                    dateTime: {
                        $gte: searchDate,
                        $lt: nextDay
                    },
                    status: { $in: ['scheduled', 'initiated', 'confirmed'] }
                }).populate('doctor');

                if (foundApt) {
                    doctorName = foundApt.doctor.name;
                    const aptDate = new Date(foundApt.dateTime);
                    appointmentDate = aptDate.toISOString().split('T')[0];
                    appointmentTime = aptDate.toTimeString().slice(0, 5);
                }
            }

            if (!doctorName) {
                return {
                    shouldRespond: true,
                    message: "Couldn't find your appointment details. Reply CALL for help.",
                    action: 'appointment_not_found',
                    conversationEnded: false
                };
            }

            const result = await cancelAppointmentByDetails({
                patient_name: patient.name || args.patient_name,
                patient_phone: patient.phone,
                doctor_name: doctorName,
                appointment_date: appointmentDate,
                appointment_time: appointmentTime,
                reason: args.reason || 'Patient requested via text'
            });

            if (result.success) {
                if (appointment) {
                    await Appointment.findByIdAndUpdate(appointment._id, {
                        $set: {
                            cancelledVia: 'sms',
                            'reminders.24_hour.response': 'cancelled',
                            'reminders.1_hour.response': 'cancelled',
                            lastStatusUpdate: new Date()
                        }
                    });
                }

                this.performanceStats.appointmentsCancelled++;

                return {
                    shouldRespond: true,
                    message: `Appointment cancelled.\n\nWe hope everything is okay. If you need to reschedule later, just let us know!`,
                    action: 'cancelled',
                    conversationEnded: true
                };
            } else {
                console.log('Cancel failed:', result.message);
                return {
                    shouldRespond: true,
                    message: "Having trouble cancelling. Reply CALL for help.",
                    action: 'cancel_failed',
                    conversationEnded: false
                };
            }

        } catch (error) {
            console.error('Cancel error:', error);
            return {
                shouldRespond: true,
                message: "Error cancelling. Reply CALL for help.",
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
                    message: `Prescription refill requested!\n\nMedication: ${args.medication_name}\n\nOur pharmacy will process within 24-48 hours.`,
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

            console.log(`Triggering call to ${patient.phone}`);
            console.log(`Reason: ${reason} | Type: ${call_type} | Urgency: ${urgency}`);

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
                    message: `${urgency === 'urgent' ? 'Calling you RIGHT NOW!' : `Perfect! We'll call you ${waitTime}.`}\n\nPlease keep your phone nearby!`,
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
            console.error('Call trigger error:', error);
            return {
                shouldRespond: true,
                message: `Error setting up call. Please call us at ${hospital.phonenumber || process.env.HOSPITAL_MAIN_PHONE}`,
                action: 'call_error',
                conversationEnded: true
            };
        }
    }

    async askCommunicationPreference(args, patient) {
        const { action, context } = args;

        const messages = {
            reschedule: "I can help you reschedule!\n\nWould you like to:\n\n- TEXT - Reschedule via messages\n- CALL - I'll call you to reschedule\n\nReply TEXT or CALL",
            cancel: "I understand you need to cancel your appointment.\n\nWould you like to:\n\n- TEXT - Cancel via message\n- CALL - I'll call you\n\nReply TEXT or CALL"
        };

        return {
            shouldRespond: true,
            message: messages[action] || "Would you prefer TEXT or CALL? Reply TEXT or CALL",
            action: 'preference_asked',
            flowType: action,
            conversationEnded: false
        };
    }

    async confirmAppointment(patient, args, appointment) {
        try {
            console.log(`Confirming appointment:`, {
                hasAppointment: !!appointment,
                appointmentId: appointment?._id,
                patientPhone: args.patient_phone,
                appointmentDate: args.appointment_date
            });

            const conversationMeta = this.activeConversations.get(patient.phone) ||
                this.activeConversations.get(args.patient_phone);

            const reminderType = conversationMeta?.type || '24_hour';
            const isOneHourReminder = reminderType === '1_hour' || reminderType === 'one_hour';
            const is24HourReminder = reminderType === '24_hour' || reminderType === 'appointment_reminder';

            console.log(`Confirming via ${reminderType} reminder`);

            let appointmentToUpdate = appointment;

            if (!appointmentToUpdate && args.patient_phone && args.appointment_date) {
                console.log('No appointment passed, searching by date and patient...');
                const searchDate = new Date(args.appointment_date);
                const nextDay = new Date(searchDate);
                nextDay.setDate(nextDay.getDate() + 1);

                appointmentToUpdate = await Appointment.findOne({
                    patient: patient._id,
                    dateTime: {
                        $gte: searchDate,
                        $lt: nextDay
                    },
                    status: { $in: ['scheduled', 'initiated'] }
                });
            }

            if (appointmentToUpdate) {
                const updateFields = {
                    status: 'confirmed',
                    lastStatusUpdate: new Date()
                };

                if (is24HourReminder) {
                    updateFields['reminders.24_hour.response'] = 'confirmed';
                    updateFields['reminders.24_hour.confirmedAt'] = new Date();
                    console.log('Updating 24-hour reminder confirmation only');
                } else if (isOneHourReminder) {
                    updateFields['reminders.1_hour.response'] = 'confirmed';
                    updateFields['reminders.1_hour.confirmedAt'] = new Date();
                    console.log('Updating 1-hour reminder confirmation only');
                }

                const updated = await Appointment.findByIdAndUpdate(
                    appointmentToUpdate._id,
                    { $set: updateFields },
                    { new: true }
                );

                console.log(`Appointment status updated:`, {
                    id: updated._id,
                    status: updated.status,
                    reminderType: reminderType,
                    reminderResponse: is24HourReminder
                        ? updated.reminders?.['24_hour']?.response
                        : updated.reminders?.['1_hour']?.response
                });

                this.performanceStats.appointmentsConfirmed++;

                return {
                    shouldRespond: true,
                    message: `Great! Your appointment is confirmed. We'll see you then!`,
                    action: 'confirmed',
                    conversationEnded: true
                };
            } else {
                console.log(`No appointment found to confirm`);
                return {
                    shouldRespond: true,
                    message: "Confirmed! See you at your appointment!",
                    action: 'confirmed',
                    conversationEnded: true
                };
            }

        } catch (error) {
            console.error('Error confirming appointment:', error);
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
    async startMessageConversation(appointmentId, conversationType, method = 'sms', hospitalId) {
        try {
            const appointment = await Appointment.findById(appointmentId)
                .populate('patient')
                .populate('doctor')
                .populate('hospital');

            if (!appointment || !appointment.patient?.phone) {
                return { success: false, error: 'Invalid appointment or patient phone missing' };
            }

            const effectiveHospitalId = hospitalId || appointment.hospital?._id;

            if (!effectiveHospitalId) {
                return { success: false, error: 'Hospital ID required' };
            }

            const hospital = await Hospital.findById(effectiveHospitalId);
            if (!hospital || !hospital.twilioPhoneNumber) {
                return { success: false, error: 'Hospital Twilio number not configured' };
            }

            const alreadySent = await Message.hasReminderBeenSent(appointmentId, conversationType);
            if (alreadySent) {
                console.log(`Reminder already sent for appointment ${appointmentId} today`);
                return {
                    success: false,
                    error: 'Reminder already sent today',
                    reason: 'duplicate_prevention'
                };
            }

            const patient = appointment.patient;

            let message = '';

            if (['appointment_reminder', '24_hour', '1_hour'].includes(conversationType)) {
                let timeUntil = 'soon';
                if (conversationType === '1_hour') timeUntil = 'in 1 hour';
                else if (conversationType === '24_hour' || conversationType === 'appointment_reminder') timeUntil = 'tomorrow';
                
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

                message = `Hi! 👋

You have an appointment ${timeUntil}:

📅 Date: ${date}
🕐 Time: ${time}
👨‍⚕️ Doctor: ${appointment.doctor.name}${doctorSpecialty}
Reason: ${appointmentReason}

Please reply:
- "YES" to confirm
- "RESCHEDULE" if you need to change the time
- "NO" if you need to cancel
- "CALL" if you'd like us to call you

Thank you!`;

                this.performanceStats.remindersSent++;
            } else if (conversationType === 'follow_up') {
                const appointmentDate = appointment.dateTime.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric'
                });

                message = `Hi! 👋

We hope you're feeling better after your visit with ${appointment.doctor.name} on ${appointmentDate}.

How are you feeling?

Please reply:
- "GOOD" - Feeling better
- "SAME" - No change
- "WORSE" - Not feeling well
- "CALL" - I'd like to speak with someone

We care about your recovery!`;

                this.performanceStats.followUpsSent++;
            }

            const result = await this.sendMessage(patient.phone, message, method, effectiveHospitalId);

            if (result.success) {
                this.activeConversations.set(patient.phone, {
                    appointmentId: appointmentId,
                    type: conversationType,
                    startedAt: Date.now()
                });

                const cleanPhone = patient.phone.replace('whatsapp:', '').replace('+', '');
                this.activeConversations.set(cleanPhone, {
                    appointmentId: appointmentId,
                    type: conversationType,
                    startedAt: Date.now()
                });

                console.log(`Conversation started for ${patient.phone} - Type: ${conversationType}`);

                const conversation = await Message.findOrCreateTodayConversation(patient._id, {
                    method: method,
                    isReminderFollowup: true,
                    appointment: appointmentId,
                    conversationType: conversationType,
                    hospital: hospital._id
                });

                await conversation.addMessage({
                    from: method === 'whatsapp' ? `whatsapp:${hospital.twilioPhoneNumber}` : hospital.twilioPhoneNumber,
                    to: patient.phone,
                    body: message,
                    direction: 'outbound',
                    messageSid: result.messageSid,
                    status: 'sent'
                });

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
                .sort({ conversationDate: -1 })
                .limit(parseInt(limit));
        } catch (error) {
            return [];
        }
    }
}

const messageService = new MessageService();
export default messageService;