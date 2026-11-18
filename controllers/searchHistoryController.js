const { query } = require('../config/database');
const { sendSuccess, sendError, asyncHandler } = require('../utils/helpers');

/**
 * @desc    Get search history for current user
 * @route   GET /api/search-history
 * @access  Private (User)
 */
const getSearchHistory = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const history = await query(`
    SELECT 
      id,
      search_query,
      searched_at
    FROM search_history
    WHERE user_id = ?
    ORDER BY searched_at DESC
    LIMIT 30
  `, [userId]);

  return sendSuccess(res, 'Search history retrieved', history);
});

/**
 * @desc    Add a search term to history
 * @route   POST /api/search-history
 * @access  Private (User)
 */
const addSearchHistory = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { search_query } = req.body;

  if (!search_query || search_query.trim().length === 0) {
    return sendError(res, 'Search query cannot be empty', 400);
  }

  const cleanQuery = search_query.trim();

  // Insert search record
  const result = await query(
    'INSERT INTO search_history (user_id, search_query) VALUES (?, ?)',
    [userId, cleanQuery]
  );

  return sendSuccess(res, 'Search query saved', {
    id: result.insertId,
    search_query: cleanQuery,
    searched_at: new Date(),
  }, 201);
});

/**
 * @desc    Delete single search history item
 * @route   DELETE /api/search-history/:id
 * @access  Private (User)
 */
const deleteSearchHistoryItem = asyncHandler(async (req, res) => {
  const historyId = req.params.id;
  const userId = req.user.id;

  const existing = await query(
    'SELECT id FROM search_history WHERE id = ? AND user_id = ?',
    [historyId, userId]
  );

  if (!existing || existing.length === 0) {
    return sendError(res, 'Search history item not found', 404);
  }

  await query('DELETE FROM search_history WHERE id = ?', [historyId]);

  return sendSuccess(res, 'Search item deleted successfully');
});

/**
 * @desc    Clear all search history for current user
 * @route   DELETE /api/search-history
 * @access  Private (User)
 */
const clearSearchHistory = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  await query('DELETE FROM search_history WHERE user_id = ?', [userId]);

  return sendSuccess(res, 'All search history cleared successfully');
});

module.exports = {
  getSearchHistory,
  addSearchHistory,
  deleteSearchHistoryItem,
  clearSearchHistory,
};

