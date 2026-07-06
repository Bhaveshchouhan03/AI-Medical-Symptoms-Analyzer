const { ChatSession, ChatHistory, ChatSuggestion } = require('./chat.model');
const PatientForm = require('../patient/patient.model');
const { WorkoutHistory, RunningHistory, CyclingHistory } = require('../fitness/history.model');
const { HealthLog } = require('../fitness/tracker.model');
const Appointment = require('../appointment/appointment.model');
const { HealthTwin } = require('../healthtwin/healthtwin.model');
const Doctor = require('../doctor/doctor.model');
const Medicine = require('../medicine/medicine.model');
const { searchVideos } = require('../ai/youtube.service');
const { findById } = require('../data/users.store');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { FaceHealthScan } = require('../face/face.model');

// Helper to get Gemini client
const getGeminiClient = () => {
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_gemini_api_key_here') {
    return null;
  }
  return new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
};

// ==========================================
// FEATURE 3 & 4: REAL-TIME GEMINI CHAT & PERSONALIZED RESPONSES
// ==========================================
exports.processMessage = async (req, res) => {
  try {
    const userId = req.user.id;
    const { message, sessionId } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ message: 'Message is required.' });
    }

    // 1. Resolve or create Chat Session
    let session;
    if (sessionId) {
      session = await ChatSession.findOne({ _id: sessionId, userId });
    }
    if (!session) {
      // Create session
      const title = message.length > 25 ? message.substring(0, 25) + '...' : message;
      session = await ChatSession.create({ userId, title });
    } else {
      session.updatedAt = new Date();
      await session.save();
    }

    // 2. Query patient's health metrics from DB to provide personalized context
    const latestHealth = await HealthLog.findOne({ userId }).sort({ date: -1 });
    const latestForm = await PatientForm.findOne({ userId }).sort({ createdAt: -1 });
    const healthTwin = await HealthTwin.findOne({ userId });
    const weeklyLogs = await HealthLog.find({ userId }).sort({ date: -1 }).limit(7);

    // Sum averages
    const avgSleep = weeklyLogs.length > 0 ? (weeklyLogs.reduce((sum, l) => sum + (l.sleepHours || 0), 0) / weeklyLogs.length) : 7.0;
    const avgWater = weeklyLogs.length > 0 ? (weeklyLogs.reduce((sum, l) => sum + (l.waterIntake || 0), 0) / weeklyLogs.length) : 2000;

    let userData = findById(userId);
    let name = userData ? `${userData.firstName} ${userData.lastName}` : 'Patient';

    const gender = (latestForm && latestForm.gender) ? latestForm.gender : 'male';
    const age = (latestForm && typeof latestForm.age === 'number' && !isNaN(latestForm.age)) ? latestForm.age : 28;
    const weight = (latestHealth && typeof latestHealth.weight === 'number' && !isNaN(latestHealth.weight)) ? latestHealth.weight : 70;
    const bmi = (latestHealth && typeof latestHealth.bmi === 'number' && !isNaN(latestHealth.bmi)) ? latestHealth.bmi : 22.4;
    const healthScore = healthTwin ? healthTwin.healthScore : 70;
    const healthTwinStatus = healthTwin ? healthTwin.status : 'Balanced';
    const symptoms = (latestForm && latestForm.symptoms && Array.isArray(latestForm.symptoms)) ? latestForm.symptoms.join(', ') : 'None reported';
    const severity = (latestForm && typeof latestForm.severity === 'number' && !isNaN(latestForm.severity)) ? latestForm.severity : 0;

    // Fetch active appointments
    const appointments = await Appointment.find({
      patientId: userId,
      status: { $in: ['Pending', 'Accepted'] }
    }).sort({ appointmentDate: 1 }).limit(3);

    const appointmentsStr = appointments.length > 0 
      ? appointments.map(a => `${a.doctorName} (${a.doctorSpecialization}) on ${a.appointmentDate} at ${a.appointmentTime}`).join(', ')
      : 'No upcoming appointments';

    // Fetch fitness totals
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const runsCount = await RunningHistory.countDocuments({ userId, date: { $gte: oneWeekAgo } });
    const cyclesCount = await CyclingHistory.countDocuments({ userId, date: { $gte: oneWeekAgo } });

    // Fetch latest Face Scan context
    const latestFaceScan = await FaceHealthScan.findOne({ userId }).sort({ date: -1 });
    let faceScanStr = 'No previous face wellness scans conducted yet.';
    if (latestFaceScan) {
      faceScanStr = `Last Scan completed on ${latestFaceScan.date.toLocaleDateString()}. Wellness Score: ${latestFaceScan.score}/100 (${latestFaceScan.category}). Mood: ${latestFaceScan.mood}. Visible Indicators: Eye Redness: ${latestFaceScan.wellnessIndicators.eyeRedness}, Dark Circles: ${latestFaceScan.wellnessIndicators.darkCircles}, Skin Type: ${latestFaceScan.wellnessIndicators.skinType}, Skin Brightness: ${latestFaceScan.wellnessIndicators.skinBrightness}, Stress appearance: ${latestFaceScan.wellnessIndicators.stress}/10, Fatigue appearance: ${latestFaceScan.wellnessIndicators.fatigue}/10, Hydration appearance: ${latestFaceScan.wellnessIndicators.hydration}/10. Recommendations: ${latestFaceScan.recommendations.join(', ')}`;
    }

    // 3. Command & Smart Integrations Detectors
    let recommendedDoctors = null;
    let recommendedMedicines = null;
    let recommendedVideos = null;
    let isEmergency = false;
    let redirectAction = null;

    const lowerMessage = message.toLowerCase();

    // FEATURE 13: EMERGENCY DETECTION
    const emergencyKeywords = [
      'chest pain', 'heart attack', 'stroke', 'difficulty breathing', 'shortness of breath', 
      'poisoning', 'severe bleeding', 'unconscious', 'cannot breathe', 'head injury unconscious'
    ];
    if (emergencyKeywords.some(kw => lowerMessage.includes(kw))) {
      isEmergency = true;
    }

    // FEATURE 8: DOCTOR RECOMMENDATIONS / SYMPTOMS DETECTOR
    if (lowerMessage.includes('doctor') || lowerMessage.includes('appointment') || lowerMessage.includes('symptom') || lowerMessage.includes('pain') || lowerMessage.includes('fever') || lowerMessage.includes('cough')) {
      let spec = 'General Physician';
      if (lowerMessage.includes('skin') || lowerMessage.includes('rash') || lowerMessage.includes('dermatologist')) spec = 'Dermatologist';
      else if (lowerMessage.includes('heart') || lowerMessage.includes('chest') || lowerMessage.includes('cardiologist')) spec = 'Cardiologist';
      else if (lowerMessage.includes('brain') || lowerMessage.includes('headache') || lowerMessage.includes('neurologist')) spec = 'Neurologist';
      else if (lowerMessage.includes('mind') || lowerMessage.includes('stress') || lowerMessage.includes('anxiety') || lowerMessage.includes('psychiatrist')) spec = 'Psychiatrist';
      else if (lowerMessage.includes('eye') || lowerMessage.includes('vision') || lowerMessage.includes('ophthalmologist')) spec = 'Ophthalmologist';
      else if (lowerMessage.includes('bone') || lowerMessage.includes('fracture') || lowerMessage.includes('orthopedic')) spec = 'Orthopedic';
      else if (lowerMessage.includes('ear') || lowerMessage.includes('nose') || lowerMessage.includes('throat') || lowerMessage.includes('ent')) spec = 'ENT Specialist';
      else if (lowerMessage.includes('tooth') || lowerMessage.includes('teeth') || lowerMessage.includes('dentist')) spec = 'Dentist';

      const doctorList = await Doctor.find({ specialization: spec, status: 'Active' }).sort({ rating: -1 }).limit(3);
      if (doctorList.length > 0) {
        recommendedDoctors = doctorList.map(doc => ({
          id: doc._id,
          fullName: doc.fullName,
          specialization: doc.specialization,
          experience: doc.experience,
          consultationFee: doc.consultationFee,
          rating: doc.rating,
          availableDays: doc.availableDays,
          availableTimeSlots: doc.availableTimeSlots
        }));
      }
    }

    // FEATURE 9: MEDICINE INFORMATION INTEGRATOR
    // Retrieve all medicines to check matches
    const allMeds = await Medicine.find({});
    const matchedMed = allMeds.find(m => lowerMessage.includes(m.medicineName.toLowerCase()) || lowerMessage.includes(m.brandName.toLowerCase()) || lowerMessage.includes(m.genericName.toLowerCase()));
    if (matchedMed) {
      recommendedMedicines = {
        medicineName: matchedMed.medicineName,
        genericName: matchedMed.genericName,
        brandName: matchedMed.brandName,
        category: matchedMed.category,
        description: matchedMed.description,
        uses: matchedMed.uses,
        sideEffects: matchedMed.sideEffects,
        warnings: matchedMed.warnings,
        precautions: matchedMed.precautions,
        howItWorks: matchedMed.howItWorks,
        foodInteractions: matchedMed.foodInteractions,
        prescriptionRequired: matchedMed.prescriptionRequired,
        availableStrengths: matchedMed.availableStrengths,
        availableForms: matchedMed.availableForms,
        image: matchedMed.image
      };
    }

    // FEATURE 12: YOUTUBE EDUCATIONAL VIDEOS INTEGRATOR
    if (lowerMessage.includes('video') || lowerMessage.includes('watch') || lowerMessage.includes('youtube') || lowerMessage.includes('exercise') || lowerMessage.includes('yoga') || lowerMessage.includes('workout') || lowerMessage.includes('fever') || lowerMessage.includes('headache') || lowerMessage.includes('meditate')) {
      let query = 'general health tips';
      if (lowerMessage.includes('yoga')) query = 'beginner yoga poses';
      else if (lowerMessage.includes('meditation') || lowerMessage.includes('stress')) query = 'meditation relief';
      else if (lowerMessage.includes('workout') || lowerMessage.includes('exercise')) query = 'home workouts';
      else if (lowerMessage.includes('fever')) query = 'fever home remedy';
      else if (lowerMessage.includes('headache')) query = 'headache relief andrew bang';
      else if (lowerMessage.includes('cough') || lowerMessage.includes('cold')) query = 'respiratory illness home care';

      const videos = await searchVideos(query, 2);
      if (videos && videos.length > 0) {
        recommendedVideos = videos;
      }
    }

    // FEATURE 7: SMART COMMANDS REDIRECT DETECTION
    if (lowerMessage.includes('show medicine') || lowerMessage.includes('explain paracetamol') || lowerMessage.includes('medicine dashboard')) {
      redirectAction = 'medicines';
    } else if (lowerMessage.includes('book doctor') || lowerMessage.includes('recommend doctor') || lowerMessage.includes('appointment dashboard')) {
      redirectAction = 'appointments';
    } else if (lowerMessage.includes('suggest workout') || lowerMessage.includes('suggest yoga') || lowerMessage.includes('fitness dashboard') || lowerMessage.includes('suggest meditation')) {
      redirectAction = 'wellness';
    } else if (lowerMessage.includes('show today\'s report') || lowerMessage.includes('show weekly report') || lowerMessage.includes('my reports') || lowerMessage.includes('history detail')) {
      redirectAction = 'history';
    } else if (lowerMessage.includes('show health twin') || lowerMessage.includes('show health score')) {
      redirectAction = 'health-twin';
    }

    // 4. Retrieve session history (last 5 messages) for conversational continuity
    const historyLogs = await ChatHistory.find({ sessionId: session._id }).sort({ timestamp: -1 }).limit(5);
    const formattedHistory = historyLogs.reverse().map(h => `${h.sender === 'user' ? 'User' : 'AI Assistant'}: ${h.text}`).join('\n');

    // 5. Send Prompt to Gemini AI
    const gemini = getGeminiClient();
    let aiResponseText = '';
    let detectedLanguage = 'en';

    if (isEmergency) {
      aiResponseText = `🚨 **EMERGENCY WARNING** 🚨\n\nYou have mentioned symptoms that may indicate a critical emergency situation (e.g., chest pain, breathing difficulty, severe bleeding, or stroke indications).\n\n**Please seek immediate emergency medical care (call 911 or visit the nearest emergency room).**\n\n*This AI assistant provides educational health information only and is not a substitute for professional medical advice, diagnosis, or treatment.*`;
    } else if (gemini) {
      try {
        const model = gemini.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const systemPrompt = `You are a helpful, compassionate, and professional AI Healthcare Chat Assistant. You are chatting with a patient.
You must adhere to these strict constraints:
- NEVER diagnose diseases.
- NEVER prescribe medicines or specify dosages.
- Always provide educational health guidelines.
- Always include this mandatory disclaimer at the very end of your response:
  "This AI assistant provides educational health information only and is not a substitute for professional medical advice, diagnosis, or treatment."

PATIENT RECORD & METRICS:
- Patient Name: ${name}
- Age: ${age} years old
- Gender: ${gender}
- Weight: ${weight} kg
- BMI: ${bmi}
- Current Health Score: ${healthScore}/100 (Status: ${healthTwinStatus})
- Logged Symptoms: ${symptoms} (Severity: ${severity}/10)
- Upcoming Appointments: ${appointmentsStr}
- Weekly Average Sleep: ${avgSleep.toFixed(1)} hrs/day
- Weekly Average Hydration: ${avgWater.toFixed(0)} ml/day
- Active Runs this week: ${runsCount} | Cycles: ${cyclesCount}
- Latest Face Scan Results: ${faceScanStr}

CHATBOT BEHAVIOR INSTRUCTIONS:
1. Multi-language: Automatically detect if the user's query is in English, Hindi, or Hinglish (Hindi written in English alphabets like "meri health kaisi hai"). Respond in the exact same language format (Hinglish/Hindi/English) maintaining high natural fluency.
2. Personalized: Address the patient by name (e.g., "Hello ${name.split(' ')[0]} 👋"). Reference their metrics dynamically if they ask about their health, sleep, water, or appointments.
3. Keep answers friendly, formatted with markdown lists and emojis.

CONVERSATION HISTORY SUMMARY:
${formattedHistory}

USER MESSAGE:
"${message}"

Respond ONLY in this exact JSON structure (no markdown code blocks, no backticks, no code fences, just raw JSON):
{
  "response": "Your friendly, formatted conversational text response with required disclaimer included at the end.",
  "detectedLanguage": "en|hi|hinglish"
}`;

        const result = await model.generateContent(systemPrompt);
        const text = result.response.text().trim();
        const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
        
        try {
          const parsed = JSON.parse(cleaned);
          aiResponseText = parsed.response;
          detectedLanguage = parsed.detectedLanguage || 'en';
        } catch {
          // Fallback parser if JSON output had small anomalies
          aiResponseText = text;
        }
      } catch (err) {
        console.error('Gemini chatbot call failed:', err.message);
      }
    }

    // Heuristic Fallback if Gemini fails
    if (!aiResponseText) {
      detectedLanguage = lowerMessage.match(/[a-z]+/g)?.some(w => ['meri', 'kaisi', 'hai', 'batao', 'dard'].includes(w)) ? 'hinglish' : 'en';
      
      if (detectedLanguage === 'hinglish') {
        aiResponseText = `Namaste ${name.split(' ')[0]} 👋. Main aapki healthcare assistant hoon. Aapka Health Score ${healthScore} hai aur BMI ${bmi} hai. Paani ka average intake ${avgWater.toFixed(0)} ml aur sleep average ${avgSleep.toFixed(1)} ghante hai. Kripya dhyan dein ki main koi dawai nahi prescribe kar sakti. Kisi doctor se salah lein.\n\n"This AI assistant provides educational health information only and is not a substitute for professional medical advice, diagnosis, or treatment."`;
      } else {
        aiResponseText = `Hello ${name.split(' ')[0]} 👋. I am your health companion. Your current Health Twin Score is ${healthScore}/100 and your BMI is ${bmi}. Your average sleep is ${avgSleep.toFixed(1)} hours, and daily water average is ${avgWater.toFixed(0)} ml. Please let me know how I can guide you today.\n\n"This AI assistant provides educational health information only and is not a substitute for professional medical advice, diagnosis, or treatment."`;
      }
    }

    // 6. Save messages to database history
    await ChatHistory.create({
      sessionId: session._id,
      userId,
      sender: 'user',
      text: message,
      language: detectedLanguage
    });

    const aiHistoryDoc = await ChatHistory.create({
      sessionId: session._id,
      userId,
      sender: 'ai',
      text: aiResponseText,
      language: detectedLanguage,
      metadata: {
        recommendedDoctors,
        recommendedMedicines,
        recommendedVideos,
        isEmergency,
        action: redirectAction
      }
    });

    res.status(200).json({
      status: 'success',
      sessionId: session._id,
      sessionTitle: session.title,
      data: aiHistoryDoc
    });
  } catch (err) {
    console.error('processMessage error:', err);
    res.status(500).json({ message: err.message });
  }
};

