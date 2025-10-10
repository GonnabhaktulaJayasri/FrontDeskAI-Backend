
// import WebSocket from "ws";
// import { checkDoctorAvailability } from "./doctors.js";
// import 'dotenv/config';
// import fs from "fs";
// import wav from "wav";
// import Patient from "../models/Patient.js";
// import CallLog from "../models/CallLog.js";
// import mongoose, { model } from "mongoose";
// import Doctor from "../models/Doctor.js";
// import { bookAppointment, findPatientAppointments, cancelAppointmentByDetails, rescheduleAppointmentByDetails } from "./appointment.js";
// import Call from "../models/Call.js";
// import Appointment from "../models/Appointment.js";

//instruction wthout hospital
// instructions: `You are MediAssist, the AI receptionist for ${process.env.HOSPITAL_NAME || 'City General Hospital'}. Your role is to help patients with appointments, prescription refills, and general inquiries.

//                     ${patientContext}

//                     GREETING & PATIENT RECOGNITION:
//                     - Always start with: "Thank you for calling ${process.env.HOSPITAL_NAME || 'City General Hospital'}. This is MediAssist, your AI assistant."
//                     - For returning patients, add personal recognition: "Hello [Patient Name]! It's good to hear from you again."
//                     - For new patients, continue with: "How can I help you today?"
//                     - Be friendly, professional, and efficient
//                     - DO NOT repeat stored patient information unless specifically asked

//                     RETURNING PATIENT BEHAVIOR:
//                     - Since you already have their information, don't ask for name, phone, or basic details again
//                     - Use stored preferred doctor when booking appointments
//                     - Reference their appointment history appropriately
//                     - When they ask about appointments, immediately tell them about their upcoming appointments

//                     APPOINTMENT INQUIRIES:
//                     - When patient asks "what are my appointments" or "do I have any appointments", immediately list their upcoming appointments
//                     - Include date, time, doctor, reason, and confirmation number
//                     - If no upcoming appointments, offer to schedule one

//                     CORE RESPONSIBILITIES:
//                     - Help patients schedule, reschedule, or cancel appointments
//                     - Process prescription refill requests
//                     - Check doctor availability and provide appointment slots
//                     - Answer general hospital information questions
//                     - Show upcoming appointments when requested
//                     - Use stored patient information efficiently

//                     APPOINTMENT MANAGEMENT:
//                     - For returning patients, use their stored information automatically
//                     - When rescheduling/canceling, reference their upcoming appointments
//                     - Always provide confirmation numbers for changes

//                     PRESCRIPTION REFILLS:
//                     - For returning patients, use their stored information
//                     - Still collect medication-specific details (medication name, doctor, etc.)
//                     - Reference their preferred doctor if applicable

//                     COMMUNICATION STYLE:
//                     - Personalized and efficient for returning patients
//                     - Don't ask for information you already have
//                     - Keep responses concise but thorough
//                     - Always confirm important information
//                     - End calls professionally: "Is there anything else I can help you with today?"

//                     Remember: Make returning patients feel recognized and valued while being efficient with their time.`,

// function getInstructions(patientData, upcomingAppointments) {
//     const hospitalName = process.env.HOSPITAL_NAME || 'City General Hospital';
//     const hospitalPhone = process.env.HOSPITAL_MAIN_PHONE || 'our main number';
//     const hospitalAddress = process.env.HOSPITAL_ADDRESS || 'our hospital';
//     const departments = process.env.HOSPITAL_DEPARTMENTS?.split(',') || [];

//     // Build patient context if available
//     let patientContext = "";
//     if (patientData) {
//         patientContext = `
// PATIENT CONTEXT (Do not repeat this information unless specifically asked):
// - Patient Name: ${patientData.name}
// - Phone: ${patientData.phone}
// - Previous visits: ${patientData.totalVisits}
// ${patientData.preferredDoctor ? `- Preferred Doctor: ${patientData.preferredDoctor}` : ''}
// ${patientData.age ? `- Age: ${patientData.age}` : ''}
// ${patientData.gender ? `- Gender: ${patientData.gender}` : ''}

// UPCOMING APPOINTMENTS:
// ${upcomingAppointments && upcomingAppointments.length > 0 ?
//                 upcomingAppointments.map(apt =>
//                     `- ${apt.date} at ${apt.time} with Dr. ${apt.doctor} (${apt.reason}) - Confirmation: ${apt.confirmationNumber}`
//                 ).join('\n') :
//                 '- No upcoming appointments scheduled'
//             }`;
//     }

//     return `You are the AI receptionist for ${hospitalName}. Your role is to help patients with appointments, prescription refills, and general inquiries for ${hospitalName}. Speak naturally and conversationally, like a friendly human receptionist.

//     ${patientContext}

//     HOSPITAL IDENTITY & GREETING:
//     - For new patients: "Thank you for calling ${hospitalName}. How can I help you today?"
//     - For returning patients: "Thank you for calling ${hospitalName}. Hi [Patient Name]! How can I help you today?"
//     - Sound warm, welcoming, and natural - like you're genuinely happy to help
//     - When patients ask about the hospital, refer to it as "${hospitalName}"

//     HOSPITAL INFORMATION:
//     - Hospital Name: ${hospitalName}
//     - Main Phone: ${hospitalPhone}
//     - Address: ${hospitalAddress}
//     - Available Departments: ${departments.join(', ')}
//     - Hours: ${process.env.HOSPITAL_HOURS_WEEKDAY || '8:00 AM - 8:00 PM'} (weekdays)
//     - Weekend Hours: ${process.env.HOSPITAL_HOURS_WEEKEND || '9:00 AM - 5:00 PM'}
//     - Emergency Department: ${process.env.HOSPITAL_HOURS_EMERGENCY || '24/7'}

//     RETURNING PATIENT BEHAVIOR:
//     - Since you already have their information, don't ask for name, phone, or basic details again
//     - Use stored preferred doctor when booking appointments
//     - Reference their appointment history appropriately with ${hospitalName}
//     - When they ask about appointments, immediately tell them about their upcoming appointments at ${hospitalName}

//     APPOINTMENT INQUIRIES:
//     - When patient asks "what are my appointments" or "do I have any appointments", immediately list their upcoming appointments at ${hospitalName}
//     - Include date, time, doctor, reason, and confirmation number
//     - If no upcoming appointments, offer to schedule one at ${hospitalName}

//     CALL ENDING DETECTION:
//     - Listen for conversation ending cues: "thank you", "that's all", "nothing else", "goodbye", "bye", "have a good day"
//     - When patient indicates they're done, FIRST say your natural goodbye message, THEN call the end_call function
//     - Sequence: 1) Say goodbye naturally ("Thanks for calling ${hospitalName}. Have a great day!") 2) Call end_call function
//     - Don't keep asking "anything else?" if patient has clearly indicated they're finished
//     - Examples of proper call endings:
//       * Patient: "Thank you, that's all"
//       * AI: "You're welcome! Thanks for calling ${hospitalName}. Have a wonderful day!" [calls end_call]
//       * Patient: "Perfect, nothing else" 
//       * AI: "Great! Thank you for choosing ${hospitalName}. Take care!" [calls end_call]

//     CORE RESPONSIBILITIES FOR ${hospitalName}:
//     - Help patients schedule, reschedule, or cancel appointments at ${hospitalName}
//     - Process prescription refill requests for ${hospitalName} patients
//     - Check doctor availability at ${hospitalName}
//     - Answer questions about ${hospitalName} services, hours, location, and departments
//     - Show upcoming appointments at ${hospitalName} when requested
//     - Use stored patient information efficiently

//     HOSPITAL-SPECIFIC RESPONSES:
//     - "Let me check our ${hospitalName} system for you..."
//     - "I'll help you schedule an appointment at ${hospitalName}..."
//     - "Your prescription will be processed by our ${hospitalName} pharmacy..."
//     - "For urgent medical matters, please visit our ${hospitalName} Emergency Department..."

//     IMPORTANT LIMITATIONS:
//     - Never provide medical advice, diagnosis, or treatment recommendations
//     - For medical concerns: "I'll need to connect you with one of our ${hospitalName} medical professionals..."
//     - Cannot access medical records or discuss protected health information
//     - For complex issues: "Let me connect you with our ${hospitalName} staff member who can assist you further..."

//     COMMUNICATION STYLE:
//     - Sound natural and conversational, like a helpful human receptionist
//     - Use casual, friendly language: "Sure!", "Absolutely!", "Let me check that for you"
//     - Vary your responses - don't sound robotic or repetitive
//     - Show genuine interest: "That sounds good", "Perfect!", "Great choice"
//     - Use natural speech patterns with contractions: "I'll", "You're", "We've", "Let's"
//     - Make patients feel welcomed and comfortable at ${hospitalName}
//     - End calls naturally: "Great! Thanks for calling ${hospitalName}. Have a wonderful day!"

//     NATURAL SPEECH GUIDELINES:
//     - Speak like you're having a friendly conversation
//     - Use filler words occasionally: "um", "let's see", "okay"
//     - Sound enthusiastic but not overly cheerful
//     - Pause naturally in speech - don't rush
//     - Use natural transitions: "So...", "Now...", "Alright..."
//     - Sound human, not like a script

//     Remember: You're a helpful, friendly person who happens to work at ${hospitalName} - make every caller feel valued and comfortable.`;
// }

// export async function callAssistant(connection, req) {
//     console.log('Starting AI assistant');

//     let callLog = null;
//     let patientId = null;
//     let callLogId = null;
//     let conversationTranscript = [];
//     let isFinalized = false;
//     let from = null;
//     let to = null;
//     let patientData = null; // Store patient information
//     let upcomingAppointments = []; // Store upcoming appointments

//     let wavWriterOpen = true;
//     let wavWriter1Open = true;

//     const timestamp = Date.now();
//     const outputFile = `./ai_responses/ai_response_${timestamp}.wav`;
//     fs.mkdirSync("./ai_responses", { recursive: true });

//     const fileStream = fs.createWriteStream(outputFile);
//     const wavWriter = new wav.Writer({
//         channels: 1,
//         sampleRate: 8000,
//         bitDepth: 16
//     });
//     wavWriter.pipe(fileStream);

//     const inputFile = `./user_responses/user_response_${timestamp}.wav`;
//     fs.mkdirSync("./user_responses", { recursive: true });

//     const fileStream1 = fs.createWriteStream(inputFile);
//     const wavWriter1 = new wav.Writer({
//         channels: 1,
//         sampleRate: 8000,
//         bitDepth: 16
//     });
//     wavWriter1.pipe(fileStream1);

//     // Connection-specific state
//     let streamSid = null;
//     let latestMediaTimestamp = 0;
//     let lastAssistantItem = null;
//     let markQueue = [];
//     let responseStartTimestampTwilio = null;
//     let audioChunkCount = 0;
//     let openAiWs = null;
//     let isInitialized = false;
//     let detectedIntent = null;
//     let extractedEntities = {};
//     let TEMPERATURE = 0.8;
//     let currentAiTranscript = null;

//     // Handle incoming messages from Twilio
//     connection.on('message', async (message) => {
//         try {
//             const data = JSON.parse(message);

//             switch (data.event) {
//                 case 'start':
//                     streamSid = data.start.streamSid;
//                     connection.streamSid = streamSid;

//                     const callSid = data.start.callSid;

//                     try {
//                         const existingCall = await Call.findOne({ callSid: callSid });
//                         if (existingCall) {
//                             patientId = existingCall.patient;
//                             from = existingCall.from;
//                             to = existingCall.to;

//                             await loadPatientData(patientId);
//                         }
//                     } catch (error) {
//                         console.error("Error looking up call:", error);
//                     }

//                     if (!patientId) {
//                         console.error("No patientId found for CallSid:", callSid);
//                         return;
//                     }

//                     if (!callLogId) {
//                         callLogId = await createCallLog(data.start, from, to, patientId);
//                     }

//                     // Initialize OpenAI connection after we get the streamSid
//                     if (!isInitialized) {
//                         await initializeOpenAI();
//                         isInitialized = true;
//                     }

//                     // Reset state
//                     responseStartTimestampTwilio = null;
//                     latestMediaTimestamp = 0;
//                     audioChunkCount = 0;
//                     break;

//                 case 'media':
//                     if (!openAiWs || openAiWs.readyState !== WebSocket.OPEN) {
//                         return;
//                     }

//                     latestMediaTimestamp = data.media.timestamp;

//                     // Save user audio
//                     const ulawBuffer = Buffer.from(data.media.payload, "base64");
//                     const pcm16Buffer = ulawToPcm16(ulawBuffer);
//                     // if (wavWriter1Open) {
//                     //     wavWriter1.write(pcm16Buffer);
//                     // }

//                     // Send to OpenAI
//                     const audioAppend = {
//                         type: 'input_audio_buffer.append',
//                         audio: pcm16Buffer.toString('base64') // Send original base64 μ-law data
//                     };
//                     openAiWs.send(JSON.stringify(audioAppend));
//                     break;

//                 case 'mark':
//                     if (markQueue.length > 0) {
//                         markQueue.shift();
//                     }
//                     break;

//                 case 'stop':
//                     console.log('Stream stopped');
//                     await finalizeCallLog();
//                     break;

//                 default:
//                     console.log('Unhandled Twilio event:', data.event);
//                     break;
//             }
//         } catch (error) {
//             console.error('Error parsing Twilio message:', error);
//         }
//     });

//     connection.on("close", async () => {
//         console.log('Twilio connection closed');
//         if (openAiWs && openAiWs.readyState === WebSocket.OPEN) {
//             openAiWs.close();
//         }
//         if (wavWriterOpen) {
//             wavWriter.end();
//             wavWriterOpen = false;
//         }
//         if (wavWriter1Open) {
//             wavWriter1.end();
//             wavWriter1Open = false;
//         }
//         await finalizeCallLog();
//     });

//     connection.on("error", (error) => {
//         console.error("Twilio WebSocket error:", error);
//     });

//     // Initialize OpenAI connection
//     async function initializeOpenAI() {
//         console.log('Initializing OpenAI connection...');

//         openAiWs = new WebSocket(`wss://api.openai.com/v1/realtime?model=gpt-realtime&temperature=${TEMPERATURE}`, {
//             headers: {
//                 "Authorization": "Bearer " + process.env.OPENAI_API_KEY,
//             }
//         });

//         openAiWs.on("open", () => {
//             // Build patient context for AI
//             // let patientContext = "";
//             // if (patientData) {
//             //     patientContext = `
//             //     PATIENT CONTEXT (Do not repeat this information unless specifically asked):
//             //     - Patient Name: ${patientData.name}
//             //     - Phone: ${patientData.phone}
//             //     - Previous visits: ${patientData.totalVisits}
//             //     ${patientData.preferredDoctor ? `- Preferred Doctor: ${patientData.preferredDoctor}` : ''}
//             //     ${patientData.age ? `- Age: ${patientData.age}` : ''}
//             //     ${patientData.gender ? `- Gender: ${patientData.gender}` : ''}

//             //     UPCOMING APPOINTMENTS:
//             //     ${upcomingAppointments.length > 0 ?
//             //             upcomingAppointments.map(apt =>
//             //                 `- ${apt.date} at ${apt.time} with Dr. ${apt.doctor} (${apt.reason}) - Confirmation: ${apt.confirmationNumber}`
//             //             ).join('\n') :
//             //             '- No upcoming appointments scheduled'
//             //         }`;
//             // }

//             const sessionUpdate = {
//                 type: "session.update",
//                 session: {
//                     modalities: ["text", "audio"],
//                     instructions: getInstructions(patientData, upcomingAppointments),
//                     voice: "alloy",
//                     input_audio_format: "pcm16",
//                     output_audio_format: "pcm16",
//                     turn_detection: {
//                         type: "server_vad",
//                         threshold: 0.5,
//                         prefix_padding_ms: 300,
//                         silence_duration_ms: 500,
//                     },
//                     input_audio_transcription: {
//                         model: "whisper-1",
//                     },
//                     // audio: {
//                     //     input: {
//                     //         format: { type: 'audio/pcmu' },
//                     //         turn_detection: { type: "server_vad", "silence_duration_ms": 850 }
//                     //     },
//                     //     output: {
//                     //         format: { type: 'audio/pcmu' },
//                     //         voice: 'alloy',
//                     //         "speed": 1.0
//                     //     },
//                     // },
//                     tools: [
//                         {
//                             type: "function",
//                             name: "get_my_appointments",
//                             description: "Show patient their upcoming appointments",
//                             parameters: {
//                                 type: "object",
//                                 properties: {
//                                     include_past: {
//                                         type: "boolean",
//                                         description: "Whether to include past appointments",
//                                         default: false
//                                     },
//                                     limit: {
//                                         type: "number",
//                                         description: "Number of appointments to show",
//                                         default: 5
//                                     }
//                                 }
//                             }
//                         },
//                         {
//                             type: "function",
//                             name: "check_doctor_availability",
//                             description: "Check if a doctor is available for appointments on a specific date",
//                             parameters: {
//                                 type: "object",
//                                 properties: {
//                                     doctor_name: {
//                                         type: "string",
//                                         description: "Name of the doctor to check availability for"
//                                     },
//                                     date: {
//                                         type: "string",
//                                         description: "Date to check in YYYY-MM-DD format"
//                                     },
//                                     specialty: {
//                                         type: "string",
//                                         description: "Medical specialty if doctor name is not provided"
//                                     }
//                                 },
//                                 required: ["date"]
//                             }
//                         },
//                         {
//                             type: "function",
//                             name: "book_appointment",
//                             description: "Book an appointment for a patient (use stored patient info for returning patients)",
//                             parameters: {
//                                 type: "object",
//                                 properties: {
//                                     patient_name: {
//                                         type: "string",
//                                         description: "Patient's full name (use stored name for returning patients)"
//                                     },
//                                     patient_phone: {
//                                         type: "string",
//                                         description: "Patient's phone number (use stored phone for returning patients)"
//                                     },
//                                     doctor_name: {
//                                         type: "string",
//                                         description: "Name of the doctor"
//                                     },
//                                     date: {
//                                         type: "string",
//                                         description: "Appointment date in YYYY-MM-DD format"
//                                     },
//                                     time: {
//                                         type: "string",
//                                         description: "Appointment time in HH:MM format"
//                                     },
//                                     reason: {
//                                         type: "string",
//                                         description: "Reason for the appointment"
//                                     }
//                                 },
//                                 required: ["doctor_name", "date", "time", "reason"]
//                             }
//                         },
//                         {
//                             type: "function",
//                             name: "find_patient_appointments",
//                             description: "Find patient's existing appointments using patient details",
//                             parameters: {
//                                 type: "object",
//                                 properties: {
//                                     patient_name: {
//                                         type: "string",
//                                         description: "Patient's full name"
//                                     },
//                                     patient_phone: {
//                                         type: "string",
//                                         description: "Patient's phone number"
//                                     },
//                                     doctor_name: {
//                                         type: "string",
//                                         description: "Doctor's name to filter appointments"
//                                     },
//                                     date_from: {
//                                         type: "string",
//                                         description: "Start date to search from in YYYY-MM-DD format"
//                                     }
//                                 }
//                             }
//                         },
//                         {
//                             type: "function",
//                             name: "update_patient_info",
//                             description: "Update patient information during the call",
//                             parameters: {
//                                 type: "object",
//                                 properties: {
//                                     name: { type: "string", description: "Patient's name" },
//                                     age: { type: "number", description: "Patient's age" },
//                                     gender: { type: "string", enum: ["male", "female", "other"] },
//                                     preferred_doctor: { type: "string", description: "Preferred doctor name" },
//                                     preferred_time: { type: "string", description: "Preferred appointment time" }
//                                 }
//                             }
//                         },
//                         {
//                             type: "function",
//                             name: "reschedule_appointment",
//                             description: "Reschedule an appointment using appointment details instead of ID",
//                             parameters: {
//                                 type: "object",
//                                 properties: {
//                                     patient_name: {
//                                         type: "string",
//                                         description: "Patient's full name"
//                                     },
//                                     patient_phone: {
//                                         type: "string",
//                                         description: "Patient's phone number"
//                                     },
//                                     original_doctor: {
//                                         type: "string",
//                                         description: "Original doctor's name"
//                                     },
//                                     original_date: {
//                                         type: "string",
//                                         description: "Original appointment date in YYYY-MM-DD format"
//                                     },
//                                     original_time: {
//                                         type: "string",
//                                         description: "Original appointment time in HH:MM format"
//                                     },
//                                     new_date: {
//                                         type: "string",
//                                         description: "New appointment date in YYYY-MM-DD format"
//                                     },
//                                     new_time: {
//                                         type: "string",
//                                         description: "New appointment time in HH:MM format"
//                                     }
//                                 },
//                                 required: ["patient_name", "original_doctor", "original_date", "new_date", "new_time"]
//                             }
//                         },
//                         {
//                             type: "function",
//                             name: "cancel_appointment",
//                             description: "Cancel an appointment using appointment details instead of ID",
//                             parameters: {
//                                 type: "object",
//                                 properties: {
//                                     patient_name: {
//                                         type: "string",
//                                         description: "Patient's full name"
//                                     },
//                                     patient_phone: {
//                                         type: "string",
//                                         description: "Patient's phone number"
//                                     },
//                                     doctor_name: {
//                                         type: "string",
//                                         description: "Doctor's name"
//                                     },
//                                     appointment_date: {
//                                         type: "string",
//                                         description: "Appointment date in YYYY-MM-DD format"
//                                     },
//                                     appointment_time: {
//                                         type: "string",
//                                         description: "Appointment time in HH:MM format"
//                                     },
//                                     reason: {
//                                         type: "string",
//                                         description: "Reason for cancellation"
//                                     }
//                                 },
//                                 required: ["patient_name", "doctor_name", "appointment_date"]
//                             }
//                         },
//                         {
//                             type: "function",
//                             name: "request_prescription_refill",
//                             description: "Process a prescription refill request from a patient",
//                             parameters: {
//                                 type: "object",
//                                 properties: {
//                                     patient_name: {
//                                         type: "string",
//                                         description: "Patient's full name"
//                                     },
//                                     patient_phone: {
//                                         type: "string",
//                                         description: "Patient's phone number"
//                                     },
//                                     medication_name: {
//                                         type: "string",
//                                         description: "Name of the medication to refill"
//                                     },
//                                     prescribing_doctor: {
//                                         type: "string",
//                                         description: "Name of the doctor who prescribed the medication"
//                                     },
//                                     dosage: {
//                                         type: "string",
//                                         description: "Medication dosage (e.g., '10mg', '500mg twice daily')"
//                                     },
//                                     last_refill_date: {
//                                         type: "string",
//                                         description: "Date of last refill in YYYY-MM-DD format"
//                                     },
//                                     reason_for_refill: {
//                                         type: "string",
//                                         enum: ["routine_refill", "lost_medication", "going_on_trip", "urgent_need", "other"],
//                                         description: "Reason for requesting refill"
//                                     },
//                                     urgency: {
//                                         type: "string",
//                                         enum: ["routine", "urgent", "emergency"],
//                                         description: "Urgency level of the refill request"
//                                     },
//                                     pharmacy_name: {
//                                         type: "string",
//                                         description: "Preferred pharmacy name"
//                                     },
//                                     additional_notes: {
//                                         type: "string",
//                                         description: "Any additional notes or special instructions"
//                                     }
//                                 },
//                                 required: ["patient_name", "medication_name", "prescribing_doctor", "reason_for_refill"]
//                             }
//                         },
//                         {
//                             type: "function",
//                             name: "end_call",
//                             description: "End the call when patient says goodbye, thank you, or indicates they're done. IMPORTANT: Say your natural goodbye message BEFORE calling this function, not after.",
//                             parameters: {
//                                 type: "object",
//                                 properties: {
//                                     reason: {
//                                         type: "string",
//                                         description: "Reason for ending call (e.g., 'patient_thanked', 'conversation_complete', 'patient_goodbye')"
//                                     }
//                                 },
//                                 required: ["reason"]
//                             }
//                         },
//                     ],
//                     tool_choice: "auto",
//                 }
//             };

