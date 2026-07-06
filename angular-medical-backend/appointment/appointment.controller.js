const Appointment = require('./appointment.model');
const Doctor = require('../doctor/doctor.model');
const { getAllUsers, findById } = require('../data/users.store');
const mongoose = require('mongoose');

const DoctorAvailability = require('./doctor-availability.model');
const Notification = require('./notification.model');
const AppointmentHistory = require('./appointment-history.model');
const DoctorNote = require('./doctor-note.model');
const RescheduleRequest = require('./reschedule-request.model');
const PatientForm = require('../patient/patient.model');
const { FaceHealthScan } = require('../face/face.model');
const { HealthTwin } = require('../healthtwin/healthtwin.model');
const { HealthLog } = require('../fitness/tracker.model');

// Helper: Get day name from date string (YYYY-MM-DD)
const getDayName = (dateStr) => {
  const date = new Date(dateStr);
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[date.getDay()];
};

// POST /api/appointments
const bookAppointment = async (req, res) => {
  try {
    const { doctorId, appointmentDate, appointmentTime, symptoms, notes, reasonForVisit } = req.body;

    if (!doctorId || !appointmentDate || !appointmentTime || !reasonForVisit) {
      return res.status(400).json({ message: 'Doctor ID, Date, Time, and Reason for visit are required' });
    }

    const doctor = await Doctor.findById(doctorId);
    if (!doctor || doctor.status !== 'Active') {
      return res.status(404).json({ message: 'Doctor not found or is currently inactive' });
    }

    const selectedDay = getDayName(appointmentDate);
    if (!doctor.availableDays.includes(selectedDay)) {
      return res.status(400).json({
        message: `Doctor is not available on ${selectedDay}. Available days: ${doctor.availableDays.join(', ')}`,
      });
    }

    if (!doctor.availableTimeSlots.includes(appointmentTime)) {
      return res.status(400).json({
        message: `Selected slot (${appointmentTime}) is invalid. Available slots: ${doctor.availableTimeSlots.join(', ')}`,
      });
    }

    // Conflict check
    const existing = await Appointment.findOne({
      doctorId,
      appointmentDate,
      appointmentTime,
      status: { $in: ['Pending', 'Accepted'] },
    });

    if (existing) {
      return res.status(409).json({ message: 'This time slot is already booked for this doctor' });
    }

    const patientUser = getAllUsers().find((u) => u.id === req.user.id);
    const firstName = patientUser ? patientUser.firstName : (req.user.firstName || 'Patient');
    const lastName = patientUser ? patientUser.lastName : (req.user.lastName || '');
    const patientName = `${firstName} ${lastName}`.trim();
    const patientEmail = patientUser ? patientUser.email : req.user.email;

    const appointment = new Appointment({
      patientId: req.user.id,
      patientName,
      patientEmail,
      doctorId,
      doctorName: doctor.fullName,
      doctorSpecialization: doctor.specialization,
      appointmentDate,
      appointmentTime,
      reasonForVisit,
      symptoms: symptoms || [],
      notes: notes || '',
      status: 'Pending',
    });

    const saved = await appointment.save();
    return res.status(201).json({
      message: 'Appointment booked successfully',
      data: saved,
    });
  } catch (error) {
    console.error('[bookAppointment] error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// PATCH /api/appointments/:id/reschedule
// Patient reschedules their pending/accepted appointment
const rescheduleAppointment = async (req, res) => {
  try {
    const { appointmentDate, appointmentTime } = req.body;
    if (!appointmentDate || !appointmentTime) {
      return res.status(400).json({ message: 'Date and Time are required to reschedule' });
    }

    const appointment = await Appointment.findOne({
      _id: req.params.id,
      patientId: req.user.id,
    });

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    if (appointment.status !== 'Pending' && appointment.status !== 'Accepted') {
      return res.status(400).json({ message: `Cannot reschedule appointment in '${appointment.status}' state` });
    }

    // Validate availability of the doctor
    const doctor = await Doctor.findById(appointment.doctorId);
    if (!doctor || doctor.status !== 'Active') {
      return res.status(404).json({ message: 'Doctor not found or inactive' });
    }

    const selectedDay = getDayName(appointmentDate);
    if (!doctor.availableDays.includes(selectedDay)) {
      return res.status(400).json({
        message: `Doctor is not available on ${selectedDay}. Available: ${doctor.availableDays.join(', ')}`,
      });
    }

    if (!doctor.availableTimeSlots.includes(appointmentTime)) {
      return res.status(400).json({
        message: `Selected slot (${appointmentTime}) is invalid. Available: ${doctor.availableTimeSlots.join(', ')}`,
      });
    }

    // Check for double booking conflicts (excluding the current appointment itself)
    const existing = await Appointment.findOne({
      _id: { $ne: appointment._id },
      doctorId: appointment.doctorId,
      appointmentDate,
      appointmentTime,
      status: { $in: ['Pending', 'Accepted'] },
    });

    if (existing) {
      return res.status(409).json({ message: 'This time slot is already booked for this doctor' });
    }

    appointment.appointmentDate = appointmentDate;
    appointment.appointmentTime = appointmentTime;
    // Set status back to Pending upon rescheduling to allow doctor review
    appointment.status = 'Pending';

    const saved = await appointment.save();
    return res.status(200).json({
      message: 'Appointment rescheduled successfully. Pending doctor confirmation.',
      data: saved,
    });
  } catch (error) {
    console.error('[rescheduleAppointment] error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// GET /api/appointments/my
const getPatientAppointments = async (req, res) => {
  try {
    const appointments = await Appointment.find({ patientId: req.user.id })
      .sort({ appointmentDate: -1, appointmentTime: -1 })
      .lean();

    return res.status(200).json({ count: appointments.length, data: appointments });
  } catch (error) {
    console.error('[getPatientAppointments] error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// PATCH /api/appointments/:id/cancel
const cancelAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findOne({
      _id: req.params.id,
      patientId: req.user.id,
    });

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    if (appointment.status !== 'Pending' && appointment.status !== 'Accepted') {
      return res.status(400).json({ message: `Cannot cancel appointment in '${appointment.status}' state` });
    }

    appointment.status = 'Cancelled';
    await appointment.save();

    return res.status(200).json({
      message: 'Appointment cancelled successfully',
      data: appointment,
    });
  } catch (error) {
    console.error('[cancelAppointment] error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// GET /api/appointments/doctor
const getDoctorAppointments = async (req, res) => {
  try {
    const doctorId = req.user.id;
    if (!mongoose.Types.ObjectId.isValid(doctorId)) {
      return res.status(200).json({
        count: 0,
        data: [],
        stats: {
          totalPatients: 0,
          todayEarnings: 0,
          pendingCount: 0,
          acceptedCount: 0,
          completedCount: 0,
          rejectedCount: 0,
          cancelledCount: 0,
          emergencyCount: 0,
        }
      });
    }

    const appointments = await Appointment.find({ doctorId })
      .sort({ appointmentDate: -1, appointmentTime: -1 })
      .lean();

    // Stats calculations
    const uniquePatients = new Set(appointments.map(a => a.patientId));
    const totalPatients = uniquePatients.size;

    const doc = await Doctor.findById(doctorId);
    const fee = doc ? doc.consultationFee : 100;

    const pendingCount = appointments.filter(a => a.status === 'Pending').length;
    const acceptedCount = appointments.filter(a => a.status === 'Accepted').length;
    const completedCount = appointments.filter(a => a.status === 'Completed').length;
    const rejectedCount = appointments.filter(a => a.status === 'Rejected').length;
    const cancelledCount = appointments.filter(a => a.status === 'Cancelled').length;
    const emergencyCount = appointments.filter(a => a.status === 'Emergency' || a.isEmergency).length;

    const todayEarnings = completedCount * fee;

    return res.status(200).json({
      count: appointments.length,
      data: appointments,
      stats: {
        totalPatients,
        todayEarnings,
        pendingCount,
        acceptedCount,
        completedCount,
        rejectedCount,
        cancelledCount,
        emergencyCount,
      }
    });
  } catch (error) {
    console.error('[getDoctorAppointments] error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// PATCH /api/appointments/:id/status
// Doctor updates status (Accepted, Rejected, Completed) + adds Notes
const updateAppointmentStatus = async (req, res) => {
  try {
    const { status, notes } = req.body;
    if (!['Accepted', 'Rejected', 'Completed', 'Cancelled'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status update. Must be Accepted, Rejected, Completed or Cancelled.' });
    }

    const doctorId = req.user.id;
    if (!mongoose.Types.ObjectId.isValid(doctorId)) {
      return res.status(404).json({ message: 'Appointment not found for this doctor' });
    }

    const appointment = await Appointment.findOne({
      _id: req.params.id,
      doctorId,
    });

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found for this doctor' });
    }

    appointment.status = status;
    if (notes !== undefined) {
      appointment.notes = notes;
    }

    await appointment.save();
    return res.status(200).json({
      message: `Appointment updated to ${status.toLowerCase()} successfully`,
      data: appointment,
    });
  } catch (error) {
    console.error('[updateAppointmentStatus] error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// GET /api/appointments/all (Admin only)
const getAllAppointments = async (req, res) => {
  try {
    const appointments = await Appointment.find()
      .sort({ appointmentDate: -1, appointmentTime: -1 })
      .lean();

    return res.status(200).json({ count: appointments.length, data: appointments });
  } catch (error) {
    console.error('[getAllAppointments] error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// GET /api/appointments/analytics (Admin only)
const getAnalytics = async (req, res) => {
  try {
    const totalDoctors = await Doctor.countDocuments();

    const patientUsers = getAllUsers().filter((u) => u.role === 'patient');
    const patientIds = new Set(patientUsers.map((u) => u.id));
    const uniqueDbPatients = await Appointment.distinct('patientId');
    uniqueDbPatients.forEach((id) => patientIds.add(id));
    const totalPatients = patientIds.size;

    const todayStr = new Date().toISOString().split('T')[0];
    const appointmentsToday = await Appointment.countDocuments({ appointmentDate: todayStr });

    const completedAppointments = await Appointment.countDocuments({ status: 'Completed' });
    const cancelledAppointments = await Appointment.countDocuments({ status: 'Cancelled' }) + 
                            await Appointment.countDocuments({ status: 'Rejected' });

    const specialistBooking = await Appointment.aggregate([
      { $group: { _id: '$doctorSpecialization', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 1 },
    ]);
    const mostBookedSpecialist = specialistBooking.length > 0 ? specialistBooking[0]._id : 'General Physician';

    return res.status(200).json({
      totalDoctors,
      totalPatients,
      appointmentsToday,
      completedAppointments,
      cancelledAppointments,
      mostBookedSpecialist,
    });
  } catch (error) {
    console.error('[getAnalytics] error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// GET /api/appointments/:id/details
const getAppointmentDetails = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    const patientId = appointment.patientId;
    const user = findById(patientId);

    const latestForm = await PatientForm.findOne({ userId: patientId }).sort({ createdAt: -1 });
    const latestHealth = await HealthLog.findOne({ userId: patientId }).sort({ date: -1 });
    const twin = await HealthTwin.findOne({ userId: patientId });
    const face = await FaceHealthScan.findOne({ userId: patientId }).sort({ date: -1 });

    const notesRecord = await DoctorNote.findOne({ appointmentId: appointment._id });

    // Fallback details if fields are blank
    const patientDetails = {
      _id: appointment._id,
      patientId: appointment.patientId,
      photo: user?.profilePhoto || '',
      name: appointment.patientName,
      age: latestForm ? latestForm.age : (user?.age || 28),
      gender: latestForm ? latestForm.gender : (user?.gender || 'male'),
      phone: user?.phone || '+1 555-0199',
      email: appointment.patientEmail,
      appointmentDate: appointment.appointmentDate,
      appointmentTime: appointment.appointmentTime,
      symptoms: appointment.symptoms && appointment.symptoms.length > 0 ? appointment.symptoms : (latestForm?.symptoms || []),
      possibleDisease: latestForm?.aiAnalysis?.possibleCauses?.join(', ') || latestForm?.aiAnalysis?.possibleDisease || latestForm?.aiAnalysis?.suggestedDiagnosis || 'Mild viral fever (Estimated)',
      severityLevel: latestForm ? latestForm.severity : 3,
      medicalHistory: latestForm?.aiAnalysis?.medicalHistory || 'No major clinical history recorded.',
      currentMedicines: latestHealth?.currentMedicines || 'None active.',
      doctorNotes: notesRecord?.notes || appointment.notes || '',
      prescriptionNotes: notesRecord?.prescriptionNotes || appointment.prescriptionNotes || '',
      aiHealthScore: twin ? twin.healthScore : 72,
      faceScanReport: face ? {
        score: face.score,
        category: face.category,
        mood: face.mood,
        date: face.date,
        indicators: face.wellnessIndicators,
        recommendations: face.recommendations
      } : null,
      timeline: appointment.timeline && appointment.timeline.length > 0 ? appointment.timeline : [
        { status: 'Pending', notes: 'Appointment requested by patient', timestamp: appointment.createdAt }
      ]
    };

    return res.status(200).json({ status: 'success', data: patientDetails });
  } catch (error) {
    console.error('[getAppointmentDetails] error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// POST /api/appointments/:id/accept
const acceptAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    appointment.status = 'Accepted';
    appointment.videoLink = `https://meet.jit.si/medcare-consult-${appointment._id}`;
    appointment.clinicAddress = '120 Broadway, New York, NY';
    appointment.hospitalName = 'Metro General Hospital';
    
    // Add to timeline
    appointment.timeline.push({
      status: 'Accepted',
      notes: 'Appointment accepted. Consultation links generated.',
      timestamp: new Date()
    });

    await appointment.save();

    // Log to AppointmentHistory
    await AppointmentHistory.create({
      appointmentId: appointment._id,
      status: 'Accepted',
      notes: 'Doctor confirmed appointment slot.',
      updatedBy: 'doctor'
    });

    // Create Notification for Patient
    await Notification.create({
      userId: appointment.patientId,
      title: 'Appointment Confirmed',
      message: `Your appointment with ${appointment.doctorName} has been accepted for ${appointment.appointmentDate} at ${appointment.appointmentTime}. Video link: ${appointment.videoLink}`,
      type: 'appointment'
    });

    // Email Mock Log
    console.log(`[MOCK EMAIL SENT] To: ${appointment.patientEmail} | Subject: Appointment Confirmed with ${appointment.doctorName} | Body: Confirmed for ${appointment.appointmentDate} at ${appointment.appointmentTime} at Metro General Hospital (${appointment.clinicAddress}).`);

    return res.status(200).json({ status: 'success', message: 'Appointment accepted successfully', data: appointment });
  } catch (error) {
    console.error('[acceptAppointment] error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// POST /api/appointments/:id/reject
const rejectAppointment = async (req, res) => {
  try {
    const { reason, suggestedSlots } = req.body; // suggestedSlots: array of strings

    if (!reason || !suggestedSlots || !Array.isArray(suggestedSlots) || suggestedSlots.length < 3) {
      return res.status(400).json({ message: 'Reason and at least 3 alternative slots are required' });
    }

    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    appointment.status = 'Rejected';
    appointment.rejectionReason = reason;
    appointment.suggestedTimeSlots = suggestedSlots;

    appointment.timeline.push({
      status: 'Rejected',
      notes: `Rejected: ${reason}. Offered alternatives: ${suggestedSlots.join(', ')}`,
      timestamp: new Date()
    });

    await appointment.save();

    await AppointmentHistory.create({
      appointmentId: appointment._id,
      status: 'Rejected',
      notes: `Rejected. Reason: ${reason}`,
      updatedBy: 'doctor'
    });

    await Notification.create({
      userId: appointment.patientId,
      title: 'Appointment Rejected (Reschedule Proposed)',
      message: `Your appointment with ${appointment.doctorName} was rejected: ${reason}. Please select one of the suggested times.`,
      type: 'appointment'
    });

    console.log(`[MOCK EMAIL SENT] To: ${appointment.patientEmail} | Subject: Appointment Declined - ${appointment.doctorName} | Body: Reason: ${reason}. Suggested slots: ${suggestedSlots.join(', ')}`);

    return res.status(200).json({ status: 'success', message: 'Appointment rejected successfully', data: appointment });
  } catch (error) {
    console.error('[rejectAppointment] error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// POST /api/appointments/:id/reschedule
const rescheduleAppointmentNew = async (req, res) => {
  try {
    const { appointmentDate, appointmentTime, reason } = req.body;
    if (!appointmentDate || !appointmentTime) {
      return res.status(400).json({ message: 'Date and Time are required' });
    }

    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    const originalDate = appointment.appointmentDate;
    const originalTime = appointment.appointmentTime;

    appointment.appointmentDate = appointmentDate;
    appointment.appointmentTime = appointmentTime;
    appointment.status = 'Rescheduled';

    appointment.timeline.push({
      status: 'Rescheduled',
      notes: `Rescheduled from ${originalDate} ${originalTime} to ${appointmentDate} ${appointmentTime}. Reason: ${reason || 'Doctor proposed change'}`,
      timestamp: new Date()
    });

    await appointment.save();

    // Create RescheduleRequest record
    await RescheduleRequest.create({
      appointmentId: appointment._id,
      suggestedBy: req.user.role,
      reason: reason || 'Time adjustment',
      originalDate,
      originalTime,
      suggestedDate: appointmentDate,
      suggestedTime: appointmentTime,
      status: 'Accepted'
    });

    await AppointmentHistory.create({
      appointmentId: appointment._id,
      status: 'Rescheduled',
      notes: `Rescheduled to ${appointmentDate} at ${appointmentTime}`,
      updatedBy: req.user.role
    });

    await Notification.create({
      userId: req.user.role === 'doctor' ? appointment.patientId : appointment.doctorId,
      title: 'Appointment Rescheduled',
      message: `Your appointment has been rescheduled to ${appointmentDate} at ${appointmentTime}.`,
      type: 'appointment'
    });

    return res.status(200).json({ status: 'success', message: 'Appointment rescheduled successfully', data: appointment });
  } catch (error) {
    console.error('[rescheduleAppointmentNew] error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// POST /api/appointments/:id/complete
const completeAppointment = async (req, res) => {
  try {
    const { notes, prescriptionNotes, reportUrl } = req.body;

    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    appointment.status = 'Completed';
    if (notes) appointment.notes = notes;
    if (prescriptionNotes) appointment.prescriptionNotes = prescriptionNotes;
    if (reportUrl) appointment.reportUrl = reportUrl;

    appointment.timeline.push({
      status: 'Completed',
      notes: 'Visit completed. Diagnosis notes and prescription issued.',
      timestamp: new Date()
    });

    await appointment.save();

    // Create DoctorNote document
    await DoctorNote.create({
      appointmentId: appointment._id,
      patientId: appointment.patientId,
      doctorId: appointment.doctorId,
      notes: notes || '',
      prescriptionNotes: prescriptionNotes || ''
    });

    await AppointmentHistory.create({
      appointmentId: appointment._id,
      status: 'Completed',
      notes: 'Completed consult.',
      updatedBy: 'doctor'
    });

    await Notification.create({
      userId: appointment.patientId,
      title: 'Consultation Notes Added',
      message: `Dr. ${appointment.doctorName} has added notes and a prescription for your visit.`,
      type: 'appointment'
    });

    return res.status(200).json({ status: 'success', message: 'Appointment completed successfully', data: appointment });
  } catch (error) {
    console.error('[completeAppointment] error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// POST /api/appointments/:id/cancel
const cancelAppointmentNew = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    appointment.status = 'Cancelled';
    appointment.timeline.push({
      status: 'Cancelled',
      notes: `Appointment cancelled by ${req.user.role}.`,
      timestamp: new Date()
    });

    await appointment.save();

    await AppointmentHistory.create({
      appointmentId: appointment._id,
      status: 'Cancelled',
      notes: `Cancelled by ${req.user.role}`,
      updatedBy: req.user.role
    });

    await Notification.create({
      userId: req.user.role === 'doctor' ? appointment.patientId : appointment.doctorId,
      title: 'Appointment Cancelled',
      message: `Your appointment on ${appointment.appointmentDate} has been cancelled.`,
      type: 'appointment'
    });

    return res.status(200).json({ status: 'success', message: 'Appointment cancelled successfully', data: appointment });
  } catch (error) {
    console.error('[cancelAppointmentNew] error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// POST /api/appointments/:id/suggest-slots
const suggestSlots = async (req, res) => {
  try {
    const { suggestedSlots } = req.body;
    if (!suggestedSlots || !Array.isArray(suggestedSlots)) {
      return res.status(400).json({ message: 'Alternative slots are required' });
    }

    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    appointment.suggestedTimeSlots = suggestedSlots;
    await appointment.save();

    return res.status(200).json({ status: 'success', data: appointment });
  } catch (error) {
    console.error('[suggestSlots] error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// POST /api/appointments/:id/respond-reject
const respondToRejection = async (req, res) => {
  try {
    const { action, selectedSlot } = req.body; // action: 'accept', 'reject'
    
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    if (action === 'accept') {
      if (!selectedSlot) {
        return res.status(400).json({ message: 'Selected slot is required' });
      }

      appointment.appointmentTime = selectedSlot;
      
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dayAfter = new Date();
      dayAfter.setDate(dayAfter.getDate() + 2);

      if (selectedSlot.toLowerCase().includes('tomorrow')) {
        appointment.appointmentDate = tomorrow.toISOString().split('T')[0];
      } else if (selectedSlot.toLowerCase().includes('day after')) {
        appointment.appointmentDate = dayAfter.toISOString().split('T')[0];
      }
      
      appointment.status = 'Accepted'; 
      appointment.rejectionReason = '';
      appointment.suggestedTimeSlots = [];

      appointment.timeline.push({
        status: 'Accepted',
        notes: `Patient accepted alternative slot: ${selectedSlot}`,
        timestamp: new Date()
      });

      await appointment.save();

      await AppointmentHistory.create({
        appointmentId: appointment._id,
        status: 'Accepted',
        notes: `Accepted suggested slot: ${selectedSlot}`,
        updatedBy: 'patient'
      });

      await Notification.create({
        userId: appointment.doctorId.toString(),
        title: 'Alternative Slot Accepted',
        message: `${appointment.patientName} accepted alternative slot: ${appointment.appointmentDate} at ${appointment.appointmentTime}.`,
        type: 'appointment'
      });

      return res.status(200).json({ status: 'success', message: 'Suggested time accepted', data: appointment });
    } else if (action === 'reject') {
      appointment.status = 'Cancelled';
      appointment.timeline.push({
        status: 'Cancelled',
        notes: 'Patient declined proposed slots and cancelled visit.',
        timestamp: new Date()
      });
      await appointment.save();

      await AppointmentHistory.create({
        appointmentId: appointment._id,
        status: 'Cancelled',
        notes: 'Patient declined alternative slots.',
        updatedBy: 'patient'
      });

      await Notification.create({
        userId: appointment.doctorId.toString(),
        title: 'Alternative Slots Declined',
        message: `${appointment.patientName} declined suggested slots and cancelled appointment.`,
        type: 'appointment'
      });

      return res.status(200).json({ status: 'success', message: 'Suggested time rejected. Appointment cancelled.', data: appointment });
    } else {
      return res.status(400).json({ message: 'Invalid action. Must be accept or reject.' });
    }
  } catch (error) {
    console.error('[respondToRejection] error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// POST /api/appointments/:id/emergency
const markEmergency = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    appointment.status = 'Emergency';
    appointment.isEmergency = true;
    appointment.timeline.push({
      status: 'Emergency',
      notes: 'Doctor flagged appointment status as emergency!',
      timestamp: new Date()
    });

    await appointment.save();

    await AppointmentHistory.create({
      appointmentId: appointment._id,
      status: 'Emergency',
      notes: 'Flagged as emergency',
      updatedBy: 'doctor'
    });

    await Notification.create({
      userId: appointment.patientId,
      title: 'Emergency Appointment Flagged',
      message: `Your appointment with ${appointment.doctorName} has been flagged as EMERGENCY. Please prepare accordingly.`,
      type: 'appointment'
    });

    return res.status(200).json({ status: 'success', message: 'Marked as emergency successfully', data: appointment });
  } catch (error) {
    console.error('[markEmergency] error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// GET /api/appointments/notifications/my
const getMyNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .lean();
    return res.status(200).json({ count: notifications.length, data: notifications });
  } catch (error) {
    console.error('[getMyNotifications] error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// PATCH /api/appointments/notifications/:id/read
const markNotificationRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { read: true },
      { new: true }
    );
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    return res.status(200).json({ message: 'Notification marked as read', data: notification });
  } catch (error) {
    console.error('[markNotificationRead] error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  bookAppointment,
  rescheduleAppointment,
  getPatientAppointments,
  cancelAppointment,
  getDoctorAppointments,
  updateAppointmentStatus,
  getAllAppointments,
  getAnalytics,
  getAppointmentDetails,
  acceptAppointment,
  rejectAppointment,
  rescheduleAppointmentNew,
  completeAppointment,
  cancelAppointmentNew,
  suggestSlots,
  respondToRejection,
  markEmergency,
  getMyNotifications,
  markNotificationRead,
};
