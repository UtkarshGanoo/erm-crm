import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { dashboardApi } from '../api/services';
import StatusBadge from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';

function StatCard({ label, value, accent }) {
  return (
    <div className="card p-5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${accent || 'text-slate-900'}`}>{value}</p>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    dashboardApi
      .summary()
      .then((res) => setData(res.data.data))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load dashboard'));
  }, []);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Welcome back, {user?.name?.split(' ')[0]}</h1>
        <p className="text-sm text-slate-500 mt-1">Here's what's happening in your business today.</p>
      </div>

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      {data && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <StatCard label="Total Customers" value={data.total_customers} />
            <StatCard label="Open Leads" value={data.open_leads} accent="text-amber-600" />
            <StatCard label="Active Products" value={data.total_products} />
            <StatCard label="Low Stock Alerts" value={data.low_stock_products} accent="text-red-600" />
            <StatCard label="Challans Today" value={data.challans_today} accent="text-brand-600" />
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-800">Recent Sales Challans</h2>
              <Link to="/challans" className="text-sm text-brand-600 hover:underline">
                View all
              </Link>
            </div>
            {data.recent_challans.length === 0 ? (
              <p className="text-sm text-slate-400">No challans yet.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 border-b border-slate-100">
                    <th className="py-2 font-medium">Challan #</th>
                    <th className="py-2 font-medium">Customer</th>
                    <th className="py-2 font-medium">Amount</th>
                    <th className="py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recent_challans.map((c) => (
                    <tr key={c.id} className="border-b border-slate-50 last:border-0">
                      <td className="py-2.5">
                        <Link to={`/challans/${c.id}`} className="text-brand-600 hover:underline font-medium">
                          {c.challan_number}
                        </Link>
                      </td>
                      <td className="py-2.5">{c.customer_name}</td>
                      <td className="py-2.5">₹{Number(c.total_amount).toFixed(2)}</td>
                      <td className="py-2.5">
                        <StatusBadge status={c.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
