const mongoose = require('mongoose');

const youtubeCacheSchema = new mongoose.Schema(
  {
    query: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    videos: [
      {
        title: { type: String, required: true },
        videoId: { type: String, required: true },
        thumbnail: { type: String },
        channel: { type: String },
        publishedAt: { type: String },
      }
    ],
  },
  {
    timestamps: true,
  }
);

// Auto-expire cache entries after 7 days (604800 seconds)
youtubeCacheSchema.index({ createdAt: 1 }, { expireAfterSeconds: 604800 });

module.exports = mongoose.model('YoutubeCache', youtubeCacheSchema);