//             openAiWs.send(JSON.stringify(sessionUpdate));

//             // Send initial greeting after a short delay to ensure stream is ready
//             setTimeout(() => {
//                 sendInitialConversationItem();
//             }, 200);
//         });

//         // Listen for messages from OpenAI WebSocket
//         openAiWs.on('message', async (data) => {
//             try {
//                 const response = JSON.parse(data);

//                 if (response.type === 'response.output_audio.delta' && response.delta) {
//                     audioChunkCount++;

//                     // Save to file
//                     const pcm16Buffer = Buffer.from(response.delta, "base64");
//                     const ulawBuffer = pcm16ToUlaw(pcm16Buffer);
//                     // if (wavWriterOpen) {
//                     //     wavWriter.write(pcm16Buffer);
//                     // }
//                     // Check if we have streamSid and connection is ready
//                     if (!streamSid) {
//                         console.error('No streamSid available to send audio to Twilio!');
//                         return;
//                     }

//                     if (connection.readyState !== WebSocket.OPEN) {
//                         console.error('Twilio connection not open, state:', connection.readyState);
//                         return;
//                     }

//                     // Send audio to Twilio
//                     const audioDelta = {
//                         event: 'media',
//                         streamSid: streamSid,
//                         media: { payload: response.delta }
//                     };

//                     connection.send(JSON.stringify(audioDelta));

//                     // Timing and mark handling
//                     if (!responseStartTimestampTwilio) {
//                         responseStartTimestampTwilio = latestMediaTimestamp;
//                     }

//                     if (response.item_id) {
//                         lastAssistantItem = response.item_id;
//                     }

//                     sendMark(connection, streamSid);
//                 }

//                 if (response.type === 'input_audio_buffer.speech_started') {
//                     console.log('User started speaking');
//                     handleSpeechStartedEvent();
//                 }

//                 if (response.type === 'conversation.item.input_audio_transcription.completed') {
//                     addToTranscript('User', response.transcript);
//                     const userMessage = response.transcript.trim();
//                     console.log('User said:', userMessage);
//                 }


//                 if (response.type === 'response.output_audio_transcript.done') {
//                     addToTranscript('AI', response.transcript);
//                 }

//                 if (response.type === 'response.function_call_arguments.done') {
//                     console.log('Function call:', response.name, response.arguments);
//                     handleFunctionCall(response.call_id, response.name, JSON.parse(response.arguments));
//                 }

//                 if (response.type === 'session.created') {
//                     console.log('OpenAI session created:', response.session.id);
//                 }

//             } catch (error) {
//                 console.error('Error processing OpenAI message:', error);
//             }
//         });

//         openAiWs.on('close', () => {
//             console.log('Disconnected from OpenAI API');
//         });

//         openAiWs.on('error', (error) => {
//             console.error('OpenAI WebSocket error:', error);
//         });
//     }

//     // Send initial conversation item
//     function sendInitialConversationItem() {
//         if (!openAiWs || openAiWs.readyState !== WebSocket.OPEN) {
//             console.error('Cannot send initial item - OpenAI not connected');
//             return;
//         }

//         let greetingPrompt;
//         if (patientData) {
//             greetingPrompt = `A returning patient ${patientData.name} has just called ${process.env.HOSPITAL_NAME || 'City General Hospital'}. Start with "Thank you for calling ${process.env.HOSPITAL_NAME || 'City General Hospital'}. Hello ${patientData.name}! It's good to hear from you again. How can I help you today?" Keep it warm and professional.`;
//         } else {
//             greetingPrompt = `A new patient has just called ${process.env.HOSPITAL_NAME || 'City General Hospital'}. Start with "Thank you for calling ${process.env.HOSPITAL_NAME || 'City General Hospital'}. How can I help you today?" Be warm and professional.`;
//         }

//         const initialConversationItem = {
//             type: "conversation.item.create",
//             item: {
//                 type: "message",
//                 role: "user",
//                 content: [
//                     {
//                         type: "input_text",
//                         text: greetingPrompt
//                     }
//                 ]
//             }
//         };

//         console.log('Sending initial conversation item with patient context');
//         openAiWs.send(JSON.stringify(initialConversationItem));
//         openAiWs.send(JSON.stringify({ type: 'response.create' }));
//     }

//     // Handle speech interruption
//     const handleSpeechStartedEvent = () => {
//         if (markQueue.length > 0 && responseStartTimestampTwilio != null) {
//             const elapsedTime = latestMediaTimestamp - responseStartTimestampTwilio;
//             console.log(`Truncating at ${elapsedTime}ms`);

//             if (lastAssistantItem) {
//                 const truncateEvent = {
//                     type: 'conversation.item.truncate',
//                     item_id: lastAssistantItem,
//                     content_index: 0,
//                     audio_end_ms: elapsedTime
//                 };
//                 openAiWs.send(JSON.stringify(truncateEvent));
//             }

//             // Clear Twilio audio buffer
//             connection.send(JSON.stringify({
//                 event: 'clear',
//                 streamSid: streamSid
//             }));
//             console.log('Sent clear command to Twilio');

//             // Reset
//             markQueue = [];
//             lastAssistantItem = null;
//             responseStartTimestampTwilio = null;
//         }
//     };

//     // Send mark to track audio playbook
//     const sendMark = (connection, streamSid) => {
//         if (streamSid && connection.readyState === WebSocket.OPEN) {
//             const markEvent = {
//                 event: 'mark',
//                 streamSid: streamSid,
//                 mark: { name: 'responsePart' }
//             };
//             connection.send(JSON.stringify(markEvent));
//             markQueue.push('responsePart');
//         }
//     };

//     // Handle function calls from OpenAI
//     const handleFunctionCall = async (callId, functionName, args) => {
//         try {
//             let result = null;

//             switch (functionName) {
//                 case 'end_call':
//                     detectedIntent = 'end_call';
//                     extractedEntities = { ...extractedEntities, call_ending: args };

//                     // Return a silent result - the AI has already said its goodbye
//                     result = {
//                         success: true,
//                         action: 'end_call_initiated',
//                         internal_message: 'Call ending process started',
//                         reason: args.reason
//                     };

//                     // Schedule call termination after a short delay to allow any final message
//                     setTimeout(async () => {
//                         console.log('Ending call due to conversation completion:', args.reason);
//                         await finalizeCallLog();

//                         // Send call termination signal to Twilio
//                         if (connection && connection.readyState === WebSocket.OPEN) {
//                             connection.close();
//                         }
//                     }, 2000); // 3 second delay to allow final message to play
//                     break;

//                 case 'get_my_appointments':
//                     result = {
//                         success: true,
//                         upcoming_appointments: upcomingAppointments,
//                         total_count: upcomingAppointments.length,
//                         message: upcomingAppointments.length > 0
//                             ? `You have ${upcomingAppointments.length} upcoming appointment${upcomingAppointments.length > 1 ? 's' : ''}`
//                             : "You don't have any upcoming appointments scheduled"
//                     };
//                     break;

//                 case 'check_doctor_availability':
//                     detectedIntent = 'check_availability';
//                     extractedEntities = { ...extractedEntities, ...args };
//                     result = await checkDoctorAvailability({
//                         doctor_name: args.doctor_name,
//                         date: args.date,
//                         specialty: args.specialty
//                     });
//                     break;

//                 case 'book_appointment':
//                     detectedIntent = 'book_appointment';

//                     // Use stored patient data for returning patients
//                     const appointmentData = {
//                         patient_name: args.patient_name || patientData?.name,
//                         patient_phone: args.patient_phone || patientData?.phone || from,
//                         doctor_name: args.doctor_name,
//                         date: args.date,
//                         time: args.time,
//                         reason: args.reason
//                     };

//                     extractedEntities = { ...extractedEntities, ...appointmentData };
//                     result = await bookAppointment(appointmentData);

//                     // Refresh appointments after booking
//                     if (result.success && patientId) {
//                         upcomingAppointments = await getUpcomingAppointments(patientId);
//                         await updatePatientFromCall({
//                             patientId: result.patientId || patientId,
//                             ...appointmentData
//                         });
//                     }
//                     break;

//                 case 'find_patient_appointments':
//                     detectedIntent = 'find_appointments';
//                     extractedEntities = { ...extractedEntities, ...args };
//                     result = await findPatientAppointments(args);
//                     break;

//                 case 'reschedule_appointment':
//                     detectedIntent = 'reschedule_appointment';
//                     extractedEntities = { ...extractedEntities, ...args };

//                     // Ensure phone comes from callLog if missing
//                     if (!args.patient_phone && callLog?.from) {
//                         args.patient_phone = callLog.from;
//                     }

//                     result = await rescheduleAppointmentByDetails(args);
//                     break;

//                 case 'cancel_appointment':
//                     detectedIntent = 'cancel_appointment';
//                     extractedEntities = { ...extractedEntities, ...args };

//                     // Ensure phone comes from callLog if missing
//                     if (!args.patient_phone && callLog?.from) {
//                         args.patient_phone = callLog.from;
//                     }

//                     result = await cancelAppointmentByDetails(args);
//                     break;

//                 case 'request_prescription_refill':
//                     detectedIntent = 'prescription_refill';

//                     // Use stored patient data
//                     const refillData = {
//                         patient_name: args.patient_name || patientData?.name,
//                         patient_phone: args.patient_phone || patientData?.phone || from,
//                         ...args
//                     };

//                     extractedEntities = { ...extractedEntities, ...refillData };
//                     result = await processPrescriptionRefill(refillData);
//                     break;

//                 case 'update_patient_info':
//                     if (patientId) {
//                         result = await updatePatientInfo(patientId, args);
//                         extractedEntities = { ...extractedEntities, patient_info: args };
//                     } else {
//                         result = { success: false, message: "Patient ID not available" };
//                     }
//                     break;

//                 default:
//                     result = { error: `Unknown function: ${functionName}` };
//             }

//             // Send function result back to OpenAI
//             const functionResponse = {
//                 type: 'conversation.item.create',
//                 item: {
//                     type: 'function_call_output',
//                     call_id: callId,
//                     output: JSON.stringify(result)
//                 }
//             };

//             openAiWs.send(JSON.stringify(functionResponse));
//             const responseCreate = {
//                 type: 'response.create'
//             };

//             openAiWs.send(JSON.stringify(responseCreate));
//         } catch (error) {
//             console.error('Error handling function call:', error);

//             // Send error response back to OpenAI
//             const errorResponse = {
//                 type: 'conversation.item.create',
//                 item: {
//                     type: 'function_call_output',
//                     call_id: callId,
//                     output: JSON.stringify({ error: error.message })
//                 }
//             };

//             openAiWs.send(JSON.stringify(errorResponse));
//             const responseCreate = {
//                 type: 'response.create'
//             };

//             openAiWs.send(JSON.stringify(responseCreate));
//         }
//     }

//     const addToTranscript = (speaker, message) => {
//         conversationTranscript.push({
//             speaker,
//             text: message,
//             timestamp: new Date() // ISO timestamp
//         });
//         console.log('Transcript line added:', speaker, message);
//     };

//     // Create call log entry
//     const createCallLog = async (startData, from, to, patientId) => {
//         try {
//             callLog = new CallLog({
//                 patient: patientId,
//                 callSid: startData.callSid || streamSid,
//                 from: from || 'unknown',
//                 to: to || 'hospital',
//                 startTime: new Date(),
//                 transcript: [],
//                 entities: {},
//                 actionTaken: 'in_progress'
//             });

//             await callLog.save();
//             console.log('Call log created:', callLog._id);
//             return callLog._id; // Return the ID
//         } catch (error) {
//             console.error('Error creating call log:', error);
//         }
//     };

//     // Finalize call log
//     const finalizeCallLog = async () => {
//         if (!callLogId || isFinalized) return;
//         isFinalized = true;

//         try {
//             const endTime = new Date();
//             const duration = callLog ? Math.floor((endTime - callLog.startTime) / 1000) : 0;

//             await CallLog.findByIdAndUpdate(callLogId, {
//                 endTime,
//                 duration,
//                 transcript: conversationTranscript, // store as array of objects
//                 intent: detectedIntent,
//                 entities: extractedEntities,
//                 actionTaken: detectedIntent ? 'completed' : 'conversation_only'
//             });

//             console.log('Call log finalized:', callLogId);
//             console.log('Final transcript:', JSON.stringify(conversationTranscript, null, 2));
//         } catch (error) {
//             console.error('Error finalizing call log:', error);
//         }
//     };

//     // Update patient info from successful appointment booking
//     const updatePatientFromCall = async (appointmentData) => {
//         try {
//             let doctorId = null;
//             if (appointmentData.doctor_name) {
//                 const doctor = await Doctor.findOne({ name: appointmentData.doctor_name });
//                 if (doctor) {
//                     doctorId = doctor._id;
//                 }
//             }

//             const updateData = {
//                 $set: {
//                     name: appointmentData.patient_name,
//                     lastAppointment: new Date(`${appointmentData.date}T${appointmentData.time}:00`),
//                     ...(doctorId && { preferredDoctor: doctorId }) // only set if found
//                 },
//                 $push: {
//                     callDetails: {
//                         date: new Date(),
//                         reason: appointmentData.reason,
//                         requestedDoctor: appointmentData.doctor_name,
//                         notes: `Appointment booked for ${appointmentData.date} at ${appointmentData.time}`
//                     }
//                 }
//             };

//             await Patient.findByIdAndUpdate(patientId, updateData, { new: true });
//             console.log('Updated patient info from appointment booking');
//         } catch (error) {
//             console.error('Error updating patient from call:', error);
//         }
//     }

//     // Update patient information
//     const updatePatientInfo = async (patientId, info) => {
//         try {
//             const updateData = {};

//             if (info.name) updateData.name = info.name;
//             if (info.age) updateData.age = info.age;
//             if (info.gender) updateData.gender = info.gender;

//             if (info.preferred_doctor) {
//                 // If it's already a valid ObjectId, use it directly
//                 if (mongoose.Types.ObjectId.isValid(info.preferred_doctor)) {
//                     updateData.preferredDoctor = info.preferred_doctor;
//                 } else {
//                     // Otherwise, try to find by name
//                     const doctor = await Doctor.findOne({ name: info.preferred_doctor });
//                     if (doctor) {
//                         updateData.preferredDoctor = doctor._id;
//                     } else {
//                         return { success: false, message: "Doctor not found" };
//                     }
//                 }
//             }

//             if (info.preferred_time) updateData.preferredTime = info.preferred_time;

//             await Patient.findByIdAndUpdate(patientId, updateData);
//             return { success: true, message: "Patient information updated successfully" };
//         } catch (error) {
//             console.error("Error updating patient info:", error);
//             return { success: false, message: "Failed to update patient information" };
//         }
//     };

//     // Enhanced patient data loading
//     const loadPatientData = async (patientId) => {
//         try {
//             const patient = await Patient.findById(patientId)
//                 .populate('preferredDoctor', 'name specialty');

//             if (patient) {
//                 patientData = {
//                     id: patient._id,
//                     name: patient.name,
//                     phone: patient.phone,
//                     email: patient.email,
//                     age: patient.age,
//                     gender: patient.gender,
//                     preferredDoctor: patient.preferredDoctor?.name,
//                     lastVisit: patient.lastAppointment,
//                     totalVisits: patient.callDetails ? patient.callDetails.length : 0
//                 };

//                 // Load upcoming appointments
//                 upcomingAppointments = await getUpcomingAppointments(patientId);

//                 console.log('Patient data loaded:', patientData);
//                 console.log('Upcoming appointments:', upcomingAppointments);

//                 return true;
//             }
//             return false;
//         } catch (error) {
//             console.error('Error loading patient data:', error);
//             return false;
//         }
//     };

//     // Get upcoming appointments
//     const getUpcomingAppointments = async (patientId) => {
//         try {
//             const now = new Date();
//             const appointments = await Appointment.find({
//                 patient: patientId,
//                 dateTime: { $gte: now },
//                 status: { $in: ['confirmed', 'scheduled', 'rescheduled'] }
//             })
//                 .populate('doctor', 'name specialty')
//                 .sort({ dateTime: 1 })
//                 .limit(5);

//             return appointments.map(apt => ({
//                 id: apt._id,
//                 doctor: apt.doctor.name,
//                 specialty: apt.doctor.specialty,
//                 date: apt.dateTime.toLocaleDateString('en-US', {
//                     weekday: 'long',
//                     year: 'numeric',
//                     month: 'long',
//                     day: 'numeric'
//                 }),
//                 time: apt.dateTime.toLocaleTimeString('en-US', {
//                     hour: '2-digit',
//                     minute: '2-digit'
//                 }),
//                 reason: apt.reason,
//                 status: apt.status,
//                 confirmationNumber: `APT-${apt._id.toString().slice(-6).toUpperCase()}`
//             }));
//         } catch (error) {
//             console.error('Error fetching upcoming appointments:', error);
//             return [];
//         }
//     };
// }

// function ulawToPcm16(ulawBuffer) {
//     const pcm16Buffer = Buffer.alloc(ulawBuffer.length * 2);

//     // μ-law decompression table for faster lookup
//     const ulawTable = [
//         -32124, -31100, -30076, -29052, -28028, -27004, -25980, -24956,
//         -23932, -22908, -21884, -20860, -19836, -18812, -17788, -16764,
//         -15996, -15484, -14972, -14460, -13948, -13436, -12924, -12412,
//         -11900, -11388, -10876, -10364, -9852, -9340, -8828, -8316,
//         -7932, -7676, -7420, -7164, -6908, -6652, -6396, -6140,
//         -5884, -5628, -5372, -5116, -4860, -4604, -4348, -4092,
//         -3900, -3772, -3644, -3516, -3388, -3260, -3132, -3004,
//         -2876, -2748, -2620, -2492, -2364, -2236, -2108, -1980,
//         -1884, -1820, -1756, -1692, -1628, -1564, -1500, -1436,
//         -1372, -1308, -1244, -1180, -1116, -1052, -988, -924,
//         -876, -844, -812, -780, -748, -716, -684, -652,
//         -620, -588, -556, -524, -492, -460, -428, -396,
//         -372, -356, -340, -324, -308, -292, -276, -260,
//         -244, -228, -212, -196, -180, -164, -148, -132,
//         -120, -112, -104, -96, -88, -80, -72, -64,
//         -56, -48, -40, -32, -24, -16, -8, 0,
//         32124, 31100, 30076, 29052, 28028, 27004, 25980, 24956,
//         23932, 22908, 21884, 20860, 19836, 18812, 17788, 16764,
//         15996, 15484, 14972, 14460, 13948, 13436, 12924, 12412,
//         11900, 11388, 10876, 10364, 9852, 9340, 8828, 8316,
//         7932, 7676, 7420, 7164, 6908, 6652, 6396, 6140,
//         5884, 5628, 5372, 5116, 4860, 4604, 4348, 4092,
//         3900, 3772, 3644, 3516, 3388, 3260, 3132, 3004,
//         2876, 2748, 2620, 2492, 2364, 2236, 2108, 1980,
//         1884, 1820, 1756, 1692, 1628, 1564, 1500, 1436,
//         1372, 1308, 1244, 1180, 1116, 1052, 988, 924,
//         876, 844, 812, 780, 748, 716, 684, 652,
//         620, 588, 556, 524, 492, 460, 428, 396,
//         372, 356, 340, 324, 308, 292, 276, 260,
//         244, 228, 212, 196, 180, 164, 148, 132,
//         120, 112, 104, 96, 88, 80, 72, 64,
//         56, 48, 40, 32, 24, 16, 8, 0
//     ];

