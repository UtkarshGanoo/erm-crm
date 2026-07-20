import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { customerApi } from '../../api/services';
import StatusBadge from '../../components/StatusBadge';
import Alert from '../../components/Alert';
import { useAuth } from '../../context/AuthContext';

export default function CustomerDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [customer, setCustomer] = useState(null);
  const [note, setNote] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const canEdit = ['admin', 'sales'].includes(user?.role);

  function load() {
    customerApi.get(id).then((res) => setCustomer(res.data.data));
  }

  useEffect(load, [id]);

  async function handleAddFollowup(e) {
    e.preventDefault();
    if (!note.trim()) return;
    setSaving(true);
    setError('');
    try {
      await customerApi.addFollowup(id, { note, follow_up_date: followUpDate || null });
      setNote('');
      setFollowUpDate('');
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add follow-up');
    } finally {
      setSaving(false);
    }
  }

  if (!customer) return <p className="text-slate-400">Loading...</p>;

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{customer.customer_name}</h1>
          {customer.business_name && <p className="text-slate-500">{customer.business_name}</p>}
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={customer.status} />
          {canEdit && (
            <Link to={`/customers/${id}/edit`} className="btn-secondary">
              Edit
            </Link>
          )}
        </div>
      </div>

      <div className="card p-5 mb-6">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-slate-400">Mobile Number</p>
            <p className="font-medium text-slate-800">{customer.mobile_number}</p>
          </div>
          <div>
            <p className="text-slate-400">Email</p>
            <p className="font-medium text-slate-800">{customer.email || '—'}</p>
          </div>
          <div>
            <p className="text-slate-400">GST Number</p>
            <p className="font-medium text-slate-800">{customer.gst_number || '—'}</p>
          </div>
          <div>
            <p className="text-slate-400">Customer Type</p>
            <p className="font-medium text-slate-800">{customer.customer_type}</p>
          </div>
          <div>
            <p className="text-slate-400">Follow-up Date</p>
            <p className="font-medium text-slate-800">
              {customer.follow_up_date ? new Date(customer.follow_up_date).toLocaleDateString() : '—'}
            </p>
          </div>
          <div>
            <p className="text-slate-400">Address</p>
            <p className="font-medium text-slate-800">{customer.address || '—'}</p>
          </div>
        </div>
        {customer.notes && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-slate-400 text-sm">Notes</p>
            <p className="text-sm text-slate-700 mt-1">{customer.notes}</p>
          </div>
        )}
      </div>

      <div className="card p-5">
        <h2 className="font-semibold text-slate-800 mb-4">Follow-up History</h2>

        {canEdit && (
          <form onSubmit={handleAddFollowup} className="mb-5 space-y-3">
            <Alert message={error} />
            <textarea
              className="input"
              rows="2"
              placeholder="Add a follow-up note..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <div className="flex items-center gap-3">
              <input
                type="date"
                className="input max-w-[180px]"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
              />
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? 'Saving...' : 'Add Follow-up'}
              </button>
            </div>
          </form>
        )}

        {customer.followups.length === 0 ? (
          <p className="text-sm text-slate-400">No follow-ups recorded yet.</p>
        ) : (
          <ul className="space-y-3">
            {customer.followups.map((f) => (
              <li key={f.id} className="border-l-2 border-brand-200 pl-3 py-1">
                <p className="text-sm text-slate-700">{f.note}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {f.created_by_name || 'Unknown'} &middot; {new Date(f.created_at).toLocaleString()}
                  {f.follow_up_date && ` · Next follow-up: ${new Date(f.follow_up_date).toLocaleDateString()}`}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
