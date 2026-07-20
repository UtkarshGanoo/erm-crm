import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { challanApi } from '../../api/services';
import StatusBadge from '../../components/StatusBadge';
import Alert from '../../components/Alert';
import { useAuth } from '../../context/AuthContext';

export default function ChallanDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [challan, setChallan] = useState(null);
  const [error, setError] = useState('');
  const [acting, setActing] = useState(false);

  const canConfirm = ['admin', 'sales', 'warehouse'].includes(user?.role);
  const canCancel = ['admin', 'sales'].includes(user?.role);

  function load() {
    challanApi.get(id).then((res) => setChallan(res.data.data));
  }

  useEffect(load, [id]);

  async function handleConfirm() {
    setError('');
    setActing(true);
    try {
      await challanApi.confirm(id);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to confirm challan');
    } finally {
      setActing(false);
    }
  }

  async function handleCancel() {
    if (!window.confirm('Cancel this challan? If confirmed, stock will be restored.')) return;
    setError('');
    setActing(true);
    try {
      await challanApi.cancel(id);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to cancel challan');
    } finally {
      setActing(false);
    }
  }

  if (!challan) return <p className="text-slate-400">Loading...</p>;

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{challan.challan_number}</h1>
          <p className="text-slate-500">{challan.customer_name}</p>
        </div>
        <StatusBadge status={challan.status} />
      </div>

      <Alert message={error} />

      {challan.status === 'Draft' && (canConfirm || canCancel) && (
        <div className="flex gap-3 mb-6">
          {canConfirm && (
            <button onClick={handleConfirm} disabled={acting} className="btn-primary">
              {acting ? 'Processing...' : 'Confirm Challan (reduces stock)'}
            </button>
          )}
          {canCancel && (
            <button onClick={handleCancel} disabled={acting} className="btn-danger">
              Cancel Challan
            </button>
          )}
        </div>
      )}
      {challan.status === 'Confirmed' && canCancel && (
        <div className="flex gap-3 mb-6">
          <button onClick={handleCancel} disabled={acting} className="btn-danger">
            {acting ? 'Processing...' : 'Cancel Challan (restores stock)'}
          </button>
        </div>
      )}

      <div className="card p-5 mb-6 grid grid-cols-3 gap-4 text-sm">
        <div>
          <p className="text-slate-400">Total Quantity</p>
          <p className="font-semibold text-slate-800 text-lg">{challan.total_quantity}</p>
        </div>
        <div>
          <p className="text-slate-400">Total Amount</p>
          <p className="font-semibold text-slate-800 text-lg">₹{Number(challan.total_amount).toFixed(2)}</p>
        </div>
        <div>
          <p className="text-slate-400">Created By</p>
          <p className="font-semibold text-slate-800 text-lg">{challan.created_by_name || '—'}</p>
        </div>
      </div>

      <div className="card p-5">
        <h2 className="font-semibold text-slate-800 mb-4">Line Items</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500 border-b border-slate-100">
              <th className="py-2 font-medium">Product</th>
              <th className="py-2 font-medium">SKU</th>
              <th className="py-2 font-medium">Qty</th>
              <th className="py-2 font-medium">Unit Price</th>
              <th className="py-2 font-medium">Line Total</th>
            </tr>
          </thead>
          <tbody>
            {challan.items.map((item) => (
              <tr key={item.id} className="border-b border-slate-50 last:border-0">
                <td className="py-2.5">{item.product_snapshot.product_name}</td>
                <td className="py-2.5 text-slate-500">{item.product_snapshot.sku}</td>
                <td className="py-2.5">{item.quantity}</td>
                <td className="py-2.5">₹{Number(item.unit_price).toFixed(2)}</td>
                <td className="py-2.5">₹{Number(item.line_total).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-400 mt-4">
        Created {new Date(challan.created_at).toLocaleString()}
        {challan.confirmed_at && ` · Confirmed ${new Date(challan.confirmed_at).toLocaleString()}`}
      </p>
    </div>
  );
}
