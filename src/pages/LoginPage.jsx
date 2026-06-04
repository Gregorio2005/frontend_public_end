﻿import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginUser, forgotPassword } from '../services/authService';
import Logo from '../components/Logo';
import logoImg from '../assets/logo.jpeg';
import './LoginPage.css';

const LoginPage = ({ onLoginSuccess }) => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Estados para el Modal de recuperación
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  useEffect(() => {
    document.title = 'Sealing Products C.A.';
    const link = document.querySelector("link[rel~='icon']") || document.createElement('link');
    link.rel = 'icon';
    link.href = logoImg;
    document.getElementsByTagName('head')[0].appendChild(link);
  }, []);

  const togglePassword = () => setShowPassword(!showPassword);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const data = await loginUser(username, password);
      if (data.success) {
        onLoginSuccess(data.user);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setForgotLoading(true);
    try {
      const res = await forgotPassword(forgotEmail);
      alert(res.message || "Se ha enviado una nueva contraseña a su correo.");
      setShowForgotModal(false);
      setForgotEmail('');
    } catch (err) {
      alert(err.message);
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <main className="login-page">
      <div className="login-wrapper">
        <div className="login-brand" style={{ display: 'flex', justifyContent: 'center', width: '100%', marginBottom: '1.5rem' }}>
          <Logo variant="large" />
        </div>

        <div className="login-card__header">
          <h1 className="login-card__title">ACCESO AL SISTEMA</h1>
          <p className="login-card__subtitle">Sistema de Inspección, Control y Verificación de Insumos Centralizado (SICVIC)</p>
        </div>

        <div className="login-card">
          <form className="login-form" onSubmit={handleSubmit} id="loginForm">
            {error && <p className="error-message">{error}</p>}

            <div className="field-group">
              <label className="field-label" htmlFor="username">
                <span className="material-symbols-outlined">person</span>
                Usuario
              </label>
              <input
                id="username"
                name="username"
                type="text"
                className="field-input"
                placeholder="Usuario"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>

            <div className="field-group">
              <label className="field-label" htmlFor="password">
                <span className="material-symbols-outlined">lock</span>
                Contraseña
              </label>
              <div className="password-wrapper">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  className="field-input field-input--password"
                  placeholder="Contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button 
                  type="button" 
                  className="password-toggle" 
                  onClick={togglePassword}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  <span className="material-symbols-outlined">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            <div className="form-row">
              <label className="remember-label" htmlFor="remember-me">
                <input id="remember-me" type="checkbox" />
                <span className="checkbox-custom">
                  <span className="material-symbols-outlined">check</span>
                </span>
                Recordarme
              </label>
              <button 
                type="button" 
                className="forgot-link" 
                onClick={() => setShowForgotModal(true)}
                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', font: 'inherit' }}
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            <button type="submit" className="btn-submit" disabled={isLoading}>
              <span className="material-symbols-outlined" data-weight="fill">login</span>
              {isLoading ? 'Autenticando...' : 'Iniciar Sesión'}
            </button>
          </form>

          <footer className="login-footer">
            <p>Para asistencia con su cuenta, contacte al administrador</p>
            <a className="support-link" href="#">
              <span className="material-symbols-outlined">engineering</span>
              SOPORTE TÉCNICO
            </a>
          </footer>
        </div>
      </div>

      {/* Modal de Recuperación de Contraseña */}
      {showForgotModal && (
        <div className="modal-overlay" style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="login-card" style={{ width: '90%', maxWidth: '400px', padding: '2.5rem', position: 'relative' }}>
            <h2 className="login-card__title" style={{ fontSize: '1.3rem', marginBottom: '1rem' }}>Recuperar Contraseña</h2>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1.5rem', lineHeight: '1.4' }}>
              Ingrese su correo electrónico registrado para enviarle una nueva clave temporal.
            </p>
            <form onSubmit={handleForgotSubmit}>
              <div className="field-group">
                <label className="field-label">Correo Corporativo</label>
                <input
                  type="email"
                  className="field-input"
                  placeholder="usuario@sealingproducts.com"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  required
                />
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                <button 
                  type="button" 
                  style={{ background: '#94a3b8', boxShadow: 'none' }} 
                  className="btn-submit"
                  onClick={() => setShowForgotModal(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-submit" disabled={forgotLoading}>
                  {forgotLoading ? 'Enviando...' : 'Enviar Clave'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
};

export default LoginPage;