//     for (let i = 0; i < ulawBuffer.length; i++) {
//         const sample = ulawTable[ulawBuffer[i]];
//         pcm16Buffer.writeInt16LE(sample, i * 2);
//     }

//     return pcm16Buffer;
// }



// function getInstructions(patientContext) {
//     const hospitalName = process.env.HOSPITAL_NAME || 'City General Hospital';
//     const hospitalPhone = process.env.HOSPITAL_MAIN_PHONE || 'our main number';
//     const hospitalAddress = process.env.HOSPITAL_ADDRESS || 'our hospital';
//     const departments = process.env.HOSPITAL_DEPARTMENTS?.split(',') || [];

//     return `You are MediAssist, the AI receptionist for ${hospitalName}. Your role is to help patients with appointments, prescription refills, and general inquiries for ${hospitalName}.

//     ${patientContext}

//     HOSPITAL IDENTITY & GREETING:
//     - Always start with: "Thank you for calling ${hospitalName}."
//     - For returning patients, add personal recognition: "Hello [Patient Name]! It's good to hear from you again."
//     - For new patients, continue with: "How can I help you today?"
//     - When patients ask about the hospital, refer to it as "${hospitalName}"

//     HOSPITAL INFORMATION:
//     - Hospital Name: ${hospitalName}
//     - Main Phone: ${hospitalPhone}
//     - Address: ${hospitalAddress}
//     - Available Departments: ${departments.join(', ')}
//     - Hours: ${process.env.HOSPITAL_HOURS_WEEKDAY || '8:00 AM - 8:00 PM'} (weekdays)
//     - Weekend Hours: ${process.env.HOSPITAL_HOURS_WEEKEND || '9:00 AM - 5:00 PM'}
//     - Emergency Department: ${process.env.HOSPITAL_HOURS_EMERGENCY || '24/7'}

//     GREETING & PATIENT RECOGNITION:
//     - If patient data exists, greet them personally: "Hello [Patient Name]! This is MediAssist. It's good to hear from you again."
//     - For new patients: "Hello! This is MediAssist, your hospital's AI assistant."
//     - Be friendly, professional, and efficient
//     - DO NOT repeat stored patient information unless specifically asked

//     RETURNING PATIENT BEHAVIOR:
//     - Since you already have their information, don't ask for name, phone, or basic details again
//     - Use stored preferred doctor when booking appointments
//     - Reference their appointment history appropriately with ${hospitalName}
//     - When they ask about appointments, immediately tell them about their upcoming appointments at ${hospitalName}

//     APPOINTMENT INQUIRIES:
//     - When patient asks "what are my appointments" or "do I have any appointments", immediately list their upcoming appointments at ${hospitalName}
//     - Include date, time, doctor, reason, and confirmation number
//     - If no upcoming appointments, offer to schedule one at ${hospitalName}

//     CORE RESPONSIBILITIES FOR ${hospitalName}:
//     - Help patients schedule, reschedule, or cancel appointments at ${hospitalName}
//     - Process prescription refill requests for ${hospitalName} patients
//     - Check doctor availability at ${hospitalName}
//     - Answer questions about ${hospitalName} services, hours, location, and departments
//     - Show upcoming appointments at ${hospitalName} when requested
//     - Use stored patient information efficiently

//     APPOINTMENT MANAGEMENT:
//     - For returning patients, use their stored information automatically
//     - When rescheduling/canceling, reference their upcoming appointments
//     - Always provide confirmation numbers for changes

//     PRESCRIPTION REFILLS:
//     - For returning patients, use their stored information
//     - Still collect medication-specific details (medication name, doctor, etc.)
//     - Reference their preferred doctor if applicable

//     HOSPITAL-SPECIFIC RESPONSES:
//     - "Let me check our ${hospitalName} system for you..."
//     - "I'll help you schedule an appointment at ${hospitalName}..."
//     - "Your prescription will be processed by our ${hospitalName} pharmacy..."
//     - "For urgent medical matters, please visit our ${hospitalName} Emergency Department..."

//     IMPORTANT LIMITATIONS:
//     - Never provide medical advice, diagnosis, or treatment recommendations
//     - For medical concerns: "I'll need to connect you with one of our ${hospitalName} medical professionals..."
//     - Cannot access medical records or discuss protected health information
//     - For complex issues: "Let me connect you with our ${hospitalName} staff member who can assist you further..."

//     COMMUNICATION STYLE:
//     - Represent ${hospitalName} professionally and warmly
//     - Personalized and efficient for returning patients
//     - Make patients feel welcomed to ${hospitalName}
//     - Always refer to the hospital by name when appropriate
//     - Don't ask for information you already have
//     - Keep responses concise but thorough
//     - Always confirm important information
//     - End calls: "Is there anything else I can help you with today?"

//     Remember: You represent ${hospitalName} - make every caller feel valued and ensure they receive excellent service.`;
// }

// function getInstructions(patientData, upcomingAppointments) {
//     const hospitalName = process.env.HOSPITAL_NAME || 'City General Hospital';
//     const hospitalPhone = process.env.HOSPITAL_MAIN_PHONE || 'our main number';
//     const hospitalAddress = process.env.HOSPITAL_ADDRESS || 'our hospital';
//     const departments = process.env.HOSPITAL_DEPARTMENTS?.split(',') || [];

//     // Build patient context if available
//     let patientContext = "";
//     if (patientData) {
//         patientContext = `
// PATIENT CONTEXT (Do not repeat this information unless specifically asked):
// - Patient Name: ${patientData.name}
// - Phone: ${patientData.phone}
// - Previous visits: ${patientData.totalVisits}
// ${patientData.preferredDoctor ? `- Preferred Doctor: ${patientData.preferredDoctor}` : ''}
// ${patientData.age ? `- Age: ${patientData.age}` : ''}
// ${patientData.gender ? `- Gender: ${patientData.gender}` : ''}

// UPCOMING APPOINTMENTS:
// ${upcomingAppointments && upcomingAppointments.length > 0 ?
//                 upcomingAppointments.map(apt =>
//                     `- ${apt.date} at ${apt.time} with Dr. ${apt.doctor} (${apt.reason}) - Confirmation: ${apt.confirmationNumber}`
//                 ).join('\n') :
//                 '- No upcoming appointments scheduled'
//             }`;
//     }

//     return `You are the AI receptionist for ${hospitalName}. Your role is to help patients with appointments, prescription refills, and general inquiries for ${hospitalName}. Speak naturally and conversationally, like a friendly human receptionist.

//     ${patientContext}

//     HOSPITAL IDENTITY & GREETING:
//     - For new patients: "Thank you for calling ${hospitalName}. How can I help you today?"
//     - For returning patients: "Thank you for calling ${hospitalName}. Hi [Patient Name]! How can I help you today?"
//     - Sound warm, welcoming, and natural - like you're genuinely happy to help
//     - When patients ask about the hospital, refer to it as "${hospitalName}"

//     HOSPITAL INFORMATION:
//     - Hospital Name: ${hospitalName}
//     - Main Phone: ${hospitalPhone}
//     - Address: ${hospitalAddress}
//     - Available Departments: ${departments.join(', ')}
//     - Hours: ${process.env.HOSPITAL_HOURS_WEEKDAY || '8:00 AM - 8:00 PM'} (weekdays)
//     - Weekend Hours: ${process.env.HOSPITAL_HOURS_WEEKEND || '9:00 AM - 5:00 PM'}
//     - Emergency Department: ${process.env.HOSPITAL_HOURS_EMERGENCY || '24/7'}

//     RETURNING PATIENT BEHAVIOR:
//     - Since you already have their information, don't ask for name, phone, or basic details again
//     - Use stored preferred doctor when booking appointments
//     - Reference their appointment history appropriately with ${hospitalName}
//     - When they ask about appointments, immediately tell them about their upcoming appointments at ${hospitalName}

//     APPOINTMENT INQUIRIES:
//     - When patient asks "what are my appointments" or "do I have any appointments", immediately list their upcoming appointments at ${hospitalName}
//     - Include date, time, doctor, reason, and confirmation number
//     - If no upcoming appointments, offer to schedule one at ${hospitalName}

//     CALL ENDING DETECTION:
//     - Listen for conversation ending cues: "thank you", "that's all", "nothing else", "goodbye", "bye", "have a good day"
//     - When patient indicates they're done, FIRST say your natural goodbye message, THEN call the end_call function
//     - Sequence: 1) Say goodbye naturally ("Thanks for calling ${hospitalName}. Have a great day!") 2) Call end_call function
//     - Don't keep asking "anything else?" if patient has clearly indicated they're finished
//     - Examples of proper call endings:
//       * Patient: "Thank you, that's all"
//       * AI: "You're welcome! Thanks for calling ${hospitalName}. Have a wonderful day!" [calls end_call]
//       * Patient: "Perfect, nothing else" 
//       * AI: "Great! Thank you for choosing ${hospitalName}. Take care!" [calls end_call]

//     CORE RESPONSIBILITIES FOR ${hospitalName}:
//     - Help patients schedule, reschedule, or cancel appointments at ${hospitalName}
//     - Process prescription refill requests for ${hospitalName} patients
//     - Check doctor availability at ${hospitalName}
//     - Answer questions about ${hospitalName} services, hours, location, and departments
//     - Show upcoming appointments at ${hospitalName} when requested
//     - Use stored patient information efficiently

//     HOSPITAL-SPECIFIC RESPONSES:
//     - "Let me check our ${hospitalName} system for you..."
//     - "I'll help you schedule an appointment at ${hospitalName}..."
//     - "Your prescription will be processed by our ${hospitalName} pharmacy..."
//     - "For urgent medical matters, please visit our ${hospitalName} Emergency Department..."

//     IMPORTANT LIMITATIONS:
//     - Never provide medical advice, diagnosis, or treatment recommendations
//     - For medical concerns: "I'll need to connect you with one of our ${hospitalName} medical professionals..."
//     - Cannot access medical records or discuss protected health information
//     - For complex issues: "Let me connect you with our ${hospitalName} staff member who can assist you further..."

//     COMMUNICATION STYLE:
//     - Sound natural and conversational, like a helpful human receptionist
//     - Use casual, friendly language: "Sure!", "Absolutely!", "Let me check that for you"
//     - Vary your responses - don't sound robotic or repetitive
//     - Show genuine interest: "That sounds good", "Perfect!", "Great choice"
//     - Use natural speech patterns with contractions: "I'll", "You're", "We've", "Let's"
//     - Make patients feel welcomed and comfortable at ${hospitalName}
//     - End calls naturally: "Great! Thanks for calling ${hospitalName}. Have a wonderful day!"

//     NATURAL SPEECH GUIDELINES:
//     - Speak like you're having a friendly conversation
//     - Use filler words occasionally: "um", "let's see", "okay"
//     - Sound enthusiastic but not overly cheerful
//     - Pause naturally in speech - don't rush
//     - Use natural transitions: "So...", "Now...", "Alright..."
//     - Sound human, not like a script

//     Remember: You're a helpful, friendly person who happens to work at ${hospitalName} - make every caller feel valued and comfortable.`;
// }



{ /*  SINGLE CALL HANDLING */ }
import WebSocket from "ws";
import twilio from "twilio";
import { checkDoctorAvailability } from "./doctors.js";
import 'dotenv/config';
import fs from "fs";
import wav from "wav";
import Patient from "../models/Patient.js";
import CallLog from "../models/CallLog.js";
import mongoose from "mongoose";
import Doctor from "../models/Doctor.js";
import { bookAppointment, findPatientAppointments, cancelAppointmentByDetails, rescheduleAppointmentByDetails } from "./appointment.js";
import { processPrescriptionRefill } from './prescriptionRefill.js';
import Appointment from "../models/Appointment.js";
import { AudioBufferManager, transcribeAudio } from "./transcription.js";

function getInstructions(callContext, patientData, appointmentData) {
    const hospitalName = callContext.hospital?.name || 'City General Hospital';
    const hospitalPhone = callContext.hospital.phonenumber || 'our main number';
    const hospitalAddress = callContext.hospital.hospitalAddress || 'our hospital';
    const departments = callContext.hospital.departments || [];

    // Build patient context if available
    let patientContext = "";
    if (patientData) {
        patientContext = `
            PATIENT CONTEXT:
            - Patient Name: ${patientData.firstName}
            - Phone: ${patientData.phone}
            - Previous visits: ${patientData.totalVisits}
            ${patientData.preferredDoctor ? `- Preferred Doctor: ${patientData.preferredDoctor}` : ''}
            ${patientData.age ? `- Age: ${patientData.age}` : ''}
            ${patientData.gender ? `- Gender: ${patientData.gender}` : ''}
            ${patientData.dob ? `- dob: ${patientData.dob}` : ''}`



    }

    let appointmentContext = "";
    if (callContext.type === 'outbound' && callContext.callType === 'follow_up') {
        // For follow-up calls, show PAST appointment info
        if (appointmentData && appointmentData.pastAppointment) {
            appointmentContext = `
                RECENT APPOINTMENT (FOLLOW-UP CONTEXT):
                - Date: ${appointmentData.pastAppointment.date}
                - Time: ${appointmentData.pastAppointment.time}  
                - Doctor: Dr. ${appointmentData.pastAppointment.doctor}
                - Reason: ${appointmentData.pastAppointment.reason}
                - Status: ${appointmentData.pastAppointment.status}`;
        }

        // Also include upcoming appointments if any
        if (appointmentData && appointmentData.upcomingAppointments && appointmentData.upcomingAppointments.length > 0) {
            appointmentContext += `

                UPCOMING APPOINTMENTS:
                ${appointmentData.upcomingAppointments.map(apt =>
                `- ${apt.date} at ${apt.time} with Dr. ${apt.doctor} (${apt.reason})`
            ).join('\n')}`;
        }
    } else if (callContext.type === 'outbound' && callContext.callType === 'appointment_reminder') {
        // For reminder calls, show the specific appointment being reminded about
        if (callContext.reminderData) {
            appointmentContext = `
                APPOINTMENT REMINDER DETAILS:
                - Date: ${callContext.reminderData.appointmentDate}
                - Time: ${callContext.reminderData.appointmentTime}
                - Doctor: Dr. ${callContext.reminderData.doctorName} (${callContext.reminderData.doctorSpecialty})
                - Reason: ${callContext.reminderData.reason}
                - Confirmation: ${callContext.reminderData.confirmationNumber}`;
        }
    } else {
        // For inbound calls or other outbound calls, show upcoming appointments
        if (appointmentData && appointmentData.upcomingAppointments && appointmentData.upcomingAppointments.length > 0) {
            appointmentContext = `
                UPCOMING APPOINTMENTS:
                ${appointmentData.upcomingAppointments.map(apt =>
                `- ${apt.date} at ${apt.time} with Dr. ${apt.doctor} (${apt.reason}) - Confirmation: ${apt.confirmationNumber}`
            ).join('\n')}`;
        } else {
            appointmentContext = `
                UPCOMING APPOINTMENTS:
                - No upcoming appointments scheduled`;
        }
    }

    // Different instructions based on call type
    let roleAndGreeting = "";
    let specificInstructions = "";

    if (callContext.type === 'outbound') {
        // Outbound call specific behavior
        switch (callContext.callType) {
            case 'appointment_reminder':
                roleAndGreeting = `You are an Virtual assistant calling from ${hospitalName} for an OUTBOUND appointment reminder. The patient should be expecting this call or may not be. Be professional and clear about why you're calling.

                GREETING: "Hello, This is the Virtual assistant from ${hospitalName} calling. Am I speaking with ${patientData?.firstName || 'the patient'}? I'm calling to remind you about your upcoming appointment."`;

                // ENHANCED: Add timing-specific messaging
                const timingMessage = callContext.reminderType === '24_hour' ?
                    'This is your 24-hour reminder for tomorrow\'s appointment.' :
                    'This is your 1-hour reminder - your appointment is coming up soon.';

                specificInstructions = `
                    APPOINTMENT REMINDER SPECIFIC INSTRUCTIONS:
                    - Primary goal: Confirm the upcoming appointment and ensure patient remembers
                    - Timing: ${timingMessage}
                    - Appointment details: ${callContext.reminderData ? `
                    Date: ${callContext.reminderData.appointmentDate}
                    Time: ${callContext.reminderData.appointmentTime}
                    Doctor: Dr. ${callContext.reminderData.doctorName} (${callContext.reminderData.doctorSpecialty})
                    Reason: ${callContext.reminderData.reason}
                    Confirmation: ${callContext.reminderData.confirmationNumber}` : 'Details will be provided during call'}
                    - Ask if they need to reschedule
                    - For 24-hour reminders: Also remind about any preparation needed
                    - For 1-hour reminders: Focus on confirmation and arrival instructions
                    - Confirm their contact information
                    - If patient wants to cancel/reschedule, help them immediately`;
                break;

            case 'follow_up':
                roleAndGreeting = `You are an Virtual assistant calling from ${hospitalName} for an OUTBOUND follow-up call. This is a check-in call to see how the patient is doing AFTER their recent appointment.

                GREETING: "Hello, I am Virtual assistant calling from ${hospitalName}. Am I speaking with ${patientData?.firstName || 'the patient'}? I'm calling to follow up on your recent visit with us."`;

                specificInstructions = `
                FOLLOW-UP SPECIFIC INSTRUCTIONS:
                - Primary goal: Check on patient's wellbeing and recovery after their RECENT appointment
                - Be empathetic and caring
                - Reference their PAST appointment that you're following up on
                - Ask how they're feeling since their last visit
                - Check if they have any concerns or questions about their recent treatment
                - Do NOT mention upcoming appointments unless patient asks about scheduling
                - Focus on their recovery and wellbeing from the recent visit
                - Document any issues they mention
                - If they report problems, offer to connect them with medical staff
                - Only mention future appointments if they specifically ask about next steps`;
                break;

            case 'prescription_reminder':
                roleAndGreeting = `You are an Virtual assistant calling from ${hospitalName} regarding prescription refills.

                GREETING: "Hello, I am Virtual assistant calling from ${hospitalName}. Am I speaking with ${patientData?.firstName || 'the patient'}? I'm calling about your prescription refill."`;

                specificInstructions = `
                PRESCRIPTION REMINDER INSTRUCTIONS:
                - Remind about prescription that needs refilling
                - Check if they still need the medication
                - Help process refill if needed
                - Confirm pharmacy information
                - Ask about any side effects or concerns`;
                break;

            default:
                roleAndGreeting = `You are an Virtual assistant calling from ${hospitalName}. Be professional and clearly state why you're calling.

                GREETING: "Hello,I am Virtual assistant calling from ${hospitalName}. Am I speaking with ${patientData?.firstName || 'the patient'}?"`;

                specificInstructions = `
                GENERAL OUTBOUND INSTRUCTIONS:
                - Clearly state the reason for your call
                - Be respectful of their time
                - If this is an inconvenient time, offer to call back
                - Stay focused on the purpose of the call`;
        }

        specificInstructions += `

                OUTBOUND CALL BEST PRACTICES:
                - Always verify you're speaking to the correct person
                - If the patient seems confused, clearly explain why you're calling
                - Be prepared for the patient to be busy or unavailable
                - Offer to call back at a more convenient time
                - If they ask to be removed from calls, note this and respect their wishes
                - If no answer or wrong number, end call gracefully
                - Be more directive and purpose-driven than inbound calls`;

    } else {
        // Inbound call behavior (existing)
        roleAndGreeting = `You are the Virtual receptionist for ${hospitalName}. Your role is to help patients with appointments, prescription refills, and general inquiries.

        GREETING:
        - For new patients: "This is Virtual assistant,Thank you for calling ${hospitalName}. How can I help you today?"
        - For returning patients: "Hello ${patientData?.firstName || 'there'}!, I am Virtual assistant from ${hospitalName}, How are you doing? What can I help you with today?"`;

        specificInstructions = `
        INBOUND CALL INSTRUCTIONS:
        - Listen to what the patient needs first
        - Be reactive to their requests
        - Use stored patient information efficiently
        - Let the conversation flow naturally based on their needs`;
    }

    return `${roleAndGreeting}

        ${patientContext}

        HOSPITAL INFORMATION:
        - Hospital Name: ${hospitalName}
        - Main Phone: ${hospitalPhone}
        - Address: ${hospitalAddress}
        - Available Departments: ${departments.join(', ')}
        - Hours: ${callContext.hospital.weekdayHours || '8:00 AM - 8:00 PM'} (weekdays)
        - Weekend Hours: ${callContext.hospital.weekendHours || '9:00 AM - 5:00 PM'}
        - Emergency Department: '24/7'

        ${specificInstructions}

        COMMUNICATION STYLE:
        - Sound natural and conversational, like a helpful human ${callContext.type === 'outbound' ? 'healthcare coordinator' : 'receptionist'}
        - Use casual, friendly language: "Sure!", "Absolutely!", "Let me check that for you"
        - Vary your responses - don't sound robotic or repetitive
        - Show genuine interest: "That sounds good", "Perfect!", "Great choice"
        - Use natural speech patterns with contractions: "I'll", "You're", "We've", "Let's"
        - ${callContext.type === 'outbound' ? 'Be respectful of their time and stay focused on the call purpose' : 'Make patients feel welcomed and comfortable'}

        CALL ENDING INSTRUCTIONS:
        - When you call the end_call function, that means the conversation is COMPLETELY FINISHED
        - Do NOT generate any additional responses after calling end_call
        - Your final message should be your natural goodbye BEFORE calling end_call
        - The end_call function call itself should be the very last action
        - DO NOT explain that you're ending the call or provide additional farewells after calling end_call

        CALL ENDING DETECTION:
        - ONLY end the call when the patient CLEARLY indicates they want to end the conversation
        - Do NOT end the call just because patient says "thank you" - this could be in the middle of conversation
        - Look for CLEAR ending phrases like:
        * "Nothing else" + any closing phrase
        * "I'm good" + "goodbye/bye"
        * "Have a good day" (from patient to you)
        * Patient says "goodbye" or "bye" 
        - Do NOT end for simple "thank you" responses during ongoing conversation
        - When patient CLEARLY wants to end: 
        1. Say your natural goodbye message
        2. THEN immediately call end_call function
        3. DO NOT say anything else after calling end_call
        - Ask "Is there anything else I can help you with today?" if unsure whether patient wants to continue

        CORE RESPONSIBILITIES:
        - Help patients schedule, reschedule, or cancel appointments
        - Process prescription refill requests
        - Check doctor availability
        - Answer questions about hospital services, hours, location, and departments
        - Show upcoming appointments when requested
        - ${callContext.type === 'outbound' ? 'Complete the specific purpose of this outbound call efficiently' : 'Use stored patient information efficiently'}

        IMPORTANT LIMITATIONS:
        - Never provide medical advice, diagnosis, or treatment recommendations
        - For medical concerns: "I'll need to connect you with one of our medical professionals..."
        - Cannot access medical records or discuss protected health information
        - For complex issues: "Let me connect you with our staff member who can assist you further..."

        HUMAN TRANSFER CAPABILITY:
        - You CAN transfer callers to human staff when requested
        - Listen for phrases like: "speak to a person", "talk to someone real", "human representative", "transfer me", "I need to speak to staff"
        - When someone asks for a human, respond warmly: "Of course! I'll transfer you to one of our staff members right away. Please hold on."
        - Use the transfer_to_human function when patients request it
        - Common transfer reasons:
        * Patient explicitly asks for human help
        * Complex medical questions beyond your scope
        * Billing or insurance issues
        * Complaints or sensitive situations
        * Technical issues you cannot resolve

        TRANSFER SCENARIOS:
        - "Can I speak to a real person?" → "Absolutely! Let me connect you with our staff right away."
        - "This is too complicated" → "No problem! I'll transfer you to someone who can help."
        - "I need to speak to someone about billing" → "I'll transfer you to our billing department."
        - "I have a complaint" → "I understand. Let me connect you with our patient relations team."

        IMPORTANT TRANSFER NOTES:
        - Always be positive about transfers - never make it seem like a failure
        - Briefly explain what you're doing: "I'm transferring you now..."
        - If transfer fails, apologize and offer to help yourself
        - Don't over-explain technical details about the transfer process

        Remember: You're a helpful, ${callContext.type === 'outbound' ? 'proactive' : 'responsive'} person who works at ${hospitalName} - make every interaction professional and valuable.`;
}

