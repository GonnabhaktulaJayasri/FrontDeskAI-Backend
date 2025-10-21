
// import OpenAI from 'openai';
// import Patient from '../models/Patient.js';
// import callService from '../services/callService.js'; 

// const openai = new OpenAI({
//     apiKey: process.env.OPENAI_API_KEY
// });

// // Store conversation state (in production, use Redis or DB)
// const conversationStates = new Map();

// // System prompt for the chatbot
// const SYSTEM_PROMPT = `You are a helpful and professional medical receptionist AI for a healthcare practice. Your role is to:

// 1. **Greet patients warmly** - Be friendly and welcoming
// 2. **Identify returning patients** - Ask if they've visited before
// 3. **Collect necessary information** - ONLY ask for information we don't already have
// 4. **Handle existing patients intelligently** - If we have their information, acknowledge them and skip to asking their reason for contacting us
// 5. **Have natural conversations** - When they mention needing care (checkup, sick, appointment), acknowledge it warmly and engage naturally
// 6. **Confirm and close** - After understanding their needs, say "We'll give you a call shortly to schedule everything" to close the conversation

// **CRITICAL RULES:**
// - If we have existing patient data, DO NOT ask for it again. Just say "Welcome back [Name]! What brings you in today?"
// - Keep responses concise and conversational (2-3 sentences max)
// - Be empathetic and professional
// - When they mention needing an appointment or medical care, acknowledge it and engage naturally
// - After 1-2 conversational exchanges about their needs, conclude by saying "We'll give you a call shortly to schedule/confirm everything"
// - The phrase "We'll give you a call shortly" or "We'll call you shortly" signals that the conversation is ready to close and the call should be initiated

// **Example flow for existing patient:**
// - "Hi! Have you visited before?"
// - User: "Yes"
// - "Could you provide your phone number please?"
// - User: "+1234567890"
// - "Welcome back, John! What brings you in today?"
// - User: "I need a checkup"
// - "I'd be happy to help you schedule that checkup! Do you have a preferred doctor or date in mind?"
// - User: "Next week with Dr. Smith"
// - "Perfect! I'll help you book an appointment with Dr. Smith for a checkup next week. We'll give you a call shortly to confirm the specific date and time."
// [NOW the call will be triggered]

// **Example flow for new patient:**
// - User: "I want to book an appointment"
// - "I'd be happy to help! First, may I have your name and phone number?"
// - User: "John Smith, 555-1234"
// - "Thank you, John! What type of appointment do you need?"
// - User: "Annual physical"
// - "Perfect! We'll give you a call shortly to schedule your annual physical."
// [NOW the call will be triggered]

// Always respond naturally and maintain a warm, helpful tone. Let the conversation flow naturally before closing.`;

// /**
//  * Initialize chat conversation with intelligent context
//  */
// export const initializeChat = async (req, res) => {
//     try {
//         // Generate unique session ID
//         const sessionId = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

//         // Gather intelligent context
//         const context = await gatherContextualInformation(req);

//         // Initialize conversation state with rich context
//         conversationStates.set(sessionId, {
//             stage: 'greeting',
//             patientData: {},
//             messages: [],
//             context: context,
//             startTime: new Date(),
//             lastActivity: new Date()
//         });

//         // Create personalized greeting based on context
//         const greetingPrompt = buildIntelligentGreeting(context);

//         // Create initial AI greeting
//         const completion = await openai.chat.completions.create({
//             model: "gpt-4o-mini",
//             messages: [
//                 { role: "system", content: SYSTEM_PROMPT },
//                 { 
//                     role: "user", 
//                     content: greetingPrompt
//                 }
//             ],
//             temperature: 0.7,
//             max_tokens: 150
//         });

//         const aiMessage = completion.choices[0].message.content;

//         // Store in conversation history
//         const state = conversationStates.get(sessionId);
//         state.messages.push(
//             { role: "system", content: SYSTEM_PROMPT },
//             { role: "assistant", content: aiMessage }
//         );
//         conversationStates.set(sessionId, state);

//         // Log analytics
//         logChatInitialization(sessionId, context);

//         res.json({
//             success: true,
//             sessionId,
//             message: aiMessage,
//             stage: 'greeting',
//             context: {
//                 timeOfDay: context.timeOfDay,
//                 isReturningVisitor: context.isReturningVisitor
//             }
//         });

//     } catch (error) {
//         console.error('Error initializing chat:', error);
//         res.status(500).json({
//             success: false,
//             error: 'Failed to initialize chat',
//             details: error.message
//         });
//     }
// };

// /**
//  * Gather contextual information for intelligent greeting
//  */
// async function gatherContextualInformation(req) {
//     const now = new Date();
//     const hour = now.getHours();

//     // Determine time of day
//     let timeOfDay = 'day';
//     if (hour >= 5 && hour < 12) {
//         timeOfDay = 'morning';
//     } else if (hour >= 12 && hour < 17) {
//         timeOfDay = 'afternoon';
//     } else if (hour >= 17 && hour < 21) {
//         timeOfDay = 'evening';
//     } else {
//         timeOfDay = 'night';
//     }

//     // Get day of week
//     const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
//     const dayOfWeek = daysOfWeek[now.getDay()];
//     const isWeekend = now.getDay() === 0 || now.getDay() === 6;

//     // Get user agent info
//     const userAgent = req.headers['user-agent'] || '';
//     const isMobile = /Mobile|Android|iPhone|iPad/i.test(userAgent);

//     // Check for returning visitor (can be enhanced with cookies/session)
//     const fingerprint = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
//     const isReturningVisitor = await checkReturningVisitor(fingerprint);

//     // Get referrer information
//     const referrer = req.headers['referer'] || req.headers['referrer'] || 'direct';
//     const isFromHomepage = referrer.includes('localhost') || referrer.includes(process.env.APP_URL);

//     // Browser language
//     const language = req.headers['accept-language']?.split(',')[0] || 'en';

//     // Check if during business hours
//     const isBusinessHours = (hour >= 8 && hour < 20) && !isWeekend;

//     return {
//         timeOfDay,
//         dayOfWeek,
//         isWeekend,
//         isMobile,
//         isReturningVisitor,
//         referrer,
//         isFromHomepage,
//         language,
//         isBusinessHours,
//         currentHour: hour,
//         timestamp: now
//     };
// }

// /**
//  * Check if visitor has been here before
//  */
// async function checkReturningVisitor(fingerprint) {
//     // In production, check against database or cache
//     // For now, we'll use a simple in-memory check
//     if (!global.visitorFingerprints) {
//         global.visitorFingerprints = new Set();
//     }

//     const isReturning = global.visitorFingerprints.has(fingerprint);
//     global.visitorFingerprints.add(fingerprint);

