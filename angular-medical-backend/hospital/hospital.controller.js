const Hospital = require('./hospital.model');

// GET /api/hospitals
const getAllHospitals = async (req, res) => {
  try {
    const hospitals = await Hospital.find().sort({ name: 1 }).lean();
    return res.status(200).json({ count: hospitals.length, data: hospitals });
  } catch (error) {
    console.error('[getAllHospitals] error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// POST /api/hospitals (Admin only)
const addHospital = async (req, res) => {
  try {
    const { name, city, address } = req.body;
    if (!name || !city) {
      return res.status(400).json({ message: 'Hospital Name and City are required' });
    }

    const hospital = new Hospital({ name, city, address: address || '' });
    const saved = await hospital.save();
    return res.status(201).json({ message: 'Hospital added successfully', data: saved });
  } catch (error) {
    console.error('[addHospital] error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// PUT /api/hospitals/:id (Admin only)
const editHospital = async (req, res) => {
  try {
    const { name, city, address } = req.body;
    const hospital = await Hospital.findById(req.params.id);
    if (!hospital) {
      return res.status(404).json({ message: 'Hospital not found' });
    }

    if (name) hospital.name = name;
    if (city) hospital.city = city;
    if (address !== undefined) hospital.address = address;

    const saved = await hospital.save();
    return res.status(200).json({ message: 'Hospital updated successfully', data: saved });
  } catch (error) {
    console.error('[editHospital] error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// DELETE /api/hospitals/:id (Admin only)
const deleteHospital = async (req, res) => {
  try {
    const deleted = await Hospital.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: 'Hospital not found' });
    }
    return res.status(200).json({ message: 'Hospital deleted successfully' });
  } catch (error) {
    console.error('[deleteHospital] error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  getAllHospitals,
  addHospital,
  editHospital,
  deleteHospital,
};
