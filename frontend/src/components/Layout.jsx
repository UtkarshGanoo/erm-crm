import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { to: '/', label: 'Dashboard', icon: '📊', roles: ['admin', 'sales', 'warehouse', 'accounts'] },
  { to: '/customers', label: 'Customers', icon: '👥', roles: ['admin', 'sales', 'accounts'] },
  { to: '/products', label: 'Products', icon: '📦', roles: ['admin', 'sales', 'warehouse', 'accounts'] },
  { to: '/challans', label: 'Sales Challans', icon: '🧾', roles: ['admin', 'sales', 'warehouse', 'accounts'] },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const visibleItems = navItems.filter((item) => item.roles.includes(user?.role));

  return (
    <div className="min-h-screen flex bg-slate-50">
      <aside className="w-64 bg-slate-900 text-slate-100 flex flex-col shrink-0">
        <div className="px-5 py-5 border-b border-slate-800">
          <h1 className="text-lg font-bold tracking-tight">ERP · CRM Portal</h1>
          <p className="text-xs text-slate-400 mt-0.5">Wholesale Operations</p>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {visibleItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-brand-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <span>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="px-4 py-4 border-t border-slate-800">
          <p className="text-sm font-medium">{user?.name}</p>
          <p className="text-xs text-slate-400 capitalize mb-3">{user?.role}</p>
          <button onClick={handleLogout} className="btn-secondary w-full !bg-slate-800 !text-slate-200 !border-slate-700 hover:!bg-slate-700">
            Log out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-6 py-8">{children}</div>
      </main>
    </div>
  );
}