//     return isReturning;
// }

// /**
//  * Build intelligent greeting based on context
//  */
// function buildIntelligentGreeting(context) {
//     let prompt = "Start the conversation with a warm, personalized greeting. ";

//     // Time-based greeting
//     if (context.timeOfDay === 'morning') {
//         prompt += "It's morning, so start with a cheerful 'Good morning!' ";
//     } else if (context.timeOfDay === 'afternoon') {
//         prompt += "It's afternoon, so start with 'Good afternoon!' ";
//     } else if (context.timeOfDay === 'evening') {
//         prompt += "It's evening, so start with 'Good evening!' ";
//     } else if (context.timeOfDay === 'night') {
//         prompt += "It's late at night, acknowledge that and mention we're available 24/7. ";
//     }

//     // Returning visitor
//     if (context.isReturningVisitor) {
//         prompt += "Welcome them back warmly ('Welcome back to CareConnect!'). ";
//     } else {
//         prompt += "Welcome them to CareConnect for the first time. ";
//     }

//     // Weekend/after hours
//     if (!context.isBusinessHours) {
//         if (context.isWeekend) {
//             prompt += "Mention that even though it's the weekend, we're here to help. ";
//         } else {
//             prompt += "Mention that even though it's after hours, we're available to assist. ";
//         }
//     }

//     // Mobile device
//     if (context.isMobile) {
//         prompt += "Keep it brief and mobile-friendly. ";
//     }

//     // Always ask if they've visited
//     prompt += "\n\nAfter the greeting, ask if they have visited our practice before. Keep the tone warm and professional.";

//     return prompt;
// }

// /**
//  * Log chat initialization for analytics
//  */
// function logChatInitialization(sessionId, context) {    
//     // Track metrics (can be sent to analytics service)
//     if (!global.chatMetrics) {
//         global.chatMetrics = {
//             totalChats: 0,
//             mobileChats: 0,
//             returningVisitors: 0,
//             afterHoursChats: 0
//         };
//     }

//     global.chatMetrics.totalChats++;
//     if (context.isMobile) global.chatMetrics.mobileChats++;
//     if (context.isReturningVisitor) global.chatMetrics.returningVisitors++;
//     if (!context.isBusinessHours) global.chatMetrics.afterHoursChats++;
// }

// /**
//  * Get chat analytics (optional endpoint)
//  */
// export const getChatAnalytics = async (req, res) => {
//     try {
//         const metrics = global.chatMetrics || {
//             totalChats: 0,
//             mobileChats: 0,
//             returningVisitors: 0,
//             afterHoursChats: 0
//         };

//         res.json({
//             success: true,
//             metrics: {
//                 ...metrics,
//                 mobilePercentage: metrics.totalChats > 0 
//                     ? ((metrics.mobileChats / metrics.totalChats) * 100).toFixed(1) 
//                     : 0,
//                 returningVisitorPercentage: metrics.totalChats > 0 
//                     ? ((metrics.returningVisitors / metrics.totalChats) * 100).toFixed(1) 
//                     : 0,
//                 afterHoursPercentage: metrics.totalChats > 0 
//                     ? ((metrics.afterHoursChats / metrics.totalChats) * 100).toFixed(1) 
//                     : 0
//             }
//         });
//     } catch (error) {
//         console.error('Error getting analytics:', error);
//         res.status(500).json({
//             success: false,
//             error: 'Failed to get analytics'
//         });
//     }
// };

// /**
//  * Handle user message and generate AI response
//  */
// export const sendMessage = async (req, res) => {
//     try {
//         const { sessionId, message } = req.body;

//         if (!sessionId || !message) {
//             return res.status(400).json({
//                 success: false,
//                 error: 'Session ID and message are required'
//             });
//         }

//         // Get conversation state
//         let state = conversationStates.get(sessionId);
//         if (!state) {
//             return res.status(404).json({
//                 success: false,
//                 error: 'Session not found. Please refresh and start a new chat.'
//             });
//         }

//         // Add user message to history
//         state.messages.push({ role: "user", content: message });

//         // Determine if we need to extract information or check database
//         const extractedInfo = await extractPatientInfo(message, state);

//         // Update patient data if information was extracted
//         if (extractedInfo) {
//             state.patientData = { ...state.patientData, ...extractedInfo };
//         }

//         // Check if we have enough info to search for existing patient
//         if (state.patientData.phone && !state.patientData.isExisting && !state.patientData.checkedDatabase) {
//             const existingPatient = await Patient.findOne({ 
//                 phone: state.patientData.phone 
//             });

//             state.patientData.checkedDatabase = true; // Mark as checked to avoid repeated queries

//             if (existingPatient) {
//                 state.patientData.isExisting = true;
//                 state.patientData.patientId = existingPatient._id;

//                 // Pre-fill all existing patient data
//                 state.patientData.existingInfo = {
//                     firstName: existingPatient.firstName,
//                     lastName: existingPatient.lastName,
//                     name: `${existingPatient.firstName} ${existingPatient.lastName}`,
//                     email: existingPatient.email,
//                     age: existingPatient.age,
//                     dob: existingPatient.dob,
//                     gender: existingPatient.gender
//                 };

//                 // Auto-fill the data we have
//                 if (existingPatient.firstName && !state.patientData.firstName) {
//                     state.patientData.firstName = existingPatient.firstName;
//                 }
//                 if (existingPatient.lastName && !state.patientData.lastName) {
//                     state.patientData.lastName = existingPatient.lastName;
//                 }
//                 if (existingPatient.email && !state.patientData.email) {
//                     state.patientData.email = existingPatient.email;
//                 }
//                 if (existingPatient.age && !state.patientData.age) {
//                     state.patientData.age = existingPatient.age;
//                 }
//                 if (existingPatient.dob && !state.patientData.dob) {
//                     state.patientData.dob = existingPatient.dob;
//                 }
//                 if (existingPatient.gender && !state.patientData.gender) {
//                     state.patientData.gender = existingPatient.gender;
//                 }

//                 // Skip to purpose inquiry since we have all info
//                 state.stage = 'purpose_inquiry';

//                 console.log(`✅ Found existing patient: ${existingPatient.firstName} ${existingPatient.lastName}`);
//             } else {
//                 console.log(`ℹ️ New patient - phone: ${state.patientData.phone}`);
//             }
//         }

//         // Generate AI response with context
//         const contextMessage = buildContextMessage(state);

//         const completion = await openai.chat.completions.create({
//             model: "gpt-4o-mini",
//             messages: [
//                 ...state.messages,
//                 { role: "system", content: contextMessage }
//             ],
//             temperature: 0.7,
//             max_tokens: 200
//         });

