const pool = require('../config/db');
const { handleValidation } = require('../middleware/errorHandler');

// Generates a unique, sequential challan number like CH-2026-0001
async function generateChallanNumber(client) {
  const year = new Date().getFullYear();
  const { rows } = await client.query(
    `SELECT COUNT(*) FROM challans WHERE challan_number LIKE $1`,
    [`CH-${year}-%`]
  );
  const nextSeq = parseInt(rows[0].count) + 1;
  return `CH-${year}-${String(nextSeq).padStart(4, '0')}`;
}

// GET /challans?search=&status=&customer_id=&page=1&limit=10
async function list(req, res, next) {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 10, 100);
    const offset = (page - 1) * limit;

    const conditions = [];
    const values = [];

    if (req.query.search) {
      values.push(`%${req.query.search}%`);
      conditions.push(`challan_number ILIKE $${values.length}`);
    }
    if (req.query.status) {
      values.push(req.query.status);
      conditions.push(`status = $${values.length}`);
    }
    if (req.query.customer_id) {
      values.push(req.query.customer_id);
      conditions.push(`customer_id = $${values.length}`);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const countResult = await pool.query(`SELECT COUNT(*) FROM challans ${whereClause}`, values);
    const total = parseInt(countResult.rows[0].count);

    values.push(limit, offset);
    const { rows } = await pool.query(
      `SELECT c.*, cu.customer_name, u.name as created_by_name
       FROM challans c
       JOIN customers cu ON cu.id = c.customer_id
       LEFT JOIN users u ON u.id = c.created_by
       ${whereClause.replace(/status/g, 'c.status').replace(/customer_id/g, 'c.customer_id').replace(/challan_number/g, 'c.challan_number')}
       ORDER BY c.created_at DESC LIMIT $${values.length - 1} OFFSET $${values.length}`,
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

// GET /challans/:id
async function getById(req, res, next) {
  try {
    const challanResult = await pool.query(
      `SELECT c.*, cu.customer_name, u.name as created_by_name
       FROM challans c
       JOIN customers cu ON cu.id = c.customer_id
       LEFT JOIN users u ON u.id = c.created_by
       WHERE c.id = $1`,
      [req.params.id]
    );
    if (!challanResult.rows[0]) return res.status(404).json({ success: false, message: 'Challan not found' });

    const items = await pool.query('SELECT * FROM challan_items WHERE challan_id = $1', [req.params.id]);

    res.json({ success: true, data: { ...challanResult.rows[0], items: items.rows } });
  } catch (err) {
    next(err);
  }
}

// POST /challans
// body: { customer_id, status ('Draft'|'Confirmed'), items: [{ product_id, quantity }] }
// Business rules:
//  - challan_number is auto-generated
//  - customer + product data is snapshotted at creation time
//  - if status = Confirmed, stock is reduced immediately and must not go negative
//  - if status = Draft, no stock is touched yet
async function create(req, res, next) {
  if (handleValidation(req, res)) return;
  const { customer_id, items, status } = req.body;
  const finalStatus = status === 'Confirmed' ? 'Confirmed' : 'Draft';

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const customerResult = await client.query('SELECT * FROM customers WHERE id = $1', [customer_id]);
    const customer = customerResult.rows[0];
    if (!customer) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Customer not found' });
    }

    const challanNumber = await generateChallanNumber(client);
    let totalQuantity = 0;
    let totalAmount = 0;
    const preparedItems = [];

    // Validate all products & stock BEFORE writing anything
    for (const item of items) {
      const productResult = await client.query('SELECT * FROM products WHERE id = $1 FOR UPDATE', [item.product_id]);
      const product = productResult.rows[0];
      if (!product) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, message: `Product ${item.product_id} not found` });
      }
      if (!product.is_active) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, message: `Product ${product.product_name} is inactive` });
      }
      if (item.quantity <= 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, message: 'Quantity must be greater than 0' });
      }
      if (finalStatus === 'Confirmed' && product.current_stock < item.quantity) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for "${product.product_name}". Available: ${product.current_stock}, requested: ${item.quantity}.`,
        });
      }

      const lineTotal = Number(product.unit_price) * item.quantity;
      totalQuantity += item.quantity;
      totalAmount += lineTotal;

      preparedItems.push({
        product,
        quantity: item.quantity,
        unit_price: product.unit_price,
        line_total: lineTotal,
      });
    }

    const customerSnapshot = {
      customer_name: customer.customer_name,
      mobile_number: customer.mobile_number,
      business_name: customer.business_name,
      customer_type: customer.customer_type,
      address: customer.address,
    };

    const challanResult = await client.query(
      `INSERT INTO challans (challan_number, customer_id, customer_snapshot, total_quantity, total_amount, status, created_by, confirmed_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
      [
        challanNumber, customer_id, customerSnapshot, totalQuantity, totalAmount, finalStatus,
        req.user.id, finalStatus === 'Confirmed' ? new Date() : null,
      ]
    );
    const challan = challanResult.rows[0];

    for (const pi of preparedItems) {
      const productSnapshot = {
        product_name: pi.product.product_name,
        sku: pi.product.sku,
        unit_price: pi.product.unit_price,
      };

      await client.query(
        `INSERT INTO challan_items (challan_id, product_id, product_snapshot, quantity, unit_price, line_total)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [challan.id, pi.product.id, productSnapshot, pi.quantity, pi.unit_price, pi.line_total]
      );

      // Only reduce stock immediately if the challan is being created as Confirmed
      if (finalStatus === 'Confirmed') {
        await client.query('UPDATE products SET current_stock = current_stock - $1, updated_at = NOW() WHERE id = $2', [
          pi.quantity,
          pi.product.id,
        ]);
        await client.query(
          `INSERT INTO stock_movements (product_id, quantity_changed, movement_type, reason, reference_type, reference_id, created_by)
           VALUES ($1,$2,'OUT','Sales challan confirmed','CHALLAN',$3,$4)`,
          [pi.product.id, pi.quantity, challan.id, req.user.id]
        );
      }
    }

    await client.query('COMMIT');

    const items2 = await pool.query('SELECT * FROM challan_items WHERE challan_id = $1', [challan.id]);
    res.status(201).json({ success: true, data: { ...challan, items: items2.rows } });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

// PATCH /challans/:id/confirm
// Moves a Draft challan to Confirmed, reducing stock at this point.
async function confirm(req, res, next) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const challanResult = await client.query('SELECT * FROM challans WHERE id = $1 FOR UPDATE', [req.params.id]);
    const challan = challanResult.rows[0];
    if (!challan) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Challan not found' });
    }
    if (challan.status !== 'Draft') {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: `Only Draft challans can be confirmed. Current status: ${challan.status}` });
    }

    const itemsResult = await client.query('SELECT * FROM challan_items WHERE challan_id = $1', [req.params.id]);

    // Re-validate stock at confirm time (stock may have changed since draft was created)
    for (const item of itemsResult.rows) {
      const productResult = await client.query('SELECT * FROM products WHERE id = $1 FOR UPDATE', [item.product_id]);
      const product = productResult.rows[0];
      if (!product || product.current_stock < item.quantity) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for "${item.product_snapshot.product_name}". Available: ${product ? product.current_stock : 0}, required: ${item.quantity}.`,
        });
      }
    }

    for (const item of itemsResult.rows) {
      await client.query('UPDATE products SET current_stock = current_stock - $1, updated_at = NOW() WHERE id = $2', [
        item.quantity,
        item.product_id,
      ]);
      await client.query(
        `INSERT INTO stock_movements (product_id, quantity_changed, movement_type, reason, reference_type, reference_id, created_by)
         VALUES ($1,$2,'OUT','Sales challan confirmed','CHALLAN',$3,$4)`,
        [item.product_id, item.quantity, challan.id, req.user.id]
      );
    }

    const updated = await client.query(
      `UPDATE challans SET status = 'Confirmed', confirmed_at = NOW() WHERE id = $1 RETURNING *`,
      [req.params.id]
    );

    await client.query('COMMIT');
    res.json({ success: true, data: updated.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

// PATCH /challans/:id/cancel
// Cancels a challan. If it was Confirmed, stock is restored (reversal movement logged).
async function cancel(req, res, next) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const challanResult = await client.query('SELECT * FROM challans WHERE id = $1 FOR UPDATE', [req.params.id]);
    const challan = challanResult.rows[0];
    if (!challan) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Challan not found' });
    }
    if (challan.status === 'Cancelled') {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Challan is already cancelled' });
    }

    if (challan.status === 'Confirmed') {
      const itemsResult = await client.query('SELECT * FROM challan_items WHERE challan_id = $1', [req.params.id]);
      for (const item of itemsResult.rows) {
        await client.query('UPDATE products SET current_stock = current_stock + $1, updated_at = NOW() WHERE id = $2', [
          item.quantity,
          item.product_id,
        ]);
        await client.query(
          `INSERT INTO stock_movements (product_id, quantity_changed, movement_type, reason, reference_type, reference_id, created_by)
           VALUES ($1,$2,'IN','Challan cancelled - stock reversed','CHALLAN',$3,$4)`,
          [item.product_id, item.quantity, challan.id, req.user.id]
        );
      }
    }

    const updated = await client.query(`UPDATE challans SET status = 'Cancelled' WHERE id = $1 RETURNING *`, [
      req.params.id,
    ]);

    await client.query('COMMIT');
    res.json({ success: true, data: updated.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

module.exports = { list, getById, create, confirm, cancel };
