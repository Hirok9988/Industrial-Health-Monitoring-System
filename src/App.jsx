import React, { useState, useEffect } from 'react';
import LandingPage from './pages/LandingPage';
import DashboardPage from './pages/DashboardPage';

function App() {
  const [currentRoute, setCurrentRoute] = useState(() => {
    return window.location.hash.startsWith('#/dashboard') ? 'dashboard' : 'landing';
  });

  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash.startsWith('#/dashboard')) {
        setCurrentRoute('dashboard');
        window.scrollTo(0, 0);
      } else {
        setCurrentRoute('landing');
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigateToDashboard = () => {
    window.location.hash = '#/dashboard';
  };

  const navigateToLanding = () => {
    window.location.hash = '#/';
  };

  return (
    <div className="app-root">
      {currentRoute === 'dashboard' ? (
        <DashboardPage onBackToHome={navigateToLanding} />
      ) : (
        <LandingPage onOpenDashboard={navigateToDashboard} />
      )}
    </div>
  );
}

export default App;
