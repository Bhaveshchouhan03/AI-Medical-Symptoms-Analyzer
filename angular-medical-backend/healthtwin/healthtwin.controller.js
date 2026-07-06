const { 
  HealthTwin, 
  HealthScore, 
  Predictions, 
  Insights, 
  Reports, 
  HealthTimeline, 
  HealthTwinAchievement 
} = require('./healthtwin.model');
const PatientForm = require('../patient/patient.model');
const { WorkoutHistory, RunningHistory, CyclingHistory } = require('../fitness/history.model');
const { HealthLog } = require('../fitness/tracker.model');
const Appointment = require('../appointment/appointment.model');
const { findById } = require('../data/users.store');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Helper to get Gemini client
const getGeminiClient = () => {
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_gemini_api_key_here') {
    return null;
  }
  return new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
};

// ==========================================
// FEATURE 1: DIGITAL HEALTH AVATAR PROFILE
// ==========================================
exports.getProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    // Try finding profile
    let profile = await HealthTwin.findOne({ userId });
    
    // Fetch base user details from storage or appointments
    let userData = findById(userId);
    let name = 'User Profile';
    if (userData) {
      name = `${userData.firstName} ${userData.lastName}`;
    }

    // Gather metrics from patient form & health log
    const latestForm = await PatientForm.findOne({ userId }).sort({ createdAt: -1 });
    const latestHealth = await HealthLog.findOne({ userId }).sort({ date: -1 });

    const age = latestForm ? latestForm.age : 28;
    const gender = latestForm ? latestForm.gender : 'male';
    const bmi = latestHealth && latestHealth.bmi ? latestHealth.bmi : 22.4;
    const weight = latestHealth && latestHealth.weight ? latestHealth.weight : 70;

    // Calculate score
    const healthScoreObj = await calculateScoreHelper(userId);

    if (!profile) {
      profile = await HealthTwin.create({
        userId,
        name,
        age,
        gender,
        bmi,
        healthScore: healthScoreObj.score,
        mood: 'Energetic',
        status: 'Optimal',
        activityLevel: 'Moderate',
        profilePhoto: '',
        avatarCustomization: {
          theme: 'digital-pulse',
          color: 'cyan',
          glow: true
        }
      });
    } else {
      // Sync score, age, gender, bmi
      profile.healthScore = healthScoreObj.score;
      profile.age = age;
      profile.gender = gender;
      profile.bmi = bmi;
      profile.name = name;
      
      // Determine overall status based on score
      if (profile.healthScore >= 85) profile.status = 'Optimal';
      else if (profile.healthScore >= 70) profile.status = 'Balanced';
      else if (profile.healthScore >= 55) profile.status = 'Vigilant';
      else if (profile.healthScore >= 35) profile.status = 'Needs Rest';
      else profile.status = 'Critical';

      await profile.save();
    }

    res.json({ status: 'success', data: profile, weight });
  } catch (err) {
    console.error('getProfile error:', err);
    res.status(500).json({ message: err.message });
  }
};

