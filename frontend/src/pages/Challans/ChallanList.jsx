import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { challanApi } from '../../api/services';
import StatusBadge from '../../components/StatusBadge';
import Pagination from '../../components/Pagination';
import { useAuth } from '../../context/AuthContext';

export default function ChallanList() {
  const { user } = useAuth();
  const [challans, setChallans] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const canCreate = ['admin', 'sales'].includes(user?.role);

  useEffect(() => {
    setLoading(true);
    const params = { page, limit: 10 };
    if (status) params.status = status;
    challanApi
      .list(params)
      .then((res) => {
        setChallans(res.data.data);
        setPagination(res.data.pagination);
      })
      .finally(() => setLoading(false));
  }, [status, page]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Sales Challans</h1>
        {canCreate && (
          <Link to="/challans/new" className="btn-primary">
            + New Challan
          </Link>
        )}
      </div>

      <div className="mb-4">
        <select
          className="input max-w-[180px]"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All Statuses</option>
          <option value="Draft">Draft</option>
          <option value="Confirmed">Confirmed</option>
          <option value="Cancelled">Cancelled</option>
        </select>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr className="text-left text-slate-500">
              <th className="py-3 px-4 font-medium">Challan #</th>
              <th className="py-3 px-4 font-medium">Customer</th>
              <th className="py-3 px-4 font-medium">Qty</th>
              <th className="py-3 px-4 font-medium">Amount</th>
              <th className="py-3 px-4 font-medium">Status</th>
              <th className="py-3 px-4 font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" className="py-8 text-center text-slate-400">Loading...</td></tr>
            ) : challans.length === 0 ? (
              <tr><td colSpan="6" className="py-8 text-center text-slate-400">No challans found.</td></tr>
            ) : (
              challans.map((c) => (
                <tr key={c.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                  <td className="py-3 px-4">
                    <Link to={`/challans/${c.id}`} className="font-medium text-brand-600 hover:underline">
                      {c.challan_number}
                    </Link>
                  </td>
                  <td className="py-3 px-4">{c.customer_name}</td>
                  <td className="py-3 px-4">{c.total_quantity}</td>
                  <td className="py-3 px-4">₹{Number(c.total_amount).toFixed(2)}</td>
                  <td className="py-3 px-4"><StatusBadge status={c.status} /></td>
                  <td className="py-3 px-4 text-slate-500">{new Date(c.created_at).toLocaleDateString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <div className="px-4 pb-2">
          <Pagination pagination={pagination} onPageChange={setPage} />
        </div>
      </div>
    </div>
  );
}
