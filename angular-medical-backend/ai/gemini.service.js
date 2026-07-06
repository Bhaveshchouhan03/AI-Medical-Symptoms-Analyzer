const { GoogleGenerativeAI } = require('@google/generative-ai');

let genAI = null;

const getClient = () => {
  if (!genAI) {
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_gemini_api_key_here') {
      throw new Error('GEMINI_API_KEY is not set in .env');
    }
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return genAI;
};

// ─────────────────────────────────────────────────────────────
// Gemini prompt — returns medical analysis + YouTube queries
// ─────────────────────────────────────────────────────────────
const buildPrompt = ({ age, gender, symptoms, duration, severity, notes }) => {
  const severityText =
    severity <= 3 ? 'mild'     :
    severity <= 6 ? 'moderate' :
    severity <= 8 ? 'severe'   : 'critical';

  return `You are a compassionate medical AI assistant. A patient has submitted symptoms.
Provide a clear, helpful medical analysis AND generate precise YouTube search queries so the patient can watch educational videos.

PATIENT DATA:
- Age: ${age} years old
- Gender: ${gender}
- Symptoms: ${symptoms && Array.isArray(symptoms) ? symptoms.join(', ') : 'None reported'}
- Duration: ${duration}
- Severity: ${severity}/10 (${severityText})
- Additional notes: ${notes || 'None'}

INSTRUCTIONS:
1. possibleConditions — list 3-5 most likely causes (informational only, NOT a diagnosis)
2. homeCare — 4-6 specific actionable home care steps the patient can do right now
3. doctorRecommendation — clear signs/timeline that indicate the patient should visit a doctor
4. emergencyWarning — specific red-flag symptoms requiring IMMEDIATE emergency care (null if not applicable)
5. healthRiskScore — calculate a health risk score from 0 to 100 based on the symptoms, severity, duration, and age.
6. healthRiskLevel — determine the risk level based on the healthRiskScore: "low" (if score <= 35), "moderate" (if score 36-75), or "high" (if score >= 76).
7. youtubeSearchQueries — generate 4-5 simple English search keyword phrases for YouTube.
   Each query must be a simple keyword phrase such as "fever home treatment", "headache relief", or "cough remedies".
   Do NOT generate YouTube video IDs, video URLs, links, or file paths.
   Prefer keywords that target trusted channels like WHO, Mayo Clinic, Cleveland Clinic, NHS, CDC.
   Mix categories: one for understanding the condition, one for home remedies, one for when to see a doctor, and optionally exercise/diet/prevention.

Respond ONLY in this exact JSON (no markdown, no code fences):
{
  "summary": "2-3 sentence empathetic summary of the patient's situation",
  "healthRiskScore": 82,
  "healthRiskLevel": "high",
  "possibleConditions": [
    { "name": "Condition name", "likelihood": "high|medium|low", "explanation": "One clear sentence" }
  ],
  "homeCare": [
    "Specific tip 1",
    "Specific tip 2"
  ],
  "doctorRecommendation": "Clear guidance on timeline and signs to visit a doctor",
  "emergencyWarning": "Red flag symptoms requiring emergency care, or null if not urgent",
  "urgencyLevel": "routine|soon|urgent|emergency",
  "disclaimer": "Brief reminder this is not a medical diagnosis",
  "youtubeSearchQueries": [
    { "query": "simple search keyword phrase (e.g. 'fever home treatment')", "category": "understanding|home-remedy|when-to-see-doctor|exercise|diet|prevention", "symptomFocus": "main symptom this targets" }
  ]
}`;
};

