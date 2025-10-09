
import OpenAI from 'openai';
import Patient from '../models/Patient.js';
import callService from '../services/callService.js'; 

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Store conversation state (in production, use Redis or DB)
const conversationStates = new Map();

// System prompt for the chatbot
const SYSTEM_PROMPT = `You are a helpful and professional medical receptionist AI for a healthcare practice. Your role is to:

1. **Greet patients warmly** - Be friendly and welcoming
2. **Identify returning patients** - Ask if they've visited before
3. **Collect necessary information** - ONLY ask for information we don't already have
4. **Handle existing patients intelligently** - If we have their information, acknowledge them and skip to asking their reason for contacting us
5. **Have natural conversations** - When they mention needing care (checkup, sick, appointment), acknowledge it warmly and engage naturally
6. **Confirm and close** - After understanding their needs, say "We'll give you a call shortly to schedule everything" to close the conversation

**CRITICAL RULES:**
- If we have existing patient data, DO NOT ask for it again. Just say "Welcome back [Name]! What brings you in today?"
- Keep responses concise and conversational (2-3 sentences max)
- Be empathetic and professional
- When they mention needing an appointment or medical care, acknowledge it and engage naturally
- After 1-2 conversational exchanges about their needs, conclude by saying "We'll give you a call shortly to schedule/confirm everything"
- The phrase "We'll give you a call shortly" or "We'll call you shortly" signals that the conversation is ready to close and the call should be initiated

**Example flow for existing patient:**
- "Hi! Have you visited before?"
- User: "Yes"
- "Could you provide your phone number please?"
- User: "+1234567890"
- "Welcome back, John! What brings you in today?"
- User: "I need a checkup"
- "I'd be happy to help you schedule that checkup! Do you have a preferred doctor or date in mind?"
- User: "Next week with Dr. Smith"
- "Perfect! I'll help you book an appointment with Dr. Smith for a checkup next week. We'll give you a call shortly to confirm the specific date and time."
[NOW the call will be triggered]

**Example flow for new patient:**
- User: "I want to book an appointment"
- "I'd be happy to help! First, may I have your name and phone number?"
- User: "John Smith, 555-1234"
- "Thank you, John! What type of appointment do you need?"
- User: "Annual physical"
- "Perfect! We'll give you a call shortly to schedule your annual physical."
[NOW the call will be triggered]

Always respond naturally and maintain a warm, helpful tone. Let the conversation flow naturally before closing.`;

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
            messages: [],
            context: context,
            startTime: new Date(),
            lastActivity: new Date()
        });

        // Create personalized greeting based on context
        const greetingPrompt = buildIntelligentGreeting(context);

        // Create initial AI greeting
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: SYSTEM_PROMPT },
                { 
                    role: "user", 
                    content: greetingPrompt
                }
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
 * Gather contextual information for intelligent greeting
 */
async function gatherContextualInformation(req) {
    const now = new Date();
    const hour = now.getHours();
    
    // Determine time of day
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
    
    // Get day of week
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayOfWeek = daysOfWeek[now.getDay()];
    const isWeekend = now.getDay() === 0 || now.getDay() === 6;
    
    // Get user agent info
    const userAgent = req.headers['user-agent'] || '';
    const isMobile = /Mobile|Android|iPhone|iPad/i.test(userAgent);
    
    // Check for returning visitor (can be enhanced with cookies/session)
    const fingerprint = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const isReturningVisitor = await checkReturningVisitor(fingerprint);
    
    // Get referrer information
    const referrer = req.headers['referer'] || req.headers['referrer'] || 'direct';
    const isFromHomepage = referrer.includes('localhost') || referrer.includes(process.env.APP_URL);
    
    // Browser language
    const language = req.headers['accept-language']?.split(',')[0] || 'en';
    
    // Check if during business hours
    const isBusinessHours = (hour >= 8 && hour < 20) && !isWeekend;
    
    return {
        timeOfDay,
        dayOfWeek,
        isWeekend,
        isMobile,
        isReturningVisitor,
        referrer,
        isFromHomepage,
        language,
        isBusinessHours,
        currentHour: hour,
        timestamp: now
    };
}

/**
 * Check if visitor has been here before
 */
async function checkReturningVisitor(fingerprint) {
    // In production, check against database or cache
    // For now, we'll use a simple in-memory check
    if (!global.visitorFingerprints) {
        global.visitorFingerprints = new Set();
    }
    
    const isReturning = global.visitorFingerprints.has(fingerprint);
    global.visitorFingerprints.add(fingerprint);
    
    return isReturning;
}

/**
 * Build intelligent greeting based on context
 */
