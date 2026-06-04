import React, { useState } from 'react';

const JefeCalidadDashboardContent = ({ activeAction }) => {
  const [formData, setFormData] = useState({
    nombre: ''
  });

  const [loading, setLoading] = useState(false);

  // Estados para la gestión de proveedores existentes (simulado)
  const [providers, setProviders] = useState([
    { id: 1, nombre: 'Suministros Industriales C.A.' },
    { id: 2, nombre: 'Distribuidora de Metales S.A.' },
    { id: 3, nombre: 'Tecnología de Empaques Global' }
  ]);
  const [editingProviderId, setEditingProviderId] = useState(null);
  const [editedProviderName, setEditedProviderName] = useState('');

  // Estados para los gráficos
  const [chartFilters, setChartFilters] = useState({
    proveedorId: '',
    insumo: '',
    fechaInicio: '',
    fechaFin: ''
  });
  const [showChart, setShowChart] = useState(false);
  const [chartData, setChartData] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleEditClick = (provider) => {
    setEditingProviderId(provider.id);
    setEditedProviderName(provider.nombre);
  };

  const handleCancelEdit = () => {
    setEditingProviderId(null);
    setEditedProviderName('');
  };

  const handleSaveEdit = () => {
    if (!editedProviderName.trim()) {
      alert("El nombre no puede estar vacío");
      return;
    }
    setProviders(prev => prev.map(p => 
      p.id === editingProviderId ? { ...p, nombre: editedProviderName } : p
    ));
    alert("Cambio verificado y guardado con éxito.");
    handleCancelEdit();
  };

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Simulación de envío al backend
      console.log("Datos del proveedor a registrar:", formData);
      alert("Proveedor registrado con éxito (Simulación).");
      
      // Limpiar formulario
      setFormData({ nombre: '' });
    } catch (error) {
      alert("Error al registrar el proveedor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard-content-body">
      {/* Contenido condicional según la acción seleccionada */}
      {activeAction === 'add_proveedor' && (
        <div className="form-container">
          <h2 className="form-title">Registrar Nuevo Proveedor</h2>
          <form className="admin-form" onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="form-field">
                <label>Nombre del Proveedor</label>
                <input 
                  type="text" 
                  name="nombre" 
                  value={formData.nombre} 
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
      )}

      {activeAction === 'edit_proveedor' && (
        <div className="form-container">
          <h2 className="form-title">Modificar Proveedores</h2>
          <div className="table-container-card">
            <div className="table-filters">
              <div className="table-search-wrapper">
                <span className="material-symbols-outlined">search</span>
                <input type="text" className="table-search-input" placeholder="Buscar proveedor..." />
              </div>
            </div>
            <table className="industrial-table">
              <thead>
                <tr>
                  <th style={{ width: '70%' }}>Nombre del Proveedor</th>
                  <th>ID Sistema</th>
                  <th style={{ textAlign: 'center' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {providers.map((p) => {
                  const isEditing = editingProviderId === p.id;
                  return (
                    <tr key={p.id}>
                      <td style={{ fontWeight: '600' }}>
                        {isEditing ? (
                          <input 
                            type="text" 
                            className="field-input" 
                            value={editedProviderName} 
                            onChange={(e) => setEditedProviderName(e.target.value)}
                            autoFocus
                          />
                        ) : (
                          p.nombre
                        )}
                      </td>
                      <td style={{ color: 'var(--secondary)', fontSize: '0.8rem' }}>#PROV-00{p.id}</td>
                      <td style={{ textAlign: 'center' }}>
                        {isEditing ? (
                          <>
                            <button className="btn-icon-save" title="Verificar cambio" onClick={handleSaveEdit}>✅</button>
                            <button className="btn-icon-cancel" title="Negar cambio" onClick={handleCancelEdit}>❌</button>
                          </>
                        ) : (
                          <button className="btn-icon-edit" style={{ fontSize: '1.2rem', cursor: 'pointer', background: 'none', border: 'none' }} title="Modificar" onClick={() => handleEditClick(p)}>✏️</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeAction === 'charts' && (
        <div className="form-container">
          <h2 className="form-title">Estadísticas de Calidad</h2>
          <form className="admin-form" onSubmit={handleGenerateChart}>
            <div className="form-grid">
              <div className="form-field">
                <label>Proveedor</label>
                <select name="proveedorId" value={chartFilters.proveedorId} onChange={handleChartFilterChange} required>
                  <option value="" disabled>Seleccione un proveedor</option>
                  {providers.map(p => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                  ))}
                </select>
              </div>
              <div className="form-field">
                <label>Tipo de Insumo</label>
                <select name="insumo" value={chartFilters.insumo} onChange={handleChartFilterChange} required>
                  <option value="" disabled>Seleccione tipo...</option>
                  <option value="Materia Prima">Materia Prima</option>
                  <option value="Componente">Componente</option>
                  <option value="Empaque">Empaque</option>
                  <option value="Químico">Químico</option>
                </select>
              </div>
              <div className="form-field">
                <label>Fecha Inicio</label>
                <input type="date" name="fechaInicio" value={chartFilters.fechaInicio} onChange={handleChartFilterChange} required />
              </div>
              <div className="form-field">
                <label>Fecha Fin</label>
                <input type="date" name="fechaFin" value={chartFilters.fechaFin} onChange={handleChartFilterChange} required />
              </div>
            </div>
            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Procesando...' : 'Generar Gráfico'}
              </button>
            </div>
          </form>

          {showChart && chartData && (
            <div style={{ marginTop: '3rem', padding: '2rem', background: '#f8fafc', borderRadius: '15px', border: '1px solid #e2e8f0' }}>
              <h3 style={{ textAlign: 'center', marginBottom: '2rem', color: '#1e293b' }}>
                Tasa de Aprobación vs Rechazo
              </h3>
              
              <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'flex-end', height: '200px', gap: '2rem', paddingBottom: '1rem', borderBottom: '2px solid #cbd5e1' }}>
                {/* Barra Aprobados */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                  <div style={{ 
                    width: '60px', 
                    height: `${(chartData.aprobados / (chartData.aprobados + chartData.rechazados)) * 180}px`, 
                    backgroundColor: '#10b981', 
                    borderRadius: '5px 5px 0 0',
                    transition: 'height 0.5s ease-out'
                  }}></div>
                  <span style={{ marginTop: '0.5rem', fontWeight: 'bold', color: '#065f46' }}>Aprobados</span>
                  <span style={{ fontSize: '1.2rem', fontWeight: '700' }}>{chartData.aprobados}</span>
                </div>

                {/* Barra Rechazados */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                  <div style={{ 
                    width: '60px', 
                    height: `${(chartData.rechazados / (chartData.aprobados + chartData.rechazados)) * 180}px`, 
                    backgroundColor: '#ef4444', 
                    borderRadius: '5px 5px 0 0',
                    transition: 'height 0.5s ease-out'
                  }}></div>
                  <span style={{ marginTop: '0.5rem', fontWeight: 'bold', color: '#991b1b' }}>Rechazados</span>
                  <span style={{ fontSize: '1.2rem', fontWeight: '700' }}>{chartData.rechazados}</span>
                </div>
              </div>

              <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.9rem', color: '#64748b' }}>
                <p style={{ margin: '5px 0' }}>Gráfico generado para <strong>{chartFilters.insumo}</strong></p>
                <p style={{ margin: '5px 0' }}>Proveedor: <strong>{providers.find(p => p.id === parseInt(chartFilters.proveedorId))?.nombre}</strong></p>
                <p style={{ margin: '5px 0', fontStyle: 'italic' }}>Lapso: {chartFilters.fechaInicio} — {chartFilters.fechaFin}</p>
              </div>
            </div>
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