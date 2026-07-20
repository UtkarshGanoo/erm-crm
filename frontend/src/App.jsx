import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import CustomerList from './pages/Customers/CustomerList';
import CustomerForm from './pages/Customers/CustomerForm';
import CustomerDetail from './pages/Customers/CustomerDetail';
import ProductList from './pages/Products/ProductList';
import ProductForm from './pages/Products/ProductForm';
import ProductDetail from './pages/Products/ProductDetail';
import ChallanList from './pages/Challans/ChallanList';
import ChallanForm from './pages/Challans/ChallanForm';
import ChallanDetail from './pages/Challans/ChallanDetail';

function Protected({ children, roles }) {
  return (
    <ProtectedRoute roles={roles}>
      <Layout>{children}</Layout>
    </ProtectedRoute>
  );
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <Dashboard /> : <Login />} />
      <Route path="/signup" element={user ? <Dashboard /> : <Signup />} />

      <Route path="/" element={<Protected><Dashboard /></Protected>} />

      <Route path="/customers" element={<Protected roles={['admin','sales','accounts']}><CustomerList /></Protected>} />
      <Route path="/customers/new" element={<Protected roles={['admin','sales']}><CustomerForm /></Protected>} />
      <Route path="/customers/:id" element={<Protected roles={['admin','sales','accounts']}><CustomerDetail /></Protected>} />
      <Route path="/customers/:id/edit" element={<Protected roles={['admin','sales']}><CustomerForm /></Protected>} />

      <Route path="/products" element={<Protected><ProductList /></Protected>} />
      <Route path="/products/new" element={<Protected roles={['admin','warehouse']}><ProductForm /></Protected>} />
      <Route path="/products/:id" element={<Protected><ProductDetail /></Protected>} />
      <Route path="/products/:id/edit" element={<Protected roles={['admin','warehouse']}><ProductForm /></Protected>} />

      <Route path="/challans" element={<Protected><ChallanList /></Protected>} />
      <Route path="/challans/new" element={<Protected roles={['admin','sales']}><ChallanForm /></Protected>} />
      <Route path="/challans/:id" element={<Protected><ChallanDetail /></Protected>} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
