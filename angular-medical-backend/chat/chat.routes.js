const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth.middleware');
const {
  processMessage,
  getSessions,
  getSessionDetails,
  deleteSession,
  clearHistory,
  voiceChat,
  exportChatHistoryText
} = require('./chat.controller');

// All chat endpoints require JWT validation
router.post('/', verifyToken, processMessage);
router.get('/history', verifyToken, getSessions);
router.delete('/history', verifyToken, clearHistory);
router.get('/:id', verifyToken, getSessionDetails);
router.delete('/:id', verifyToken, deleteSession);
router.post('/voice', verifyToken, voiceChat);
router.post('/export', verifyToken, exportChatHistoryText);

module.exports = router;
