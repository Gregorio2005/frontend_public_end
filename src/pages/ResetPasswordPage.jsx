import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { resetPassword } from '../services/authService';
import Logo from '../components/Logo';
import TextInput from '../components/TextInput';
import './LoginPage.css'; // Reutilizamos los estilos industriales del login

const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Token de recuperación ausente o inválido.');
    }
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setLoading(true);
    try {
      await resetPassword(token, password);
      setSuccess(true);
      setTimeout(() => navigate('/login'), 5000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <main className="login-page">
        <div className="login-card" style={{ textAlign: 'center', padding: '3rem' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '4rem', color: '#10b981', marginBottom: '1rem' }}>check_circle</span>
          <h2 className="login-card__title">¡Contraseña Actualizada!</h2>
          <p style={{ color: '#64748b', margin: '1rem 0 2rem' }}>Tu clave ha sido cambiada con éxito. Serás redirigido al login en unos segundos...</p>
          <button className="btn-submit" onClick={() => navigate('/login')}>Ir al Login Ahora</button>
        </div>
      </main>
    );
  }

  return (
    <main className="login-page">
      <div className="login-wrapper">
        <div className="login-brand" style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
          <Logo variant="large" />
        </div>

        <div className="login-card">
          <div className="login-card__header">
            <h1 className="login-card__title">Nueva Contraseña</h1>
            <p className="login-card__subtitle">Establezca sus nuevas credenciales de acceso seguro.</p>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            {error && <p className="error-message" style={{ marginBottom: '1.5rem' }}>{error}</p>}

            <div className="field-group">
              <label className="field-label">Nueva Contraseña</label>
              <div className="password-wrapper">
                <TextInput
                  type={showPassword ? 'text' : 'password'}
                  className="field-input field-input--password"
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  sanitize="quotes"
                  required
                  disabled={!token || loading}
                />
                <button 
                  type="button" 
                  className="password-toggle" 
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  style={{ right: '0.9rem' }}
                >
                  <span className="material-symbols-outlined">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            <div className="field-group">
              <label className="field-label">Confirmar Contraseña</label>
              <div className="password-wrapper">
                <TextInput
                  type={showConfirmPassword ? 'text' : 'password'}
                  className="field-input field-input--password"
                  placeholder="Repita su nueva clave"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  sanitize="quotes"
                  required
                  disabled={!token || loading}
                />
                <button 
                  type="button" 
                  className="password-toggle" 
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  style={{ right: '0.9rem' }}
                >
                  <span className="material-symbols-outlined">
                    {showConfirmPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            <button type="submit" className="btn-submit" disabled={!token || loading}>
              <span className="material-symbols-outlined">key</span>
              {loading ? 'Actualizando...' : 'Restablecer Contraseña'}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
};

export default ResetPasswordPage;