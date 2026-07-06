const YogaSession = require('./yoga.model');
const MeditationSession = require('./meditation.model');
const { WorkoutHistory, RunningHistory, CyclingHistory } = require('./history.model');
const { HealthLog, ChallengeLog, FitnessReminder, FitnessBookmark, Achievement } = require('./tracker.model');
const PatientForm = require('../patient/patient.model');
const geminiService = require('../ai/gemini.service');

// Helper: check and unlock badge
const checkBadge = async (userId, badgeKey) => {
  const existing = await Achievement.findOne({ userId, badgeKey });
  if (!existing) {
    await Achievement.create({ userId, badgeKey });
    return true; // Newly unlocked
  }
  return false;
};

// 1. Get Yoga Library
exports.getYogaSessions = async (req, res) => {
  try {
    const { category } = req.query;
    const filter = category ? { category } : {};
    const sessions = await YogaSession.find(filter);
    res.json({ count: sessions.length, data: sessions });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 2. Get Meditation Library
exports.getMeditationSessions = async (req, res) => {
  try {
    const { category } = req.query;
    const filter = category ? { category } : {};
    const sessions = await MeditationSession.find(filter);
    res.json({ count: sessions.length, data: sessions });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 3. Get Overview Stats
exports.getFitnessStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const todayStr = new Date().toISOString().split('T')[0];

    // Query histories
    const workouts = await WorkoutHistory.find({ userId });
    const runs = await RunningHistory.find({ userId });
    const cycles = await CyclingHistory.find({ userId });

    // Calculate totals
    let totalWorkoutMins = 0;
    let totalCalories = 0;
    let yogaSessionsCount = 0;
    let totalMeditationTime = 0;

    workouts.forEach(w => {
      if (w.workoutType === 'Yoga') {
        yogaSessionsCount++;
        totalWorkoutMins += w.duration;
      } else if (w.workoutType === 'Meditation') {
        totalMeditationTime += w.duration;
      } else {
        totalWorkoutMins += w.duration;
      }
      totalCalories += w.caloriesBurned;
    });

    let totalRunDistance = 0;
    let totalRunMins = 0;
    runs.forEach(r => {
      totalRunDistance += r.distance;
      totalRunMins += r.duration;
      totalCalories += r.caloriesBurned;
    });

    let totalCycleDistance = 0;
    let totalCycleMins = 0;
    cycles.forEach(c => {
      totalCycleDistance += c.distance;
      totalCycleMins += c.duration;
      totalCalories += c.caloriesBurned;
    });

    // Find health logs for today
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const latestHealthLog = await HealthLog.findOne({ userId }).sort({ date: -1 });
    const todayHealthLog = await HealthLog.findOne({ userId, date: { $gte: startOfToday } });

    // Calculate streak based on workout dates
    const activityDates = new Set();
    workouts.forEach(w => activityDates.add(w.date.toISOString().split('T')[0]));
    runs.forEach(r => activityDates.add(r.date.toISOString().split('T')[0]));
    cycles.forEach(c => activityDates.add(c.date.toISOString().split('T')[0]));

    const sortedDates = Array.from(activityDates).sort();
    let workoutStreak = 0;
    let yogaStreak = 0;
    let meditationStreak = 0;

    // Workouts specific streak
    const yogaDates = new Set(workouts.filter(w => w.workoutType === 'Yoga').map(w => w.date.toISOString().split('T')[0]));
    const medDates = new Set(workouts.filter(w => w.workoutType === 'Meditation').map(w => w.date.toISOString().split('T')[0]));

    const getStreak = (dateStrings) => {
      if (dateStrings.length === 0) return 0;
      const sorted = Array.from(dateStrings).sort();
      let streak = 0;
      let currentStreak = 0;
      let prevDate = null;

      for (const dStr of sorted) {
        const d = new Date(dStr);
        if (!prevDate) {
          currentStreak = 1;
        } else {
          const diffTime = Math.abs(d - prevDate);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          if (diffDays === 1) {
            currentStreak++;
          } else if (diffDays > 1) {
            currentStreak = 1;
          }
        }
        prevDate = d;
        if (currentStreak > streak) streak = currentStreak;
      }
      return streak;
    };

    workoutStreak = getStreak(sortedDates);
    yogaStreak = getStreak(Array.from(yogaDates));
    meditationStreak = getStreak(Array.from(medDates));

    // Achievements badges
    if (workoutStreak >= 7) await checkBadge(userId, 'streak_7');
    if (workoutStreak >= 30) await checkBadge(userId, 'streak_30');
    if (totalRunDistance >= 100) await checkBadge(userId, 'run_100');
    if (totalCycleDistance >= 50) await checkBadge(userId, 'cycle_50');
    if (yogaSessionsCount >= 100) await checkBadge(userId, 'yoga_100');
    if (totalMeditationTime >= 100) await checkBadge(userId, 'meditation_100');

    res.json({
      data: {
        dailyActivity: {
          water: todayHealthLog ? todayHealthLog.waterIntake : 0,
          sleep: todayHealthLog ? todayHealthLog.sleepHours : 0,
          weight: latestHealthLog ? latestHealthLog.weight : null,
          bmi: latestHealthLog ? latestHealthLog.bmi : null,
          bpSystolic: latestHealthLog ? latestHealthLog.bloodPressureSystolic : null,
          bpDiastolic: latestHealthLog ? latestHealthLog.bloodPressureDiastolic : null,
          sugar: latestHealthLog ? latestHealthLog.bloodSugar : null,
          heartRate: latestHealthLog ? latestHealthLog.heartRate : null
        },
        caloriesBurned: Math.round(totalCalories),
        workoutMinutes: totalWorkoutMins,
        yogaSessions: yogaSessionsCount,
        meditationTime: totalMeditationTime,
        runningDistance: Math.round(totalRunDistance * 10) / 10,
        cyclingDistance: Math.round(totalCycleDistance * 10) / 10,
        workoutStreak,
        yogaStreak,
        meditationStreak
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 4. Log workout / yoga / stretching
exports.logWorkout = async (req, res) => {
  try {
    const userId = req.user.id;
    const { workoutType, exerciseName, duration, caloriesBurned, targetMuscles } = req.body;

    const log = await WorkoutHistory.create({
      userId,
      workoutType,
      exerciseName,
      duration: Number(duration),
      caloriesBurned: Number(caloriesBurned),
      targetMuscles: targetMuscles || []
    });

    // Check achievement
    const newlyUnlocked = await checkBadge(userId, 'first_workout');

    res.status(201).json({
      message: 'Workout logged successfully.',
      data: log,
      newBadgeUnlocked: newlyUnlocked
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// 5. Log running
exports.logRunning = async (req, res) => {
  try {
    const userId = req.user.id;
    const { distance, duration, caloriesBurned, speed, planName } = req.body;

    const log = await RunningHistory.create({
      userId,
      distance: Number(distance),
      duration: Number(duration),
      caloriesBurned: Number(caloriesBurned),
      speed: Number(speed),
      planName: planName || 'Free Run'
    });

    // Verify badges
    const totalRuns = await RunningHistory.find({ userId });
    const totalDist = totalRuns.reduce((sum, r) => sum + r.distance, 0);
    let newBadge = false;
    if (totalDist >= 100) {
      newBadge = await checkBadge(userId, 'run_100');
    }

    res.status(201).json({
      message: 'Run logged successfully.',
      data: log,
      newBadgeUnlocked: newBadge
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// 6. Log cycling
exports.logCycling = async (req, res) => {
  try {
    const userId = req.user.id;
    const { distance, duration, caloriesBurned, speed, cyclingType } = req.body;

    const log = await CyclingHistory.create({
      userId,
      distance: Number(distance),
      duration: Number(duration),
      caloriesBurned: Number(caloriesBurned),
      speed: Number(speed),
      cyclingType
    });

    // Verify badges
    const totalCycles = await CyclingHistory.find({ userId });
    const totalDist = totalCycles.reduce((sum, c) => sum + c.distance, 0);
    let newBadge = false;
    if (totalDist >= 50) {
      newBadge = await checkBadge(userId, 'cycle_50');
    }

    res.status(201).json({
      message: 'Cycling ride logged successfully.',
      data: log,
      newBadgeUnlocked: newBadge
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// 7. Get user exercise histories
exports.getHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const workouts = await WorkoutHistory.find({ userId }).sort({ date: -1 }).limit(10);
    const runs = await RunningHistory.find({ userId }).sort({ date: -1 }).limit(10);
    const cycles = await CyclingHistory.find({ userId }).sort({ date: -1 }).limit(10);

    res.json({
      data: { workouts, runs, cycles }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 8. Log Health Log / update parameter
exports.logHealthParam = async (req, res) => {
  try {
    const userId = req.user.id;
    const { weight, waterIntake, sleepHours, caloriesBurned, heartRate, bpSystolic, bpDiastolic, sugar } = req.body;

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    let log = await HealthLog.findOne({ userId, date: { $gte: startOfToday } });
    if (!log) {
      log = new HealthLog({ userId, date: new Date() });
    }

    if (weight !== undefined) {
      log.weight = Number(weight);
      // Compute BMI automatically if height exists (we can check default height 170cm if not available)
      log.bmi = Math.round((Number(weight) / Math.pow(1.7, 2)) * 10) / 10;
    }
    if (waterIntake !== undefined) log.waterIntake = Math.max(0, log.waterIntake + Number(waterIntake)); // aggregate incremental water clicks
    if (sleepHours !== undefined) log.sleepHours = Number(sleepHours);
    if (caloriesBurned !== undefined) log.caloriesBurned += Number(caloriesBurned);
    if (heartRate !== undefined) log.heartRate = Number(heartRate);
    if (bpSystolic !== undefined) log.bloodPressureSystolic = Number(bpSystolic);
    if (bpDiastolic !== undefined) log.bloodPressureDiastolic = Number(bpDiastolic);
    if (sugar !== undefined) log.bloodSugar = Number(sugar);

    await log.save();
    res.json({ message: 'Health parameters logged successfully.', data: log });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// 9. Get health tracker logs for weekly progress charts
exports.getHealthLogs = async (req, res) => {
  try {
    const userId = req.user.id;
    const logs = await HealthLog.find({ userId }).sort({ date: -1 }).limit(14);
    res.json({ data: logs.reverse() });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 10. Reminders get & save
exports.getReminders = async (req, res) => {
  try {
    const userId = req.user.id;
    let reminder = await FitnessReminder.findOne({ userId });
    if (!reminder) {
      reminder = await FitnessReminder.create({ userId });
    }
    res.json({ data: reminder });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.saveReminders = async (req, res) => {
  try {
    const userId = req.user.id;
    const { workoutTime, yogaTime, meditationTime, waterInterval, sleepTime, medicineTime } = req.body;

    let reminder = await FitnessReminder.findOne({ userId });
    if (!reminder) {
      reminder = new FitnessReminder({ userId });
    }

    reminder.workoutTime = workoutTime;
    reminder.yogaTime = yogaTime;
    reminder.meditationTime = meditationTime;
    reminder.waterInterval = waterInterval ? Number(waterInterval) : undefined;
    reminder.sleepTime = sleepTime;
    reminder.medicineTime = medicineTime;

    await reminder.save();
    res.json({ message: 'Reminders saved successfully.', data: reminder });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// 11. Bookmarks toggle & get
exports.getBookmarks = async (req, res) => {
  try {
    const userId = req.user.id;
    const bookmarks = await FitnessBookmark.find({ userId });
    res.json({ count: bookmarks.length, data: bookmarks });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.toggleBookmark = async (req, res) => {
  try {
    const userId = req.user.id;
    const { itemId, itemType, title, category, duration } = req.body;

    const existing = await FitnessBookmark.findOne({ userId, itemId, itemType });
    if (existing) {
      await FitnessBookmark.deleteOne({ _id: existing._id });
      res.json({ bookmarked: false, message: 'Removed from bookmarks.' });
    } else {
      const book = await FitnessBookmark.create({
        userId,
        itemId,
        itemType,
        title,
        category,
        duration: duration ? Number(duration) : undefined
      });
      res.status(201).json({ bookmarked: true, message: 'Saved to bookmarks.', data: book });
    }
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// 12. Daily Challenges
exports.getChallenges = async (req, res) => {
  try {
    const userId = req.user.id;
    const todayStr = new Date().toISOString().split('T')[0];

    let log = await ChallengeLog.findOne({ userId, date: todayStr });
    if (!log) {
      log = await ChallengeLog.create({ userId, date: todayStr, challenges: [] });
    }
    res.json({ data: log.challenges });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.toggleChallenge = async (req, res) => {
  try {
    const userId = req.user.id;
    const { challengeKey } = req.body; // e.g. "water", "steps", "meditate", "run", "cycle", "stretch", "sleep", "workout"
    const todayStr = new Date().toISOString().split('T')[0];

    let log = await ChallengeLog.findOne({ userId, date: todayStr });
    if (!log) {
      log = new ChallengeLog({ userId, date: todayStr, challenges: [] });
    }

    const idx = log.challenges.indexOf(challengeKey);
    if (idx > -1) {
      log.challenges.splice(idx, 1);
    } else {
      log.challenges.push(challengeKey);
    }

    await log.save();
    res.json({ message: 'Challenge progress updated.', data: log.challenges });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// 13. Get Achievements
exports.getAchievements = async (req, res) => {
  try {
    const userId = req.user.id;
    const achievements = await Achievement.find({ userId });
    res.json({ count: achievements.length, data: achievements.map(a => a.badgeKey) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 14. AI recommended Fitness & Wellness Plan
exports.getAiWellnessPlan = async (req, res) => {
  try {
    const userId = req.user.id;

    // Gather context parameters
    const latestForm = await PatientForm.findOne({ userId }).sort({ createdAt: -1 });
    const latestHealthLog = await HealthLog.findOne({ userId }).sort({ date: -1 });

    const wellnessData = {
      age: latestForm ? latestForm.age : 30,
      gender: latestForm ? latestForm.gender : 'Male',
      symptoms: latestForm ? latestForm.symptoms : [],
      weight: latestHealthLog ? latestHealthLog.weight : null,
      bmi: latestHealthLog ? latestHealthLog.bmi : null,
      heartRate: latestHealthLog ? latestHealthLog.heartRate : null,
      bloodPressure: latestHealthLog && latestHealthLog.bloodPressureSystolic ? `${latestHealthLog.bloodPressureSystolic}/${latestHealthLog.bloodPressureDiastolic}` : null,
      lifestyle: latestForm ? latestForm.notes : 'Moderate activity'
    };

    const aiPlan = await geminiService.generateFitnessPlan(wellnessData);
    res.json({ data: aiPlan });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