//         const aiMessage = completion.choices[0].message.content;
//         state.messages.push({ role: "assistant", content: aiMessage });

//         // Update conversation stage
//         updateConversationStage(state, message, aiMessage);

//         // Check if we should trigger call based on natural conversation flow
//         // Only trigger after bot has said "we'll call you" indicating conversation is complete
//         if (shouldTriggerCall(state, message, aiMessage)) {
//             // Initiate phone call for confirmation
//             try {
//                 // Get hospital ID - from auth middleware or use default
//                 const hospitalId = req.hospitalId || process.env.DEFAULT_HOSPITAL_ID;

//                 if (!hospitalId) {
//                     throw new Error('Hospital ID not configured. Please set DEFAULT_HOSPITAL_ID in .env or enable authentication.');
//                 }

//                 await initiateAppointmentCall(state.patientData, hospitalId);
//                 state.appointmentInitiated = true;
//             } catch (callError) {
//                 console.error('Failed to initiate call:', callError);
//                 // Don't fail the whole request, just log the error
//                 state.callError = callError.message;
//             }
//         }

//         conversationStates.set(sessionId, state);

//         res.json({
//             success: true,
//             message: aiMessage,
//             stage: state.stage,
//             patientData: state.patientData,
//             appointmentInitiated: state.appointmentInitiated || false,
//             callError: state.callError || null
//         });

//     } catch (error) {
//         console.error('Error processing message:', error);
//         res.status(500).json({
//             success: false,
//             error: 'Failed to process message',
//             details: error.message
//         });
//     }
// };

// /**
//  * Extract patient information from message using GPT
//  */
// async function extractPatientInfo(message, state) {
//     try {
//         const existingData = state.patientData.existingInfo || {};

//         const extractionPrompt = `Extract patient information from this message: "${message}"

//         Current data we have: ${JSON.stringify(existingData)}

//         Return JSON with any NEW information found (leave empty if not found or already exists):
//         {
//             "firstName": "",
//             "lastName": "",
//             "phone": "",
//             "email": "",
//             "age": "",
//             "dob": "",
//             "gender": "",
//             "visitedBefore": "",
//             "reason": "",
//             "preferredDoctor": "",
//             "preferredDate": "",
//             "preferredTime": ""
//         }

//         Rules:
//         - Only extract information that is explicitly stated
//         - For dates, use YYYY-MM-DD format if possible, otherwise keep as stated
//         - For phone numbers, keep the format as provided
//         - Don't include information we already have
//         - Extract appointment reason if mentioned (e.g., "checkup", "fever", "consultation")
//         - Extract doctor preferences if mentioned
//         - Extract time/date preferences if mentioned

//         Only return the JSON, nothing else.`;

//         const completion = await openai.chat.completions.create({
//             model: "gpt-4o-mini",
//             messages: [
//                 { role: "system", content: "You are a data extraction assistant. Extract information and return only valid JSON." },
//                 { role: "user", content: extractionPrompt }
//             ],
//             temperature: 0.3,
//             max_tokens: 200
//         });

//         const response = completion.choices[0].message.content;
//         const jsonMatch = response.match(/\{[\s\S]*\}/);

//         if (jsonMatch) {
//             const extracted = JSON.parse(jsonMatch[0]);
//             // Filter out empty values and data we already have
//             const newData = {};
//             for (const [key, value] of Object.entries(extracted)) {
//                 if (value && value !== "" && value !== null && !state.patientData[key]) {
//                     newData[key] = value;
//                 }
//             }
//             return Object.keys(newData).length > 0 ? newData : null;
//         }

//         return null;
//     } catch (error) {
//         console.error('Error extracting info:', error);
//         return null;
//     }
// }

// /**
//  * Build context message for AI
//  */
// function buildContextMessage(state) {
//     let context = "Current conversation context:\n";

//     context += `Stage: ${state.stage}\n`;

//     if (Object.keys(state.patientData).length > 0) {
//         context += "\nPatient data collected:\n";
//         context += JSON.stringify(state.patientData, null, 2);
//     }

//     if (state.patientData.isExisting && state.patientData.existingInfo) {
//         context += "\n\n⭐ IMPORTANT: This is an EXISTING patient! We have their information:\n";
//         context += `- Name: ${state.patientData.existingInfo.name}\n`;
//         context += `- Email: ${state.patientData.existingInfo.email}\n`;
//         context += `- Age: ${state.patientData.existingInfo.age}\n`;
//         if (state.patientData.existingInfo.dob) {
//             context += `- Date of Birth: ${state.patientData.existingInfo.dob}\n`;
//         }
//         if (state.patientData.existingInfo.gender) {
//             context += `- Gender: ${state.patientData.existingInfo.gender}\n`;
//         }
//         context += "\nDO NOT ask for information we already have. Welcome them back warmly and ask what brings them in today.\n";
//     }

//     if (state.stage === 'purpose_inquiry') {
//         context += "\n\nNext step: Ask what brings them in today or why they're contacting us.\n";
//     }

//     if (state.stage === 'booking_appointment') {
//         context += "\n\nPatient wants to book an appointment. Have a natural conversation about their needs (1-2 exchanges). Then conclude by saying 'We'll give you a call shortly to schedule/confirm everything.' This signals you're ready to close the conversation.\n";
//     }

//     context += "\n\nAlways respond naturally and conversationally. Keep responses concise and friendly.";

//     return context;
// }

// /**
//  * Update conversation stage based on content
//  */
// function updateConversationStage(state, userMessage, aiResponse) {
//     const lowerMessage = userMessage.toLowerCase();
//     const lowerResponse = aiResponse.toLowerCase();

//     // If greeting stage and user answered if they visited before
//     if (state.stage === 'greeting' && (lowerMessage.includes('yes') || lowerMessage.includes('no') || lowerMessage.includes('first time'))) {
//         state.stage = 'collecting_info';
//     }

//     // If we have an existing patient with all info, skip to purpose inquiry
//     if (state.patientData.isExisting && state.patientData.existingInfo) {
//         state.stage = 'purpose_inquiry';
//     }

//     // If collecting info and we now have phone and first name
//     if (state.stage === 'collecting_info' && state.patientData.phone && state.patientData.firstName) {
//         state.stage = 'purpose_inquiry';
//     }

//     // If user mentions appointment booking keywords
//     if (lowerMessage.includes('appointment') || lowerMessage.includes('book') || 
//         lowerMessage.includes('schedule') || lowerMessage.includes('see doctor') ||
//         lowerMessage.includes('visit') || lowerMessage.includes('consultation')) {
//         state.stage = 'booking_appointment';
//         state.bookingInitiated = true; // Flag that booking was requested
//     }
// }

