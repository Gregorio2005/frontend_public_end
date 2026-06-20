import React, { useState, useEffect } from 'react';
import { getSuppliers, registerSupplier, assignMasterInput, getInsumosByType, getInsumos, deleteMasterInput, getMasterInputsBySupplier, updateSupplier, updateMasterInputStatus, getTypeInputs } from '../services/authService';
import ConfirmModal from '../components/ConfirmModal';

const JefeCalidadDashboardContent = ({ activeAction, user }) => {
  const [formData, setFormData] = useState({
    name: ''
  });

  const [loading, setLoading] = useState(false);
  const [assignData, setAssignData] = useState({
    suppliers_id: '',
    type_inputs_id: '',
    assignments: [{ inputs_id: '', status: 'Vigente' }]
  });
  const [inputsByType, setInputsByType] = useState([]);

  // Estados para la vista tipo "Factura"
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [allMasterInputs, setAllMasterInputs] = useState([]);

  // Estado interno para alternar entre la lista de proveedores y el registro
  const [subView, setSubView] = useState('list'); // 'list', 'add' o 'assign'

  // Estados para la gestión de proveedores existentes (simulado)
  const [providers, setProviders] = useState([]);
  const [editingProviderId, setEditingProviderId] = useState(null);
  const [editedProviderName, setEditedProviderName] = useState('');

  // Estado para el buscador de proveedores
  const [searchTerm, setSearchTerm] = useState('');

  // Estado para notificaciones personalizadas (Toast)
  const [notification, setNotification] = useState({ message: '', type: 'success', visible: false });

  // Estado para tipos de insumo cargados desde el backend
  const [typeInputsList, setTypeInputsList] = useState([]);

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type, visible: true });
    setTimeout(() => {
      setNotification(prev => ({ ...prev, visible: false }));
    }, 4000);
  };

  // Estados para los gráficos
  const [chartFilters, setChartFilters] = useState({
    proveedorId: '',
    insumo: '',
    fechaInicio: '',
    fechaFin: ''
  });
  const [showChart, setShowChart] = useState(false);
  const [chartData, setChartData] = useState(null);

  // Estado para el Modal de Confirmación
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  // Resetear la vista interna al cambiar de acción principal
  useEffect(() => {
    setSubView('list');
    setEditingProviderId(null);
  }, [activeAction]);

  // Mapeo para mostrar los nombres de los tipos en español
  const typeNamesSpanish = {
    'Stuffing': 'Estoperas',
    'Stamps': 'Sellos',
    'Oring': 'O-Rings',
    'Chemicals': 'Químicos',
    'Bags': 'Bolsas',
    'Cardboard': 'Cartón',
    'Cases': 'Estuches',
    'Thermoplastics': 'Termoplásticos',
    'Packings': 'Empaquetaduras',
    'Collars': 'Collares'
  };

  // Mapeo de IDs técnicos para la base de datos (Requerimiento DB)
  // Traduce el nombre interno a su respectivo ID entero
  const typeIdMapping = {
    'Stuffing': 1,
    'Stamps': 2,
    'Oring': 3,
    'Chemicals': 4,
    'Bags': 5,
    'Cardboard': 6,
    'Cases': 7,
    'Thermoplastics': 8,
    'Packings': 9,
    'Collars': 10
  };

  // Carga de proveedores desde la API al entrar en modo lista
  useEffect(() => {
    const fetchSuppliers = async () => {
      // Cargamos proveedores siempre que estemos en la pestaña de proveedores, sin importar la sub-vista
      if (activeAction === 'proveedores') {
        setLoading(true);
        try {
          const data = await getSuppliers();
          setProviders(data.sort((a, b) => (a.name || a.nombre).localeCompare(b.name || b.nombre))); // Ordenar proveedores alfabéticamente
          // No cargamos todos los master inputs aquí, se cargarán al seleccionar un proveedor
        } catch (error) {
          console.error("Error al cargar proveedores:", error);
        } finally {
          setLoading(false);
        }
      }
    };
    fetchSuppliers();
  }, [activeAction, subView]);

  // Cargar tipos de insumo desde el backend
  useEffect(() => {
    if (activeAction === 'proveedores') {
      getTypeInputs()
        .then(data => setTypeInputsList(data))
        .catch(error => console.error("Error al cargar tipos de insumo:", error));
    }
  }, [activeAction]);

  // Carga los master_inputs para el proveedor seleccionado
  useEffect(() => {
    const fetchMasterInputsForProvider = async () => {
      if (selectedProvider) {
        setLoading(true);
        try {
          // Llama a la nueva función del servicio para obtener insumos filtrados
          const data = await getMasterInputsBySupplier(selectedProvider.id);
          // Ordenar insumos por tipo y luego por referencia
          const sortedData = data.sort((a, b) => {
            if (a.type_inputs_id !== b.type_inputs_id) return a.type_inputs_id - b.type_inputs_id;
            return (a.reference || '').localeCompare(b.reference || '');
          });
          setAllMasterInputs(sortedData); // Actualiza el estado con los datos filtrados y ordenados
        } catch (error) {
          console.error(`Error al cargar insumos para el proveedor ${selectedProvider.id}:`, error);
          showNotification(`Error al cargar insumos para el proveedor: ${error.message}`, 'error');
          setAllMasterInputs([]); // Limpia los insumos en caso de error
        } finally {
          setLoading(false);
        }
      } else {
        setAllMasterInputs([]); // Limpia los insumos cuando no hay proveedor seleccionado
      }
    };
    fetchMasterInputsForProvider();
  }, [selectedProvider]); // Se ejecuta cada vez que selectedProvider cambia

  // Mapeo de IDs técnicos a nombres en español para la visualización
  const idToSpanishType = {
    1: 'Estoperas',
    2: 'Sellos',
    3: 'O-Rings',
    4: 'Químicos',
    5: 'Bolsas',
    6: 'Cartón',
    7: 'Estuches',
    8: 'Termoplásticos',
    9: 'Empaquetaduras',
    10: 'Collares'
  };

  // Mapeo de IDs técnicos a nombres en inglés para las clases CSS (badges)
  const idToEnglishType = {
    1: 'Stuffing',
    2: 'Stamps',
    3: 'Oring',
    4: 'Chemicals',
    5: 'Bags',
    6: 'Cardboard',
    7: 'Cases',
    8: 'Thermoplastics',
    9: 'Packings',
    10: 'Collars'
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAssignChange = async (e) => {
    const { name, value } = e.target;
    
    if (name === 'type_inputs_id') {
      setAssignData(prev => ({ 
        ...prev, 
        [name]: value,
        assignments: [{ inputs_id: '', status: 'Vigente' }]
      }));
      
      if (value) {
        setLoading(true);
        try {
          const data = await getInsumosByType(value);
          setInputsByType(data);
        } catch (error) {
          showNotification(`Error al cargar insumos: ${error.message}`, "error");
        } finally {
          setLoading(false);
        }
      } else {
        setInputsByType([]);
      }
    } else {
      setAssignData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleItemChange = (index, e) => {
    const { name, value } = e.target;
    const newAssignments = [...assignData.assignments];
    newAssignments[index] = { ...newAssignments[index], [name]: value };
    setAssignData(prev => ({ ...prev, assignments: newAssignments }));
  };

  const addAssignmentRow = () => {
    setAssignData(prev => ({
      ...prev,
      assignments: [...prev.assignments, { inputs_id: '', status: 'Vigente' }]
    }));
  };

  const removeAssignmentRow = (index) => {
    const newAssignments = assignData.assignments.filter((_, i) => i !== index);
    setAssignData(prev => ({ ...prev, assignments: newAssignments }));
  };

  const handleEditClick = (e, provider) => {
    e.stopPropagation(); // Evita abrir la factura al querer solo editar el nombre
    setEditingProviderId(provider.id);
    setEditedProviderName(provider.name || provider.nombre);
  };

  const handleCancelEdit = () => {
    setEditingProviderId(null);
    setEditedProviderName('');
  };

  const handleSaveEdit = async () => {
    const trimmedName = editedProviderName.trim();
    
    if (trimmedName.length < 3) {
      showNotification("El nombre debe tener al menos 3 caracteres", "error");
      return;
    }

    setLoading(true);
    try {
      // Extraemos el ID del usuario (Jefe de Calidad) de la sesión para cumplir con el esquema del backend
      const userId = parseInt(user?.user_id || user?.id, 10);

      await updateSupplier(editingProviderId, trimmedName, userId);
      
      setProviders(prev => prev.map(p => 
        p.id === editingProviderId ? { ...p, name: trimmedName, nombre: trimmedName } : p
      ));
      
      showNotification("Nombre del proveedor actualizado correctamente.");
      handleCancelEdit();
    } catch (error) {
      showNotification(`Error al actualizar: ${error.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  // Lógica de filtrado de proveedores
  const filteredProviders = providers.filter(p => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;
    
    const name = (p.name || p.nombre || '').toLowerCase();
    const idStr = String(p.id);
    return name.includes(term) || idStr.includes(term);
  });

  const handleChartFilterChange = (e) => {
    const { name, value } = e.target;
    setChartFilters(prev => ({ ...prev, [name]: value }));
    setShowChart(false); // Ocultar gráfico anterior si cambian filtros
  };

  const handleGenerateChart = (e) => {
    e.preventDefault();
    setLoading(true);
    // Simulación de carga y generación de datos aleatorios
    setTimeout(() => {
      setChartData({
        aprobados: Math.floor(Math.random() * 100) + 20,
        rechazados: Math.floor(Math.random() * 30) + 5
      });
      setShowChart(true);
      setLoading(false);
    }, 800);
  };

  const handleDeleteAssignment = async (masterInputId) => {
    setLoading(true);
    try {
      await deleteMasterInput(masterInputId);
      showNotification("Asignación eliminada correctamente.");
      // Después de eliminar, recargar los insumos para el proveedor actualmente seleccionado
      if (selectedProvider) {
        const data = await getMasterInputsBySupplier(selectedProvider.id);
        setAllMasterInputs(data);
      }
    } catch (error) {
      showNotification(`Error al eliminar asignación: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleMasterInputStatus = (item) => {
    const isActivating = item.status !== 'Vigente';
    
    setConfirmModal({
      isOpen: true,
      title: isActivating ? 'Activar Insumo' : 'Retirar Insumo',
      message: `¿Está seguro de que desea cambiar el estado de la referencia "${item.reference}" a ${isActivating ? 'Vigente' : 'Desuso'}?`,
      onConfirm: async () => {
        setLoading(true);
        try {
          const newStatus = isActivating ? 'Vigente' : 'Desuso';
          
          // Construimos el payload con los campos que el esquema del backend exige
          const updatePayload = {
            suppliers_id: item.suppliers_id,
            inputs_id: item.inputs_id,
            type_inputs_id: item.type_inputs_id,
            status: newStatus
          };

          await updateMasterInputStatus(item.id, updatePayload);
          setAllMasterInputs(prev => prev.map(mi => mi.id === item.id ? { ...mi, status: newStatus } : mi));
          showNotification(`Estado actualizado a ${newStatus} correctamente.`);
        } catch (error) {
          showNotification(`Error: ${error.message}`, 'error');
        } finally {
          setLoading(false);
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Extraemos el ID del usuario (Jefe de Calidad)
      const userId = parseInt(user?.user_id || user?.id, 10);

      if (!userId) {
        throw new Error("No se pudo identificar la sesión del usuario. Intente cerrar sesión y entrar de nuevo.");
      }

      const dataToSend = {
        name: formData.name,
        user_id: userId
      };

      await registerSupplier(dataToSend);
      showNotification("Proveedor registrado con éxito.");
      
      // Limpiar formulario y volver a la lista
      setFormData({ name: '' });
      setSubView('list');
    } catch (error) {
      showNotification(`Error: ${error.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Captura y conversión forzada a entero
      const supplierId = assignData.suppliers_id ? parseInt(assignData.suppliers_id, 10) : NaN;
      
      // Captura del ID del tipo (usamos el mapeo que ya sabemos que funciona)
      const typeId = typeIdMapping[assignData.type_inputs_id];

      // VALIDACIÓN ESTRICTA: Si el ID no es un número válido o es <= 0, detenemos todo.
      if (isNaN(supplierId) || supplierId <= 0) {
        throw new Error("El ID del proveedor seleccionado no es válido. Intente seleccionarlo de nuevo.");
      }
      
      if (!typeId || isNaN(typeId)) {
        throw new Error("ID de tipo de insumo no válido.");
      }

      // Realizamos todas las peticiones de asignación en paralelo
      const promises = assignData.assignments.map(item => {
        const dataToSend = {
          suppliers_id: supplierId,                 // ENTERO PURO
          inputs_id: parseInt(item.inputs_id, 10), // int -> master_inputs.inputs_id
          type_inputs_id: typeId,                  // INT (ej: 6)
          status: item.status                      // STRING
        };
        
        return assignMasterInput(dataToSend);
      });

      await Promise.all(promises);
      showNotification("Asignaciones guardadas con éxito en el Maestro de Insumos.");
      
      setAssignData({ suppliers_id: '', type_inputs_id: '', assignments: [{ inputs_id: '', status: 'Vigente' }] });
      setInputsByType([]);
      setSubView('list');
    } catch (error) {
      showNotification(`Error: ${error.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard-content-body">
      {/* Modal de Confirmación Custom */}
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

      {activeAction === 'proveedores' && (
        <div className="providers-management-view">
          <div className="tab-navigation" style={{ marginBottom: '2rem', display: 'flex', gap: '1rem' }}>
            <button 
              className={`btn ${subView === 'list' ? 'btn-primary' : 'btn-secondary'}`} 
              onClick={() => setSubView('list')}
            >
              Ver Proveedores
            </button>
            <button 
              className={`btn ${subView === 'add' ? 'btn-primary' : 'btn-secondary'}`} 
              onClick={() => setSubView('add')}
            >
              Agregar Proveedor
            </button>
            <button 
              className={`btn ${subView === 'assign' ? 'btn-primary' : 'btn-secondary'}`} 
              onClick={() => setSubView('assign')}
            >
              Asignar Proveedores
            </button>
          </div>

          {subView === 'list' ? (
            <div className="form-container">
              <h2 className="form-title">{selectedProvider ? 'Detalle de Factura de Insumos' : 'Proveedores Registrados'}</h2>
              
              {!selectedProvider ? (
                <div className="table-container-card">
                  <div className="table-filters">
                    <div className="table-search-wrapper">
                      <span className="material-symbols-outlined">search</span>
                      <input type="text" className="table-search-input" placeholder="Buscar por nombre o ID..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>
                  </div>
                  <table className="industrial-table">
                    <thead>
                      <tr>
                        <th style={{ width: '85%' }}>Nombre del Proveedor (Haga clic para ver detalle)</th>
                        <th style={{ textAlign: 'center' }}>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProviders.length > 0 ? filteredProviders.map((p) => {
                        const isEditing = editingProviderId === p.id;
                        return (
                          <tr key={p.id} onClick={() => setSelectedProvider(p)} style={{ cursor: 'pointer' }}>
                            <td style={{ fontWeight: '600' }}>
                              {isEditing ? (
                                <input type="text" className="field-input" value={editedProviderName} onClick={(e) => e.stopPropagation()} onChange={(e) => setEditedProviderName(e.target.value)} autoFocus />
                              ) : (p.name || p.nombre)}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              {isEditing ? (
                                <div onClick={(e) => e.stopPropagation()}>
                                  <button className="btn-icon-save" onClick={handleSaveEdit}>✅</button>
                                  <button className="btn-icon-cancel" onClick={handleCancelEdit}>❌</button>
                                </div>
                              ) : (
                                <button className="btn-icon-edit" onClick={(e) => handleEditClick(e, p)}>✏️</button>
                              )}
                            </td>
                          </tr>
                        );
                      }) : (
                        <tr>
                          <td colSpan="2" className="text-center no-data">No se encontraron proveedores coincidentes.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="invoice-detail-view" style={{ animation: 'fadeIn 0.3s ease' }}>
                  <div className="invoice-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', padding: '1.5rem', background: 'var(--surface-variant)', borderRadius: '8px' }}>
                    <div>
                      <label style={{ fontSize: '0.75rem', color: 'var(--secondary)', textTransform: 'uppercase', fontWeight: 'bold' }}>Proveedor Seleccionado</label>
                      <h3 style={{ margin: 0, color: 'var(--primary)' }}>{selectedProvider.name || selectedProvider.nombre}</h3>
                    </div>
                    <button className="btn btn-secondary" onClick={() => setSelectedProvider(null)}>
                      <span className="material-symbols-outlined" style={{ fontSize: '18px', marginRight: '8px' }}>arrow_back</span>
                      Volver a la lista
                    </button>
                  </div>

                  <div className="table-container-card">
                    <table className="industrial-table">
                      <thead>
                        <tr>
                          <th>Tipo de Insumo</th>
                          <th>Referencia Técnica</th>
                          <th className="text-center">Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allMasterInputs.map((item) => (
                          <tr key={item.id}>
                            <td>
                              <span className={`role-badge badge-${idToEnglishType[item.type_inputs_id]?.toLowerCase() || 'default'}`}>
                                {idToSpanishType[item.type_inputs_id]}
                              </span>
                            </td>
                            <td style={{ fontWeight: '600', color: 'var(--primary)' }}>
                              {item.reference || 'N/A'}
                            </td>
                            <td className="text-center">
                              <div className="status-indicator" style={{ justifyContent: 'center', gap: '1rem' }}>
                                <div className={`status-dot ${item.status === 'Vigente' ? 'active' : 'inactive'}`}></div>
                                <span style={{ 
                                  color: item.status === 'Vigente' ? 'var(--on-surface)' : 'var(--secondary)',
                                  fontSize: '0.85rem',
                                  minWidth: '60px',
                                  textAlign: 'left'
                                }}>
                                  {item.status}
                                </span>
                                <button 
                                  className="btn-icon-edit" 
                                  title={item.status === 'Vigente' ? "Marcar como Desuso" : "Marcar como Vigente"}
                                  onClick={() => handleToggleMasterInputStatus(item)}
                                  disabled={loading}
                                >
                                  {item.status === 'Vigente' ? '🔒' : '🔓'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {allMasterInputs.length === 0 && (
                          <tr>
                            <td colSpan="3" className="text-center no-data" style={{ padding: '3.5rem' }}>
                              Este proveedor aún no tiene insumos vinculados. Use la pestaña "Asignar Proveedores" para empezar.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : subView === 'add' ? (
            <div className="form-container">
              <h2 className="form-title">Registrar Nuevo Proveedor</h2>
              <form className="admin-form" onSubmit={handleSubmit}>
                <div className="form-grid">
                  <div className="form-field">
                    <label>Nombre del Proveedor</label>
                    <input 
                      type="text" 
                      name="name" 
                      className="field-input"
                      value={formData.name} 
                      onChange={handleChange} 
                      placeholder="Ingrese el nombre comercial" 
                      required 
                    />
                  </div>
                </div>
                <div className="form-actions">
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? 'Guardando...' : 'Guardar Proveedor'}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="form-container">
              <h2 className="form-title">Asignar Proveedor (Master Inputs)</h2>
              <form className="admin-form" onSubmit={handleAssignSubmit}>
                <div className="form-grid">
                  <div className="form-field">
                    <label>Seleccionar Proveedor</label>
                    <select 
                      name="suppliers_id" 
                      className="field-input" 
                      value={assignData.suppliers_id} 
                      onChange={handleAssignChange} 
                      required
                    >
                      <option value="" disabled>Seleccione un proveedor de la base de datos...</option>
                      {providers.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name || p.nombre}
                        </option>
                      ))}
                    </select>
                  </div>

                  {assignData.suppliers_id && (
                    <div className="form-field">
                      <label>Seleccionar el tipo de Insumo</label>
                      <select 
                        name="type_inputs_id" 
                        className="field-input" 
                        value={assignData.type_inputs_id} 
                        onChange={handleAssignChange} 
                        required 
                      >
                        <option value="">Seleccione el tipo...</option>
                        {typeInputsList.map(type => (
                          <option key={type.id} value={type.name}>
                            {typeNamesSpanish[type.name] || type.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {assignData.type_inputs_id && (
                  <div className="insumos-section" style={{ marginTop: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--secondary)', fontWeight: '700' }}>
                        Detalle de Asignación
                      </h3>
                      <button type="button" className="btn btn-secondary" onClick={addAssignmentRow} style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem' }}>
                        + Añadir Fila
                      </button>
                    </div>
                    <div className="table-container-card">
                      <table className="industrial-table">
                        <thead>
                          <tr>
                            <th style={{ width: '85%' }}>Referencia del Insumo</th>
                            <th className="text-center">Acción</th>
                          </tr>
                        </thead>
                        <tbody>
                          {assignData.assignments.map((item, index) => (
                            <tr key={index}>
                              <td>
                                <select 
                                  name="inputs_id" 
                                  className="field-input" 
                                  value={item.inputs_id} 
                                  onChange={(e) => handleItemChange(index, e)} 
                                  required
                                >
                                  <option value="">Seleccione referencia...</option>
                                  {inputsByType.map(ins => (
                                    <option key={ins.id} value={ins.id}>{ins.reference || ins.referencia}</option>
                                  ))}
                                </select>
                              </td>
                              <td className="text-center">
                                <button 
                                  type="button" 
                                  className="btn-icon-cancel" 
                                  onClick={() => removeAssignmentRow(index)} 
                                  disabled={assignData.assignments.length === 1}
                                  title="Eliminar fila"
                                >
                                  🗑️
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div className="form-actions">
                  <button 
                    type="submit" 
                    className="btn btn-primary" 
                    disabled={loading || !assignData.suppliers_id || !assignData.type_inputs_id || assignData.assignments.some(a => !a.inputs_id)}
                  >
                    {loading ? 'Procesando...' : 'Finalizar Asignación'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {activeAction === 'charts' && (
        <div className="form-container">
          <h2 className="form-title">Estadísticas de Calidad</h2>
          <form className="admin-form" onSubmit={handleGenerateChart}>
            <div className="form-grid">
              <div className="form-field">
                <label>Proveedor</label>
                <select name="proveedorId" className="field-input" value={chartFilters.proveedorId} onChange={handleChartFilterChange} required>
                  <option value="" disabled>Seleccione un proveedor...</option>
                  {providers.map(p => (
                    <option key={p.id} value={p.id}>{p.name || p.nombre}</option>
                  ))}
                </select>
              </div>
              <div className="form-field">
                <label>Tipo de Insumo</label>
                <select name="insumo" className="field-input" value={chartFilters.insumo} onChange={handleChartFilterChange} required>
                  <option value="" disabled>Seleccione tipo...</option>
                  {typeInputsList.map(type => (
                    <option key={type.id} value={type.name}>
                      {typeNamesSpanish[type.name] || type.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-field">
                <label>Fecha Inicio</label>
                <input type="date" name="fechaInicio" className="field-input" value={chartFilters.fechaInicio} onChange={handleChartFilterChange} required />
              </div>
              <div className="form-field">
                <label>Fecha Fin</label>
                <input type="date" name="fechaFin" className="field-input" value={chartFilters.fechaFin} onChange={handleChartFilterChange} required />
              </div>
            </div>
            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={loading}>
                <span className="material-symbols-outlined" style={{ marginRight: '8px', fontSize: '18px' }}>monitoring</span>
                {loading ? 'Procesando...' : 'Generar Gráfico'}
              </button>
            </div>
          </form>

          {showChart && chartData && (
            <section className="bento-item stats-container" style={{ marginTop: '3rem', width: '100%', maxWidth: '800px', marginInline: 'auto' }}>
              <div className="bento-header">
                <div className="icon-box">
                  <span className="material-symbols-outlined">analytics</span>
                </div>
                <h3>Análisis de Calidad: Tasa de Aprobación vs Rechazo</h3>
              </div>

              <div className="stats-display" style={{ padding: '2rem 1rem', height: 'auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'flex-end', height: '220px', gap: '3rem', borderBottom: '2px solid var(--outline-variant)', paddingBottom: '1rem' }}>
                  {/* Barra Aprobados */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                    <div className="chart-bar approval" style={{ 
                      width: '80px', 
                      height: `${(chartData.aprobados / (chartData.aprobados + chartData.rechazados)) * 200}px`, 
                      backgroundColor: '#10b981', 
                      borderRadius: '8px 8px 0 0',
                      boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)',
                      transition: 'height 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
                    }}></div>
                    <span style={{ marginTop: '1rem', fontWeight: '700', color: 'var(--on-surface)', fontSize: '0.9rem' }}>Aprobados</span>
                    <span style={{ fontSize: '1.5rem', fontWeight: '800', color: '#10b981' }}>{chartData.aprobados}</span>
                  </div>

                  {/* Barra Rechazados */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                    <div className="chart-bar rejection" style={{ 
                      width: '80px', 
                      height: `${(chartData.rechazados / (chartData.aprobados + chartData.rechazados)) * 200}px`, 
                      backgroundColor: '#ef4444', 
                      borderRadius: '8px 8px 0 0',
                      boxShadow: '0 4px 12px rgba(239, 68, 68, 0.2)',
                      transition: 'height 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
                    }}></div>
                    <span style={{ marginTop: '1rem', fontWeight: '700', color: 'var(--on-surface)', fontSize: '0.9rem' }}>Rechazados</span>
                    <span style={{ fontSize: '1.5rem', fontWeight: '800', color: '#ef4444' }}>{chartData.rechazados}</span>
                  </div>
                </div>

                <div className="chart-footer-info" style={{ textAlign: 'center', backgroundColor: 'var(--surface-variant)', padding: '1.5rem', borderRadius: '12px' }}>
                  <p style={{ margin: '0 0 8px 0', fontSize: '0.95rem' }}>
                    Insumo: <strong style={{ color: 'var(--primary)' }}>{typeNamesSpanish[chartFilters.insumo] || 'General'}</strong>
                  </p>
                  <p style={{ margin: '0 0 8px 0', fontSize: '0.95rem' }}>
                    Proveedor: <strong>{providers.find(p => p.id === parseInt(chartFilters.proveedorId))?.name || providers.find(p => p.id === parseInt(chartFilters.proveedorId))?.nombre || 'No especificado'}</strong>
                  </p>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--secondary)', fontWeight: '500' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '14px', verticalAlign: 'middle', marginRight: '5px' }}>calendar_today</span>
                    Período: {chartFilters.fechaInicio} al {chartFilters.fechaFin}
                  </p>
                </div>
              </div>
            </section>
          )}
        </div>
      )}

      {!activeAction && (
        <section className="welcome-card">
          <h2>Panel de Gestión de Calidad</h2>
          <p>Monitoreo de inspecciones y verificación de insumos.</p>
        </section>
      )}
    </div>
  );
};

export default JefeCalidadDashboardContent;