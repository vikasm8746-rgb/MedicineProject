const express = require('express');
const router = express.Router();
const {
  getMedicines,
  searchMedicines,
  getCategories,
  getPopularMedicines,
  getMedicineById,
} = require('../controllers/medicineController');
const { optionalAuth } = require('../middleware/authMiddleware');

router.get('/', getMedicines);
router.get('/search', optionalAuth, searchMedicines);
router.get('/categories', getCategories);
router.get('/popular', getPopularMedicines);
router.get('/:id', getMedicineById);

module.exports = router;

