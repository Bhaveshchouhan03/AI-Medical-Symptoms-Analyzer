const express = require('express');
const router = express.Router();
const { analyzePatientSymptoms, searchEducationalVideos } = require('./ai.controller');
const { verifyToken } = require('../middleware/auth.middleware');

// POST /api/ai/analyze — protected, requires login
router.post('/analyze', verifyToken, analyzePatientSymptoms);
router.get('/videos', verifyToken, searchEducationalVideos);

module.exports = router;