export async function callAssistant(connection, req) {
    console.log('Starting AI assistant');

    // Extract context from URL parameters or WebSocket connection
    let callContext = null;

    try {
        const url = new URL(req.url, `http://${req.headers.host}`);
        const callSid = url.searchParams.get('callSid');
        const contextKey = url.searchParams.get('contextKey');

        // Get call context from global map
        if (global.callContextMap) {
            if (contextKey) {
                callContext = global.callContextMap.get(contextKey);
            }

            if (!callContext && callSid) {
                callContext = global.callContextMap.get(callSid);
            }
        }
    } catch (urlError) {
        console.error('Error parsing URL:', urlError);
    }

    // ENHANCED FALLBACK: Find most recent context
    if (!callContext) {
        if (global.callContextMap && global.callContextMap.size > 0) {
            let mostRecentContext = null;
            let mostRecentTime = 0;

            for (const [key, context] of global.callContextMap.entries()) {
                if (context.timestamp && context.timestamp > mostRecentTime) {
                    mostRecentTime = context.timestamp;
                    mostRecentContext = context;
                }
            }

            if (mostRecentContext) {
                const timeDiff = Date.now() - mostRecentContext.timestamp;
                // Use context if it's within last 60 seconds (increased from 30)
                if (timeDiff < 60000) {
                    callContext = mostRecentContext;
                } else {
                    console.log('Most recent context is too old, not using it');
                }
            } else {
                console.log(' No contexts found with timestamps');
            }
        }
    }

    // Enhanced mark tracking for call ending
    let finalMessageMarkSent = false;
    let finalMessageMarkReceived = false;
    let callEndingInProgress = false;

    let callLog = null;
    let patientId = callContext.patientId || null;
    let callLogId = null;
    let conversationTranscript = [];
    let isFinalized = false;
    let from = callContext.from || null;
    let to = callContext.to || null;
    let type = callContext.type || null;
    let patientData = null;
    let upcomingAppointments = [];

    // let wavWriterOpen = true;
    // let wavWriter1Open = true;

    // const timestamp = Date.now();
    // const outputFile = `./ai_responses/ai_response_${timestamp}.wav`;
    // fs.mkdirSync("./ai_responses", { recursive: true });

    // const fileStream = fs.createWriteStream(outputFile);
    // const wavWriter = new wav.Writer({
    //     channels: 1,
    //     sampleRate: 8000,
    //     bitDepth: 16
    // });
    // wavWriter.pipe(fileStream);

    // const inputFile = `./user_responses/user_response_${timestamp}.wav`;
    // fs.mkdirSync("./user_responses", { recursive: true });

    // const fileStream1 = fs.createWriteStream(inputFile);
    // const wavWriter1 = new wav.Writer({
    //     channels: 1,
    //     sampleRate: 8000,
    //     bitDepth: 16
    // });
    // wavWriter1.pipe(fileStream1);

    // Connection-specific state
    let streamSid = null;
    let latestMediaTimestamp = 0;
    let lastAssistantItem = null;
    let markQueue = [];
    let responseStartTimestampTwilio = null;
    let audioChunkCount = 0;
    let openAiWs = null;
    let isInitialized = false;
    let detectedIntent = null;
    let extractedEntities = {};
    let TEMPERATURE = 0.8;
    let appointmentData;
    let transferInProgress = false;

    let userAudioBuffer = new AudioBufferManager(800); // Minimum 800ms of audio
    let isUserSpeaking = false;
    let speechEndTimeout = null;
    let transcriptionInProgress = false;

    // Handle incoming messages from Twilio
    connection.on('message', async (message) => {
        try {
            const data = JSON.parse(message);

            switch (data.event) {
                case 'start':
                    streamSid = data.start.streamSid;
                    connection.streamSid = streamSid;

                    const twilioCallSid = data.start.callSid;

                    if (callContext && !callContext.twilioCallSid) {
                        callContext.twilioCallSid = twilioCallSid;
                        if (global.callContextMap) {
                            global.callContextMap.set(twilioCallSid, callContext);
                        }
                    }

                    if (patientId) {
                        console.log('Loading patient data for patientId:', patientId);
                        await loadPatientData(patientId);
                    } else {
                        console.log('No patientId available, skipping patient data load');
                    }

                    if (!callLogId) {
                        callLogId = await createCallLog(data.start, from, to, patientId, type);
                    }

                    if (!isInitialized) {
                        await initializeOpenAI();
                        isInitialized = true;
                    }

                    // Reset state
                    responseStartTimestampTwilio = null;
                    latestMediaTimestamp = 0;
                    audioChunkCount = 0;
                    break;

                case 'media':
                    if (!openAiWs || openAiWs.readyState !== WebSocket.OPEN) {
                        return;
                    }

                    latestMediaTimestamp = data.media.timestamp;

                    // Save user audio
                    const ulawBuffer = Buffer.from(data.media.payload, "base64");
                    const pcm16Buffer = ulawToPcm16(ulawBuffer);
                    // if (wavWriter1Open) {
                    //     wavWriter1.write(pcm16Buffer);
                    // }
                    if (isUserSpeaking) {
                        userAudioBuffer.addChunk(ulawBuffer);
                    }

                    // Send to OpenAI
                    const audioAppend = {
                        type: 'input_audio_buffer.append',
                        audio: data.media.payload
                    };
                    openAiWs.send(JSON.stringify(audioAppend));
                    break;

                case 'mark':
                    if (markQueue.length > 0) {
                        markQueue.shift();
                        const receivedMark = markQueue.shift();
                        // Check if this is the final message mark
                        if ((receivedMark === 'finalMessage' || data.mark?.name === 'finalMessage') && callEndingInProgress) {
                            finalMessageMarkReceived = true;
                            console.log('Final message mark received - ending call gracefully');

                            // Give a bit more time for audio to complete
                            setTimeout(() => {
                                endCallSafely();
                            }, 500);
                        }
                    }
                    break;

                case 'stop':
                    console.log('Stream stopped');
                    await finalizeCallLog();
                    break;

                default:
                    console.log('Unhandled Twilio event:', data.event);
                    break;
            }
        } catch (error) {
            console.error('Error parsing Twilio message:', error);
        }
    });

    connection.on("close", async () => {
        console.log('Twilio connection closed');
        if (openAiWs && openAiWs.readyState === WebSocket.OPEN) {
            openAiWs.close();
        }
        // if (wavWriterOpen) {
        //     wavWriter.end();
        //     wavWriterOpen = false;
        // }
        // if (wavWriter1Open) {
        //     wavWriter1.end();
        //     wavWriter1Open = false;
        // }
        await finalizeCallLog();
    });

    connection.on("error", (error) => {
        console.error("Twilio WebSocket error:", error);
    });

    // Initialize OpenAI connection
    async function initializeOpenAI() {
        console.log('Initializing OpenAI connection...');

        openAiWs = new WebSocket(`wss://api.openai.com/v1/realtime?model=gpt-realtime&temperature=${TEMPERATURE}`, {
            headers: {
                "Authorization": "Bearer " + process.env.OPENAI_API_KEY,
            }
        });

        openAiWs.on("open", () => {
            const sessionUpdate = {
                type: "session.update",
                session: {
                    type: 'realtime',
                    model: "gpt-realtime",
                    output_modalities: ["audio"],
                    // instructions: getInstructions(patientData, upcomingAppointments),
                    instructions: getInstructions(callContext, patientData, appointmentData),
                    audio: {
                        input: {
                            format: { type: 'audio/pcmu' },
                            turn_detection: { type: "server_vad", "silence_duration_ms": 850 }
                        },
                        output: {
                            format: { type: 'audio/pcmu' },
                            voice: 'cedar',
                            "speed": 1.0
                        },
                    },
                    tools: [
                        {
                            type: "function",
                            name: "get_my_appointments",
                            description: "Show patient their upcoming appointments",
                            parameters: {
                                type: "object",
                                properties: {
                                    include_past: {
                                        type: "boolean",
                                        description: "Whether to include past appointments",
                                        default: false
                                    },
                                    limit: {
                                        type: "number",
                                        description: "Number of appointments to show",
                                        default: 5
                                    }
                                }
                            }
                        },
                        {
                            type: "function",
                            name: "check_doctor_availability",
                            description: "Check if a doctor is available for appointments on a specific date",
                            parameters: {
                                type: "object",
                                properties: {
                                    doctor_name: {
                                        type: "string",
                                        description: "Name of the doctor to check availability for"
                                    },
                                    date: {
                                        type: "string",
                                        description: "Date to check in YYYY-MM-DD format"
                                    },
                                    specialty: {
                                        type: "string",
                                        description: "Medical specialty if doctor name is not provided"
                                    }
                                },
                                required: ["date"]
                            }
                        },
                        {
                            type: "function",
                            name: "book_appointment",
                            description: "Book an appointment for a patient (use stored patient info for returning patients)",
                            parameters: {
                                type: "object",
                                properties: {
                                    patient_firstname: {
                                        type: "string",
                                        description: "Patient's first name (use stored firstName for returning patients)"
                                    },
                                    patient_lastname: {
                                        type: "string",
                                        description: "Patient's last name (use stored lastName for returning patients)"
                                    },
                                    patient_phone: {
                                        type: "string",
                                        description: "Patient's phone number (use stored phone for returning patients)"
                                    },
                                    patient_dob: {
                                        type: "string",
                                        description: "Patient's dob (use stored dob for returning patients)"
                                    },
                                    patient_age: {
                                        type: "string",
                                        description: "Patient's age (use stored age for returning patients)"
                                    },
                                    doctor_name: {
                                        type: "string",
                                        description: "Name of the doctor"
                                    },
                                    date: {
                                        type: "string",
                                        description: "Appointment date in YYYY-MM-DD format"
                                    },
                                    time: {
                                        type: "string",
                                        description: "Appointment time in HH:MM format"
                                    },
                                    reason: {
                                        type: "string",
                                        description: "Reason for the appointment"
                                    }
                                },
                                required: ["doctor_name", "date", "time", "reason"]
                            }
                        },
                        {
                            type: "function",
                            name: "find_patient_appointments",
                            description: "Find patient's existing appointments using patient details",
                            parameters: {
                                type: "object",
                                properties: {
                                    patient_name: {
                                        type: "string",
                                        description: "Patient's full name"
                                    },
                                    patient_phone: {
                                        type: "string",
                                        description: "Patient's phone number"
                                    },
                                    doctor_name: {
                                        type: "string",
                                        description: "Doctor's name to filter appointments"
                                    },
                                    date_from: {
                                        type: "string",
                                        description: "Start date to search from in YYYY-MM-DD format"
                                    }
                                }
                            }
                        },
                        {
                            type: "function",
                            name: "update_patient_info",
                            description: "Update patient information during the call",
                            parameters: {
                                type: "object",
                                properties: {
                                    firstName: { type: "string", description: "Patient's first name" },
                                    lastName: { type: "string", description: "Patient's last name" },
                                    age: { type: "number", description: "Patient's age" },
                                    dob: {
                                        type: "string",
                                        description: "Patient's date of birth in YYYY-MM-DD format"
                                    },
                                    gender: { type: "string", enum: ["male", "female", "other"] },
                                    preferred_doctor: { type: "string", description: "Preferred doctor name" },
                                    preferred_time: { type: "string", description: "Preferred appointment time" }
                                }
                            }
                        },
                        {
                            type: "function",
                            name: "reschedule_appointment",
                            description: "Reschedule an appointment using appointment details instead of ID",
                            parameters: {
                                type: "object",
                                properties: {
                                    patient_name: {
                                        type: "string",
                                        description: "Patient's full name"
                                    },
                                    patient_phone: {
                                        type: "string",
                                        description: "Patient's phone number"
                                    },
                                    original_doctor: {
                                        type: "string",
                                        description: "Original doctor's name"
                                    },
                                    original_date: {
                                        type: "string",
                                        description: "Original appointment date in YYYY-MM-DD format"
                                    },
                                    original_time: {
                                        type: "string",
                                        description: "Original appointment time in HH:MM format"
                                    },
                                    new_date: {
                                        type: "string",
                                        description: "New appointment date in YYYY-MM-DD format"
                                    },
                                    new_time: {
                                        type: "string",
                                        description: "New appointment time in HH:MM format"
                                    }
                                },
                                required: ["patient_name", "original_doctor", "original_date", "new_date", "new_time"]
                            }
                        },
                        {
                            type: "function",
                            name: "cancel_appointment",
                            description: "Cancel an appointment using appointment details instead of ID",
                            parameters: {
                                type: "object",
                                properties: {
                                    patient_name: {
                                        type: "string",
                                        description: "Patient's full name"
                                    },
                                    patient_phone: {
                                        type: "string",
                                        description: "Patient's phone number"
                                    },
                                    doctor_name: {
                                        type: "string",
                                        description: "Doctor's name"
                                    },
                                    appointment_date: {
                                        type: "string",
                                        description: "Appointment date in YYYY-MM-DD format"
                                    },
                                    appointment_time: {
                                        type: "string",
                                        description: "Appointment time in HH:MM format"
                                    },
                                    reason: {
                                        type: "string",
                                        description: "Reason for cancellation"
                                    }
                                },
                                required: ["patient_name", "doctor_name", "appointment_date"]
                            }
                        },
                        {
                            type: "function",
                            name: "request_prescription_refill",
                            description: "Process a prescription refill request from a patient",
                            parameters: {
                                type: "object",
                                properties: {
                                    patient_name: {
                                        type: "string",
                                        description: "Patient's full name"
                                    },
                                    patient_phone: {
                                        type: "string",
                                        description: "Patient's phone number"
                                    },
                                    medication_name: {
                                        type: "string",
                                        description: "Name of the medication to refill"
                                    },
                                    prescribing_doctor: {
                                        type: "string",
                                        description: "Name of the doctor who prescribed the medication"
                                    },
                                    dosage: {
                                        type: "string",
                                        description: "Medication dosage (e.g., '10mg', '500mg twice daily')"
                                    },
                                    last_refill_date: {
                                        type: "string",
                                        description: "Date of last refill in YYYY-MM-DD format"
                                    },
                                    reason_for_refill: {
                                        type: "string",
                                        enum: ["routine_refill", "lost_medication", "going_on_trip", "urgent_need", "other"],
                                        description: "Reason for requesting refill"
                                    },
                                    urgency: {
                                        type: "string",
                                        enum: ["routine", "urgent", "emergency"],
                                        description: "Urgency level of the refill request"
                                    },
                                    pharmacy_name: {
                                        type: "string",
                                        description: "Preferred pharmacy name"
                                    },
                                    additional_notes: {
                                        type: "string",
                                        description: "Any additional notes or special instructions"
                                    }
                                },
                                required: ["patient_name", "medication_name", "prescribing_doctor", "reason_for_refill"]
                            }
                        },
                        {
                            type: "function",
                            name: "end_call",
                            description: "CRITICAL: You must say your complete goodbye message BEFORE calling this function. After calling this function, you will NOT be able to say anything else. Example flow: 'Thank you for calling! Have a wonderful day!' [then call end_call]. Do NOT call this function until you have finished speaking your goodbye.",
                            parameters: {
                                type: "object",
                                properties: {
                                    reason: {
                                        type: "string",
                                        description: "Reason for ending",
                                        enum: ["conversation_complete", "patient_goodbye", "patient_finished"]
                                    }
                                },
                                required: ["reason"]
                            }
                        },
                        {
                            type: "function",
                            name: "verify_patient_identity",
                            description: "Verify patient identity for outbound calls",
                            parameters: {
                                type: "object",
                                properties: {
                                    name_provided: { type: "string", description: "Name provided by person answering" },
                                    verification_method: {
                                        type: "string",
                                        enum: ["name_match", "phone_confirmation", "dob_check"],
                                        description: "Method used to verify identity"
                                    },
                                    verified: { type: "boolean", description: "Whether identity was verified" }
                                },
                                required: ["verification_method", "verified"]
                            }
                        },
                        {
                            type: "function",
                            name: "confirm_appointment_reminder",
                            description: "Confirm appointment reminder details with patient",
                            parameters: {
                                type: "object",
                                properties: {
                                    appointment_confirmed: { type: "boolean", description: "Whether patient confirmed appointment" },
                                    needs_reschedule: { type: "boolean", description: "Whether patient needs to reschedule" },
                                    patient_notes: { type: "string", description: "Any notes from patient" }
                                },
                                required: ["appointment_confirmed"]
                            }
                        },
                        {
                            type: "function",
                            name: "record_follow_up_response",
                            description: "Record patient's response to follow-up call",
                            parameters: {
                                type: "object",
                                properties: {
                                    health_status: {
                                        type: "string",
                                        enum: ["improving", "same", "worse", "concerning"],
                                        description: "Patient's health status since last visit"
                                    },
                                    has_concerns: { type: "boolean", description: "Whether patient has health concerns" },
                                    concerns_description: { type: "string", description: "Description of patient concerns" },
                                    needs_appointment: { type: "boolean", description: "Whether patient needs follow- up appointment" },
                                    satisfaction_rating: {
                                        type: "string",
                                        enum: ["very_satisfied", "satisfied", "neutral", "dissatisfied", "very_dissatisfied"],
                                        description: "Patient satisfaction with recent care"
                                    }
                                },
                                required: ["health_status", "has_concerns"]
                            }
                        },
                        {
                            type: "function",
                            name: "schedule_callback",
                            description: "Schedule a callback for later if patient is busy",
                            parameters: {
                                type: "object",
                                properties: {
                                    preferred_time: { type: "string", description: "Patient's preferred callback time" },
                                    preferred_date: { type: "string", description: "Patient's preferred callback date" },
                                    reason: { type: "string", description: "Reason for callback" }
                                },
                                required: ["preferred_time", "reason"]
                            }
                        },
                        {
                            type: "function",
                            name: "transfer_to_human",
                            description: "Transfer the caller to a human representative when they request to speak with a real person, human, or staff member",
                            parameters: {
                                type: "object",
                                properties: {
                                    reason: {
                                        type: "string",
                                        description: "Reason for transfer (e.g., 'patient_request', 'complex_issue', 'billing_question')"
                                    },
                                    urgency: {
                                        type: "string",
                                        enum: ["normal", "urgent", "emergency"],
                                        description: "Urgency level of the transfer",
                                        default: "normal"
                                    },
                                    department: {
                                        type: "string",
                                        enum: ["general", "billing", "scheduling", "medical", "emergency"],
                                        description: "Which department to transfer to",
                                        default: "general"
                                    },
                                    caller_notes: {
                                        type: "string",
                                        description: "Brief notes about what the caller needs help with"
                                    }
                                },
                                required: ["reason"]
                            }
                        },
                    ],
                    tool_choice: "auto",
                    max_output_tokens: "inf",
                }
            };

            openAiWs.send(JSON.stringify(sessionUpdate));

            // Send initial greeting after a short delay to ensure stream is ready
            setTimeout(() => {
                sendInitialConversationItem();
            }, 200);
        });

        // Listen for messages from OpenAI WebSocket
        openAiWs.on('message', async (data) => {
            try {
                const response = JSON.parse(data);

                if (response.type === 'response.output_audio.delta' && response.delta) {
                    audioChunkCount++;

                    // Save to file
                    // const ulawBuffer = Buffer.from(response.delta, "base64");
                    // const pcm16Buffer = ulawToPcm16(ulawBuffer);
                    // if (wavWriterOpen) {
                    //     wavWriter.write(pcm16Buffer);
                    // }

                    // Check if we have streamSid and connection is ready
                    if (!streamSid || connection.readyState !== WebSocket.OPEN) {
                        console.error('Cannot send audio - connection not ready, state:', connection.readyState);
                        return;
                    }

                    // Send audio to Twilio
                    const audioDelta = {
                        event: 'media',
                        streamSid: streamSid,
                        media: { payload: response.delta }
                    };

                    connection.send(JSON.stringify(audioDelta));

                    // Timing and mark handling
                    if (!responseStartTimestampTwilio) {
                        responseStartTimestampTwilio = latestMediaTimestamp;
                    }

                    if (response.item_id) {
                        lastAssistantItem = response.item_id;
                    }
                    // Send regular marks
                    if (!callEndingInProgress) {
                        sendMark(connection, streamSid);
                    }
                }

                if (response.type === 'input_audio_buffer.speech_started') {
                    console.log('User started speaking');
                    isUserSpeaking = true;
                    userAudioBuffer.clear();

                    // Clear any pending timeout
                    if (speechEndTimeout) {
                        clearTimeout(speechEndTimeout);
                        speechEndTimeout = null;
                    }

                    handleSpeechStartedEvent();
                }

                if (response.type === 'input_audio_buffer.speech_stopped') {
                    console.log('User stopped speaking');
                    isUserSpeaking = false;

                    // Wait a bit to ensure we have all audio
                    speechEndTimeout = setTimeout(async () => {
                        await processUserSpeech();
                    }, 300);
                }

                if (response.type === 'conversation.item.input_audio_transcription.completed') {
                    addToTranscript('User', response.transcript);
                }

                if (response.type === 'response.output_audio_transcript.done') {
                    addToTranscript('AI', response.transcript);
                }

                if (response.type === 'response.function_call_arguments.done') {
                    console.log('Function call:', response.name, response.arguments);
                    handleFunctionCall(response.call_id, response.name, JSON.parse(response.arguments));
                }

                if (response.type === 'session.created') {
                    console.log('OpenAI session created:', response.session.id);
                }
                // Detect when final message is complete
                if (response.type === 'response.output_audio.done') {
                    if (callEndingInProgress) {
                        sendFinalMessageMark(connection, streamSid);
                    }
                }

            } catch (error) {
                console.error('Error processing OpenAI message:', error);
            }
        });

        openAiWs.on('close', () => {
            console.log('Disconnected from OpenAI API');
        });

        openAiWs.on('error', (error) => {
            console.error('OpenAI WebSocket error:', error);
        });
    };

    // Send initial conversation item
    // function sendInitialConversationItem() {
    //     if (!openAiWs || openAiWs.readyState !== WebSocket.OPEN) {
    //         console.error('Cannot send initial item - OpenAI not connected');
    //         return;
    //     }

    //     let greetingPrompt;
    //     if (patientData) {
    //         greetingPrompt = `A returning patient ${patientData.name} has just called ${process.env.HOSPITAL_NAME || 'City General Hospital'}. Start with "Thank you for calling ${process.env.HOSPITAL_NAME || 'City General Hospital'}. Hello ${patientData.name}! It's good to hear from you again. How can I help you today?" Keep it warm and professional.`;
    //     } else {
    //         greetingPrompt = `A new patient has just called ${process.env.HOSPITAL_NAME || 'City General Hospital'}. Start with "Thank you for calling ${process.env.HOSPITAL_NAME || 'City General Hospital'}. How can I help you today?" Be warm and professional.`;
    //     }

    //     const initialConversationItem = {
    //         type: "conversation.item.create",
    //         item: {
    //             type: "message",
    //             role: "user",
    //             content: [
    //                 {
    //                     type: "input_text",
    //                     text: greetingPrompt
    //                 }
    //             ]
    //         }
    //     };

    //     console.log('Sending initial conversation item with patient context');
    //     openAiWs.send(JSON.stringify(initialConversationItem));
    //     openAiWs.send(JSON.stringify({ type: 'response.create' }));
    // }

    // Send initial conversation item based on call type
    function sendInitialConversationItem() {
        if (!openAiWs || openAiWs.readyState !== WebSocket.OPEN) {
            console.error('Cannot send initial item - OpenAI not connected');
            return;
        }

        let greetingPrompt;

        if (callContext.type === 'outbound') {
            // Different prompts for different outbound call types
            switch (callContext.callType) {
                case 'appointment_reminder':
                    greetingPrompt = `You are making an outbound appointment reminder call to ${patientData?.firstName || 'a patient'} from ${callContext.hospital.name}. Start by greeting them professionally and explaining the purpose of your call. The appointment details are in your instructions. Be clear and helpful.`;
                    break;
                case 'follow_up':
                    greetingPrompt = `You are making an outbound follow-up call to ${patientData?.firstName || 'a patient'} from ${callContext.hospital.name}. Start by greeting them warmly and explaining you're calling to check on their wellbeing after their recent visit. Be caring and professional.`;
                    break;
                default:
                    greetingPrompt = `You are making an outbound call to ${patientData?.firstName || 'a patient'} from ${callContext.hospital.name}. Start by greeting them professionally and clearly explaining the purpose of your call. ${callContext.reason ? `The reason for the call is: ${callContext.reason}` : ''}`;
            }
        } else {
            // Inbound call greeting (existing logic)
            if (patientData) {
                greetingPrompt = `A returning patient ${patientData?.firstName} has just called ${callContext.hospital.name}. Start with your standard greeting for returning patients. Be warm and professional.`;
            } else {
                greetingPrompt = `A new patient has just called ${callContext.hospital.name}. Start with your standard greeting for new patients. Be warm and professional.`;
            }
        }

        const initialConversationItem = {
            type: "conversation.item.create",
            item: {
                type: "message",
                role: "user",
                content: [
                    {
                        type: "input_text",
                        text: greetingPrompt
                    }
                ]
            }
        };

        console.log(`Sending initial conversation item for ${callContext.type} call`);
        openAiWs.send(JSON.stringify(initialConversationItem));
        openAiWs.send(JSON.stringify({ type: 'response.create' }));
    };

    // Handle speech interruption
    const handleSpeechStartedEvent = () => {
        if (markQueue.length > 0 && responseStartTimestampTwilio != null) {
            const elapsedTime = latestMediaTimestamp - responseStartTimestampTwilio;
            console.log(`Truncating at ${elapsedTime}ms`);

            if (lastAssistantItem) {
                const truncateEvent = {
                    type: 'conversation.item.truncate',
                    item_id: lastAssistantItem,
                    content_index: 0,
                    audio_end_ms: elapsedTime
                };
                openAiWs.send(JSON.stringify(truncateEvent));
            }

            // Clear Twilio audio buffer
            connection.send(JSON.stringify({
                event: 'clear',
                streamSid: streamSid
            }));
            console.log('Sent clear command to Twilio');

            // Reset
            markQueue = [];
            lastAssistantItem = null;
            responseStartTimestampTwilio = null;
        }
    };

    // Send mark to track audio playbook
    const sendMark = (connection, streamSid) => {
        if (streamSid && connection.readyState === WebSocket.OPEN) {
            const markEvent = {
                event: 'mark',
                streamSid: streamSid,
                mark: { name: 'responsePart' }
            };
            connection.send(JSON.stringify(markEvent));
            markQueue.push('responsePart');
        }
    };

    // Modified mark sending for final messages
    const sendFinalMessageMark = (connection, streamSid) => {
        if (streamSid && connection.readyState === WebSocket.OPEN && !finalMessageMarkSent && callEndingInProgress) {
            const markEvent = {
                event: 'mark',
                streamSid: streamSid,
                mark: { name: 'finalMessage' }
            };
            connection.send(JSON.stringify(markEvent));
            finalMessageMarkSent = true;
            console.log('Final message mark sent - waiting for completion');
        }
    };

    // Handle function calls from OpenAI
    const handleFunctionCall = async (callId, functionName, args) => {
        try {
            let result = null;
            // let shouldContinueConversation = true;

            switch (functionName) {
                // case 'end_call':
                //     detectedIntent = 'end_call';
                //     extractedEntities = { ...extractedEntities, call_ending: args };
                //     callEndingInProgress = true;
                //     // shouldContinueConversation = false;
                //     result = {
                //         status: "acknowledged"
                //     };

                //     result = {
                //         success: true,
                //         action: 'end_call_initiated',
                //         internal_message: 'Call ending process started - waiting for message completion',
                //         reason: args.reason
                //     };

                //     setTimeout(() => {
                //         if (!finalMessageMarkReceived) {
                //             console.log('Timeout reached, ending call');
                //             endCallSafely();
                //         }
                //     }, 4000); // Increased to 8 seconds to allow full message
                //     break;

                case 'end_call':
                    detectedIntent = 'end_call';
                    extractedEntities = { ...extractedEntities, call_ending: args };
                    callEndingInProgress = true;

                    result = {
                        status: "acknowledged"
                    };

                    const endCallResponse = {
                        type: 'conversation.item.create',
                        item: {
                            type: 'function_call_output',
                            call_id: callId,
                            output: JSON.stringify(result)
                        }
                    };
                    openAiWs.send(JSON.stringify(endCallResponse));
                    setTimeout(() => {
                        console.log('Timeout reached, ending call');
                        endCallSafely();
                    }, 5000);
                    return;

                case 'get_my_appointments':
                    result = {
                        success: true,
                        upcoming_appointments: upcomingAppointments,
                        total_count: upcomingAppointments.length,
                        message: upcomingAppointments.length > 0
                            ? `You have ${upcomingAppointments.length} upcoming appointment${upcomingAppointments.length > 1 ? 's' : ''}`
                            : "You don't have any upcoming appointments scheduled"
                    };
                    break;

                case 'check_doctor_availability':
                    detectedIntent = 'check_availability';
                    extractedEntities = { ...extractedEntities, ...args };
                    result = await checkDoctorAvailability({
                        doctor_name: args.doctor_name,
                        date: args.date,
                        specialty: args.specialty
                    });
                    break;

                case 'book_appointment':
                    detectedIntent = 'book_appointment';

                    // Use stored patient data for returning patients
                    const appointmentData = {
                        patient_firstname: args.patient_firstname || patientData?.firstName,
                        patient_lastname: args.patient_lastname || patientData?.lastName,
                        patient_phone: args.patient_phone || patientData?.phone || from,
                        patient_dob: args.patient_dob || patientData?.dob,
                        patient_age: args.patient_age || patientData?.age,
                        doctor_name: args.doctor_name,
                        date: args.date,
                        time: args.time,
                        reason: args.reason
                    };

                    extractedEntities = { ...extractedEntities, ...appointmentData };
                    result = await bookAppointment(appointmentData);

                    // Refresh appointments after booking
                    if (result.success && patientId) {
                        upcomingAppointments = await getUpcomingAppointments(patientId);
                        await updatePatientFromCall({
                            patientId: result.patientId || patientId,
                            ...appointmentData
                        });
                    }
                    break;

                case 'find_patient_appointments':
                    detectedIntent = 'find_appointments';
                    extractedEntities = { ...extractedEntities, ...args };
                    result = await findPatientAppointments(args);
                    break;

                case 'reschedule_appointment':
                    detectedIntent = 'reschedule_appointment';
                    extractedEntities = { ...extractedEntities, ...args };

                    // Ensure phone comes from callLog if missing
                    if (!args.patient_phone && callLog?.from) {
                        args.patient_phone = callLog.from;
                    }

                    result = await rescheduleAppointmentByDetails(args);
                    break;

                case 'cancel_appointment':
                    detectedIntent = 'cancel_appointment';
                    extractedEntities = { ...extractedEntities, ...args };

                    // Ensure phone comes from callLog if missing
                    if (!args.patient_phone && callLog?.from) {
                        args.patient_phone = callLog.from;
                    }

                    result = await cancelAppointmentByDetails(args);
                    break;

                case 'request_prescription_refill':
                    detectedIntent = 'prescription_refill';

                    // Use stored patient data
                    const refillData = {
                        patient_name: args.patient_name || patientData?.firstName,
                        patient_phone: args.patient_phone || patientData?.phone || from,
                        ...args
                    };

                    extractedEntities = { ...extractedEntities, ...refillData };
                    result = await processPrescriptionRefill(refillData);
                    break;

                case 'update_patient_info':
                    if (patientId) {
                        result = await updatePatientInfo(patientId, args);
                        extractedEntities = { ...extractedEntities, patient_info: args };
                    } else {
                        result = { success: false, message: "Patient ID not available" };
                    }
                    break;

                case 'verify_patient_identity':
                    result = {
                        success: true,
                        verified: args.verified,
                        method_used: args.verification_method,
                        message: args.verified ? "Patient identity verified" : "Could not verify patient identity"
                    };
                    extractedEntities = { ...extractedEntities, identity_verification: args };
                    break;

                case 'confirm_appointment_reminder':
                    detectedIntent = 'appointment_reminder_response';
                    extractedEntities = { ...extractedEntities, appointment_reminder: args };

                    // NEW: Update the appointment reminder status in database
                    if (callContext.appointmentId && callContext.reminderType) {
                        try {
                            const updateFields = {
                                [`reminderCalls.${callContext.reminderType}.response`]: args.appointment_confirmed ? 'confirmed' :
                                    args.needs_reschedule ? 'rescheduled' : 'no_response',
                                [`reminderCalls.${callContext.reminderType}.status`]: 'answered'
                            };

                            await Appointment.findByIdAndUpdate(callContext.appointmentId, {
                                $set: updateFields
                            });

                            console.log(`Updated reminder response for appointment ${callContext.appointmentId}: ${callContext.reminderType}`);
                        } catch (error) {
                            console.error('Error updating reminder response:', error);
                        }
                    }

                    result = {
                        success: true,
                        confirmed: args.appointment_confirmed,
                        needs_reschedule: args.needs_reschedule,
                        message: args.appointment_confirmed ? "Thank you for confirming your appointment!" : "I'll help you with rescheduling",
                        reminder_type: callContext.reminderType // Include this for logging
                    };
                    break;

                case 'record_follow_up_response':
                    detectedIntent = 'follow_up_recorded';
                    extractedEntities = { ...extractedEntities, follow_up_response: args };
                    result = {
                        success: true,
                        health_status: args.health_status,
                        needs_attention: args.has_concerns || args.health_status === 'worse' || args.health_status === 'concerning',
                        message: "Follow-up response recorded"
                    };
                    break;

                case 'schedule_callback':
                    result = {
                        success: true,
                        callback_scheduled: true,
                        preferred_time: args.preferred_time,
                        message: "Callback scheduled successfully"
                    };
                    extractedEntities = { ...extractedEntities, callback_request: args };
                    break;

                case 'transfer_to_human':
                    detectedIntent = 'transfer_to_human';
                    extractedEntities = { ...extractedEntities, transfer_request: args };

                    // Initiate the transfer
                    result = await initiateTransfer(args);

                    if (result.success) {
                        // Return success but don't continue conversation - transfer is happening
                        result = {
                            success: true,
                            action: 'transfer_initiated',
                            message: 'Transferring you now to our staff. Please hold on.',
                            transfer_number: result.transfer_number,
                            department: args.department || 'general'
                        };

                        // Set a flag to indicate transfer is happening
                        transferInProgress = true;

                        // Send function result
                        const functionResponse = {
                            type: 'conversation.item.create',
                            item: {
                                type: 'function_call_output',
                                call_id: callId,
                                output: JSON.stringify(result)
                            }
                        };

                        openAiWs.send(JSON.stringify(functionResponse));
                        openAiWs.send(JSON.stringify({ type: 'response.create' }));

                        // Execute transfer after AI gives final message
                        setTimeout(() => {
                            executeTransfer(args);
                        }, 5000); // 5 second delay to allow final message

                        return; // Don't continue with normal flow
                    } else {
                        result = {
                            success: false,
                            message: "I apologize, but I'm unable to transfer you right now. Let me try to help you with your question instead.",
                            error: result.error
                        };
                    }
                    break;

                default:
                    result = { error: `Unknown function: ${functionName}` };
            }

            // Send function result back to OpenAI
            const functionResponse = {
                type: 'conversation.item.create',
                item: {
                    type: 'function_call_output',
                    call_id: callId,
                    output: JSON.stringify(result)
                }
            };

            openAiWs.send(JSON.stringify(functionResponse));
            openAiWs.send(JSON.stringify({ type: 'response.create' }));

        } catch (error) {
            console.error('Error handling function call:', error);

            // Send error response back to OpenAI
            const errorResponse = {
                type: 'conversation.item.create',
                item: {
                    type: 'function_call_output',
                    call_id: callId,
                    output: JSON.stringify({ error: error.message })
                }
            };

            openAiWs.send(JSON.stringify(errorResponse));
            // Don't send response.create for errors either during call ending
            if (!callEndingInProgress) {
                openAiWs.send(JSON.stringify({ type: 'response.create' }));
            }
        }
    };

    const addToTranscript = (speaker, message) => {
        conversationTranscript.push({
            speaker,
            text: message,
            timestamp: new Date() // ISO timestamp
        });
        // console.log('Transcript line added:', speaker, message);
    };

    // Create call log entry
    const createCallLog = async (startData, from, to, patientId, type) => {
        try {
            callLog = new CallLog({
                patient: patientId,
                callSid: startData.callSid || streamSid,
                from: from || 'unknown',
                to: to || 'hospital',
                type: type,
                startTime: new Date(),
                transcript: [],
                entities: {},
                actionTaken: 'in_progress',
                callType: callContext.type,
                callPurpose: callContext.callType,
                metadata: callContext
            });

            await callLog.save();
            console.log('Call log created:', callLog._id);
            return callLog._id; // Return the ID
        } catch (error) {
            console.error('Error creating call log:', error);
        }
    };

    // Finalize call log
    const finalizeCallLog = async () => {
        if (!callLogId || isFinalized) return;
        isFinalized = true;

        try {
            const endTime = new Date();
            const duration = callLog ? Math.floor((endTime - callLog.startTime) / 1000) : 0;

            await CallLog.findByIdAndUpdate(callLogId, {
                endTime,
                duration,
                transcript: conversationTranscript, // store as array of objects
                intent: detectedIntent,
                entities: extractedEntities,
                actionTaken: detectedIntent ? 'completed' : 'conversation_only'
            });

            console.log('Call log finalized:', callLogId);
        } catch (error) {
            console.error('Error finalizing call log:', error);
        }
    };

    // Update patient info from successful appointment booking
    const updatePatientFromCall = async (appointmentData) => {
        try {
            let doctorId = null;
            if (appointmentData.doctor_name) {
                const doctor = await Doctor.findOne({ name: appointmentData.doctor_name });
                if (doctor) {
                    doctorId = doctor._id;
                }
            }

            const updateData = {
                $set: {
                    name: appointmentData.patient_name,
                    lastAppointment: new Date(`${appointmentData.date}T${appointmentData.time}:00`),
                    ...(doctorId && { preferredDoctor: doctorId }) // only set if found
                },
                $push: {
                    callDetails: {
                        date: new Date(),
                        reason: appointmentData.reason,
                        requestedDoctor: appointmentData.doctor_name,
                        notes: `Appointment booked for ${appointmentData.date} at ${appointmentData.time}`
                    }
                }
            };

            await Patient.findByIdAndUpdate(patientId, updateData, { new: true });
            console.log('Updated patient info from appointment booking');
        } catch (error) {
            console.error('Error updating patient from call:', error);
        }
    };

    // Update patient information
    const updatePatientInfo = async (patientId, info) => {
        try {
            const updateData = {};

            if (info.name) updateData.name = info.name;
            if (info.email) updateData.email = info.email;
            if (info.dob) {
                // If format is "YYYY-MM-DD"
                // updateData.dob = new Date(info.dob);

                // Or if AI sends "YYYYMMDD" format, convert it:
                const year = info.dob.substring(0, 4);
                const month = info.dob.substring(4, 6);
                const day = info.dob.substring(6, 8);
                updateData.dob = new Date(`${year}-${month}-${day}`);
            }
            if (info.age) updateData.age = info.age;
            if (info.gender) updateData.gender = info.gender;

            if (info.preferred_doctor) {
                // If it's already a valid ObjectId, use it directly
                if (mongoose.Types.ObjectId.isValid(info.preferred_doctor)) {
                    updateData.preferredDoctor = info.preferred_doctor;
                } else {
                    // Otherwise, try to find by name
                    const doctor = await Doctor.findOne({ name: info.preferred_doctor });
                    if (doctor) {
                        updateData.preferredDoctor = doctor._id;
                    } else {
                        return { success: false, message: "Doctor not found" };
                    }
                }
            }

            if (info.preferred_time) updateData.preferredTime = info.preferred_time;

            await Patient.findByIdAndUpdate(patientId, updateData);
            return { success: true, message: "Patient information updated successfully" };
        } catch (error) {
            console.error("Error updating patient info:", error);
            return { success: false, message: "Failed to update patient information" };
        }
    };

    // Enhanced patient data loading
    const loadPatientData = async (patientId) => {
        try {
            const patient = await Patient.findById(patientId)
                .populate('preferredDoctor', 'name specialty');

            if (patient) {
                patientData = {
                    id: patient._id,
                    firstName: patient.firstName,
                    lastName: patient.lastName,
                    phone: patient.phone,
                    email: patient.email,
                    dob: patient.dob,
                    age: patient.age,
                    gender: patient.gender,
                    preferredDoctor: patient.preferredDoctor?.name,
                    lastVisit: patient.lastAppointment,
                    totalVisits: patient.callDetails ? patient.callDetails.length : 0
                };

                // Load upcoming appointments
                appointmentData = await loadAppointmentData(callContext, patientId);
                console.log('Patient data loaded:', patientData);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error loading patient data:', error);
            return false;
        }
    };

    // Get upcoming appointments
    const getUpcomingAppointments = async (patientId) => {
        try {
            const now = new Date();
            const appointments = await Appointment.find({
                patient: patientId,
                dateTime: { $gte: now },
                status: { $in: ['confirmed', 'scheduled', 'rescheduled'] }
            })
                .populate('doctor', 'name specialty')
                .sort({ dateTime: 1 })
                .limit(5);

            return appointments.map(apt => ({
                id: apt._id,
                doctor: apt.doctor.name,
                specialty: apt.doctor.specialty,
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
                reason: apt.reason,
                status: apt.status,
                confirmationNumber: `APT-${apt._id.toString().slice(-6).toUpperCase()}`
            }));
        } catch (error) {
            console.error('Error fetching upcoming appointments:', error);
            return [];
        }
    };

    function endCallSafely() {
        if (!isFinalized) {
            console.log('Ending call gracefully...');

            setTimeout(async () => {
                await finalizeCallLog();

                if (connection && connection.readyState === WebSocket.OPEN) {
                    console.log('Closing Twilio connection');
                    connection.close();
                }

                if (openAiWs && openAiWs.readyState === WebSocket.OPEN) {
                    console.log('Closing OpenAI connection');
                    openAiWs.close();
                }
            }, 1000); // Give time for final audio to complete
        }
    };

    const loadAppointmentData = async (callContext, patientId) => {
        try {
            if (callContext.type === 'outbound' && callContext.callType === 'follow_up') {
                // For follow-up calls, load the PAST appointment being followed up on
                let pastAppointment = null;

                if (callContext.appointmentId) {
                    // Load the specific appointment being followed up on
                    const appointment = await Appointment.findById(callContext.appointmentId)
                        .populate('doctor', 'name specialty');

                    if (appointment) {
                        pastAppointment = {
                            id: appointment._id,
                            doctor: appointment.doctor.name,
                            specialty: appointment.doctor.specialty,
                            date: appointment.dateTime.toLocaleDateString('en-US', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                            }),
                            time: appointment.dateTime.toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit'
                            }),
                            reason: appointment.reason,
                            status: appointment.status
                        };
                    }
                }

                // Also get upcoming appointments (but don't emphasize them)
                const upcomingAppointments = await getUpcomingAppointments(patientId);

                return {
                    pastAppointment,
                    upcomingAppointments: upcomingAppointments.slice(0, 2) // Limit to 2
                };
            } else {
                // For other calls, just get upcoming appointments
                const upcomingAppointments = await getUpcomingAppointments(patientId);
                return { upcomingAppointments };
            }
        } catch (error) {
            console.error('Error loading appointment data:', error);
            return { upcomingAppointments: [] };
        }
    };

    function ulawToPcm16(ulawBuffer) {
        const pcm16Buffer = Buffer.alloc(ulawBuffer.length * 2);

        // μ-law decompression table for faster lookup
        const ulawTable = [
            -32124, -31100, -30076, -29052, -28028, -27004, -25980, -24956,
            -23932, -22908, -21884, -20860, -19836, -18812, -17788, -16764,
            -15996, -15484, -14972, -14460, -13948, -13436, -12924, -12412,
            -11900, -11388, -10876, -10364, -9852, -9340, -8828, -8316,
            -7932, -7676, -7420, -7164, -6908, -6652, -6396, -6140,
            -5884, -5628, -5372, -5116, -4860, -4604, -4348, -4092,
            -3900, -3772, -3644, -3516, -3388, -3260, -3132, -3004,
            -2876, -2748, -2620, -2492, -2364, -2236, -2108, -1980,
            -1884, -1820, -1756, -1692, -1628, -1564, -1500, -1436,
            -1372, -1308, -1244, -1180, -1116, -1052, -988, -924,
            -876, -844, -812, -780, -748, -716, -684, -652,
            -620, -588, -556, -524, -492, -460, -428, -396,
            -372, -356, -340, -324, -308, -292, -276, -260,
            -244, -228, -212, -196, -180, -164, -148, -132,
            -120, -112, -104, -96, -88, -80, -72, -64,
            -56, -48, -40, -32, -24, -16, -8, 0,
            32124, 31100, 30076, 29052, 28028, 27004, 25980, 24956,
            23932, 22908, 21884, 20860, 19836, 18812, 17788, 16764,
            15996, 15484, 14972, 14460, 13948, 13436, 12924, 12412,
            11900, 11388, 10876, 10364, 9852, 9340, 8828, 8316,
            7932, 7676, 7420, 7164, 6908, 6652, 6396, 6140,
            5884, 5628, 5372, 5116, 4860, 4604, 4348, 4092,
            3900, 3772, 3644, 3516, 3388, 3260, 3132, 3004,
            2876, 2748, 2620, 2492, 2364, 2236, 2108, 1980,
            1884, 1820, 1756, 1692, 1628, 1564, 1500, 1436,
            1372, 1308, 1244, 1180, 1116, 1052, 988, 924,
            876, 844, 812, 780, 748, 716, 684, 652,
            620, 588, 556, 524, 492, 460, 428, 396,
            372, 356, 340, 324, 308, 292, 276, 260,
            244, 228, 212, 196, 180, 164, 148, 132,
            120, 112, 104, 96, 88, 80, 72, 64,
            56, 48, 40, 32, 24, 16, 8, 0
        ];

        for (let i = 0; i < ulawBuffer.length; i++) {
            const sample = ulawTable[ulawBuffer[i]];
            pcm16Buffer.writeInt16LE(sample, i * 2);
        }

        return pcm16Buffer;
    };

    const initiateTransfer = async (transferArgs) => {
        try {
            // Get hospital information from call context
            const hospitalPhone = callContext?.hospital?.phonenumber || process.env.HOSPITAL_MAIN_PHONE;

            if (!hospitalPhone) {
                return {
                    success: false,
                    error: "Hospital contact number not available"
                };
            }

            // Log the transfer request
            console.log(`Transfer requested: ${transferArgs.reason} to ${transferArgs.department || 'general'}`);

            return {
                success: true,
                transfer_number: hospitalPhone,
                department: transferArgs.department || 'general'
            };

        } catch (error) {
            console.error('Error initiating transfer:', error);
            return {
                success: false,
                error: error.message
            };
        }
    };

    const executeTransfer = async (transferArgs) => {
        try {
            const hospitalPhone = callContext?.hospital?.phonenumber || process.env.HOSPITAL_MAIN_PHONE;

            if (!hospitalPhone || !streamSid) {
                console.error('Cannot execute transfer - missing phone or streamSid');
                return;
            }

            // Update call log with transfer information
            if (callLogId) {
                await CallLog.findByIdAndUpdate(callLogId, {
                    $set: {
                        actionTaken: 'transferred_to_human',
                        transferReason: transferArgs.reason,
                        transferDepartment: transferArgs.department || 'general',
                        transferredAt: new Date()
                    }
                });
            }

            // Execute the transfer via Twilio
            await performTwilioTransfer(hospitalPhone, transferArgs);

        } catch (error) {
            console.error('Error executing transfer:', error);
        }
    };

    const performTwilioTransfer = async (phoneNumber, transferArgs) => {
        try {
            // Get the current call SID from context
            const twilioCallSid = callContext?.twilioCallSid;

            if (!twilioCallSid) {
                console.error('No Twilio Call SID available for transfer');
                return;
            }

            // Initialize Twilio client
            const twilioClient = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH);

            // Update the call to transfer to the hospital number
            await twilioClient.calls(twilioCallSid)
                .update({
                    twiml: `<Response>
                    <Say voice="alice">Please hold while I transfer you to our staff.</Say>
                    <Dial timeout="30" record="false">
                        <Number>${phoneNumber}</Number>
                    </Dial>
                    <Say voice="alice">I'm sorry, but no one is available right now. Please try calling back or leave a message after the tone.</Say>
                    <Record timeout="60" transcribe="false" />
                </Response>`
                });

            console.log(`Call ${twilioCallSid} transferred to ${phoneNumber}`);

            // Close WebSocket connections since call is now transferred
            if (openAiWs && openAiWs.readyState === WebSocket.OPEN) {
                openAiWs.close();
            }

            // Mark call as transferred
            await finalizeCallLog();

        } catch (error) {
            console.error('Error performing Twilio transfer:', error);

            // If transfer fails, try to continue conversation
            const fallbackMessage = {
                type: "conversation.item.create",
                item: {
                    type: "message",
                    role: "user",
                    content: [{
                        type: "input_text",
                        text: "The transfer failed. Please apologize and offer to help the caller with their question instead."
                    }]
                }
            };

            if (openAiWs && openAiWs.readyState === WebSocket.OPEN) {
                openAiWs.send(JSON.stringify(fallbackMessage));
                openAiWs.send(JSON.stringify({ type: 'response.create' }));
            }
        }
    };

    async function processUserSpeech() {
        if (transcriptionInProgress || !userAudioBuffer.hasEnoughAudio()) {
            console.log('Skipping transcription - insufficient audio or already in progress');
            return;
        }

        transcriptionInProgress = true;

        try {
            const audioBuffer = userAudioBuffer.getBuffer();
            const audioSize = userAudioBuffer.getSize();

            // Call transcription service
            const result = await transcribeAudio(audioBuffer, 'mulaw');

            if (result.success && result.text) {

                // Add to transcript
                addToTranscript('User', result.text);

                // Optional: Send transcription to OpenAI for context
                // This helps OpenAI understand what the user said
                const contextItem = {
                    type: "conversation.item.create",
                    item: {
                        type: "message",
                        role: "user",
                        content: [{
                            type: "input_text",
                            text: `[User said: "${result.text}"]`
                        }]
                    }
                };

                if (openAiWs && openAiWs.readyState === WebSocket.OPEN) {
                    openAiWs.send(JSON.stringify(contextItem));
                }
            } else {
                console.log('Transcription failed or returned empty text');
            }

        } catch (error) {
            console.error('Error processing user speech:', error);
        } finally {
            transcriptionInProgress = false;
            userAudioBuffer.clear();
        }
    }
}


