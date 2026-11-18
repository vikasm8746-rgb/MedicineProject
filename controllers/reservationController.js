const { query } = require('../config/database');
const { sendSuccess, sendError, asyncHandler } = require('../utils/helpers');

/**
 * Helper to get the pharmacy owned by a user (with fallback for demo/admin)
 */
const getOwnerPharmacy = async (userId) => {
  let pharmacies = await query('SELECT id, name, address, phone FROM pharmacies WHERE owner_id = ? LIMIT 1', [userId]);
  if (!pharmacies || pharmacies.length === 0) {
    pharmacies = await query('SELECT id, name, address, phone FROM pharmacies LIMIT 1');
  }
  return pharmacies && pharmacies.length > 0 ? pharmacies[0] : null;
};

/**
 * @desc    Create a new medicine reservation request with stock holding deduction
 * @route   POST /api/reservations
 * @access  Private (User or Owner)
 */
const createReservation = asyncHandler(async (req, res) => {
  const { pharmacy_id, medicine_id, quantity = 1, notes = '' } = req.body;
  const userId = req.user.id;

  if (!pharmacy_id || !medicine_id) {
    return sendError(res, 'Please provide both pharmacy_id and medicine_id', 400);
  }

  const reqQty = parseInt(quantity) || 1;
  if (reqQty <= 0) {
    return sendError(res, 'Reservation quantity must be at least 1', 400);
  }

  // Check inventory stock
  const inventoryItems = await query(
    'SELECT * FROM inventory WHERE pharmacy_id = ? AND medicine_id = ?',
    [pharmacy_id, medicine_id]
  );

  if (inventoryItems.length === 0) {
    return sendError(res, 'This medicine is not stocked by the selected pharmacy', 400);
  }

  const inv = inventoryItems[0];
  if (inv.availability_status === 'Out of Stock' || inv.quantity <= 0) {
    return sendError(res, 'This medicine is currently out of stock at this pharmacy', 400);
  }

  if (inv.quantity < reqQty) {
    return sendError(res, `Requested quantity (${reqQty}) exceeds available stock (${inv.quantity})`, 400);
  }

  // Create reservation
  const insertResult = await query(
    `INSERT INTO reservations (user_id, pharmacy_id, medicine_id, quantity, status, notes)
     VALUES (?, ?, ?, ?, 'Pending', ?)`,
    [userId, pharmacy_id, medicine_id, reqQty, notes ? notes.trim() : null]
  );

  const reservationId = insertResult.insertId;

  // Stock Holding: Automatically hold/deduct the quantity from stock
  const remainingQty = Math.max(0, inv.quantity - reqQty);
  let newStatus = 'Available';
  if (remainingQty <= 0) newStatus = 'Out of Stock';
  else if (remainingQty <= 10) newStatus = 'Low Stock';

  await query(
    'UPDATE inventory SET quantity = ?, availability_status = ? WHERE id = ?',
    [remainingQty, newStatus, inv.id]
  );

  // Fetch full reservation record with medicine and pharmacy names
  const fullRecord = await query(`
    SELECT 
      r.*,
      m.name AS medicine_name,
      m.brand_name,
      m.generic_name,
      m.category,
      p.name AS pharmacy_name,
      p.address AS pharmacy_address,
      p.phone AS pharmacy_phone,
      p.opening_hours,
      inv.price
    FROM reservations r
    JOIN medicines m ON r.medicine_id = m.id
    JOIN pharmacies p ON r.pharmacy_id = p.id
    LEFT JOIN inventory inv ON (r.pharmacy_id = inv.pharmacy_id AND r.medicine_id = inv.medicine_id)
    WHERE r.id = ?
  `, [reservationId]);

  return sendSuccess(
    res,
    'Medicine reservation request sent successfully',
    fullRecord[0] || {
      id: reservationId,
      user_id: userId,
      pharmacy_id: parseInt(pharmacy_id),
      medicine_id: parseInt(medicine_id),
      quantity: reqQty,
      status: 'Pending',
      notes,
    },
    201
  );
});

/**
 * @desc    Get user's reservation history
 * @route   GET /api/reservations/my
 * @access  Private (User)
 */
const getMyReservations = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { status } = req.query;

  let sql = `
    SELECT 
      r.*,
      m.name AS medicine_name,
      m.brand_name,
      m.generic_name,
      m.category,
      p.name AS pharmacy_name,
      p.address AS pharmacy_address,
      p.phone AS pharmacy_phone,
      p.opening_hours,
      inv.price
    FROM reservations r
    JOIN medicines m ON r.medicine_id = m.id
    JOIN pharmacies p ON r.pharmacy_id = p.id
    LEFT JOIN inventory inv ON (r.pharmacy_id = inv.pharmacy_id AND r.medicine_id = inv.medicine_id)
    WHERE r.user_id = ?
  `;

  const params = [userId];

  if (status && status !== 'All') {
    sql += ' AND r.status = ?';
    params.push(status);
  }

  sql += ' ORDER BY r.created_at DESC';

  const reservations = await query(sql, params);

  return sendSuccess(res, 'User reservations retrieved successfully', reservations);
});

