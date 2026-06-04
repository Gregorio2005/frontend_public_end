import React, { useState, useEffect } from 'react';
import { updateProfile } from '../services/authService';
import Logo from '../components/Logo';
import logoImg from '../assets/logo.jpeg';
import './Dashboard.css';

// Importa los componentes específicos de cada rol
import AdminDashboardContent from './AdminDashboardContent';
import JefeCalidadDashboardContent from './JefeCalidadDashboardContent';
import JefeIngenieriaDashboardContent from './JefeIngenieriaDashboardContent';
import TrabajadorDashboardContent from './TrabajadorDashboardContent';

const Dashboard = ({ user = {}, onLogout }) => {
  const [activeAction, setActiveAction] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showProfile, setShowProfile] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Estados para controlar la visibilidad de las contraseñas
  const [showPass, setShowPass] = useState({
    current: false,
    new: false,
    confirm: false
  });

  useEffect(() => {
    document.title = 'Sealing Products C.A.';
    const link = document.querySelector("link[rel~='icon']") || document.createElement('link');
    link.rel = 'icon';
    link.href = logoImg;
    document.getElementsByTagName('head')[0].appendChild(link);
  }, []);

  const toggleVisibility = (field) => {
    setShowPass(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const handlePasswordInputChange = (e) => {
    const { name, value } = e.target;
    setPasswordForm(prev => ({ ...prev, [name]: value }));
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    const { currentPassword, newPassword, confirmPassword } = passwordForm;

    if (!currentPassword || !newPassword || !confirmPassword) {
      alert("Por favor, complete todos los campos.");
      return;
    }

    if (newPassword !== confirmPassword) {
      alert("La nueva contraseña y su confirmación no coinciden.");
      return;
    }

    try {
      // Conexión real con el backend
      await updateProfile({ 
        currentPassword: currentPassword, // Enviamos la contraseña actual para validación en el backend
        password: newPassword // Enviamos la nueva contraseña como 'password'
      });
      alert("Contraseña actualizada con éxito.");
      setShowProfile(false);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      alert(`Error al actualizar la contraseña: ${err.message}`);
    }
  };

  const handleActionClick = (action) => {
    setActiveAction(action);
    setRefreshKey(prev => prev + 1);
  };

  // NORMALIZACIÓN DEL ROL
  // Esta función ayuda a identificar el rol sin importar si viene como ID, 
  // texto en mayúsculas, minúsculas o con tildes.
  const getNormalizedRole = () => {
    const roleInput = (user.role || user.roles_id || '').toString().toLowerCase();
    
    if (roleInput === '1' || roleInput.includes('admin')) return 'Administrador';
    if (roleInput === '2' || roleInput.includes('trabajador')) return 'Trabajador';
    if (roleInput === '3' || roleInput.includes('calidad')) return 'Jefe de Calidad';
    if (roleInput === '4' || roleInput.includes('ingenieria') || roleInput.includes('ingeniería')) return 'Jefe de Ingeniería';
        
    return roleInput || 'Administrador'; // Fallback por si acaso
  };

  const userRole = getNormalizedRole();

  const renderDashboardContent = () => {
    if (!user.name && !user.user_id) {
      return (
        <section className="status-card error">
          <h2>Sesión no válida</h2>
          <p>No se pudo cargar la información del usuario.</p>
        </section>
      );
    }

    if (activeAction) {
    switch (userRole) {
      case 'Administrador':
        return <AdminDashboardContent activeAction={activeAction} refreshKey={refreshKey} />;
      case 'Jefe de Calidad':
        return <JefeCalidadDashboardContent activeAction={activeAction} />;
      case 'Jefe de Ingeniería':
        return <JefeIngenieriaDashboardContent activeAction={activeAction} />;
      case 'Trabajador':
        return <TrabajadorDashboardContent activeAction={activeAction} />;
      default:
        return (
          <section className="status-card error">
            <h2>Acceso restringido</h2>
            <p>No tienes permisos para ver este panel o tu rol no es reconocido.</p>
          </section>
        );
    }
    }

    // Vista por defecto: Bento Grid de Stitch
    return (
      <div className="bento-grid">
        {/* Widget: Gestión Operativa */}
        <section className="bento-item stats-container">
          <div className="bento-header">
            <div className="icon-box">
              <span className="material-symbols-outlined">verified_user</span>
            </div>
            <h3>Estado de Verificación</h3>
          </div>
          <div className="stats-display">
            <div className="progress-widget">
              <div className="circular-progress">
                <svg viewBox="0 0 100 100">
                  <circle className="bg" cx="50" cy="50" r="40"></circle>
                  <circle className="progress approval" cx="50" cy="50" r="40" style={{ strokeDashoffset: '37.6' }}></circle>
                </svg>
                <span className="percentage">85%</span>
              </div>
              <span className="stat-label">Aprobación General</span>
            </div>
            <div className="progress-widget">
              <div className="circular-progress">
                <svg viewBox="0 0 100 100">
                  <circle className="bg" cx="50" cy="50" r="40"></circle>
                  <circle className="progress rejection" cx="50" cy="50" r="40" style={{ strokeDashoffset: '213.5' }}></circle>
                </svg>
                <span className="percentage">15%</span>
              </div>
              <span className="stat-label">Tasa de Rechazo</span>
            </div>
          </div>
        </section>

        {/* Widget: Calendario de Facturas */}
        <section className="bento-item invoice-calendar">
          <div className="bento-header">
            <div className="icon-box">
              <span className="material-symbols-outlined">inventory_2</span>
            </div>
            <h3>Próximas Facturas</h3>
          </div>
          <div className="invoice-list">
            <div className="invoice-row">
              <div className="invoice-info">
                <span className="inv-id">#INV-2210</span>
                <span className="inv-desc">Acero Inoxidable</span>
              </div>
              <span className="inv-date urgent">Hoy</span>
            </div>
            <div className="invoice-row">
              <div className="invoice-info">
                <span className="inv-id">#INV-2214</span>
                <span className="inv-desc">Comp. Hidráulicos</span>
              </div>
              <span className="inv-date">24 Oct</span>
            </div>
          </div>
        </section>

        {/* Widget: Manufactura (Full Width) */}
        <section className="bento-item production-flow full-width">
          <div className="production-header">
            <div className="title-group">
              <div className="icon-box dark">
                <span className="material-symbols-outlined">settings_suggest</span>
              </div>
              <h3>Flujo de Manufactura Detallado</h3>
            </div>
            <div className="production-stats">
              <div className="stat-pill">
                <span className="label">Activas</span>
                <span className="value">08</span>
              </div>
              <div className="stat-pill">
                <span className="label">En Cola</span>
                <span className="value">14</span>
              </div>
            </div>
          </div>
          <div className="production-grid">
            <div className="active-orders">
              <h4 className="section-subtitle">En Proceso Crítico</h4>
              <div className="progress-item">
                <div className="progress-info">
                  <span>Orden #SP-9822 - Lote A</span>
                  <span>72%</span>
                </div>
                <div className="progress-bar-container">
                  <div className="progress-bar" style={{ width: '72%' }}></div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  };

  return (
    <div className={`dashboard-root role-${userRole.toLowerCase().replace(/\s+/g, '-')}`}>
      {/* Sidebar de Navegación */}
      <nav className="side-nav">
        <div className="nav-brand">
          <img src={logoImg} alt="Logo" className="nav-logo" />
          <div className="brand-text">
            <h1>Sealing Admin</h1>
            <p>Manufacturing Portal</p>
          </div>
        </div>

        <div className="nav-menu">
          <button className={`nav-link ${!activeAction ? 'active' : ''}`} onClick={() => setActiveAction(null)}>
            <span className="material-symbols-outlined">dashboard</span>
            Panel
          </button>
          
          <div className="nav-divider"></div>
          
          {/* Acciones por Rol movidas al Sidebar */}
          {userRole === 'Administrador' && (
            <>
              <button className={`nav-link ${activeAction === 'users' ? 'active' : ''}`} onClick={() => handleActionClick('users')}>
                <span className="material-symbols-outlined">group</span>
                Usuarios
              </button>
              <button className={`nav-link ${activeAction === 'applicants' ? 'active' : ''}`} onClick={() => handleActionClick('applicants')}>
                <span className="material-symbols-outlined">assignment_ind</span>
                Postulantes
              </button>
            </>
          )}

          {userRole === 'Trabajador' && (
            <>
              <button className={`nav-link ${activeAction === 'add_factura' ? 'active' : ''}`} onClick={() => setActiveAction('add_factura')}>
                <span className="material-symbols-outlined">description</span>
                Agregar Factura
              </button>
              <button className={`nav-link ${activeAction === 'inspection' ? 'active' : ''}`} onClick={() => setActiveAction('inspection')}>
                <span className="material-symbols-outlined">fact_check</span>
                Inspección
              </button>
            </>
          )}

          {userRole === 'Jefe de Calidad' && (
            <>
              <button className={`nav-link ${activeAction === 'add_proveedor' ? 'active' : ''}`} onClick={() => setActiveAction('add_proveedor')}>
                <span className="material-symbols-outlined">store</span>
                Agregar Proveedor
              </button>
              <button className={`nav-link ${activeAction === 'edit_proveedor' ? 'active' : ''}`} onClick={() => setActiveAction('edit_proveedor')}>
                <span className="material-symbols-outlined">edit_note</span>
                Modificar Proveedor
              </button>
              <button className={`nav-link ${activeAction === 'charts' ? 'active' : ''}`} onClick={() => setActiveAction('charts')}>
                <span className="material-symbols-outlined">bar_chart</span>
                Gráficos
              </button>
            </>
          )}

          {userRole === 'Jefe de Ingeniería' && (
            <>
              <button className={`nav-link ${activeAction === 'add_insumo' ? 'active' : ''}`} onClick={() => setActiveAction('add_insumo')}>
                <span className="material-symbols-outlined">precision_manufacturing</span>
                Agregar Insumo
              </button>
              <button className={`nav-link ${activeAction === 'edit_insumo' ? 'active' : ''}`} onClick={() => setActiveAction('edit_insumo')}>
                <span className="material-symbols-outlined">edit_square</span>
                Modificar Insumo
              </button>
            </>
          )}
        </div>

        <div className="nav-footer">
          <button className="nav-link logout-btn" onClick={onLogout}>
            <span className="material-symbols-outlined">logout</span>
            Cerrar Sesión
          </button>
        </div>
      </nav>

      {/* Main Viewport */}
      <main className="main-viewport">
        <header className="top-app-bar">
          <div className="header-left">
            <span className="material-symbols-outlined menu-icon">menu</span>
            <h2 className="page-title">
              {activeAction ? activeAction.toUpperCase().replace('_', ' ') : 'Panel de Control Operativo'}
            </h2>
          </div>
          
          <div className="header-right">
            <div className="user-profile-trigger" onClick={() => setShowProfile(true)}>
              <div className="user-info">
                <p className="user-name">{user.name}</p>
                <p className="user-role-label">{userRole}</p>
              </div>
              <div className="avatar-circle">
                <img src={logoImg} alt="Profile" className="avatar-img" />
              </div>
            </div>
          </div>
        </header>

        <div className="content-container">
          {renderDashboardContent()}
        </div>

        <footer className="main-footer">
          <span className="footer-copy">© 2026 Sealing Products C.A. • Gestión de Activos Industriales</span>
        </footer>
      </main>

      {/* Modal de Perfil (Lógica mantenida) */}
      {showProfile && (
        <div className="modal-overlay">
          <div className="profile-modal">
            <button className="close-btn" onClick={() => setShowProfile(false)}>×</button>
            <h2 className="form-title">Configuración de Seguridad</h2>
            <form className="admin-form" onSubmit={handlePasswordSubmit}>
              <div className="form-field">
                <label>Contraseña Actual</label>
                <div className="password-input-wrapper">
                  <input type={showPass.current ? "text" : "password"} name="currentPassword" value={passwordForm.currentPassword} onChange={handlePasswordInputChange} placeholder="••••••••" required />
                  <button type="button" className="password-toggle-btn" onClick={() => toggleVisibility('current')}>
                    <span className="material-symbols-outlined">{showPass.current ? 'visibility_off' : 'visibility'}</span>
                  </button>
                </div>
              </div>
              <div className="form-grid">
                <div className="form-field">
                  <label>Nueva Contraseña</label>
                  <div className="password-input-wrapper">
                    <input type={showPass.new ? "text" : "password"} name="newPassword" value={passwordForm.newPassword} onChange={handlePasswordInputChange} placeholder="••••••••" required />
                    <button type="button" className="password-toggle-btn" onClick={() => toggleVisibility('new')}>
                      <span className="material-symbols-outlined">{showPass.new ? 'visibility_off' : 'visibility'}</span>
                    </button>
                  </div>
                </div>
                <div className="form-field">
                  <label>Confirmar Nueva</label>
                  <div className="password-input-wrapper">
                    <input type={showPass.confirm ? "text" : "password"} name="confirmPassword" value={passwordForm.confirmPassword} onChange={handlePasswordInputChange} placeholder="••••••••" required />
                    <button type="button" className="password-toggle-btn" onClick={() => toggleVisibility('confirm')}>
                      <span className="material-symbols-outlined">{showPass.confirm ? 'visibility_off' : 'visibility'}</span>
                    </button>
                  </div>
                </div>
              </div>
              <div className="form-actions">
                <button type="submit" className="btn btn-primary">Actualizar Credenciales</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;