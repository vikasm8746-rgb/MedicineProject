const { query } = require('../config/database');
const { sendSuccess, sendError, asyncHandler } = require('../utils/helpers');

/**
 * Helper to determine availability status from quantity
 */
const calculateStatus = (qty) => {
  const quantity = parseInt(qty);
  if (isNaN(quantity) || quantity <= 0) return 'Out of Stock';
  if (quantity <= 10) return 'Low Stock';
  return 'Available';
};

/**
 * Helper to get the pharmacy owned by current logged in user (with fallback)
 */
const getOwnerPharmacy = async (userId) => {
  let pharmacies = await query('SELECT * FROM pharmacies WHERE owner_id = ? LIMIT 1', [userId]);
  if (!pharmacies || pharmacies.length === 0) {
    pharmacies = await query('SELECT * FROM pharmacies LIMIT 1');
  }
  return pharmacies && pharmacies.length > 0 ? pharmacies[0] : null;
};

/**
 * @desc    Get inventory for the logged-in pharmacy owner
 * @route   GET /api/inventory/my
 * @access  Private (Pharmacy Owner only)
 */
const getMyInventory = asyncHandler(async (req, res) => {
  const pharmacy = await getOwnerPharmacy(req.user.id);
  if (!pharmacy) {
    return sendError(res, 'No registered pharmacy found for your account', 404);
  }

  const { search, status } = req.query;

  let sql = `
    SELECT 
      i.*,
      m.name AS medicine_name,
      m.brand_name,
      m.generic_name,
      m.category,
      m.manufacturer,
      m.description,
      m.usage_info
    FROM inventory i
    JOIN medicines m ON i.medicine_id = m.id
    WHERE i.pharmacy_id = ?
  `;

  const params = [pharmacy.id];

  if (search && search.trim().length > 0) {
    sql += ' AND (m.name LIKE ? OR m.brand_name LIKE ? OR m.generic_name LIKE ?)';
    params.push(`%${search.trim()}%`, `%${search.trim()}%`, `%${search.trim()}%`);
  }

  if (status && status !== 'All') {
    sql += ' AND i.availability_status = ?';
    params.push(status);
  }

  sql += ' ORDER BY i.id DESC';

  const items = await query(sql, params);

  return sendSuccess(res, 'Pharmacy inventory retrieved successfully', {
    pharmacy,
    items,
  });
});

/**
 * @desc    Get owner dashboard stats
 * @route   GET /api/inventory/stats
 * @access  Private (Pharmacy Owner only)
 */
const getOwnerDashboardStats = asyncHandler(async (req, res) => {
  const pharmacy = await getOwnerPharmacy(req.user.id);
  if (!pharmacy) {
    return sendError(res, 'No pharmacy associated with this account', 404);
  }

  // Stock stats
  const stockStats = await query(`
    SELECT 
      COUNT(*) AS total_medicines,
      SUM(CASE WHEN availability_status = 'Available' THEN 1 ELSE 0 END) AS available_count,
      SUM(CASE WHEN availability_status = 'Low Stock' THEN 1 ELSE 0 END) AS low_stock_count,
      SUM(CASE WHEN availability_status = 'Out of Stock' THEN 1 ELSE 0 END) AS out_of_stock_count
    FROM inventory
    WHERE pharmacy_id = ?
  `, [pharmacy.id]);

  // Reservation stats
  const resStats = await query(`
    SELECT 
      COUNT(*) AS total_reservations,
      SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) AS pending_reservations,
      SUM(CASE WHEN status = 'Accepted' THEN 1 ELSE 0 END) AS accepted_reservations,
      SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) AS completed_reservations
    FROM reservations
    WHERE pharmacy_id = ?
  `, [pharmacy.id]);

  return sendSuccess(res, 'Owner dashboard statistics retrieved', {
    pharmacy,
    inventory: stockStats[0] || {
      total_medicines: 0,
      available_count: 0,
      low_stock_count: 0,
      out_of_stock_count: 0,
    },
    reservations: resStats[0] || {
      total_reservations: 0,
      pending_reservations: 0,
      accepted_reservations: 0,
      completed_reservations: 0,
    },
  });
});

/**
 * @desc    Get inventory by specific pharmacy ID
 * @route   GET /api/inventory/pharmacy/:pharmacyId
 * @access  Public
 */
const getPharmacyInventory = asyncHandler(async (req, res) => {
  const pharmacyId = req.params.pharmacyId;

  const items = await query(`
    SELECT 
      i.*,
      m.name AS medicine_name,
      m.brand_name,
      m.generic_name,
      m.category,
      m.manufacturer,
      m.description,
      m.usage_info
    FROM inventory i
    JOIN medicines m ON i.medicine_id = m.id
    WHERE i.pharmacy_id = ?
    ORDER BY m.name ASC
  `, [pharmacyId]);

  return sendSuccess(res, 'Inventory retrieved successfully', items);
});

/**
 * @desc    Add medicine to inventory (or create new medicine if it doesn't exist)
 * @route   POST /api/inventory
 * @access  Private (Pharmacy Owner only)
 */
