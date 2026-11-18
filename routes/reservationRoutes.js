const express = require('express');
const router = express.Router();
const {
  createReservation,
  getMyReservations,
  getPharmacyReservations,
  updateReservationStatus,
} = require('../controllers/reservationController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

// User routes
router.post('/', protect, createReservation);
router.get('/my', protect, getMyReservations);

// User & Pharmacy Owner status updates
router.get('/pharmacy', protect, authorize('pharmacy_owner', 'admin'), getPharmacyReservations);
router.put('/:id/status', protect, authorize('pharmacy_owner', 'admin', 'user'), updateReservationStatus);

module.exports = router;