// /**
//  * Check if we should trigger the call (all conditions met)
//  */
// function shouldTriggerCall(state, userMessage) {
//     // Must be in booking stage
//     if (state.stage !== 'booking_appointment') return false;

//     // Must have phone number
//     if (!state.patientData.phone) return false;

//     // Must have indicated booking intent
//     if (!state.bookingInitiated) return false;

//     // Don't trigger multiple times
//     if (state.appointmentInitiated) return false;

//     // Trigger immediately when booking intent is detected
//     // No need to wait for additional details - we'll get everything over the phone
//     return true;
// }

// /**
//  * Initiate phone call for appointment confirmation using existing callService
//  */
// async function initiateAppointmentCall(patientData, hospitalId = null) {
//     try {
//         if (!patientData.phone) {
//             throw new Error('Patient phone number is required');
//         }

//         if (!hospitalId) {
//             throw new Error('Hospital ID is required for calls');
//         }

//         // Format phone number (ensure it has country code)
//         let phoneNumber = patientData.phone;
//         if (!phoneNumber.startsWith('+')) {
//             phoneNumber = '+1' + phoneNumber.replace(/\D/g, ''); // Assuming US number
//         }

//         // Use existing callService to make the call
//         const result = await callService.makeOutboundCall({
//             phoneNumber: phoneNumber,
//             patientId: patientData.patientId || null,
//             hospitalId: hospitalId,
//             reason: 'Appointment booking confirmation',
//             callType: 'general'
//         });

//         if (result.success) {
//             console.log(`Initiated appointment call to ${phoneNumber}, Call SID: ${result.call?.sid}`);
//             return {
//                 success: true,
//                 callSid: result.call?.sid,
//                 message: 'Appointment confirmation call initiated'
//             };
//         } else {
//             throw new Error(result.error || 'Failed to initiate call');
//         }

//     } catch (error) {
//         console.error('Error initiating call:', error);
//         throw error;
//     }
// }

// /**
//  * Get conversation history
//  */
// export const getConversationHistory = async (req, res) => {
//     try {
//         const { sessionId } = req.params;

//         const state = conversationStates.get(sessionId);

//         if (!state) {
//             return res.status(404).json({
//                 success: false,
//                 error: 'Session not found'
//             });
//         }

//         res.json({
//             success: true,
//             messages: state.messages.filter(m => m.role !== 'system'),
//             patientData: state.patientData,
//             stage: state.stage
//         });

//     } catch (error) {
//         console.error('Error getting conversation history:', error);
//         res.status(500).json({
//             success: false,
//             error: 'Failed to get conversation history',
//             details: error.message
//         });
//     }
// };

// export default {
//     initializeChat,
//     sendMessage,
//     getConversationHistory,
//     getChatAnalytics
// };


// with emr integration
import OpenAI from 'openai';
import Patient from '../models/Patient.js';
import Appointment from '../models/Appointment.js';
import callService from '../services/callService.js';
import fhirSearchService from '../services/fhirSearchService.js';
import { normalizePhoneNumber } from '../utils/phoneUtils.js';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Store conversation state (in production, use Redis or DB)
const conversationStates = new Map();

// System prompt for the chatbot
const SYSTEM_PROMPT = `You are a helpful and professional medical receptionist AI for a healthcare practice. Your role is to:

1. **Greet patients warmly** - Be friendly and welcoming
2. **Identify returning patients** - Ask if they've visited before
3. **Get phone number immediately for existing patients** - If they say they've visited before, ask for their phone number to look them up
4. **Handle existing patients intelligently** - Once we find them in our system, greet them by name and ask what brings them in
5. **Differentiate between queries and booking requests**:
   - QUERY: "Do I have any appointments?" → Answer their question (don't call)
   - BOOKING: "I want to book an appointment" → We will call them immediately
6. **For booking appointments** - When they explicitly want to BOOK/SCHEDULE, we'll call them right away

**CRITICAL RULES:**
- If patient says they've visited before → Ask for phone number immediately
- Once we have their phone and find them → Greet by name and ask what brings them in
- If they're ASKING about appointments → Just answer their question
- If they want to BOOK an appointment → Tell them we'll call immediately
- Keep responses concise and conversational (2-3 sentences max)
- Be empathetic and professional
- If user says "thanks", "ok", "nothing" after getting their answer → Give a brief, friendly closing without repeating information

**Examples:**
❌ "Do I have any appointments?" → Answer the question (don't mention calling)
❌ "Check my appointments" → Answer the question (don't mention calling)
❌ "When is my appointment?" → Answer the question (don't mention calling)
✅ "I want to book an appointment" → Tell them we'll call right now
✅ "Schedule an appointment" → Tell them we'll call right now
✅ "Need to see a doctor" → Tell them we'll call right now

Always respond naturally and maintain a warm, helpful tone.`;

/**
 * Initialize chat conversation with intelligent context
 */
export const initializeChat = async (req, res) => {
    try {
        // Generate unique session ID
        const sessionId = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Gather intelligent context
        const context = await gatherContextualInformation(req);

        // Initialize conversation state with rich context
        conversationStates.set(sessionId, {
            stage: 'greeting',
            patientData: {},
            appointmentData: null,
            messages: [],
            context: context,
            startTime: new Date(),
            lastActivity: new Date(),
            callStatus: null,
            callAttempted: false,
            appointmentInfoShared: false,  // ✅ NEW: Track if appointment info shared
            conversationEnding: false      // ✅ NEW: Track if conversation ending
        });

        // Create personalized greeting based on context
        const greetingPrompt = buildIntelligentGreeting(context);

        // Create initial AI greeting
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "user", content: greetingPrompt }
            ],
            temperature: 0.7,
            max_tokens: 150
        });

        const aiMessage = completion.choices[0].message.content;

        // Store in conversation history
        const state = conversationStates.get(sessionId);
        state.messages.push(
            { role: "system", content: SYSTEM_PROMPT },
            { role: "assistant", content: aiMessage }
        );
        conversationStates.set(sessionId, state);

        // Log analytics
        logChatInitialization(sessionId, context);

        res.json({
            success: true,
            sessionId,
            message: aiMessage,
            stage: 'greeting',
            context: {
                timeOfDay: context.timeOfDay,
                isReturningVisitor: context.isReturningVisitor
            }
        });

    } catch (error) {
        console.error('Error initializing chat:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to initialize chat',
            details: error.message
        });
    }
};

/**
 * Handle user message and generate AI response
 * ✅ UPDATED: Checks EMR, makes call immediately, tracks call status, prevents repetition
 */
