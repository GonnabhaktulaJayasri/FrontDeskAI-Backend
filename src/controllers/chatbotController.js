
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
const SYSTEM_PROMPT = `You are a friendly, intelligent, and professional healthcare virtual assistant for Orion West Medical practice. 

**INITIAL GREETING:**
When a user joins the chat, greet them warmly:
"Hello! Thank you for reaching out to Orion West Medical. I'm your virtual assistant. How can I help you today?"

After the user responds to your greeting, politely ask: "Have you visited our practice before?"

**HANDLING RETURNING PATIENTS (User says "Yes"):**
1. Ask for their registered phone number to locate their record in the EMR system
2. If their details are found in EMR:
   - Greet them warmly by name
   - Ask how you can assist them today
   - Help with: checking appointments, rescheduling, canceling, updating details, or answering questions
3. If their record is NOT found:
   - Politely inform them their phone number wasn't found
   - Ask if they would like to create a new patient record

**CHECKING APPOINTMENTS:**
When user asks about their appointments:
- "What are my appointments?"
- "Do I have any appointments?"
- "When is my next appointment?"
System will automatically retrieve and display their upcoming appointments with:
- Date and time
- Doctor name and specialty
- Reason for visit
- Appointment status
If no appointments: Offer to book one

**HANDLING NEW PATIENTS (User says "No"):**
1. Start collecting necessary details ONE BY ONE in this order:
   - First name
   - Last name
   - Phone number
   - Email address
   - Age
   - Gender (Male/Female/Other)
   - Date of birth (MM/DD/YYYY)
2. After collecting all details, system will automatically create the record
3. Thank them and say: "Thank you! Your patient record has been created successfully. How can I assist you further today?"

**APPOINTMENT BOOKING:**
When user wants to book an appointment:
1. First ask: "Who would you like to book this appointment for?"
   - Yourself
   - A family member
   - Someone in your care (e.g., elderly parent, child)
2. If booking for someone else:
   - Ask for their details (name, age, relationship)
   - Confirm the callback number (their number or patient's number)
3. Then say: "I'll initiate a call right now to confirm the details and complete your appointment booking."

**APPOINTMENT MANAGEMENT:**
- **Scheduling/Booking**: Say "I'll call you now to complete your appointment booking."
- **Rescheduling**: Say "I'll call you now to reschedule your appointment to a more convenient time."
- **Canceling**: Say "I understand. I'll call you to confirm the cancellation."

**UPDATING PATIENT DETAILS:**
1. Ask which information they want to change (email, phone, address, etc.)
2. Request the new information
3. System will update in EMR directly
4. Confirm: "I've successfully updated your [field] to [new value]. Your information has been updated in our medical records system."

**ANSWERING QUERIES:**
- Appointments: Check their record and provide accurate appointment information
- Services: Provide information about available medical services
- Doctors: Share information about available doctors and specialties
- Clinic timings: Provide accurate timing information
- General questions: Answer helpfully and professionally

**CONVERSATION GUIDELINES:**
- Always maintain a polite and empathetic tone
- NEVER repeat information already provided
- Ensure all actions are confirmed before proceeding
- Keep responses concise (2-4 sentences)
- Sound natural and professional
- Handle both new and returning patients smoothly

**CLOSING CONVERSATIONS:**
When user says "thank you", "no more questions", "that's all", "nothing else", or similar:
End gracefully: "You're most welcome! It was a pleasure assisting you today. Take care and have a great day!"

**CRITICAL RULES:**
- One question at a time - don't overwhelm patients
- Always confirm actions before executing
- Be warm but professional
- Never make up information
- If unsure, offer to have staff call them
- Respect patient privacy

Remember: You represent Orion West Medical - be helpful, accurate, and caring in every interaction.`;

/**
 * ✅ Check if we have all required patient information
 */
function checkIfHasRequiredPatientInfo(patientData) {
    const required = ['firstName', 'lastName', 'phone', 'email', 'age', 'gender', 'dob'];
    const critical = ['firstName', 'lastName', 'phone', 'email'];
    
    const missing = [];
    const present = [];
    const criticalMissing = [];
    
    for (const field of required) {
        if (!patientData[field] || patientData[field].toString().trim() === '') {
            missing.push(field);
            if (critical.includes(field)) {
                criticalMissing.push(field);
            }
        } else {
            present.push(field);
        }
    }
    
    const canCreate = criticalMissing.length === 0;
    const complete = missing.length === 0;
    
    return {
        complete: complete,
        canCreate: canCreate,
        missing: missing,
        criticalMissing: criticalMissing,
        present: present,
        percentComplete: Math.round((present.length / required.length) * 100)
    };
}

/**
 * Initialize chat conversation
 */
