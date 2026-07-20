import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { customerApi } from '../../api/services';
import StatusBadge from '../../components/StatusBadge';
import Pagination from '../../components/Pagination';
import { useAuth } from '../../context/AuthContext';

export default function CustomerList() {
  const { user } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const canEdit = ['admin', 'sales'].includes(user?.role);

  useEffect(() => {
    setLoading(true);
    const params = { page, limit: 10 };
    if (search) params.search = search;
    if (status) params.status = status;

    const timer = setTimeout(() => {
      customerApi
        .list(params)
        .then((res) => {
          setCustomers(res.data.data);
          setPagination(res.data.pagination);
        })
        .finally(() => setLoading(false));
    }, 300); // debounce search typing

    return () => clearTimeout(timer);
  }, [search, status, page]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Customers</h1>
        {canEdit && (
          <Link to="/customers/new" className="btn-primary">
            + Add Customer
          </Link>
        )}
      </div>

      <div className="flex gap-3 mb-4">
        <input
          className="input max-w-xs"
          placeholder="Search name, mobile, business..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <select
          className="input max-w-[160px]"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All Statuses</option>
          <option value="Lead">Lead</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr className="text-left text-slate-500">
              <th className="py-3 px-4 font-medium">Name</th>
              <th className="py-3 px-4 font-medium">Mobile</th>
              <th className="py-3 px-4 font-medium">Type</th>
              <th className="py-3 px-4 font-medium">Status</th>
              <th className="py-3 px-4 font-medium">Follow-up</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="5" className="py-8 text-center text-slate-400">
                  Loading...
                </td>
              </tr>
            ) : customers.length === 0 ? (
              <tr>
                <td colSpan="5" className="py-8 text-center text-slate-400">
                  No customers found.
                </td>
              </tr>
            ) : (
              customers.map((c) => (
                <tr key={c.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                  <td className="py-3 px-4">
                    <Link to={`/customers/${c.id}`} className="font-medium text-brand-600 hover:underline">
                      {c.customer_name}
                    </Link>
                    {c.business_name && <p className="text-xs text-slate-400">{c.business_name}</p>}
                  </td>
                  <td className="py-3 px-4">{c.mobile_number}</td>
                  <td className="py-3 px-4">{c.customer_type}</td>
                  <td className="py-3 px-4">
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="py-3 px-4">
                    {c.follow_up_date ? new Date(c.follow_up_date).toLocaleDateString() : '—'}
                  </td>
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