export const sendMessage = async (req, res) => {
    try {
        const { sessionId, message } = req.body;

        if (!sessionId || !message) {
            return res.status(400).json({
                success: false,
                error: 'Session ID and message are required'
            });
        }

        // Get conversation state
        let state = conversationStates.get(sessionId);
        if (!state) {
            return res.status(404).json({
                success: false,
                error: 'Session not found. Please refresh and start a new chat.'
            });
        }

        // ✅ Ensure patientData is initialized
        if (!state.patientData) {
            state.patientData = {};
        }

        // Add user message to history
        state.messages.push({ role: "user", content: message });

        // ✅ NEW: Check for closing phrases to prevent repetition
        const lowerMessage = message.toLowerCase().trim();

        const closingPhrases = [
            'nothing', 'nothing thanks', 'nothing thank you', 'no thanks',
            'that\'s all', 'that\'s it', 'thanks', 'thank you', 'ok', 'okay',
            'bye', 'goodbye', 'see you', 'all set', 'nope', 'no'
        ];

        const isClosing = closingPhrases.some(phrase => {
            return lowerMessage === phrase || 
                   lowerMessage === phrase + '.' ||
                   lowerMessage === phrase + '!';
        });

        // If user is closing and we've already shared appointment info
        if (isClosing && state.appointmentInfoShared) {
            state.conversationEnding = true;
            
            const closingMessage = "You're all set! Have a great day, and we'll see you at your appointment! 😊";
            
            state.messages.push({ role: "assistant", content: closingMessage });
            state.lastActivity = new Date();
            conversationStates.set(sessionId, state);

            console.log(`✅ Conversation ending gracefully for session: ${sessionId}`);

            return res.json({
                success: true,
                message: closingMessage,
                stage: 'conversation_ended',
                patientData: state.patientData || {},
                conversationEnded: true
            });
        }

        // Determine if we need to extract information
        const extractedInfo = await extractPatientInfo(message, state);

        // Update patient data if information was extracted
        if (extractedInfo) {
            // ✅ Normalize phone number if extracted
            if (extractedInfo.phone) {
                extractedInfo.phone = normalizePhoneNumber(extractedInfo.phone);
                console.log(`📱 Phone normalized: ${extractedInfo.phone}`);
            }
            state.patientData = { ...state.patientData, ...extractedInfo };
        }

        // ==================== ✅ CHECK EMR WHEN PHONE IS PROVIDED ====================
        if (state.patientData.phone && !state.patientData.isExisting && !state.patientData.checkedDatabase) {
            const normalizedPhone = normalizePhoneNumber(state.patientData.phone);
            console.log(`🔍 Checking FHIR/EMR for patient`);
            console.log(`   Original: ${state.patientData.phone}`);
            console.log(`   Normalized: ${normalizedPhone}`);

            const fhirResult = await fhirSearchService.findOrImportPatientByPhone(normalizedPhone);

            state.patientData.checkedDatabase = true;

            if (fhirResult.success) {
                const existingPatient = fhirResult.patient;
                const patientSource = fhirResult.source;

                state.patientData.isExisting = true;
                state.patientData.patientId = existingPatient._id;
                state.patientData.patientSource = patientSource;
                state.patientData.fhirId = existingPatient.fhirId;
                state.patientData.fhirSyncStatus = existingPatient.fhirSyncStatus;

                // Pre-fill all existing patient data from EMR
                state.patientData.existingInfo = {
                    firstName: existingPatient.firstName,
                    lastName: existingPatient.lastName,
                    name: `${existingPatient.firstName} ${existingPatient.lastName}`,
                    email: existingPatient.email,
                    age: existingPatient.age,
                    dob: existingPatient.dob,
                    gender: existingPatient.gender
                };

                // Auto-fill the data we have
                if (existingPatient.firstName && !state.patientData.firstName) {
                    state.patientData.firstName = existingPatient.firstName;
                }
                if (existingPatient.lastName && !state.patientData.lastName) {
                    state.patientData.lastName = existingPatient.lastName;
                }
                if (existingPatient.email && !state.patientData.email) {
                    state.patientData.email = existingPatient.email;
                }

                // Update stage to purpose inquiry since we found them
                state.stage = 'patient_found';

                console.log(`✅ Patient found in EMR (source: ${patientSource}): ${existingPatient.firstName} ${existingPatient.lastName}`);
                console.log(`   MongoDB ID: ${existingPatient._id}`);
                console.log(`   FHIR ID: ${existingPatient.fhirId || 'pending sync'}`);
            } else {
                console.log(`ℹ️ New patient - phone: ${state.patientData.phone}`);
                state.patientData.isExisting = false;
            }
        }

        // ==================== ✅ DETECT BOOKING INTENT (IMPROVED) ====================
        
        // ✅ Explicit booking phrases (user wants to book)
        const bookingPhrases = [
            'book an appointment',
            'book appointment',
            'schedule an appointment',
            'schedule appointment',
            'make an appointment',
            'make appointment',
            'need an appointment',
            'need appointment',
            'want an appointment',
            'want appointment',
            'want to book',
            'want to schedule',
            'like to book',
            'like to schedule',
            'can i book',
            'can i schedule',
            'book a consultation',
            'schedule consultation',
            'see a doctor',
            'see the doctor',
            'visit doctor',
            'get an appointment'
        ];
        
        // ✅ Query phrases (user is just asking, NOT booking)
        const queryPhrases = [
            'do i have',
            'do i have any',
            'check my appointment',
            'check appointment',
            'my appointment',
            'any appointment',
            'what appointment',
            'when is my',
            'appointment status',
            'upcoming appointment',
            'scheduled appointment',
            'cancel appointment',
            'reschedule appointment',
            'change appointment'
        ];
        
        // Check if it's a query (just asking)
        const isQuery = queryPhrases.some(phrase => lowerMessage.includes(phrase));
        
        // Check if it's an explicit booking request
        const hasBookingIntent = !isQuery && bookingPhrases.some(phrase => lowerMessage.includes(phrase));

        if (hasBookingIntent) {
            state.stage = 'booking_appointment';
            state.bookingInitiated = true;
            console.log(`✅ Booking intent detected: "${message}"`);
        } else if (isQuery) {
            console.log(`ℹ️ Query detected (not booking): "${message}"`);
            
            // ✅ If asking about appointments and we have patient ID, check database
            if (state.patientData.patientId && lowerMessage.includes('appointment')) {
                console.log(`📋 Checking appointments for patient: ${state.patientData.patientId}`);
                
                try {
                    const appointmentData = await checkPatientAppointments(state.patientData.patientId);
                    
                    // Store appointment data in state for AI to use
                    state.appointmentData = appointmentData;
                    
                    // ✅ NEW: Mark that appointment info will be shared
                    if (appointmentData.totalUpcoming > 0) {
                        state.appointmentInfoShared = true;
                    }
                    
                    console.log(`✅ Found ${appointmentData.totalUpcoming} upcoming appointments`);
                } catch (error) {
                    console.error('Error fetching appointments:', error);
                }
            }
        }

        // ==================== ✅ MAKE CALL IMMEDIATELY IF CONDITIONS MET ====================
        let callInitiated = false;
        let callStatusMessage = null;

        if (shouldMakeCallNow(state)) {
            console.log(`📞 Conditions met - Making call immediately`);
            
            try {
                const hospitalId = req.hospitalId || process.env.DEFAULT_HOSPITAL_ID;

                if (!hospitalId) {
                    throw new Error('Hospital ID not configured');
                }

                const callResult = await initiateAppointmentCall(state.patientData, hospitalId, sessionId);
                
                state.callAttempted = true;
                state.callInitiated = true;
                state.callSid = callResult.callSid;
                
                callInitiated = true;

                // Wait a moment to check initial call status
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                // Check call status
                const callStatus = await checkCallStatus(callResult.callSid);
                state.callStatus = callStatus.status;
                
                console.log(`📞 Call status: ${callStatus.status}`);
                
                // Generate appropriate message based on call status
                if (callStatus.status === 'in-progress' || callStatus.status === 'ringing') {
                    callStatusMessage = `Great! I'm calling you right now at ${state.patientData.phone}. Please answer the call and we'll help you schedule your appointment! 📞`;
                } else if (callStatus.status === 'no-answer' || callStatus.status === 'busy') {
                    callStatusMessage = `I tried calling you at ${state.patientData.phone} but couldn't reach you. Please make sure you're available to answer, and I'll try again! Would you like me to try calling now?`;
                } else if (callStatus.status === 'completed') {
                    callStatusMessage = `Perfect! I just called you. Did you receive the call?`;
                } else if (callStatus.status === 'failed') {
                    callStatusMessage = `I'm having trouble calling ${state.patientData.phone}. Could you please verify your phone number is correct?`;
                } else {
                    callStatusMessage = `I'm calling you right now at ${state.patientData.phone}! Please answer your phone. 📞`;
                }

            } catch (callError) {
                console.error('Failed to initiate call:', callError);
                state.callError = callError.message;
                callStatusMessage = `I'm having trouble making the call right now. Could you please call us directly at our office number? We apologize for the inconvenience.`;
            }
        }

        // ==================== ✅ CHECK IF CALL WAS COMPLETED AND RESPOND ====================
        // If call was previously initiated and user sends a message, check if call completed
        if (state.callInitiated && !callInitiated && state.callSid) {
            const callStatus = await checkCallStatus(state.callSid);
            
            if (callStatus.status === 'completed' && state.callStatus !== 'completed') {
                // Call just completed
                state.callStatus = 'completed';
                state.callCompleted = true;
                
                callStatusMessage = `Thank you for speaking with us! Your appointment details have been discussed over the call. Is there anything else I can help you with today? 😊`;
                
                console.log(`✅ Call completed successfully for session: ${sessionId}`);
            }
        }

        // ==================== GENERATE AI RESPONSE ====================
        let aiMessage;

        if (callInitiated && callStatusMessage) {
            // Use the call status message directly
            aiMessage = callStatusMessage;
        } else {
            // Generate AI response with context
            const contextMessage = buildContextMessage(state);

            const completion = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    ...state.messages,
                    { role: "system", content: contextMessage }
                ],
                temperature: 0.7,
                max_tokens: 200
            });

            aiMessage = completion.choices[0].message.content;
        }

        state.messages.push({ role: "assistant", content: aiMessage });
        state.lastActivity = new Date();

        conversationStates.set(sessionId, state);

        res.json({
            success: true,
            message: aiMessage,
            stage: state.stage,
            patientData: state.patientData || {},
            callInitiated: callInitiated,
            callStatus: state.callStatus,
            appointmentInitiated: state.callInitiated || false,
            callError: state.callError || null,
            fhirSyncStatus: state.patientData?.fhirSyncStatus || null,
            patientSource: state.patientData?.patientSource || null
        });

    } catch (error) {
        console.error('Error processing message:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to process message',
            details: error.message
        });
    }
};

