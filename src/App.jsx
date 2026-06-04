import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';

function App() {
  const [user, setUser] = useState(null);

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    setUser(null);
  };

  return (
    <Router>
      <div className="app-container">
        <Routes>
          {/* El inicio del sistema administrativo ahora es el Login directamente */}
          <Route 
            path="/" 
            element={user ? <Navigate to="/dashboard" replace /> : <LoginPage onLoginSuccess={handleLogin} />} 
          />

          {/* Redirección de seguridad: si entran a /login, los llevamos a la raíz */}
          <Route path="/login" element={<Navigate to="/" replace />} />

          {/* Ruta del Dashboard: Protegida, si no hay usuario redirige al Login */}
          <Route 
            path="/dashboard" 
            element={user ? <Dashboard user={user} onLogout={handleLogout} /> : <Navigate to="/login" replace />} 
          />

          {/* Redirección por defecto para cualquier otra ruta */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;