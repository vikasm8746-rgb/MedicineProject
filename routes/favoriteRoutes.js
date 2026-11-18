const express = require('express');
const router = express.Router();
const {
  getFavorites,
  toggleFavorite,
  deleteFavorite,
} = require('../controllers/favoriteController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, getFavorites);
router.post('/', protect, toggleFavorite);
router.delete('/:id', protect, deleteFavorite);

module.exports = router;