/**
 * ✅ Check patient appointments from database
 */
async function checkPatientAppointments(patientId) {
    try {
        if (!patientId) {
            return {
                success: false,
                appointments: [],
                message: 'Patient ID not found'
            };
        }

        const now = new Date();
        
        // Get upcoming appointments
        const upcomingAppointments = await Appointment.find({
            patient: patientId,
            dateTime: { $gte: now },
            status: { $in: ['scheduled', 'confirmed', 'rescheduled'] }
        })
        .populate('doctor', 'name specialty')
        .sort({ dateTime: 1 })
        .limit(10);

        // Get past appointments (last 5)
        const pastAppointments = await Appointment.find({
            patient: patientId,
            dateTime: { $lt: now },
            status: { $ne: 'cancelled' }
        })
        .populate('doctor', 'name specialty')
        .sort({ dateTime: -1 })
        .limit(5);

        const formatAppointment = (apt) => ({
            id: apt._id,
            doctor: apt.doctor?.name || 'Unknown',
            specialty: apt.doctor?.specialty || '',
            date: apt.dateTime.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            }),
            time: apt.dateTime.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit'
            }),
            reason: apt.reason || 'General consultation',
            status: apt.status
        });

        return {
            success: true,
            upcoming: upcomingAppointments.map(formatAppointment),
            past: pastAppointments.map(formatAppointment),
            totalUpcoming: upcomingAppointments.length,
            totalPast: pastAppointments.length
        };

    } catch (error) {
        console.error('Error checking appointments:', error);
        return {
            success: false,
            appointments: [],
            error: error.message
        };
    }
}

/**
 * Check if we should make a call immediately
 */
function shouldMakeCallNow(state) {
    // Already made a call
    if (state.callAttempted) return false;

    // Must have phone number
    if (!state.patientData?.phone) return false;

    // Must have booking intent
    if (!state.bookingInitiated) return false;

    // If patient is existing and wants to book, make call immediately
    if (state.patientData.isExisting && state.stage === 'booking_appointment') {
        return true;
    }

    // If new patient has provided phone and wants to book
    if (state.patientData.phone && state.stage === 'booking_appointment') {
        return true;
    }

    return false;
}

/**
 * Check call status from Twilio
 */
async function checkCallStatus(callSid) {
    try {
        if (!callSid) {
            return { status: 'unknown' };
        }

        // Use callService to check status (you may need to add this method)
        // For now, return a placeholder
        return { status: 'initiated' };
        
        // TODO: Implement actual Twilio status check
        // const twilioClient = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH);
        // const call = await twilioClient.calls(callSid).fetch();
        // return { status: call.status };
        
    } catch (error) {
        console.error('Error checking call status:', error);
        return { status: 'unknown' };
    }
}

