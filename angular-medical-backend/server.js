require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const authRoutes = require('./routes/auth.routes');
const patientRoutes = require('./patient/patient.routes');
const aiRoutes = require('./ai/ai.routes');
const doctorRoutes = require('./doctor/doctor.routes');
const appointmentRoutes = require('./appointment/appointment.routes');
const hospitalRoutes = require('./hospital/hospital.routes');
const reviewRoutes = require('./review/review.routes');
const medicineRoutes = require('./medicine/medicine.routes');
const fitnessRoutes = require('./fitness/fitness.routes');
const healthTwinRoutes = require('./healthtwin/healthtwin.routes');
const chatRoutes = require('./chat/chat.routes');
const faceRoutes = require('./face/face.routes');

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors({ origin: 'http://localhost:4200', credentials: true }));
app.use(express.json({ limit: '10mb' })); // Support base64 image uploads
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/patient', patientRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/hospitals', hospitalRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/medicines', medicineRoutes);
app.use('/api/fitness', fitnessRoutes);
app.use('/api/healthtwin', healthTwinRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/face', faceRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Medical API is running' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`🚀 Medical API server running on http://localhost:${PORT}`);
});
