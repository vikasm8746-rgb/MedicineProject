const express = require('express');
const router = express.Router();
const {
  getMyInventory,
  getPharmacyInventory,
  getOwnerDashboardStats,
  addInventory,
  updateInventory,
  deleteInventory,
} = require('../controllers/inventoryController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

// Public route to view pharmacy inventory
router.get('/pharmacy/:pharmacyId', getPharmacyInventory);

// Pharmacy Owner Protected Routes
router.get('/my', protect, authorize('pharmacy_owner', 'admin'), getMyInventory);
router.get('/stats', protect, authorize('pharmacy_owner', 'admin'), getOwnerDashboardStats);
router.post('/', protect, authorize('pharmacy_owner', 'admin'), addInventory);
router.put('/:id', protect, authorize('pharmacy_owner', 'admin'), updateInventory);
router.delete('/:id', protect, authorize('pharmacy_owner', 'admin'), deleteInventory);

module.exports = router;

