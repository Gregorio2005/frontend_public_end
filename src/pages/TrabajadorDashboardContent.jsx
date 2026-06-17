import React, { useState, useEffect } from 'react';
import { getSuppliers, getMasterInputsBySupplier, registerBill, registerBillInput, getBills, getBillInputsByBillId, registerInspection } from '../services/authService';

const TrabajadorDashboardContent = ({ activeAction, user }) => {
  const [formData, setFormData] = useState({
    numero_factura: '',
    fecha_factura: '',
    odoo: '',
    numero_expediente: '',
    numero_recepcion: '',
    fecha_recepcion: '',
    proveedor_id: '',
    insumos: [{ type_inputs_id: '', master_inputs_id: '', oem: '', cantidad: 1 }]
  });

  // Estado para la inspección
  const [inspectionData, setInspectionData] = useState({
    invoiceId: '',
    insumoIndex: '',
    details: {
      presentacion: false,
      fecha_prueba: '',
      resultado_prueba: false,
      diametro_externo: '',
      diametro_interno: '',
      altura: ''
    }
  });

  const [suppliers, setSuppliers] = useState([]);
  const [availableMasterInputs, setAvailableMasterInputs] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [selectedInvoiceItems, setSelectedInvoiceItems] = useState([]);
  const [loading, setLoading] = useState(false);

  // Estado para notificaciones personalizadas (Toast)
  const [notification, setNotification] = useState({ message: '', type: 'success', visible: false });

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type, visible: true });
    setTimeout(() => {
      setNotification(prev => ({ ...prev, visible: false }));
    }, 4000);
  };

  const idToSpanishType = {
    1: 'Estoperas', 2: 'Sellos', 3: 'O-Rings', 4: 'Químicos', 5: 'Bolsas',
    6: 'Cartón', 7: 'Estuches', 8: 'Termoplásticos', 9: 'Empaquetaduras', 10: 'Collares'
  };

  // Definición de campos que son de naturaleza booleana (Checkboxes)
  const isBooleanField = (key) => ['presentation', 'production_test', 'visual', 'joint'].includes(key);

  // Configuración de campos técnicos por ID de tipo (Sincronizado con Ingeniería)
  const getSpecsByTypeId = (typeId) => {
    const specs = {
      1: ['internal_diameter', 'external_diameter', 'height'], // Stuffing
      2: ['internal_diameter', 'external_diameter', 'height_a', 'height_b'], // Stamps
      3: ['internal_diameter', 'height'], // Oring
      4: ['presentation', 'batch_date', 'production_test'], // Chemicals
      5: ['height', 'width', 'art', 'caliber'], // Bags
      6: ['height', 'width', 'caliber'], // Cardboard
      7: ['caliber', 'armed'], // Estuches
      8: ['visual'], // Thermoplastics
      9: ['thickness_a', 'thickness_b', 'thickness_c', 'thickness_d', 'ring_diameter_a', 'ring_diameter_b', 'ring_diameter_c', 'ring_diameter_d'], // Empaquetaduras
      10: ['internal_diameter', 'height', 'joint'], // Collars
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
      art: 'Arte',
      caliber: 'Calibre',
      armed: 'Armado',
      joint: 'Unión',
      thickness_a: 'Espesor A', thickness_b: 'Espesor B', thickness_c: 'Espesor C', thickness_d: 'Espesor D',
      ring_diameter_a: 'Ø de Anillo A', ring_diameter_b: 'Ø de Anillo B', ring_diameter_c: 'Ø de Anillo C', ring_diameter_d: 'Ø de Anillo D'
    };
    return labels[key] || key;
  };

  // Valida que todos los campos técnicos del paso actual estén llenos
  const isCurrentStepValid = () => {
    if (!selectedInsumo) return false;
    let requiredKeys = getSpecsByTypeId(selectedInsumo.type_inputs_id);

    // Lógica especial para Químicos:
    if (selectedInsumo.type_inputs_id === 4) {
      if (currentItem.presentation === true) {
        requiredKeys = ['presentation'];
      } else {
        // Si la presentación es rechazada, la prueba de producción es opcional en la inspección inicial (se permite avanzar solo con fecha de lote)
        requiredKeys = ['presentation', 'batch_date'];
      }
    }

    return requiredKeys.every(key => currentItem[key] !== undefined && currentItem[key] !== '');
  };

  // Lista de tipos que requieren evaluación de medidas técnicas (Diámetros y Altura)
  const measurementTypes = ['Estoperas', 'Sellos', 'O-Rings', 'Químicos', 'Bolsas', 'Cartón', 'Estuches', 'Termoplásticos', 'Empaquetaduras', 'Collares'];

  // Carga inicial de datos según la pestaña activa
  useEffect(() => {
    if (activeAction === 'add_factura') {
      getSuppliers().then(setSuppliers).catch(console.error);
    }
    if (activeAction === 'inspection') {
      setLoading(true);
      getBills().then(setInvoices).catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [activeAction]);

  // Cargar insumos asignados al cambiar el proveedor
  const handleSupplierChange = async (e) => {
    const supplierId = e.target.value;
    setFormData(prev => ({ 
      ...prev, 
      proveedor_id: supplierId,
      insumos: [{ type_inputs_id: '', master_inputs_id: '', oem: '', cantidad: 1 }]
    }));
    
    if (supplierId) {
      setLoading(true);
      try {
        const data = await getMasterInputsBySupplier(supplierId);
        // Filtramos por estado "Vigente" y ordenamos por tipo (ID) y luego por referencia
        const sortedData = data
          .filter(item => item.status === 'Vigente')
          .sort((a, b) => {
            if (a.type_inputs_id !== b.type_inputs_id) return a.type_inputs_id - b.type_inputs_id;
            return (a.reference || '').localeCompare(b.reference || '');
          });
        setAvailableMasterInputs(sortedData);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    } else {
      setAvailableMasterInputs([]);
    }
  };


  // Auxiliares para el renderizado dinámico de inspección
  const selectedInvoice = invoices.find(inv => String(inv.id) === String(inspectionData.invoiceId));
  const selectedInsumo = selectedInvoiceItems[inspectionData.insumoIndex];

  const currentStep = inspectionData.details.currentStep || 1;
  const currentItem = (inspectionData.details.items || {})[currentStep] || {};
  const maxSteps = Math.ceil(inspectionData.details.cantidad_recepcionar || 1);

  // Lógica de validación de medidas técnicas
  const getMeasurementStatus = (value, allowed, key) => {
    // Si es un campo de fecha, no aplica evaluación de estado (Aprobado/Rechazado)
    if (key.includes('date')) return { text: '', color: 'transparent' };

    // Caso para campos booleanos (Químicos, Termoplásticos, etc.)
    if (isBooleanField(key)) {
      if (value === undefined || value === '') return { text: '', color: 'transparent' };
      return value ? { text: 'Aprobado', color: '#10b981' } : { text: 'Rechazado', color: '#ef4444' };
    }

    // Caso para medidas numéricas
    if (value === undefined || value === '' || allowed === undefined || isNaN(Number(allowed))) return { text: '', color: 'transparent' };
    const val = Number(value);
    const target = Number(allowed);
    
    if (val === target) return { text: 'Aprobado', color: '#10b981' }; 
    
    const diff = Math.abs(val - target);
    if (diff <= 0.2) return { text: 'Observacion', color: '#fbbf24' };
    
    return { text: 'Rechazado', color: '#ef4444' };
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'proveedor_id') handleSupplierChange(e);
    else setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleInsumoChange = (index, e) => {
    const { name, value } = e.target;
    const newInsumos = [...formData.insumos];
    
    // Si cambia el tipo, reseteamos el master_inputs_id de esa fila
    if (name === 'type_inputs_id') newInsumos[index].master_inputs_id = '';

    newInsumos[index] = { ...newInsumos[index], [name]: value };
    setFormData(prev => ({ ...prev, insumos: newInsumos }));
  };

  const addInsumo = () => {
    setFormData(prev => ({
      ...prev,
      insumos: [...prev.insumos, { type_inputs_id: '', master_inputs_id: '', oem: '', cantidad: 1 }]
    }));
  };

  const removeInsumo = (index) => {
    const newInsumos = formData.insumos.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, insumos: newInsumos }));
  };

  const handleInspectionChange = async (e) => {
    const { name, value, type, checked } = e.target;
    if (name === 'invoiceId') {
      // Al cambiar la factura, limpiamos los items y cargamos los nuevos del backend
      setLoading(true);
      try {
        const items = await getBillInputsByBillId(value);
        // Ordenamos los ítems de la factura por tipo para facilitar la selección en el dashboard
        const sortedItems = items.sort((a, b) => {
          if (a.type_inputs_id !== b.type_inputs_id) return a.type_inputs_id - b.type_inputs_id;
          return (a.reference || '').localeCompare(b.reference || '');
        });
        setSelectedInvoiceItems(sortedItems);
        
        // Mantenemos los 'details' previos para no perjudicar al trabajador si cambia de factura
        setInspectionData(prev => ({ 
          ...prev, 
          invoiceId: value, 
          insumoIndex: '' 
        }));
      } catch (err) {
        showNotification("Error al cargar los insumos de la factura", "error");
      } finally {
        setLoading(false);
      }
    } else if (name === 'insumoIndex') {
      const ins = selectedInvoiceItems[value];

      // Lógica de Cálculo: Valor fijo del 8% de la factura para inspección obligatoria.
      const calculatedQty = ins ? Number(((ins.cantidad || ins.quantity || 0) * 0.08).toFixed(2)) : 0;
      // Obtenemos el tipo en español para la lógica de visualización
      const tipoNombre = idToSpanishType[ins.type_inputs_id] || 'Desconocido';

      setInspectionData(prev => ({ 
        ...prev, 
        insumoIndex: value, 
        details: { 
          tipo: tipoNombre,
          cantidad_recepcionar: calculatedQty, 
          currentStep: 1,
          items: {
            1: { numero_recepcion: selectedInvoice?.nro_reception || '' }
          }
        } 
      }));
    } else {
      const step = inspectionData.details.currentStep || 1;
      // Detectamos si el campo pertenece a la ficha técnica dinámica
      const technicalKeys = selectedInsumo ? getSpecsByTypeId(selectedInsumo.type_inputs_id) : [];
      const isTechnicalField = technicalKeys.includes(name) || name === 'numero_recepcion' || isBooleanField(name);

      if (isTechnicalField) {
        setInspectionData(prev => {
          const items = { ...(prev.details.items || {}) };
          items[step] = { ...(items[step] || {}), [name]: value };
          return { ...prev, details: { ...prev.details, items } };
        });
      } else {
        setInspectionData(prev => ({
          ...prev,
          details: {
            ...prev.details,
            [name]: type === 'checkbox' ? checked : value
          }
        }));
      }
    }
  };

  const handleNextStep = (e) => {
    e.preventDefault();
    const step = inspectionData.details.currentStep || 1;

    if (!isCurrentStepValid()) {
      showNotification("Por favor, complete todos los campos técnicos requeridos para este tipo de insumo.", "error");
      return;
    }

    const maxSteps = Math.ceil(inspectionData.details.cantidad_recepcionar || 1);
    setInspectionData(prev => ({
      ...prev,
      details: { ...prev.details, currentStep: Math.min((prev.details.currentStep || 1) + 1, maxSteps) }
    }));
  };

  const handlePrevStep = (e) => {
    e.preventDefault();
    setInspectionData(prev => ({
      ...prev,
      details: { ...prev.details, currentStep: Math.max((prev.details.currentStep || 1) - 1, 1) }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // 1. Preparamos los datos de la cabecera (bill_data)
      const billHeader = {
        bill_nro: formData.numero_factura,
        billing_date: formData.fecha_factura,
        odoo: formData.odoo,
        nro_exp: formData.numero_expediente,
        nro_reception: formData.numero_recepcion,
        receipt_date: formData.fecha_recepcion,
        suppliers_id: parseInt(formData.proveedor_id, 10)
      };

      // Registramos la factura y obtenemos su ID
      const billResponse = await registerBill(billHeader);
      const billId = billResponse.data?.id || billResponse.id;

      if (!billId) throw new Error("No se pudo obtener el ID de la factura registrada.");

      // 2. Registramos cada insumo asociado (bill_inputs)
      const inputPromises = formData.insumos.map(item => {
        const inputPayload = {
          bill_data_id: billId, // Vinculamos al ID de la cabecera recién creada
          master_inputs_id: parseInt(item.master_inputs_id, 10),
          oem_number: item.oem,
          quantity: parseFloat(item.cantidad)
        };
        return registerBillInput(inputPayload);
      });

      await Promise.all(inputPromises);
      showNotification("Factura e insumos registrados con éxito en el sistema.");
      
      // Limpiar formulario
      setFormData({
        numero_factura: '', fecha_factura: '', odoo: '',
        numero_expediente: '', numero_recepcion: '', fecha_recepcion: '', proveedor_id: '',
        insumos: [{ type_inputs_id: '', master_inputs_id: '', oem: '', cantidad: 1 }]
      });
    } catch (err) {
      showNotification(`Error al registrar la factura: ${err.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleInspectionSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const userId = parseInt(user?.id || user?.user_id, 10);
      const typeId = selectedInsumo.type_inputs_id;
      const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD local

      const itemsToSave = Object.values(inspectionData.details.items || {});
      const techKeys = getSpecsByTypeId(typeId);
      const totalItemsRequired = Math.ceil(inspectionData.details.cantidad_recepcionar || 1);
      const isIncomplete = itemsToSave.length < totalItemsRequired;

      const promises = itemsToSave.map(item => {
        let itemStatus = "Aprobado";
        let itemObservation = "Lote aprovado";

        if (isIncomplete) {
          itemStatus = "Incompleta";
          itemObservation = "Inspección incompleta por cambio de prioridad";
        } else if (typeId === 4) {
          // Lógica específica para Químicos
          if (item.presentation === true) {
            itemStatus = "Aprobado";
            itemObservation = "Lote aprovado";
          } else {
            // La presentación es rechazada. Si la prueba de producción es rechazada explícitamente, se rechaza el lote.
            // Si no se ha realizado (null/undefined) o es aprobada, queda en observación para el Jefe de Ingeniería.
            if (item.production_test === false) {
              itemStatus = "Rechazado";
              itemObservation = "Rechazado por no cumplir con los valores esperados";
            } else {
              itemStatus = "Observacion";
              itemObservation = "En proceso de observacion por Jefe de Ingenieria";
            }
          }
        } else {
          // Evaluamos el status de CADA envío individualmente para el resto de tipos técnicos
          const itemMeasuresResults = techKeys.map(k => getMeasurementStatus(item[k], selectedInsumo[k], k).text);
          
          if (itemMeasuresResults.includes("Rechazado")) {
            itemStatus = "Rechazado";
            itemObservation = "Rechazado por no cumplir con los valores esperados";
          } else if (itemMeasuresResults.includes("Observacion")) {
            itemStatus = "Observacion";
            itemObservation = "En proceso de observacion por Jefe de Ingenieria";
          }
        }

        const payload = {
          bill_inputs_id: selectedInsumo.bill_inputs_id,
          users_id: userId,
          review_date: today,
          delivery_date: today, // Corregido: 'v' en lugar de 'b'
          status: itemStatus,
          observation: itemObservation
        };

        // Convertir cada especificación técnica a número, excepto fechas
        techKeys.forEach(key => {
          if (key.includes('date') || isBooleanField(key)) {
            // Mantener valor original para fechas y booleanos
            payload[key] = item[key];
          } else {
            // Convertir a número para medidas técnicas
            payload[key] = parseFloat(item[key]) || 0;
          }
        });

        return registerInspection(typeId, payload);
      });
      
      await Promise.all(promises);

      showNotification("Inspección guardada físicamente en la base de datos.");
      setInspectionData({ invoiceId: '', insumoIndex: '', details: {} });
    } catch (err) {
      showNotification(`Error al guardar: ${err.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard-content-body">
      {/* Notificación Toast Industrial */}
      <div className={`notification-toast ${notification.visible ? 'visible' : ''} ${notification.type}`}>
        <span className="material-symbols-outlined">
          {notification.type === 'error' ? 'error' : 'check_circle'}
        </span>
        <span className="notification-message">{notification.message}</span>
      </div>

      {/* Contenido condicional según la acción seleccionada */}
      {activeAction === 'add_factura' && (
        <div className="form-container">
          <h2 className="form-title">Registrar Nueva Factura</h2>
          <form className="admin-form" onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="form-field">
                <label htmlFor="numero_factura">Número de Factura</label>
                <input id="numero_factura" type="text" name="numero_factura" className="field-input" value={formData.numero_factura} onChange={handleChange} placeholder="Ej: FAC-0001" required />
              </div>
              <div className="form-field">
                <label htmlFor="fecha_factura">Fecha de Factura</label>
                <input id="fecha_factura" type="date" name="fecha_factura" className="field-input" value={formData.fecha_factura} onChange={handleChange} required />
              </div>
              <div className="form-field">
                <label htmlFor="odoo">Código Odoo</label>
                <input id="odoo" type="text" name="odoo" className="field-input" value={formData.odoo} onChange={handleChange} placeholder="Código de texto" required />
              </div>
              <div className="form-field">
                <label htmlFor="numero_expediente">Número de Expediente</label>
                <input id="numero_expediente" type="text" name="numero_expediente" className="field-input" value={formData.numero_expediente} onChange={handleChange} placeholder="Código de expediente" required />
              </div>
              <div className="form-field">
                <label htmlFor="numero_recepcion">Número de Recepción</label>
                <input id="numero_recepcion" type="text" name="numero_recepcion" className="field-input" value={formData.numero_recepcion} onChange={handleChange} placeholder="Código de recepción" required />
              </div>
              <div className="form-field">
                <label htmlFor="fecha_recepcion">Fecha de Recepción</label>
                <input id="fecha_recepcion" type="date" name="fecha_recepcion" className="field-input" value={formData.fecha_recepcion} onChange={handleChange} required />
              </div>
              <div className="form-field">
                <label htmlFor="proveedor_id">Proveedor</label>
                <select id="proveedor_id" name="proveedor_id" className="field-input" value={formData.proveedor_id} onChange={handleChange} required disabled={loading}>
                  <option value="" disabled>{loading ? 'Cargando...' : 'Seleccione un proveedor'}</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name || s.nombre}</option>
                  ))}
                </select>
              </div>
            </div>

            <hr style={{ margin: '2rem 0', border: '0', borderTop: '1px solid #e2e8f0' }} />
            
            <div className="insumos-section">
              <div className="form-section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 className="form-subtitle">Detalle de Insumos</h3>
                <button type="button" className="btn btn-secondary" onClick={addInsumo} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px', marginRight: '8px' }}>add</span>
                  Añadir Insumo
                </button>
              </div>

              <div className="table-container-card">
                <table className="industrial-table">
                  <thead>
                    <tr>
                      <th style={{ width: '30%' }}>Tipo de Insumo</th>
                      <th style={{ width: '40%' }}>Referencia (Código Interno)</th>
                      <th>Número OEM</th>
                      <th>Cantidad</th>
                      <th className="text-center">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.insumos.map((insumo, index) => {
                      // Filtrar tipos únicos disponibles para este proveedor
                      const availableTypesIds = [...new Set(availableMasterInputs.map(item => item.type_inputs_id))].sort((a, b) => a - b);
                      
                      // Filtrar referencias disponibles según el tipo seleccionado en esta fila
                      const filteredRefs = availableMasterInputs.filter(item => item.type_inputs_id === parseInt(insumo.type_inputs_id, 10));

                      return (
                        <tr key={index}>
                          <td>
                            <select name="type_inputs_id" className="field-input" value={insumo.type_inputs_id} onChange={(e) => handleInsumoChange(index, e)} required disabled={!formData.proveedor_id}>
                              <option value="" disabled>Seleccione tipo...</option>
                              {availableTypesIds.map(typeId => (
                                <option key={typeId} value={typeId}>{idToSpanishType[typeId]}</option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <select name="master_inputs_id" className="field-input" value={insumo.master_inputs_id} onChange={(e) => handleInsumoChange(index, e)} required disabled={!insumo.type_inputs_id}>
                              <option value="" disabled>Seleccione referencia...</option>
                              {filteredRefs.map(item => (
                                <option key={item.id} value={item.id}>{item.reference}</option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <input type="text" name="oem" className="field-input" value={insumo.oem} onChange={(e) => handleInsumoChange(index, e)} placeholder="Código OEM" required />
                          </td>
                          <td>
                            <input type="number" name="cantidad" className="field-input" value={insumo.cantidad} onChange={(e) => handleInsumoChange(index, e)} min="0.01" step="0.01" required />
                          </td>
                          <td className="text-center">
                            <button type="button" className="btn-icon-cancel" onClick={() => removeInsumo(index)} title="Eliminar fila" disabled={formData.insumos.length === 1}>🗑️</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={loading} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px', marginRight: '8px' }}>save</span>
                {loading ? 'Guardando...' : 'Guardar Factura'}
              </button>
            </div>
          </form>
        </div>
      )}

      {activeAction === 'inspection' && (
        <div className="form-container">
          <h2 className="form-title">Inspección de Insumos</h2>
          <form className="admin-form" onSubmit={handleInspectionSubmit}>
            <div className="form-grid">
              <div className="form-field">
                <label htmlFor="invoiceId">Seleccionar Factura</label>
                <select id="invoiceId" name="invoiceId" className="field-input" value={inspectionData.invoiceId} onChange={handleInspectionChange} required disabled={loading}>
                  <option value="" disabled>{loading ? 'Cargando facturas...' : 'Seleccione una factura...'}</option>
                  {invoices.map(inv => (
                    <option key={inv.id} value={inv.id}>{inv.bill_nro}</option>
                  ))}
                </select>
              </div>

              <div className="form-field">
                <label htmlFor="insumoIndex">Seleccionar Insumo</label>
                <select id="insumoIndex"
                  className="field-input"
                  name="insumoIndex" 
                  value={inspectionData.insumoIndex} 
                  onChange={handleInspectionChange} 
                  disabled={!inspectionData.invoiceId}
                  required
                >
                  <option value="" disabled>Seleccione un insumo...</option>
                  {selectedInvoiceItems.map((ins, idx) => (
                    <option key={idx} value={idx}>{ins.reference}</option>
                  ))}
                </select>
              </div>
            </div>

            {selectedInsumo && (
              <div className="table-container-card" style={{ marginTop: '2rem' }}>
                <h3 className="form-subtitle">
                  Medidas a evaluar para: <span className="role-badge">{inspectionData.details.tipo}</span>
                </h3>

                <div className="form-grid">
                  {selectedInsumo && (
                    <>
                      {/* Fila de cabecera compacta con 2 columnas */}
                      <div className="form-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gridColumn: 'span 2', gap: '1rem' }}>
                        <div className="form-field form-field-inline">
                          <label>Cantidad Facturada</label>
                          <input type="number" className="field-input" value={selectedInsumo.quantity || selectedInsumo.cantidad || 0} readOnly />
                        </div>
                        <div className="form-field form-field-inline">
                          <label>Cantidad a Inspeccionar</label>
                          <div className="field-input-group">
                            <input type="number" className="field-input text-center" value={inspectionData.details.cantidad_recepcionar || ''} readOnly />
                            <span className="input-group-addon">Item {currentStep} de {maxSteps}</span>
                          </div>
                        </div>
                      </div>

                      {/* Línea divisoria entre datos de recepción y valores experimentales */}
                      <hr style={{ gridColumn: 'span 2', border: '0', borderTop: '1px solid #e2e8f0', margin: '0.5rem 0' }} />

                      {/* RENDERIZADO DINÁMICO DE CAMPOS SEGÚN EL TIPO */}
                      {getSpecsByTypeId(selectedInsumo.type_inputs_id).map(key => (
                        (() => {
                          // Lógica específica para Químicos (Tipo 4): 
                          // Solo mostrar Fecha de Lote y Prueba de Producción si la Presentación es Rechazada (false)
                          if (selectedInsumo.type_inputs_id === 4) {
                            if ((key === 'batch_date' || key === 'production_test') && currentItem.presentation !== false) {
                              return null;
                            }
                          }

                          return (
                            <div className="form-field form-field-measurement" style={{ gridColumn: 'span 2' }} key={key}>
                              <label htmlFor={key} style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                                {getLabel(key)} {!isBooleanField(key) && !key.includes('date') && '(mm)'}
                              </label>
                              <div className="measurement-input-group" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', width: '100%' }}>
                                {!isBooleanField(key) && !key.includes('date') && (
                                  <span className="measurement-label" style={{ whiteSpace: 'nowrap', color: 'var(--secondary)', fontSize: '0.9rem', minWidth: '120px' }}>
                                    Permitido: {Number(selectedInsumo[key] || 0).toFixed(2)}
                                  </span>
                                )}
                                
                                {isBooleanField(key) ? (
                                  <div className="boolean-toggle-group" style={{ display: 'flex', gap: '0.5rem', flex: '1' }}>
                                    <button 
                                      type="button" 
                                      className={`btn ${currentItem[key] === true ? 'btn-primary' : 'btn-secondary'}`}
                                      style={{ 
                                        flex: 1, 
                                        padding: '0.6rem',
                                        backgroundColor: currentItem[key] === true ? '#10b981' : '', // Verde Éxito
                                        color: currentItem[key] === true ? 'white' : ''
                                      }}
                                      onClick={() => handleInspectionChange({ target: { name: key, value: true } })}
                                    >Aprobado</button>
                                    <button 
                                      type="button" 
                                      className={`btn ${currentItem[key] === false ? 'btn-primary' : 'btn-secondary'}`}
                                      style={{ 
                                        flex: 1, 
                                        padding: '0.6rem',
                                        backgroundColor: currentItem[key] === false ? '#ef4444' : '', // Rojo Error
                                        color: currentItem[key] === false ? 'white' : ''
                                      }}
                                      onClick={() => handleInspectionChange({ target: { name: key, value: false } })}
                                    >Rechazado</button>
                                  </div>
                                ) : (
                                  <input 
                                    id={key} 
                                    type={key.includes('date') ? 'date' : 'number'} 
                                    name={key} 
                                    className="field-input" 
                                    style={{ flex: '1' }} 
                                    step="0.01" 
                                    value={currentItem[key] || ''} 
                                    onChange={handleInspectionChange} 
                                    placeholder={key.includes('date') ? '' : "0.00"} 
                                    required 
                                  />
                                )}

                                {(() => {
                                  const status = getMeasurementStatus(currentItem[key], selectedInsumo[key], key);
                                  if (!status.text) return null;
                                  return <span className="measurement-status" style={{ color: status.color, fontWeight: 'bold', minWidth: '100px', textAlign: 'right' }}>{status.text}</span>;
                                })()}
                              </div>
                            </div>
                          );
                        })()
                      ))}
                    </>
                  )}
                </div>
                <div className="form-actions" style={{ marginTop: '2rem' }}>
                  {measurementTypes.includes(inspectionData.details.tipo) ? (
                    <div style={{ display: 'flex', gap: '1rem' }}>
                      <button type="button" className="btn btn-secondary" onClick={handlePrevStep} disabled={currentStep <= 1}>
                        <span className="material-symbols-outlined" style={{ fontSize: '18px', marginRight: '8px' }}>arrow_back</span>
                        Atrás
                      </button>
                        <button type="submit" className="btn btn-secondary" style={{ background: 'var(--surface-variant)', color: 'var(--on-surface)' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '18px', marginRight: '8px' }}>pause_circle</span>
                          Guardar como Incompleta
                        </button>
                      {currentStep < maxSteps ? (
                        <button type="button" className="btn btn-primary" onClick={handleNextStep}>
                          Siguiente
                          <span className="material-symbols-outlined" style={{ fontSize: '18px', marginLeft: '8px' }}>arrow_forward</span>
                        </button>
                      ) : (
                        <button type="submit" className="btn btn-primary">
                          <span className="material-symbols-outlined" style={{ fontSize: '18px', marginRight: '8px' }}>save</span>
                          Guardar Inspección
                        </button>
                      )}
                    </div>
                  ) : (
                    <button type="submit" className="btn btn-primary" disabled={!selectedInsumo}>
                      <span className="material-symbols-outlined" style={{ fontSize: '18px', marginRight: '8px' }}>save</span>
                      Guardar Inspección
                    </button>
                  )}
                </div>
              </div>
            )}
          </form>
        </div>
      )}

      {!activeAction && (
        <section className="welcome-card">
          <h2>Panel de Operaciones</h2>
          <p>Registro de actividades diarias y reportes de producción.</p>
        </section>
      )}
    </div>
  );
};

export default TrabajadorDashboardContent;