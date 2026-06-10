import React, { useState, useEffect } from 'react';
import { getInsumos, registerInsumo, updateInsumo, getInsumosByType } from '../services/authService';

const JefeIngenieriaDashboardContent = ({ activeAction, user }) => {
  const [formData, setFormData] = useState({
    tipo: '',
    reference: '',
    internal_diameter: '',
    external_diameter: '',
    height: '',
    height_a: '',
    height_b: '',
    length: '',
    width: '',
    art: '',
    caliber: '',
    armed: '',
    thickness_a: '', thickness_b: '', thickness_c: '', thickness_d: '',
    ring_diameter_a: '', ring_diameter_b: '', ring_diameter_c: '', ring_diameter_d: '',
    presentation: '' // Se mantiene para compatibilidad con químicos previos
  });

  const [loading, setLoading] = useState(false);

  // Estados para la gestión de insumos existentes (simulado)
  const [insumosList, setInsumosList] = useState([]);
  const [selectedInsumoId, setSelectedInsumoId] = useState('');
  const [editFormData, setEditFormData] = useState(null);
  const [selectedEditType, setSelectedEditType] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Estado para controlar la sub-vista (Lista/Modificar vs Agregar)
  const [subView, setSubView] = useState('list');

  // Estado para notificaciones personalizadas (Toast)
  const [notification, setNotification] = useState({ message: '', type: 'success', visible: false });

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type, visible: true });
    setTimeout(() => {
      setNotification(prev => ({ ...prev, visible: false }));
    }, 4000);
  };

  // Carga inicial de datos desde la base de datos
  // Ahora getInsumos solo se llama si no estamos en modo edición con filtro específico
  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await getInsumos();
        setInsumosList(data);
      } catch (error) {
        console.error("Error al cargar el catálogo:", error);
      }
    };
    if (subView === 'list' && !selectedEditType) loadData();
  }, [activeAction, subView, selectedEditType]);

  // Limpiar estados cuando cambia la acción principal para forzar nueva búsqueda
  useEffect(() => {
    setSelectedEditType('');
    setEditFormData(null);
    setSelectedInsumoId('');
    setSearchTerm('');
    setSubView('list');
  }, [activeAction]);

  const handleChange = (e) => {
    let { name, value } = e.target;

    // Validación técnica: Solo números para medidas, pero permitir texto en Referencia y Tipo
    if (name !== 'reference' && name !== 'tipo') {
      value = value.replace(/[^0-9.]/g, ''); // Elimina todo lo que no sea número o punto
      const parts = value.split('.');
      if (parts.length > 2) value = parts[0] + '.' + parts.slice(1).join(''); // Evita múltiples puntos
    }

    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Nueva función para buscar en tablas específicas
  const handleTypeSelectForEdit = async (tipo) => {
    setSelectedEditType(tipo);
    setEditFormData(null);
    setSelectedInsumoId('');
    if (!tipo) {
      setInsumosList([]);
      return;
    }
    setLoading(true);
    try {
      const data = await getInsumosByType(tipo);
      setInsumosList(data);
    } catch (error) {
      showNotification(`Error al buscar en ${tipo}: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (insumo) => {
    const id = insumo.id.toString();
    setSelectedInsumoId(id);
    setEditFormData({ ...insumo });
  };

  const handleEditChange = (e) => {
    let { name, value } = e.target;

    // Validación técnica: Solo números para medidas, pero permitir texto en Referencia y Tipo
    if (name !== 'reference' && name !== 'tipo') {
      value = value.replace(/[^0-9.]/g, '');
      const parts = value.split('.');
      if (parts.length > 2) value = parts[0] + '.' + parts.slice(1).join('');
    }

    setEditFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Construir payload limpio para actualización
      const specs = getSpecsConfig(editFormData.tipo);
      const userId = parseInt(user?.id || user?.user_id, 10);
      
      const cleanPayload = {
        reference: editFormData.reference || editFormData.referencia,
        tipo: editFormData.tipo, // Se envía para que el service elija la ruta
        user_id: isNaN(userId) ? null : userId
      };

      specs.forEach(key => {
        const value = editFormData[key];
        cleanPayload[key] = parseFloat(value) || 0;
      });

      await updateInsumo(selectedInsumoId, cleanPayload);
      showNotification("Insumo actualizado correctamente.");
      setEditFormData(null);
      setSelectedInsumoId('');
      // Refrescar solo la tabla técnica actual
      const data = await getInsumosByType(selectedEditType);
      setInsumosList(data);
    } catch (error) {
      showNotification(`Error: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Mapeo de especificaciones técnicas por tipo
  const getSpecsConfig = (tipo) => {
    switch (tipo) {
      case 'Stuffing': return ['internal_diameter', 'external_diameter', 'height'];
      case 'Stamps': return ['internal_diameter', 'external_diameter', 'height_a', 'height_b'];
      case 'Oring': return ['internal_diameter', 'height'];
      case 'Chemicals': return [];
      case 'Thermoplastics': return [];
      case 'Bags': return ['height', 'width', 'art', 'caliber'];
      case 'Cardboard': return ['height', 'width', 'caliber'];
      case 'Cases': return ['caliber', 'armed'];
      case 'Packings': return [
        'thickness_a', 'thickness_b', 'thickness_c', 'thickness_d',
        'ring_diameter_a', 'ring_diameter_b', 'ring_diameter_c', 'ring_diameter_d'
      ];
      case 'Collars': return ['internal_diameter', 'height'];
      default: return [];
    }
  };

  const getLabel = (key) => {
    const labels = {
      internal_diameter: 'Diámetro Interno Ø',
      external_diameter: 'Diámetro Externo Ø',
      height: 'Altura',
      height_a: 'Altura A',
      height_b: 'Altura B',
      length: 'Largo',
      width: 'Ancho',
      art: 'Arte',
      caliber: 'Calibre',
      armed: 'Armado',
      thickness_a: 'Espesor A', thickness_b: 'Espesor B', thickness_c: 'Espesor C', thickness_d: 'Espesor D',
      ring_diameter_a: 'Ø de Anillo A', ring_diameter_b: 'Ø de Anillo B', ring_diameter_c: 'Ø de Anillo C', ring_diameter_d: 'Ø de Anillo D'
    };
    return labels[key] || key;
  };

  // Mapeo para mostrar los nombres de los tipos en español en la tabla y etiquetas
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    // 1. Construir payload estrictamente con lo que el backend espera
    const specs = getSpecsConfig(formData.tipo);
    const userId = parseInt(user?.id || user?.user_id, 10);

    const cleanPayload = {
      reference: formData.reference,
      tipo: formData.tipo, // El service lo usará para rutear
      user_id: isNaN(userId) ? null : userId
    };

    specs.forEach(key => {
      const value = formData[key];
      cleanPayload[key] = parseFloat(value) || 0;
    });

    try {
      await registerInsumo(cleanPayload);
      showNotification("Insumo técnico registrado con éxito.");
      
      // Limpiar formulario
      setFormData({
        tipo: '', reference: '', internal_diameter: '', external_diameter: '', height: '',
        height_a: '', height_b: '', length: '', width: '', art: '', caliber: '', armed: '',
        thickness_a: '', thickness_b: '', thickness_c: '', thickness_d: '',
        ring_diameter_a: '', ring_diameter_b: '', ring_diameter_c: '', ring_diameter_d: '', presentation: ''
      });

    } catch (error) {
      showNotification(`Error: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredInsumos = insumosList.filter(ins => {
    const term = searchTerm.toLowerCase();
    const reference = (ins.reference || ins.referencia || '').toLowerCase();
    const tipo = (ins.tipo || '').toLowerCase();
    return reference.includes(term) || 
           tipo.includes(term) ||
           (ins.presentation && ins.presentation.toLowerCase().includes(term));
  });

  return (
    <div className="dashboard-content-body">
      {/* Notificación Toast Industrial */}
      <div className={`notification-toast ${notification.visible ? 'visible' : ''} ${notification.type}`}>
        <span className="material-symbols-outlined">
          {notification.type === 'error' ? 'error' : 'check_circle'}
        </span>
        <span className="notification-message">{notification.message}</span>
      </div>

      {activeAction === 'insumos' && (
        <>
          <div className="tab-navigation" style={{ marginBottom: '2rem', display: 'flex', gap: '1rem' }}>
            <button 
              className={`btn ${subView === 'list' ? 'btn-primary' : 'btn-secondary'}`} 
              onClick={() => setSubView('list')}
            >
              Ver y Modificar Insumos
            </button>
            <button 
              className={`btn ${subView === 'add' ? 'btn-primary' : 'btn-secondary'}`} 
              onClick={() => setSubView('add')}
            >
              Registrar Nuevo Insumo
            </button>
          </div>

          {subView === 'add' ? (
        <div className="form-container">
          <h2 className="form-title">Registrar Nuevo Insumo</h2>
          <form className="admin-form" onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="form-field" style={{ gridColumn: 'span 2' }}>
                <label>Tipo de Insumo</label>
                <select name="tipo" value={formData.tipo} onChange={handleChange} required className="field-input">
                  <option value="" disabled>Seleccione un tipo...</option>
                  <option value="Stuffing">Estoperas</option>
                  <option value="Stamps">Sellos</option>
                  <option value="Oring">O-Rings</option>
                  <option value="Chemicals">Químicos</option>
                  <option value="Bags">Bolsas</option>
                  <option value="Cardboard">Cartón</option>
                  <option value="Cases">Estuches</option>
                  <option value="Thermoplastics">Termoplásticos</option>
                  <option value="Packings">Empaquetaduras</option>
                  <option value="Collars">Collares</option>
                </select>
              </div>
            </div>

            {formData.tipo && (
              <div className="technical-specs-entry" style={{ marginTop: '1.5rem' }}>
                <label className="field-label" style={{ color: 'var(--primary)', fontWeight: '700', marginBottom: '1rem', display: 'block' }}>
                  Ficha Técnica de Registro
                </label>
                <div className="table-container-card" style={{ padding: '0', border: '1px solid var(--outline-variant)', overflowX: 'auto' }}>
                  <table className="industrial-table" style={{ margin: '0' }}>
                    <thead style={{ backgroundColor: 'var(--surface-variant)' }}>
                      <tr>
                        <th style={{ minWidth: '180px' }}>REFERENCIA</th>
                        {getSpecsConfig(formData.tipo).map(key => (
                          <th key={key}>{getLabel(key)}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>
                          <input type="text" name="reference" className="field-input" value={formData.reference} onChange={handleChange} placeholder="Ingrese código..." required />
                        </td>
                        {getSpecsConfig(formData.tipo).map(key => (
                          <td key={key}>
                            <input 
                              type="text" 
                              name={key} 
                              className="field-input" 
                              inputMode="decimal"
                              value={formData[key]} 
                              onChange={handleChange} 
                              placeholder="---" 
                              required 
                            />
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {formData.tipo && (
              <div className="form-actions" style={{ marginTop: '2rem' }}>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  <span className="material-symbols-outlined" style={{ marginRight: '8px', fontSize: '18px' }}>save</span>
                  {loading ? 'Guardando...' : 'Registrar Insumo'}
                </button>
              </div>
            )}
          </form>
        </div>
      ) : (
        <div className="form-container">

          {/* Selector de Tipo Obligatorio para búsqueda específica */}
          <div className="form-grid" style={{ marginBottom: '2rem' }}>
            <div className="form-field" style={{ gridColumn: 'span 2' }}>
              <label>Seleccione el Tipo de Insumo para buscar en su tabla técnica</label>
              <select 
                value={selectedEditType} 
                onChange={(e) => handleTypeSelectForEdit(e.target.value)} 
                className="field-input"
              >
                <option value="">Seleccione un tipo...</option>
                <option value="Stuffing">Estoperas</option>
                <option value="Stamps">Sellos</option>
                <option value="Oring">O-Rings</option>
                <option value="Chemicals">Químicos</option>
                <option value="Bags">Bolsas</option>
                <option value="Cardboard">Cartón</option>
                <option value="Cases">Estuches</option>
                <option value="Thermoplastics">Termoplásticos</option>
                <option value="Packings">Empaquetaduras</option>
                <option value="Collars">Collares</option>
              </select>
            </div>
          </div>

          {selectedEditType && (
            <>
          <div className="table-container-card" style={{ marginBottom: '2rem' }}>
            <div className="table-filters">
              <div className="table-search-wrapper">
                <span className="material-symbols-outlined">search</span>
                <input 
                  type="text" 
                  className="table-search-input" 
                  placeholder="Buscar por referencia o tipo..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="table-scroll-wrapper">
              <table className="industrial-table">
                <thead>
                  <tr>
                    <th>Referencia</th>
                    <th>Tipo</th>
                    <th>Especificaciones Técnicas</th>
                    <th className="text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInsumos.map(ins => (
                    <tr key={ins.id} className={selectedInsumoId === ins.id.toString() ? 'row-selected' : ''}>
                      <td style={{ fontWeight: '600', color: 'var(--primary)' }}>{ins.reference || ins.referencia}</td>
                      <td>
                        <span className={`role-badge badge-${ins.tipo?.toLowerCase() || 'default'}`}>
                          {typeNamesSpanish[ins.tipo] || ins.tipo}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>
                        {getSpecsConfig(ins.tipo).length > 0 
                          ? getSpecsConfig(ins.tipo)
                              .map(key => `${getLabel(key)}: ${ins[key] || '0'}`)
                              .join(' / ')
                          : (ins.presentation || 'No additional specifications')}
                      </td>
                      <td className="text-center">
                        <button className="btn-icon-edit" title="Editar" onClick={() => handleEditClick(ins)}>✏️</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {editFormData && (
            <form className="admin-form" onSubmit={handleEditSubmit}>
              <div className="form-grid">
                <div className="form-field">
                  <label>Tipo de Insumo (No editable)</label>
                  <input type="text" value={typeNamesSpanish[editFormData.tipo] || editFormData.tipo} readOnly style={{ backgroundColor: '#f1f5f9', cursor: 'not-allowed' }} />
                </div>
              </div>

              <div className="technical-specs-entry" style={{ marginTop: '1.5rem' }}>
                <label className="field-label" style={{ color: 'var(--primary)', fontWeight: '700', marginBottom: '1rem', display: 'block' }}>
                  Editar Ficha Técnica
                </label>
                <div className="table-container-card" style={{ padding: '0', border: '1px solid var(--outline-variant)', overflowX: 'auto' }}>
                  <table className="industrial-table" style={{ margin: '0' }}>
                    <thead style={{ backgroundColor: 'var(--surface-variant)' }}>
                      <tr>
                        <th style={{ minWidth: '180px' }}>REFERENCIA</th>
                        {getSpecsConfig(editFormData.tipo).map(key => (
                          <th key={key}>{getLabel(key)}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>
                          <input type="text" name="reference" className="field-input" value={editFormData.reference || editFormData.referencia} onChange={handleEditChange} required />
                        </td>
                        {getSpecsConfig(editFormData.tipo).map(key => (
                          <td key={key}>
                            <input 
                              type="text" 
                              name={key} 
                              className="field-input" 
                              inputMode="decimal"
                              step="0.01" 
                              value={editFormData[key] || ''} 
                              onChange={handleEditChange} 
                              required 
                            />
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="form-actions">
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Guardando...' : 'Actualizar Insumo'}
                </button>
              </div>
            </form>
          )}
            </>
          )}
        </div>
      )}
        </>
      )}

      {activeAction === 'inspeccion_validacion' && (
        <div className="form-container">
          <h2 className="form-title">Validación de Inspección</h2>
          <p className="loading-text">Esta sección se está creando con el proposito de validar las inspeccones que quedaron en "Observación".</p>
        </div>
      )}

      {!activeAction && (
        <section className="welcome-card">
          <h2>Panel de Ingeniería</h2>
          <p>Configuración de parámetros técnicos y control de procesos.</p>
        </section>
      )}
    </div>
  );
};

export default JefeIngenieriaDashboardContent;