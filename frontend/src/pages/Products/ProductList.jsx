import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { productApi } from '../../api/services';
import Pagination from '../../components/Pagination';
import { useAuth } from '../../context/AuthContext';

export default function ProductList() {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [search, setSearch] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const canEdit = ['admin', 'warehouse'].includes(user?.role);

  useEffect(() => {
    setLoading(true);
    const params = { page, limit: 10 };
    if (search) params.search = search;
    if (lowStockOnly) params.low_stock = 'true';

    const timer = setTimeout(() => {
      productApi
        .list(params)
        .then((res) => {
          setProducts(res.data.data);
          setPagination(res.data.pagination);
        })
        .finally(() => setLoading(false));
    }, 300);

    return () => clearTimeout(timer);
  }, [search, lowStockOnly, page]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Products &amp; Inventory</h1>
        {canEdit && (
          <Link to="/products/new" className="btn-primary">
            + Add Product
          </Link>
        )}
      </div>

      <div className="flex items-center gap-3 mb-4">
        <input
          className="input max-w-xs"
          placeholder="Search by name or SKU..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={lowStockOnly}
            onChange={(e) => {
              setLowStockOnly(e.target.checked);
              setPage(1);
            }}
          />
          Low stock only
        </label>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr className="text-left text-slate-500">
              <th className="py-3 px-4 font-medium">Product</th>
              <th className="py-3 px-4 font-medium">SKU</th>
              <th className="py-3 px-4 font-medium">Category</th>
              <th className="py-3 px-4 font-medium">Price</th>
              <th className="py-3 px-4 font-medium">Stock</th>
              <th className="py-3 px-4 font-medium">Location</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" className="py-8 text-center text-slate-400">Loading...</td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td colSpan="6" className="py-8 text-center text-slate-400">No products found.</td>
              </tr>
            ) : (
              products.map((p) => {
                const isLow = p.current_stock <= p.min_stock_alert;
                return (
                  <tr key={p.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                    <td className="py-3 px-4">
                      <Link to={`/products/${p.id}`} className="font-medium text-brand-600 hover:underline">
                        {p.product_name}
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-slate-500">{p.sku}</td>
                    <td className="py-3 px-4">{p.category || '—'}</td>
                    <td className="py-3 px-4">₹{Number(p.unit_price).toFixed(2)}</td>
                    <td className="py-3 px-4">
                      <span className={isLow ? 'text-red-600 font-semibold' : 'text-slate-800'}>
                        {p.current_stock}
                      </span>
                      {isLow && <span className="badge bg-red-100 text-red-700 ml-2">Low</span>}
                    </td>
                    <td className="py-3 px-4">{p.warehouse_location || '—'}</td>
                  </tr>
                );
              })
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
