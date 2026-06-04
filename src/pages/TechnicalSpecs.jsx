import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import logoImg from '../assets/logo.jpeg';
import './TechnicalSpecs.css';

const TechnicalSpecs = () => {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'Sealing Products C.A.';
    const link = document.querySelector("link[rel~='icon']") || document.createElement('link');
    link.rel = 'icon';
    link.href = logoImg;
    document.getElementsByTagName('head')[0].appendChild(link);
  }, []);

  return (
    <div className="specs-page">
      <header className="specs-header">
        <button className="back-btn" onClick={() => window.location.href = 'http://localhost:5174'}>
          <span className="material-symbols-outlined">arrow_back</span>
          Regresar al Inicio
        </button>
        <h1 className="specs-main-title">Especificaciones Técnicas de Ingeniería</h1>
      </header>

      <main className="specs-content">
        {/* Sección ISO */}
        <section className="specs-section">
          <div className="section-icon-header">
            <span className="material-symbols-outlined">verified</span>
            <h2>Certificaciones de Calidad</h2>
          </div>
          <div className="cert-card">
            <h3>Norma ISO 9001:2015</h3>
            <p>Nuestro Sistema de Gestión de Calidad (SGC) cumple rigurosamente con los estándares internacionales para la fabricación de sellos mecánicos y empaquetaduras.</p>
            <ul className="specs-list">
              <li><strong>Control de Procesos:</strong> Monitoreo digital en cada fase de inyección y troquelado.</li>
              <li><strong>Trazabilidad:</strong> Seguimiento total desde el lote de materia prima hasta el despacho.</li>
              <li><strong>Auditores Internos:</strong> Verificación quincenal de estándares de precisión.</li>
            </ul>
          </div>
        </section>

        {/* Sección de Materiales */}
        <section className="specs-section">
          <div className="section-icon-header">
            <span className="material-symbols-outlined">science</span>
            <h2>Compuestos y Materiales</h2>
          </div>
          <div className="specs-grid">
            <div className="spec-item">
              <h4>Nitrilo No Asbestico (NBR)</h4>
              <p>Resistente a hidrocarburos y grasas. Temperatura operativa: -30°C a +120°C. Dureza Shore A: 70-90.</p>
            </div>
            <div className="spec-item">
              <h4>Vitón (FKM)</h4>
              <p>Alta resistencia química y térmica superior. Ideal para ácidos y químicos agresivos. Hasta 200°C.</p>
            </div>
            <div className="spec-item">
              <h4>Silicona (VMQ)</h4>
              <p>Excelente flexibilidad a bajas temperaturas y resistencia al ozono. Grado alimenticio disponible.</p>
            </div>
          </div>
        </section>

        {/* Tabla de Tolerancias */}
        <section className="specs-section">
          <div className="section-icon-header">
            <span className="material-symbols-outlined">precision_manufacturing</span>
            <h2>Estándares de Precisión</h2>
          </div>
          <div className="table-container">
            <table className="specs-table">
              <thead>
                <tr>
                  <th>Dimensión</th>
                  <th>Tolerancia Permitida</th>
                  <th>Referencia Normativa</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>Diámetros Internos</td><td>± 0.05 mm</td><td>DIN 3771 / ISO 3601</td></tr>
                <tr><td>Espesores / Alturas</td><td>± 0.03 mm</td><td>RMA Class A Precision</td></tr>
                <tr><td>Acabado Superficial</td><td>Ra 0.8 μm</td><td>Estándar OEM Industrial</td></tr>
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
};

export default TechnicalSpecs;