function buildIntelligentGreeting(context) {
    let prompt = "Start the conversation with a warm, personalized greeting. ";
    
    // Time-based greeting
    if (context.timeOfDay === 'morning') {
        prompt += "It's morning, so start with a cheerful 'Good morning!' ";
    } else if (context.timeOfDay === 'afternoon') {
        prompt += "It's afternoon, so start with 'Good afternoon!' ";
    } else if (context.timeOfDay === 'evening') {
        prompt += "It's evening, so start with 'Good evening!' ";
    } else if (context.timeOfDay === 'night') {
        prompt += "It's late at night, acknowledge that and mention we're available 24/7. ";
    }
    
    // Returning visitor
    if (context.isReturningVisitor) {
        prompt += "Welcome them back warmly ('Welcome back to CareConnect!'). ";
    } else {
        prompt += "Welcome them to CareConnect for the first time. ";
    }
    
    // Weekend/after hours
    if (!context.isBusinessHours) {
        if (context.isWeekend) {
            prompt += "Mention that even though it's the weekend, we're here to help. ";
        } else {
            prompt += "Mention that even though it's after hours, we're available to assist. ";
        }
    }
    
    // Mobile device
    if (context.isMobile) {
        prompt += "Keep it brief and mobile-friendly. ";
    }
    
    // Always ask if they've visited
    prompt += "\n\nAfter the greeting, ask if they have visited our practice before. Keep the tone warm and professional.";
    
    return prompt;
}

/**
 * Log chat initialization for analytics
 */
function logChatInitialization(sessionId, context) {    
    // Track metrics (can be sent to analytics service)
    if (!global.chatMetrics) {
        global.chatMetrics = {
            totalChats: 0,
            mobileChats: 0,
            returningVisitors: 0,
            afterHoursChats: 0
        };
    }
    
    global.chatMetrics.totalChats++;
    if (context.isMobile) global.chatMetrics.mobileChats++;
    if (context.isReturningVisitor) global.chatMetrics.returningVisitors++;
    if (!context.isBusinessHours) global.chatMetrics.afterHoursChats++;
}

/**
 * Get chat analytics (optional endpoint)
 */
