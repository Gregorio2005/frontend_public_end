import React, { useState, useEffect } from 'react';
import { updateProfile, getProfile } from '../services/authService';
import Logo from '../components/Logo';
import ConfirmModal from '../components/ConfirmModal';
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
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Estado para el modal de estado (Aprobación/Error)
  const [statusModal, setStatusModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'info'
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

  // Carga inicial del perfil completo desde la base de datos al montar el Dashboard
  useEffect(() => {
    const loadProfileData = async () => {
      setLoadingProfile(true);
      try {
        const data = await getProfile();
        setProfileData(data);
      } catch (error) {
        console.error("Error al recopilar información de la base de datos:", error);
      } finally {
        setLoadingProfile(false);
      }
    };
    loadProfileData();
  }, []);

  const toggleVisibility = (field) => {
    setShowPass(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const handlePasswordInputChange = (e) => {
    const { name, value } = e.target;
    setPasswordForm(prev => ({ ...prev, [name]: value }));
  };

  const handlePasswordUpdateSubmit = async (e) => {
    e.preventDefault();
    const { currentPassword, newPassword, confirmPassword } = passwordForm;

    if (!currentPassword || !newPassword || !confirmPassword) {
      setStatusModal({
        isOpen: true,
        title: 'Campos Incompletos',
        message: 'Por favor, complete todos los campos de contraseña.',
        type: 'danger'
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      setStatusModal({
        isOpen: true,
        title: 'Error de Coincidencia',
        message: 'La nueva contraseña y su confirmación no coinciden.',
        type: 'danger'
      });
      return;
    }
    try {
      await updateProfile({ 
        currentPassword,
        password: newPassword
      });
      setStatusModal({
        isOpen: true,
        title: 'Actualización Exitosa',
        message: 'Tu contraseña ha sido actualizada con éxito en el sistema.',
        type: 'info'
      });
      setPasswordForm({ 
        currentPassword: '', 
        newPassword: '', 
        confirmPassword: '' 
      });
    } catch (err) {
      setStatusModal({
        isOpen: true,
        title: 'Error de Actualización',
        message: `No se pudo cambiar la contraseña: ${err.message}`,
        type: 'danger'
      });
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
    const roleSource = profileData?.role || user.role || user.roles_id || '';
    const roleInput = roleSource.toString().toLowerCase();
    
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

    if (activeAction === 'profile') {
      return (
        <div className="form-container">
          <h2 className="form-title">Configuración de Seguridad y Perfil</h2>
          
          <div className="welcome-card" style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '2rem', border: '1px solid var(--outline-variant)' }}>
            <div className="avatar-circle" style={{ width: '80px', height: '80px', border: '2px solid var(--primary)' }}>
              <img src={logoImg} alt="Profile" className="avatar-img" />
            </div>
            <div>
              <h3 style={{ margin: 0, color: 'var(--primary)', fontSize: '1.5rem' }}>
                {profileData?.name || user.name} {profileData?.lastname || user.lastname || ''}
              </h3>
              <p style={{ margin: '5px 0', color: 'var(--secondary)', fontWeight: '700', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>{profileData?.role || userRole}</p>
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--on-surface)' }}>{profileData?.email || user.email || 'usuario@sealingproducts.com'}</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '3rem', alignItems: 'start' }}>
            {/* Columna Izquierda: Información General (Solo Lectura) */}
            <div className="form-section-left">
              <h3 style={{ fontSize: '1rem', marginBottom: '1.5rem', color: 'var(--secondary)', borderBottom: '1px solid var(--outline-variant)', paddingBottom: '0.5rem', textTransform: 'uppercase', fontWeight: '700' }}>
                Ficha de Identidad
              </h3>
              <div className="profile-data-display" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div className="data-item">
                  <label style={{ fontSize: '0.7rem', color: 'var(--secondary)', textTransform: 'uppercase', fontWeight: '700', display: 'block', marginBottom: '4px' }}>Nombres y Apellidos</label>
                  <p style={{ margin: 0, fontSize: '1rem', color: 'var(--on-surface)', fontWeight: '500' }}>{profileData?.name || user.name} {profileData?.lastname || user.lastname || ''}</p>
                </div>
                <div className="data-item">
                  <label style={{ fontSize: '0.7rem', color: 'var(--secondary)', textTransform: 'uppercase', fontWeight: '700', display: 'block', marginBottom: '4px' }}>Cédula de Identidad</label>
                  <p style={{ margin: 0, fontSize: '1rem', color: 'var(--on-surface)' }}>{profileData?.ci || user.ci || 'V-00.000.000'}</p>
                </div>
                <div className="data-item">
                  <label style={{ fontSize: '0.7rem', color: 'var(--secondary)', textTransform: 'uppercase', fontWeight: '700', display: 'block', marginBottom: '4px' }}>Cargo / Rol Asignado</label>
                  <p style={{ margin: 0, fontSize: '1rem', color: 'var(--primary)', fontWeight: '700' }}>{profileData?.role || userRole}</p>
                </div>
                <div className="data-item">
                  <label style={{ fontSize: '0.7rem', color: 'var(--secondary)', textTransform: 'uppercase', fontWeight: '700', display: 'block', marginBottom: '4px' }}>Correo Corporativo</label>
                  <p style={{ margin: 0, fontSize: '1rem', color: 'var(--on-surface)' }}>{profileData?.email || user.email || 'N/A'}</p>
                </div>
                <div className="data-item">
                  <label style={{ fontSize: '0.7rem', color: 'var(--secondary)', textTransform: 'uppercase', fontWeight: '700', display: 'block', marginBottom: '4px' }}>Nombre de Usuario</label>
                  <p style={{ margin: 0, fontSize: '1rem', color: 'var(--on-surface)', fontFamily: 'monospace' }}>{profileData?.user || user.user || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Columna Derecha: Credenciales de Seguridad */}
            <div className="form-section-right">
              <form className="admin-form" onSubmit={handlePasswordUpdateSubmit}>
                <h3 style={{ fontSize: '1rem', marginBottom: '1.5rem', color: 'var(--secondary)', borderBottom: '1px solid var(--outline-variant)', paddingBottom: '0.5rem', textTransform: 'uppercase', fontWeight: '700' }}>
                  Actualizar Credenciales de Acceso
                </h3>
                
                <div className="form-field" style={{ marginBottom: '1.5rem' }}>
                  <label>Contraseña Actual</label>
                  <div style={{ position: 'relative' }}>
                    <input 
                      type={showPass.current ? "text" : "password"} 
                      name="currentPassword" 
                      className="field-input" 
                      value={passwordForm.currentPassword} 
                      onChange={handlePasswordInputChange} 
                      placeholder="Ingrese su clave actual" 
                      required 
                    />
                    <button type="button" onClick={() => toggleVisibility('current')} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--secondary)', display: 'flex' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>{showPass.current ? 'visibility_off' : 'visibility'}</span>
                    </button>
                  </div>
                </div>

                <div className="form-grid">
                  <div className="form-field">
                    <label>Nueva Contraseña</label>
                    <div style={{ position: 'relative' }}>
                      <input 
                        type={showPass.new ? "text" : "password"} 
                        name="newPassword" 
                        className="field-input" 
                        value={passwordForm.newPassword} 
                        onChange={handlePasswordInputChange} 
                        placeholder="Mínimo 8 caracteres" 
                        required 
                      />
                      <button type="button" onClick={() => toggleVisibility('new')} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--secondary)', display: 'flex' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>{showPass.new ? 'visibility_off' : 'visibility'}</span>
                      </button>
                    </div>
                  </div>
                  <div className="form-field">
                    <label>Confirmar Nueva Contraseña</label>
                    <div style={{ position: 'relative' }}>
                      <input 
                        type={showPass.confirm ? "text" : "password"} 
                        name="confirmPassword" 
                        className="field-input" 
                        value={passwordForm.confirmPassword} 
                        onChange={handlePasswordInputChange} 
                        placeholder="Repita su nueva clave" 
                        required 
                      />
                      <button type="button" onClick={() => toggleVisibility('confirm')} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--secondary)', display: 'flex' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>{showPass.confirm ? 'visibility_off' : 'visibility'}</span>
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="form-actions" style={{ marginTop: '2.5rem' }}>
                  <button type="submit" className="btn btn-primary">Actualizar contraseña</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      );
    }

    if (activeAction) {
    switch (userRole) {
      case 'Administrador':
        return <AdminDashboardContent activeAction={activeAction} refreshKey={refreshKey} />;
      case 'Jefe de Calidad':
        return <JefeCalidadDashboardContent activeAction={activeAction} user={profileData || user} />;
      case 'Jefe de Ingeniería':
        return <JefeIngenieriaDashboardContent activeAction={activeAction} user={profileData || user} />;
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

    // Solo el administrador tiene acceso a las estadísticas generales (Bento Grid)
    // Si es otro rol y no hay acción activa, mostramos bienvenida personalizada
    if (userRole !== 'Administrador') {
      return (
        <section className="welcome-card">
          <h2 style={{ color: 'var(--primary)', marginBottom: '1rem' }}>Bienvenido, {user.name}</h2>
          <p>Por favor, seleccione una de las opciones en el menú de la izquierda para gestionar las tareas de <strong>{userRole}</strong>.</p>
        </section>
      );
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
    <div className={`dashboard-root role-${userRole.toLowerCase().replace(/\s+/g, '-')} ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      {/* Modal de Estado para el Perfil */}
      <ConfirmModal 
        isOpen={statusModal.isOpen}
        title={statusModal.title}
        message={statusModal.message}
        type={statusModal.type}
        confirmText="Entendido"
        onConfirm={() => setStatusModal(prev => ({ ...prev, isOpen: false }))}
        onCancel={() => setStatusModal(prev => ({ ...prev, isOpen: false }))}
      />

      {/* Sidebar de Navegación */}
      <nav className="side-nav">
        <div className="nav-menu">
          {userRole === 'Administrador' && (
            <button className={`nav-link ${!activeAction ? 'active' : ''}`} onClick={() => setActiveAction(null)}>
              <span className="material-symbols-outlined">dashboard</span>
              Panel
            </button>
          )}
          
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
              <button className={`nav-link ${activeAction === 'proveedores' ? 'active' : ''}`} onClick={() => handleActionClick('proveedores')}>
                <span className="material-symbols-outlined">store</span>
                Proveedores
              </button>
              <button className={`nav-link ${activeAction === 'charts' ? 'active' : ''}`} onClick={() => handleActionClick('charts')}>
                <span className="material-symbols-outlined">bar_chart</span>
                Gráficos
              </button>
            </>
          )}

          {userRole === 'Jefe de Ingeniería' && (
            <>
              <button className={`nav-link ${activeAction === 'insumos' ? 'active' : ''}`} onClick={() => handleActionClick('insumos')}>
                <span className="material-symbols-outlined">precision_manufacturing</span>
                Insumos
              </button>
              <button className={`nav-link ${activeAction === 'inspeccion_validacion' ? 'active' : ''}`} onClick={() => handleActionClick('inspeccion_validacion')}>
                <span className="material-symbols-outlined">fact_check</span>
                Validacion de Inspeccion
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
            <span 
              className="material-symbols-outlined menu-icon" 
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            >
              {isSidebarCollapsed ? 'menu' : 'menu_open'}
            </span>
            <h2 className="page-title">
              {activeAction ? activeAction.toUpperCase().replace('_', ' ') : 'Panel'}
            </h2>
          </div>
          
          <div className="header-right">
            <div className={`user-profile-trigger ${activeAction === 'profile' ? 'active-profile' : ''}`} onClick={() => handleActionClick('profile')}>
              <div className="user-info">
                <p className="user-name">{profileData?.name || user.name}</p>
                <p className="user-role-label">{userRole}</p>
              </div>
              <div className="avatar-circle">
                <img src={logoImg} alt="Profile" className="avatar-img" />
              </div>
            </div>
            <img src={logoImg} alt="Logo Corporativo" className="header-logo" />
          </div>
        </header>

        <div className="content-container">
          {renderDashboardContent()}
        </div>

        <footer className="main-footer">
          <span className="footer-copy">© 2026 Sealing Products C.A. • Gestión de Activos Industriales</span>
        </footer>
      </main>
    </div>
  );
};

export default Dashboard;