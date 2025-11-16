// src/App.tsx
import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from "react-router-dom";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import AdminPage from "./pages/AdminPage";
import NotFound from "./pages/NotFound";
import CVEClassifierPage from "./pages/CVEClassifierPage";
import PentestScan from "./pages/PentestScan";

import TokenRefresher from "./components/TokenRefresher";
import LogoutButton from "./components/LogoutButton";
import { getAccess, isTokenValid } from "./utils/auth";

const App: React.FC = () => {
  const token = getAccess();
  const authed = !!token && isTokenValid(token);

  return (
    <Router>
      {/* Keep the token refresher mounted at the app root so it can refresh tokens as needed */}
      <TokenRefresher />

      <header className="bg-white shadow p-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link to="/" className="font-bold text-lg">
              CyberSec AI
            </Link>
            <Link to="/dashboard" className="text-sm text-gray-700 hover:underline">
              Dashboard
            </Link>
            <Link to="/pentest" className="text-sm text-gray-700 hover:underline">
              Pentest
            </Link>
            <Link to="/classify-cve" className="text-sm text-gray-700 hover:underline">
              CVE Classifier
            </Link>
            <Link to="/admin" className="text-sm text-gray-700 hover:underline">
              Admin
            </Link>
          </div>

          <div className="flex items-center space-x-3">
            {authed ? (
              <LogoutButton />
            ) : (
              <Link to="/login" className="text-sm text-indigo-600 hover:underline">
                Sign in
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4">
        <Routes>
          {/* Public Route */}
          <Route path="/login" element={<Login />} />

          {/* Protected Routes */}
          <Route
            path="/dashboard"
            element={authed ? <Dashboard /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/admin"
            element={authed ? <AdminPage /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/pentest"
            element={authed ? <PentestScan /> : <Navigate to="/login" replace />}
          />

          {/* CVE classifier (public or change as you prefer) */}
          <Route path="/classify-cve" element={<CVEClassifierPage />} />

          {/* Default Route */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* Catch-All Route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </Router>
  );
};

export default App;


