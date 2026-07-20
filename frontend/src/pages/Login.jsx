import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Alert from '../components/Alert';

export default function Login() {
  const { login, loading, error } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('admin@erp.com');
  const [password, setPassword] = useState('Admin@123');

  async function handleSubmit(e) {
    e.preventDefault();
    const ok = await login(email, password);
    if (ok) {
      const dest = location.state?.from?.pathname || '/';
      navigate(dest, { replace: true });
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-slate-900">ERP · CRM Portal</h1>
          <p className="text-sm text-slate-500 mt-1">Sign in to continue</p>
        </div>
        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          <Alert message={error} />
          <div>
            <label className="label">Email</label>
            <input
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label">Password</label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
          <div className="text-xs text-slate-400 pt-2 border-t border-slate-100">
            <p className="font-medium mb-1">Demo accounts (password: Admin@123)</p>
            <p>admin@erp.com · sales@erp.com</p>
            <p>warehouse@erp.com · accounts@erp.com</p>
          </div>
        </form>
      </div>
    </div>
  );
}