// ==========================================
// FEATURE 14: CHAT HISTORY ENDPOINTS
// ==========================================
exports.getSessions = async (req, res) => {
  try {
    const userId = req.user.id;
    const sessions = await ChatSession.find({ userId }).sort({ updatedAt: -1 });
    res.json({ status: 'success', data: sessions });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getSessionDetails = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const session = await ChatSession.findOne({ _id: id, userId });
    if (!session) {
      return res.status(404).json({ message: 'Chat session not found.' });
    }

    const messages = await ChatHistory.find({ sessionId: id, userId }).sort({ timestamp: 1 });
    res.json({ status: 'success', data: { session, messages } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteSession = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    await ChatSession.deleteOne({ _id: id, userId });
    await ChatHistory.deleteMany({ sessionId: id, userId });

    res.json({ status: 'success', message: 'Chat session deleted successfully.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.clearHistory = async (req, res) => {
  try {
    const userId = req.user.id;

    // Delete all sessions and history
    await ChatSession.deleteMany({ userId });
    await ChatHistory.deleteMany({ userId });

    res.json({ status: 'success', message: 'All chat histories cleared successfully.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ==========================================
// FEATURE 5: VOICE CHAT ENDPOINT
// ==========================================
exports.voiceChat = async (req, res) => {
  try {
    const userId = req.user.id;
    const { audioData } = req.body; // base64 voice sample

    if (!audioData) {
      return res.status(400).json({ message: 'Audio data is required.' });
    }

    // Mock transcribing and trigger the main processMessage loop
    const parsedText = 'How is my health?';
    
    // Create or reuse active session
    let activeSession = await ChatSession.findOne({ userId }).sort({ updatedAt: -1 });
    if (!activeSession) {
      activeSession = await ChatSession.create({ userId, title: 'Voice Session' });
    }

    req.body.message = parsedText;
    req.body.sessionId = activeSession._id;

    return exports.processMessage(req, res);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ==========================================
// FEATURE 14: PDF CHAT EXPORT
// ==========================================
exports.exportChatHistoryText = async (req, res) => {
  try {
    const userId = req.user.id;
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ message: 'Session ID is required.' });
    }

    const messages = await ChatHistory.find({ sessionId, userId }).sort({ timestamp: 1 });
    if (messages.length === 0) {
      return res.status(404).json({ message: 'No messages found in this session.' });
    }

    // Format chat into clean text log
    let fileContent = `====================================================\n`;
    fileContent += `MEDICAL AI CHAT TRANSCRIPT LOG\n`;
    fileContent += `EXPORT DATE: ${new Date().toLocaleDateString()}\n`;
    fileContent += `====================================================\n\n`;

    messages.forEach(m => {
      const time = new Date(m.timestamp).toLocaleTimeString();
      const senderName = m.sender === 'user' ? 'PATIENT' : 'AI HEALTH ASSISTANT';
      fileContent += `[${time}] ${senderName}:\n${m.text}\n\n`;
      fileContent += `----------------------------------------------------\n`;
    });

    fileContent += `\n*End of log transcript.*`;

    res.setHeader('Content-disposition', 'attachment; filename=Chat_Transcript_Log.txt');
    res.setHeader('Content-type', 'text/plain');
    res.write(fileContent);
    res.end();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
