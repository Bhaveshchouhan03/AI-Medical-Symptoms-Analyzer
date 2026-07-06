const { analyzeSymptoms }      = require('./gemini.service');
const { fetchVideosForQueries } = require('./youtube.service');
const PatientForm               = require('../patient/patient.model');

/**
 * POST /api/ai/analyze
 * 1. Gemini analyzes symptoms → returns medical analysis + YouTube search queries
 * 2. YouTube Data API fetches real videos for each query (parallel)
 * 3. Combined result saved to MongoDB and returned to frontend
 */
const analyzePatientSymptoms = async (req, res) => {
  try {
    const { formId, age, gender, symptoms, duration, severity, notes } = req.body;

    // Validation
    const missing = [];
    if (age      === undefined || age      === null || age      === '') missing.push('age');
    if (!gender)  missing.push('gender');
    if (!duration) missing.push('duration');
    if (severity === undefined || severity === null || severity === '') missing.push('severity');
    if (!symptoms) missing.push('symptoms');

    if (missing.length > 0)
      return res.status(400).json({ message: `Missing fields: ${missing.join(', ')}` });

    if (!Array.isArray(symptoms) || symptoms.length === 0)
      return res.status(400).json({ message: 'At least one symptom is required' });

    console.log(`[AI] Starting analysis — user: ${req.user?.id} | symptoms: ${symptoms.join(', ')}`);

    // ── Check API Key: Fallback to Mock Response if placeholder ──
    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey || geminiKey === 'your_gemini_api_key_here') {
      console.warn('[AI] Using mock analysis response since GEMINI_API_KEY is not configured in .env.');
      
      const simulatedScore = Math.min(100, Math.max(10, severity * 8 + (symptoms.length * 4)));
      const simulatedLevel = simulatedScore <= 35 ? 'low' : simulatedScore <= 75 ? 'moderate' : 'high';

      const mockResult = {
        summary: `Based on your reported symptoms (${symptoms.join(', ')}), this is a simulated analysis for demonstration purposes since GEMINI_API_KEY is a placeholder in .env.`,
        healthRiskScore: simulatedScore,
        healthRiskLevel: simulatedLevel,
        possibleConditions: [
          { name: "Common Cold / Viral infection", likelihood: "high", explanation: "Viral infections of the upper respiratory tract commonly cause these mild symptoms." },
          { name: "Allergic Rhinitis", likelihood: "medium", explanation: "Allergies can cause persistent nasal congestion, sneezing, and sore throat." }
        ],
        possibleCauses: [
          { name: "Common Cold / Viral infection", likelihood: "high", explanation: "Viral infections of the upper respiratory tract commonly cause these mild symptoms." },
          { name: "Allergic Rhinitis", likelihood: "medium", explanation: "Allergies can cause persistent nasal congestion, sneezing, and sore throat." }
        ],
        homeCare: [
          "Stay hydrated by drinking plenty of water, herbal teas, or warm broths.",
          "Get plenty of rest to allow your immune system to recover.",
          "Consider over-the-counter throat lozenges or saline nasal sprays for symptom relief."
        ],
        homeCareTips: [
          "Stay hydrated by drinking plenty of water, herbal teas, or warm broths.",
          "Get plenty of rest to allow your immune system to recover.",
          "Consider over-the-counter throat lozenges or saline nasal sprays for symptom relief."
        ],
        doctorRecommendation: "If your symptoms persist for more than 7-10 days, or if they worsen over time, consult a healthcare professional for an evaluation.",
        whenToSeeDoctor: "If your symptoms persist for more than 7-10 days, or if they worsen over time, consult a healthcare professional for an evaluation.",
        emergencyWarning: "Seek immediate medical attention if you experience severe shortness of breath, chest pain, high fever that doesn't go down, or difficulty swallowing.",
        emergencyWarnings: "Seek immediate medical attention if you experience severe shortness of breath, chest pain, high fever that doesn't go down, or difficulty swallowing.",
        urgencyLevel: "routine",
        disclaimer: "DEMO MODE: This is placeholder medical information. It does not replace professional medical advice.",
        recommendedVideos: [],
        videos: []
      };

      if (formId) {
        await PatientForm.findByIdAndUpdate(
          formId,
          { $set: { aiAnalysis: mockResult } },
          { new: true }
        ).catch(err => console.warn('[DB] Failed to save AI result:', err.message));
      }

      return res.status(200).json(mockResult);
    }

    // ── Step 1: Gemini medical analysis ──────────────────────
    let geminiResult;
    try {
      geminiResult = await analyzeSymptoms({ age, gender, symptoms, duration, severity, notes });
      console.log(`[AI] Gemini done — urgency: ${geminiResult.urgencyLevel} | queries: ${geminiResult.youtubeSearchQueries?.length}`);
    } catch (error) {
      console.error("========== AI ERROR ==========");
      console.error(error);
      console.error("Message:", error.message);
      console.error("Status:", error.status);
      console.error("Response:", error.response?.data);
      console.error("==============================");

      console.warn('[AI] Gemini API call failed. Falling back to simulated/mock analysis.');

      const simulatedScore = Math.min(100, Math.max(10, severity * 8 + (symptoms.length * 4)));
      const simulatedLevel = simulatedScore <= 35 ? 'low' : simulatedScore <= 75 ? 'moderate' : 'high';

      geminiResult = {
        summary: `Based on your reported symptoms (${symptoms.join(', ')}), this is a simulated analysis (fallback due to AI service connection issue).`,
        healthRiskScore: simulatedScore,
        healthRiskLevel: simulatedLevel,
        possibleConditions: [
          { name: "Common Cold / Viral infection", likelihood: "high", explanation: "Viral infections of the upper respiratory tract commonly cause these mild symptoms." },
          { name: "Allergic Rhinitis", likelihood: "medium", explanation: "Allergies can cause persistent nasal congestion, sneezing, and sore throat." }
        ],
        homeCare: [
          "Stay hydrated by drinking plenty of water, herbal teas, or warm broths.",
          "Get plenty of rest to allow your immune system to recover.",
          "Consider over-the-counter throat lozenges or saline nasal sprays for symptom relief."
        ],
        doctorRecommendation: "If your symptoms persist for more than 7-10 days, or if they worsen over time, consult a healthcare professional for an evaluation.",
        emergencyWarning: "Seek immediate medical attention if you experience severe shortness of breath, chest pain, high fever that doesn't go down, or difficulty swallowing.",
        urgencyLevel: "routine",
        disclaimer: "FALLBACK DEMO MODE: This is placeholder medical information due to API connection failure. It does not replace professional medical advice.",
        youtubeSearchQueries: symptoms.map(s => ({
          query: `${s} home remedies`,
          category: 'home-remedy',
          symptomFocus: s
        }))
      };
    }

    // ── Step 2: YouTube video fetch (parallel, non-blocking on error) ──
    let videos = [];
    try {
      videos = await fetchVideosForQueries(geminiResult.youtubeSearchQueries || []);
      console.log(`[YouTube] Fetched ${videos.length} videos`);
    } catch (ytErr) {
      console.warn('[YouTube] Video fetch failed (non-fatal):', ytErr.message);
    }

    // ── Step 3: Assemble final response ──────────────────────
    const fullResult = {
      summary:              geminiResult.summary,
      healthRiskScore:      geminiResult.healthRiskScore,
      healthRiskLevel:      geminiResult.healthRiskLevel,
      possibleConditions:   geminiResult.possibleConditions || [],
      possibleCauses:       geminiResult.possibleConditions || [], // Fallback
      homeCare:             geminiResult.homeCare || [],
      homeCareTips:         geminiResult.homeCare || [], // Fallback
      doctorRecommendation: geminiResult.doctorRecommendation || '',
      whenToSeeDoctor:      geminiResult.doctorRecommendation || '', // Fallback
      emergencyWarning:     geminiResult.emergencyWarning || null,
      emergencyWarnings:    geminiResult.emergencyWarning || null, // Fallback
      urgencyLevel:         geminiResult.urgencyLevel || 'routine',
      disclaimer:           geminiResult.disclaimer || 'This is not a medical diagnosis.',
      recommendedVideos:    videos,
      videos:               videos, // Fallback
    };

    // ── Step 4: Save to MongoDB ───────────────────────────────
    if (formId) {
      await PatientForm.findByIdAndUpdate(
        formId,
        { $set: { aiAnalysis: fullResult } },
        { new: true }
      ).catch(err => console.warn('[DB] Failed to save AI result:', err.message));
    }

    return res.status(200).json(fullResult);

  } catch (error) {
    console.error("========== CONTROLLER ERROR ==========");
    console.error(error);
    console.error("======================================");
    return res.status(500).json({ message: 'Internal server error during symptom analysis.' });
  }
};

const { searchVideos } = require('./youtube.service');

const searchEducationalVideos = async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) {
      return res.status(400).json({ message: 'Query parameter is required' });
    }
    const videos = await searchVideos(query, 6);
    return res.json({ data: videos });
  } catch (error) {
    console.error('[searchEducationalVideos] error:', error);
    return res.status(500).json({ message: 'Failed to search educational videos' });
  }
};

module.exports = { analyzePatientSymptoms, searchEducationalVideos };