{ /*  MULTIPLE CALL HANDLING */ }

// import WebSocket from "ws";
// import { checkDoctorAvailability } from "./doctors.js";
// import 'dotenv/config';
// import fs from "fs";
// import wav from "wav";
// import Patient from "../models/Patient.js";
// import CallLog from "../models/CallLog.js";
// import mongoose from "mongoose";
// import Doctor from "../models/Doctor.js";
// import { bookAppointment, findPatientAppointments, cancelAppointmentByDetails, rescheduleAppointmentByDetails } from "./appointment.js";
// import { processPrescriptionRefill } from '../services/prescriptionRefill.js';
// import Call from "../models/Call.js";
// import Appointment from "../models/Appointment.js";

// function getInstructions(callContext, patientData, upcomingAppointments) {
//     const hospitalName = process.env.HOSPITAL_NAME || 'City General Hospital';
//     const hospitalPhone = process.env.HOSPITAL_MAIN_PHONE || 'our main number';
//     const hospitalAddress = process.env.HOSPITAL_ADDRESS || 'our hospital';
//     const departments = process.env.HOSPITAL_DEPARTMENTS?.split(',') || [];

//     // Build patient context if available
//     let patientContext = "";
//     if (patientData) {
//         patientContext = `
// PATIENT CONTEXT:
// - Patient Name: ${patientData.name}
// - Phone: ${patientData.phone}
// - Previous visits: ${patientData.totalVisits}
// ${patientData.preferredDoctor ? `- Preferred Doctor: ${patientData.preferredDoctor}` : ''}
// ${patientData.age ? `- Age: ${patientData.age}` : ''}
// ${patientData.gender ? `- Gender: ${patientData.gender}` : ''}