export const initializeChat = async (req, res) => {
    try {
        const sessionId = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const context = await gatherContextualInformation(req);

        conversationStates.set(sessionId, {
            stage: 'greeting',
            patientData: {},
            appointmentData: {
                bookingFor: null,
                patientName: null,
                patientAge: null,
                relationship: null,
                callbackNumber: null
            },
            messages: [],
            context: context,
            startTime: new Date(),
            lastActivity: new Date(),
            callStatus: null,
            callAttempted: false,
            appointmentInfoShared: false,
            conversationEnding: false,
            updateMode: null,
            pendingUpdate: null
        });

        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "user", content: "User just joined the chat. Greet them warmly as instructed." }
            ],
            temperature: 0.7,
            max_tokens: 150
        });

        const aiMessage = completion.choices[0].message.content;

        const state = conversationStates.get(sessionId);
        state.messages.push(
            { role: "system", content: SYSTEM_PROMPT },
            { role: "assistant", content: aiMessage }
        );
        conversationStates.set(sessionId, state);

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

        let state = conversationStates.get(sessionId);
        if (!state) {
            return res.status(404).json({
                success: false,
                error: 'Session not found. Please refresh and start a new chat.'
            });
        }

        if (!state.patientData) {
            state.patientData = {};
        }

        state.messages.push({ role: "user", content: message });

        const lowerMessage = message.toLowerCase().trim();
        
        // ==================== ✅ DETECT "NO" RESPONSE (NEW PATIENT) ====================
        if (state.stage === 'greeting' && (lowerMessage === 'no' || lowerMessage === 'nope' || 
            lowerMessage === 'no.' || lowerMessage === 'no!' || lowerMessage.includes('never been') ||
            lowerMessage.includes('first time') || lowerMessage.includes('haven\'t visited'))) {
            
            console.log(`🆕 User indicates they're a new patient`);
            state.stage = 'awaiting_phone_new_patient';
            state.patientData.isNewPatient = true;
            
            const welcomeMessage = "Welcome! We're excited to have you! To get started, what's your first name?";
            
            state.messages.push({ role: "assistant", content: welcomeMessage });
            state.lastActivity = new Date();
            conversationStates.set(sessionId, state);

            return res.json({
                success: true,
                message: welcomeMessage,
                stage: state.stage,
                patientData: state.patientData || {}
            });
        }

        // ==================== ✅ HANDLE "NO" DURING BOOKING ====================
        if (state.stage === 'booking_checking_existing' && (lowerMessage === 'no' || lowerMessage === 'nope' || 
            lowerMessage === 'no.' || lowerMessage === 'no!' || lowerMessage.includes('never been') ||
            lowerMessage.includes('first time') || lowerMessage.includes('haven\'t visited'))) {
            
            console.log(`🆕 New patient booking appointment`);
            state.stage = 'awaiting_phone_new_patient';
            state.patientData.isNewPatient = true;
            
            const welcomeMessage = "Welcome! We're excited to have you! To get started, what's your first name?";
            
            state.messages.push({ role: "assistant", content: welcomeMessage });
            state.lastActivity = new Date();
            conversationStates.set(sessionId, state);

            return res.json({
                success: true,
                message: welcomeMessage,
                stage: state.stage,
                patientData: state.patientData || {}
            });
        }

        // ==================== ✅ HANDLE "YES" DURING BOOKING ====================
        if (state.stage === 'booking_checking_existing' && (lowerMessage === 'yes' || lowerMessage === 'yep' || 
            lowerMessage === 'yes.' || lowerMessage === 'yes!' || lowerMessage.includes('i have') ||
            lowerMessage.includes('i\'ve visited'))) {
            
            console.log(`🔍 Existing patient booking appointment, asking for phone`);
            
            const askPhoneMessage = "Great! Could you please provide me with your registered phone number so I can locate your record?";
            
            state.messages.push({ role: "assistant", content: askPhoneMessage });
            state.stage = 'awaiting_phone_for_booking';
            state.lastActivity = new Date();
            conversationStates.set(sessionId, state);

            return res.json({
                success: true,
                message: askPhoneMessage,
                stage: state.stage,
                patientData: state.patientData || {}
            });
        }

        // ==================== ✅ CHECK FOR CLOSING PHRASES ====================
        const closingPhrases = [
            'nothing', 'nothing thanks', 'nothing thank you', 'no thanks',
            'that\'s all', 'that\'s it', 'thanks', 'thank you', 
            'bye', 'goodbye', 'see you', 'all set',
            'no more questions', 'nothing else', 'that\'s everything',
            'i\'m good', 'all good', 'that helps'
        ];

        const isClosing = closingPhrases.some(phrase => {
            return lowerMessage === phrase || 
                   lowerMessage === phrase + '.' ||
                   lowerMessage === phrase + '!';
        });

        // ✅ Allow closing after patient creation or appointment info shared
        if (isClosing && (state.appointmentInfoShared || state.stage === 'patient_created')) {
            state.conversationEnding = true;
            
            const closingMessage = "You're most welcome! It was a pleasure assisting you today. Take care and have a great day!";
            
            state.messages.push({ role: "assistant", content: closingMessage });
            state.lastActivity = new Date();
            conversationStates.set(sessionId, state);

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

        if (extractedInfo) {
            if (extractedInfo.phone) {
                extractedInfo.phone = normalizePhoneNumber(extractedInfo.phone);
            }
            state.patientData = { ...state.patientData, ...extractedInfo };
        }

        // ==================== ✅ CHECK IF WE HAVE ENOUGH INFO TO CREATE NEW PATIENT ====================
        if (state.stage === 'new_patient_registration' && state.patientData.notFoundInSystem) {
            const hasRequiredInfo = checkIfHasRequiredPatientInfo(state.patientData);
            
            if (hasRequiredInfo.complete && !state.patientData.patientId) {  // ← Added check
                console.log(`✅ All required patient info collected, creating patient...`);
                
                try {
                    const createResult = await fhirSearchService.createNewPatientWithSync(state.patientData);
                    
                    if (createResult.success) {
                        state.patientData.isExisting = true;
                        state.patientData.notFoundInSystem = false;
                        state.patientData.patientId = createResult.patient._id;
                        state.patientData.fhirId = createResult.patient.fhirId;
                        state.patientData.fhirSyncStatus = createResult.patient.fhirSyncStatus;
                        state.patientData.patientSource = 'newly_created';
                        state.stage = 'patient_created';  // ← Change stage to prevent re-creation
                        
                        console.log(`✅ New patient created: ${createResult.patient._id}`);
                        console.log(`   FHIR ID: ${createResult.patient.fhirId || 'pending'}`);
                        
                        const confirmationMessage = `Thank you! Your patient record has been created successfully. ${createResult.fhirSynced ? 'Your information has been synced to our medical records. ' : ''}How can I assist you further today?`;
                        
                        state.messages.push({ role: "assistant", content: confirmationMessage });
                        state.lastActivity = new Date();
                        state.appointmentInfoShared = true;  // ← Mark as complete so closing works
                        conversationStates.set(sessionId, state);

                        return res.json({
                            success: true,
                            message: confirmationMessage,
                            stage: state.stage,
                            patientData: state.patientData || {},
                            patientCreated: true,
                            fhirSynced: createResult.fhirSynced
                        });
                        
                    } else {
                        console.error(`❌ Failed to create patient:`, createResult.error);
                    }
                } catch (createError) {
                    console.error(`❌ Error creating patient:`, createError);
                }
            } else if (state.patientData.patientId) {
                console.log(`✅ Patient already created, skipping re-creation`);
            } else {
                console.log(`📝 Still collecting patient info. Missing: ${hasRequiredInfo.missing.join(', ')}`);
            }
        }

        // ==================== ✅ CHECK EMR WHEN PHONE IS PROVIDED ====================
        const shouldCheckEMR = state.patientData.phone && 
                               !state.patientData.isExisting && 
                               !state.patientData.checkedDatabase &&
                               !state.patientData.isNewPatient;
        
        if (shouldCheckEMR) {
            const normalizedPhone = normalizePhoneNumber(state.patientData.phone);
            console.log(`🔍 Checking FHIR/EMR for patient with phone: ${normalizedPhone}`);

            const fhirResult = await fhirSearchService.findOrImportPatientByPhone(normalizedPhone);

            state.patientData.checkedDatabase = true;

            if (fhirResult.success) {
                const existingPatient = fhirResult.patient;

                state.patientData.isExisting = true;
                state.patientData.patientId = existingPatient._id;
                state.patientData.fhirId = existingPatient.fhirId;
                state.patientData.existingInfo = {
                    firstName: existingPatient.firstName,
                    lastName: existingPatient.lastName,
                    name: `${existingPatient.firstName} ${existingPatient.lastName}`,
                    email: existingPatient.email,
                    phone: existingPatient.phone,
                    age: existingPatient.age,
                    dob: existingPatient.dob,
                    gender: existingPatient.gender,
                    address: existingPatient.address
                };
                
                // Check if patient has incomplete data from FHIR
                if (existingPatient.incompleteFromFHIR) {
                    state.patientData.needsDataCompletion = true;
                    console.log(`⚠️ Patient has incomplete data from FHIR, will ask to complete profile`);
                }

                state.stage = 'patient_found';
                console.log(`✅ Patient found in EMR: ${existingPatient.firstName} ${existingPatient.lastName}`);
                
                // ✅ If we were in booking flow, continue with booking
                if (state.pendingBooking) {
                    console.log(`📅 Resuming booking flow for found patient`);
                    state.bookingInitiated = true;
                    state.stage = 'booking_appointment';
                    state.pendingBooking = false;
                    
                    const bookingMessage = `Welcome back, ${existingPatient.firstName}! Who would you like to book this appointment for? (Yourself, a family member, or someone in your care)`;
                    
                    state.messages.push({ role: "assistant", content: bookingMessage });
                    conversationStates.set(sessionId, state);

                    return res.json({
                        success: true,
                        message: bookingMessage,
                        stage: state.stage,
                        patientData: state.patientData || {},
                        appointmentData: state.appointmentData
                    });
                }
            } else {
                console.log(`❌ Patient not found with phone: ${normalizedPhone}`);
                state.patientData.isExisting = false;
                state.patientData.notFoundInSystem = true;
                state.stage = 'new_patient_registration';
            }
        } else if (state.patientData.isNewPatient && state.patientData.phone) {
            console.log(`🆕 New patient confirmed - skipping EMR check`);
            state.patientData.checkedDatabase = true;
            state.patientData.notFoundInSystem = true;
            state.stage = 'new_patient_registration';
        }

        // ==================== ✅ CHECK APPOINTMENTS (NEW FEATURE) ====================
        const appointmentCheckIntent = detectAppointmentCheckIntent(message);
        
        if (appointmentCheckIntent && state.patientData.isExisting && state.patientData.patientId) {
            console.log(`📅 Checking appointments for patient: ${state.patientData.patientId}`);
            
            try {
                const appointmentsResult = await checkPatientAppointments(state.patientData.patientId);
                
                if (appointmentsResult.success) {
                    state.appointmentInfoShared = true;
                    
                    let appointmentMessage = '';
                    
                    if (appointmentsResult.totalUpcoming === 0) {
                        appointmentMessage = "You don't have any upcoming appointments scheduled at the moment. Would you like to book an appointment?";
                    } else if (appointmentsResult.totalUpcoming === 1) {
                        const apt = appointmentsResult.upcoming[0];
                        const aptDate = new Date(apt.dateTime).toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        });
                        const aptTime = new Date(apt.dateTime).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit'
                        });
                        
                        appointmentMessage = `You have 1 upcoming appointment:\n\n📅 ${aptDate} at ${aptTime}\n👨‍⚕️ Doctor: ${apt.doctor.name}${apt.doctor.specialty ? ` (${apt.doctor.specialty})` : ''}\n📋 Reason: ${apt.reason || 'General consultation'}\n✅ Status: ${apt.status}\n\nIs there anything else I can help you with?`;
                    } else {
                        appointmentMessage = `You have ${appointmentsResult.totalUpcoming} upcoming appointments:\n\n`;
                        
                        appointmentsResult.upcoming.slice(0, 3).forEach((apt, index) => {
                            const aptDate = new Date(apt.dateTime).toLocaleDateString('en-US', {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric'
                            });
                            const aptTime = new Date(apt.dateTime).toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit'
                            });
                            
                            appointmentMessage += `${index + 1}. ${aptDate} at ${aptTime} with Dr. ${apt.doctor.name}\n`;
                        });
                        
                        if (appointmentsResult.totalUpcoming > 3) {
                            appointmentMessage += `\n...and ${appointmentsResult.totalUpcoming - 3} more.\n`;
                        }
                        
                        appointmentMessage += '\nWould you like to reschedule or cancel any of these?';
                    }
                    
                    state.messages.push({ role: "assistant", content: appointmentMessage });
                    state.lastActivity = new Date();
                    conversationStates.set(sessionId, state);

                    return res.json({
                        success: true,
                        message: appointmentMessage,
                        stage: state.stage,
                        patientData: state.patientData || {},
                        appointments: appointmentsResult.upcoming,
                        totalAppointments: appointmentsResult.totalUpcoming
                    });
                } else {
                    console.error(`❌ Failed to retrieve appointments:`, appointmentsResult.error);
                }
            } catch (appointmentError) {
                console.error(`❌ Error checking appointments:`, appointmentError);
            }
        }

        // ==================== ✅ DETECT UPDATE INTENT (FIXED - EMR FIRST) ====================
        const updateIntent = detectUpdateIntent(message, state);
        
        if (updateIntent.isUpdate && state.patientData.isExisting && state.patientData.patientId) {
            console.log(`📝 Update intent detected: ${updateIntent.field} = ${updateIntent.value}`);
            
            if (updateIntent.value) {
                console.log(`🔄 Processing update for field: ${updateIntent.field}`);
                
                // Clear update mode
                state.updateMode = null;
                
                // ✅ UPDATE IN EMR FIRST USING NEW METHOD
                const updateResult = await fhirSearchService.updatePatientInEMR(
                    state.patientData.patientId,
                    updateIntent.field,
                    updateIntent.value
                );

                if (updateResult.success) {
                    console.log(`✅ Update successful in EMR and MongoDB`);
                    
                    // Update local state
                    if (state.patientData.existingInfo) {
                        state.patientData.existingInfo[updateIntent.field] = updateIntent.value;
                    }
                    
                    const aiMessage = `Perfect! I've updated your ${updateIntent.field} to ${updateIntent.value}. ${updateResult.fhirSynced ? 'This has been updated in our medical records system.' : ''} Is there anything else I can help you with?`;
                    
                    state.messages.push({ role: "assistant", content: aiMessage });
                    state.lastActivity = new Date();
                    conversationStates.set(sessionId, state);

                    return res.json({
                        success: true,
                        message: aiMessage,
                        stage: state.stage,
                        patientData: state.patientData || {},
                        updateCompleted: true,
                        fhirSynced: updateResult.fhirSynced
                    });
                } else {
                    console.error(`❌ Failed to update patient:`, updateResult.error);
                    const errorMessage = `I'm sorry, I encountered an issue updating your ${updateIntent.field}. Please try again or contact our office directly.`;
                    
                    state.messages.push({ role: "assistant", content: errorMessage });
                    conversationStates.set(sessionId, state);

                    return res.json({
                        success: false,
                        message: errorMessage,
                        stage: state.stage,
                        patientData: state.patientData || {},
                        error: updateResult.error
                    });
                }
            } else {
                // Ask for the value
                console.log(`❓ Asking user for new ${updateIntent.field} value`);
                const askMessage = `What would you like to change your ${updateIntent.field} to?`;
                state.updateMode = updateIntent.field;
                
                state.messages.push({ role: "assistant", content: askMessage });
                state.lastActivity = new Date();
                conversationStates.set(sessionId, state);

                return res.json({
                    success: true,
                    message: askMessage,
                    stage: state.stage,
                    patientData: state.patientData || {},
                    awaitingUpdateValue: true,
                    updateField: updateIntent.field
                });
            }
        }

        // ==================== ✅ ENHANCED BOOKING WITH RELATIONSHIP DETECTION ====================
        const bookingIntent = detectBookingIntent(message, state);
        
        if (bookingIntent.hasIntent && !state.bookingInitiated) {
            console.log(`📅 Appointment booking intent detected`);
            
            // ✅ CHECK IF PATIENT IS ALREADY IDENTIFIED
            if (!state.patientData.isExisting && !state.patientData.checkedDatabase) {
                console.log(`❓ Patient not identified yet, asking if they've visited before`);
                
                const askMessage = "I'd be happy to help you book an appointment! First, have you visited our practice before?";
                
                state.messages.push({ role: "assistant", content: askMessage });
                state.stage = 'booking_checking_existing';
                state.pendingBooking = true;
                conversationStates.set(sessionId, state);

                return res.json({
                    success: true,
                    message: askMessage,
                    stage: state.stage,
                    patientData: state.patientData || {}
                });
            }
            
            // Patient is identified, proceed with booking
            if (bookingIntent.bookingFor && bookingIntent.bookingFor !== 'self') {
                state.appointmentData.bookingFor = bookingIntent.bookingFor;
                state.appointmentData.relationship = bookingIntent.relationship;
                state.appointmentData.patientName = bookingIntent.patientName;
                
                console.log(`📝 Booking for: ${bookingIntent.bookingFor} (${bookingIntent.relationship})`);
            }
            
            state.stage = 'booking_appointment';
            state.bookingInitiated = true;
            
            if (!state.appointmentData.bookingFor) {
                const askMessage = "Who would you like to book this appointment for? (Yourself, a family member, or someone in your care)";
                
                state.messages.push({ role: "assistant", content: askMessage });
                conversationStates.set(sessionId, state);

                return res.json({
                    success: true,
                    message: askMessage,
                    stage: state.stage,
                    patientData: state.patientData || {},
                    appointmentData: state.appointmentData
                });
            }
        }

        // ==================== ✅ DETECT WHO APPOINTMENT IS FOR ====================
        if (state.stage === 'booking_appointment' && !state.appointmentData.bookingFor) {
            const bookingForIntent = detectBookingForWhom(message);
            
            if (bookingForIntent.detected) {
                state.appointmentData.bookingFor = bookingForIntent.bookingFor;
                state.appointmentData.relationship = bookingForIntent.relationship;
                state.appointmentData.patientName = bookingForIntent.patientName;
                
                console.log(`📝 Appointment for: ${bookingForIntent.bookingFor}`);
                
                if (bookingForIntent.bookingFor !== 'self') {
                    const detailsMessage = `Great! To book an appointment for your ${bookingForIntent.relationship}, I'll need a few details. What's their full name?`;
                    
                    state.messages.push({ role: "assistant", content: detailsMessage });
                    conversationStates.set(sessionId, state);

                    return res.json({
                        success: true,
                        message: detailsMessage,
                        stage: 'collecting_appointment_details',
                        patientData: state.patientData || {},
                        appointmentData: state.appointmentData
                    });
                }
            }
        }

        // ==================== ✅ MAKE CALL IF CONDITIONS MET ====================
        let callInitiated = false;
        let callStatusMessage = null;

        if (shouldMakeCallNow(state)) {
            try {
                const hospitalId = req.hospitalId || process.env.DEFAULT_HOSPITAL_ID;
                
                let callbackNumber = state.patientData.phone;
                if (state.appointmentData.callbackNumber) {
                    callbackNumber = state.appointmentData.callbackNumber;
                }
                
                const callResult = await initiateAppointmentCall(
                    state.patientData, 
                    hospitalId, 
                    sessionId,
                    state.appointmentData
                );
                
                state.callAttempted = true;
                state.callInitiated = true;
                callInitiated = true;
                
                if (state.appointmentData.bookingFor === 'self') {
                    callStatusMessage = `I'll initiate a call right now to confirm the details and complete your appointment booking. Please keep your phone handy! 📞`;
                } else {
                    const relationship = state.appointmentData.relationship || 'patient';
                    callStatusMessage = `I'll call you now to discuss the appointment details for your ${relationship}. Please keep your phone handy! 📞`;
                }
            } catch (callError) {
                console.error('Failed to initiate call:', callError);
                callStatusMessage = `I'm having trouble making the call. Please call our office directly.`;
            }
        }

        // ==================== GENERATE AI RESPONSE ====================
        let aiMessage;

        if (callInitiated && callStatusMessage) {
            aiMessage = callStatusMessage;
        } else {
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
            appointmentData: state.appointmentData || {},
            callInitiated: callInitiated
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

// ==================== HELPER FUNCTIONS ====================

/**
 * ✅ Detect if user is asking about their appointments
 */
function detectAppointmentCheckIntent(message) {
    const lowerMessage = message.toLowerCase().trim();
    
    const appointmentCheckPhrases = [
        'what are my appointments',
        'do i have any appointments',
        'show my appointments',
        'check my appointments',
        'my appointments',
        'upcoming appointments',
        'when is my appointment',
        'when is my next appointment',
        'do i have an appointment',
        'any appointments',
        'appointment schedule',
        'what appointments do i have',
        'tell me my appointments',
        'list my appointments'
    ];
    
    return appointmentCheckPhrases.some(phrase => lowerMessage.includes(phrase));
}

/**
 * ✅ Detect update intent
 */
function detectUpdateIntent(message, state) {
    const lowerMessage = message.toLowerCase().trim();
    
    const updatePatterns = {
        email: [
            'update my email', 'change my email', 'update email', 'change email',
            'new email', 'different email', 'correct email'
        ],
        phone: [
            'update my phone', 'change my phone', 'update phone number', 
            'change phone number', 'new phone', 'different phone', 'correct phone'
        ],
        address: [
            'update my address', 'change my address', 'update address',
            'change address', 'new address', 'different address'
        ],
        firstName: [
            'update my first name', 'change my first name', 'update first name',
            'change first name', 'first name', 'firstname'
        ],
        lastName: [
            'update my last name', 'change my last name', 'update last name',
            'change last name', 'last name', 'lastname', 'surname'
        ],
        age: [
            'update my age', 'change my age', 'update age', 'change age'
        ],
        gender: [
            'update my gender', 'change my gender', 'update gender', 'change gender'
        ]
    };

    for (const [field, patterns] of Object.entries(updatePatterns)) {
        for (const pattern of patterns) {
            if (lowerMessage.includes(pattern)) {
                let value = null;
                
                if (field === 'email') {
                    const emailMatch = message.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
                    if (emailMatch) value = emailMatch[0];
                } else if (field === 'phone') {
                    const phonePatterns = [
                        /\b(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/,
                        /\b\d{10}\b/
                    ];
                    for (const phonePattern of phonePatterns) {
                        const phoneMatch = message.match(phonePattern);
                        if (phoneMatch) {
                            value = normalizePhoneNumber(phoneMatch[0]);
                            break;
                        }
                    }
                }
                // For other fields, value will be extracted from next message
                
                return { isUpdate: true, field, value };
            }
        }
    }
    
    // Check if we're in update mode and user is providing the value
    if (state.updateMode) {
        console.log(`📝 User providing value for ${state.updateMode}: ${message}`);
        
        let value = message.trim();
        
        // Handle phrases like "change to X", "update to X", "set to X"
        const valueExtractionPatterns = [
            /change\s+(?:it\s+)?to\s+(.+)/i,
            /update\s+(?:it\s+)?to\s+(.+)/i,
            /set\s+(?:it\s+)?to\s+(.+)/i,
            /make\s+it\s+(.+)/i,
            /new\s+(?:one\s+is\s+)?(.+)/i
        ];
        
        for (const pattern of valueExtractionPatterns) {
            const match = message.match(pattern);
            if (match && match[1]) {
                value = match[1].trim();
                console.log(`   Extracted value from pattern: "${value}"`);
                break;
            }
        }
        
        console.log(`   Final value: "${value}"`);
        
        return { 
            isUpdate: true, 
            field: state.updateMode, 
            value: value 
        };
    }
    
    return { isUpdate: false };
}

/**
 * ✅ Detect booking intent with relationship
 */
function detectBookingIntent(message, state) {
    const lowerMessage = message.toLowerCase().trim();
    
    const bookingPhrases = [
        'book an appointment', 'schedule an appointment', 'make an appointment',
        'need an appointment', 'want an appointment', 'see a doctor',
        'book appointment', 'schedule appointment', 'appointment please'
    ];
    
    const hasIntent = bookingPhrases.some(phrase => lowerMessage.includes(phrase));
    
    if (!hasIntent) {
        return { hasIntent: false };
    }
    
    // Check if booking for someone else
    const bookingForPatterns = {
        family: {
            patterns: ['my mom', 'my mother', 'my dad', 'my father', 'my son', 'my daughter', 
                      'my wife', 'my husband', 'my child', 'my kid', 'my parent', 
                      'my grandmother', 'my grandfather', 'my sister', 'my brother'],
            extractRelationship: (match) => match.replace('my ', '')
        },
        care: {
            patterns: ['patient in my care', 'elderly parent', 'dependent', 'someone i care for'],
            extractRelationship: () => 'person in care'
        }
    };
    
    for (const [type, config] of Object.entries(bookingForPatterns)) {
        for (const pattern of config.patterns) {
            if (lowerMessage.includes(pattern)) {
                return {
                    hasIntent: true,
                    bookingFor: type,
                    relationship: config.extractRelationship(pattern),
                    patientName: null
                };
            }
        }
    }
    
    return {
        hasIntent: true,
        bookingFor: 'self',
        relationship: null,
        patientName: null
    };
}

/**
 * ✅ Detect who the appointment is for
 */
function detectBookingForWhom(message) {
    const lowerMessage = message.toLowerCase().trim();
    
    if (lowerMessage.includes('myself') || lowerMessage.includes('for me') || 
        lowerMessage === 'me' || lowerMessage === 'self') {
        return {
            detected: true,
            bookingFor: 'self',
            relationship: null,
            patientName: null
        };
    }
    
    const familyPatterns = [
        { pattern: /my (mom|mother|mum)/i, relationship: 'mother' },
        { pattern: /my (dad|father)/i, relationship: 'father' },
        { pattern: /my son/i, relationship: 'son' },
        { pattern: /my daughter/i, relationship: 'daughter' },
        { pattern: /my (wife|spouse)/i, relationship: 'wife' },
        { pattern: /my husband/i, relationship: 'husband' },
        { pattern: /my (child|kid)/i, relationship: 'child' },
        { pattern: /my (grandmother|grandma)/i, relationship: 'grandmother' },
        { pattern: /my (grandfather|grandpa)/i, relationship: 'grandfather' },
        { pattern: /my sister/i, relationship: 'sister' },
        { pattern: /my brother/i, relationship: 'brother' }
    ];
    
    for (const { pattern, relationship } of familyPatterns) {
        if (pattern.test(message)) {
            return {
                detected: true,
                bookingFor: 'family',
                relationship: relationship,
                patientName: null
            };
        }
    }
    
    if (lowerMessage.includes('patient in my care') || 
        lowerMessage.includes('someone i care for') ||
        lowerMessage.includes('dependent')) {
        return {
            detected: true,
            bookingFor: 'care',
            relationship: 'person in care',
            patientName: null
        };
    }
    
    return { detected: false };
}

/**
 * ✅ Check patient's upcoming appointments
 */
async function checkPatientAppointments(patientId) {
    try {
        const now = new Date();
        const upcomingAppointments = await Appointment.find({
            patient: patientId,
            dateTime: { $gte: now },
            status: { $in: ['scheduled', 'confirmed'] }
        }).populate('doctor', 'name specialty').sort({ dateTime: 1 }).limit(10);

        return {
            success: true,
            upcoming: upcomingAppointments,
            totalUpcoming: upcomingAppointments.length
        };
    } catch (error) {
        console.error('Error checking appointments:', error);
        return { success: false, error: error.message };
    }
}

function shouldMakeCallNow(state) {
    const hasPhone = state.patientData?.phone;
    const bookingInitiated = state.bookingInitiated || state.stage === 'booking_appointment';
    const notAttempted = !state.callAttempted;
    
    if (state.appointmentData?.bookingFor === 'self') {
        return notAttempted && hasPhone && bookingInitiated;
    }
    
    if (state.appointmentData?.bookingFor) {
        const hasRelationship = state.appointmentData.relationship;
        return notAttempted && hasPhone && hasRelationship && bookingInitiated;
    }
    
    return notAttempted && hasPhone && bookingInitiated;
}

async function initiateAppointmentCall(patientData, hospitalId, sessionId, appointmentData = {}) {
    const phoneNumber = normalizePhoneNumber(patientData.phone);
    
    const metadata = {
        sessionId,
        source: 'chatbot',
        bookingFor: appointmentData.bookingFor || 'self',
        relationship: appointmentData.relationship,
        patientName: appointmentData.patientName
    };
    
    const result = await callService.makeOutboundCall({
        phoneNumber,
        patientId: patientData.patientId || null,
        hospitalId,
        reason: appointmentData.bookingFor === 'self' 
            ? 'Appointment booking' 
            : `Appointment booking for ${appointmentData.relationship}`,
        callType: 'general',
        metadata
    });

    if (result.success) {
        return { success: true, callSid: result.call?.sid };
    }
    throw new Error(result.error || 'Failed to initiate call');
}

async function extractPatientInfo(message, state) {
    try {
        // Build context about what we're collecting
        const missingFields = checkIfHasRequiredPatientInfo(state.patientData).missing;
        const lastBotMessage = state.messages[state.messages.length - 1]?.content || '';
        
        // Determine which field we're asking for based on last bot message
        let expectedField = null;
        if (lastBotMessage.toLowerCase().includes('first name')) {
            expectedField = 'firstName';
        } else if (lastBotMessage.toLowerCase().includes('last name')) {
            expectedField = 'lastName';
        } else if (lastBotMessage.toLowerCase().includes('email')) {
            expectedField = 'email';
        } else if (lastBotMessage.toLowerCase().includes('phone')) {
            expectedField = 'phone';
        } else if (lastBotMessage.toLowerCase().includes('age')) {
            expectedField = 'age';
        } else if (lastBotMessage.toLowerCase().includes('gender')) {
            expectedField = 'gender';
        } else if (lastBotMessage.toLowerCase().includes('date of birth') || lastBotMessage.toLowerCase().includes('dob')) {
            expectedField = 'dob';
        }
        
        console.log(`🔍 Extracting patient info. Expected field: ${expectedField}, Missing: ${missingFields.join(', ')}`);
        
        // If we know what field we're expecting, use it directly
        if (expectedField && missingFields.includes(expectedField)) {
            const extracted = {};
            extracted[expectedField] = message.trim();
            
            console.log(`✅ Direct extraction: ${expectedField} = "${message.trim()}"`);
            return extracted;
        }
        
        // Otherwise, use AI to extract
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: "Extract information and return only valid JSON. Map the user's response to the correct field based on context." },
                { 
                    role: "user", 
                    content: `Context: We just asked "${lastBotMessage}". Missing fields: ${missingFields.join(', ')}. User responded: "${message}". Extract patient info. Return JSON with appropriate field: firstName, lastName, phone, email, age, dob, or gender.` 
                }
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
                if (value && value !== "" && !state.patientData[key]) {
                    newData[key] = value;
                }
            }
            
            console.log(`✅ AI extraction:`, newData);
            return Object.keys(newData).length > 0 ? newData : null;
        }
        return null;
    } catch (error) {
        console.error('Error extracting info:', error);
        return null;
    }
}

