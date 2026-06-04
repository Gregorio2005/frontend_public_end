import React, { useState } from 'react';

const JefeIngenieriaDashboardContent = ({ activeAction }) => {
  const [formData, setFormData] = useState({
    tipo: '',
    referencia: '',
    diametro_interno: '',
    diametro_externo: '',
    altura: '',
    presentacion: ''
  });

  const [loading, setLoading] = useState(false);

  // Estados para la gestión de insumos existentes (simulado)
  const [insumosList, setInsumosList] = useState([
    { id: 1, tipo: 'Empaque', referencia: 'EMP-001', diametro_interno: '5.5', diametro_externo: '10.2', altura: '15.0' },
    { id: 2, tipo: 'Químico', referencia: 'QUI-099', presentacion: 'Tambor 200L' }
  ]);
  const [selectedInsumoId, setSelectedInsumoId] = useState('');
  const [editFormData, setEditFormData] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectInsumo = (e) => {
    const id = e.target.value;
    setSelectedInsumoId(id);
    const insumo = insumosList.find(i => i.id.toString() === id);
    setEditFormData(insumo ? { ...insumo } : null);
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    // Simulación de actualización
    setInsumosList(prev => prev.map(ins => 
      ins.id.toString() === selectedInsumoId ? { ...editFormData } : ins
    ));
    alert("Insumo actualizado con éxito (Simulación).");
    setEditFormData(null);
    setSelectedInsumoId('');
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Simulación de envío al backend
      console.log("Datos del insumo a registrar:", formData);
      alert("Insumo registrado con éxito (Simulación).");
      
      // Limpiar formulario
      setFormData({
        tipo: '', referencia: '', diametro_interno: '',
        diametro_externo: '', altura: '', presentacion: ''
      });
    } catch (error) {
      alert("Error al registrar el insumo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard-content-body">
      {/* Contenido condicional según la acción seleccionada */}
      {activeAction === 'add_insumo' && (
        <div className="form-container">
          <h2 className="form-title">Registrar Nuevo Insumo</h2>
          <form className="admin-form" onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="form-field">
                <label>Tipo de Insumo</label>
                <select name="tipo" value={formData.tipo} onChange={handleChange} required>
                  <option value="" disabled>Seleccione un tipo...</option>
                  <option value="Empaque">Empaque</option>
                  <option value="Químico">Químico</option>
                </select>
              </div>

              {formData.tipo === 'Empaque' && (
                <>
                  <div className="form-field">
                    <label>Referencia</label>
                    <input type="text" name="referencia" value={formData.referencia} onChange={handleChange} placeholder="Ej: REF-BOX-01" required />
                  </div>
                  <div className="form-field">
                    <label>Diámetro Interno (mm)</label>
                    <input type="number" name="diametro_interno" step="0.01" value={formData.diametro_interno} onChange={handleChange} placeholder="0.00" required />
                  </div>
                  <div className="form-field">
                    <label>Diámetro Externo (mm)</label>
                    <input type="number" name="diametro_externo" step="0.01" value={formData.diametro_externo} onChange={handleChange} placeholder="0.00" required />
                  </div>
                  <div className="form-field">
                    <label>Altura (mm)</label>
                    <input type="number" name="altura" step="0.01" value={formData.altura} onChange={handleChange} placeholder="0.00" required />
                  </div>
                </>
              )}

              {formData.tipo === 'Químico' && (
                <>
                  <div className="form-field">
                    <label>Referencia</label>
                    <input type="text" name="referencia" value={formData.referencia} onChange={handleChange} placeholder="Ej: REF-CHEM-01" required />
                  </div>
                  <div className="form-field">
                    <label>Presentación</label>
                    <input type="text" name="presentacion" value={formData.presentacion} onChange={handleChange} placeholder="Ej: Galón, Litro, Saco" required />
                  </div>
                </>
              )}
            </div>

            {formData.tipo && (
              <div className="form-actions">
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Guardando...' : 'Guardar Insumo'}
                </button>
              </div>
            )}
          </form>
        </div>
      )}

      {activeAction === 'edit_insumo' && (
        <div className="form-container">
          <h2 className="form-title">Modificar Insumo Existente</h2>
          
          <div className="form-field" style={{ marginBottom: '2rem' }}>
            <label>Seleccionar Referencia</label>
            <select value={selectedInsumoId} onChange={handleSelectInsumo}>
              <option value="" disabled>Elija un insumo para editar...</option>
              {insumosList.map(ins => (
                <option key={ins.id} value={ins.id}>{ins.referencia} ({ins.tipo})</option>
              ))}
            </select>
          </div>

          {editFormData && (
            <form className="admin-form" onSubmit={handleEditSubmit}>
              <div className="form-grid">
                <div className="form-field">
                  <label>Tipo de Insumo (No editable)</label>
                  <input type="text" value={editFormData.tipo} readOnly style={{ backgroundColor: '#f1f5f9', cursor: 'not-allowed' }} />
                </div>

                {editFormData.tipo === 'Empaque' && (
                  <>
                    <div className="form-field">
                      <label>Referencia</label>
                      <input type="text" name="referencia" value={editFormData.referencia} onChange={handleEditChange} required />
                    </div>
                    <div className="form-field">
                      <label>Diámetro Interno (mm)</label>
                      <input type="number" name="diametro_interno" step="0.01" value={editFormData.diametro_interno} onChange={handleEditChange} required />
                    </div>
                    <div className="form-field">
                      <label>Diámetro Externo (mm)</label>
                      <input type="number" name="diametro_externo" step="0.01" value={editFormData.diametro_externo} onChange={handleEditChange} required />
                    </div>
                    <div className="form-field">
                      <label>Altura (mm)</label>
                      <input type="number" name="altura" step="0.01" value={editFormData.altura} onChange={handleEditChange} required />
                    </div>
                  </>
                )}

                {editFormData.tipo === 'Químico' && (
                  <>
                    <div className="form-field">
                      <label>Referencia</label>
                      <input type="text" name="referencia" value={editFormData.referencia} onChange={handleEditChange} required />
                    </div>
                    <div className="form-field">
                      <label>Presentación</label>
                      <input type="text" name="presentacion" value={editFormData.presentacion} onChange={handleEditChange} required />
                    </div>
                  </>
                )}
              </div>

              <div className="form-actions">
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Guardando...' : 'Actualizar Insumo'}
                </button>
              </div>
            </form>
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