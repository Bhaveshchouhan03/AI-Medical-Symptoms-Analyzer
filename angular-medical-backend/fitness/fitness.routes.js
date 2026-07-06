const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth.middleware');
const fitnessController = require('./fitness.controller');

// Libraries
router.get('/yoga', verifyToken, fitnessController.getYogaSessions);
router.get('/meditation', verifyToken, fitnessController.getMeditationSessions);

// Stats & AI Plan
router.get('/stats', verifyToken, fitnessController.getFitnessStats);
router.get('/ai-wellness', verifyToken, fitnessController.getAiWellnessPlan);

// Logging
router.post('/workout', verifyToken, fitnessController.logWorkout);
router.post('/running', verifyToken, fitnessController.logRunning);
router.post('/cycling', verifyToken, fitnessController.logCycling);
router.get('/history', verifyToken, fitnessController.getHistory);

// Health Logs
router.post('/health-tracker', verifyToken, fitnessController.logHealthParam);
router.get('/health-tracker', verifyToken, fitnessController.getHealthLogs);

// Reminders
router.get('/reminders', verifyToken, fitnessController.getReminders);
router.post('/reminders', verifyToken, fitnessController.saveReminders);

// Bookmarks
router.get('/bookmarks', verifyToken, fitnessController.getBookmarks);
router.post('/bookmarks', verifyToken, fitnessController.toggleBookmark);

// Challenges
router.get('/challenges', verifyToken, fitnessController.getChallenges);
router.post('/challenges', verifyToken, fitnessController.toggleChallenge);

// Achievements
router.get('/achievements', verifyToken, fitnessController.getAchievements);

module.exports = router;