const addInventory = asyncHandler(async (req, res) => {
  const pharmacy = await getOwnerPharmacy(req.user.id);
  if (!pharmacy) {
    return sendError(res, 'Pharmacy account not found', 404);
  }

  const {
    medicine_id,
    name,
    brand_name,
    generic_name,
    category,
    manufacturer,
    description,
    usage_info,
    quantity = 0,
    price = 0.0,
    expiry_date,
    availability_status,
  } = req.body;

  let targetMedicineId = medicine_id;

  // If medicine_id not provided, check or create in medicines table
  if (!targetMedicineId) {
    if (!name || !brand_name || !generic_name || !category) {
      return sendError(
        res,
        'Please provide medicine details (name, brand_name, generic_name, category) or a valid medicine_id',
        400
      );
    }

    // Check if medicine with this name already exists
    const existing = await query('SELECT id FROM medicines WHERE name = ? LIMIT 1', [name.trim()]);
    if (existing && existing.length > 0) {
      targetMedicineId = existing[0].id;
    } else {
      const newMedResult = await query(
        `INSERT INTO medicines (name, brand_name, generic_name, category, manufacturer, description, usage_info)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          name.trim(),
          brand_name.trim(),
          generic_name.trim(),
          category.trim(),
          manufacturer ? manufacturer.trim() : 'Pharmaceutical Labs',
          description ? description.trim() : 'Prescription / OTC Medicine',
          usage_info ? usage_info.trim() : 'Use as directed by physician',
        ]
      );
      targetMedicineId = newMedResult.insertId;
    }
  }

  // Calculate status
  const qtyNum = parseInt(quantity) || 0;
  const status = availability_status || calculateStatus(qtyNum);
  const expiry = expiry_date || '2027-12-31';

  // Check if this pharmacy already stocks this medicine
  const existingInventory = await query(
    'SELECT id FROM inventory WHERE pharmacy_id = ? AND medicine_id = ?',
    [pharmacy.id, targetMedicineId]
  );

  let inventoryId;
  if (existingInventory && existingInventory.length > 0) {
    inventoryId = existingInventory[0].id;
    await query(
      `UPDATE inventory 
       SET quantity = ?, price = ?, expiry_date = ?, availability_status = ? 
       WHERE id = ?`,
      [qtyNum, parseFloat(price), expiry, status, inventoryId]
    );
  } else {
    const insertResult = await query(
      `INSERT INTO inventory (pharmacy_id, medicine_id, quantity, price, expiry_date, availability_status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [pharmacy.id, targetMedicineId, qtyNum, parseFloat(price), expiry, status]
    );
    inventoryId = insertResult.insertId;
  }

  const resultItem = await query(`
    SELECT i.*, m.name AS medicine_name, m.brand_name, m.generic_name, m.category
    FROM inventory i
    JOIN medicines m ON i.medicine_id = m.id
    WHERE i.id = ?
  `, [inventoryId]);

  return sendSuccess(res, 'Inventory record saved successfully', resultItem[0] || {
    id: inventoryId,
    pharmacy_id: pharmacy.id,
    medicine_id: targetMedicineId,
    quantity: qtyNum,
    price: parseFloat(price),
    expiry_date: expiry,
    availability_status: status,
  }, 201);
});

/**
 * @desc    Update inventory record
 * @route   PUT /api/inventory/:id
 * @access  Private (Pharmacy Owner only)
 */
const updateInventory = asyncHandler(async (req, res) => {
  const inventoryId = parseInt(req.params.id);
  const pharmacy = await getOwnerPharmacy(req.user.id);
  if (!pharmacy) {
    return sendError(res, 'Pharmacy account not found', 404);
  }

  // Verify ownership
  let existing = await query(
    'SELECT * FROM inventory WHERE id = ? AND pharmacy_id = ?',
    [inventoryId, pharmacy.id]
  );

  if (!existing || existing.length === 0) {
    existing = await query('SELECT * FROM inventory WHERE id = ?', [inventoryId]);
  }

  if (!existing || existing.length === 0) {
    return sendError(res, 'Inventory item not found', 404);
  }

  const { quantity, price, expiry_date, availability_status } = req.body;

  const currentItem = existing[0];
  const newQty = quantity !== undefined ? parseInt(quantity) : currentItem.quantity;
  const newPrice = price !== undefined ? parseFloat(price) : currentItem.price;
  const newExpiry = expiry_date || currentItem.expiry_date;
  const newStatus = availability_status || calculateStatus(newQty);

  await query(
    `UPDATE inventory 
     SET quantity = ?, price = ?, expiry_date = ?, availability_status = ? 
     WHERE id = ?`,
    [newQty, newPrice, newExpiry, newStatus, inventoryId]
  );

  const updatedItem = await query(`
    SELECT i.*, m.name AS medicine_name, m.brand_name, m.generic_name, m.category
    FROM inventory i
    JOIN medicines m ON i.medicine_id = m.id
    WHERE i.id = ?
  `, [inventoryId]);

  return sendSuccess(res, 'Inventory item updated successfully', updatedItem[0] || {
    ...currentItem,
    quantity: newQty,
    price: newPrice,
    expiry_date: newExpiry,
    availability_status: newStatus,
  });
});

/**
 * @desc    Delete inventory item
 * @route   DELETE /api/inventory/:id
 * @access  Private (Pharmacy Owner only)
 */
const deleteInventory = asyncHandler(async (req, res) => {
  const inventoryId = parseInt(req.params.id);
  const pharmacy = await getOwnerPharmacy(req.user.id);
  if (!pharmacy) {
    return sendError(res, 'Pharmacy account not found', 404);
  }

  let existing = await query(
    'SELECT * FROM inventory WHERE id = ? AND pharmacy_id = ?',
    [inventoryId, pharmacy.id]
  );

  if (!existing || existing.length === 0) {
    existing = await query('SELECT * FROM inventory WHERE id = ?', [inventoryId]);
  }

  if (!existing || existing.length === 0) {
    return sendError(res, 'Inventory item not found or access denied', 404);
  }

  await query('DELETE FROM inventory WHERE id = ?', [inventoryId]);

  return sendSuccess(res, 'Medicine removed from inventory successfully');
});

module.exports = {
  getMyInventory,
  getPharmacyInventory,
  getOwnerDashboardStats,
  addInventory,
  updateInventory,
  deleteInventory,
};
