import React, { useState, useEffect } from 'react';
import { registerUser, getUsers, updateUser, getApplicants, updateApplicantStatus } from '../services/authService'; 
 
const AdminDashboardContent = ({ activeAction, refreshKey }) => {
  // Estado inicial siguiendo el orden de la base de datos
  const [formData, setFormData] = useState({
    user: '',
    password: '',
    name: '',
    lastname: '',
    ci: '',
    email: '',
    roles_id: '1', // Por defecto Administrador
    status: 'Activo' // Ahora con mayúscula inicial según el backend
  });

  const [loading, setLoading] = useState(false);

  // Estados para la lista de usuarios
  const [users, setUsers] = useState([]);
  const [fetchingUsers, setFetchingUsers] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);
  const [editFormData, setEditFormData] = useState({});

  // Estados para la lista de postulantes
  const [applicants, setApplicants] = useState([]);
  const [fetchingApplicants, setFetchingApplicants] = useState(false);

  // Estado interno para alternar entre la lista de usuarios y el registro
  const [subView, setSubView] = useState('list'); // 'list' o 'add'

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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Conversión de tipos para asegurar compatibilidad estricta con la DB
      const dataToSend = {
        ...formData,
        ci: parseInt(formData.ci.toString().replace(/\D/g, ''), 10), // Limpia puntos/letras y envía número puro
        roles_id: parseInt(formData.roles_id, 10),
        status: formData.status // Ya viene como 'Activo' o 'Inactivo'
      };

      await registerUser(dataToSend);
      alert("Usuario registrado con éxito en la base de datos.");
      
      // Limpiar formulario tras éxito
      setFormData({
        user: '', password: '', name: '', lastname: '',
        ci: '', email: '', roles_id: '1', status: 'Activo'
      });
    } catch (error) {
      alert(`Error: ${error.message}`);
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
      
      alert("Usuario actualizado exitosamente.");
      
      const data = await getUsers();
      const updatedList = Array.isArray(data) ? data : (data.data || []);
      setUsers(updatedList);
      handleCancelEdit();
    } catch (error) {
      // 4. Captura de errores de red o de respuesta del servidor (4xx, 5xx)
      console.error("Error capturado:", error);
      alert(`No se pudo completar la operación: ${error.message}`);
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
  const handleToggleStatus = async (applicant) => {
    setLoading(true);
    try {
      const newStatus = applicant.status === 'Activo' ? 'Inactivo' : 'Activo';
      await updateApplicantStatus(applicant.id, newStatus);
      
      // Actualizar la lista localmente para reflejar el cambio inmediato
      setApplicants(prev => prev.map(a => 
        a.id === applicant.id ? { ...a, status: newStatus } : a
      ));
    } catch (error) {
      alert(`Error al cambiar estado: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard-content-body">
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
                      <input type="text" className="table-search-input" placeholder="Buscar por nombre, usuario o CI..." />
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
                        <th>CI</th>
                        <th>Email</th>
                        <th>Estado</th>
                        <th className="text-center">Modificar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.isArray(users) && users.length > 0 ? (
                        [...users]
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
                    <label>Cédula de Identidad (CI)</label>
                    <input type="text" name="ci" className="field-input" value={formData.ci} onChange={handleChange} placeholder="Número de identificación" required />
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
                    <th>CI</th>
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