const pool = require('../config/db');
const { handleValidation } = require('../middleware/errorHandler');

// GET /customers?search=&status=&customer_type=&page=1&limit=10
async function list(req, res, next) {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 10, 100);
    const offset = (page - 1) * limit;

    const conditions = [];
    const values = [];

    if (req.query.search) {
      values.push(`%${req.query.search}%`);
      conditions.push(
        `(customer_name ILIKE $${values.length} OR mobile_number ILIKE $${values.length} OR business_name ILIKE $${values.length})`
      );
    }
    if (req.query.status) {
      values.push(req.query.status);
      conditions.push(`status = $${values.length}`);
    }
    if (req.query.customer_type) {
      values.push(req.query.customer_type);
      conditions.push(`customer_type = $${values.length}`);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await pool.query(`SELECT COUNT(*) FROM customers ${whereClause}`, values);
    const total = parseInt(countResult.rows[0].count);

    values.push(limit, offset);
    const { rows } = await pool.query(
      `SELECT * FROM customers ${whereClause} ORDER BY created_at DESC LIMIT $${values.length - 1} OFFSET $${values.length}`,
      values
    );

    res.json({
      success: true,
      data: rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
}

// GET /customers/:id  (includes follow-up history)
async function getById(req, res, next) {
  try {
    const { rows } = await pool.query('SELECT * FROM customers WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ success: false, message: 'Customer not found' });

    const followups = await pool.query(
      `SELECT f.*, u.name as created_by_name FROM followups f
       LEFT JOIN users u ON u.id = f.created_by
       WHERE f.customer_id = $1 ORDER BY f.created_at DESC`,
      [req.params.id]
    );

    res.json({ success: true, data: { ...rows[0], followups: followups.rows } });
  } catch (err) {
    next(err);
  }
}

// POST /customers
async function create(req, res, next) {
  if (handleValidation(req, res)) return;
  const {
    customer_name, mobile_number, email, business_name, gst_number,
    customer_type, address, status, follow_up_date, notes,
  } = req.body;

  try {
    const { rows } = await pool.query(
      `INSERT INTO customers
       (customer_name, mobile_number, email, business_name, gst_number, customer_type, address, status, follow_up_date, notes, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [customer_name, mobile_number, email || null, business_name || null, gst_number || null,
       customer_type, address || null, status || 'Lead', follow_up_date || null, notes || null, req.user.id]
    );
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
}

// PUT /customers/:id
async function update(req, res, next) {
  if (handleValidation(req, res)) return;
  const {
    customer_name, mobile_number, email, business_name, gst_number,
    customer_type, address, status, follow_up_date, notes,
  } = req.body;

  try {
    const { rows } = await pool.query(
      `UPDATE customers SET
        customer_name = $1, mobile_number = $2, email = $3, business_name = $4,
        gst_number = $5, customer_type = $6, address = $7, status = $8,
        follow_up_date = $9, notes = $10, updated_at = NOW()
       WHERE id = $11
       RETURNING *`,
      [customer_name, mobile_number, email || null, business_name || null, gst_number || null,
       customer_type, address || null, status, follow_up_date || null, notes || null, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ success: false, message: 'Customer not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
}

// POST /customers/:id/followups
async function addFollowup(req, res, next) {
  if (handleValidation(req, res)) return;
  const { note, follow_up_date } = req.body;

  try {
    const customer = await pool.query('SELECT id FROM customers WHERE id = $1', [req.params.id]);
    if (!customer.rows[0]) return res.status(404).json({ success: false, message: 'Customer not found' });

    const { rows } = await pool.query(
      `INSERT INTO followups (customer_id, note, follow_up_date, created_by)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [req.params.id, note, follow_up_date || null, req.user.id]
    );

    // Keep the customer's headline follow-up date in sync
    if (follow_up_date) {
      await pool.query('UPDATE customers SET follow_up_date = $1, updated_at = NOW() WHERE id = $2', [
        follow_up_date,
        req.params.id,
      ]);
    }

    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getById, create, update, addFollowup };
