import React, { useState, useEffect } from "react";
import AuthGate from "./components/AuthGate";
import Dashboard from "./components/Dashboard";
import Logo from "./components/Logo";
import useTheme from "./useTheme";

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [providersInfo, setProvidersInfo] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [healthInfo, setHealthInfo] = useState(null);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    checkAuth();
    fetchProviders();
    fetchHealth();
  }, []);

  const checkAuth = async () => {
    setIsCheckingAuth(true);
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      if (data.authenticated && data.user) {
        setCurrentUser(data.user);
        loadDashboard();
      } else {
        setCurrentUser(null);
      }
    } catch {
      setCurrentUser(null);
    } finally {
      setIsCheckingAuth(false);
    }
  };

  const fetchProviders = async () => {
    try {
      const res = await fetch("/api/auth/providers");
      if (res.ok) setProvidersInfo(await res.json());
    } catch {
      // Ignored
    }
  };

  const fetchHealth = async () => {
    try {
      const res = await fetch("/api/health");
      if (res.ok) setHealthInfo(await res.json());
    } catch {
      // Ignored
    }
  };

  const loadDashboard = async () => {
    try {
      const res = await fetch("/api/dashboard");
      if (res.ok) setDashboardData(await res.json());
    } catch {
      // Ignored
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Ignored
    }
    setCurrentUser(null);
    setDashboardData(null);
  };

  if (isCheckingAuth) {
    return (
      <div className="splash">
        <div className="logo-wrap">
          <Logo size={40} />
        </div>
        <p>Opening your workspace…</p>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <AuthGate
        onAuthSuccess={(user) => {
          setCurrentUser(user);
          loadDashboard();
        }}
        providersInfo={providersInfo}
      />
    );
  }

  return (
    <Dashboard
      user={currentUser}
      onLogout={handleLogout}
      dashboardData={dashboardData}
      onRefreshDashboard={loadDashboard}
      healthInfo={healthInfo}
      theme={theme}
      onToggleTheme={toggleTheme}
    />
  );
}
