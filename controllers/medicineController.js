const { query } = require('../config/database');
const { sendSuccess, sendError, asyncHandler } = require('../utils/helpers');

/**
 * @desc    Get all medicines with optional category filtering and pagination
 * @route   GET /api/medicines
 * @access  Public
 */
const getMedicines = asyncHandler(async (req, res) => {
  const { category, page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  let sql = `
    SELECT 
      m.*,
      COALESCE(COUNT(DISTINCT CASE WHEN i.availability_status IN ('Available', 'Low Stock') THEN i.pharmacy_id END), 0) AS available_pharmacies_count,
      MIN(CASE WHEN i.availability_status IN ('Available', 'Low Stock') THEN i.price ELSE NULL END) AS min_price
    FROM medicines m
    LEFT JOIN inventory i ON m.id = i.medicine_id
  `;

  const params = [];

  if (category && category !== 'All') {
    sql += ' WHERE m.category = ?';
    params.push(category);
  }

  sql += ' GROUP BY m.id ORDER BY m.name ASC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));

  const medicines = await query(sql, params);

  // Get total count for pagination metadata
  let countSql = 'SELECT COUNT(*) as total FROM medicines';
  const countParams = [];
  if (category && category !== 'All') {
    countSql += ' WHERE category = ?';
    countParams.push(category);
  }
  const countResult = await query(countSql, countParams);
  const total = countResult[0]?.total || 0;

  return sendSuccess(res, 'Medicines retrieved successfully', {
    medicines,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit)),
    },
  });
});

/**
 * @desc    Search medicines by name, brand name, or generic name
 * @route   GET /api/medicines/search
 * @access  Public
 */
const searchMedicines = asyncHandler(async (req, res) => {
  const { query: searchQuery } = req.query;

  if (!searchQuery || searchQuery.trim().length === 0) {
    return sendError(res, 'Search query cannot be empty', 400);
  }

  const cleanQuery = searchQuery.trim();
  const searchPattern = `%${cleanQuery}%`;

  // Log search in history if user is logged in
  if (req.user && req.user.id) {
    try {
      await query(
        'INSERT INTO search_history (user_id, search_query) VALUES (?, ?)',
        [req.user.id, cleanQuery]
      );
    } catch (e) {
      console.warn('Failed to log search history:', e.message);
    }
  }

  const sql = `
    SELECT 
      m.*,
      COALESCE(COUNT(DISTINCT CASE WHEN i.availability_status IN ('Available', 'Low Stock') THEN i.pharmacy_id END), 0) AS available_pharmacies_count,
      COALESCE(COUNT(DISTINCT i.pharmacy_id), 0) AS total_pharmacies_stocking,
      MIN(CASE WHEN i.availability_status IN ('Available', 'Low Stock') THEN i.price ELSE NULL END) AS min_price,
      CASE 
        WHEN SUM(CASE WHEN i.availability_status = 'Available' THEN 1 ELSE 0 END) > 0 THEN 'Available'
        WHEN SUM(CASE WHEN i.availability_status = 'Low Stock' THEN 1 ELSE 0 END) > 0 THEN 'Low Stock'
        ELSE 'Out of Stock'
      END AS overall_status
    FROM medicines m
    LEFT JOIN inventory i ON m.id = i.medicine_id
    WHERE m.name LIKE ? OR m.brand_name LIKE ? OR m.generic_name LIKE ? OR m.category LIKE ?
    GROUP BY m.id
    ORDER BY 
      CASE 
        WHEN m.name LIKE ? THEN 1
        WHEN m.brand_name LIKE ? THEN 2
        WHEN m.generic_name LIKE ? THEN 3
        ELSE 4
      END,
      available_pharmacies_count DESC,
      m.name ASC
  `;

  const results = await query(sql, [
    searchPattern,
    searchPattern,
    searchPattern,
    searchPattern,
    `${cleanQuery}%`,
    `${cleanQuery}%`,
    `${cleanQuery}%`,
  ]);

  return sendSuccess(res, `Found ${results.length} medicines matching '${cleanQuery}'`, {
    query: cleanQuery,
    count: results.length,
    medicines: results,
  });
});

/**
 * @desc    Get distinct medicine categories with medicine counts
 * @route   GET /api/medicines/categories
 * @access  Public
 */
const getCategories = asyncHandler(async (req, res) => {
  const categories = await query(`
    SELECT 
      category,
      COUNT(*) AS medicine_count
    FROM medicines
    GROUP BY category
    ORDER BY category ASC
  `);

  return sendSuccess(res, 'Categories retrieved successfully', categories);
});

/**
 * @desc    Get popular / commonly searched medicines
 * @route   GET /api/medicines/popular
 * @access  Public
 */
const getPopularMedicines = asyncHandler(async (req, res) => {
  const sql = `
    SELECT 
      m.*,
      COALESCE(COUNT(DISTINCT CASE WHEN i.availability_status IN ('Available', 'Low Stock') THEN i.pharmacy_id END), 0) AS available_pharmacies_count,
      MIN(CASE WHEN i.availability_status IN ('Available', 'Low Stock') THEN i.price ELSE NULL END) AS min_price
    FROM medicines m
    LEFT JOIN inventory i ON m.id = i.medicine_id
    WHERE m.id IN (1, 2, 3, 4, 5, 6, 10, 11)
    GROUP BY m.id
    ORDER BY available_pharmacies_count DESC, m.name ASC
  `;

  const medicines = await query(sql);

  return sendSuccess(res, 'Popular medicines retrieved', medicines);
});

/**
 * @desc    Get medicine details along with all pharmacies that carry it
 * @route   GET /api/medicines/:id
 * @access  Public
 */
const getMedicineById = asyncHandler(async (req, res) => {
  const medicineId = req.params.id;

  const medicines = await query('SELECT * FROM medicines WHERE id = ?', [medicineId]);

  if (!medicines || medicines.length === 0) {
    return sendError(res, 'Medicine not found', 404);
  }

  const medicine = medicines[0];

  // Fetch pharmacies that stock this medicine with inventory details
  const pharmaciesSql = `
    SELECT 
      p.id AS pharmacy_id,
      p.name AS pharmacy_name,
      p.address AS pharmacy_address,
      p.phone AS pharmacy_phone,
      p.opening_hours,
      i.id AS inventory_id,
      i.quantity,
      i.price,
      i.expiry_date,
      i.availability_status,
      i.updated_at AS last_updated
    FROM inventory i
    JOIN pharmacies p ON i.pharmacy_id = p.id
    WHERE i.medicine_id = ?
    ORDER BY 
      CASE i.availability_status
        WHEN 'Available' THEN 1
        WHEN 'Low Stock' THEN 2
        WHEN 'Out of Stock' THEN 3
        ELSE 4
      END,
      i.price ASC
  `;

  const availablePharmacies = await query(pharmaciesSql, [medicineId]);

  return sendSuccess(res, 'Medicine details retrieved successfully', {
    ...medicine,
    pharmacies: availablePharmacies,
  });
});

module.exports = {
  getMedicines,
  searchMedicines,
  getCategories,
  getPopularMedicines,
  getMedicineById,
};