// ─────────────────────────────────────────────────────────────
// Call Gemini
// ─────────────────────────────────────────────────────────────
const analyzeSymptoms = async (patientData) => {
  const client = getClient();
  const model  = client.getGenerativeModel({ model: 'gemini-1.5-flash' });

  let result;

  try {
      result = await model.generateContent(buildPrompt(patientData));
  } catch (err) {
      console.error("Gemini API Error:", err);
      throw err;
  }
  const text    = result.response.text().trim();
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

  try {
    const parsed = JSON.parse(cleaned);
    if (!Array.isArray(parsed.youtubeSearchQueries)) parsed.youtubeSearchQueries = [];
    if (!Array.isArray(parsed.homeCare))             parsed.homeCare = [];
    if (!Array.isArray(parsed.possibleConditions))   parsed.possibleConditions = [];
    
    // Ensure health risk score and level are present
    if (typeof parsed.healthRiskScore !== 'number') {
      parsed.healthRiskScore = Math.min(100, Math.max(10, patientData.severity * 9 + (patientData.symptoms?.length || 1) * 3));
    }
    if (!['low', 'moderate', 'high'].includes(parsed.healthRiskLevel)) {
      parsed.healthRiskLevel = parsed.healthRiskScore <= 35 ? 'low' : parsed.healthRiskScore <= 75 ? 'moderate' : 'high';
    }

    return parsed;
  } catch {
    console.error('[Gemini] JSON parse failed. Raw:', cleaned.slice(0, 400));
    const fallbackScore = Math.min(100, Math.max(10, patientData.severity * 9 + (patientData.symptoms?.length || 1) * 3));
    const fallbackLevel = fallbackScore <= 35 ? 'low' : fallbackScore <= 75 ? 'moderate' : 'high';
    return {
      summary: 'AI analysis could not be parsed. Please consult a doctor.',
      healthRiskScore: fallbackScore,
      healthRiskLevel: fallbackLevel,
      possibleConditions: [],
      homeCare: ['Rest and stay hydrated', 'Monitor your symptoms', 'Consult a healthcare provider'],
      doctorRecommendation: 'If symptoms persist more than 3 days or worsen, see a doctor.',
      emergencyWarning: null,
      urgencyLevel: 'routine',
      disclaimer: 'This is AI-generated information, not a medical diagnosis.',
      youtubeSearchQueries: [],
    };
  }
};

const buildFitnessPrompt = ({ age, gender, symptoms, bmi, weight, heartRate, bloodPressure, lifestyle }) => {
  return `You are a professional fitness coach, yoga instructor, and wellness expert. Generate a personalized exercise, yoga, meditation, and healthy lifestyle wellness plan for a patient based on their details.

PATIENT METRICS:
- Age: ${age} years old
- Gender: ${gender}
- Symptoms: ${symptoms.join(', ') || 'None reported'}
- Weight: ${weight ? weight + ' kg' : 'Not provided'}
- BMI: ${bmi ? bmi : 'Not provided'}
- Heart Rate: ${heartRate ? heartRate + ' bpm' : 'Not provided'}
- Blood Pressure: ${bloodPressure || 'Not provided'}
- Lifestyle/Notes: ${lifestyle || 'Active/Moderate'}

INSTRUCTIONS:
1. Recommend 3 suitable Home Workouts or physical activities.
2. Recommend 3 specific Yoga Poses suited to their health profile.
3. Recommend 2 specific Meditation techniques or duration targets.
4. Recommend daily targets for: Running/Walking distance (km), Cycling distance (km), Water Intake (litres), and Sleep Duration (hours).
5. Suggest a healthy, balanced Diet menu (Breakfast, Lunch, Dinner, Snacks).
6. Give 3 actionable wellness and lifestyle recommendations.

Respond ONLY in this exact JSON structure (no markdown, no code fences):
{
  "dailyExercise": [
    { "activity": "Activity name (e.g. Daily Walking)", "duration": "Duration in mins", "intensity": "low|medium|high", "benefits": "Why this is good for them" }
  ],
  "yoga": [
    { "poseName": "Pose name (e.g. Balasana / Child Pose)", "duration": "Duration in mins", "benefits": "Why this pose is selected" }
  ],
  "meditation": [
    { "type": "Technique name (e.g. Guided Mindfulness)", "duration": "Duration in mins", "focus": "What to concentrate on" }
  ],
  "targets": {
    "waterIntake": 3.0,
    "sleepDuration": 8.0,
    "runningDistance": 2.0,
    "cyclingDistance": 5.0
  },
  "diet": {
    "breakfast": "Meal description",
    "lunch": "Meal description",
    "dinner": "Meal description",
    "snacks": "Meal description"
  },
  "lifestyleTips": [
    "Tip 1",
    "Tip 2",
    "Tip 3"
  ]
}`;
};

