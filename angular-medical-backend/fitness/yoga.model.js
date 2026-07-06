const mongoose = require('mongoose');

const YogaSchema = new mongoose.Schema({
  yogaName: { type: String, required: true },
  category: { type: String, required: true },
  difficulty: { type: String, required: true }, // Beginner, Intermediate, Advanced
  duration: { type: Number, required: true }, // in minutes
  calories: { type: Number, required: true },
  benefits: [{ type: String }],
  equipment: [{ type: String }],
  videoUrl: { type: String },
  image: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('YogaSession', YogaSchema);
