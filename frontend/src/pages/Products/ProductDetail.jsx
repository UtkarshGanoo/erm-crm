import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { productApi } from '../../api/services';
import Alert from '../../components/Alert';
import { useAuth } from '../../context/AuthContext';

export default function ProductDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [product, setProduct] = useState(null);
  const [movements, setMovements] = useState([]);
  const [form, setForm] = useState({ quantity_changed: '', movement_type: 'IN', reason: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const canAdjust = ['admin', 'warehouse'].includes(user?.role);
  const canEdit = ['admin', 'warehouse'].includes(user?.role);

  function load() {
    productApi.get(id).then((res) => setProduct(res.data.data));
    productApi.getStockMovements(id).then((res) => setMovements(res.data.data));
  }

  useEffect(load, [id]);

  async function handleAdjust(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await productApi.addStockMovement(id, {
        quantity_changed: parseInt(form.quantity_changed),
        movement_type: form.movement_type,
        reason: form.reason,
      });
      setForm({ quantity_changed: '', movement_type: 'IN', reason: '' });
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to record stock movement');
    } finally {
      setSaving(false);
    }
  }

  if (!product) return <p className="text-slate-400">Loading...</p>;

  const isLow = product.current_stock <= product.min_stock_alert;

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{product.product_name}</h1>
          <p className="text-slate-500">SKU: {product.sku}</p>
        </div>
        {canEdit && (
          <Link to={`/products/${id}/edit`} className="btn-secondary">
            Edit
          </Link>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="card p-5">
          <p className="text-sm text-slate-400">Current Stock</p>
          <p className={`text-3xl font-bold mt-1 ${isLow ? 'text-red-600' : 'text-slate-900'}`}>
            {product.current_stock}
          </p>
          {isLow && <p className="text-xs text-red-600 mt-1">Below minimum alert level ({product.min_stock_alert})</p>}
        </div>
        <div className="card p-5">
          <p className="text-sm text-slate-400">Unit Price</p>
          <p className="text-3xl font-bold mt-1 text-slate-900">₹{Number(product.unit_price).toFixed(2)}</p>
        </div>
      </div>

      <div className="card p-5 mb-6">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-slate-400">Category</p>
            <p className="font-medium text-slate-800">{product.category || '—'}</p>
          </div>
          <div>
            <p className="text-slate-400">Warehouse Location</p>
            <p className="font-medium text-slate-800">{product.warehouse_location || '—'}</p>
          </div>
        </div>
      </div>

      {canAdjust && (
        <div className="card p-5 mb-6">
          <h2 className="font-semibold text-slate-800 mb-4">Adjust Stock</h2>
          <Alert message={error} />
          <form onSubmit={handleAdjust} className="grid grid-cols-4 gap-3 items-end">
            <div>
              <label className="label">Type</label>
              <select
                className="input"
                value={form.movement_type}
                onChange={(e) => setForm({ ...form, movement_type: e.target.value })}
              >
                <option value="IN">IN</option>
                <option value="OUT">OUT</option>
              </select>
            </div>
            <div>
              <label className="label">Quantity</label>
              <input
                className="input"
                type="number"
                min="1"
                required
                value={form.quantity_changed}
                onChange={(e) => setForm({ ...form, quantity_changed: e.target.value })}
              />
            </div>
            <div className="col-span-2">
              <label className="label">Reason</label>
              <input
                className="input"
                required
                placeholder="e.g. Damaged goods, Purchase received..."
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
              />
            </div>
            <div className="col-span-4">
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? 'Saving...' : 'Record Movement'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card p-5">
        <h2 className="font-semibold text-slate-800 mb-4">Stock Movement Log</h2>
        {movements.length === 0 ? (
          <p className="text-sm text-slate-400">No stock movements recorded yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-100">
                <th className="py-2 font-medium">Type</th>
                <th className="py-2 font-medium">Qty</th>
                <th className="py-2 font-medium">Reason</th>
                <th className="py-2 font-medium">By</th>
                <th className="py-2 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((m) => (
                <tr key={m.id} className="border-b border-slate-50 last:border-0">
                  <td className="py-2.5">
                    <span className={`badge ${m.movement_type === 'IN' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {m.movement_type}
                    </span>
                  </td>
                  <td className="py-2.5">{m.quantity_changed}</td>
                  <td className="py-2.5">{m.reason}</td>
                  <td className="py-2.5">{m.created_by_name || '—'}</td>
                  <td className="py-2.5 text-slate-500">{new Date(m.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
