const mongoose = require('mongoose');

const HealthTwinSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  age: { type: Number, required: true },
  gender: { type: String, required: true },
  bmi: { type: Number, default: 0 },
  healthScore: { type: Number, default: 70 },
  mood: { type: String, default: 'Energetic' }, // Energetic, Calm, Tired, Stressed, Focused, Restless
  status: { type: String, default: 'Optimal' }, // Optimal, Balanced, Vigilant, Needs Rest, Critical
  activityLevel: { type: String, default: 'Moderate' }, // Low, Moderate, High
  profilePhoto: { type: String, default: '' },
  avatarCustomization: {
    theme: { type: String, default: 'digital-pulse' }, // digital-pulse, bio-electric, cyber-neon
    color: { type: String, default: 'cyan' }, // cyan, violet, emerald, amber
    glow: { type: Boolean, default: true }
  }
}, { timestamps: true, collection: 'health_twins' });

const HealthScoreSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  score: { type: Number, required: true },
  category: { type: String, required: true }, // Excellent, Good, Average, Needs Improvement, Critical
  breakdown: {
    symptoms: { type: Number, default: 0 },
    bmi: { type: Number, default: 0 },
    sleep: { type: Number, default: 0 },
    water: { type: Number, default: 0 },
    activity: { type: Number, default: 0 },
    appointments: { type: Number, default: 0 }
  },
  date: { type: Date, default: Date.now }
}, { timestamps: true, collection: 'health_scores' });

const PredictionsSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  weightTrend: { type: String },
  sleepQuality: { type: String },
  stressLevel: { type: String },
  bmiTrend: [{ type: Number }], // Predicted values over next 30 days
  fitnessScoreTrend: [{ type: Number }], // Predicted fitness trend
  hydrationPrediction: { type: String },
  weeklyForecast: { type: String },
  monthlyForecast: { type: String },
  graphData: { type: mongoose.Schema.Types.Mixed }, // Structured chart datasets
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true, collection: 'health_predictions' });

const InsightsSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  insightText: { type: String, required: true },
  category: { type: String, required: true }, // score_change, consistency, sleep, stress, bmi, hydration
  improvementPercentage: { type: Number, default: 0 },
  date: { type: Date, default: Date.now }
}, { timestamps: true, collection: 'health_insights' });

const ReportsSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  type: { type: String, required: true, enum: ['daily', 'weekly', 'monthly'] },
  healthScore: { type: Number, required: true },
  summary: { type: String, required: true },
  metrics: { type: mongoose.Schema.Types.Mixed }, // Logged totals (water, sleep, calories, etc.)
  suggestions: [{ type: String }],
  date: { type: Date, default: Date.now }
}, { timestamps: true, collection: 'health_reports' });

const HealthTimelineSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  eventType: { type: String, required: true }, // doctor_visit, symptom, medicine, workout, running, cycling, yoga, meditation, weight, sleep, water, appointment
  title: { type: String, required: true },
  description: { type: String },
  value: { type: String },
  date: { type: Date, default: Date.now }
}, { timestamps: true, collection: 'health_timelines' });

const HealthTwinAchievementSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  badgeKey: { type: String, required: true }, // workout_7, workout_30, run_100, yoga_100, meditation_100, healthy_eating, sleep_excellent, hydration_perfect
  title: { type: String, required: true },
  description: { type: String },
  earnedAt: { type: Date, default: Date.now }
}, { timestamps: true, collection: 'health_twin_achievements' });

// Add index searches
HealthTwinSchema.index({ userId: 1 });
HealthScoreSchema.index({ userId: 1, date: -1 });
PredictionsSchema.index({ userId: 1, createdAt: -1 });
InsightsSchema.index({ userId: 1, date: -1 });
ReportsSchema.index({ userId: 1, type: 1, date: -1 });
HealthTimelineSchema.index({ userId: 1, date: -1 });
HealthTwinAchievementSchema.index({ userId: 1, badgeKey: 1 });

module.exports = {
  HealthTwin: mongoose.model('HealthTwin', HealthTwinSchema),
  HealthScore: mongoose.model('HealthScore', HealthScoreSchema),
  Predictions: mongoose.model('Predictions', PredictionsSchema),
  Insights: mongoose.model('Insights', InsightsSchema),
  Reports: mongoose.model('Reports', ReportsSchema),
  HealthTimeline: mongoose.model('HealthTimeline', HealthTimelineSchema),
  HealthTwinAchievement: mongoose.model('HealthTwinAchievement', HealthTwinAchievementSchema)
};
