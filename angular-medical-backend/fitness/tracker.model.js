const mongoose = require('mongoose');

const HealthLogSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  weight: { type: Number },
  bmi: { type: Number },
  waterIntake: { type: Number, default: 0 }, // ml
  sleepHours: { type: Number, default: 0 },
  caloriesBurned: { type: Number, default: 0 },
  heartRate: { type: Number },
  bloodPressureSystolic: { type: Number },
  bloodPressureDiastolic: { type: Number },
  bloodSugar: { type: Number },
  date: { type: Date, default: Date.now }
}, { timestamps: true });

const ChallengeLogSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  challenges: [{ type: String }], // Array of keys, e.g. ["water", "steps", "meditate"]
  date: { type: String, required: true } // "YYYY-MM-DD"
}, { timestamps: true });

const FitnessReminderSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  workoutTime: { type: String },
  yogaTime: { type: String },
  meditationTime: { type: String },
  waterInterval: { type: Number }, // in minutes
  sleepTime: { type: String },
  medicineTime: { type: String }
}, { timestamps: true });

const FitnessBookmarkSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  itemId: { type: String, required: true },
  itemType: { type: String, required: true, enum: ['yoga', 'meditation', 'workout'] },
  title: { type: String, required: true },
  category: { type: String },
  duration: { type: Number }
}, { timestamps: true });

const AchievementSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  badgeKey: { type: String, required: true }, // "first_workout", "streak_7", "run_100", "cycle_50", "yoga_100", "meditation_100"
  earnedAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = {
  HealthLog: mongoose.model('HealthLog', HealthLogSchema),
  ChallengeLog: mongoose.model('ChallengeLog', ChallengeLogSchema),
  FitnessReminder: mongoose.model('FitnessReminder', FitnessReminderSchema),
  FitnessBookmark: mongoose.model('FitnessBookmark', FitnessBookmarkSchema),
  Achievement: mongoose.model('Achievement', AchievementSchema)
};
