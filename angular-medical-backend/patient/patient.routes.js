const express = require('express');
const router = express.Router();
const { submitForm, getMyForms, getFormById, getAllForms } = require('./patient.controller');
const { verifyToken } = require('../middleware/auth.middleware');

// POST /api/patient/submit  — protected, user must be logged in
router.post('/submit', verifyToken, submitForm);

// GET  /api/patient/my-forms — protected
router.get('/my-forms', verifyToken, getMyForms);

// GET  /api/patient/my-forms/:id — protected
router.get('/my-forms/:id', verifyToken, getFormById);

// GET  /api/patient/all — protected (add role check here later for admin-only)
router.get('/all', verifyToken, getAllForms);

module.exports = router;