/**
 * Initiate phone call for appointment confirmation
 */
async function initiateAppointmentCall(patientData, hospitalId = null, sessionId = null) {
    try {
        if (!patientData.phone) {
            throw new Error('Patient phone number is required');
        }

        if (!hospitalId) {
            throw new Error('Hospital ID is required for calls');
        }

        // ✅ Normalize phone number (handles with/without country code)
        const phoneNumber = normalizePhoneNumber(patientData.phone);
        console.log(`📞 Initiating call to: ${phoneNumber}`);
        console.log(`   SessionId: ${sessionId || 'none'}`);

        // ✅ Build call parameters with optional metadata
        const callParams = {
            phoneNumber: phoneNumber,
            patientId: patientData.patientId || null,
            hospitalId: hospitalId,
            reason: 'Appointment booking confirmation',
            callType: 'general'
        };

        // ✅ Only add metadata if sessionId exists
        if (sessionId) {
            callParams.metadata = {
                sessionId: sessionId,
                source: 'chatbot'
            };
        }

        const result = await callService.makeOutboundCall(callParams);

        if (result.success) {
            console.log(`✅ Initiated appointment call to ${phoneNumber}, Call SID: ${result.call?.sid}`);
            return {
                success: true,
                callSid: result.call?.sid,
                message: 'Appointment confirmation call initiated'
            };
        } else {
            throw new Error(result.error || 'Failed to initiate call');
        }

    } catch (error) {
        console.error('Error initiating call:', error);
        throw error;
    }
}

/**
 * Extract patient information from message using GPT
 */
async function extractPatientInfo(message, state) {
    try {
        // ✅ Ensure state.patientData exists
        if (!state.patientData) {
            state.patientData = {};
        }

        const existingData = state.patientData.existingInfo || {};

        const extractionPrompt = `Extract patient information from this message: "${message}"
        
        Current data we have: ${JSON.stringify(existingData)}
        
        Return JSON with any NEW information found (leave empty if not found or already exists):
        {
            "firstName": "",
            "lastName": "",
            "phone": "",
            "email": "",
            "age": "",
            "dob": "",
            "gender": "",
            "visitedBefore": "",
            "reason": "",
            "preferredDoctor": "",
            "preferredDate": "",
            "preferredTime": ""
        }
        
        Rules:
        - Only extract information that is explicitly stated
        - For dates, use YYYY-MM-DD format if possible, otherwise keep as stated
        - For phone numbers, keep the format as provided
        - Don't include information we already have
        - Extract appointment reason if mentioned
        - Extract doctor preferences if mentioned
        - Extract time/date preferences if mentioned
        
        Only return the JSON, nothing else.`;

        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: "You are a data extraction assistant. Extract information and return only valid JSON." },
                { role: "user", content: extractionPrompt }
            ],
            temperature: 0.3,
            max_tokens: 200
        });

        const response = completion.choices[0].message.content;
        const jsonMatch = response.match(/\{[\s\S]*\}/);

        if (jsonMatch) {
            const extracted = JSON.parse(jsonMatch[0]);
            const newData = {};
            for (const [key, value] of Object.entries(extracted)) {
                if (value && value !== "" && value !== null && !state.patientData[key]) {
                    newData[key] = value;
                }
            }
            return Object.keys(newData).length > 0 ? newData : null;
        }

        return null;
    } catch (error) {
        console.error('Error extracting info:', error);
        return null;
    }
}

/**
 * Build context message for AI
 * ✅ UPDATED: Added repetition prevention handling
 */
function buildContextMessage(state) {
    // ✅ Ensure state.patientData exists
    if (!state.patientData) {
        state.patientData = {};
    }

    let context = "Current conversation context:\n";

    context += `Stage: ${state.stage}\n`;

    if (Object.keys(state.patientData).length > 0) {
        context += "\nPatient data collected:\n";
        context += JSON.stringify(state.patientData, null, 2);
    }

    if (state.patientData.isExisting && state.patientData.existingInfo) {
        context += "\n\n⭐ IMPORTANT: This is an EXISTING patient found in our system!\n";
        context += `- Name: ${state.patientData.existingInfo.name}\n`;
        context += `- Email: ${state.patientData.existingInfo.email}\n`;
        if (state.patientData.existingInfo.age) {
            context += `- Age: ${state.patientData.existingInfo.age}\n`;
        }
        context += "\nGreet them warmly by name and ask what brings them in today.\n";
    }

    // ✅ Include appointment data if available
    if (state.appointmentData) {
        context += "\n\n📋 APPOINTMENT INFORMATION:\n";
        
        if (state.appointmentData.totalUpcoming > 0) {
            context += `\nUpcoming Appointments (${state.appointmentData.totalUpcoming}):\n`;
            state.appointmentData.upcoming.forEach((apt, index) => {
                context += `${index + 1}. Dr. ${apt.doctor} (${apt.specialty})\n`;
                context += `   Date: ${apt.date}\n`;
                context += `   Time: ${apt.time}\n`;
                context += `   Reason: ${apt.reason}\n`;
                context += `   Status: ${apt.status}\n`;
            });
        } else {
            context += "\nNo upcoming appointments scheduled.\n";
        }
        
        if (state.appointmentData.totalPast > 0 && state.appointmentData.past.length > 0) {
            context += `\nPast Appointments (showing last ${state.appointmentData.past.length}):\n`;
            state.appointmentData.past.slice(0, 3).forEach((apt, index) => {
                context += `- ${apt.date} with Dr. ${apt.doctor}\n`;
            });
        }
        
        context += "\nProvide this appointment information to the patient in a friendly, conversational way.\n";
    }

    if (state.stage === 'patient_found') {
        context += "\n\nWe just found this patient in our system! Welcome them back by name and ask what brings them in.\n";
    }

    if (state.stage === 'booking_appointment') {
        if (!state.patientData.phone) {
            context += "\n\nPatient wants to book appointment but we need their phone number. Ask for it now.\n";
        } else if (!state.callAttempted) {
            context += "\n\nPatient wants to book and we have their phone. Tell them you'll call them RIGHT NOW.\n";
        }
    } else {
        // For queries or general conversation
        context += "\n\nIf the patient is asking about existing appointments, just answer their question. DON'T mention calling unless they explicitly want to BOOK a new appointment.\n";
    }

    // ✅ NEW: Handle repetition prevention
    if (state.conversationEnding) {
        context += "\n\n⚠️ User said thanks/ok/nothing - Give BRIEF closing, don't repeat appointment details.\n";
        context += "Example: 'You're all set! Have a great day! 😊'\n";
    } else if (state.appointmentInfoShared && state.appointmentData) {
        context += "\n\n💡 NOTE: If user says 'thanks', 'ok', or 'nothing' after this response → They're satisfied. You can give a brief, friendly closing.\n";
    }

    context += "\n\nAlways respond naturally and conversationally. Keep responses concise and friendly.";

    return context;
}

