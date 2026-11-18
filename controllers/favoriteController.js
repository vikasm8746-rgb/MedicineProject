const { query } = require('../config/database');
const { sendSuccess, sendError, asyncHandler } = require('../utils/helpers');

/**
 * @desc    Get user's favorite medicines and pharmacies
 * @route   GET /api/favorites
 * @access  Private (User)
 */
const getFavorites = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  // Favorite medicines
  const medicines = await query(`
    SELECT 
      f.id AS favorite_id,
      f.created_at AS saved_at,
      m.*,
      COALESCE(COUNT(DISTINCT CASE WHEN i.availability_status IN ('Available', 'Low Stock') THEN i.pharmacy_id END), 0) AS available_pharmacies_count,
      MIN(CASE WHEN i.availability_status IN ('Available', 'Low Stock') THEN i.price ELSE NULL END) AS min_price
    FROM favorites f
    JOIN medicines m ON f.medicine_id = m.id
    LEFT JOIN inventory i ON m.id = i.medicine_id
    WHERE f.user_id = ? AND f.medicine_id IS NOT NULL
    GROUP BY f.id, m.id
    ORDER BY f.created_at DESC
  `, [userId]);

  // Favorite pharmacies
  const pharmacies = await query(`
    SELECT 
      f.id AS favorite_id,
      f.created_at AS saved_at,
      p.*,
      COUNT(DISTINCT i.medicine_id) AS total_medicines,
      SUM(CASE WHEN i.availability_status = 'Available' THEN 1 ELSE 0 END) AS available_medicines
    FROM favorites f
    JOIN pharmacies p ON f.pharmacy_id = p.id
    LEFT JOIN inventory i ON p.id = i.pharmacy_id
    WHERE f.user_id = ? AND f.pharmacy_id IS NOT NULL
    GROUP BY f.id, p.id
    ORDER BY f.created_at DESC
  `, [userId]);

  return sendSuccess(res, 'Favorites retrieved successfully', {
    medicines,
    pharmacies,
    counts: {
      medicines: medicines.length,
      pharmacies: pharmacies.length,
      total: medicines.length + pharmacies.length,
    },
  });
});

/**
 * @desc    Toggle or add favorite medicine or pharmacy
 * @route   POST /api/favorites
 * @access  Private (User)
 */
const toggleFavorite = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { medicine_id, pharmacy_id } = req.body;

  if (!medicine_id && !pharmacy_id) {
    return sendError(res, 'Please provide either medicine_id or pharmacy_id', 400);
  }

  if (medicine_id) {
    const existing = await query(
      'SELECT id FROM favorites WHERE user_id = ? AND medicine_id = ?',
      [userId, medicine_id]
    );

    if (existing.length > 0) {
      await query('DELETE FROM favorites WHERE id = ?', [existing[0].id]);
      return sendSuccess(res, 'Medicine removed from favorites', { isFavorite: false });
    } else {
      const result = await query(
        'INSERT INTO favorites (user_id, medicine_id) VALUES (?, ?)',
        [userId, medicine_id]
      );
      return sendSuccess(res, 'Medicine added to favorites', { isFavorite: true, id: result.insertId }, 201);
    }
  }

  if (pharmacy_id) {
    const existing = await query(
      'SELECT id FROM favorites WHERE user_id = ? AND pharmacy_id = ?',
      [userId, pharmacy_id]
    );

    if (existing.length > 0) {
      await query('DELETE FROM favorites WHERE id = ?', [existing[0].id]);
      return sendSuccess(res, 'Pharmacy removed from favorites', { isFavorite: false });
    } else {
      const result = await query(
        'INSERT INTO favorites (user_id, pharmacy_id) VALUES (?, ?)',
        [userId, pharmacy_id]
      );
      return sendSuccess(res, 'Pharmacy added to favorites', { isFavorite: true, id: result.insertId }, 201);
    }
  }
});

/**
 * @desc    Remove favorite by ID
 * @route   DELETE /api/favorites/:id
 * @access  Private (User)
 */
const deleteFavorite = asyncHandler(async (req, res) => {
  const favoriteId = req.params.id;
  const userId = req.user.id;

  const existing = await query(
    'SELECT id FROM favorites WHERE id = ? AND user_id = ?',
    [favoriteId, userId]
  );

  if (!existing || existing.length === 0) {
    return sendError(res, 'Favorite item not found', 404);
  }

  await query('DELETE FROM favorites WHERE id = ?', [favoriteId]);

  return sendSuccess(res, 'Item removed from favorites successfully');
});

module.exports = {
  getFavorites,
  toggleFavorite,
  deleteFavorite,
};

