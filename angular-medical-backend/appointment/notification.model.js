const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: String, // Matches the user ID from auth (UUID or ObjectId string)
      required: true,
      index: true
    },
    title: {
      type: String,
      required: true
    },
    message: {
      type: String,
      required: true
    },
    type: {
      type: String,
      default: 'appointment'
    },
    read: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true,
    collection: 'notifications'
  }
);

module.exports = mongoose.model('Notification', notificationSchema);