exports.updateAvatar = async (req, res) => {
  try {
    const userId = req.user.id;
    const { theme, color, glow, mood, activityLevel, profilePhoto } = req.body;

    let profile = await HealthTwin.findOne({ userId });
    if (!profile) {
      return res.status(404).json({ message: 'Health Twin profile not found.' });
    }

    if (theme !== undefined) profile.avatarCustomization.theme = theme;
    if (color !== undefined) profile.avatarCustomization.color = color;
    if (glow !== undefined) profile.avatarCustomization.glow = glow;
    if (mood !== undefined) profile.mood = mood;
    if (activityLevel !== undefined) profile.activityLevel = activityLevel;
    if (profilePhoto !== undefined) profile.profilePhoto = profilePhoto;

    await profile.save();
    res.json({ status: 'success', message: 'Avatar updated successfully', data: profile });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ==========================================
// FEATURE 2: OVERALL HEALTH SCORE
// ==========================================
const calculateScoreHelper = async (userId) => {
  let score = 100;
  
  // 1. BMI deductions
  const latestHealth = await HealthLog.findOne({ userId }).sort({ date: -1 });
  let bmi = 22.4;
  if (latestHealth && latestHealth.bmi) {
    bmi = latestHealth.bmi;
    if (bmi < 18.5 || bmi >= 25) score -= 8;
    if (bmi >= 30) score -= 12; // Extra deduction for obesity
  }

  // 2. Sleep analysis (average last 7 logs)
  const healthLogs = await HealthLog.find({ userId }).sort({ date: -1 }).limit(7);
  let avgSleep = 7.5;
  let avgWater = 2000;
  if (healthLogs.length > 0) {
    const totalSleep = healthLogs.reduce((sum, l) => sum + (l.sleepHours || 0), 0);
    avgSleep = totalSleep / healthLogs.length;

    const totalWater = healthLogs.reduce((sum, l) => sum + (l.waterIntake || 0), 0);
    avgWater = totalWater / healthLogs.length;
  }

  if (avgSleep < 6) score -= 15;
  else if (avgSleep < 7) score -= 8;
  else if (avgSleep >= 7.5 && avgSleep <= 9) score += 5; // Reward good sleep

  // 3. Water analysis
  if (avgWater < 1200) score -= 12;
  else if (avgWater < 1800) score -= 6;
  else if (avgWater >= 2500) score += 5;

  // 4. Workout metrics (count activities in last 7 days)
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const workouts = await WorkoutHistory.find({ userId, date: { $gte: oneWeekAgo } });
  const runs = await RunningHistory.find({ userId, date: { $gte: oneWeekAgo } });
  const cycles = await CyclingHistory.find({ userId, date: { $gte: oneWeekAgo } });

  let activityPoints = 0;
  activityPoints += workouts.length * 3; // +3 for general workouts
  
  // Check runs and cycles
  runs.forEach(r => { activityPoints += Math.round(r.distance * 1.5); });
  cycles.forEach(c => { activityPoints += Math.round(c.distance * 0.5); });

  score += Math.min(25, activityPoints); // Cap positive activity points at +25

  // 5. Symptoms penalty
  const latestForm = await PatientForm.findOne({ userId }).sort({ createdAt: -1 });
  if (latestForm && latestForm.status !== 'resolved') {
    const penalty = latestForm.severity * 2.5;
    score -= penalty;
  }

  // 6. Appointments status check
  const upcomingAppointments = await Appointment.find({
    patientId: userId,
    status: { $in: ['Pending', 'Accepted'] },
    appointmentDate: { $gte: new Date().toISOString().split('T')[0] }
  });
  // Active appointment booking rewards slightly or prevents deductions
  if (latestForm && latestForm.severity > 5 && upcomingAppointments.length === 0) {
    score -= 10; // Penalize not booking a doctor when symptoms are high
  }

  // Ensure score constraints
  score = Math.max(10, Math.min(100, Math.round(score)));

  let category = 'Good';
  if (score >= 85) category = 'Excellent';
  else if (score >= 70) category = 'Good';
  else if (score >= 50) category = 'Average';
  else if (score >= 35) category = 'Needs Improvement';
  else category = 'Critical';

  return {
    score,
    category,
    breakdown: {
      symptoms: latestForm ? Math.max(0, 10 - latestForm.severity) * 10 : 100,
      bmi: bmi >= 18.5 && bmi < 25 ? 100 : bmi >= 30 ? 50 : 80,
      sleep: avgSleep >= 7 ? 100 : avgSleep >= 6 ? 70 : 40,
      water: avgWater >= 2200 ? 100 : avgWater >= 1500 ? 75 : 40,
      activity: Math.min(100, Math.round((activityPoints / 25) * 100)),
      appointments: latestForm && latestForm.severity > 5 && upcomingAppointments.length === 0 ? 50 : 100
    }
  };
};

exports.getHealthScore = async (req, res) => {
  try {
    const userId = req.user.id;
    const scoreDetails = await calculateScoreHelper(userId);

    // Save history log of score
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    let existingLog = await HealthScore.findOne({ userId, date: { $gte: todayStart } });
    if (!existingLog) {
      await HealthScore.create({
        userId,
        score: scoreDetails.score,
        category: scoreDetails.category,
        breakdown: scoreDetails.breakdown,
        date: new Date()
      });
    } else {
      existingLog.score = scoreDetails.score;
      existingLog.category = scoreDetails.category;
      existingLog.breakdown = scoreDetails.breakdown;
      await existingLog.save();
    }

    // Get historical health scores (last 10 entries)
    const history = await HealthScore.find({ userId }).sort({ date: -1 }).limit(10);

    res.json({
      status: 'success',
      data: {
        current: scoreDetails,
        history: history.reverse()
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ==========================================
// FEATURE 3: HEALTH TIMELINE
// ==========================================
exports.getTimeline = async (req, res) => {
  try {
    const userId = req.user.id;
    const timelineItems = [];

    // 1. Doctor appointments
    const appointments = await Appointment.find({ patientId: userId }).sort({ createdAt: -1 }).limit(15);
    appointments.forEach(app => {
      timelineItems.push({
        userId,
        eventType: 'appointment',
        title: `Appointment with ${app.doctorName}`,
        description: `Specialty: ${app.doctorSpecialization} | Reason: ${app.reasonForVisit}`,
        value: app.status,
        date: new Date(`${app.appointmentDate}T${convertTime12to24(app.appointmentTime)}`)
      });
    });

    // 2. Symptom submissions
    const forms = await PatientForm.find({ userId }).sort({ createdAt: -1 }).limit(15);
    forms.forEach(f => {
      timelineItems.push({
        userId,
        eventType: 'symptom',
        title: `Logged Symptoms: ${f.symptoms && Array.isArray(f.symptoms) ? f.symptoms.join(', ') : 'None'}`,
        description: `Severity: ${f.severity}/10 | Notes: ${f.notes || 'None'}`,
        value: `Severity ${f.severity}`,
        date: f.createdAt
      });
    });

    // 3. Fitness Workouts
    const workouts = await WorkoutHistory.find({ userId }).sort({ date: -1 }).limit(15);
    workouts.forEach(w => {
      timelineItems.push({
        userId,
        eventType: 'workout',
        title: `Logged Workout: ${w.workoutType}`,
        description: `Exercise: ${w.exerciseName || 'General Routine'} | Targets: ${(w.targetMuscles || []).join(', ') || 'Full Body'}`,
        value: `${w.duration} mins | ${w.caloriesBurned} kcal`,
        date: w.date
      });
    });

    // 4. Runs
    const runs = await RunningHistory.find({ userId }).sort({ date: -1 }).limit(15);
    runs.forEach(r => {
      timelineItems.push({
        userId,
        eventType: 'running',
        title: `Running Session`,
        description: `Plan: ${r.planName} | Speed: ${r.speed} km/h`,
        value: `${r.distance} km | ${r.duration} mins`,
        date: r.date
      });
    });

    // 5. Cycles
    const cycles = await CyclingHistory.find({ userId }).sort({ date: -1 }).limit(15);
    cycles.forEach(c => {
      timelineItems.push({
        userId,
        eventType: 'cycling',
        title: `Cycling Ride`,
        description: `Type: ${c.cyclingType} | Speed: ${c.speed} km/h`,
        value: `${c.distance} km | ${c.duration} mins`,
        date: c.date
      });
    });

    // 6. Health logs for sleep and water
    const logs = await HealthLog.find({ userId }).sort({ date: -1 }).limit(15);
    logs.forEach(l => {
      if (l.sleepHours > 0) {
        timelineItems.push({
          userId,
          eventType: 'sleep',
          title: `Logged Sleep`,
          description: `Total overnight rest duration`,
          value: `${l.sleepHours} hrs`,
          date: l.date
        });
      }
      if (l.waterIntake > 0) {
        timelineItems.push({
          userId,
          eventType: 'water',
          title: `Hydration Intake`,
          description: `Logged daily water consumption`,
          value: `${l.waterIntake} ml`,
          date: l.date
        });
      }
      if (l.weight > 0) {
        timelineItems.push({
          userId,
          eventType: 'weight',
          title: `Weight Logged`,
          description: `Weight checkpoint`,
          value: `${l.weight} kg (BMI: ${l.bmi || 'N/A'})`,
          date: l.date
        });
      }
    });

    // Sort timeline: newest first
    timelineItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Slice to top 25 items
    const result = timelineItems.slice(0, 25);
    res.json({ status: 'success', data: result });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Helper: Converts 12h time (09:00 AM) to 24h format (09:00)
function convertTime12to24(time12h) {
  const [time, modifier] = time12h.split(' ');
  let [hours, minutes] = time.split(':');
  if (hours === '12') hours = '00';
  if (modifier === 'PM') hours = parseInt(hours, 10) + 12;
  return `${hours}:${minutes}:00`;
}

// ==========================================
// FEATURE 4: FUTURE HEALTH PREDICTIONS (GEMINI AI)
// ==========================================
exports.getPredictions = async (req, res) => {
  try {
    const userId = req.user.id;
    const gemini = getGeminiClient();

    // Check if we already have recent predictions (less than 24 hours old)
    const yesterday = new Date();
    yesterday.setHours(yesterday.getHours() - 24);
    const existing = await Predictions.findOne({ userId, createdAt: { $gte: yesterday } });
    if (existing) {
      return res.json({ status: 'success', data: existing, source: 'cache' });
    }

    // Retrieve stats
    const latestHealth = await HealthLog.findOne({ userId }).sort({ date: -1 });
    const latestForm = await PatientForm.findOne({ userId }).sort({ createdAt: -1 });
    const weeklyLogs = await HealthLog.find({ userId }).sort({ date: -1 }).limit(7);

    // Compute averages
    const avgSleep = weeklyLogs.length > 0 ? (weeklyLogs.reduce((sum, l) => sum + (l.sleepHours || 0), 0) / weeklyLogs.length) : 7.0;
    const avgWater = weeklyLogs.length > 0 ? (weeklyLogs.reduce((sum, l) => sum + (l.waterIntake || 0), 0) / weeklyLogs.length) : 2000;

    // Default parameters for AI Context - made extremely robust against missing/invalid values
    const gender = (latestForm && latestForm.gender) ? latestForm.gender : 'male';
    const age = (latestForm && typeof latestForm.age === 'number' && !isNaN(latestForm.age)) ? latestForm.age : 28;
    const weight = (latestHealth && typeof latestHealth.weight === 'number' && !isNaN(latestHealth.weight)) ? latestHealth.weight : 70;
    const bmi = (latestHealth && typeof latestHealth.bmi === 'number' && !isNaN(latestHealth.bmi)) ? latestHealth.bmi : 22.4;
    const symptoms = (latestForm && latestForm.symptoms && Array.isArray(latestForm.symptoms)) ? latestForm.symptoms.join(', ') : 'None';
    const severity = (latestForm && typeof latestForm.severity === 'number' && !isNaN(latestForm.severity)) ? latestForm.severity : 0;

    let aiResponseText = '';
    if (gemini) {
      try {
        const model = gemini.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const prompt = `You are a medical predictive intelligence agent. Based on the client's current health log, formulate a wellness prediction forecast for the next 30 days.

CLIENT METRICS:
- Age: ${age}
- Gender: ${gender}
- Weight: ${weight} kg
- BMI: ${bmi}
- Avg Sleep: ${avgSleep.toFixed(1)} hrs/day
- Avg Water: ${avgWater.toFixed(0)} ml/day
- Symptoms: ${symptoms} (Severity: ${severity}/10)

INSTRUCTIONS:
1. weightTrend — Write a 1-sentence prediction for weight over the next 30 days (e.g. "Consistent workouts may reduce your weight by 1.8 kg in 30 days.")
2. sleepQuality — Write a 1-sentence sleep forecast.
3. stressLevel — Write a 1-sentence stress trend prediction.
4. bmiTrend — Provide an array of 5 projected numbers representing weekly checkpoints for BMI over the next month.
5. fitnessScoreTrend — Provide an array of 5 projected numbers (0-100) representing fitness progression over the next month.
6. hydrationPrediction — Write a 1-sentence hydration recommendation/trend.
7. weeklyForecast — A short summary of what to expect next week.
8. monthlyForecast — A short summary of wellness outlook in 30 days.

Respond ONLY in this exact JSON structure (no markdown, no code fences):
{
  "weightTrend": "Prediction string",
  "sleepQuality": "Prediction string",
  "stressLevel": "Prediction string",
  "bmiTrend": [22.4, 22.2, 22.1, 22.0, 21.8],
  "fitnessScoreTrend": [70, 72, 75, 78, 82],
  "hydrationPrediction": "Prediction string",
  "weeklyForecast": "Weekly summary",
  "monthlyForecast": "Monthly summary"
}`;
        const result = await model.generateContent(prompt);
        aiResponseText = result.response.text().trim();
      } catch (err) {
        console.error('Gemini call failed, using programmatic prediction fallback:', err.message);
      }
    }

    let parsedPrediction = null;
    if (aiResponseText) {
      try {
        const cleaned = aiResponseText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
        const parsed = JSON.parse(cleaned);

        // Ensure all required fields exist and are well-formed arrays/strings to prevent DB schema conflicts
        const requiredKeys = ['weightTrend', 'sleepQuality', 'stressLevel', 'bmiTrend', 'fitnessScoreTrend', 'hydrationPrediction', 'weeklyForecast', 'monthlyForecast'];
        const hasAllKeys = requiredKeys.every(k => parsed && parsed[k] !== undefined);
        const isBmiArray = parsed && Array.isArray(parsed.bmiTrend) && parsed.bmiTrend.length === 5 && parsed.bmiTrend.every(v => typeof v === 'number' && !isNaN(v));
        const isFitnessArray = parsed && Array.isArray(parsed.fitnessScoreTrend) && parsed.fitnessScoreTrend.length === 5 && parsed.fitnessScoreTrend.every(v => typeof v === 'number' && !isNaN(v));

        if (hasAllKeys && isBmiArray && isFitnessArray) {
          parsedPrediction = parsed;
        } else {
          console.warn('Gemini predictions format invalid, falling back to programmatic predictions.');
        }
      } catch (jsonErr) {
        console.error('Failed to parse Gemini output:', jsonErr);
      }
    }

    // Programmatic Fallback if Gemini failed or was offline or returned malformed output
    if (!parsedPrediction) {
      const targetWeightReduction = severity > 0 ? 0.5 : 1.5;
      const predictedBmis = [bmi];
      for (let i = 1; i <= 4; i++) {
        predictedBmis.push(Math.round((bmi - (i * 0.15)) * 10) / 10);
      }

      const baseFitScore = latestHealth && latestHealth.caloriesBurned > 300 ? 75 : 65;
      const fitnessTrend = [baseFitScore, baseFitScore + 2, baseFitScore + 5, baseFitScore + 8, baseFitScore + 11];

      parsedPrediction = {
        weightTrend: `Based on your metrics, maintaining active status will likely reduce weight by ${targetWeightReduction} kg over the next 30 days.`,
        sleepQuality: avgSleep < 7 ? `Gradually increasing rest duration to 7.5 hours will improve sleep latency by 20%.` : `Consistent sleeping patterns will stabilize deep sleep recovery.`,
        stressLevel: symptoms !== 'None' ? `Mitigating core symptoms will alleviate stress levels by 15% next month.` : `Integrating yoga and breathing will keep cortisol levels low.`,
        bmiTrend: predictedBmis,
        fitnessScoreTrend: fitnessTrend,
        hydrationPrediction: avgWater < 2000 ? `Aim for 2.5L daily. Improved hydration will enhance cellular energy and reduce fatigue.` : `Excellent fluid intake. Maintenance supports consistent muscle stamina.`,
        weeklyForecast: `Steady improvement. Consistent hydration and sleep schedule will raise cardiovascular endurance.`,
        monthlyForecast: `Significant wellness score improvement (+12%) is expected if exercise logging remains stable.`
      };
    }

    // Save prediction
    const predictionDoc = await Predictions.create({
      userId,
      weightTrend: parsedPrediction.weightTrend,
      sleepQuality: parsedPrediction.sleepQuality,
      stressLevel: parsedPrediction.stressLevel,
      bmiTrend: parsedPrediction.bmiTrend,
      fitnessScoreTrend: parsedPrediction.fitnessScoreTrend,
      hydrationPrediction: parsedPrediction.hydrationPrediction,
      weeklyForecast: parsedPrediction.weeklyForecast,
      monthlyForecast: parsedPrediction.monthlyForecast,
      graphData: {
        labels: ['Current', 'Week 1', 'Week 2', 'Week 3', 'Week 4'],
        bmi: parsedPrediction.bmiTrend,
        fitness: parsedPrediction.fitnessScoreTrend
      }
    });

    res.json({ status: 'success', data: predictionDoc, source: 'ai' });
  } catch (err) {
    console.error('Error in getPredictions:', err);
    res.status(500).json({ message: err.message });
  }
};

// ==========================================
// FEATURE 5: RISK ANALYSIS
// ==========================================
exports.getRiskAnalysis = async (req, res) => {
  try {
    const userId = req.user.id;

    const latestHealth = await HealthLog.findOne({ userId }).sort({ date: -1 });
    const latestForm = await PatientForm.findOne({ userId }).sort({ createdAt: -1 });
    const logs = await HealthLog.find({ userId }).sort({ date: -1 }).limit(7);

    const bmi = (latestHealth && typeof latestHealth.bmi === 'number' && !isNaN(latestHealth.bmi)) ? latestHealth.bmi : 22.4;
    const avgSleep = logs.length > 0 ? (logs.reduce((sum, l) => sum + (l.sleepHours || 0), 0) / logs.length) : 7.5;
    const bpSystolic = (latestHealth && typeof latestHealth.bloodPressureSystolic === 'number' && !isNaN(latestHealth.bloodPressureSystolic)) ? latestHealth.bloodPressureSystolic : 120;
    const sugar = (latestHealth && typeof latestHealth.bloodSugar === 'number' && !isNaN(latestHealth.bloodSugar)) ? latestHealth.bloodSugar : 95;

    const risks = [];

    // 1. Obesity Risk
    if (bmi >= 30) risks.push({ name: 'Obesity Risk', level: 'High', description: 'BMI is in the obese range. Highly recommended to manage caloric intake and seek physician consult.' });
    else if (bmi >= 25) risks.push({ name: 'Obesity Risk', level: 'Moderate', description: 'BMI indicates overweight. Incremental portion reductions and active walks will reverse this trend.' });
    else risks.push({ name: 'Obesity Risk', level: 'Low', description: 'Weight is balanced and in optimal range.' });

    // 2. Stress Risk
    const stressSymptom = latestForm && Array.isArray(latestForm.symptoms) && latestForm.symptoms.some(s => s.toLowerCase().includes('stress') || s.toLowerCase().includes('anxiety') || s.toLowerCase().includes('headache'));
    if (stressSymptom && latestForm.severity >= 7) risks.push({ name: 'Stress Risk', level: 'High', description: 'Severe stress symptoms reported. Daily meditation and professional therapy is recommended.' });
    else if (stressSymptom || avgSleep < 6) risks.push({ name: 'Stress Risk', level: 'Moderate', description: 'Elevated stress levels combined with short sleep hours. Plan mindfulness breaks.' });
    else risks.push({ name: 'Stress Risk', level: 'Low', description: 'Stress triggers are minimal.' });

    // 3. Poor Sleep Risk
    if (avgSleep < 5.5) risks.push({ name: 'Poor Sleep Risk', level: 'High', description: 'Average sleep is under 5.5 hours. Severe fatigue and immunity drop risk present.' });
    else if (avgSleep < 6.8) risks.push({ name: 'Poor Sleep Risk', level: 'Moderate', description: 'Mild sleep deprivation. Establish a fixed screen-free hour before bed.' });
    else risks.push({ name: 'Poor Sleep Risk', level: 'Low', description: 'Rest cycle is healthy.' });

    // 4. High Blood Pressure Risk
    if (bpSystolic && bpSystolic >= 140) risks.push({ name: 'High Blood Pressure Risk', level: 'High', description: 'Systolic blood pressure is elevated. Consult a doctor and restrict sodium intake.' });
    else if (bpSystolic && bpSystolic >= 125) risks.push({ name: 'High Blood Pressure Risk', level: 'Moderate', description: 'Blood pressure is in pre-hypertensive state. Increase daily aerobic activity.' });
    else risks.push({ name: 'High Blood Pressure Risk', level: 'Low', description: 'Circulatory vitals are optimal.' });

    // 5. Diabetes Risk
    if (sugar && sugar >= 126) risks.push({ name: 'Diabetes Risk', level: 'High', description: 'Glucose levels indicate hyperglycemic trends. Seek physician screening and cut refined sugars.' });
    else if (sugar && sugar >= 100) risks.push({ name: 'Diabetes Risk', level: 'Moderate', description: 'Borderline fasting sugar. Transition to low glycemic index dietary carbs.' });
    else risks.push({ name: 'Diabetes Risk', level: 'Low', description: 'Blood glucose regulation is healthy.' });

    // 6. Low Fitness Risk
    const workouts = await WorkoutHistory.countDocuments({ userId, date: { $gte: new Date(Date.now() - 7 * 24 * 3600 * 1000) } });
    if (workouts === 0) risks.push({ name: 'Low Fitness Risk', level: 'High', description: 'No physical activity logged this week. Aerobic endurance and muscle tone are degrading.' });
    else if (workouts <= 2) risks.push({ name: 'Low Fitness Risk', level: 'Moderate', description: 'Sub-optimal exercise frequency. Attempt to add at least one more workout.' });
    else risks.push({ name: 'Low Fitness Risk', level: 'Low', description: 'Active metabolic state maintained.' });

    res.json({ status: 'success', data: risks });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ==========================================
// FEATURES 6, 7, 8: AI HEALTH REPORTS (DAILY, WEEKLY, MONTHLY)
// ==========================================
exports.getReports = async (req, res) => {
  try {
    const userId = req.user.id;
    const { type } = req.query; // daily, weekly, monthly
    if (!type || !['daily', 'weekly', 'monthly'].includes(type)) {
      return res.status(400).json({ message: 'Valid report type (daily, weekly, monthly) is required.' });
    }

    // Query logs
    let days = 1;
    if (type === 'weekly') days = 7;
    if (type === 'monthly') days = 30;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const logs = await HealthLog.find({ userId, date: { $gte: startDate } });
    const workouts = await WorkoutHistory.find({ userId, date: { $gte: startDate } });
    const runs = await RunningHistory.find({ userId, date: { $gte: startDate } });
    const cycles = await CyclingHistory.find({ userId, date: { $gte: startDate } });

    // Aggregates
    let totalCalories = 0;
    let workoutDuration = 0;
    let yogaCount = 0;
    let meditationTime = 0;
    let sleepTotal = 0;
    let waterTotal = 0;
    let runningDist = 0;
    let cyclingDist = 0;

    workouts.forEach(w => {
      if (w.workoutType === 'Yoga') yogaCount++;
      else if (w.workoutType === 'Meditation') meditationTime += w.duration;
      else workoutDuration += w.duration;
      totalCalories += w.caloriesBurned;
    });

    runs.forEach(r => {
      runningDist += r.distance;
      workoutDuration += r.duration;
      totalCalories += r.caloriesBurned;
    });

    cycles.forEach(c => {
      cyclingDist += c.distance;
      workoutDuration += c.duration;
      totalCalories += c.caloriesBurned;
    });

    logs.forEach(l => {
      sleepTotal += (l.sleepHours || 0);
      waterTotal += (l.waterIntake || 0);
    });

    const avgSleep = logs.length > 0 ? (sleepTotal / logs.length) : 7.0;
    const avgWater = logs.length > 0 ? (waterTotal / logs.length) : 2000;

    const scoreDetails = await calculateScoreHelper(userId);

    // Programmatic Summary/Suggestions
    let summary = '';
    let suggestions = [];
    if (type === 'daily') {
      summary = `Today your health index stands at ${scoreDetails.score}/100. Rest duration hovered around ${avgSleep.toFixed(1)} hours.`;
      suggestions = [
        avgWater < 2000 ? 'Increase water intake by 500ml today.' : 'Hydration level is optimal, keep it up!',
        avgSleep < 7 ? 'Prioritize early bedtime tonight.' : 'Good recovery window achieved.'
      ];
    } else if (type === 'weekly') {
      summary = `Weekly report summary: Active duration clocked ${workoutDuration} minutes, burning ${Math.round(totalCalories)} kcal. Average sleep cycle is ${avgSleep.toFixed(1)} hrs.`;
      suggestions = [
        runningDist < 5 ? 'Try adding a 2 km run next week.' : 'Great consistency in aerobic output.',
        yogaCount < 2 ? 'Incorporate 1 more deep stretching/yoga session to release lumbar load.' : 'Yoga sessions are helping posture.'
      ];
    } else {
      summary = `Monthly review: You logged ${workouts.length + runs.length + cycles.length} training events this month. Health Score average remains ${scoreDetails.category}.`;
      suggestions = [
        'Maintain a sleep routine with less than 30 mins variance in wake-up times.',
        'Schedule a routine physician visit if any high severity symptoms repeat.'
      ];
    }

    const reportData = {
      userId,
      type,
      healthScore: scoreDetails.score,
      summary,
      metrics: {
        caloriesBurned: Math.round(totalCalories),
        workoutMinutes: workoutDuration,
        yogaSessions: yogaCount,
        meditationMinutes: meditationTime,
        runningDistance: Math.round(runningDist * 10) / 10,
        cyclingDistance: Math.round(cyclingDist * 10) / 10,
        averageSleepHours: Math.round(avgSleep * 10) / 10,
        averageWaterIntake: Math.round(avgWater),
        waterTotal: Math.round(waterTotal),
        sleepTotal: Math.round(sleepTotal)
      },
      suggestions,
      date: new Date()
    };

    // Save report log to DB
    await Reports.create(reportData);

    res.json({ status: 'success', data: reportData });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ==========================================
// FEATURE 10: DAILY RECOMMENDATIONS
// ==========================================
exports.getRecommendations = async (req, res) => {
  try {
    const userId = req.user.id;
    const gemini = getGeminiClient();

    const latestForm = await PatientForm.findOne({ userId }).sort({ createdAt: -1 });
    const latestHealth = await HealthLog.findOne({ userId }).sort({ date: -1 });

    const symptoms = (latestForm && latestForm.symptoms && Array.isArray(latestForm.symptoms)) ? latestForm.symptoms.join(', ') : 'None';
    const bmi = (latestHealth && typeof latestHealth.bmi === 'number' && !isNaN(latestHealth.bmi)) ? latestHealth.bmi : 22.4;

    let aiRecommendationsText = '';
    if (gemini) {
      try {
        const model = gemini.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const prompt = `You are a medical health planner. Generate a customized list of daily health goals based on symptoms and BMI.
- Symptoms: ${symptoms}
- BMI: ${bmi}

Provide recommendations for:
1. workout (e.g. 20 min brisk walking)
2. yoga (e.g. child pose for back pain)
3. meditation (e.g. mindfulness breathing)
4. waterGoal (e.g. 2.8 liters)
5. healthyFood (e.g. leafy salads, high protein)
6. sleepGoal (e.g. 8 hours)
7. stressManagement (e.g. screen off 9pm)
8. walkingGoal (e.g. 6000 steps)
9. runningGoal (e.g. 2 km jog)
10. cyclingGoal (e.g. 5 km free ride)

Respond ONLY in this exact JSON structure (no markdown, no code fences):
{
  "workout": "Recommendation string",
  "yoga": "Recommendation string",
  "meditation": "Recommendation string",
  "waterGoal": "2.8 Litres",
  "healthyFood": "Recommendation string",
  "sleepGoal": "8 Hours",
  "stressManagement": "Recommendation string",
  "walkingGoal": "6000 Steps",
  "runningGoal": "2 km",
  "cyclingGoal": "5 km"
}`;
        const result = await model.generateContent(prompt);
        aiRecommendationsText = result.response.text().trim();
      } catch (err) {
        console.error('Gemini recommendations call failed:', err.message);
      }
    }

    let recommendations = null;
    if (aiRecommendationsText) {
      try {
        const cleaned = aiRecommendationsText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
        recommendations = JSON.parse(cleaned);
      } catch (e) {
        console.error('Failed to parse AI recommendations:', e);
      }
    }

    if (!recommendations) {
      // Fallback
      recommendations = {
        workout: '25 minutes of moderate home bodyweight routine.',
        yoga: bmi >= 25 ? 'Surya Namaskar (Sun Salutations) to stimulate metabolism.' : 'Cat-Cow stretch to improve spinal flex.',
        meditation: '10 minutes deep box breathing.',
        waterGoal: '2.5 Litres',
        healthyFood: 'Oatmeal, grilled chicken/tofu salad, raw nuts.',
        sleepGoal: '8 Hours',
        stressManagement: 'Take 5 minutes away from active display screens every 2 hours.',
        walkingGoal: '8000 Steps',
        runningGoal: '2.5 km slow jog',
        cyclingGoal: '6 km indoor/outdoor cycling'
      };
    }

    res.json({ status: 'success', data: recommendations });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ==========================================
// FEATURE 11: SMART ALERTS
// ==========================================
exports.getAlerts = async (req, res) => {
  try {
    const userId = req.user.id;
    const alerts = [];

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const latestHealth = await HealthLog.findOne({ userId }).sort({ date: -1 });
    const todayHealth = await HealthLog.findOne({ userId, date: { $gte: todayStart } });

    // 1. Water Goal Alert
    if (!todayHealth || todayHealth.waterIntake < 1200) {
      alerts.push({ type: 'warning', text: 'Water Intake Low: Remember to stay hydrated and drink water.', action: 'drink_water' });
    }

    // 2. Doctor appointment reminder
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const appointmentTomorrow = await Appointment.findOne({
      patientId: userId,
      status: { $in: ['Pending', 'Accepted'] },
      appointmentDate: tomorrowStr
    });
    if (appointmentTomorrow) {
      alerts.push({ type: 'info', text: `Doctor Appointment Tomorrow: Meeting ${appointmentTomorrow.doctorName} at ${appointmentTomorrow.appointmentTime}.`, action: 'appointment_alert' });
    }

    // 3. Poor Sleep Alert
    if (latestHealth && latestHealth.sleepHours > 0 && latestHealth.sleepHours < 6) {
      alerts.push({ type: 'danger', text: 'Poor Sleep Yesterday: You slept less than 6 hours. Minimize fatigue activities today.', action: 'sleep_alert' });
    }

    // 4. Workout missed alert (if no activity in last 3 days)
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const wCount = await WorkoutHistory.countDocuments({ userId, date: { $gte: threeDaysAgo } });
    const rCount = await RunningHistory.countDocuments({ userId, date: { $gte: threeDaysAgo } });
    const cCount = await CyclingHistory.countDocuments({ userId, date: { $gte: threeDaysAgo } });

    if (wCount + rCount + cCount === 0) {
      alerts.push({ type: 'warning', text: 'Workout Missed: No exercise logged in 3 days. Dedicate 15 mins to stretch today.', action: 'workout_alert' });
    }

    // 5. Active Symptoms Alert
    const latestForm = await PatientForm.findOne({ userId }).sort({ createdAt: -1 });
    if (latestForm && latestForm.status === 'pending') {
      alerts.push({ type: 'info', text: `Remember to monitor symptoms: ${latestForm.symptoms && Array.isArray(latestForm.symptoms) ? latestForm.symptoms.join(', ') : 'None'} (Severity: ${latestForm.severity}/10)`, action: 'symptom_alert' });
      if (latestForm.severity >= 7) {
        alerts.push({ type: 'danger', text: `High Stress/Severity: Core symptoms require attention. Book doctor consult.`, action: 'consult_alert' });
      }
    }

    res.json({ status: 'success', data: alerts });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ==========================================
// FEATURE 12: HEALTH COMPARISON
// ==========================================
exports.getComparison = async (req, res) => {
  try {
    const userId = req.user.id;

    // Helper: compile metrics in time range
    const getRangeData = async (daysOffsetStart, daysOffsetEnd) => {
      const start = new Date();
      start.setDate(start.getDate() - daysOffsetStart);
      const end = new Date();
      end.setDate(end.getDate() - daysOffsetEnd);

      const logs = await HealthLog.find({ userId, date: { $gte: start, $lte: end } });
      const wHistory = await WorkoutHistory.find({ userId, date: { $gte: start, $lte: end } });
      const rHistory = await RunningHistory.find({ userId, date: { $gte: start, $lte: end } });
      const cHistory = await CyclingHistory.find({ userId, date: { $gte: start, $lte: end } });

      let calories = 0;
      let sleep = 0;
      let water = 0;
      let duration = 0;

      logs.forEach(l => { sleep += (l.sleepHours || 0); water += (l.waterIntake || 0); });
      wHistory.forEach(w => { calories += w.caloriesBurned; duration += w.duration; });
      rHistory.forEach(r => { calories += r.caloriesBurned; duration += r.duration; });
      cHistory.forEach(c => { calories += c.caloriesBurned; duration += c.duration; });

      return {
        calories,
        sleep: logs.length > 0 ? (sleep / logs.length) : 0,
        water: logs.length > 0 ? (water / logs.length) : 0,
        duration
      };
    };

    // Today vs Yesterday
    const today = await getRangeData(1, 0);
    const yesterday = await getRangeData(2, 1);

    // This week vs Last week
    const thisWeek = await getRangeData(7, 0);
    const lastWeek = await getRangeData(14, 7);

    // This month vs Last month
    const thisMonth = await getRangeData(30, 0);
    const lastMonth = await getRangeData(60, 30);

    const calcPct = (current, previous) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    res.json({
      status: 'success',
      data: {
        todayVsYesterday: {
          calories: calcPct(today.calories, yesterday.calories),
          sleep: calcPct(today.sleep, yesterday.sleep),
          water: calcPct(today.water, yesterday.water),
          activeTime: calcPct(today.duration, yesterday.duration)
        },
        thisWeekVsLastWeek: {
          calories: calcPct(thisWeek.calories, lastWeek.calories),
          sleep: calcPct(thisWeek.sleep, lastWeek.sleep),
          water: calcPct(thisWeek.water, lastWeek.water),
          activeTime: calcPct(thisWeek.duration, lastWeek.duration)
        },
        thisMonthVsLastMonth: {
          calories: calcPct(thisMonth.calories, lastMonth.calories),
          sleep: calcPct(thisMonth.sleep, lastMonth.sleep),
          water: calcPct(thisMonth.water, lastMonth.water),
          activeTime: calcPct(thisMonth.duration, lastMonth.duration)
        }
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ==========================================
// FEATURE 13: ACHIEVEMENTS
// ==========================================
exports.getTwinAchievements = async (req, res) => {
  try {
    const userId = req.user.id;

    // Check conditions & auto-award badges
    const totalWorkouts = await WorkoutHistory.countDocuments({ userId });
    const runs = await RunningHistory.find({ userId });
    const runDistTotal = runs.reduce((sum, r) => sum + r.distance, 0);

    const yogaSessions = await WorkoutHistory.countDocuments({ userId, workoutType: 'Yoga' });
    const medSessions = await WorkoutHistory.countDocuments({ userId, workoutType: 'Meditation' });

    const logs = await HealthLog.find({ userId });
    
    // Check Workout Streaks (7 days, 30 days)
    const workoutDates = new Set();
    const wDocs = await WorkoutHistory.find({ userId });
    wDocs.forEach(w => workoutDates.add(w.date.toISOString().split('T')[0]));
    runs.forEach(r => workoutDates.add(r.date.toISOString().split('T')[0]));
    const cDocs = await CyclingHistory.find({ userId });
    cDocs.forEach(c => workoutDates.add(c.date.toISOString().split('T')[0]));

    const getStreakLen = (datesSet) => {
      if (datesSet.size === 0) return 0;
      const sorted = Array.from(datesSet).sort();
      let streak = 0;
      let current = 0;
      let prev = null;
      for (const dStr of sorted) {
        const currDate = new Date(dStr);
        if (!prev) current = 1;
        else {
          const diff = Math.ceil(Math.abs(currDate - prev) / (1000 * 3600 * 24));
          if (diff === 1) current++;
          else if (diff > 1) current = 1;
        }
        prev = currDate;
        if (current > streak) streak = current;
      }
      return streak;
    };
    const streak = getStreakLen(workoutDates);

    const checkAndSaveTwinBadge = async (key, title, description) => {
      const existing = await HealthTwinAchievement.findOne({ userId, badgeKey: key });
      if (!existing) {
        await HealthTwinAchievement.create({ userId, badgeKey: key, title, description });
      }
    };

    // Evaluation
    if (streak >= 7) {
      await checkAndSaveTwinBadge('workout_7', '7 Day Workout Streak', 'Exercised 7 consecutive days.');
    }
    if (streak >= 30) {
      await checkAndSaveTwinBadge('workout_30', '30 Day Workout Streak', 'Exercised 30 consecutive days.');
    }
    if (runDistTotal >= 100) {
      await checkAndSaveTwinBadge('run_100', '100 KM Runner Milestone', 'Completed 100 km running total.');
    }
    if (yogaSessions >= 100) {
      await checkAndSaveTwinBadge('yoga_100', '100 Yoga Sessions Completed', 'Completed 100 yoga sessions.');
    }
    if (medSessions >= 100) {
      await checkAndSaveTwinBadge('meditation_100', '100 Meditation Guides completed', 'Logged 100 meditation logs.');
    }

    // Averages
    if (logs.length >= 7) {
      const avgSleep = logs.reduce((sum, l) => sum + (l.sleepHours || 0), 0) / logs.length;
      const avgWater = logs.reduce((sum, l) => sum + (l.waterIntake || 0), 0) / logs.length;

      if (avgSleep >= 7.5) {
        await checkAndSaveTwinBadge('sleep_excellent', 'Excellent Rest Champion', 'Maintained average sleep of 7.5 hours or more.');
      }
      if (avgWater >= 2500) {
        await checkAndSaveTwinBadge('hydration_perfect', 'Perfect Hydration Badge', 'Average daily water log exceeds 2.5 Liters.');
      }
    }

    const earned = await HealthTwinAchievement.find({ userId }).sort({ earnedAt: -1 });
    res.json({ status: 'success', count: earned.length, data: earned });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ==========================================
// FEATURE 14: AI HEALTH INSIGHTS
// ==========================================
exports.getInsights = async (req, res) => {
  try {
    const userId = req.user.id;
    const insights = [];

    const scores = await HealthScore.find({ userId }).sort({ date: -1 }).limit(2);
    if (scores.length >= 2) {
      const diff = scores[0].score - scores[1].score;
      if (diff > 0) {
        insights.push({
          category: 'health_score',
          insightText: `Your overall health score improved by ${diff} points since your last report.`,
          improvementPercentage: diff
        });
      }
    }

    // Workouts count
    const activeWeek = await WorkoutHistory.countDocuments({ userId, date: { $gte: new Date(Date.now() - 7 * 24 * 3600 * 1000) } });
    const prevWeek = await WorkoutHistory.countDocuments({ 
      userId, 
      date: { 
        $gte: new Date(Date.now() - 14 * 24 * 3600 * 1000), 
        $lte: new Date(Date.now() - 7 * 24 * 3600 * 1000) 
      } 
    });

    if (activeWeek > prevWeek) {
      insights.push({
        category: 'consistency',
        insightText: `Workout activity frequency increased by ${activeWeek - prevWeek} sessions compared to last week.`,
        improvementPercentage: activeWeek > 0 ? Math.round(((activeWeek - prevWeek) / (prevWeek || 1)) * 100) : 0
      });
    }

    // Health logs averages
    const logsThisWeek = await HealthLog.find({ userId, date: { $gte: new Date(Date.now() - 7 * 24 * 3600 * 1000) } });
    const logsLastWeek = await HealthLog.find({ 
      userId, 
      date: { 
        $gte: new Date(Date.now() - 14 * 24 * 3600 * 1000), 
        $lte: new Date(Date.now() - 7 * 24 * 3600 * 1000) 
      } 
    });

    if (logsThisWeek.length > 0 && logsLastWeek.length > 0) {
      const sleepThisWeek = logsThisWeek.reduce((sum, l) => sum + (l.sleepHours || 0), 0) / logsThisWeek.length;
      const sleepLastWeek = logsLastWeek.reduce((sum, l) => sum + (l.sleepHours || 0), 0) / logsLastWeek.length;
      
      const waterThisWeek = logsThisWeek.reduce((sum, l) => sum + (l.waterIntake || 0), 0) / logsThisWeek.length;
      const waterLastWeek = logsLastWeek.reduce((sum, l) => sum + (l.waterIntake || 0), 0) / logsLastWeek.length;

      if (sleepThisWeek > sleepLastWeek) {
        insights.push({
          category: 'sleep',
          insightText: `Your sleep cycle consistency has improved. Average sleep hours increased to ${sleepThisWeek.toFixed(1)} hrs.`,
          improvementPercentage: Math.round(((sleepThisWeek - sleepLastWeek) / sleepLastWeek) * 100)
        });
      }

      if (waterThisWeek > waterLastWeek) {
        insights.push({
          category: 'hydration',
          insightText: `Daily average hydration levels rose to ${waterThisWeek.toFixed(0)} ml (+${Math.round(waterThisWeek - waterLastWeek)} ml).`,
          improvementPercentage: Math.round(((waterThisWeek - waterLastWeek) / waterLastWeek) * 100)
        });
      }
    }

    // Fallback defaults if list is empty
    if (insights.length === 0) {
      insights.push({
        category: 'consistency',
        insightText: 'Logging daily activities keeps your digital twin active. Submit your first workout to unlock trends.',
        improvementPercentage: 0
      });
      insights.push({
        category: 'hydration',
        insightText: 'Excellent hydration levels help cell regeneration. Drink at least 2L daily.',
        improvementPercentage: 0
      });
    }

    // Save insights to DB
    for (const item of insights) {
      await Insights.create({
        userId,
        insightText: item.insightText,
        category: item.category,
        improvementPercentage: item.improvementPercentage
      });
    }

    res.json({ status: 'success', data: insights });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