// UPCOMING APPOINTMENTS:
// ${upcomingAppointments && upcomingAppointments.length > 0 ?
//                 upcomingAppointments.map(apt =>
//                     `- ${apt.date} at ${apt.time} with Dr. ${apt.doctor} (${apt.reason}) - Confirmation: ${apt.confirmationNumber}`
//                 ).join('\n') :
//                 '- No upcoming appointments scheduled'
//             }`;
//     }

//     // Different instructions based on call type
//     let roleAndGreeting = "";
//     let specificInstructions = "";

//     if (callContext.type === 'outbound') {
//         // Outbound call specific behavior
//         switch (callContext.callType) {
//             case 'appointment_reminder':
//                 roleAndGreeting = `You are making an OUTBOUND appointment reminder call for ${hospitalName}. The patient should be expecting this call or may not be. Be professional and clear about why you're calling.

// GREETING: "Hello, this is [AI name] calling from ${hospitalName}. May I speak with ${patientData?.name || 'the patient'}? I'm calling to remind you about your upcoming appointment."`;

//                 specificInstructions = `
// APPOINTMENT REMINDER SPECIFIC INSTRUCTIONS:
// - Primary goal: Confirm the upcoming appointment and ensure patient remembers
// - Appointment details: ${callContext.reminderData ? `
//   Date: ${callContext.reminderData.appointmentDate}
//   Time: ${callContext.reminderData.appointmentTime}
//   Doctor: Dr. ${callContext.reminderData.doctorName} (${callContext.reminderData.doctorSpecialty})
//   Reason: ${callContext.reminderData.reason}
//   Confirmation: ${callContext.reminderData.confirmationNumber}` : 'Details will be provided during call'}
// - Ask if they need to reschedule
// - Remind about any preparation needed
// - Confirm their contact information
// - If patient wants to cancel/reschedule, help them immediately`;
//                 break;

//             case 'follow_up':
//                 roleAndGreeting = `You are making an OUTBOUND follow-up call for ${hospitalName}. This is a check-in call to see how the patient is doing.

// GREETING: "Hello, this is [AI name] calling from ${hospitalName}. May I speak with ${patientData?.name || 'the patient'}? I'm calling to follow up on your recent visit with us."`;

//                 specificInstructions = `
// FOLLOW-UP SPECIFIC INSTRUCTIONS:
// - Primary goal: Check on patient's wellbeing and recovery
// - Be empathetic and caring
// - Ask how they're feeling since their last visit
// - Check if they have any concerns or questions
// - Offer to schedule follow-up appointments if needed
// - Document any issues they mention
// - If they report problems, offer to connect them with medical staff`;
//                 break;

//             case 'prescription_reminder':
//                 roleAndGreeting = `You are making an OUTBOUND call for ${hospitalName} regarding prescription refills.

// GREETING: "Hello, this is [AI name] calling from ${hospitalName}. May I speak with ${patientData?.name || 'the patient'}? I'm calling about your prescription refill."`;

//                 specificInstructions = `
// PRESCRIPTION REMINDER INSTRUCTIONS:
// - Remind about prescription that needs refilling
// - Check if they still need the medication
// - Help process refill if needed
// - Confirm pharmacy information
// - Ask about any side effects or concerns`;
//                 break;

//             default:
//                 roleAndGreeting = `You are making an OUTBOUND call for ${hospitalName}. Be professional and clearly state why you're calling.

// GREETING: "Hello, this is [AI name] calling from ${hospitalName}. May I speak with ${patientData?.name || 'the patient'}?"`;

//                 specificInstructions = `
// GENERAL OUTBOUND INSTRUCTIONS:
// - Clearly state the reason for your call
// - Be respectful of their time
// - If this is an inconvenient time, offer to call back
// - Stay focused on the purpose of the call`;
//         }

//         specificInstructions += `

// OUTBOUND CALL BEST PRACTICES:
// - Always verify you're speaking to the correct person
// - If the patient seems confused, clearly explain why you're calling
// - Be prepared for the patient to be busy or unavailable
// - Offer to call back at a more convenient time
// - If they ask to be removed from calls, note this and respect their wishes
// - If no answer or wrong number, end call gracefully
// - Be more directive and purpose-driven than inbound calls`;

//     } else {
//         // Inbound call behavior (existing)
//         roleAndGreeting = `You are the AI receptionist for ${hospitalName}. Your role is to help patients with appointments, prescription refills, and general inquiries.

// GREETING:
// - For new patients: "Thank you for calling ${hospitalName}. How can I help you today?"
// - For returning patients: "Hello ${patientData?.name || 'there'}! How are you doing? What can I help you with today?"`;

//         specificInstructions = `
// INBOUND CALL INSTRUCTIONS:
// - Listen to what the patient needs first
// - Be reactive to their requests
// - Use stored patient information efficiently
// - Let the conversation flow naturally based on their needs`;
//     }

//     return `${roleAndGreeting}

// ${patientContext}

// HOSPITAL INFORMATION:
// - Hospital Name: ${hospitalName}
// - Main Phone: ${hospitalPhone}
// - Address: ${hospitalAddress}
// - Available Departments: ${departments.join(', ')}
// - Hours: ${process.env.HOSPITAL_HOURS_WEEKDAY || '8:00 AM - 8:00 PM'} (weekdays)
// - Weekend Hours: ${process.env.HOSPITAL_HOURS_WEEKEND || '9:00 AM - 5:00 PM'}
// - Emergency Department: ${process.env.HOSPITAL_HOURS_EMERGENCY || '24/7'}

// ${specificInstructions}

// COMMUNICATION STYLE:
// - Sound natural and conversational, like a helpful human ${callContext.type === 'outbound' ? 'healthcare coordinator' : 'receptionist'}
// - Use casual, friendly language: "Sure!", "Absolutely!", "Let me check that for you"
// - Vary your responses - don't sound robotic or repetitive
// - Show genuine interest: "That sounds good", "Perfect!", "Great choice"
// - Use natural speech patterns with contractions: "I'll", "You're", "We've", "Let's"
// - ${callContext.type === 'outbound' ? 'Be respectful of their time and stay focused on the call purpose' : 'Make patients feel welcomed and comfortable'}

// CALL ENDING DETECTION:
// - ONLY end the call when the patient CLEARLY indicates they want to end the conversation
// - Do NOT end the call just because patient says "thank you" - this could be in the middle of conversation
// - Look for CLEAR ending phrases like:
//   * "That's all I needed" + "thank you"
//   * "Nothing else" + any closing phrase
//   * "I'm good" + "goodbye/bye"
//   * "Have a good day" (from patient to you)
//   * Patient says "goodbye" or "bye"
// - Do NOT end for simple "thank you" responses during ongoing conversation
// - When patient CLEARLY wants to end: FIRST say your natural goodbye message, THEN wait 3-5 seconds, THEN call end_call function
// - Ask "Is there anything else I can help you with today?" if unsure whether patient wants to continue
// - Examples of CORRECT endings:
//   * Patient: "Perfect, that's all I needed. Thank you so much!"
//   * AI: "You're welcome! Thanks for calling City General Hospital. Have a wonderful day!"
//   * [WAIT 5 seconds]
//   * [THEN call end_call]

// CORE RESPONSIBILITIES:
// - Help patients schedule, reschedule, or cancel appointments
// - Process prescription refill requests
// - Check doctor availability
// - Answer questions about hospital services, hours, location, and departments
// - Show upcoming appointments when requested
// - ${callContext.type === 'outbound' ? 'Complete the specific purpose of this outbound call efficiently' : 'Use stored patient information efficiently'}

// IMPORTANT LIMITATIONS:
// - Never provide medical advice, diagnosis, or treatment recommendations
// - For medical concerns: "I'll need to connect you with one of our medical professionals..."
// - Cannot access medical records or discuss protected health information
// - For complex issues: "Let me connect you with our staff member who can assist you further..."

