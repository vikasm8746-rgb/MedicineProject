const { query } = require('../config/database');
const { sendSuccess, sendError, asyncHandler } = require('../utils/helpers');

/**
 * @desc    Get all pharmacies with search filter
 * @route   GET /api/pharmacies
 * @access  Public
 */
const getPharmacies = asyncHandler(async (req, res) => {
  const { search } = req.query;

  let sql = `
    SELECT 
      p.*,
      u.name AS owner_name,
      COUNT(DISTINCT i.medicine_id) AS total_medicines,
      SUM(CASE WHEN i.availability_status = 'Available' THEN 1 ELSE 0 END) AS available_medicines,
      SUM(CASE WHEN i.availability_status = 'Low Stock' THEN 1 ELSE 0 END) AS low_stock_medicines
    FROM pharmacies p
    JOIN users u ON p.owner_id = u.id
    LEFT JOIN inventory i ON p.id = i.pharmacy_id
  `;

  const params = [];

  if (search && search.trim().length > 0) {
    sql += ' WHERE p.name LIKE ? OR p.address LIKE ?';
    params.push(`%${search.trim()}%`, `%${search.trim()}%`);
  }

  sql += ' GROUP BY p.id ORDER BY p.name ASC';

  const pharmacies = await query(sql, params);

  return sendSuccess(res, 'Pharmacies retrieved successfully', pharmacies);
});

/**
 * @desc    Get pharmacy details by ID
 * @route   GET /api/pharmacies/:id
 * @access  Public
 */
const getPharmacyById = asyncHandler(async (req, res) => {
  const pharmacyId = req.params.id;

  const sql = `
    SELECT 
      p.*,
      u.name AS owner_name,
      u.email AS owner_email,
      COUNT(DISTINCT i.medicine_id) AS total_medicines,
      SUM(CASE WHEN i.availability_status = 'Available' THEN 1 ELSE 0 END) AS available_medicines,
      SUM(CASE WHEN i.availability_status = 'Low Stock' THEN 1 ELSE 0 END) AS low_stock_medicines,
      SUM(CASE WHEN i.availability_status = 'Out of Stock' THEN 1 ELSE 0 END) AS out_of_stock_medicines
    FROM pharmacies p
    JOIN users u ON p.owner_id = u.id
    LEFT JOIN inventory i ON p.id = i.pharmacy_id
    WHERE p.id = ?
    GROUP BY p.id
  `;

  const pharmacies = await query(sql, [pharmacyId]);

  if (!pharmacies || pharmacies.length === 0) {
    return sendError(res, 'Pharmacy not found', 404);
  }

  return sendSuccess(res, 'Pharmacy details retrieved successfully', pharmacies[0]);
});

/**
 * @desc    Get all medicines available at a specific pharmacy
 * @route   GET /api/pharmacies/:id/medicines
 * @access  Public
 */
const getPharmacyMedicines = asyncHandler(async (req, res) => {
  const pharmacyId = req.params.id;
  const { status, category } = req.query;

  let sql = `
    SELECT 
      m.id AS medicine_id,
      m.name,
      m.brand_name,
      m.generic_name,
      m.category,
      m.manufacturer,
      m.description,
      m.usage_info,
      i.id AS inventory_id,
      i.quantity,
      i.price,
      i.expiry_date,
      i.availability_status,
      i.updated_at
    FROM inventory i
    JOIN medicines m ON i.medicine_id = m.id
    WHERE i.pharmacy_id = ?
  `;

  const params = [pharmacyId];

  if (status && status !== 'All') {
    sql += ' AND i.availability_status = ?';
    params.push(status);
  }

  if (category && category !== 'All') {
    sql += ' AND m.category = ?';
    params.push(category);
  }

  sql += ' ORDER BY m.name ASC';

  const medicines = await query(sql, params);

  return sendSuccess(res, 'Pharmacy inventory medicines retrieved', medicines);
});

module.exports = {
  getPharmacies,
  getPharmacyById,
  getPharmacyMedicines,
};

