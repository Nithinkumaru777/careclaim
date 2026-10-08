import { Routes, Route, Navigate } from 'react-router';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { NewClaim } from './pages/NewClaim';
import { ClaimView } from './pages/ClaimView';
import { Policies } from './pages/Policies';

const RequireAuth = ({ children }: { children: JSX.Element }) => {
  const hasMock = !!localStorage.getItem('mock_token');
  const hasSupabase = Object.keys(localStorage).some(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
  if (!hasMock && !hasSupabase) return <Navigate to="/login" replace />;
  return children;
};

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
      <Route path="/claims/new" element={<RequireAuth><NewClaim /></RequireAuth>} />
      <Route path="/claims/:id" element={<RequireAuth><ClaimView /></RequireAuth>} />
      <Route path="/policies" element={<RequireAuth><Policies /></RequireAuth>} />
    </Routes>
  );
}
