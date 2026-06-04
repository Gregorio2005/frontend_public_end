import React, { useState } from 'react';

const TrabajadorDashboardContent = ({ activeAction }) => {
  const [formData, setFormData] = useState({
    numero_factura: '',
    fecha_factura: '',
    odoo: '',
    numero_expediente: '',
    numero_recepcion: '',
    fecha_recepcion: '',
    proveedor_id: '',
    insumos: [{ tipo: '', codigo_interno: '', oem: '', cantidad: 1 }]
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

  // Datos simulados de facturas existentes
  const mockInvoices = [
    { id: '1', numero: 'FAC-2024-001', numero_recepcion: 'REC-001', insumos: [{ tipo: 'Químico', oem: 'CHEM-X1', cantidad: 100 }, { tipo: 'Materia Prima', oem: 'AL-500', cantidad: 50 }] },
    { id: '2', numero: 'FAC-2024-002', numero_recepcion: 'REC-002', insumos: [{ tipo: 'Empaque', oem: 'BOX-22', cantidad: 200, tolerancias: { diametro_externo: 10.20, diametro_interno: 5.50, altura: 15.00 } }, { tipo: 'Químico', oem: 'SOLV-A', cantidad: 5 }] },
    { id: '3', numero: 'FAC-2024-003', numero_recepcion: 'REC-003', insumos: [{ tipo: 'Empaque', oem: 'WRAP-10', cantidad: 1000, tolerancias: { diametro_externo: 20.00, diametro_interno: 15.00, altura: 5.00 } }] }
  ];

  // Códigos internos sugeridos para el autocompletado (Simulado)
  const mockInternalCodes = [
    'INT-EMP-001', 'INT-EMP-002', 'INT-QUI-101', 'INT-MAT-500', 'INT-COM-303', 'INT-ST-99'
  ];

  const [loading, setLoading] = useState(false);

  // Auxiliares para el renderizado dinámico de inspección
  const selectedInvoice = mockInvoices.find(inv => inv.id === inspectionData.invoiceId);
  const selectedInsumo = selectedInvoice?.insumos[inspectionData.insumoIndex];

  const currentStep = inspectionData.details.currentStep || 1;
  const currentItem = (inspectionData.details.items || {})[currentStep] || {};
  const maxSteps = Math.ceil(inspectionData.details.cantidad_recepcionar || 1);

  // Lógica de validación de medidas técnicas
  const getMeasurementStatus = (value, allowed) => {
    if (value === undefined || value === '' || allowed === undefined) return { text: '', color: 'transparent' };
    const val = Number(value);
    const target = Number(allowed);
    
    if (val === target) return { text: 'Aceptado', color: '#10b981' }; 
    
    const diff = Math.abs(val - target);
    if (diff <= 0.2) return { text: 'Observación', color: '#fbbf24' };
    
    return { text: 'Rechazado', color: '#ef4444' };
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleInsumoChange = (index, e) => {
    const { name, value } = e.target;
    const newInsumos = [...formData.insumos];
    newInsumos[index] = { ...newInsumos[index], [name]: value };
    setFormData(prev => ({ ...prev, insumos: newInsumos }));
  };

  const addInsumo = () => {
    setFormData(prev => ({
      ...prev,
      insumos: [...prev.insumos, { tipo: '', codigo_interno: '', oem: '', cantidad: 1 }]
    }));
  };

  const removeInsumo = (index) => {
    const newInsumos = formData.insumos.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, insumos: newInsumos }));
  };

  const handleInspectionChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === 'invoiceId') {
      setInspectionData({ invoiceId: value, insumoIndex: '', details: {} });
    } else if (name === 'insumoIndex') {
      const inv = mockInvoices.find(i => i.id === inspectionData.invoiceId);
      const ins = inv?.insumos[value];

      // Lógica de Cálculo: Valor fijo del 8% de la factura para inspección obligatoria.
      const calculatedQty = ins ? Number((ins.cantidad * 0.08).toFixed(2)) : 0;

      setInspectionData(prev => ({ 
        ...prev, 
        insumoIndex: value, 
        details: { 
          cantidad_recepcionar: calculatedQty, 
          currentStep: 1,
          items: {
            1: { numero_recepcion: inv?.numero_recepcion || '' }
          }
        } 
      }));
    } else {
      const step = inspectionData.details.currentStep || 1;
      const isPerItemField = ['numero_recepcion', 'diametro_externo', 'diametro_interno', 'altura'].includes(name);

      if (isPerItemField) {
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
    const item = (inspectionData.details.items || {})[step] || {};

    if (!item.diametro_externo || !item.diametro_interno || !item.altura) {
      alert("Por favor, complete todos los campos técnicos de este ítem antes de continuar.");
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
      // Simulación de envío al backend
      console.log("Datos de factura a registrar:", formData);
      alert("Factura registrada con éxito (Simulación).");
      
      // Limpiar formulario
      setFormData({
        numero_factura: '', fecha_factura: '', odoo: '',
        numero_expediente: '', numero_recepcion: '', fecha_recepcion: '', proveedor_id: '',
        insumos: [{ tipo: '', codigo_interno: '', oem: '', cantidad: 1 }]
      });
    } catch (error) {
      alert("Error al registrar la factura.");
    } finally {
      setLoading(false);
    }
  };

  const handleInspectionSubmit = (e) => {
    e.preventDefault();

    if (selectedInsumo?.tipo === 'Empaque') {
      const item = (inspectionData.details.items || {})[currentStep] || {};
      if (!item.diametro_externo || !item.diametro_interno || !item.altura) {
        alert("Debe completar los datos del ítem actual antes de finalizar la inspección.");
        return;
      }
    }

    console.log("Resultado de la inspección:", inspectionData);
    alert("Inspección guardada correctamente.");
    setInspectionData({ invoiceId: '', insumoIndex: '', details: {} });
  };

  return (
    <div className="dashboard-content-body">
      {/* Contenido condicional según la acción seleccionada */}
      {activeAction === 'add_factura' && (
        <div className="form-container">
          <h2 className="form-title">Registrar Nueva Factura</h2>
          <form className="admin-form" onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="form-field">
                <label>Número de Factura</label>
                <input type="text" name="numero_factura" value={formData.numero_factura} onChange={handleChange} placeholder="Ej: FAC-0001" required />
              </div>
              <div className="form-field">
                <label>Fecha de Factura</label>
                <input type="date" name="fecha_factura" value={formData.fecha_factura} onChange={handleChange} required />
              </div>
              <div className="form-field">
                <label>Código Odoo</label>
                <input type="text" name="odoo" value={formData.odoo} onChange={handleChange} placeholder="Código de texto" required />
              </div>
              <div className="form-field">
                <label>Número de Expediente</label>
                <input type="text" name="numero_expediente" value={formData.numero_expediente} onChange={handleChange} placeholder="Código de expediente" required />
              </div>
              <div className="form-field">
                <label>Número de Recepción</label>
                <input type="text" name="numero_recepcion" value={formData.numero_recepcion} onChange={handleChange} placeholder="Código de recepción" required />
              </div>
              <div className="form-field">
                <label>Fecha de Recepción</label>
                <input type="date" name="fecha_recepcion" value={formData.fecha_recepcion} onChange={handleChange} required />
              </div>
              <div className="form-field">
                <label>Proveedor</label>
                <select name="proveedor_id" value={formData.proveedor_id} onChange={handleChange} required>
                  <option value="" disabled>Seleccione un proveedor</option>
                  <option value="1">Suministros Industriales C.A.</option>
                  <option value="2">Distribuidora de Metales S.A.</option>
                  <option value="3">Tecnología de Empaques Global</option>
                </select>
              </div>
            </div>

            <hr style={{ margin: '2rem 0', border: '0', borderTop: '1px solid #e2e8f0' }} />
            
            <div className="insumos-section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#334155' }}>Detalle de Insumos</h3>
                <button type="button" className="btn btn-secondary" onClick={addInsumo} style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem' }}>
                  + Añadir Insumo
                </button>
              </div>

              <div className="table-container-card">
                <table className="industrial-table">
                  <thead>
                    <tr>
                      <th style={{ width: '25%' }}>Tipo de Insumo</th>
                      <th>Código Interno</th>
                      <th>Número OEM</th>
                      <th>Cantidad</th>
                      <th className="text-center">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.insumos.map((insumo, index) => (
                      <tr key={index}>
                        <td>
                          <select name="tipo" className="field-input" value={insumo.tipo} onChange={(e) => handleInsumoChange(index, e)} required>
                            <option value="" disabled>Seleccione...</option>
                            <option value="Materia Prima">Materia Prima</option>
                            <option value="Componente">Componente</option>
                            <option value="Empaque">Empaque</option>
                            <option value="Químico">Químico</option>
                          </select>
                        </td>
                        <td>
                          <input type="text" name="codigo_interno" className="field-input" list="internal-codes-list" value={insumo.codigo_interno} onChange={(e) => handleInsumoChange(index, e)} placeholder="Cód. Interno" required />
                        </td>
                        <td>
                          <input type="text" name="oem" className="field-input" value={insumo.oem} onChange={(e) => handleInsumoChange(index, e)} placeholder="Código OEM" required />
                        </td>
                        <td>
                          <input type="number" name="cantidad" className="field-input" value={insumo.cantidad} onChange={(e) => handleInsumoChange(index, e)} min="0.01" step="0.01" required style={{ width: '100px' }} />
                        </td>
                        <td className="text-center">
                          <button type="button" className="btn-icon-cancel" onClick={() => removeInsumo(index)} title="Eliminar fila" disabled={formData.insumos.length === 1}>🗑️</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Datalist para el autocompletado de códigos internos */}
              <datalist id="internal-codes-list">
                {mockInternalCodes.map(code => (
                  <option key={code} value={code} />
                ))}
              </datalist>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={loading}>
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
                <label>Seleccionar Factura</label>
                <select name="invoiceId" value={inspectionData.invoiceId} onChange={handleInspectionChange} required>
                  <option value="" disabled>Seleccione una factura...</option>
                  {mockInvoices.map(inv => (
                    <option key={inv.id} value={inv.id}>{inv.numero}</option>
                  ))}
                </select>
              </div>

              <div className="form-field">
                <label>Seleccionar Insumo</label>
                <select 
                  name="insumoIndex" 
                  value={inspectionData.insumoIndex} 
                  onChange={handleInspectionChange} 
                  disabled={!inspectionData.invoiceId}
                  required
                >
                  <option value="" disabled>Seleccione un insumo...</option>
                  {selectedInvoice?.insumos.map((ins, idx) => (
                    <option key={idx} value={idx}>{ins.oem} ({ins.tipo})</option>
                  ))}
                </select>
              </div>
            </div>

            {selectedInsumo && (
              <div style={{ marginTop: '2rem', padding: '1.5rem', border: '1px dashed #cbd5e1', borderRadius: '10px' }}>
                <h3 style={{ fontSize: '1rem', marginBottom: '1.5rem', color: '#475569' }}>
                  Medidas a evaluar para: <span style={{ color: 'var(--role-color)' }}>{selectedInsumo.tipo}</span>
                </h3>

                <div className="form-grid">
                  {selectedInsumo.tipo === 'Químico' && (
                    <>
                      <div className="form-field" style={{ flexDirection: 'row', alignItems: 'center', gap: '1rem' }}>
                        <input type="checkbox" name="presentacion" checked={inspectionData.details.presentacion || false} onChange={handleInspectionChange} style={{ width: '20px', height: '20px' }} />
                        <label style={{ margin: 0 }}>¿Presentación Correcta?</label>
                      </div>
                      <div className="form-field">
                        <label>Fecha de Prueba</label>
                        <input type="date" name="fecha_prueba" value={inspectionData.details.fecha_prueba || ''} onChange={handleInspectionChange} />
                      </div>
                      {inspectionData.details.fecha_prueba && (
                        <div className="form-field" style={{ flexDirection: 'row', alignItems: 'center', gap: '1rem' }}>
                          <input type="checkbox" name="resultado_prueba" checked={inspectionData.details.resultado_prueba || false} onChange={handleInspectionChange} style={{ width: '20px', height: '20px' }} />
                          <label style={{ margin: 0 }}>¿Resultado de Prueba Aprobado?</label>
                        </div>
                      )}
                    </>
                  )}

                  {selectedInsumo.tipo === 'Empaque' && (
                    <>
                      {/* Fila de cabecera compacta con 2 columnas */}
                      <div className="form-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gridColumn: 'span 2', gap: '1rem' }}>
                        <div className="form-field">
                          <label>Cant. Factura</label>
                          <input type="number" value={selectedInsumo.cantidad} readOnly style={{ backgroundColor: '#f1f5f9', fontWeight: 'bold' }} />
                        </div>
                        <div className="form-field">
                          <label style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Cant. Inspeccionar</span>
                            <span style={{ color: 'var(--role-color)', fontSize: '0.75rem' }}>Item {currentStep} de {maxSteps}</span>
                          </label>
                          <input type="number" value={inspectionData.details.cantidad_recepcionar || ''} readOnly style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', textAlign: 'center', fontWeight: 'bold' }} />
                        </div>
                      </div>

                      {/* Línea divisoria entre datos de recepción y valores experimentales */}
                      <hr style={{ gridColumn: 'span 2', border: '0', borderTop: '1px solid #e2e8f0', margin: '0.5rem 0' }} />

                      {/* Encabezados de columnas para valores experimentales */}
                      <div style={{ gridColumn: 'span 2', display: 'flex', gap: '1rem', paddingBottom: '0.2rem' }}>
                        <span style={{ minWidth: '100px', fontSize: '0.7rem', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase' }}>Referencia</span>
                        <span style={{ flex: 1, fontSize: '0.7rem', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', textAlign: 'center' }}>Medida</span>
                        <span style={{ minWidth: '100px', fontSize: '0.7rem', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', textAlign: 'right' }}>Veredicto</span>
                      </div>

                      <div className="form-field" style={{ gridColumn: 'span 2' }}>
                        <label>Diámetro Externo (mm)</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <span style={{ fontSize: '0.75rem', color: '#64748b', minWidth: '100px', fontWeight: 'bold' }}>Permitido: {selectedInsumo.tolerancias?.diametro_externo.toFixed(2)}</span>
                          <input type="number" name="diametro_externo" step="0.01" value={currentItem.diametro_externo || ''} onChange={handleInspectionChange} placeholder="0.00" required style={{ flex: 1 }} />
                          {(() => {
                            const status = getMeasurementStatus(currentItem.diametro_externo, selectedInsumo.tolerancias?.diametro_externo);
                            return <span style={{ fontWeight: 'bold', color: status.color, minWidth: '100px', textAlign: 'right', fontSize: '0.85rem' }}>{status.text}</span>;
                          })()}
                        </div>
                      </div>
                      <div className="form-field" style={{ gridColumn: 'span 2' }}>
                        <label>Diámetro Interno (mm)</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <span style={{ fontSize: '0.75rem', color: '#64748b', minWidth: '100px', fontWeight: 'bold' }}>Permitido: {selectedInsumo.tolerancias?.diametro_interno.toFixed(2)}</span>
                          <input type="number" name="diametro_interno" step="0.01" value={currentItem.diametro_interno || ''} onChange={handleInspectionChange} placeholder="0.00" required style={{ flex: 1 }} />
                          {(() => {
                            const status = getMeasurementStatus(currentItem.diametro_interno, selectedInsumo.tolerancias?.diametro_interno);
                            return <span style={{ fontWeight: 'bold', color: status.color, minWidth: '100px', textAlign: 'right', fontSize: '0.85rem' }}>{status.text}</span>;
                          })()}
                        </div>
                      </div>
                      <div className="form-field" style={{ gridColumn: 'span 2' }}>
                        <label>Altura (mm)</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <span style={{ fontSize: '0.75rem', color: '#64748b', minWidth: '100px', fontWeight: 'bold' }}>Permitido: {selectedInsumo.tolerancias?.altura.toFixed(2)}</span>
                          <input type="number" name="altura" step="0.01" value={currentItem.altura || ''} onChange={handleInspectionChange} placeholder="0.00" required style={{ flex: 1 }} />
                          {(() => {
                            const status = getMeasurementStatus(currentItem.altura, selectedInsumo.tolerancias?.altura);
                            return <span style={{ fontWeight: 'bold', color: status.color, minWidth: '100px', textAlign: 'right', fontSize: '0.85rem' }}>{status.text}</span>;
                          })()}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            <div className="form-actions">
              {selectedInsumo?.tipo === 'Empaque' ? (
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button type="button" className="btn btn-secondary" onClick={handlePrevStep} disabled={currentStep <= 1}>
                    Atrás
                  </button>
                  {currentStep < maxSteps ? (
                    <button type="button" className="btn btn-primary" onClick={handleNextStep}>Siguiente</button>
                  ) : (
                    <button type="submit" className="btn btn-primary">Guardar Inspección</button>
                  )}
                </div>
              ) : (
                <button type="submit" className="btn btn-primary" disabled={!selectedInsumo}>
                  Guardar Inspección
                </button>
              )}
            </div>
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