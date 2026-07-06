const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth.middleware');
const {
  analyzeFaceImage,
  getHistory,
  getScanDetails,
  deleteScan,
  exportReportText
} = require('./face.controller');

// All face analyzer routes require JWT verification
router.post('/analyze', verifyToken, analyzeFaceImage);
router.get('/history', verifyToken, getHistory);
router.get('/:id', verifyToken, getScanDetails);
router.delete('/:id', verifyToken, deleteScan);
router.get('/report/:id', verifyToken, exportReportText);

module.exports = router;
