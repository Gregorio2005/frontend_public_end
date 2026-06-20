import React, { useState, useEffect } from 'react';
import { registerUser, getUsers, updateUser, getApplicants, updateApplicantStatus, updateProfile, updateWebsiteNotice, getWebsiteNotice, getNoticesList, getNoticeById, publishNotice, getBills, getBillInputsByBillId, getInspectionResults } from '../services/authService'; 
import ConfirmModal from '../components/ConfirmModal';
 
const AdminDashboardContent = ({ activeAction, refreshKey }) => {
  // Estado inicial siguiendo el orden de la base de datos
  const [formData, setFormData] = useState({
    user: '',
    password: '',
    name: '',
    lastname: '',
    ci_type: 'V-',
    ci_number: '',
    email: '',
    roles_id: '1', // Por defecto Administrador
    status: 'Activo' // Ahora con mayúscula inicial según el backend
  });

  const [loading, setLoading] = useState(false);

  // Estado para notificaciones personalizadas (Reemplaza a window.alert)
  const [notification, setNotification] = useState({ message: '', type: 'success', visible: false });

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type, visible: true });
    setTimeout(() => {
      setNotification(prev => ({ ...prev, visible: false }));
    }, 4000);
  };

  // Mapeos y Helpers para Visualización de Inspecciones
  const idToSpanishType = {
    1: 'Estoperas', 2: 'Sellos', 3: 'O-Rings', 4: 'Químicos', 5: 'Bolsas',
    6: 'Cartón', 7: 'Estuches', 8: 'Termoplásticos', 9: 'Empaquetaduras', 10: 'Collares'
  };

  const measurementTypes = ['Estoperas', 'Sellos', 'O-Rings', 'Químicos', 'Bolsas', 'Cartón', 'Estuches', 'Termoplásticos', 'Empaquetaduras', 'Collares'];

  const getSpecsByTypeId = (typeId) => {
    const specs = {
      1: ['internal_diameter', 'external_diameter', 'height'],
      2: ['internal_diameter', 'external_diameter', 'height_a', 'height_b'],
      3: ['internal_diameter', 'height'],
      4: ['presentation', 'batch_date', 'production_test'],
      5: ['height', 'width', 'art', 'caliber'],
      6: ['height', 'width', 'caliber'],
      7: ['caliber', 'armed'],
      8: ['visual'],
      9: ['thickness_a', 'thickness_b', 'thickness_c', 'thickness_d', 'ring_diameter_a', 'ring_diameter_b', 'ring_diameter_c', 'ring_diameter_d'],
      10: ['internal_diameter', 'height', 'joint'],
    };
    return specs[typeId] || [];
  };

  const getLabel = (key) => {
    const labels = {
      internal_diameter: 'Diámetro Interno Ø',
      external_diameter: 'Diámetro Externo Ø',
      height: 'Altura',
      height_a: 'Altura A',
      height_b: 'Altura B',
      width: 'Ancho',
      batch_date: 'Fecha de Lote',
      presentation: 'Presentación',
      production_test: 'Prueba de Producción',
      visual: 'Inspección Visual',
      art: 'Arte',
      caliber: 'Calibre',
      armed: 'Armado',
      joint: 'Unión',
      thickness_a: 'Espesor A', thickness_b: 'Espesor B', thickness_c: 'Espesor C', thickness_d: 'Espesor D',
      ring_diameter_a: 'Ø de Anillo A', ring_diameter_b: 'Ø de Anillo B', ring_diameter_c: 'Ø de Anillo C', ring_diameter_d: 'Ø de Anillo D'
    };
    return labels[key] || key;
  };

  const getMeasurementStatus = (value, allowed, key) => {
    // Si es un campo de fecha, no aplica evaluación de estado (Aprobado/Rechazado)
    if (key.includes('date')) return { text: '', color: 'transparent' };

    // Caso para campos booleanos (Químicos, Termoplásticos, etc.)
    if (['presentation', 'production_test', 'visual', 'joint'].includes(key)) {
      if (value === undefined || value === '') return { text: '', color: 'transparent' };
      return value === true ? { text: 'Aprobado', color: '#10b981' } : { text: 'Rechazado', color: '#ef4444' };
    }

    // Caso para medidas numéricas
    if (value === undefined || value === '' || allowed === undefined || isNaN(Number(allowed))) return { text: '', color: 'transparent' };
    const val = Number(value);
    const target = Number(allowed);
    
    if (val === target) return { text: 'Aprobado', color: '#10b981' }; 
    
    const diff = Math.abs(val - target);
    if (diff <= 0.2) return { text: 'Observación', color: '#fbbf24' };
    
    return { text: 'Rechazado', color: '#ef4444' };
  };

  // Estados para la Visualización de Inspecciones
  const [inspectionInvoices, setInspectionInvoices] = useState([]);
  const [selectedInvoiceItems, setSelectedInvoiceItems] = useState([]);
  const [inspectionHistory, setInspectionHistory] = useState([]);
  const [inspectionView, setInspectionView] = useState({
    invoiceId: '',
    insumoIndex: '',
    currentStep: 1,
    tipo: ''
  });

  // Estado para los avisos
  const [websiteNotice, setWebsiteNotice] = useState({ id: null, name: '', note: '', enabled: false }); // Inicializamos con valores vacíos, incluyendo id
  const [noticesList, setNoticesList] = useState([]); // Lista para la tabla
  const [noticeSearchTerm, setNoticeSearchTerm] = useState(''); // Buscador de avisos
  const [processingId, setProcessingId] = useState(null); // Para saber qué fila se está cargando

  // Función para cargar la lista de mensajes registrados
  const loadNotices = async () => {
    try {
      const data = await getNoticesList();
      setNoticesList(data);
    } catch (error) {
      console.error("Error al cargar avisos:", error);
    }
  };

  useEffect(() => {
    if (activeAction === 'applicants') {
      loadNotices();
      // Cargamos el aviso actual para mostrarlo en el formulario
      getWebsiteNotice().then(currentNotice => {
        if (currentNotice && currentNotice.id) {
          setWebsiteNotice({ ...currentNotice });
        }
      });
      
    }

    if (activeAction === 'view_inspections') {
      setLoading(true);
      getBills().then(setInspectionInvoices).catch(console.error).finally(() => setLoading(false));
    }
  }, [activeAction]); // Depende de activeAction para recargar al entrar a la sección

  // Handler para cambios en los inputs del aviso del sitio web
  const handleWebsiteNoticeChange = (e) => {
    const { name, value } = e.target;
    setWebsiteNotice(prev => ({ ...prev, [name]: value }));
  };

  // Handler para publicar oficialmente un mensaje de la tabla
  const handleSelectNotice = async (notice) => {
    setConfirmModal({
      isOpen: true,
      title: 'Confirmar Publicación',
      message: `¿Desea establecer "${notice.name}" como el aviso activo del sitio web?`,
      onConfirm: async () => {
        setProcessingId(notice.id);
        try {
          await publishNotice(notice.id);
          const freshNotice = await getNoticeById(notice.id);
          setWebsiteNotice({ ...freshNotice, enabled: true });
          await loadNotices(); // Refrescar tabla para actualizar el botón resaltado
          showNotification("El aviso ha sido publicado correctamente.");
        } catch (error) {
          showNotification(`Error: ${error.message}`, "error");
        } finally {
          setProcessingId(null);
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  // Estados para la lista de usuarios
  const [users, setUsers] = useState([]);
  const [fetchingUsers, setFetchingUsers] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);
  const [editFormData, setEditFormData] = useState({});

  // Estado para el buscador
  const [searchTerm, setSearchTerm] = useState('');

  // Estados para la lista de postulantes
  const [applicants, setApplicants] = useState([]);
  const [fetchingApplicants, setFetchingApplicants] = useState(false);

  // Estado interno para alternar entre la lista de usuarios y el registro
  const [subView, setSubView] = useState('list'); // 'list' o 'add'

  // Estado para el Modal de Confirmación
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  // Cargar usuarios cuando se entra a la sección de usuarios en modo lista
  useEffect(() => {
    if (activeAction === 'users' && subView === 'list') {
      const loadUsers = async () => {
        setFetchingUsers(true);
        try {
          const data = await getUsers();
          // Normalización definitiva: asegurar que siempre sea un array para evitar errores de .map()
          let usersList = [];
          if (Array.isArray(data)) usersList = data;
          else if (data && Array.isArray(data.data)) usersList = data.data;

          console.log("Usuarios cargados:", usersList); // Para depuración
          setUsers(usersList);
        } catch (error) {
          console.error("Error al cargar la tabla:", error);
        } finally {
          setFetchingUsers(false);
        }
      };
      loadUsers();
    }

    // Cargar postulantes cuando se selecciona la acción correspondiente
    if (activeAction === 'applicants') {
      const loadApplicants = async () => {
        setFetchingApplicants(true);
        try {
          const data = await getApplicants();
          setApplicants(data);
        } catch (error) {
          console.error("Error al cargar postulantes:", error);
        } finally {
          setFetchingApplicants(false);
        }
      };
      loadApplicants();
    }
  }, [activeAction, subView, refreshKey]);

  const handleInspectionViewChange = async (e) => {
    const { name, value } = e.target;
    if (name === 'invoiceId') {
      setLoading(true);
      try {
        const items = await getBillInputsByBillId(value);
        // Organizamos los insumos por tipo y referencia tal cual como en trabajador
        const sortedItems = items.sort((a, b) => {
          if (a.type_inputs_id !== b.type_inputs_id) return a.type_inputs_id - b.type_inputs_id;
          return (a.reference || '').localeCompare(b.reference || '');
        });
        setSelectedInvoiceItems(sortedItems);
        setInspectionView({ invoiceId: value, insumoIndex: '', currentStep: 1, tipo: '' });
        setInspectionHistory([]);
      } catch (err) { showNotification("Error al cargar insumos", "error"); }
      finally { setLoading(false); }
    } else if (name === 'insumoIndex') {
      const ins = selectedInvoiceItems[value];
      setLoading(true);
      try {
        const results = await getInspectionResults(ins.type_inputs_id, ins.id);
        setInspectionHistory(results);
        setInspectionView(prev => ({ 
          ...prev, 
          insumoIndex: value, 
          currentStep: 1,
          tipo: idToSpanishType[ins.type_inputs_id] || 'Desconocido'
        }));
      } catch (err) { showNotification("Error al cargar inspecciones", "error"); }
      finally { setLoading(false); }
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    // Validación estricta para el número de cédula: solo números
    if (name === 'ci_number') {
      const numericValue = value.replace(/\D/g, '');
      setFormData(prev => ({ ...prev, [name]: numericValue }));
    } else {
    setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Conversión de tipos para asegurar compatibilidad estricta con la DB
      const dataToSend = {
        ...formData,
        ci: `${formData.ci_type}${formData.ci_number}`, // Combina prefijo y número
        roles_id: parseInt(formData.roles_id, 10),
        status: formData.status // Ya viene como 'Activo' o 'Inactivo'
      };

      await registerUser(dataToSend);
      showNotification("Usuario registrado con éxito en la base de datos.");
      
      // Limpiar formulario tras éxito
      setFormData({
        user: '', password: '', name: '', lastname: '',
        ci_type: 'V-', ci_number: '', email: '', roles_id: '1', status: 'Activo'
      });
    } catch (error) {
      showNotification(`Error: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Manejadores para la edición recomendada
  const handleEditClick = (user) => {
    setEditingUserId(user.user_id || user.id);
    setEditFormData({ ...user });
  };

  const handleCancelEdit = () => {
    setEditingUserId(null);
    setEditFormData({});
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveEdit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setLoading(true);
    try {
      // Estructura exacta requerida por el requerimiento
      const payload = {
        user: String(editFormData.user || ''),
        name: String(editFormData.name || ''),
        lastname: String(editFormData.lastname || ''),
        ci: String(editFormData.ci || ''), // Mantiene letras y caracteres (V, E, -, .)
        email: String(editFormData.email || ''),
        roles_id: parseInt(editFormData.roles_id, 10), // Convertido a entero
        status: editFormData.status === 'Inactivo' ? 'Inactivo' : 'Activo' // Validación estricta
      };

      await updateUser(editingUserId, payload);
      
      showNotification("Usuario actualizado exitosamente.");
      
      const data = await getUsers();
      const updatedList = Array.isArray(data) ? data : (data.data || []);
      setUsers(updatedList);
      handleCancelEdit();
    } catch (error) {
      // 4. Captura de errores de red o de respuesta del servidor (4xx, 5xx)
      console.error("Error capturado:", error);
      showNotification(`No se pudo completar la operación: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Función para convertir el ID del rol en texto legible
  const getRoleName = (id) => {
    const roles = {
      1: 'Administrador',
      2: 'Trabajador',
      3: 'Jefe de Calidad',
      4: 'Jefe de Ingeniería'
    };
    return roles[id] || 'Desconocido';
  };

  // Manejador para cambiar el estado del postulante
  const handleToggleStatus = (applicant) => {
    const isActivating = applicant.status !== 'Activo';
    
    setConfirmModal({
      isOpen: true,
      title: isActivating ? 'Activar Postulante' : 'Desactivar Postulante',
      message: `¿Está seguro de que desea cambiar el estado de ${applicant.name} ${applicant.lastname} a ${isActivating ? 'Activo' : 'Inactivo'}?`,
      onConfirm: async () => {
        setLoading(true);
        try {
          const newStatus = isActivating ? 'Activo' : 'Inactivo';
          await updateApplicantStatus(applicant.id, newStatus);
          setApplicants(prev => prev.map(a => a.id === applicant.id ? { ...a, status: newStatus } : a));
          showNotification(`Postulante ${isActivating ? 'activado' : 'desactivado'} correctamente.`);
        } catch (error) {
          showNotification(`Error: ${error.message}`, 'error');
        } finally {
          setLoading(false);
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  // Lógica de filtrado para el buscador (Nombre y CI sin prefijos)
  const filteredUsers = users.filter(u => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;

    // Búsqueda por nombre o apellido ( Gregory, Fabian, etc )
    const fullName = `${u.name} ${u.lastname}`.toLowerCase();
    const nameMatch = fullName.includes(term);

    // Búsqueda por CI ( Permite buscar '123' y encontrar 'V-123' )
    const ciStr = String(u.ci || '').toLowerCase();
    const termDigits = term.replace(/\D/g, '');
    const ciDigits = ciStr.replace(/\D/g, '');
    const ciMatch = ciStr.includes(term) || (termDigits !== '' && ciDigits.includes(termDigits));

    return nameMatch || ciMatch;
  });

  // Lógica de filtrado para el buscador de avisos
  const filteredNotices = noticesList.filter(n => {
    const term = noticeSearchTerm.toLowerCase().trim();
    if (!term) return true;
    const nameMatch = (n.name || '').toLowerCase().includes(term);
    const noteMatch = (n.note || '').toLowerCase().includes(term);
    return nameMatch || noteMatch;
  });

  return (
    <div className="dashboard-content-body">
      {/* Modal de Confirmación Custom (Reemplazo de localhost dice) */}
      <ConfirmModal 
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        confirmText="Aceptar"
        cancelText="Cancelar"
      />

      {/* Notificación Toast Industrial */}
      <div className={`notification-toast ${notification.visible ? 'visible' : ''} ${notification.type}`}>
        <span className="material-symbols-outlined">
          {notification.type === 'error' ? 'error' : 'check_circle'}
        </span>
        <span className="notification-message">{notification.message}</span>
      </div>

      {activeAction === 'users' && (
        <div className="users-management-view">
          <div className="tab-navigation" style={{ marginBottom: '2rem', display: 'flex', gap: '1rem' }}>
            <button 
              className={`btn ${subView === 'list' ? 'btn-primary' : 'btn-secondary'}`} 
              onClick={() => setSubView('list')}
            >
              Ver Usuarios
            </button>
            <button 
              className={`btn ${subView === 'add' ? 'btn-primary' : 'btn-secondary'}`} 
              onClick={() => setSubView('add')}
            >
              Agregar Usuario
            </button>
          </div>

          {subView === 'list' ? (
            <div className="form-container">
              <h2 className="form-title">Usuarios Registrados</h2>
              {fetchingUsers ? (
                <p className="loading-text">Cargando lista de usuarios...</p>
              ) : (
                <div className="table-container-card">
                  <div className="table-filters">
                    <div className="table-search-wrapper">
                      <span className="material-symbols-outlined">search</span>
                      <input 
                        type="text" 
                        className="table-search-input" 
                        placeholder="Buscar por nombre o CI..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="table-scroll-wrapper">
                  <table className="industrial-table">
                    <thead>
                      <tr>
                        <th>Usuario</th>
                        <th>Nombre</th>
                        <th>Apellido</th>
                        <th>Rol</th>
                        <th style={{ minWidth: '130px' }}>CI</th>
                        <th>Email</th>
                        <th>Estado</th>
                        <th className="text-center">Modificar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.isArray(filteredUsers) && filteredUsers.length > 0 ? (
                        [...filteredUsers]
                          .sort((a, b) => (a.roles_id || 0) - (b.roles_id || 0))
                          .map((u) => {
                            const rowId = u.user_id || u.id || u.user;
                            const isEditing = editingUserId === rowId;
                            return (
                          <tr key={rowId || `user-${u.ci}`}>
                            <td style={{ fontWeight: '600' }}>
                              {isEditing ? <input name="user" className="field-input" style={{ padding: '0.4rem' }} value={editFormData.user || ''} onChange={handleEditChange} /> : u.user}
                            </td>
                            <td>
                              {isEditing ? <input name="name" className="field-input" style={{ padding: '0.4rem' }} value={editFormData.name || ''} onChange={handleEditChange} /> : u.name}
                            </td>
                            <td>
                              {isEditing ? <input name="lastname" className="field-input" style={{ padding: '0.4rem' }} value={editFormData.lastname || ''} onChange={handleEditChange} /> : u.lastname}
                            </td>
                            <td>
                              {isEditing ? (
                                <select name="roles_id" className="field-input" style={{ padding: '0.4rem' }} value={editFormData.roles_id || ''} onChange={handleEditChange}>
                                  <option value="1">Administrador</option>
                                  <option value="2">Trabajador</option>
                                  <option value="3">Jefe de Calidad</option>
                                  <option value="4">Jefe de Ingeniería</option>
                                </select>
                              ) : (
                                <span className="role-badge">{getRoleName(u.roles_id)}</span>
                              )}
                            </td>
                            <td>
                              {isEditing ? <input name="ci" className="field-input" style={{ padding: '0.4rem' }} value={editFormData.ci || ''} onChange={handleEditChange} /> : u.ci}
                            </td>
                            <td>
                              {isEditing ? <input name="email" className="field-input" style={{ padding: '0.4rem' }} value={editFormData.email || ''} onChange={handleEditChange} /> : u.email}
                            </td>
                            <td>
                              {isEditing ? (
                                <select name="status" className="field-input" style={{ padding: '0.4rem' }} value={editFormData.status || ''} onChange={handleEditChange}>
                                  <option value="Activo">Activo</option>
                                  <option value="Inactivo">Inactivo</option>
                                </select>
                              ) : (
                                <div className="status-indicator">
                                  <div 
                                    className={`status-dot ${u.status?.toLowerCase() === 'activo' ? 'active' : 'inactive'}`}
                                  ></div>
                                  <span 
                                    style={{ 
                                      color: u.status?.toLowerCase() === 'activo' ? 'var(--on-surface)' : 'var(--secondary)',
                                      fontSize: '0.85rem' 
                                    }}
                                  >
                                    {u.status}
                                  </span>
                                </div>
                              )}
                            </td>
                            <td className="text-center">
                              {isEditing ? (
                                <>
                                  <button className="btn-icon-save" title="Guardar" onClick={handleSaveEdit} disabled={loading}>✅</button>
                                  <button className="btn-icon-cancel" title="Cancelar" onClick={handleCancelEdit} disabled={loading}>❌</button>
                                </>
                              ) : (
                                <button className="btn-icon-edit" title="Modificar" onClick={() => handleEditClick(u)}>✏️</button>
                              )}
                            </td>
                          </tr>
                            );
                          })
                      ) : (
                        <tr>
                          <td colSpan="8" className="text-center no-data">
                            No hay usuarios registrados o no se pudieron cargar.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="form-container">
              <h2 className="form-title">Registrar Nuevo Usuario</h2>
              <form className="admin-form" onSubmit={handleSubmit}>
                <div className="form-grid">
                  <div className="form-field">
                    <label>Nombre</label>
                    <input type="text" name="name" className="field-input" value={formData.name} onChange={handleChange} placeholder="Nombre" required />
                  </div>
                  <div className="form-field">
                    <label>Apellido</label>
                    <input type="text" name="lastname" className="field-input" value={formData.lastname} onChange={handleChange} placeholder="Apellido" required />
                  </div>
                  <div className="form-field">
                    <label>Nombre de Usuario</label>
                    <input type="text" name="user" className="field-input" value={formData.user} onChange={handleChange} placeholder="Nombre de acceso" required />
                  </div>
                  <div className="form-field">
                    <label>Contraseña</label>
                    <input type="password" name="password" className="field-input" value={formData.password} onChange={handleChange} placeholder="••••••••" required />
                  </div>
                  <div className="form-field">
                    <label>Cédula de Identidad</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <select 
                        name="ci_type" 
                        className="field-input" 
                        style={{ width: '80px', textAlign: 'center', fontWeight: 'bold' }}
                        value={formData.ci_type} 
                        onChange={handleChange}
                      >
                        <option value="V-">V-</option>
                        <option value="E-">E-</option>
                      </select>
                      <input 
                        type="text" 
                        name="ci_number" 
                        className="field-input" 
                        value={formData.ci_number} 
                        onChange={handleChange} 
                        placeholder="Solo números" 
                        required 
                      />
                    </div>
                  </div>
                  <div className="form-field">
                    <label>Correo Electrónico</label>
                    <input type="email" name="email" className="field-input" value={formData.email} onChange={handleChange} placeholder="correo@ejemplo.com" required />
                  </div>
                  <div className="form-field">
                    <label>Rol asignado</label>
                    <select name="roles_id" className="field-input" value={formData.roles_id} onChange={handleChange}>
                      <option value="1">Administrador</option>
                      <option value="2">Trabajador</option>
                      <option value="3">Jefe de Calidad</option>
                      <option value="4">Jefe de Ingeniería</option>
                    </select>
                  </div>
                  <div className="form-field">
                    <label>Estado de Cuenta</label>
                    <select name="status" className="field-input" value={formData.status} onChange={handleChange}>
                      <option value="Activo">Activo</option>
                      <option value="Inactivo">Inactivo</option>
                    </select>
                  </div>
                </div>
                <div className="form-actions">
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? 'Guardando...' : 'Guardar Usuario'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {activeAction === 'applicants' && (
        <div className="form-container">
          {/* NUEVA SECCIÓN: Gestión de Avisos Públicos */}
          <div style={{ marginBottom: '2.5rem', padding: '1.5rem', backgroundColor: 'var(--surface-variant)', borderRadius: '12px', border: '2px dashed var(--primary)' }}>
            <h3 style={{ fontSize: '1rem', color: 'var(--primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="material-symbols-outlined">campaign</span>
              Comunicados para el Sitio Web
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--secondary)', marginBottom: '1rem' }}>
              Seleccione una categoría para actualizar automáticamente el anuncio en la parte superior del sitio web.
            </p>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <div className="form-field" style={{ flex: 1, minWidth: '300px' }}>
                <label>Nombre del Comunicado (Ej: VACANTE ACTIVA: ADMINISTRADOR)</label>
                <input 
                  type="text" 
                  name="name" 
                  className="field-input" 
                  value={websiteNotice.name} 
                  onChange={handleWebsiteNoticeChange} 
                  placeholder="Nombre de la vacante o comunicado" 
                  required 
                />
              </div>
              <div className="form-field" style={{ flexBasis: '100%' }}>
                <label>Descripción del Mensaje</label>
                <textarea 
                  name="note" 
                  className="field-input" 
                  value={websiteNotice.note} 
                  onChange={handleWebsiteNoticeChange} 
                  placeholder="Detalle el mensaje que se mostrará en el sitio web..." 
                  rows="4" 
                  required 
                />
              </div>
              <button 
                className="btn btn-primary" 
                onClick={async () => {
                  setLoading(true);
                  try {
                    if (!websiteNotice.name || !websiteNotice.note) {
                      showNotification("El nombre y la descripción del aviso no pueden estar vacíos.", "error");
                      setLoading(false);
                      return;
                    } 
                    const updatedNotice = await updateWebsiteNotice(websiteNotice.name, websiteNotice.note);
                    setWebsiteNotice(updatedNotice); // Actualiza con la respuesta del backend
                    loadNotices(); // Refresca la tabla
                    showNotification("Comunicado del sitio web actualizado correctamente.");
                  } catch (err) {
                    showNotification(`Error al actualizar el comunicado: ${err.message}`, "error");
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading}
              >
                {loading ? 'Guardando...' : 'Guardar Comunicado'}
              </button>
            </div>
          </div>

          {/* TABLA DE MENSAJES DISPONIBLES */}
          <div style={{ marginBottom: '2.5rem' }}>
            <h3 style={{ fontSize: '1rem', color: 'var(--secondary)', marginBottom: '1rem', fontWeight: '700' }}>
              Historial de Avisos Registrados
            </h3>
            <div className="table-container-card">
              <div className="table-filters">
                <div className="table-search-wrapper">
                  <span className="material-symbols-outlined">search</span>
                  <input 
                    type="text" 
                    className="table-search-input" 
                    placeholder="Buscar en el historial de avisos..." 
                    value={noticeSearchTerm}
                    onChange={(e) => setNoticeSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <div className="table-scroll-wrapper">
                <table className="industrial-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Nombre / Vacante</th>
                      <th>Mensaje / Nota</th>
                      <th className="text-center">Seleccionar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredNotices.length > 0 ? (
                      filteredNotices.map((item) => (
                        <tr key={item.id}>
                          <td style={{ color: 'var(--secondary)', fontSize: '0.8rem' }}>#{item.id}</td>
                          <td style={{ fontWeight: '600' }}>{item.name}</td>
                          <td style={{ fontSize: '0.85rem' }}>{item.note}</td>
                          <td className="text-center">
                            <button 
                              // Resaltamos si el item tiene status true o si es el cargado actualmente
                              className={`btn ${item.status || String(websiteNotice.id) === String(item.id) ? 'btn-primary' : 'btn-secondary'}`}
                              style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }} 
                              onClick={() => handleSelectNotice(item)}
                              disabled={processingId !== null || item.status}
                            >
                              {item.status ? 'Publicado' : (processingId === item.id ? 'Cargando...' : 'Publicar Aviso')}
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan="4" className="text-center no-data">No hay mensajes registrados.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <h2 className="form-title">Postulantes Registrados</h2>
          {fetchingApplicants ? (
            <p className="loading-text">Cargando lista de postulantes...</p>
          ) : (
            <div className="table-container-card">
              <div className="table-scroll-wrapper">
              <table className="industrial-table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Apellido</th>
                    <th style={{ minWidth: '130px' }}>CI</th>
                    <th>Email</th>
                    <th>Rol</th>
                    <th>Estado</th>
                    <th className="text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.isArray(applicants) && applicants.length > 0 ? (
                    applicants.map((a) => (
                      <tr key={a.id}>
                        <td>{a.name}</td>
                        <td>{a.lastname}</td>
                        <td>{a.ci}</td>
                        <td>{a.email}</td>
                        <td><span className="role-badge">{a.rol}</span></td>
                        <td>
                          <div className="status-indicator">
                            <div className={`status-dot ${a.status?.toLowerCase() === 'activo' ? 'active' : 'inactive'}`}></div>
                            <span style={{ 
                              color: a.status?.toLowerCase() === 'activo' ? 'var(--on-surface)' : 'var(--secondary)',
                              fontSize: '0.85rem' 
                            }}>
                              {a.status}
                            </span>
                          </div>
                        </td>
                        <td className="text-center">
                          <button 
                            className="btn-icon-edit" 
                            title={a.status === 'Activo' ? "Desactivar" : "Activar"}
                            onClick={() => handleToggleStatus(a)}
                            disabled={loading}
                          >
                            {a.status === 'Activo' ? '🔒' : '🔓'}
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7" className="text-center no-data">
                        No hay postulantes registrados o no se pudieron cargar.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              </div>
            </div>
          )}
        </div>
      )}

      {activeAction === 'view_inspections' && (
        <div className="form-container">
          <h2 className="form-title">Consulta de Inspecciones Realizadas</h2>
          <div className="form-grid" style={{ marginBottom: '2rem' }}>
            <div className="form-field">
              <label>Seleccionar Factura</label>
              <select name="invoiceId" className="field-input" value={inspectionView.invoiceId} onChange={handleInspectionViewChange}>
                <option value="" disabled>Seleccione una factura...</option>
                {inspectionInvoices.map(inv => <option key={inv.id} value={inv.id}>{inv.bill_nro}</option>)}
              </select>
            </div>
            <div className="form-field">
              <label>Seleccionar Insumo</label>
              <select name="insumoIndex" className="field-input" value={inspectionView.insumoIndex} onChange={handleInspectionViewChange} disabled={!inspectionView.invoiceId}>
                <option value="" disabled>Seleccione referencia...</option>
                {selectedInvoiceItems.map((ins, idx) => (
                  <option key={ins.id} value={idx}>{ins.reference}</option>
                ))}
              </select>
            </div>
          </div>

          {inspectionHistory.length > 0 && selectedInvoiceItems[inspectionView.insumoIndex] && (
            <div className="table-container-card" style={{ marginTop: '2rem' }}>
              <h3 className="form-subtitle">
                Resultados para: <span className="role-badge">{inspectionView.tipo}</span>
              </h3>
              
              <div className="form-grid">
                <div className="form-field form-field-inline" style={{ gridColumn: 'span 2' }}>
                  <div className="field-input-group">
                    <span className="input-group-addon" style={{ background: 'var(--primary)', color: 'white' }}>
                      Muestra {inspectionView.currentStep} de {inspectionHistory.length}
                    </span>
                  </div>
                </div>

                {getSpecsByTypeId(selectedInvoiceItems[inspectionView.insumoIndex].type_inputs_id).map(key => {
                  const currentRecord = inspectionHistory[inspectionView.currentStep - 1];
                  const savedValue = currentRecord?.[key];
                  const allowedValue = selectedInvoiceItems[inspectionView.insumoIndex][key];
                  const isBool = ['presentation', 'production_test', 'visual', 'joint'].includes(key);
                  const isDate = key.includes('date');
                  const status = getMeasurementStatus(savedValue, allowedValue, key);
                  
                  // Lógica específica para Químicos (Tipo 4): 
                  // No mostrar Fecha de Lote y Prueba de Producción si la Presentación fue aprobada originalmente
                  if (selectedInvoiceItems[inspectionView.insumoIndex].type_inputs_id === 4) {
                    if ((key === 'batch_date' || key === 'production_test') && currentRecord?.presentation !== false) {
                      return null;
                    }
                  }

                  return (
                    <div className="form-field form-field-measurement" style={{ gridColumn: 'span 2' }} key={key}>
                      <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                        {getLabel(key)} {!isBool && !isDate && '(mm)'}
                      </label>
                      <div className="measurement-input-group" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', width: '100%' }}>
                        {!isBool && !isDate && (
                          <span className="measurement-label" style={{ whiteSpace: 'nowrap', color: 'var(--secondary)', fontSize: '0.9rem', minWidth: '120px' }}>
                            Permitido: {Number(allowedValue || 0).toFixed(2)}
                          </span>
                        )}
                        
                        {isBool ? (
                          <div className="field-input" style={{ flex: '1', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center', fontWeight: '500' }}>
                            <span className="material-symbols-outlined" style={{ marginRight: '8px', color: savedValue ? '#10b981' : '#ef4444' }}>
                              {savedValue ? 'check_circle' : 'cancel'}
                            </span>
                            {savedValue === true ? 'Aprobado' : (savedValue === false ? 'Rechazado' : 'N/A')}
                          </div>
                        ) : (
                          <input 
                            type="text" 
                            className="field-input" 
                            style={{ flex: '1', backgroundColor: '#f8fafc' }} 
                            value={isDate ? (savedValue ? savedValue.split('T')[0] : 'Sin fecha') : (savedValue !== undefined ? Number(savedValue).toFixed(3) : '')} 
                            readOnly 
                          />
                        )}
                        <span style={{ color: status.color, fontWeight: 'bold', minWidth: '100px', textAlign: 'right' }}>
                          {status.text}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {/* Dictamen General de la Muestra */}
                <div style={{ gridColumn: 'span 2', marginTop: '1rem', padding: '1rem', backgroundColor: 'var(--surface-variant)', borderRadius: '8px', borderLeft: '4px solid var(--primary)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', alignItems: 'center' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '0.9rem', textTransform: 'uppercase' }}>Dictamen de la Inspección:</span>
                    <span className="role-badge" style={{ 
                      backgroundColor: (inspectionHistory[inspectionView.currentStep - 1]?.status === 'Aprobado' || inspectionHistory[inspectionView.currentStep - 1]?.status === 'Aprobado Observacion') ? '#10b981' : 
                                     (inspectionHistory[inspectionView.currentStep - 1]?.status === 'Rechazado' || inspectionHistory[inspectionView.currentStep - 1]?.status === 'Rechazado Observacion') ? '#ef4444' : '#fbbf24',
                      color: 'white',
                      fontWeight: '800'
                    }}>
                      {inspectionHistory[inspectionView.currentStep - 1]?.status || 'SIN ESTADO'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--secondary)' }}>comment</span>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--on-surface)' }}>
                      <strong>Observación:</strong> {inspectionHistory[inspectionView.currentStep - 1]?.observation || 'Sin observaciones registradas.'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="form-actions" style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setInspectionView(prev => ({ ...prev, currentStep: Math.max(prev.currentStep - 1, 1) }))} 
                  disabled={inspectionView.currentStep === 1}
                >
                  <span className="material-symbols-outlined">arrow_back</span> Anterior
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  onClick={() => setInspectionView(prev => ({ ...prev, currentStep: Math.min(prev.currentStep + 1, inspectionHistory.length) }))} 
                  disabled={inspectionView.currentStep === inspectionHistory.length}
                >
                  Siguiente <span className="material-symbols-outlined">arrow_forward</span>
                </button>
              </div>
            </div>
          )}
          {inspectionView.insumoIndex !== '' && inspectionHistory.length === 0 && !loading && (
            <p className="no-data text-center">No se encontraron inspecciones realizadas para este ítem.</p>
          )}
        </div>
      )}

      {!activeAction && (
        <section className="welcome-card">
          <h2>Bienvenido al panel de Administrador</h2>
          <p>Seleccione una acción para gestionar usuarios y el sistema.</p>
        </section>
      )}
    </div>
  );
};

export default AdminDashboardContent;