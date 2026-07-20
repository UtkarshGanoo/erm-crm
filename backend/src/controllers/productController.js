const pool = require('../config/db');
const { handleValidation } = require('../middleware/errorHandler');

// GET /products?search=&category=&low_stock=true&page=1&limit=10
async function list(req, res, next) {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 10, 100);
    const offset = (page - 1) * limit;

    const conditions = ['is_active = TRUE'];
    const values = [];

    if (req.query.search) {
      values.push(`%${req.query.search}%`);
      conditions.push(`(product_name ILIKE $${values.length} OR sku ILIKE $${values.length})`);
    }
    if (req.query.category) {
      values.push(req.query.category);
      conditions.push(`category = $${values.length}`);
    }
    if (req.query.low_stock === 'true') {
      conditions.push(`current_stock <= min_stock_alert`);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const countResult = await pool.query(`SELECT COUNT(*) FROM products ${whereClause}`, values);
    const total = parseInt(countResult.rows[0].count);

    values.push(limit, offset);
    const { rows } = await pool.query(
      `SELECT * FROM products ${whereClause} ORDER BY created_at DESC LIMIT $${values.length - 1} OFFSET $${values.length}`,
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

// GET /products/:id
async function getById(req, res, next) {
  try {
    const { rows } = await pool.query('SELECT * FROM products WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
}

// POST /products
async function create(req, res, next) {
  if (handleValidation(req, res)) return;
  const { product_name, sku, category, unit_price, current_stock, min_stock_alert, warehouse_location, image_url } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      `INSERT INTO products
       (product_name, sku, category, unit_price, current_stock, min_stock_alert, warehouse_location, image_url, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [product_name, sku, category || null, unit_price, current_stock || 0, min_stock_alert || 0,
       warehouse_location || null, image_url || null, req.user.id]
    );

    // If opening stock was provided, log it as an IN movement
    if (current_stock && current_stock > 0) {
      await client.query(
        `INSERT INTO stock_movements (product_id, quantity_changed, movement_type, reason, reference_type, created_by)
         VALUES ($1,$2,'IN','Opening stock','MANUAL',$3)`,
        [rows[0].id, current_stock, req.user.id]
      );
    }

    await client.query('COMMIT');
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

// PUT /products/:id
async function update(req, res, next) {
  if (handleValidation(req, res)) return;
  const { product_name, sku, category, unit_price, min_stock_alert, warehouse_location, image_url } = req.body;

  try {
    // Note: current_stock is NOT editable directly here - it only changes via
    // the /stock-movement endpoint so every change is auditable.
    const { rows } = await pool.query(
      `UPDATE products SET
        product_name = $1, sku = $2, category = $3, unit_price = $4,
        min_stock_alert = $5, warehouse_location = $6, image_url = $7, updated_at = NOW()
       WHERE id = $8 AND is_active = TRUE
       RETURNING *`,
      [product_name, sku, category || null, unit_price, min_stock_alert || 0, warehouse_location || null, image_url || null, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
}

// POST /products/:id/stock-movement  { quantity_changed, movement_type, reason }
async function addStockMovement(req, res, next) {
  if (handleValidation(req, res)) return;
  const { quantity_changed, movement_type, reason } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const productResult = await client.query('SELECT * FROM products WHERE id = $1 FOR UPDATE', [req.params.id]);
    const product = productResult.rows[0];
    if (!product) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const newStock =
      movement_type === 'IN'
        ? product.current_stock + quantity_changed
        : product.current_stock - quantity_changed;

    if (newStock < 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: `Insufficient stock. Current stock is ${product.current_stock}, cannot remove ${quantity_changed}.`,
      });
    }

    await client.query('UPDATE products SET current_stock = $1, updated_at = NOW() WHERE id = $2', [
      newStock,
      req.params.id,
    ]);

    const { rows } = await client.query(
      `INSERT INTO stock_movements (product_id, quantity_changed, movement_type, reason, reference_type, created_by)
       VALUES ($1,$2,$3,$4,'MANUAL',$5) RETURNING *`,
      [req.params.id, quantity_changed, movement_type, reason, req.user.id]
    );

    await client.query('COMMIT');
    res.status(201).json({ success: true, data: { movement: rows[0], new_stock: newStock } });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

// GET /products/:id/stock-movements
async function getStockMovements(req, res, next) {
  try {
    const { rows } = await pool.query(
      `SELECT sm.*, u.name as created_by_name FROM stock_movements sm
       LEFT JOIN users u ON u.id = sm.created_by
       WHERE sm.product_id = $1 ORDER BY sm.created_at DESC`,
      [req.params.id]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getById, create, update, addStockMovement, getStockMovements };
