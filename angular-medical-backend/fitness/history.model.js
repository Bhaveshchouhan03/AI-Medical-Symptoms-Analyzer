const mongoose = require('mongoose');

const WorkoutHistorySchema = new mongoose.Schema({
  userId: { type: String, required: true },
  workoutType: { type: String, required: true }, // Full Body, Chest, Arm, Leg, Core, Weight Loss, Fat Burning, HIIT, Low Impact, No Equipment, Stretching
  exerciseName: { type: String },
  duration: { type: Number, required: true }, // in minutes
  caloriesBurned: { type: Number, required: true },
  targetMuscles: [{ type: String }],
  date: { type: Date, default: Date.now }
}, { timestamps: true });

const RunningHistorySchema = new mongoose.Schema({
  userId: { type: String, required: true },
  distance: { type: Number, required: true }, // in km
  duration: { type: Number, required: true }, // in minutes
  caloriesBurned: { type: Number, required: true },
  speed: { type: Number, required: true }, // in km/h
  planName: { type: String, default: 'Free Run' }, // Beginner Running, 5K, 10K, Daily Challenge
  date: { type: Date, default: Date.now }
}, { timestamps: true });

const CyclingHistorySchema = new mongoose.Schema({
  userId: { type: String, required: true },
  distance: { type: Number, required: true }, // in km
  duration: { type: Number, required: true }, // in minutes
  caloriesBurned: { type: Number, required: true },
  speed: { type: Number, required: true }, // in km/h
  cyclingType: { type: String, required: true }, // Indoor, Outdoor
  date: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = {
  WorkoutHistory: mongoose.model('WorkoutHistory', WorkoutHistorySchema),
  RunningHistory: mongoose.model('RunningHistory', RunningHistorySchema),
  CyclingHistory: mongoose.model('CyclingHistory', CyclingHistorySchema)
};
