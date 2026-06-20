import React, { useState, useEffect } from 'react';
import { updateProfile, getProfile, getBills, getSuppliers, getInspectionStats, getManufacturingFlow } from '../services/authService';
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

  // Estado para el modal del Calendario de Facturas
  const [isInvoiceCalendarOpen, setIsInvoiceCalendarOpen] = useState(false);
  // Mes y año que se está visualizando actualmente en el calendario
  const [calendarDate, setCalendarDate] = useState(new Date());
  // Lista de facturas cargadas desde el backend
  const [invoices, setInvoices] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  // Estado para el modal de detalle de una fecha específica
  const [selectedDate, setSelectedDate] = useState(null);
  const [isDateDetailOpen, setIsDateDetailOpen] = useState(false);
  // Estadísticas de inspección (conteo por estado)
  const [inspectionStats, setInspectionStats] = useState({ Aprobado: 0, Observacion: 0, Rechazado: 0, Incompleta: 0, 'Aprobado Observacion': 0, 'Rechazado Observacion': 0 });
  const [manufacturingFlow, setManufacturingFlow] = useState([]);

  // Helpers del calendario
  const MONTH_NAMES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  const WEEK_DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  const formatDateKey = (year, month, day) => {
    const mm = String(month + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    return `${year}-${mm}-${dd}`;
  };

  const goToPreviousMonth = () => {
    setCalendarDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCalendarDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCalendarDate(new Date());
  };

  // Construye la matriz de días que se renderiza en la cuadrícula del calendario
  const buildCalendarMatrix = () => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 = domingo
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const matrix = [];
    let week = [];

    // Días del mes anterior que se muestran para completar la primera semana
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      week.push({
        day: daysInPrevMonth - i,
        isCurrentMonth: false,
        dateKey: formatDateKey(month === 0 ? year - 1 : year, month === 0 ? 11 : month - 1, daysInPrevMonth - i)
      });
    }

    // Días del mes actual
    for (let day = 1; day <= daysInMonth; day++) {
      week.push({
        day,
        isCurrentMonth: true,
        dateKey: formatDateKey(year, month, day)
      });
      if (week.length === 7) {
        matrix.push(week);
        week = [];
      }
    }

    // Días del mes siguiente para completar la última semana
    let nextDay = 1;
    const nextMonth = month === 11 ? 0 : month + 1;
    const nextYear = month === 11 ? year + 1 : year;
    while (week.length < 7) {
      week.push({
        day: nextDay,
        isCurrentMonth: false,
        dateKey: formatDateKey(nextYear, nextMonth, nextDay)
      });
      nextDay++;
    }
    matrix.push(week);

    return matrix;
  };

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

  useEffect(() => {
    const loadInvoiceData = async () => {
      try {
        const [billsData, suppliersData] = await Promise.all([getBills(), getSuppliers()]);
        setSuppliers(suppliersData);
        const supplierMap = {};
        suppliersData.forEach(s => { supplierMap[s.id] = s.name; });
        const backendInvoices = billsData
          .filter(bill => bill.receipt_date)
          .map(bill => ({
            id: bill.bill_nro || `#${bill.id}`,
            date: bill.receipt_date.split('T')[0],
            description: bill.odoo || bill.nro_exp || 'Factura',
            amount: bill.nro_reception || 'N/A',
            supplier: supplierMap[bill.suppliers_id] || 'Proveedor'
          }));
        setInvoices(backendInvoices);
      } catch (error) {
        console.error("Error al cargar datos de facturas:", error);
      }
    };
    loadInvoiceData();
  }, []);

  useEffect(() => {
    const loadStats = async () => {
      const stats = await getInspectionStats();
      setInspectionStats(stats);
    };
    loadStats();
    const interval = setInterval(loadStats, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const loadManufacturingFlow = async () => {
      const data = await getManufacturingFlow();
      setManufacturingFlow(data);
    };
    loadManufacturingFlow();
  }, []);

  useEffect(() => {
    if (activeAction === null && userRole === 'Administrador') {
      getInspectionStats().then(setInspectionStats);
      getManufacturingFlow().then(setManufacturingFlow);
    }
  }, [activeAction]);

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

  // Mapeo de identificadores de acción a títulos en español para la cabecera.
  // Si el identificador no está en el mapa, se muestra una versión por defecto.
  const getPanelTitle = (action) => {
    const titles = {
      users: 'Usuarios',
      applicants: 'Postulantes',
      view_inspections: 'Ver Inspecciones',
      add_factura: 'Agregar Factura',
      inspection: 'Inspección',
      proveedores: 'Proveedores',
      charts: 'Gráficos',
      insumos: 'Insumos',
      inspeccion_validacion: 'Validación de Inspección',
      tipos_insumo: 'Tipos de Insumo',
      profile: 'Mi Perfil'
    };
    return titles[action] || action.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
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
        return <TrabajadorDashboardContent activeAction={activeAction} user={profileData || user} />;
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
            <h3>Tasa de inspección</h3>
          </div>
          <div className="stats-display">
            {(() => {
              const total = inspectionStats.Aprobado + inspectionStats.Observacion + inspectionStats.Rechazado + inspectionStats['Aprobado Observacion'] + inspectionStats['Rechazado Observacion'];
              const circ = 251.2;
              const obsTotal = inspectionStats.Observacion + inspectionStats['Aprobado Observacion'] + inspectionStats['Rechazado Observacion'];
              const stats = [
                { count: inspectionStats.Aprobado, label: 'Aprobado', cls: 'approval' },
                { count: obsTotal, label: 'Observacion', cls: 'conditional' },
                { count: inspectionStats.Rechazado, label: 'Rechazado', cls: 'rejection' }
              ];
              return stats.map(s => {
                const pct = total > 0 ? Math.round((s.count / total) * 100) : 0;
                const offset = circ * (1 - pct / 100);
                return (
                  <div className="progress-widget" key={s.label}>
                    <div className="circular-progress">
                      <svg viewBox="0 0 100 100">
                        <circle className="bg" cx="50" cy="50" r="40"></circle>
                        <circle className={`progress ${s.cls}`} cx="50" cy="50" r="40" style={{ strokeDashoffset: offset }}></circle>
                      </svg>
                      <span className="percentage">{pct}%</span>
                    </div>
                    <span className="stat-label">{s.label}</span>
                  </div>
                );
              });
            })()}
          </div>
        </section>

        {/* Widget: Calendario de Facturas */}
        <section
          className="bento-item invoice-calendar invoice-calendar-clickable"
          onClick={() => setIsInvoiceCalendarOpen(true)}
          tabIndex={0}
          role="button"
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setIsInvoiceCalendarOpen(true); }}
        >
          <div className="bento-header">
            <div className="icon-box">
              <span className="material-symbols-outlined">inventory_2</span>
            </div>
            <h3>Próximas Facturas</h3>
          </div>
          <div className="invoice-list">
            {invoices.slice(0, 2).map((inv, idx) => (
              <div className="invoice-row" key={idx}>
                <div className="invoice-info">
                  <span className="inv-id">{inv.id}</span>
                  <span className="inv-desc">{inv.description}</span>
                </div>
                <span className="inv-date">{inv.date ? new Date(inv.date + 'T12:00:00').toLocaleDateString('es-VE', { day: 'numeric', month: 'short' }) : ''}</span>
              </div>
            ))}
          </div>
          <div className="invoice-calendar-cta">
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>calendar_month</span>
            Ver Calendario de Facturas
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
                <span className="value">{String(manufacturingFlow.length).padStart(2, '0')}</span>
              </div>
              <div className="stat-pill">
                <span className="label">Insumos</span>
                <span className="value">{String(manufacturingFlow.reduce((acc, b) => acc + b.items.length, 0)).padStart(2, '0')}</span>
              </div>
            </div>
          </div>
          <div className="production-grid">
            <div className="active-orders">
              <h4 className="section-subtitle">Facturas del Mes Actual</h4>
              {manufacturingFlow.length === 0 ? (
                <p style={{ color: '#94a3b8', fontSize: '0.85rem', padding: '0.5rem 0' }}>No hay facturas registradas para este mes.</p>
              ) : (
                manufacturingFlow.map((bill) => {
                  const INSPECTION_PCT = 0.08;
                  const totalInspectionsNeeded = bill.items.reduce((acc, item) => acc + Math.max(1, Math.ceil(item.quantity * INSPECTION_PCT)), 0);
                  const totalInspectionsDone = bill.items.reduce((acc, item) => acc + item.inspection_count, 0);
                  const billPct = totalInspectionsNeeded > 0 ? Math.min(100, Math.round((totalInspectionsDone / totalInspectionsNeeded) * 100)) : 0;
                  return (
                    <div className="progress-item" key={bill.id}>
                      <div className="progress-info">
                        <span>{bill.bill_nro || `Factura #${bill.id}`} — {bill.supplier_name}</span>
                        <span>{totalInspectionsDone}/{totalInspectionsNeeded} ({billPct}%)</span>
                      </div>
                      <div className="progress-bar-container">
                        <div className="progress-bar" style={{ width: `${billPct}%` }}></div>
                      </div>
                    </div>
                  );
                })
              )}
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
              <button className={`nav-link ${activeAction === 'view_inspections' ? 'active' : ''}`} onClick={() => handleActionClick('view_inspections')}>
                <span className="material-symbols-outlined">visibility</span>
                Ver Inspecciones
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
              {activeAction ? getPanelTitle(activeAction) : 'Panel'}
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

      {/* Modal del Calendario de Facturas */}
      {isInvoiceCalendarOpen && (
        <div className="modal-overlay" onClick={() => setIsInvoiceCalendarOpen(false)}>
          <div className="modal-container invoice-calendar-modal" onClick={(e) => e.stopPropagation()}>
            {/* Encabezado del calendario */}
            <div className="calendar-header">
              <button className="btn btn-secondary calendar-nav-btn" onClick={goToPreviousMonth}>
                <span className="material-symbols-outlined">chevron_left</span>
              </button>
              <div className="calendar-title">
                <span className="calendar-month">{MONTH_NAMES[calendarDate.getMonth()]}</span>
                <span className="calendar-year">{calendarDate.getFullYear()}</span>
              </div>
              <button className="btn btn-secondary calendar-nav-btn" onClick={goToNextMonth}>
                <span className="material-symbols-outlined">chevron_right</span>
              </button>
            </div>

            <button className="btn btn-secondary calendar-today-btn" onClick={goToToday}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>today</span>
              Hoy
            </button>

            {/* Encabezados de días de la semana */}
            <div className="calendar-weekdays">
              {WEEK_DAY_NAMES.map(day => (
                <div className="calendar-weekday" key={day}>{day}</div>
              ))}
            </div>

            {/* Cuadrícula del calendario */}
            <div className="calendar-grid">
              {buildCalendarMatrix().map((week, wIdx) =>
                week.map((cell, dIdx) => {
                  const dayInvoices = invoices.filter(inv => inv.date === cell.dateKey);
                  const hasInvoice = dayInvoices.length > 0;
                  const cellClass = [
                    'calendar-cell',
                    !cell.isCurrentMonth ? 'calendar-cell-other' : '',
                    cell.dateKey === formatDateKey(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()) ? 'calendar-cell-today' : '',
                    hasInvoice ? 'calendar-cell-has-invoice' : ''
                  ].filter(Boolean).join(' ');

                  return (
                    <div
                      className={cellClass}
                      key={`${wIdx}-${dIdx}`}
                      style={hasInvoice ? { cursor: 'pointer' } : undefined}
                      onClick={hasInvoice ? () => { setSelectedDate({ dateKey: cell.dateKey, invoices: dayInvoices }); setIsDateDetailOpen(true); } : undefined}
                    >
                      <span className="calendar-day-number">{cell.day}</span>
                      {hasInvoice && (
                        <div className="calendar-invoice-dots">
                          <span className="calendar-invoice-dot" title="Factura programada">
                            {dayInvoices.length}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Leyenda */}
            <div className="calendar-legend">
              <div className="legend-item">
                <span className="legend-dot legend-dot-today"></span>
                Hoy
              </div>
              <div className="legend-item">
                <span className="legend-dot legend-dot-invoice"></span>
                Factura programada
              </div>
              <div className="legend-item">
                <span className="legend-dot legend-dot-other"></span>
                Día fuera de mes
              </div>
            </div>

            {/* Botón de cerrar */}
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setIsInvoiceCalendarOpen(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Detalle de Facturas por Fecha */}
      {isDateDetailOpen && selectedDate && (
        <div className="modal-overlay" onClick={() => setIsDateDetailOpen(false)} style={{ zIndex: 3100 }}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--outline-variant)', backgroundColor: 'var(--surface-container-low)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '700', color: 'var(--on-surface)' }}>
                  Facturas del {new Date(selectedDate.dateKey + 'T12:00:00').toLocaleDateString('es-VE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--secondary)' }}>
                  {selectedDate.invoices.length} factura{selectedDate.invoices.length !== 1 ? 's' : ''} encontrada{selectedDate.invoices.length !== 1 ? 's' : ''}
                </p>
              </div>
              <span className="material-symbols-outlined" style={{ color: 'var(--primary)', fontSize: '28px' }}>receipt_long</span>
            </div>

            <div style={{ padding: '1rem 1.5rem', maxHeight: '400px', overflowY: 'auto' }}>
              <ul className="calendar-invoice-items">
                {selectedDate.invoices.map((inv, idx) => (
                  <li className="calendar-invoice-item" key={idx}>
                    <div className="calendar-invoice-info">
                      <span className="calendar-invoice-id">{inv.id}</span>
                      <span className="calendar-invoice-desc">{inv.description}</span>
                    </div>
                    <div className="calendar-invoice-meta">
                      <span className="calendar-invoice-date">{inv.supplier}</span>
                      <span className="calendar-invoice-amount">{inv.amount}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setIsDateDetailOpen(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;