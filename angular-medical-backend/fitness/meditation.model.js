const mongoose = require('mongoose');

const MeditationSchema = new mongoose.Schema({
  title: { type: String, required: true },
  category: { type: String, required: true },
  duration: { type: Number, required: true }, // in minutes
  benefits: [{ type: String }],
  difficulty: { type: String, required: true }, // Beginner, Intermediate, Advanced
  audioUrl: { type: String },
  videoUrl: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('MeditationSession', MeditationSchema);
