import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';

function ProtectedRoute({ supabase, children }) {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      setAuthenticated(!!session);
    } catch (error) {
      setAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Laden...</div>;
  }

  if (!authenticated) {
    return <Navigate to="/login" />;
  }

  return children;
}

export default ProtectedRoute;