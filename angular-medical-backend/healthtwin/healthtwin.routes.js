const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth.middleware');
const {
  getProfile,
  updateAvatar,
  getHealthScore,
  getTimeline,
  getPredictions,
  getRiskAnalysis,
  getReports,
  getRecommendations,
  getAlerts,
  getComparison,
  getTwinAchievements,
  getInsights
} = require('./healthtwin.controller');

// All Health Twin APIs require authentication
router.get('/profile', verifyToken, getProfile);
router.post('/profile/avatar', verifyToken, updateAvatar);
router.get('/score', verifyToken, getHealthScore);
router.get('/timeline', verifyToken, getTimeline);
router.get('/predictions', verifyToken, getPredictions);
router.get('/risk-analysis', verifyToken, getRiskAnalysis);
router.get('/reports', verifyToken, getReports);
router.get('/recommendations', verifyToken, getRecommendations);
router.get('/alerts', verifyToken, getAlerts);
router.get('/comparison', verifyToken, getComparison);
router.get('/achievements', verifyToken, getTwinAchievements);
router.get('/insights', verifyToken, getInsights);

module.exports = router;