const generateFitnessPlan = async (wellnessData) => {
  try {
    const client = getClient();
    const model  = client.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    const result = await model.generateContent(buildFitnessPrompt(wellnessData));
    const text    = result.response.text().trim();
    const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    
    const parsed = JSON.parse(cleaned);
    // Sanity checks
    if (!Array.isArray(parsed.dailyExercise)) parsed.dailyExercise = [];
    if (!Array.isArray(parsed.yoga)) parsed.yoga = [];
    if (!Array.isArray(parsed.meditation)) parsed.meditation = [];
    if (!parsed.targets) parsed.targets = { waterIntake: 3.0, sleepDuration: 8.0, runningDistance: 2.0, cyclingDistance: 5.0 };
    if (!parsed.diet) parsed.diet = { breakfast: 'Oatmeal', lunch: 'Salad', dinner: 'Protein', snacks: 'Nuts' };
    if (!Array.isArray(parsed.lifestyleTips)) parsed.lifestyleTips = [];
    
    return parsed;
  } catch (err) {
    console.error("[Gemini] Fitness AI Plan Error, using heuristic fallback:", err.message);
    
    const symptomsStr = (wellnessData.symptoms || []).join(' ').toLowerCase() + ' ' + (wellnessData.lifestyle || '').toLowerCase();
    
    let exercises = [
      { activity: "Daily brisk walking", duration: "30", intensity: "low", benefits: "Improves metabolic rate and cardiovascular health." },
      { activity: "Light stretching", duration: "10", intensity: "low", benefits: "Enhances joint flexibility and blood flow." }
    ];
    let yogaPoses = [
      { poseName: "Tadasana (Mountain Pose)", duration: "5", benefits: "Improves posture and body awareness." },
      { poseName: "Balasana (Child Pose)", duration: "5", benefits: "Stretches lower back and relaxes mind." }
    ];
    let meditationTechs = [
      { type: "Guided breath awareness", duration: "10", focus: "Slow inhales and exhales" }
    ];
    let running = 2.0;
    let cycling = 5.0;
    let water = 3.0;
    let sleep = 8.0;
    let diet = {
      breakfast: "Oatmeal with berries and chia seeds, green tea",
      lunch: "Brown rice with grilled vegetables and lentils",
      dinner: "Baked salmon or tofu with steamed broccoli and quinoa",
      snacks: "A handful of mixed almonds and walnuts, or an apple"
    };
    
    if (symptomsStr.includes('stress') || symptomsStr.includes('anxiety') || symptomsStr.includes('depression') || symptomsStr.includes('sleep') || symptomsStr.includes('poor sleep')) {
      meditationTechs = [
        { type: "Mindfulness Meditation", duration: "15", focus: "Focusing on physical sensations and breath flow" },
        { type: "Box breathing exercises", duration: "5", focus: "4 seconds inhale, 4 hold, 4 exhale, 4 hold" }
      ];
      yogaPoses = [
        { poseName: "Viparita Karani (Legs-up-the-wall Pose)", duration: "10", benefits: "Relieves fatigue and calms nervous system." },
        { poseName: "Balasana (Child Pose)", duration: "5", benefits: "Releases spine tension and triggers relaxation response." }
      ];
    } else if (symptomsStr.includes('back pain') || symptomsStr.includes('joint') || symptomsStr.includes('stiff') || symptomsStr.includes('neck pain')) {
      yogaPoses = [
        { poseName: "Marjaryasana (Cat-Cow Stretch)", duration: "8", benefits: "Warms up spine and relieves back stiffness." },
        { poseName: "Adho Mukha Svanasana (Downward-facing Dog)", duration: "5", benefits: "Stretches hamstrings, calves, and lower back." }
      ];
      exercises = [
        { activity: "Low impact stretching", duration: "15", intensity: "low", benefits: "Lengthens spinal muscles safely." },
        { activity: "Swimming or slow walking", duration: "25", intensity: "low", benefits: "Strengthens core muscles without joint stress." }
      ];
    } else if (symptomsStr.includes('obesity') || symptomsStr.includes('weight') || symptomsStr.includes('fat') || symptomsStr.includes('pressure') || symptomsStr.includes('diabetes')) {
      exercises = [
        { activity: "High-intensity walking or jogging", duration: "40", intensity: "medium", benefits: "Maximizes fat burning and increases stamina." },
        { activity: "Light bodyweight squats and lunges", duration: "15", intensity: "medium", benefits: "Builds lower-body muscle mass to burn passive calories." }
      ];
      running = 4.0;
      cycling = 10.0;
    }
    
    return {
      dailyExercise: exercises,
      yoga: yogaPoses,
      meditation: meditationTechs,
      targets: { waterIntake: water, sleepDuration: sleep, runningDistance: running, cyclingDistance: cycling },
      diet: diet,
      lifestyleTips: [
        "Drink warm water first thing in the morning to stimulate digestion.",
        "Limit screen time 60 minutes before going to bed.",
        "Take micro-stretches if sitting at a desk for more than 2 hours."
      ]
    };
  }
};

module.exports = { analyzeSymptoms, generateFitnessPlan };
