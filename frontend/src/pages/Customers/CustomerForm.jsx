import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { customerApi } from '../../api/services';
import Alert from '../../components/Alert';

const emptyForm = {
  customer_name: '', mobile_number: '', email: '', business_name: '', gst_number: '',
  customer_type: 'Retail', address: '', status: 'Lead', follow_up_date: '', notes: '',
};

export default function CustomerForm() {
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
    customerApi.get(id).then((res) => {
      const c = res.data.data;
      setForm({
        ...emptyForm,
        ...c,
        follow_up_date: c.follow_up_date ? c.follow_up_date.slice(0, 10) : '',
      });
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
      if (isEdit) {
        await customerApi.update(id, form);
      } else {
        await customerApi.create(form);
      }
      navigate('/customers');
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
      <h1 className="text-2xl font-bold text-slate-900 mb-6">{isEdit ? 'Edit Customer' : 'Add Customer'}</h1>
      <form onSubmit={handleSubmit} className="card p-6 space-y-4">
        <Alert message={error} />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Customer Name *</label>
            <input className="input" name="customer_name" value={form.customer_name} onChange={handleChange} required />
            {fieldErrors.customer_name && <p className="text-xs text-red-600 mt-1">{fieldErrors.customer_name}</p>}
          </div>
          <div>
            <label className="label">Mobile Number *</label>
            <input className="input" name="mobile_number" value={form.mobile_number} onChange={handleChange} required />
            {fieldErrors.mobile_number && <p className="text-xs text-red-600 mt-1">{fieldErrors.mobile_number}</p>}
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" name="email" value={form.email || ''} onChange={handleChange} />
            {fieldErrors.email && <p className="text-xs text-red-600 mt-1">{fieldErrors.email}</p>}
          </div>
          <div>
            <label className="label">Business Name</label>
            <input className="input" name="business_name" value={form.business_name || ''} onChange={handleChange} />
          </div>
          <div>
            <label className="label">GST Number</label>
            <input className="input" name="gst_number" value={form.gst_number || ''} onChange={handleChange} />
          </div>
          <div>
            <label className="label">Customer Type *</label>
            <select className="input" name="customer_type" value={form.customer_type} onChange={handleChange}>
              <option value="Retail">Retail</option>
              <option value="Wholesale">Wholesale</option>
              <option value="Distributor">Distributor</option>
            </select>
          </div>
          <div>
            <label className="label">Status</label>
            <select className="input" name="status" value={form.status} onChange={handleChange}>
              <option value="Lead">Lead</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
          <div>
            <label className="label">Follow-up Date</label>
            <input className="input" type="date" name="follow_up_date" value={form.follow_up_date || ''} onChange={handleChange} />
          </div>
        </div>

        <div>
          <label className="label">Address</label>
          <textarea className="input" rows="2" name="address" value={form.address || ''} onChange={handleChange} />
        </div>
        <div>
          <label className="label">Notes</label>
          <textarea className="input" rows="3" name="notes" value={form.notes || ''} onChange={handleChange} />
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Saving...' : isEdit ? 'Update Customer' : 'Add Customer'}
          </button>
          <button type="button" className="btn-secondary" onClick={() => navigate('/customers')}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
