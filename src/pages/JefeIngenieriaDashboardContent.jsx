import React, { useState, useEffect } from 'react';
import { getInsumos, registerInsumo, updateInsumo, getInsumosByType, getBills, getBillInputsByBillId, getInspectionResults, updateInspection } from '../services/authService';

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

  // Estados para la Validación de Inspecciones
  const [invoices, setInvoices] = useState([]);
  const [selectedInvoiceItems, setSelectedInvoiceItems] = useState([]);
  const [inspectionHistory, setInspectionHistory] = useState([]);
  const [validationView, setValidationView] = useState({
    invoiceId: '',
    insumoIndex: '',
    currentStep: 1
  });

  // Estado para recolectar decisiones de cada característica antes de enviar el dictamen global
  const [pendingDecisions, setPendingDecisions] = useState({});

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

  // Lógica de evaluación de medidas (Idéntica a Admin)
  const getMeasurementStatus = (value, allowed, key) => {
    if (key.includes('date')) return { text: '', color: 'transparent' };

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

  // Lógica para enviar el dictamen de una característica específica (Varios PUTs por muestra)
  const handleDecision = async (newStatus, specKey, boolValue = null) => {
    const currentInsumo = selectedInvoiceItems[validationView.insumoIndex];
    const currentRecord = inspectionHistory[validationView.currentStep - 1];
    const typeId = currentInsumo.type_inputs_id;
    
    let finalObservation = "";

    // Lógica especial para Químicos (Mismos mensajes que el Trabajador)
    if (typeId === 4) {
      if (specKey === 'presentation' && boolValue === true) {
        finalObservation = "Lote aprovado";
      } else if (specKey === 'production_test' && boolValue === false) {
        finalObservation = "Rechazado por no cumplir con los valores esperados";
      } else {
        finalObservation = newStatus === 'Aprobado' ? `Aprobado condicionado a: ${getLabel(specKey)}` : `Rechazado por no cumplir en: ${getLabel(specKey)}`;
      }
    } else {
      if (newStatus === 'Aprobado') {
        const val = currentRecord[specKey];
        const isTechnical = !(['presentation', 'production_test', 'visual', 'joint'].includes(specKey) || specKey.includes('date'));
        const formattedVal = isTechnical ? `${Number(val).toFixed(3)} mm` : val;
        finalObservation = `Aprobado condicionado a: ${getLabel(specKey)} con valor experimental de ${formattedVal}`;
      } else {
        finalObservation = `Rechazado por no cumplir con los valores esperados en: ${getLabel(specKey)}`;
      }
    }

    // Feedback visual local y recolección para estatus global
    const updatedDecisions = {
      ...pendingDecisions,
      [specKey]: { status: newStatus, msg: finalObservation }
    };
    setPendingDecisions(updatedDecisions);

    // Cálculo del estatus global: se mantiene en 'Observacion' hasta que todo esté decidido o haya un rechazo
    const obsKeys = getSpecsByTypeId(currentInsumo.type_inputs_id)
      .filter(k => getMeasurementStatus(currentRecord[k], currentInsumo[k], k).text === 'Observación');
    
    let finalStatus = 'Observacion';
    if (Object.values(updatedDecisions).some(d => d.status === 'Rechazado')) {
      finalStatus = 'Rechazado';
    } else if (obsKeys.every(k => updatedDecisions[k]?.status === 'Aprobado')) {
      finalStatus = 'Aprobado';
    }

    setLoading(true);
    try {
      const techKeys = getSpecsByTypeId(currentInsumo.type_inputs_id);
      const payload = {
        bill_inputs_id: currentInsumo.bill_inputs_id,
        users_id: currentRecord.users_id,
        review_date: currentRecord.review_date ? currentRecord.review_date.split('T')[0] : new Date().toISOString().split('T')[0],
        delivery_date: currentRecord.delivery_date ? currentRecord.delivery_date.split('T')[0] : new Date().toISOString().split('T')[0],
        status: finalStatus,
        observation: finalObservation
      };

      techKeys.forEach(key => {
        const isBool = ['presentation', 'production_test', 'visual', 'joint'].includes(key);
        const isDate = key.includes('date');
        
        // Si es la característica que estamos dictaminando y es booleana, usamos el nuevo valor
        if (key === specKey && isBool && boolValue !== null) {
          payload[key] = boolValue;
        } else {
          payload[key] = (isBool || isDate) ? currentRecord[key] : (parseFloat(currentRecord[key]) || 0);
        }
      });

      await updateInspection(currentInsumo.type_inputs_id, currentRecord.id, payload);
      showNotification(`Dictamen de ${getLabel(specKey)} enviado correctamente.`, "success");

      // Si el dictamen global ya no es 'Observacion', removemos la muestra automáticamente tras un momento
      if (finalStatus !== 'Observacion') {
        setTimeout(() => {
          setPendingDecisions({});
          const remaining = inspectionHistory.filter((_, i) => i !== validationView.currentStep - 1);
          setInspectionHistory(remaining);
          if (remaining.length === 0) setValidationView(prev => ({ ...prev, insumoIndex: '' }));
        }, 1500);
      }
    } catch (err) {
      showNotification(err.message, "error");
    } finally {
      setLoading(false);
    }
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

  useEffect(() => {
    if (activeAction === 'inspeccion_validacion') {
      setLoading(true);
      getBills().then(async (allBills) => {
        // Filtramos las facturas: solo aquellas que tienen al menos un insumo con inspecciones en "Observacion"
        const filtered = await Promise.all(allBills.map(async (bill) => {
          const items = await getBillInputsByBillId(bill.id);
          const hasObservations = await Promise.all(items.map(async (item) => {
            const results = await getInspectionResults(item.type_inputs_id, item.id);
            return results.some(r => r.status === 'Observacion');
          }));
          
          if (hasObservations.some(obs => obs === true)) {
            return bill;
          }
          return null;
        }));
        
        setInvoices(filtered.filter(b => b !== null));
      }).catch(console.error)
      .finally(() => setLoading(false));
    }
  }, [activeAction]);

  // Limpiar estados cuando cambia la acción principal para forzar nueva búsqueda
  useEffect(() => {
    setSelectedEditType('');
    setEditFormData(null);
    setSelectedInsumoId('');
    setSearchTerm('');
    setSubView('list');
    setValidationView({ invoiceId: '', insumoIndex: '', currentStep: 1 });
    setPendingDecisions({});
    setInspectionHistory([]);
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

  const handleValidationViewChange = async (e) => {
    const { name, value } = e.target;
    if (name === 'invoiceId') {
      setLoading(true);
      try {
        const items = await getBillInputsByBillId(value);
        
        // Filtramos las referencias: solo mostrar las que tienen resultados en "Observacion"
        const filteredItems = await Promise.all(items.map(async (item) => {
          const results = await getInspectionResults(item.type_inputs_id, item.id);
          const hasObs = results.some(r => r.status === 'Observacion');
          return hasObs ? item : null;
        }));

        setSelectedInvoiceItems(filteredItems.filter(i => i !== null));
        setValidationView({ invoiceId: value, insumoIndex: '', currentStep: 1 });
        setInspectionHistory([]);
        setPendingDecisions({});
      } catch (err) { showNotification("Error al cargar insumos", "error"); }
      finally { setLoading(false); }
    } else if (name === 'insumoIndex') {
      const ins = selectedInvoiceItems[value];
      setLoading(true);
      try {
        const results = await getInspectionResults(ins.type_inputs_id, ins.id);
        // FILTRO CRÍTICO: Solo cargar muestras cuyo status sea "Observacion"
        const pending = results.filter(r => r.status === 'Observacion');
        setInspectionHistory(pending);
        setValidationView(prev => ({ 
          ...prev, 
          insumoIndex: value, 
          currentStep: 1 
        }));
        setPendingDecisions({});
        if (pending.length === 0) showNotification("No hay muestras en observación para esta referencia.", "info");
      } catch (err) { showNotification("Error al cargar inspecciones", "error"); }
      finally { setLoading(false); }
    }
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
        if (key === 'presentation') {
          cleanPayload[key] = value || 'N/A';
        } else {
          cleanPayload[key] = parseFloat(value) || 0;
        }
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

  // Configuración de especificaciones por ID (Idéntica a Admin)
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

  // Mapeo inverso para mantener compatibilidad con el registro manual
  const typeNameToId = { 'Stuffing': 1, 'Stamps': 2, 'Oring': 3, 'Chemicals': 4, 'Bags': 5, 'Cardboard': 6, 'Cases': 7, 'Thermoplastics': 8, 'Packings': 9, 'Collars': 10 };

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
    const specs = getSpecsByTypeId(typeNameToId[formData.tipo]);
    const userId = parseInt(user?.id || user?.user_id, 10);

    const cleanPayload = {
      reference: formData.reference,
      tipo: formData.tipo, // El service lo usará para rutear
      user_id: isNaN(userId) ? null : userId
    };

    specs.forEach(key => {
      const value = formData[key];
      if (key === 'presentation') {
        cleanPayload[key] = value || 'N/A';
      } else {
        cleanPayload[key] = parseFloat(value) || 0;
      }
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
                        {getSpecsByTypeId(typeNameToId[formData.tipo]).map(key => (
                          <th key={key}>{getLabel(key)}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>
                          <input type="text" name="reference" className="field-input" value={formData.reference} onChange={handleChange} placeholder="Ingrese código..." required />
                        </td>
                        {getSpecsByTypeId(typeNameToId[formData.tipo]).map(key => (
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
                        {getSpecsByTypeId(ins.type_inputs_id).length > 0 
                          ? getSpecsByTypeId(ins.type_inputs_id)
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
                        {getSpecsByTypeId(editFormData.type_inputs_id).map(key => (
                          <th key={key}>{getLabel(key)}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>
                          <input type="text" name="reference" className="field-input" value={editFormData.reference || editFormData.referencia} onChange={handleEditChange} required />
                        </td>
                        {getSpecsByTypeId(editFormData.type_inputs_id).map(key => (
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
          <div className="form-grid" style={{ marginBottom: '2rem' }}>
            <div className="form-field">
              <label>Seleccionar Factura</label>
              <select name="invoiceId" className="field-input" value={validationView.invoiceId} onChange={handleValidationViewChange}>
                <option value="" disabled>Seleccione factura para validar...</option>
                {invoices.map(inv => <option key={inv.id} value={inv.id}>{inv.bill_nro}</option>)}
              </select>
            </div>
            <div className="form-field">
              <label>Seleccionar Referencia con Alerta</label>
              <select name="insumoIndex" className="field-input" value={validationView.insumoIndex} onChange={handleValidationViewChange} disabled={!validationView.invoiceId}>
                <option value="" disabled>Seleccione ítem en observación...</option>
                {selectedInvoiceItems.map((ins, idx) => (
                  <option key={ins.id} value={idx}>{ins.reference}</option>
                ))}
              </select>
            </div>
          </div>

          {inspectionHistory.length > 0 && selectedInvoiceItems[validationView.insumoIndex] && (
            <div className="table-container-card" style={{ marginTop: '2rem', borderLeft: '5px solid #fbbf24' }}>
              <h3 className="form-subtitle" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Muestra en Revisión Técnica</span>
                <span className="role-badge" style={{ backgroundColor: '#fbbf24', color: 'black', fontWeight: '800' }}>PENDIENTE DE DICTAMEN</span>
              </h3>
              
              <div className="form-grid">
                <div className="form-field form-field-inline" style={{ gridColumn: 'span 2' }}>
                  <div className="field-input-group">
                    <span className="input-group-addon" style={{ background: '#fbbf24', color: 'black' }}>
                      Muestra Pendiente {validationView.currentStep} de {inspectionHistory.length}
                    </span>
                  </div>
                </div>

                {getSpecsByTypeId(selectedInvoiceItems[validationView.insumoIndex].type_inputs_id).map(key => {
                  const currentRecord = inspectionHistory[validationView.currentStep - 1];
                  const savedValue = currentRecord?.[key];
                  const allowedValue = selectedInvoiceItems[validationView.insumoIndex][key];
                  const isBool = ['presentation', 'production_test', 'visual', 'joint'].includes(key);
                  const isDate = key.includes('date');
                  const typeId = selectedInvoiceItems[validationView.insumoIndex].type_inputs_id;
                  const status = getMeasurementStatus(savedValue, allowedValue, key);
                  
                  // Lógica específica para Químicos (Tipo 4): 
                  // No mostrar Fecha de Lote y Prueba de Producción si la Presentación fue aprobada originalmente
                  if (selectedInvoiceItems[validationView.insumoIndex].type_inputs_id === 4) {
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
                        <span style={{ color: status.color, fontWeight: 'bold', minWidth: '100px', textAlign: 'right', fontSize: '0.85rem' }}>
                          {status.text}
                        </span>
                      </div>

                      {/* Botones de dictamen focalizados por característica */}
                      {status.text === 'Observación' && (
                        typeId === 4 && isBool ? (
                          <div className="boolean-toggle-group" style={{ display: 'flex', gap: '0.5rem', marginTop: '12px', justifyContent: 'flex-end', borderTop: '1px dashed #fbbf24', paddingTop: '8px', flex: '1' }}>
                            <button 
                              type="button" 
                              className={`btn ${pendingDecisions[key]?.status === 'Aprobado' ? 'btn-primary' : 'btn-secondary'}`}
                              disabled={loading}
                              onClick={() => handleDecision('Aprobado', key, true)}
                              style={{ padding: '0.4rem 1.2rem', fontSize: '0.75rem', fontWeight: '800', borderRadius: '4px', backgroundColor: pendingDecisions[key]?.status === 'Aprobado' ? '#10b981' : '', color: pendingDecisions[key]?.status === 'Aprobado' ? 'white' : '' }}
                            >Aprobado</button>
                            <button 
                              type="button" 
                              className={`btn ${pendingDecisions[key]?.status === 'Rechazado' ? 'btn-primary' : 'btn-secondary'}`}
                              disabled={loading}
                              onClick={() => handleDecision('Rechazado', key, false)}
                              style={{ padding: '0.4rem 1.2rem', fontSize: '0.75rem', fontWeight: '800', borderRadius: '4px', backgroundColor: pendingDecisions[key]?.status === 'Rechazado' ? '#ef4444' : '', color: pendingDecisions[key]?.status === 'Rechazado' ? 'white' : '' }}
                            >Rechazado</button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', gap: '1rem', marginTop: '12px', justifyContent: 'flex-end', borderTop: '1px dashed #fbbf24', paddingTop: '8px' }}>
                            <button 
                              type="button" 
                              className="btn" 
                              disabled={loading}
                              onClick={() => handleDecision('Aprobado', key)} 
                              style={{ backgroundColor: pendingDecisions[key]?.status === 'Aprobado' ? '#059669' : '#10b981', color: 'white', padding: '0.4rem 1.2rem', fontSize: '0.75rem', fontWeight: '800', borderRadius: '4px', border: pendingDecisions[key]?.status === 'Aprobado' ? '2px solid white' : 'none' }}
                            >
                              {pendingDecisions[key]?.status === 'Aprobado' ? '✓ APROBADO' : 'APROBAR'}
                            </button>
                            <button 
                              type="button" 
                              className="btn" 
                              disabled={loading}
                              onClick={() => handleDecision('Rechazado', key)} 
                              style={{ backgroundColor: pendingDecisions[key]?.status === 'Rechazado' ? '#b91c1c' : '#ef4444', color: 'white', padding: '0.4rem 1.2rem', fontSize: '0.75rem', fontWeight: '800', borderRadius: '4px', border: pendingDecisions[key]?.status === 'Rechazado' ? '2px solid white' : 'none' }}
                            >
                              {pendingDecisions[key]?.status === 'Rechazado' ? '✕ RECHAZADO' : 'RECHAZAR'}
                            </button>
                          </div>
                        )
                      )}
                    </div>
                  );
                })}

                <div style={{ gridColumn: 'span 2', marginTop: '1rem', padding: '1.5rem', backgroundColor: '#fffbeb', borderRadius: '8px', border: '1px solid #fde68a' }}>
                   <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                    <span className="material-symbols-outlined" style={{ color: '#d97706' }}>info</span>
                    <p style={{ margin: 0, fontSize: '0.95rem', color: '#92400e', lineHeight: '1.5' }}>
                      <strong>Motivo de Observación:</strong> {inspectionHistory[validationView.currentStep - 1]?.observation || 'La medida presenta una desviación fuera de los parámetros estándar pero dentro del rango de tolerancia de ingeniería.'}
                    </p>
                  </div>
                </div>

              </div>

              {/* Solo mostrar navegación si hay más de una observación para esta referencia */}
              {inspectionHistory.length > 1 && (
                <div className="form-actions" style={{ marginTop: '2rem', display: 'flex', gap: '1rem', justifyContent: 'space-between', padding: '0 1rem 1rem' }}>
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={() => setValidationView(prev => ({ ...prev, currentStep: Math.max(prev.currentStep - 1, 1) }))} 
                    disabled={validationView.currentStep === 1}
                  >
                    <span className="material-symbols-outlined">arrow_back</span> Muestra Anterior
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={() => setValidationView(prev => ({ ...prev, currentStep: Math.min(prev.currentStep + 1, inspectionHistory.length) }))} 
                    disabled={validationView.currentStep === inspectionHistory.length}
                  >
                    Siguiente Observación <span className="material-symbols-outlined">arrow_forward</span>
                  </button>
                </div>
              )}
            </div>
          )}
          {validationView.insumoIndex !== '' && inspectionHistory.length === 0 && !loading && (
            <div className="welcome-card" style={{ marginTop: '2rem', textAlign: 'center', border: '2px dashed var(--outline-variant)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '3rem', color: 'var(--secondary)', marginBottom: '1rem' }}>task_alt</span>
              <p style={{ color: 'var(--secondary)', fontWeight: '600' }}>No se encontraron muestras en estado de "Observación" para esta referencia.</p>
            </div>
          )}
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