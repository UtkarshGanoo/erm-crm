const pool = require('../config/db');

// GET /dashboard/summary
async function summary(req, res, next) {
  try {
    const [customers, products, lowStock, challansToday, leads] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM customers'),
      pool.query('SELECT COUNT(*) FROM products WHERE is_active = TRUE'),
      pool.query('SELECT COUNT(*) FROM products WHERE current_stock <= min_stock_alert AND is_active = TRUE'),
      pool.query(`SELECT COUNT(*) FROM challans WHERE created_at::date = CURRENT_DATE`),
      pool.query(`SELECT COUNT(*) FROM customers WHERE status = 'Lead'`),
    ]);

    const recentChallans = await pool.query(
      `SELECT c.id, c.challan_number, c.status, c.total_amount, c.created_at, cu.customer_name
       FROM challans c JOIN customers cu ON cu.id = c.customer_id
       ORDER BY c.created_at DESC LIMIT 5`
    );

    res.json({
      success: true,
      data: {
        total_customers: parseInt(customers.rows[0].count),
        total_products: parseInt(products.rows[0].count),
        low_stock_products: parseInt(lowStock.rows[0].count),
        challans_today: parseInt(challansToday.rows[0].count),
        open_leads: parseInt(leads.rows[0].count),
        recent_challans: recentChallans.rows,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { summary };