export const getChatAnalytics = async (req, res) => {
    try {
        const metrics = global.chatMetrics || {
            totalChats: 0,
            mobileChats: 0,
            returningVisitors: 0,
            afterHoursChats: 0
        };
        
        res.json({
            success: true,
            metrics: {
                ...metrics,
                mobilePercentage: metrics.totalChats > 0 
                    ? ((metrics.mobileChats / metrics.totalChats) * 100).toFixed(1) 
                    : 0,
                returningVisitorPercentage: metrics.totalChats > 0 
                    ? ((metrics.returningVisitors / metrics.totalChats) * 100).toFixed(1) 
                    : 0,
                afterHoursPercentage: metrics.totalChats > 0 
                    ? ((metrics.afterHoursChats / metrics.totalChats) * 100).toFixed(1) 
                    : 0
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

        // Get conversation state
        let state = conversationStates.get(sessionId);
        if (!state) {
            return res.status(404).json({
                success: false,
                error: 'Session not found. Please refresh and start a new chat.'
            });
        }

        // Add user message to history
        state.messages.push({ role: "user", content: message });

        // Determine if we need to extract information or check database
        const extractedInfo = await extractPatientInfo(message, state);
        
        // Update patient data if information was extracted
        if (extractedInfo) {
            state.patientData = { ...state.patientData, ...extractedInfo };
        }

        // Check if we have enough info to search for existing patient
        if (state.patientData.phone && !state.patientData.isExisting && !state.patientData.checkedDatabase) {
            const existingPatient = await Patient.findOne({ 
                phone: state.patientData.phone 
            });

            state.patientData.checkedDatabase = true; // Mark as checked to avoid repeated queries

            if (existingPatient) {
                state.patientData.isExisting = true;
                state.patientData.patientId = existingPatient._id;
                
                // Pre-fill all existing patient data
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
                if (existingPatient.age && !state.patientData.age) {
                    state.patientData.age = existingPatient.age;
                }
                if (existingPatient.dob && !state.patientData.dob) {
                    state.patientData.dob = existingPatient.dob;
                }
                if (existingPatient.gender && !state.patientData.gender) {
                    state.patientData.gender = existingPatient.gender;
                }
                
                // Skip to purpose inquiry since we have all info
                state.stage = 'purpose_inquiry';
                
                console.log(`✅ Found existing patient: ${existingPatient.firstName} ${existingPatient.lastName}`);
            } else {
                console.log(`ℹ️ New patient - phone: ${state.patientData.phone}`);
            }
        }

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

        const aiMessage = completion.choices[0].message.content;
        state.messages.push({ role: "assistant", content: aiMessage });

        // Update conversation stage
        updateConversationStage(state, message, aiMessage);

        // Check if we should trigger call based on natural conversation flow
        // Only trigger after bot has said "we'll call you" indicating conversation is complete
        if (shouldTriggerCall(state, message, aiMessage)) {
            // Initiate phone call for confirmation
            try {
                // Get hospital ID - from auth middleware or use default
                const hospitalId = req.hospitalId || process.env.DEFAULT_HOSPITAL_ID;
                
                if (!hospitalId) {
                    throw new Error('Hospital ID not configured. Please set DEFAULT_HOSPITAL_ID in .env or enable authentication.');
                }
                
                await initiateAppointmentCall(state.patientData, hospitalId);
                state.appointmentInitiated = true;
            } catch (callError) {
                console.error('Failed to initiate call:', callError);
                // Don't fail the whole request, just log the error
                state.callError = callError.message;
            }
        }

        conversationStates.set(sessionId, state);

        res.json({
            success: true,
            message: aiMessage,
            stage: state.stage,
            patientData: state.patientData,
            appointmentInitiated: state.appointmentInitiated || false,
            callError: state.callError || null
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
 * Extract patient information from message using GPT
 */
async function extractPatientInfo(message, state) {
    try {
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
        - Extract appointment reason if mentioned (e.g., "checkup", "fever", "consultation")
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
            // Filter out empty values and data we already have
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
 */
function buildContextMessage(state) {
    let context = "Current conversation context:\n";
    
    context += `Stage: ${state.stage}\n`;
    
    if (Object.keys(state.patientData).length > 0) {
        context += "\nPatient data collected:\n";
        context += JSON.stringify(state.patientData, null, 2);
    }
    
    if (state.patientData.isExisting && state.patientData.existingInfo) {
        context += "\n\n⭐ IMPORTANT: This is an EXISTING patient! We have their information:\n";
        context += `- Name: ${state.patientData.existingInfo.name}\n`;
        context += `- Email: ${state.patientData.existingInfo.email}\n`;
        context += `- Age: ${state.patientData.existingInfo.age}\n`;
        if (state.patientData.existingInfo.dob) {
            context += `- Date of Birth: ${state.patientData.existingInfo.dob}\n`;
        }
        if (state.patientData.existingInfo.gender) {
            context += `- Gender: ${state.patientData.existingInfo.gender}\n`;
        }
        context += "\nDO NOT ask for information we already have. Welcome them back warmly and ask what brings them in today.\n";
    }
    
    if (state.stage === 'purpose_inquiry') {
        context += "\n\nNext step: Ask what brings them in today or why they're contacting us.\n";
    }
    
    if (state.stage === 'booking_appointment') {
        context += "\n\nPatient wants to book an appointment. Have a natural conversation about their needs (1-2 exchanges). Then conclude by saying 'We'll give you a call shortly to schedule/confirm everything.' This signals you're ready to close the conversation.\n";
    }
    
    context += "\n\nAlways respond naturally and conversationally. Keep responses concise and friendly.";
    
    return context;
}

/**
 * Update conversation stage based on content
 */
function updateConversationStage(state, userMessage, aiResponse) {
    const lowerMessage = userMessage.toLowerCase();
    const lowerResponse = aiResponse.toLowerCase();
    
    // If greeting stage and user answered if they visited before
    if (state.stage === 'greeting' && (lowerMessage.includes('yes') || lowerMessage.includes('no') || lowerMessage.includes('first time'))) {
        state.stage = 'collecting_info';
    }
    
    // If we have an existing patient with all info, skip to purpose inquiry
    if (state.patientData.isExisting && state.patientData.existingInfo) {
        state.stage = 'purpose_inquiry';
    }
    
    // If collecting info and we now have phone and first name
    if (state.stage === 'collecting_info' && state.patientData.phone && state.patientData.firstName) {
        state.stage = 'purpose_inquiry';
    }
    
    // If user mentions appointment booking keywords
    if (lowerMessage.includes('appointment') || lowerMessage.includes('book') || 
        lowerMessage.includes('schedule') || lowerMessage.includes('see doctor') ||
        lowerMessage.includes('visit') || lowerMessage.includes('consultation')) {
        state.stage = 'booking_appointment';
        state.bookingInitiated = true; // Flag that booking was requested
    }
}

/**
 * Check if we should trigger the call (all conditions met)
 */
function shouldTriggerCall(state, userMessage) {
    // Must be in booking stage
    if (state.stage !== 'booking_appointment') return false;
    
    // Must have phone number
    if (!state.patientData.phone) return false;
    
    // Must have indicated booking intent
    if (!state.bookingInitiated) return false;
    
    // Don't trigger multiple times
    if (state.appointmentInitiated) return false;
    
    // Trigger immediately when booking intent is detected
    // No need to wait for additional details - we'll get everything over the phone
    return true;
}

/**
 * Initiate phone call for appointment confirmation using existing callService
 */
async function initiateAppointmentCall(patientData, hospitalId = null) {
    try {
        if (!patientData.phone) {
            throw new Error('Patient phone number is required');
        }

        if (!hospitalId) {
            throw new Error('Hospital ID is required for calls');
        }

        // Format phone number (ensure it has country code)
        let phoneNumber = patientData.phone;
        if (!phoneNumber.startsWith('+')) {
            phoneNumber = '+1' + phoneNumber.replace(/\D/g, ''); // Assuming US number
        }

        // Use existing callService to make the call
        const result = await callService.makeOutboundCall({
            phoneNumber: phoneNumber,
            patientId: patientData.patientId || null,
            hospitalId: hospitalId,
            reason: 'Appointment booking confirmation',
            callType: 'general'
        });

        if (result.success) {
            console.log(`Initiated appointment call to ${phoneNumber}, Call SID: ${result.call?.sid}`);
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
            patientData: state.patientData,
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

export default {
    initializeChat,
    sendMessage,
    getConversationHistory,
    getChatAnalytics
};