function buildContextMessage(state) {
    let context = `Stage: ${state.stage}\n`;

    if (state.stage === 'awaiting_phone_new_patient') {
        context += `\nUser is NEW patient. Collecting details one by one.\n`;
    }

    if (state.patientData.notFoundInSystem && state.stage === 'new_patient_registration') {
        const infoCheck = checkIfHasRequiredPatientInfo(state.patientData);
        context += `\nNEW PATIENT REGISTRATION (${infoCheck.percentComplete}% complete)\n`;
        context += `Have: ${infoCheck.present.join(', ')}\n`;
        context += `Need: ${infoCheck.missing.join(', ')}\n`;
        context += `Ask for NEXT missing field.\n`;
    }

    if (state.patientData.isExisting && state.patientData.existingInfo) {
        context += `\nEXISTING PATIENT: ${state.patientData.existingInfo.name}\n`;
    }

    if (state.appointmentData?.bookingFor) {
        context += `\nAPPOINTMENT BOOKING FOR: ${state.appointmentData.bookingFor}\n`;
        if (state.appointmentData.relationship) {
            context += `Relationship: ${state.appointmentData.relationship}\n`;
        }
    }

    return context;
}

async function gatherContextualInformation(req) {
    const now = new Date();
    const hour = now.getHours();
    let timeOfDay = 'day';
    if (hour >= 5 && hour < 12) timeOfDay = 'morning';
    else if (hour >= 12 && hour < 17) timeOfDay = 'afternoon';
    else if (hour >= 17 && hour < 21) timeOfDay = 'evening';
    else timeOfDay = 'night';

    return { timeOfDay, timestamp: now };
}

