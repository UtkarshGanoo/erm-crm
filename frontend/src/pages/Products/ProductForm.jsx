import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { productApi } from '../../api/services';
import Alert from '../../components/Alert';

const emptyForm = {
  product_name: '', sku: '', category: '', unit_price: '', current_stock: 0,
  min_stock_alert: 0, warehouse_location: '', image_url: '',
};

export default function ProductForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);

  useEffect(() => {
    if (!isEdit) return;
    productApi.get(id).then((res) => {
      setForm({ ...emptyForm, ...res.data.data });
      setLoading(false);
    });
  }, [id, isEdit]);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setFieldErrors({});
    try {
      const payload = {
        ...form,
        unit_price: parseFloat(form.unit_price) || 0,
        current_stock: parseInt(form.current_stock) || 0,
        min_stock_alert: parseInt(form.min_stock_alert) || 0,
      };
      if (isEdit) {
        await productApi.update(id, payload);
      } else {
        await productApi.create(payload);
      }
      navigate('/products');
    } catch (err) {
      const res = err.response?.data;
      setError(res?.message || 'Something went wrong. Please try again.');
      if (res?.errors) {
        const map = {};
        res.errors.forEach((e) => (map[e.field] = e.message));
        setFieldErrors(map);
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-slate-400">Loading...</p>;

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">{isEdit ? 'Edit Product' : 'Add Product'}</h1>
      <form onSubmit={handleSubmit} className="card p-6 space-y-4">
        <Alert message={error} />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Product Name *</label>
            <input className="input" name="product_name" value={form.product_name} onChange={handleChange} required />
            {fieldErrors.product_name && <p className="text-xs text-red-600 mt-1">{fieldErrors.product_name}</p>}
          </div>
          <div>
            <label className="label">SKU / Code *</label>
            <input className="input" name="sku" value={form.sku} onChange={handleChange} required disabled={isEdit === false ? false : false} />
            {fieldErrors.sku && <p className="text-xs text-red-600 mt-1">{fieldErrors.sku}</p>}
          </div>
          <div>
            <label className="label">Category</label>
            <input className="input" name="category" value={form.category || ''} onChange={handleChange} />
          </div>
          <div>
            <label className="label">Unit Price (₹) *</label>
            <input className="input" type="number" step="0.01" min="0" name="unit_price" value={form.unit_price} onChange={handleChange} required />
            {fieldErrors.unit_price && <p className="text-xs text-red-600 mt-1">{fieldErrors.unit_price}</p>}
          </div>
          {!isEdit && (
            <div>
              <label className="label">Opening Stock</label>
              <input className="input" type="number" min="0" name="current_stock" value={form.current_stock} onChange={handleChange} />
              <p className="text-xs text-slate-400 mt-1">Logged automatically as an IN stock movement.</p>
            </div>
          )}
          <div>
            <label className="label">Minimum Stock Alert *</label>
            <input className="input" type="number" min="0" name="min_stock_alert" value={form.min_stock_alert} onChange={handleChange} />
            {fieldErrors.min_stock_alert && <p className="text-xs text-red-600 mt-1">{fieldErrors.min_stock_alert}</p>}
          </div>
          <div>
            <label className="label">Warehouse Location</label>
            <input className="input" name="warehouse_location" value={form.warehouse_location || ''} onChange={handleChange} placeholder="e.g. Rack A1" />
          </div>
          <div>
            <label className="label">Image URL</label>
            <input className="input" name="image_url" value={form.image_url || ''} onChange={handleChange} placeholder="https://..." />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Saving...' : isEdit ? 'Update Product' : 'Add Product'}
          </button>
          <button type="button" className="btn-secondary" onClick={() => navigate('/products')}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
