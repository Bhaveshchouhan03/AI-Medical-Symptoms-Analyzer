const express = require('express');
const router = express.Router();
const { signup, login, refreshToken, getMe } = require('../controllers/auth.controller');
const { verifyToken } = require('../middleware/auth.middleware');

// Public routes
router.post('/signup', signup);
router.post('/login', login);
router.post('/refresh', refreshToken);

// Protected routes
router.get('/me', verifyToken, getMe);

module.exports = router;
