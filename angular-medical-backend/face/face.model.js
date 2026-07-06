const mongoose = require('mongoose');

const FaceHealthScanSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  image: { type: String, default: null }, // base64 cached if saved
  score: { type: Number, required: true }, // 0-100
  category: { type: String, required: true }, // Excellent, Good, Average, Needs Improvement
  wellnessIndicators: {
    eyeRedness: { type: String, default: 'Normal' },
    darkCircles: { type: String, default: 'None' },
    skinType: { type: String, default: 'Normal' },
    skinBrightness: { type: String, default: 'Medium' },
    symmetry: { type: String, default: 'Symmetric' },
    smile: { type: String, default: 'Not Detected' },
    stress: { type: Number, default: 0 }, // 0-10
    fatigue: { type: Number, default: 0 },
    hydration: { type: Number, default: 10 }, // 0-10
    skinBreakouts: { type: String, default: 'None' }, // None, Mild, Moderate, Severe
    jaundiceIndicator: { type: String, default: 'None' }, // None, Mild, Moderate
    puffiness: { type: String, default: 'None' }, // None, Mild, Moderate
    skinRedness: { type: String, default: 'None' } // None, Mild, Moderate, Severe
  },
  recommendations: [{ type: String }],
  mood: { type: String, default: 'Neutral' },
  date: { type: Date, default: Date.now }
}, { timestamps: true, collection: 'face_health_scans' });

const FaceAnalysisSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  scanId: { type: mongoose.Schema.Types.ObjectId, ref: 'FaceHealthScan', required: true },
  landmarks: { type: mongoose.Schema.Types.Mixed, default: {} },
  parameters: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true, collection: 'face_analyses' });

const FaceReportSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  scanId: { type: mongoose.Schema.Types.ObjectId, ref: 'FaceHealthScan', required: true },
  summary: { type: String, default: '' },
  downloadCount: { type: Number, default: 0 }
}, { timestamps: true, collection: 'face_reports' });

const FaceHistorySchema = new mongoose.Schema({
  userId: { type: String, required: true },
  scanId: { type: mongoose.Schema.Types.ObjectId, ref: 'FaceHealthScan', required: true },
  date: { type: Date, default: Date.now },
  score: { type: Number, required: true },
  stress: { type: Number, required: true },
  hydration: { type: Number, required: true },
  fatigue: { type: Number, required: true }
}, { timestamps: true, collection: 'face_histories' });

FaceHealthScanSchema.index({ userId: 1, date: -1 });
FaceHistorySchema.index({ userId: 1, date: -1 });

module.exports = {
  FaceHealthScan: mongoose.model('FaceHealthScan', FaceHealthScanSchema),
  FaceAnalysis: mongoose.model('FaceAnalysis', FaceAnalysisSchema),
  FaceReport: mongoose.model('FaceReport', FaceReportSchema),
  FaceHistory: mongoose.model('FaceHistory', FaceHistorySchema)
};
