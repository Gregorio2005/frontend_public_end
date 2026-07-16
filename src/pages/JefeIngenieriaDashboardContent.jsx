import React, { useState, useEffect } from 'react';
import { getInsumos, registerInsumo, updateInsumo, getInsumosByType, getBills, getBillInputsByBillId, getInspectionResults, updateInspection, getTypeInputs, createTypeInput, updateTypeInput, deleteTypeInput, setTypesList, incrementReportApproved, incrementReportRefused, getReportPdfUrl } from '../services/authService';
import ConfirmModal from '../components/ConfirmModal';
import NumericInput from '../components/NumericInput';
import TextInput from '../components/TextInput';
import CustomSelect from '../components/CustomSelect';

const JefeIngenieriaDashboardContent = ({ activeAction, user, refreshNotifications, refreshStats }) => {
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
  const [estadoSort, setEstadoSort] = useState(null);

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

  // Estados para la gestión de tipos de insumo
  const [typeInputsList, setTypeInputsList] = useState([]);
  const [newTypeName, setNewTypeName] = useState('');
  const [editingTypeId, setEditingTypeId] = useState(null);
  const [editedTypeName, setEditedTypeName] = useState('');
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null });

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

  // Lógica para recolectar la decisión de una característica (sin enviar aún)
  const handleDecision = (newStatus, specKey, boolValue = null) => {
    const currentInsumo = selectedInvoiceItems[validationView.insumoIndex];
    const currentRecord = inspectionHistory[validationView.currentStep - 1];
    const typeId = currentInsumo.type_inputs_id;
    
    let finalObservation = "";

    // Lógica especial para Químicos
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

    // Solo actualizar el estado local
    setPendingDecisions(prev => ({
      ...prev,
      [specKey]: { status: newStatus, msg: finalObservation, boolValue }
    }));
  };

  // Envío definitivo del dictamen con todas las decisiones recopiladas
  const handleFinalSubmission = async () => {
    const currentInsumo = selectedInvoiceItems[validationView.insumoIndex];
    const currentRecord = inspectionHistory[validationView.currentStep - 1];
    const typeId = currentInsumo.type_inputs_id;
    const techKeys = getSpecsByTypeId(typeId);

    if (Object.keys(pendingDecisions).length === 0) {
      showNotification("Debe definir al menos una característica antes de enviar.", "error");
      return;
    }

    // Calcular estatus global
    let finalStatus = 'Observacion';
    if (Object.values(pendingDecisions).some(d => d.status === 'Rechazado')) {
      finalStatus = 'Rechazado Observacion';
    } else if (Object.values(pendingDecisions).every(d => d.status === 'Aprobado')) {
      finalStatus = 'Aprobado Observacion';
    }

    // Construir observación concatenando todas las decisiones
    const observations = Object.entries(pendingDecisions).map(([key, decision]) => decision.msg);
    const finalObservation = observations.join(' | ');

    setLoading(true);
    try {
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
        const decision = pendingDecisions[key];
        
        if (decision && isBool && decision.boolValue !== null && decision.boolValue !== undefined) {
          payload[key] = decision.boolValue;
        } else if (isBool) {
          payload[key] = currentRecord[key] === true || currentRecord[key] === false ? currentRecord[key] : false;
        } else if (isDate) {
          const raw = currentRecord[key];
          if (raw && typeof raw === 'string') {
            payload[key] = raw.includes('T') ? raw.split('T')[0] : raw;
          } else {
            payload[key] = null;
          }
        } else {
          const numVal = parseFloat(currentRecord[key]);
          payload[key] = isNaN(numVal) ? 0 : numVal;
        }
      });

      await updateInspection(currentInsumo.type_inputs_id, currentRecord.id, payload);

      if (finalStatus === 'Aprobado Observacion') {
        await incrementReportApproved(validationView.invoiceId, 1);
      } else if (finalStatus === 'Rechazado Observacion') {
        await incrementReportRefused(validationView.invoiceId, 1, finalObservation);
      }

      showNotification(`Dictamen final enviado correctamente.`, "success");
      if (refreshStats) refreshStats();

      // Remover la muestra tras un momento
      setTimeout(() => {
        setPendingDecisions({});
        const remaining = inspectionHistory.filter((_, i) => i !== validationView.currentStep - 1);
        setInspectionHistory(remaining);
        if (remaining.length === 0) setValidationView(prev => ({ ...prev, insumoIndex: '' }));
      }, 1500);
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

  // Cargar tipos de insumo cuando se selecciona el tab de tipos
  useEffect(() => {
    if (activeAction === 'tipos_insumo') {
      loadTypeInputs();
    }
  }, [activeAction]);

  // Cargar tipos de insumo para los selectores de Insumos
  useEffect(() => {
    if (activeAction === 'insumos') {
      loadTypeInputs();
    }
  }, [activeAction]);

  const loadTypeInputs = async () => {
    try {
      const data = await getTypeInputs();
      setTypeInputsList(data);
      setTypesList(data);
    } catch (error) {
      showNotification(`Error al cargar tipos de insumo: ${error.message}`, 'error');
    }
  };

  const handleCreateTypeInput = async (e) => {
    e.preventDefault();
    if (!newTypeName.trim()) {
      showNotification('El nombre del tipo es requerido', 'error');
      return;
    }
    setLoading(true);
    try {
      await createTypeInput(newTypeName.trim());
      refreshNotifications();
      showNotification('Tipo de insumo registrado exitosamente');
      setNewTypeName('');
      await loadTypeInputs();
    } catch (error) {
      showNotification(`Error: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEditTypeClick = (type) => {
    setEditingTypeId(type.id);
    setEditedTypeName(type.name);
  };

  const handleCancelEditType = () => {
    setEditingTypeId(null);
    setEditedTypeName('');
  };

  const handleSaveEditType = async (id) => {
    if (!editedTypeName.trim()) {
      showNotification('El nombre del tipo es requerido', 'error');
      return;
    }
    setLoading(true);
    try {
      await updateTypeInput(id, editedTypeName.trim());
      showNotification('Tipo de insumo actualizado exitosamente');
      setEditingTypeId(null);
      setEditedTypeName('');
      await loadTypeInputs();
    } catch (error) {
      showNotification(`Error: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTypeClick = (type) => {
    setConfirmModal({
      isOpen: true,
      title: 'Eliminar Tipo de Insumo',
      message: `¿Está seguro de eliminar el tipo "${type.name}"? Esta acción no se puede deshacer.`,
      onConfirm: async () => {
        setLoading(true);
        try {
          await deleteTypeInput(type.id);
          showNotification('Tipo de insumo eliminado exitosamente');
          await loadTypeInputs();
        } catch (error) {
          showNotification(`Error: ${error.message}`, 'error');
        } finally {
          setLoading(false);
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
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
    const { name, value } = e.target;
    setEditFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Construir payload limpio para actualización
      const selectedType = typeInputsList.find(t => String(t.id) === String(editFormData.tipo) || t.name === editFormData.tipo);
      const typeName = selectedType ? selectedType.name : editFormData.tipo;
      const typeId = selectedType ? selectedType.id : null;
      const specs = typeId ? getSpecsByTypeId(typeId) : getSpecsByTypeId(editFormData.type_inputs_id);
      const userId = parseInt(user?.id || user?.user_id, 10);
      
      const cleanPayload = {
        reference: editFormData.reference || editFormData.referencia,
        tipo: typeName, // Nombre del tipo para que el service individual lo resuelva
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

  // Especificaciones para el formulario de REGISTRO (excluye datos experimentales)
  // Químicos (4) y Termoplásticos (8): solo referencia
  // Collares (10): sin 'joint' (dato experimental)
  const getRegisterSpecsByTypeId = (typeId) => {
    const registerSpecs = {
      1: ['internal_diameter', 'external_diameter', 'height'],
      2: ['internal_diameter', 'external_diameter', 'height_a', 'height_b'],
      3: ['internal_diameter', 'height'],
      4: [],
      5: ['height', 'width', 'art', 'caliber'],
      6: ['height', 'width', 'caliber'],
      7: ['caliber', 'armed'],
      8: [],
      9: ['thickness_a', 'thickness_b', 'thickness_c', 'thickness_d', 'ring_diameter_a', 'ring_diameter_b', 'ring_diameter_c', 'ring_diameter_d'],
      10: ['internal_diameter', 'height'],
    };
    return registerSpecs[typeId] || [];
  };

  // Mapeo inverso para mantener compatibilidad con el registro manual
  const typeNameToId = { 'Stuffing': 1, 'Stamps': 2, 'Oring': 3, 'Chemicals': 4, 'Bags': 5, 'Cardboard': 6, 'Cases': 7, 'Thermoplastics': 8, 'Packings': 9, 'Collars': 10 };

  const getLabel = (key, typeId) => {
    const labels = {
      internal_diameter: 'Diámetro Interno Ø',
      external_diameter: 'Diámetro Externo Ø',
      height: (typeId === 5 || typeId === 6) ? 'Largo' : 'Altura',
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
    const selectedType = typeInputsList.find(t => String(t.id) === String(formData.tipo));
    const typeName = selectedType ? selectedType.name : formData.tipo;
    const specs = getSpecsByTypeId(parseInt(formData.tipo, 10));
    const userId = parseInt(user?.id || user?.user_id, 10);

    const cleanPayload = {
      reference: formData.reference,
      tipo: typeName, // Nombre del tipo para que el service individual lo resuelva
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
      refreshNotifications();
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
  }).sort((a, b) => {
    if (!estadoSort) return 0;
    const aVal = (a.master_status || 'Sin estado').toLowerCase();
    const bVal = (b.master_status || 'Sin estado').toLowerCase();
    const dir = estadoSort === 'asc' ? 1 : -1;
    if (aVal < bVal) return -1 * dir;
    if (aVal > bVal) return 1 * dir;
    return 0;
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
            <button 
              className={`btn ${subView === 'types' ? 'btn-primary' : 'btn-secondary'}`} 
              onClick={() => setSubView('types')}
            >
              Agregar Tipo de Insumo
            </button>
          </div>

          {subView === 'add' ? (
        <div className="form-container">
          <h2 className="form-title">Registrar Nuevo Insumo</h2>
          <form className="admin-form" onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="form-field" style={{ gridColumn: 'span 2' }}>
                <label>Tipo de Insumo</label>
                <CustomSelect name="tipo" value={formData.tipo} onChange={handleChange} options={typeInputsList.map(type => ({ value: type.id, label: typeNamesSpanish[type.name] || type.name }))} placeholder="Seleccione un tipo..." required />
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
                        {getRegisterSpecsByTypeId(parseInt(formData.tipo, 10)).map(key => (
                          <th key={key}>{getLabel(key, parseInt(formData.tipo, 10))}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>
                          <TextInput type="text" name="reference" className="field-input" value={formData.reference} onChange={handleChange} placeholder="Ingrese código..." sanitize="quotes" required />
                        </td>
                        {getRegisterSpecsByTypeId(parseInt(formData.tipo, 10)).map(key => (
                          <td key={key}>
                            <NumericInput 
                              name={key} 
                              className="field-input" 
                              value={formData[key]} 
                              onChange={handleChange} 
                              placeholder="---" 
                              maxDecimals={4}
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
      ) : subView === 'types' ? (
        <div className="form-container">
          <h2 className="form-title">Gestionar Tipos de Insumo</h2>
          
          <form className="admin-form" onSubmit={handleCreateTypeInput} style={{ marginBottom: '2rem' }}>
            <div className="form-grid">
              <div className="form-field">
                <label>Nombre del Tipo de Insumo</label>
                <TextInput
                  type="text"
                  className="field-input"
                  value={newTypeName}
                  onChange={(e) => setNewTypeName(e.target.value)}
                  placeholder="Ingrese el nombre del tipo..."
                  sanitize="quotes"
                  required
                />
              </div>
            </div>
            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={loading}>
                <span className="material-symbols-outlined" style={{ marginRight: '8px', fontSize: '18px' }}>add</span>
                {loading ? 'Guardando...' : 'Agregar Tipo'}
              </button>
            </div>
          </form>

          <div className="table-container-card">
            <div className="table-scroll-wrapper">
              <table className="industrial-table">
                <thead>
                  <tr>
                    <th style={{ width: '85%' }}>Nombre del Tipo de Insumo</th>
                    <th className="text-center" style={{ width: '15%' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {typeInputsList.length > 0 ? typeInputsList.map((type) => {
                    const isEditing = editingTypeId === type.id;
                    return (
                      <tr key={type.id}>
                        <td style={{ fontWeight: '600' }}>
                          {isEditing ? (
                            <TextInput
                              type="text"
                              className="field-input"
                              value={editedTypeName}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => setEditedTypeName(e.target.value)}
                              sanitize="quotes"
                              autoFocus
                            />
                          ) : (type.name)}
                        </td>
                        <td className="text-center">
                          {isEditing ? (
                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                              <button className="btn-icon-save" title="Guardar" onClick={() => handleSaveEditType(type.id)}>✅</button>
                              <button className="btn-icon-cancel" title="Cancelar" onClick={handleCancelEditType}>❌</button>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                              <button className="btn-icon-edit" title="Editar" onClick={() => handleEditTypeClick(type)}>✏️</button>
                              <button className="btn-icon-cancel" title="Eliminar" onClick={() => handleDeleteTypeClick(type)} style={{ fontSize: '1rem' }}>🗑️</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  }) : (
                    <tr>
                      <td colSpan="2" className="text-center no-data" style={{ padding: '3rem' }}>
                        No hay tipos de insumo registrados. Use el formulario superior para agregar uno nuevo.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="form-container">

          {/* Selector de Tipo Obligatorio para búsqueda específica */}
          <div className="form-grid" style={{ marginBottom: '2rem' }}>
            <div className="form-field" style={{ gridColumn: 'span 2' }}>
              <label>Seleccione el Tipo de Insumo para buscar en su tabla técnica</label>
              <CustomSelect
                value={selectedEditType}
                onChange={(e) => handleTypeSelectForEdit(e.target.value)}
                options={typeInputsList.map(type => ({ value: type.id, label: typeNamesSpanish[type.name] || type.name }))}
                placeholder="Seleccione un tipo..."
              />
            </div>
          </div>

          {selectedEditType && (
            <>
          <div className="table-container-card" style={{ marginBottom: '2rem' }}>
            <div className="table-filters">
              <div className="table-search-wrapper">
                <span className="material-symbols-outlined">search</span>
                <TextInput
                  type="text"
                  className="table-search-input"
                  placeholder="Buscar por referencia o tipo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  sanitize="quotes"
                />
              </div>
            </div>
            <div className="table-scroll-wrapper" style={{ overflowX: 'auto' }}>
              {(() => {
                const selectedTypeId = typeInputsList.find(t => String(t.id) === String(selectedEditType))?.id;
                const visibleSpecs = getSpecsByTypeId(selectedTypeId).filter(key => !['presentation', 'batch_date', 'production_test', 'visual', 'joint'].includes(key));
                return (
                  <table className="industrial-table">
                    <thead>
                      <tr>
                        <th>Referencia</th>
                        <th>Tipo</th>
                        {visibleSpecs.map(key => (
                          <th key={key}>{getLabel(key, selectedTypeId)}</th>
                        ))}
                        <th className="text-center">
                          <div className="dt-th-content" style={{ justifyContent: 'center' }}>
                            <span>Estado</span>
                            <button
                              className={`dt-sort-trigger ${estadoSort ? 'active' : ''}`}
                              onClick={() => setEstadoSort(prev => {
                                if (prev === 'asc') return 'desc';
                                if (prev === 'desc') return null;
                                return 'asc';
                              })}
                              title={estadoSort === 'asc' ? 'Orden ascendente (clic para descendente)' : estadoSort === 'desc' ? 'Orden descendente (clic para quitar)' : 'Clic para ordenar'}
                            >
                              {!estadoSort && <span className="material-symbols-outlined dt-sort-icon">unfold_more</span>}
                              {estadoSort === 'asc' && <span className="material-symbols-outlined dt-sort-icon active">arrow_upward</span>}
                              {estadoSort === 'desc' && <span className="material-symbols-outlined dt-sort-icon active">arrow_downward</span>}
                            </button>
                          </div>
                        </th>
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
                          {visibleSpecs.map(key => {
                            const val = ins[key];
                            const isEmpty = val === undefined || val === null || val === '' || val === 0 || val === '0';
                            return (
                              <td key={key} style={{ fontSize: '0.85rem', color: isEmpty ? 'var(--secondary)' : 'inherit', textAlign: 'center' }}>
                                {isEmpty ? '-' : val}
                              </td>
                            );
                          })}
                          <td className="text-center">
                            <span className={`role-badge badge-${(ins.master_status || 'sin-estado').toLowerCase().replace(/\s/g, '-')}`}>
                              {ins.master_status || 'Sin estado'}
                            </span>
                          </td>
                          <td className="text-center">
                            <button className="btn-icon-edit" title="Editar" onClick={() => handleEditClick(ins)}>✏️</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                );
              })()}
            </div>
          </div>

          {editFormData && (
            <form className="admin-form" onSubmit={handleEditSubmit}>
              <div className="form-grid">
                <div className="form-field">
                  <label>Tipo de Insumo (No editable)</label>
                  <TextInput type="text" value={typeNamesSpanish[editFormData.tipo] || editFormData.tipo} readOnly style={{ backgroundColor: '#f1f5f9', cursor: 'not-allowed' }} />
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
                          <th key={key}>{getLabel(key, editFormData.type_inputs_id)}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>
                          <TextInput type="text" name="reference" className="field-input" value={editFormData.reference || editFormData.referencia} readOnly style={{ backgroundColor: '#f1f5f9', cursor: 'not-allowed' }} required />
                        </td>
                        {getSpecsByTypeId(editFormData.type_inputs_id).map(key => (
                          <td key={key}>
                            <NumericInput 
                              name={key} 
                              className="field-input" 
                              value={editFormData[key] || ''} 
                              onChange={handleEditChange} 
                              maxDecimals={4}
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
              <CustomSelect name="invoiceId" value={validationView.invoiceId} onChange={handleValidationViewChange} options={invoices.map(inv => ({ value: inv.id, label: inv.bill_nro }))} placeholder="Seleccione factura para validar..." />
            </div>
            <div className="form-field">
              <label>Seleccionar Referencia con Alerta</label>
              <CustomSelect name="insumoIndex" value={validationView.insumoIndex} onChange={handleValidationViewChange} options={selectedInvoiceItems.map((ins, idx) => ({ value: idx, label: ins.reference }))} placeholder="Seleccione ítem en observación..." disabled={!validationView.invoiceId} />
            </div>
          </div>

          {validationView.invoiceId && (
            <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
              <a
                href={getReportPdfUrl(validationView.invoiceId)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.5rem 1rem',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  textDecoration: 'none'
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>picture_as_pdf</span>
                Descargar Reporte PDF
              </a>
            </div>
          )}

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
                  // No mostrar Fecha de Lote si la Presentación fue aprobada
                  if (selectedInvoiceItems[validationView.insumoIndex].type_inputs_id === 4) {
                    if (key === 'batch_date' && currentRecord?.presentation !== false) {
                      return null;
                    }
                  }

                  return (
                    <div className="form-field form-field-measurement" style={{ gridColumn: 'span 2' }} key={key}>
                      <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                        {getLabel(key, selectedInvoiceItems[validationView.insumoIndex].type_inputs_id)} {!isBool && !isDate && '(mm)'}
                      </label>
                      <div className="measurement-input-group" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', width: '100%' }}>
                        {!isBool && !isDate && (
                          <span className="measurement-label" style={{ whiteSpace: 'nowrap', color: 'var(--secondary)', fontSize: '0.9rem', minWidth: '120px' }}>
                            Permitido: {Number(allowedValue || 0).toFixed(2)}
                          </span>
                        )}
                        
                        {isBool ? (
                          typeId === 4 ? (
                            <div className="boolean-toggle-group" style={{ display: 'flex', gap: '0.5rem', flex: '1' }}>
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
                            <div className="field-input" style={{ flex: '1', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center', fontWeight: '500' }}>
                              <span className="material-symbols-outlined" style={{ marginRight: '8px', color: savedValue ? '#10b981' : '#ef4444' }}>
                                {savedValue ? 'check_circle' : 'cancel'}
                              </span>
                              {savedValue === true ? 'Aprobado' : (savedValue === false ? 'Rechazado' : 'N/A')}
                            </div>
                          )
                        ) : (
                          status.text === 'Observación' ? (
                            <div style={{ display: 'flex', gap: '0.5rem', flex: '1' }}>
                              <TextInput
                                type="text"
                                className="field-input"
                                style={{ flex: '1', backgroundColor: '#f8fafc' }}
                                value={isDate ? (savedValue ? savedValue.split('T')[0] : 'Sin fecha') : (savedValue !== undefined ? Number(savedValue).toFixed(3) : '')}
                                readOnly
                              />
                              <div className="boolean-toggle-group" style={{ display: 'flex', gap: '0.5rem' }}>
                                <button 
                                  type="button" 
                                  className={`btn ${pendingDecisions[key]?.status === 'Aprobado' ? 'btn-primary' : 'btn-secondary'}`}
                                  disabled={loading}
                                  onClick={() => handleDecision('Aprobado', key)}
                                  style={{ padding: '0.4rem 1.2rem', fontSize: '0.75rem', fontWeight: '800', borderRadius: '4px', backgroundColor: pendingDecisions[key]?.status === 'Aprobado' ? '#10b981' : '', color: pendingDecisions[key]?.status === 'Aprobado' ? 'white' : '' }}
                                >Aprobado</button>
                                <button 
                                  type="button" 
                                  className={`btn ${pendingDecisions[key]?.status === 'Rechazado' ? 'btn-primary' : 'btn-secondary'}`}
                                  disabled={loading}
                                  onClick={() => handleDecision('Rechazado', key)}
                                  style={{ padding: '0.4rem 1.2rem', fontSize: '0.75rem', fontWeight: '800', borderRadius: '4px', backgroundColor: pendingDecisions[key]?.status === 'Rechazado' ? '#ef4444' : '', color: pendingDecisions[key]?.status === 'Rechazado' ? 'white' : '' }}
                                >Rechazado</button>
                              </div>
                            </div>
                          ) : (
                            <TextInput
                              type="text"
                              className="field-input"
                              style={{ flex: '1', backgroundColor: '#f8fafc' }}
                              value={isDate ? (savedValue ? savedValue.split('T')[0] : 'Sin fecha') : (savedValue !== undefined ? Number(savedValue).toFixed(3) : '')}
                              readOnly
                            />
                          )
                        )}
                        <span style={{ color: status.color, fontWeight: 'bold', minWidth: '100px', textAlign: 'right', fontSize: '0.85rem' }}>
                          {status.text}
                        </span>
                      </div>
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

                <div style={{ gridColumn: 'span 2', marginTop: '1rem', display: 'flex', justifyContent: 'center', gap: '1rem' }}>
                  <button 
                    type="button" 
                    className="btn btn-primary"
                    disabled={loading || Object.keys(pendingDecisions).length === 0}
                    onClick={handleFinalSubmission}
                    style={{ 
                      padding: '0.7rem 2rem', 
                      fontSize: '0.9rem', 
                      fontWeight: '800', 
                      borderRadius: '6px',
                      backgroundColor: Object.keys(pendingDecisions).length > 0 ? '#10b981' : '#94a3b8',
                      display: 'flex', alignItems: 'center', gap: '0.5rem'
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>send</span>
                    Definición Final
                  </button>
                  {Object.keys(pendingDecisions).length > 0 && (
                    <span style={{ display: 'flex', alignItems: 'center', fontSize: '0.8rem', color: 'var(--secondary)' }}>
                      {Object.keys(pendingDecisions).length} campo(s) definido(s)
                    </span>
                  )}
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

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        confirmText="Eliminar"
        cancelText="Cancelar"
        type="danger"
      />
    </div>
  );
};

export default JefeIngenieriaDashboardContent;