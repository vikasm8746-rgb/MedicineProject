const express = require('express');
const router = express.Router();
const {
  getPharmacies,
  getPharmacyById,
  getPharmacyMedicines,
} = require('../controllers/pharmacyController');

router.get('/', getPharmacies);
router.get('/:id', getPharmacyById);
router.get('/:id/medicines', getPharmacyMedicines);

module.exports = router;

