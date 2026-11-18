const express = require('express');
const router = express.Router();
const {
  getSearchHistory,
  addSearchHistory,
  deleteSearchHistoryItem,
  clearSearchHistory,
} = require('../controllers/searchHistoryController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, getSearchHistory);
router.post('/', protect, addSearchHistory);
router.delete('/:id', protect, deleteSearchHistoryItem);
router.delete('/', protect, clearSearchHistory);

module.exports = router;