// Remember: You're a helpful, ${callContext.type === 'outbound' ? 'proactive' : 'responsive'} person who works at ${hospitalName} - make every interaction professional and valuable.`;
// }

// class CallSession {
//     constructor(connection, req) {
//         this.connection = connection;
//         this.callId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
//         this.req = req;

//         // Call context extraction (your existing logic)
//         this.callContext = this.extractCallContext();

//         // Isolated state per call (moved from global scope)
//         this.finalMessageMarkSent = false;
//         this.finalMessageMarkReceived = false;
//         this.callEndingInProgress = false;
//         this.callLog = null;
//         this.patientId = this.callContext.patientId || null;
//         this.callLogId = null;
//         this.conversationTranscript = [];
//         this.isFinalized = false;
//         this.from = this.callContext.from || null;
//         this.to = this.callContext.to || null;
//         this.patientData = null;
//         this.upcomingAppointments = [];

//         // Connection-specific state
//         this.streamSid = null;
//         this.latestMediaTimestamp = 0;
//         this.lastAssistantItem = null;
//         this.markQueue = [];
//         this.responseStartTimestampTwilio = null;
//         this.audioChunkCount = 0;
//         this.openAiWs = null;
//         this.isInitialized = false;
//         this.detectedIntent = null;
//         this.extractedEntities = {};
//         this.TEMPERATURE = 0.8;

//         console.log(`Created call session: ${this.callId}`);
//     }

//     extractCallContext() {
//         let callContext = null;

//         try {
//             const url = new URL(this.req.url, `http://${this.req.headers.host}`);
//             const callSid = url.searchParams.get('callSid');
//             const contextKey = url.searchParams.get('contextKey');

//             // Get call context from global map
//             if (global.callContextMap) {
//                 if (contextKey) {
//                     callContext = global.callContextMap.get(contextKey);
//                 }

//                 if (!callContext && callSid) {
//                     callContext = global.callContextMap.get(callSid);
//                 }
//             }
//         } catch (urlError) {
//             console.error('Error parsing URL:', urlError);
//         }

//         // ENHANCED FALLBACK: Find most recent context
//         if (!callContext) {
//             if (global.callContextMap && global.callContextMap.size > 0) {
//                 let mostRecentContext = null;
//                 let mostRecentTime = 0;

//                 for (const [key, context] of global.callContextMap.entries()) {
//                     if (context.timestamp && context.timestamp > mostRecentTime) {
//                         mostRecentTime = context.timestamp;
//                         mostRecentContext = context;
//                     }
//                 }

//                 if (mostRecentContext) {
//                     const timeDiff = Date.now() - mostRecentContext.timestamp;
//                     if (timeDiff < 60000) {
//                         callContext = mostRecentContext;
//                     }
//                 }
//             }
//         }

//         // Final fallback: default inbound context
//         if (!callContext) {
//             callContext = {
//                 type: 'inbound',
//                 callType: 'general',
//                 patientId: null,
//                 from: 'unknown',
//                 to: 'hospital'
//             };
//         }

//         return callContext;
//     }

//     async initialize() {
//         // Set up event handlers for this specific call
//         this.connection.on('message', (message) => this.handleTwilioMessage(message));
//         this.connection.on('close', () => this.handleClose());
//         this.connection.on('error', (error) => this.handleError(error));

//         console.log(`Call ${this.callId} initialized`);
//     }

//     async handleTwilioMessage(message) {
//         try {
//             const data = JSON.parse(message);

//             switch (data.event) {
//                 case 'start':
//                     await this.handleStart(data);
//                     break;
//                 case 'media':
//                     await this.handleMedia(data);
//                     break;
//                 case 'mark':
//                     this.handleMark(data);
//                     break;
//                 case 'stop':
//                     await this.handleStop();
//                     break;
//                 default:
//                     console.log('Unhandled Twilio event:', data.event);
//                     break;
//             }
//         } catch (error) {
//             console.error(`Error in call ${this.callId}:`, error);
//         }
//     }

//     async handleStart(data) {
//         this.streamSid = data.start.streamSid;
//         this.connection.streamSid = this.streamSid;

//         const twilioCallSid = data.start.callSid;

//         // Update call context with Twilio CallSid
//         if (this.callContext && !this.callContext.twilioCallSid) {
//             this.callContext.twilioCallSid = twilioCallSid;
//             if (global.callContextMap) {
//                 global.callContextMap.set(twilioCallSid, this.callContext);
//             }
//         }

//         // Load patient data if we have patientId
//         if (this.patientId) {
//             console.log(`Loading patient data for call ${this.callId}, patientId:`, this.patientId);
//             await this.loadPatientData(this.patientId);
//         }

//         if (!this.callLogId) {
//             this.callLogId = await this.createCallLog(data.start);
//         }

//         // Initialize OpenAI connection for this call
//         if (!this.isInitialized) {
//             await this.initializeOpenAI();
//             this.isInitialized = true;
//         }

//         // Reset state
//         this.responseStartTimestampTwilio = null;
//         this.latestMediaTimestamp = 0;
//         this.audioChunkCount = 0;

//         console.log(`Call ${this.callId} started with streamSid: ${this.streamSid}`);
//     }

//     async handleMedia(data) {
//         if (!this.openAiWs || this.openAiWs.readyState !== WebSocket.OPEN) {
//             return;
//         }

//         this.latestMediaTimestamp = data.media.timestamp;

//         // Send to OpenAI
//         const audioAppend = {
//             type: 'input_audio_buffer.append',
//             audio: data.media.payload
//         };
//         this.openAiWs.send(JSON.stringify(audioAppend));
//     }

//     handleMark(data) {
//         if (this.markQueue.length > 0) {
//             this.markQueue.shift();
//             const receivedMark = this.markQueue.shift();
//             // Check if this is the final message mark
//             if (receivedMark === 'finalMessage' || data.mark?.name === 'finalMessage') {
//                 this.finalMessageMarkReceived = true;
//                 setTimeout(() => {
//                     this.endCallSafely();
//                 }, 300);
//             }
//         }
//     }

//     async handleStop() {
//         console.log(`Stream stopped for call ${this.callId}`);
//         await this.finalizeCallLog();
//     }

//     async handleClose() {
//         console.log(`Twilio connection closed for call ${this.callId}`);
//         if (this.openAiWs && this.openAiWs.readyState === WebSocket.OPEN) {
//             this.openAiWs.close();
//         }
//         await this.finalizeCallLog();

//         // Remove from active calls
//         if (global.activeCalls) {
//             global.activeCalls.delete(this.callId);
//         }

//         console.log(`Call ${this.callId} cleanup completed. Active calls: ${global.activeCalls?.size || 0}`);
//     }

//     handleError(error) {
//         console.error(`Twilio WebSocket error for call ${this.callId}:`, error);
//     }

//     async initializeOpenAI() {
//         console.log(`Initializing OpenAI connection for call ${this.callId}...`);

//         this.openAiWs = new WebSocket(`wss://api.openai.com/v1/realtime?model=gpt-realtime&temperature=${this.TEMPERATURE}`, {
//             headers: {
//                 "Authorization": "Bearer " + process.env.OPENAI_API_KEY,
//             }
//         });

//         this.openAiWs.on("open", () => {
//             const sessionUpdate = {
//                 type: "session.update",
//                 session: {
//                     type: 'realtime',
//                     model: "gpt-realtime",
//                     output_modalities: ["audio"],
//                     // input_audio_transcription: { enabled: true }, // Keep commented as requested
//                     instructions: getInstructions(this.callContext, this.patientData, this.upcomingAppointments),
//                     audio: {
//                         input: {
//                             format: { type: 'audio/pcmu' },
//                             turn_detection: { type: "server_vad", "silence_duration_ms": 850 }
//                         },
//                         output: {
//                             format: { type: 'audio/pcmu' },
//                             voice: 'shimmer',
//                             "speed": 1.0
//                         },
//                     },
//                     tools: [
//                         {
//                             type: "function",
//                             name: "get_my_appointments",
//                             description: "Show patient their upcoming appointments",
//                             parameters: {
//                                 type: "object",
//                                 properties: {
//                                     include_past: {
//                                         type: "boolean",
//                                         description: "Whether to include past appointments",
//                                         default: false
//                                     },
//                                     limit: {
//                                         type: "number",
//                                         description: "Number of appointments to show",
//                                         default: 5
//                                     }
//                                 }
//                             }
//                         },
//                         {
//                             type: "function",
//                             name: "check_doctor_availability",
//                             description: "Check if a doctor is available for appointments on a specific date",
//                             parameters: {
//                                 type: "object",
//                                 properties: {
//                                     doctor_name: {
//                                         type: "string",
//                                         description: "Name of the doctor to check availability for"
//                                     },
//                                     date: {
//                                         type: "string",
//                                         description: "Date to check in YYYY-MM-DD format"
//                                     },
//                                     specialty: {
//                                         type: "string",
//                                         description: "Medical specialty if doctor name is not provided"
//                                     }
//                                 },
//                                 required: ["date"]
//                             }
//                         },
//                         {
//                             type: "function",
//                             name: "book_appointment",
//                             description: "Book an appointment for a patient (use stored patient info for returning patients)",
//                             parameters: {
//                                 type: "object",
//                                 properties: {
//                                     patient_name: {
//                                         type: "string",
//                                         description: "Patient's full name (use stored name for returning patients)"
//                                     },
//                                     patient_phone: {
//                                         type: "string",
//                                         description: "Patient's phone number (use stored phone for returning patients)"
//                                     },
//                                     doctor_name: {
//                                         type: "string",
//                                         description: "Name of the doctor"
//                                     },
//                                     date: {
//                                         type: "string",
//                                         description: "Appointment date in YYYY-MM-DD format"
//                                     },
//                                     time: {
//                                         type: "string",
//                                         description: "Appointment time in HH:MM format"
//                                     },
//                                     reason: {
//                                         type: "string",
//                                         description: "Reason for the appointment"
//                                     }
//                                 },
//                                 required: ["doctor_name", "date", "time", "reason"]
//                             }
//                         },
//                         {
//                             type: "function",
//                             name: "find_patient_appointments",
//                             description: "Find patient's existing appointments using patient details",
//                             parameters: {
//                                 type: "object",
//                                 properties: {
//                                     patient_name: {
//                                         type: "string",
//                                         description: "Patient's full name"
//                                     },
//                                     patient_phone: {
//                                         type: "string",
//                                         description: "Patient's phone number"
//                                     },
//                                     doctor_name: {
//                                         type: "string",
//                                         description: "Doctor's name to filter appointments"
//                                     },
//                                     date_from: {
//                                         type: "string",
//                                         description: "Start date to search from in YYYY-MM-DD format"
//                                     }
//                                 }
//                             }
//                         },
//                         {
//                             type: "function",
//                             name: "update_patient_info",
//                             description: "Update patient information during the call",
//                             parameters: {
//                                 type: "object",
//                                 properties: {
//                                     name: { type: "string", description: "Patient's name" },
//                                     age: { type: "number", description: "Patient's age" },
//                                     gender: { type: "string", enum: ["male", "female", "other"] },
//                                     preferred_doctor: { type: "string", description: "Preferred doctor name" },
//                                     preferred_time: { type: "string", description: "Preferred appointment time" }
//                                 }
//                             }
//                         },
//                         {
//                             type: "function",
//                             name: "reschedule_appointment",
//                             description: "Reschedule an appointment using appointment details instead of ID",
//                             parameters: {
//                                 type: "object",
//                                 properties: {
//                                     patient_name: {
//                                         type: "string",
//                                         description: "Patient's full name"
//                                     },
//                                     patient_phone: {
//                                         type: "string",
//                                         description: "Patient's phone number"
//                                     },
//                                     original_doctor: {
//                                         type: "string",
//                                         description: "Original doctor's name"
//                                     },
//                                     original_date: {
//                                         type: "string",
//                                         description: "Original appointment date in YYYY-MM-DD format"
//                                     },
//                                     original_time: {
//                                         type: "string",
//                                         description: "Original appointment time in HH:MM format"
//                                     },
//                                     new_date: {
//                                         type: "string",
//                                         description: "New appointment date in YYYY-MM-DD format"
//                                     },
//                                     new_time: {
//                                         type: "string",
//                                         description: "New appointment time in HH:MM format"
//                                     }
//                                 },
//                                 required: ["patient_name", "original_doctor", "original_date", "new_date", "new_time"]
//                             }
//                         },
//                         {
//                             type: "function",
//                             name: "cancel_appointment",
//                             description: "Cancel an appointment using appointment details instead of ID",
//                             parameters: {
//                                 type: "object",
//                                 properties: {
//                                     patient_name: {
//                                         type: "string",
//                                         description: "Patient's full name"
//                                     },
//                                     patient_phone: {
//                                         type: "string",
//                                         description: "Patient's phone number"
//                                     },
//                                     doctor_name: {
//                                         type: "string",
//                                         description: "Doctor's name"
//                                     },
//                                     appointment_date: {
//                                         type: "string",
//                                         description: "Appointment date in YYYY-MM-DD format"
//                                     },
//                                     appointment_time: {
//                                         type: "string",
//                                         description: "Appointment time in HH:MM format"
//                                     },
//                                     reason: {
//                                         type: "string",
//                                         description: "Reason for cancellation"
//                                     }
//                                 },
//                                 required: ["patient_name", "doctor_name", "appointment_date"]
//                             }
//                         },
//                         {
//                             type: "function",
//                             name: "request_prescription_refill",
//                             description: "Process a prescription refill request from a patient",
//                             parameters: {
//                                 type: "object",
//                                 properties: {
//                                     patient_name: {
//                                         type: "string",
//                                         description: "Patient's full name"
//                                     },
//                                     patient_phone: {
//                                         type: "string",
//                                         description: "Patient's phone number"
//                                     },
//                                     medication_name: {
//                                         type: "string",
//                                         description: "Name of the medication to refill"
//                                     },
//                                     prescribing_doctor: {
//                                         type: "string",
//                                         description: "Name of the doctor who prescribed the medication"
//                                     },
//                                     dosage: {
//                                         type: "string",
//                                         description: "Medication dosage (e.g., '10mg', '500mg twice daily')"
//                                     },
//                                     last_refill_date: {
//                                         type: "string",
//                                         description: "Date of last refill in YYYY-MM-DD format"
//                                     },
//                                     reason_for_refill: {
//                                         type: "string",
//                                         enum: ["routine_refill", "lost_medication", "going_on_trip", "urgent_need", "other"],
//                                         description: "Reason for requesting refill"
//                                     },
//                                     urgency: {
//                                         type: "string",
//                                         enum: ["routine", "urgent", "emergency"],
//                                         description: "Urgency level of the refill request"
//                                     },
//                                     pharmacy_name: {
//                                         type: "string",
//                                         description: "Preferred pharmacy name"
//                                     },
//                                     additional_notes: {
//                                         type: "string",
//                                         description: "Any additional notes or special instructions"
//                                     }
//                                 },
//                                 required: ["patient_name", "medication_name", "prescribing_doctor", "reason_for_refill"]
//                             }
//                         },
//                         {
//                             type: "function",
//                             name: "end_call",
//                             description: "End the call ONLY when patient explicitly indicates conversation is complete. Do NOT call for simple 'thank you' responses during ongoing conversation. Wait until patient says phrases like 'that's all', 'nothing else', 'goodbye', or 'have a good day' combined with thanks.",
//                             parameters: {
//                                 type: "object",
//                                 properties: {
//                                     reason: {
//                                         type: "string",
//                                         description: "Specific reason for ending call - must be clear ending signal from patient",
//                                         enum: ["conversation_complete", "patient_goodbye", "patient_finished", "patient_hung_up"]
//                                     }
//                                 },
//                                 required: ["reason"]
//                             }
//                         },
//                         {
//                             type: "function",
//                             name: "verify_patient_identity",
//                             description: "Verify patient identity for outbound calls",
//                             parameters: {
//                                 type: "object",
//                                 properties: {
//                                     name_provided: { type: "string", description: "Name provided by person answering" },
//                                     verification_method: {
//                                         type: "string",
//                                         enum: ["name_match", "phone_confirmation", "dob_check"],
//                                         description: "Method used to verify identity"
//                                     },
//                                     verified: { type: "boolean", description: "Whether identity was verified" }
//                                 },
//                                 required: ["verification_method", "verified"]
//                             }
//                         },
//                         {
//                             type: "function",
//                             name: "confirm_appointment_reminder",
//                             description: "Confirm appointment reminder details with patient",
//                             parameters: {
//                                 type: "object",
//                                 properties: {
//                                     appointment_confirmed: { type: "boolean", description: "Whether patient confirmed appointment" },
//                                     needs_reschedule: { type: "boolean", description: "Whether patient needs to reschedule" },
//                                     patient_notes: { type: "string", description: "Any notes from patient" }
//                                 },
//                                 required: ["appointment_confirmed"]
//                             }
//                         },
//                         {
//                             type: "function",
//                             name: "record_follow_up_response",
//                             description: "Record patient's response to follow-up call",
//                             parameters: {
//                                 type: "object",
//                                 properties: {
//                                     health_status: {
//                                         type: "string",
//                                         enum: ["improving", "same", "worse", "concerning"],
//                                         description: "Patient's health status since last visit"
//                                     },
//                                     has_concerns: { type: "boolean", description: "Whether patient has health concerns" },
//                                     concerns_description: { type: "string", description: "Description of patient concerns" },
//                                     needs_appointment: { type: "boolean", description: "Whether patient needs follow- up appointment" },
//                                     satisfaction_rating: {
//                                         type: "string",
//                                         enum: ["very_satisfied", "satisfied", "neutral", "dissatisfied", "very_dissatisfied"],
//                                         description: "Patient satisfaction with recent care"
//                                     }
//                                 },
//                                 required: ["health_status", "has_concerns"]
//                             }
//                         },
//                         {
//                             type: "function",
//                             name: "schedule_callback",
//                             description: "Schedule a callback for later if patient is busy",
//                             parameters: {
//                                 type: "object",
//                                 properties: {
//                                     preferred_time: { type: "string", description: "Patient's preferred callback time" },
//                                     preferred_date: { type: "string", description: "Patient's preferred callback date" },
//                                     reason: { type: "string", description: "Reason for callback" }
//                                 },
//                                 required: ["preferred_time", "reason"]
//                             }
//                         },
//                     ],
//                     tool_choice: "auto",
//                     max_output_tokens: "inf",
//                 }
//             };

//             this.openAiWs.send(JSON.stringify(sessionUpdate));

//             // Send initial greeting
//             setTimeout(() => {
//                 this.sendInitialConversationItem();
//             }, 200);
//         });

//         // Your existing message handler adapted for this call
//         this.openAiWs.on('message', (data) => this.handleOpenAIMessage(data));

//         this.openAiWs.on('close', () => {
//             console.log(`Disconnected from OpenAI API for call ${this.callId}`);
//         });

//         this.openAiWs.on('error', (error) => {
//             console.error(`OpenAI WebSocket error for call ${this.callId}:`, error);
//         });
//     }

//     handleOpenAIMessage(data) {
//         try {
//             const response = JSON.parse(data);

//             if (response.type === 'response.output_audio.delta' && response.delta) {
//                 this.audioChunkCount++;

//                 // Check if we have streamSid and connection is ready
//                 if (!this.streamSid || this.connection.readyState !== WebSocket.OPEN) {
//                     console.error(`Cannot send audio for call ${this.callId} - connection not ready, state:`, this.connection.readyState);
//                     return;
//                 }

//                 // Send audio to Twilio
//                 const audioDelta = {
//                     event: 'media',
//                     streamSid: this.streamSid,
//                     media: { payload: response.delta }
//                 };

//                 this.connection.send(JSON.stringify(audioDelta));

//                 // Timing and mark handling
//                 if (!this.responseStartTimestampTwilio) {
//                     this.responseStartTimestampTwilio = this.latestMediaTimestamp;
//                 }

//                 if (response.item_id) {
//                     this.lastAssistantItem = response.item_id;
//                 }

//                 // Send regular marks
//                 if (!this.callEndingInProgress) {
//                     this.sendMark();
//                 }
//             }

//             if (response.type === 'input_audio_buffer.speech_started') {
//                 console.log(`User started speaking on call ${this.callId}`);
//                 this.handleSpeechStartedEvent();
//             }

//             // Keep your existing transcription handlers if present
//             if (response.type === 'conversation.item.input_audio_transcription.completed') {
//                 this.addToTranscript('User', response.transcript);
//             }

//             if (response.type === 'response.output_audio_transcript.done') {
//                 this.addToTranscript('AI', response.transcript);
//             }

//             if (response.type === 'response.function_call_arguments.done') {
//                 console.log(`Function call on ${this.callId}:`, response.name, response.arguments);
//                 this.handleFunctionCall(response.call_id, response.name, JSON.parse(response.arguments));
//             }

//             // Detect when final message is complete
//             if (response.type === 'response.output_audio.done') {
//                 if (this.callEndingInProgress) {
//                     this.sendFinalMessageMark();
//                 }
//             }

//         } catch (error) {
//             console.error(`Error processing OpenAI message for call ${this.callId}:`, error);
//         }
//     }

//     // Your existing methods adapted for this call instance
//     sendInitialConversationItem() {
//         if (!this.openAiWs || this.openAiWs.readyState !== WebSocket.OPEN) {
//             console.error(`Cannot send initial item for call ${this.callId} - OpenAI not connected`);
//             return;
//         }

//         let greetingPrompt;

