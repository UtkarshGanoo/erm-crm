import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { customerApi, productApi, challanApi } from '../../api/services';
import Alert from '../../components/Alert';

export default function ChallanForm() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [customerId, setCustomerId] = useState('');
  const [lines, setLines] = useState([{ product_id: '', quantity: 1 }]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Pull a generous page of customers/products for the dropdowns.
    customerApi.list({ limit: 100 }).then((res) => setCustomers(res.data.data));
    productApi.list({ limit: 100 }).then((res) => setProducts(res.data.data));
  }, []);

  function productById(id) {
    return products.find((p) => String(p.id) === String(id));
  }

  function updateLine(index, field, value) {
    const next = [...lines];
    next[index] = { ...next[index], [field]: value };
    setLines(next);
  }

  function addLine() {
    setLines([...lines, { product_id: '', quantity: 1 }]);
  }

  function removeLine(index) {
    setLines(lines.filter((_, i) => i !== index));
  }

  const total = lines.reduce((sum, line) => {
    const p = productById(line.product_id);
    return sum + (p ? Number(p.unit_price) * (Number(line.quantity) || 0) : 0);
  }, 0);

  async function submit(status) {
    setError('');
    if (!customerId) return setError('Please select a customer.');
    const validLines = lines.filter((l) => l.product_id && Number(l.quantity) > 0);
    if (validLines.length === 0) return setError('Add at least one product with a quantity.');

    setSaving(true);
    try {
      const { data } = await challanApi.create({
        customer_id: Number(customerId),
        status,
        items: validLines.map((l) => ({ product_id: Number(l.product_id), quantity: Number(l.quantity) })),
      });
      navigate(`/challans/${data.data.id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create challan');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">New Sales Challan</h1>

      <div className="card p-6 space-y-5">
        <Alert message={error} />

        <div>
          <label className="label">Customer *</label>
          <select className="input" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
            <option value="">Select a customer...</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.customer_name} {c.business_name ? `(${c.business_name})` : ''}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Products *</label>
          <div className="space-y-2">
            {lines.map((line, i) => {
              const p = productById(line.product_id);
              return (
                <div key={i} className="flex gap-2 items-start">
                  <select
                    className="input flex-1"
                    value={line.product_id}
                    onChange={(e) => updateLine(i, 'product_id', e.target.value)}
                  >
                    <option value="">Select product...</option>
                    {products.map((prod) => (
                      <option key={prod.id} value={prod.id}>
                        {prod.product_name} ({prod.sku}) — Stock: {prod.current_stock} — ₹{Number(prod.unit_price).toFixed(2)}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="1"
                    className="input w-24"
                    value={line.quantity}
                    onChange={(e) => updateLine(i, 'quantity', e.target.value)}
                  />
                  <div className="w-24 pt-2 text-sm text-slate-600 text-right">
                    {p ? `₹${(Number(p.unit_price) * (Number(line.quantity) || 0)).toFixed(2)}` : '—'}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeLine(i)}
                    className="text-red-500 hover:text-red-700 px-2 py-2"
                    title="Remove line"
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
          <button type="button" onClick={addLine} className="btn-secondary mt-3">
            + Add Product Line
          </button>
        </div>

        <div className="flex justify-between items-center pt-3 border-t border-slate-100">
          <p className="text-slate-500 text-sm">Total Amount</p>
          <p className="text-xl font-bold text-slate-900">₹{total.toFixed(2)}</p>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" disabled={saving} onClick={() => submit('Draft')} className="btn-secondary">
            {saving ? 'Saving...' : 'Save as Draft'}
          </button>
          <button type="button" disabled={saving} onClick={() => submit('Confirmed')} className="btn-primary">
            {saving ? 'Saving...' : 'Confirm & Reduce Stock'}
          </button>
        </div>
      </div>
    </div>
  );
}