function logChatInitialization(sessionId, context) {
    console.log(`✅ Chat initialized: ${sessionId} at ${context.timeOfDay}`);
}

export const getChatAnalytics = async (req, res) => {
    const totalChats = conversationStates.size;
    res.json({ success: true, analytics: { totalSessions: totalChats } });
};

export const getConversationHistory = async (req, res) => {
    const { sessionId } = req.params;
    const state = conversationStates.get(sessionId);
    if (!state) return res.status(404).json({ success: false });
    res.json({ 
        success: true, 
        messages: state.messages, 
        patientData: state.patientData,
        appointmentData: state.appointmentData
    });
};

/**
 * Update conversation call status (called by callController webhook)
 */
export const updateConversationCallStatus = async (sessionId, statusData) => {
    try {
        const { callSid, callStatus, callDuration, timestamp } = statusData;
        
        const state = conversationStates.get(sessionId);
        
        if (!state) {
            console.warn(`No conversation state found for session: ${sessionId}`);
            return { success: false, error: 'Session not found' };
        }

        state.callStatus = callStatus;
        state.callDuration = callDuration;
        state.lastCallStatusUpdate = timestamp;

        if (callStatus === 'completed') {
            state.callCompleted = true;
            console.log(`Call completed for chatbot session ${sessionId} - Duration: ${callDuration}s`);
        } else if (callStatus === 'no-answer' || callStatus === 'no_answer') {
            state.callStatus = 'no-answer';
            console.log(`Call not answered for session ${sessionId}`);
        } else if (callStatus === 'busy') {
            state.callStatus = 'busy';
            console.log(`Line busy for session ${sessionId}`);
        } else if (callStatus === 'failed') {
            state.callStatus = 'failed';
            console.log(`Call failed for session ${sessionId}`);
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