/**
 * Gather contextual information for intelligent greeting
 */
async function gatherContextualInformation(req) {
    const now = new Date();
    const hour = now.getHours();

    let timeOfDay = 'day';
    if (hour >= 5 && hour < 12) {
        timeOfDay = 'morning';
    } else if (hour >= 12 && hour < 17) {
        timeOfDay = 'afternoon';
    } else if (hour >= 17 && hour < 21) {
        timeOfDay = 'evening';
    } else {
        timeOfDay = 'night';
    }

    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayOfWeek = daysOfWeek[now.getDay()];
    const isWeekend = now.getDay() === 0 || now.getDay() === 6;

    const userAgent = req.headers['user-agent'] || '';
    const isMobile = /Mobile|Android|iPhone|iPad/i.test(userAgent);

    return {
        timeOfDay,
        dayOfWeek,
        isWeekend,
        isMobile,
        isReturningVisitor: false,
        timestamp: now
    };
}

/**
 * Build intelligent greeting
 */
function buildIntelligentGreeting(context) {
    return `Generate a warm, professional greeting for a healthcare practice chatbot.
    
    Context:
    - Time of day: ${context.timeOfDay}
    - Day: ${context.dayOfWeek}
    - Device: ${context.isMobile ? 'Mobile' : 'Desktop'}
    
    Keep it brief (2-3 sentences), friendly, and professional. Ask if they've visited before.`;
}

/**
 * Log chat initialization for analytics
 */
function logChatInitialization(sessionId, context) {
    console.log(`✅ Chat initialized: ${sessionId}`);
    console.log(`   Time: ${context.timeOfDay}`);
    console.log(`   Device: ${context.isMobile ? 'Mobile' : 'Desktop'}`);
}

/**
 * Get chat analytics
 */
export const getChatAnalytics = async (req, res) => {
    try {
        const totalChats = conversationStates.size;
        const activeChats = Array.from(conversationStates.values()).filter(
            state => (Date.now() - state.lastActivity) < 300000
        ).length;

        res.json({
            success: true,
            analytics: {
                totalSessions: totalChats,
                activeSessions: activeChats,
                timestamp: new Date()
            }
        });
    } catch (error) {
        console.error('Error getting analytics:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get analytics'
        });
    }
};

/**
 * Get conversation history
 */
export const getConversationHistory = async (req, res) => {
    try {
        const { sessionId } = req.params;

        const state = conversationStates.get(sessionId);

        if (!state) {
            return res.status(404).json({
                success: false,
                error: 'Session not found'
            });
        }

        res.json({
            success: true,
            messages: state.messages.filter(m => m.role !== 'system'),
            patientData: state.patientData || {},
            stage: state.stage
        });

    } catch (error) {
        console.error('Error getting conversation history:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get conversation history',
            details: error.message
        });
    }
};

/**
 * ✅ Webhook endpoint for Twilio call status updates
 * Twilio will POST to this endpoint with call status changes
 */
export const handleCallStatusWebhook = async (req, res) => {
    try {
        const { CallSid, CallStatus, CallDuration } = req.body;
        
        // Extract sessionId from call metadata if available
        // This depends on how you store it in the call
        const sessionId = req.body.sessionId || req.query.sessionId;
        
        console.log(`📞 Call Status Update - SID: ${CallSid}, Status: ${CallStatus}, Duration: ${CallDuration}s`);
        
        if (!sessionId) {
            console.warn('⚠️ No sessionId found in webhook');
            return res.sendStatus(200);
        }

        // Find the conversation state
        const state = conversationStates.get(sessionId);
        
        if (!state) {
            console.warn(`⚠️ No conversation state found for session: ${sessionId}`);
            return res.sendStatus(200);
        }

        // Update call status
        state.callStatus = CallStatus.toLowerCase();
        state.callDuration = CallDuration;
        state.lastCallStatusUpdate = new Date();

        // Mark as completed if call finished
        if (CallStatus === 'completed') {
            state.callCompleted = true;
            console.log(`✅ Call completed for session ${sessionId} - Duration: ${CallDuration}s`);
        } else if (CallStatus === 'no-answer') {
            state.callStatus = 'no-answer';
            console.log(`❌ Call not answered for session ${sessionId}`);
        } else if (CallStatus === 'busy') {
            state.callStatus = 'busy';
            console.log(`📵 Line busy for session ${sessionId}`);
        } else if (CallStatus === 'failed') {
            state.callStatus = 'failed';
            console.log(`❌ Call failed for session ${sessionId}`);
        }

        conversationStates.set(sessionId, state);

        res.sendStatus(200);

    } catch (error) {
        console.error('Error handling call status webhook:', error);
        res.sendStatus(500);
    }
};

/**
 * ✅ Update conversation call status (called by callController webhook)
 * This allows the existing /api/calls/status webhook to update chatbot state
 */
export const updateConversationCallStatus = async (sessionId, statusData) => {
    try {
        const { callSid, callStatus, callDuration, timestamp } = statusData;
        
        const state = conversationStates.get(sessionId);
        
        if (!state) {
            console.warn(`⚠️ No conversation state found for session: ${sessionId}`);
            return { success: false, error: 'Session not found' };
        }

        // Update call status
        state.callStatus = callStatus;
        state.callDuration = callDuration;
        state.lastCallStatusUpdate = timestamp;

        // Mark as completed if call finished
        if (callStatus === 'completed') {
            state.callCompleted = true;
            console.log(`✅ Call completed for chatbot session ${sessionId} - Duration: ${callDuration}s`);
        } else if (callStatus === 'no-answer' || callStatus === 'no_answer') {
            state.callStatus = 'no-answer';
            console.log(`❌ Call not answered for session ${sessionId}`);
        } else if (callStatus === 'busy') {
            state.callStatus = 'busy';
            console.log(`📵 Line busy for session ${sessionId}`);
        } else if (callStatus === 'failed') {
            state.callStatus = 'failed';
            console.log(`❌ Call failed for session ${sessionId}`);
        }

        conversationStates.set(sessionId, state);

        return { success: true };

    } catch (error) {
        console.error('Error updating conversation call status:', error);
        return { success: false, error: error.message };
    }
};

export default {
    initializeChat,
    sendMessage,
    getConversationHistory,
    getChatAnalytics,
    updateConversationCallStatus
};