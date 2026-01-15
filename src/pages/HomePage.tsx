import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import ModernDashboard from '../components/ModernDashboard';

const HomePage: React.FC = () => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return <ModernDashboard />;
};

export default HomePage;