//         if (this.callContext.type === 'outbound') {
//             switch (this.callContext.callType) {
//                 case 'appointment_reminder':
//                     greetingPrompt = `You are making an outbound appointment reminder call to ${this.patientData?.name || 'a patient'} from ${process.env.HOSPITAL_NAME || 'City General Hospital'}. Start by greeting them professionally and explaining the purpose of your call. The appointment details are in your instructions. Be clear and helpful.`;
//                     break;
//                 case 'follow_up':
//                     greetingPrompt = `You are making an outbound follow-up call to ${this.patientData?.name || 'a patient'} from ${process.env.HOSPITAL_NAME || 'City General Hospital'}. Start by greeting them warmly and explaining you're calling to check on their wellbeing after their recent visit. Be caring and professional.`;
//                     break;
//                 default:
//                     greetingPrompt = `You are making an outbound call to ${this.patientData?.name || 'a patient'} from ${process.env.HOSPITAL_NAME || 'City General Hospital'}. Start by greeting them professionally and clearly explaining the purpose of your call. ${this.callContext.reason ? `The reason for the call is: ${this.callContext.reason}` : ''}`;
//             }
//         } else {
//             if (this.patientData) {
//                 greetingPrompt = `A returning patient ${this.patientData.name} has just called ${process.env.HOSPITAL_NAME || 'City General Hospital'}. Start with your standard greeting for returning patients. Be warm and professional.`;
//             } else {
//                 greetingPrompt = `A new patient has just called ${process.env.HOSPITAL_NAME || 'City General Hospital'}. Start with your standard greeting for new patients. Be warm and professional.`;
//             }
//         }

//         const initialConversationItem = {
//             type: "conversation.item.create",
//             item: {
//                 type: "message",
//                 role: "user",
//                 content: [
//                     {
//                         type: "input_text",
//                         text: greetingPrompt
//                     }
//                 ]
//             }
//         };

//         console.log(`Sending initial conversation item for ${this.callContext.type} call ${this.callId}`);
//         this.openAiWs.send(JSON.stringify(initialConversationItem));
//         this.openAiWs.send(JSON.stringify({ type: 'response.create' }));
//     }

//     handleSpeechStartedEvent() {
//         if (this.markQueue.length > 0 && this.responseStartTimestampTwilio != null) {
//             const elapsedTime = this.latestMediaTimestamp - this.responseStartTimestampTwilio;
//             console.log(`Truncating at ${elapsedTime}ms for call ${this.callId}`);

//             if (this.lastAssistantItem) {
//                 const truncateEvent = {
//                     type: 'conversation.item.truncate',
//                     item_id: this.lastAssistantItem,
//                     content_index: 0,
//                     audio_end_ms: elapsedTime
//                 };
//                 this.openAiWs.send(JSON.stringify(truncateEvent));
//             }

//             // Clear Twilio audio buffer
//             this.connection.send(JSON.stringify({
//                 event: 'clear',
//                 streamSid: this.streamSid
//             }));

//             // Reset
//             this.markQueue = [];
//             this.lastAssistantItem = null;
//             this.responseStartTimestampTwilio = null;
//         }
//     }

//     sendMark() {
//         if (this.streamSid && this.connection.readyState === WebSocket.OPEN) {
//             const markEvent = {
//                 event: 'mark',
//                 streamSid: this.streamSid,
//                 mark: { name: 'responsePart' }
//             };
//             this.connection.send(JSON.stringify(markEvent));
//             this.markQueue.push('responsePart');
//         }
//     }

//     sendFinalMessageMark() {
//         if (this.streamSid && this.connection.readyState === WebSocket.OPEN && !this.finalMessageMarkSent) {
//             const markEvent = {
//                 event: 'mark',
//                 streamSid: this.streamSid,
//                 mark: { name: 'finalMessage' }
//             };
//             this.connection.send(JSON.stringify(markEvent));
//             this.finalMessageMarkSent = true;
//             console.log(`Final message mark sent for call ${this.callId}`);

//             // IMMEDIATELY close OpenAI connection to prevent more responses
//             if (this.openAiWs && this.openAiWs.readyState === WebSocket.OPEN) {
//                 console.log(`Closing OpenAI connection immediately for call ${this.callId}`);
//                 this.openAiWs.close();
//             }

//             // Schedule Twilio connection close after a very short delay
//             setTimeout(() => {
//                 this.endCallSafely();
//             }, 500); // Very short delay to ensure mark is processed
//         }
//     }

//     addToTranscript(speaker, message) {
//         this.conversationTranscript.push({
//             speaker,
//             text: message,
//             timestamp: new Date()
//         });
//         console.log(`Transcript for ${this.callId} - ${speaker}:`, message);
//     }

//     async handleFunctionCall(callId, functionName, args) {
//         try {
//             let result = null;

//             switch (functionName) {
//                 case 'end_call':
//                     this.detectedIntent = 'end_call';
//                     this.extractedEntities = { ...this.extractedEntities, call_ending: args };
//                     this.callEndingInProgress = true;

//                     result = {
//                         success: true,
//                         action: 'end_call_initiated',
//                         internal_message: 'Call ending process started - waiting for message completion',
//                         reason: args.reason
//                     };

//                     // Send function result but DO NOT trigger response.create
//                     const functionResponse = {
//                         type: 'conversation.item.create',
//                         item: {
//                             type: 'function_call_output',
//                             call_id: callId,
//                             output: JSON.stringify(result)
//                         }
//                     };

//                     this.openAiWs.send(JSON.stringify(functionResponse));
//                     // DO NOT SEND: this.openAiWs.send(JSON.stringify({ type: 'response.create' }));

//                     // Set timeout in case marks fail
//                     setTimeout(() => {
//                         if (!this.finalMessageMarkReceived) {
//                             this.endCallSafely();
//                         }
//                     }, 5000);

//                     return;

//                 case 'get_my_appointments':
//                     result = {
//                         success: true,
//                         upcoming_appointments: this.upcomingAppointments,
//                         total_count: this.upcomingAppointments.length,
//                         message: this.upcomingAppointments.length > 0
//                             ? `You have ${this.upcomingAppointments.length} upcoming appointment${this.upcomingAppointments.length > 1 ? 's' : ''}`
//                             : "You don't have any upcoming appointments scheduled"
//                     };
//                     break;

//                 case 'book_appointment':
//                     this.detectedIntent = 'book_appointment';
//                     const appointmentData = {
//                         patient_name: args.patient_name || this.patientData?.name,
//                         patient_phone: args.patient_phone || this.patientData?.phone || this.from,
//                         doctor_name: args.doctor_name,
//                         date: args.date,
//                         time: args.time,
//                         reason: args.reason
//                     };

//                     this.extractedEntities = { ...this.extractedEntities, ...appointmentData };
//                     result = await bookAppointment(appointmentData);

//                     if (result.success && this.patientId) {
//                         this.upcomingAppointments = await this.getUpcomingAppointments(this.patientId);
//                     }
//                     break;

//                 case 'check_doctor_availability':
//                     this.detectedIntent = 'check_availability';
//                     this.extractedEntities = { ...this.extractedEntities, ...args };
//                     result = await checkDoctorAvailability({
//                         doctor_name: args.doctor_name,
//                         date: args.date,
//                         specialty: args.specialty
//                     });
//                     break;

//                 // case 'book_appointment':
//                 //     detectedIntent = 'book_appointment';

//                 //     // Use stored patient data for returning patients
//                 //     const appointmentData = {
//                 //         patient_name: args.patient_name || patientData?.name,
//                 //         patient_phone: args.patient_phone || patientData?.phone || from,
//                 //         doctor_name: args.doctor_name,
//                 //         date: args.date,
//                 //         time: args.time,
//                 //         reason: args.reason
//                 //     };

//                 //     extractedEntities = { ...extractedEntities, ...appointmentData };
//                 //     result = await bookAppointment(appointmentData);

//                 //     // Refresh appointments after booking
//                 //     if (result.success && patientId) {
//                 //         upcomingAppointments = await getUpcomingAppointments(patientId);
//                 //         await updatePatientFromCall({
//                 //             patientId: result.patientId || patientId,
//                 //             ...appointmentData
//                 //         });
//                 //     }
//                 //     break;

//                 case 'find_patient_appointments':
//                     this.detectedIntent = 'find_appointments';
//                     this.extractedEntities = { ...this.extractedEntities, ...args };
//                     result = await findPatientAppointments(args);
//                     break;

//                 case 'reschedule_appointment':
//                     this.detectedIntent = 'reschedule_appointment';
//                     this.extractedEntities = { ...this.extractedEntities, ...args };

//                     // Ensure phone comes from callLog if missing
//                     if (!args.patient_phone && callLog?.from) {
//                         args.patient_phone = callLog.from;
//                     }

//                     result = await rescheduleAppointmentByDetails(args);
//                     break;

//                 case 'cancel_appointment':
//                     this.detectedIntent = 'cancel_appointment';
//                     this.extractedEntities = { ...this.extractedEntities, ...args };

//                     // Ensure phone comes from callLog if missing
//                     if (!args.patient_phone && callLog?.from) {
//                         args.patient_phone = callLog.from;
//                     }

//                     result = await cancelAppointmentByDetails(args);
//                     break;

//                 case 'request_prescription_refill':
//                     this.detectedIntent = 'prescription_refill';

//                     // Use stored patient data
//                     const refillData = {
//                         patient_name: args.patient_name || patientData?.name,
//                         patient_phone: args.patient_phone || patientData?.phone || from,
//                         ...args
//                     };

//                     this.extractedEntities = { ...this.extractedEntities, ...refillData };
//                     result = await processPrescriptionRefill(refillData);
//                     break;

//                 case 'update_patient_info':
//                     if (patientId) {
//                         result = await this.updatePatientInfo(patientId, args);
//                         this.extractedEntities = { ...this.extractedEntities, patient_info: args };
//                     } else {
//                         result = { success: false, message: "Patient ID not available" };
//                     }
//                     break;

//                 case 'verify_patient_identity':
//                     result = {
//                         success: true,
//                         verified: args.verified,
//                         method_used: args.verification_method,
//                         message: args.verified ? "Patient identity verified" : "Could not verify patient identity"
//                     };
//                     this.extractedEntities = { ...this.extractedEntities, identity_verification: args };
//                     break;

//                 case 'confirm_appointment_reminder':
//                     this.detectedIntent = 'appointment_reminder_response';
//                     this.extractedEntities = { ...this.extractedEntities, appointment_reminder: args };
//                     result = {
//                         success: true,
//                         confirmed: args.appointment_confirmed,
//                         needs_reschedule: args.needs_reschedule,
//                         message: args.appointment_confirmed ? "Appointment confirmed" : "Appointment needs attention"
//                     };
//                     break;

//                 case 'record_follow_up_response':
//                     this.detectedIntent = 'follow_up_recorded';
//                     this.extractedEntities = { ...this.extractedEntities, follow_up_response: args };
//                     result = {
//                         success: true,
//                         health_status: args.health_status,
//                         needs_attention: args.has_concerns || args.health_status === 'worse' || args.health_status === 'concerning',
//                         message: "Follow-up response recorded"
//                     };
//                     break;

//                 case 'schedule_callback':
//                     result = {
//                         success: true,
//                         callback_scheduled: true,
//                         preferred_time: args.preferred_time,
//                         message: "Callback scheduled successfully"
//                     };
//                     this.extractedEntities = { ...this.extractedEntities, callback_request: args };
//                     break;
//                 default:
//                     result = { error: `Unknown function: ${functionName}` };
//             }

//             // Send function result back to OpenAI
//             const functionResponse = {
//                 type: 'conversation.item.create',
//                 item: {
//                     type: 'function_call_output',
//                     call_id: callId,
//                     output: JSON.stringify(result)
//                 }
//             };

//             this.openAiWs.send(JSON.stringify(functionResponse));
//             this.openAiWs.send(JSON.stringify({ type: 'response.create' }));

//         } catch (error) {
//             console.error(`Error handling function call for ${this.callId}:`, error);

//             const errorResponse = {
//                 type: 'conversation.item.create',
//                 item: {
//                     type: 'function_call_output',
//                     call_id: callId,
//                     output: JSON.stringify({ error: error.message })
//                 }
//             };

//             this.openAiWs.send(JSON.stringify(errorResponse));
//             this.openAiWs.send(JSON.stringify({ type: 'response.create' }));
//         }
//     }

//     endCallSafely() {
//         if (this.callEndingInProgress) {
//             setTimeout(async () => {
//                 await this.finalizeCallLog();
//                 if (this.connection && this.connection.readyState === WebSocket.OPEN) {
//                     console.log(`Closing connection gracefully for call ${this.callId}`);
//                     this.connection.close();
//                 }
//                 if (this.openAiWs && this.openAiWs.readyState === WebSocket.OPEN) {
//                     this.openAiWs.close();
//                 }
//             }, 1000);
//         }
//     }

//     async createCallLog(startData) {
//         try {
//             this.callLog = new CallLog({
//                 patient: this.patientId,
//                 callSid: startData.callSid || this.streamSid,
//                 from: this.from || 'unknown',
//                 to: this.to || 'hospital',
//                 startTime: new Date(),
//                 transcript: [],
//                 entities: {},
//                 actionTaken: 'in_progress',
//                 callType: this.callContext.type,
//                 callPurpose: this.callContext.callType,
//                 metadata: this.callContext
//             });

//             await this.callLog.save();
//             console.log(`Call log created for ${this.callId}:`, this.callLog._id);
//             return this.callLog._id;
//         } catch (error) {
//             console.error(`Error creating call log for ${this.callId}:`, error);
//         }
//     }

//     async finalizeCallLog() {
//         if (!this.callLogId || this.isFinalized) return;
//         this.isFinalized = true;

//         try {
//             const endTime = new Date();
//             const duration = this.callLog ? Math.floor((endTime - this.callLog.startTime) / 1000) : 0;

//             await CallLog.findByIdAndUpdate(this.callLogId, {
//                 endTime,
//                 duration,
//                 transcript: this.conversationTranscript,
//                 intent: this.detectedIntent,
//                 entities: this.extractedEntities,
//                 actionTaken: this.detectedIntent ? 'completed' : 'conversation_only'
//             });

//             console.log(`Call log finalized for ${this.callId}:`, this.callLogId);
//         } catch (error) {
//             console.error(`Error finalizing call log for ${this.callId}:`, error);
//         }
//     }

//     // Update patient information
//     async updatePatientInfo(patientId, info) {
//         try {
//             const updateData = {};

//             if (info.name) updateData.name = info.name;
//             if (info.age) updateData.age = info.age;
//             if (info.gender) updateData.gender = info.gender;

//             if (info.preferred_doctor) {
//                 // If it's already a valid ObjectId, use it directly
//                 if (mongoose.Types.ObjectId.isValid(info.preferred_doctor)) {
//                     updateData.preferredDoctor = info.preferred_doctor;
//                 } else {
//                     // Otherwise, try to find by name
//                     const doctor = await Doctor.findOne({ name: info.preferred_doctor });
//                     if (doctor) {
//                         updateData.preferredDoctor = doctor._id;
//                     } else {
//                         return { success: false, message: "Doctor not found" };
//                     }
//                 }
//             }

//             if (info.preferred_time) updateData.preferredTime = info.preferred_time;

//             await Patient.findByIdAndUpdate(patientId, updateData);
//             return { success: true, message: "Patient information updated successfully" };
//         } catch (error) {
//             console.error("Error updating patient info:", error);
//             return { success: false, message: "Failed to update patient information" };
//         }
//     }

//     async loadPatientData(patientId) {
//         try {
//             const patient = await Patient.findById(patientId)
//                 .populate('preferredDoctor', 'name specialty');

//             if (patient) {
//                 this.patientData = {
//                     id: patient._id,
//                     name: patient.name,
//                     phone: patient.phone,
//                     email: patient.email,
//                     age: patient.age,
//                     gender: patient.gender,
//                     preferredDoctor: patient.preferredDoctor?.name,
//                     lastVisit: patient.lastAppointment,
//                     totalVisits: patient.callDetails ? patient.callDetails.length : 0
//                 };

//                 // Load upcoming appointments
//                 this.upcomingAppointments = await this.getUpcomingAppointments(patientId);
//                 console.log(`Patient data loaded for ${this.callId}:`, this.patientData.name);
//                 return true;
//             }
//             return false;
//         } catch (error) {
//             console.error(`Error loading patient data for ${this.callId}:`, error);
//             return false;
//         }
//     }

//     async getUpcomingAppointments(patientId) {
//         try {
//             const now = new Date();
//             const appointments = await Appointment.find({
//                 patient: patientId,
//                 dateTime: { $gte: now },
//                 status: { $in: ['confirmed', 'scheduled', 'rescheduled'] }
//             })
//                 .populate('doctor', 'name specialty')
//                 .sort({ dateTime: 1 })
//                 .limit(5);

//             return appointments.map(apt => ({
//                 id: apt._id,
//                 doctor: apt.doctor.name,
//                 specialty: apt.doctor.specialty,
//                 date: apt.dateTime.toLocaleDateString('en-US', {
//                     weekday: 'long',
//                     year: 'numeric',
//                     month: 'long',
//                     day: 'numeric'
//                 }),
//                 time: apt.dateTime.toLocaleTimeString('en-US', {
//                     hour: '2-digit',
//                     minute: '2-digit'
//                 }),
//                 reason: apt.reason,
//                 status: apt.status,
//                 confirmationNumber: `APT-${apt._id.toString().slice(-6).toUpperCase()}`
//             }));
//         } catch (error) {
//             console.error(`Error fetching appointments for ${this.callId}:`, error);
//             return [];
//         }
//     }
// }

// // Global map to track active calls
// if (!global.activeCalls) {
//     global.activeCalls = new Map();
// }

// // Modified main export function
// export async function callAssistant(connection, req) {
//     console.log('Starting new AI assistant call');

//     try {
//         // Create new call session
//         const callSession = new CallSession(connection, req);

//         // Store in global map
//         global.activeCalls.set(callSession.callId, callSession);

//         // Initialize the call
//         await callSession.initialize();

//         console.log(`Call ${callSession.callId} started. Active calls: ${global.activeCalls.size}`);

//     } catch (error) {
//         console.error('Failed to start call:', error);
//         connection.close();
//     }
// }

// // Utility to get call statistics
// export function getCallStatistics() {
//     return {
//         activeCalls: global.activeCalls?.size || 0,
//         callIds: Array.from(global.activeCalls?.keys() || []),
//         memoryUsage: process.memoryUsage(),
//         uptime: process.uptime()
//     };
// }

// function ulawToPcm16(ulawBuffer) {
//     const pcm16Buffer = Buffer.alloc(ulawBuffer.length * 2);

//     // μ-law decompression table for faster lookup
//     const ulawTable = [
//         -32124, -31100, -30076, -29052, -28028, -27004, -25980, -24956,
//         -23932, -22908, -21884, -20860, -19836, -18812, -17788, -16764,
//         -15996, -15484, -14972, -14460, -13948, -13436, -12924, -12412,
//         -11900, -11388, -10876, -10364, -9852, -9340, -8828, -8316,
//         -7932, -7676, -7420, -7164, -6908, -6652, -6396, -6140,
//         -5884, -5628, -5372, -5116, -4860, -4604, -4348, -4092,
//         -3900, -3772, -3644, -3516, -3388, -3260, -3132, -3004,
//         -2876, -2748, -2620, -2492, -2364, -2236, -2108, -1980,
//         -1884, -1820, -1756, -1692, -1628, -1564, -1500, -1436,
//         -1372, -1308, -1244, -1180, -1116, -1052, -988, -924,
//         -876, -844, -812, -780, -748, -716, -684, -652,
//         -620, -588, -556, -524, -492, -460, -428, -396,
//         -372, -356, -340, -324, -308, -292, -276, -260,
//         -244, -228, -212, -196, -180, -164, -148, -132,
//         -120, -112, -104, -96, -88, -80, -72, -64,
//         -56, -48, -40, -32, -24, -16, -8, 0,
//         32124, 31100, 30076, 29052, 28028, 27004, 25980, 24956,
//         23932, 22908, 21884, 20860, 19836, 18812, 17788, 16764,
//         15996, 15484, 14972, 14460, 13948, 13436, 12924, 12412,
//         11900, 11388, 10876, 10364, 9852, 9340, 8828, 8316,
//         7932, 7676, 7420, 7164, 6908, 6652, 6396, 6140,
//         5884, 5628, 5372, 5116, 4860, 4604, 4348, 4092,
//         3900, 3772, 3644, 3516, 3388, 3260, 3132, 3004,
//         2876, 2748, 2620, 2492, 2364, 2236, 2108, 1980,
//         1884, 1820, 1756, 1692, 1628, 1564, 1500, 1436,
//         1372, 1308, 1244, 1180, 1116, 1052, 988, 924,
//         876, 844, 812, 780, 748, 716, 684, 652,
//         620, 588, 556, 524, 492, 460, 428, 396,
//         372, 356, 340, 324, 308, 292, 276, 260,
//         244, 228, 212, 196, 180, 164, 148, 132,
//         120, 112, 104, 96, 88, 80, 72, 64,
//         56, 48, 40, 32, 24, 16, 8, 0
//     ];

//     for (let i = 0; i < ulawBuffer.length; i++) {
//         const sample = ulawTable[ulawBuffer[i]];
//         pcm16Buffer.writeInt16LE(sample, i * 2);
//     }

//     return pcm16Buffer;
// }