/**
 * @desc    Get incoming reservations for pharmacy owner
 * @route   GET /api/reservations/pharmacy
 * @access  Private (Pharmacy Owner)
 */
const getPharmacyReservations = asyncHandler(async (req, res) => {
  const { status, pharmacy_id } = req.query;

  let sql = `
    SELECT 
      r.*,
      u.name AS user_name,
      u.email AS user_email,
      u.phone AS user_phone,
      m.name AS medicine_name,
      m.brand_name,
      m.generic_name,
      m.category,
      p.name AS pharmacy_name,
      p.address AS pharmacy_address,
      p.phone AS pharmacy_phone,
      inv.quantity AS in_stock_quantity,
      inv.price
    FROM reservations r
    JOIN users u ON r.user_id = u.id
    JOIN medicines m ON r.medicine_id = m.id
    JOIN pharmacies p ON r.pharmacy_id = p.id
    LEFT JOIN inventory inv ON (r.pharmacy_id = inv.pharmacy_id AND r.medicine_id = inv.medicine_id)
  `;

  const params = [];
  const whereClauses = [];

  if (pharmacy_id && pharmacy_id !== 'all' && parseInt(pharmacy_id) > 0) {
    whereClauses.push('r.pharmacy_id = ?');
    params.push(parseInt(pharmacy_id));
  }

  if (status && status !== 'All') {
    whereClauses.push('r.status = ?');
    params.push(status);
  }

  if (whereClauses.length > 0) {
    sql += ' WHERE ' + whereClauses.join(' AND ');
  }

  sql += ' ORDER BY r.created_at DESC';

  const reservations = await query(sql, params);

  return sendSuccess(res, 'Pharmacy reservation requests retrieved', reservations);
});

/**
 * @desc    Update reservation status (Accept, Reject, Complete) and manage stock holdings
 * @route   PUT /api/reservations/:id/status
 * @access  Private (Pharmacy Owner / Customer)
 */
const updateReservationStatus = asyncHandler(async (req, res) => {
  const reservationId = parseInt(req.params.id);
  const { status } = req.body;

  const validStatuses = ['Pending', 'Accepted', 'Rejected', 'Completed'];
  if (!status || !validStatuses.includes(status)) {
    return sendError(res, `Invalid status. Must be one of: ${validStatuses.join(', ')}`, 400);
  }

  // Verify reservation exists
  let reservations = await query('SELECT * FROM reservations WHERE id = ?', [reservationId]);

  if (!reservations || reservations.length === 0) {
    return sendError(res, 'Reservation request not found', 404);
  }

  const currentRes = reservations[0];
  const oldStatus = currentRes.status;

  // Update status in database
  await query('UPDATE reservations SET status = ? WHERE id = ?', [status, reservationId]);

  // Stock Holdings management:
  // If order is Rejected or Cancelled, restore the held quantity back into inventory stock!
  if (status === 'Rejected' && (oldStatus === 'Pending' || oldStatus === 'Accepted')) {
    const invItems = await query(
      'SELECT * FROM inventory WHERE pharmacy_id = ? AND medicine_id = ?',
      [currentRes.pharmacy_id, currentRes.medicine_id]
    );
    if (invItems.length > 0) {
      const restoredQty = invItems[0].quantity + currentRes.quantity;
      const restoredStatus = restoredQty <= 0 ? 'Out of Stock' : (restoredQty <= 10 ? 'Low Stock' : 'Available');
      await query(
        'UPDATE inventory SET quantity = ?, availability_status = ? WHERE id = ?',
        [restoredQty, restoredStatus, invItems[0].id]
      );
    }
  }

  const updatedReservation = await query(`
    SELECT 
      r.*,
      u.name AS user_name,
      u.phone AS user_phone,
      m.name AS medicine_name,
      p.name AS pharmacy_name,
      p.address AS pharmacy_address,
      p.phone AS pharmacy_phone
    FROM reservations r
    JOIN users u ON r.user_id = u.id
    JOIN medicines m ON r.medicine_id = m.id
    JOIN pharmacies p ON r.pharmacy_id = p.id
    WHERE r.id = ?
  `, [reservationId]);

  return sendSuccess(
    res,
    `Reservation #${reservationId} marked as ${status}`,
    updatedReservation[0] || { ...currentRes, status }
  );
});

module.exports = {
  createReservation,
  getMyReservations,
  getPharmacyReservations,
  updateReservationStatus,
};
