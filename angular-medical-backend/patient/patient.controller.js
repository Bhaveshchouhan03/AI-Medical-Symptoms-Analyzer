const PatientForm = require('./patient.model');

// ────────────────────────────────────────────
// POST /api/patient/submit
// ────────────────────────────────────────────
const submitForm = async (req, res) => {
  try {
    const { age, gender, symptoms, duration, severity, notes } = req.body;

    // Log incoming payload for debugging
    console.log('[submitForm] body:', { age, gender, symptoms, duration, severity, notes });

    // Explicit field checks (avoid falsy pitfalls with numeric 0)
    const missing = [];
    if (age === undefined || age === null || age === '') missing.push('age');
    if (!gender)    missing.push('gender');
    if (!duration)  missing.push('duration');
    if (severity === undefined || severity === null || severity === '') missing.push('severity');
    if (!symptoms)  missing.push('symptoms');

    if (missing.length > 0) {
      return res.status(400).json({
        message: `Missing required fields: ${missing.join(', ')}`,
      });
    }

    // Symptoms must arrive as an array
    if (!Array.isArray(symptoms) || symptoms.length === 0) {
      return res.status(400).json({ message: 'At least one symptom must be selected' });
    }

    const form = new PatientForm({
      userId:   req.user?.id ?? null,
      age:      Number(age),
      gender:   String(gender).toLowerCase(),
      symptoms,
      duration,
      severity: Number(severity),
      notes:    notes ?? '',
    });

    const saved = await form.save();

    return res.status(201).json({
      message: 'Symptom report saved successfully',
      data: saved,
    });
  } catch (error) {
    // Mongoose validation error — return the exact messages
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      console.error('[submitForm] ValidationError:', messages);
      return res.status(400).json({ message: messages.join(', ') });
    }
    console.error('[submitForm] Unexpected error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ────────────────────────────────────────────
// GET /api/patient/my-forms/:id
// ────────────────────────────────────────────
const getFormById = async (req, res) => {
  try {
    const form = await PatientForm.findOne({
      _id: req.params.id,
      userId: req.user.id,
    }).lean();

    if (!form) {
      return res.status(404).json({ message: 'Report not found' });
    }

    return res.status(200).json({ data: form });
  } catch (error) {
    console.error('[getFormById] error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ────────────────────────────────────────────
// GET /api/patient/my-forms
// ────────────────────────────────────────────
const getMyForms = async (req, res) => {
  try {
    const forms = await PatientForm.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({ data: forms });
  } catch (error) {
    console.error('[getMyForms] error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ────────────────────────────────────────────
// GET /api/patient/all  (admin use)
// ────────────────────────────────────────────
const getAllForms = async (req, res) => {
  try {
    const forms = await PatientForm.find()
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({ count: forms.length, data: forms });
  } catch (error) {
    console.error('[getAllForms] error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = { submitForm, getMyForms, getFormById, getAllForms };
