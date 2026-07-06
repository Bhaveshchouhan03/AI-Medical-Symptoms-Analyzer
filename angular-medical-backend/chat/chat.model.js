const mongoose = require('mongoose');

const ChatSessionSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  title: { type: String, default: 'New Conversation' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true, collection: 'chat_sessions' });

const ChatHistorySchema = new mongoose.Schema({
  sessionId: { type: String, required: true },
  userId: { type: String, required: true },
  sender: { type: String, required: true, enum: ['user', 'ai'] },
  text: { type: String, required: true },
  language: { type: String, default: 'en' },
  metadata: {
    recommendedDoctors: { type: mongoose.Schema.Types.Mixed, default: null },
    recommendedMedicines: { type: mongoose.Schema.Types.Mixed, default: null },
    recommendedVideos: { type: mongoose.Schema.Types.Mixed, default: null },
    isEmergency: { type: Boolean, default: false },
    action: { type: String, default: null } // Redirect command
  },
  timestamp: { type: Date, default: Date.now }
}, { timestamps: true, collection: 'chat_histories' });

const ChatSuggestionSchema = new mongoose.Schema({
  text: { type: String, required: true, unique: true },
  category: { type: String, required: true } // general, symptoms, fitness, medicines
}, { timestamps: true, collection: 'chat_suggestions' });

ChatSessionSchema.index({ userId: 1, updatedAt: -1 });
ChatHistorySchema.index({ sessionId: 1, timestamp: 1 });
ChatSuggestionSchema.index({ category: 1 });

module.exports = {
  ChatSession: mongoose.model('ChatSession', ChatSessionSchema),
  ChatHistory: mongoose.model('ChatHistory', ChatHistorySchema),
  ChatSuggestion: mongoose.model('ChatSuggestion', ChatSuggestionSchema)
};
