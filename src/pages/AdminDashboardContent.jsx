import React, { useState, useEffect } from 'react';
import { registerUser, getUsers, updateUser, getApplicants, updateApplicant, getCvUrl, discardApplicant, hireApplicant, updateWebsiteNotice, getWebsiteNotice, getNoticesList, getNoticeById, publishNotice, getBills, getBillInputsByBillId, getInspectionResults, getPendingPhotos, approveProfilePhoto, rejectProfilePhoto } from '../services/authService'; 
import ConfirmModal from '../components/ConfirmModal';
import Avatar from '../components/Avatar';
 
const AdminDashboardContent = ({ activeAction, refreshKey, refreshNotifications }) => {
  // Estado inicial siguiendo el orden de la base de datos
  const [formData, setFormData] = useState({
    user: '',
    password: '',
    name: '',
    lastname: '',
    ci_type: 'V-',
    ci_number: '',
    email: '',
    roles_id: '1', // Por defecto Administrador
    status: 'Activo' // Ahora con mayúscula inicial según el backend
  });

  const [loading, setLoading] = useState(false);

  // Estado para notificaciones personalizadas (Reemplaza a window.alert)
  const [notification, setNotification] = useState({ message: '', type: 'success', visible: false });

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type, visible: true });
    setTimeout(() => {
      setNotification(prev => ({ ...prev, visible: false }));
    }, 4000);
  };

  // Mapeos y Helpers para Visualización de Inspecciones
  const idToSpanishType = {
    1: 'Estoperas', 2: 'Sellos', 3: 'O-Rings', 4: 'Químicos', 5: 'Bolsas',
    6: 'Cartón', 7: 'Estuches', 8: 'Termoplásticos', 9: 'Empaquetaduras', 10: 'Collares'
  };

  const measurementTypes = ['Estoperas', 'Sellos', 'O-Rings', 'Químicos', 'Bolsas', 'Cartón', 'Estuches', 'Termoplásticos', 'Empaquetaduras', 'Collares'];

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

  const getMeasurementStatus = (value, allowed, key) => {
    // Si es un campo de fecha, no aplica evaluación de estado (Aprobado/Rechazado)
    if (key.includes('date')) return { text: '', color: 'transparent' };

    // Caso para campos booleanos (Químicos, Termoplásticos, etc.)
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

  // Estados para la Visualización de Inspecciones
  const [inspectionInvoices, setInspectionInvoices] = useState([]);
  const [selectedInvoiceItems, setSelectedInvoiceItems] = useState([]);
  const [inspectionHistory, setInspectionHistory] = useState([]);
  const [inspectionView, setInspectionView] = useState({
    invoiceId: '',
    insumoIndex: '',
    currentStep: 1,
    tipo: ''
  });

  // Estado para los avisos
  const [websiteNotice, setWebsiteNotice] = useState({ id: null, name: '', note: '', enabled: false }); // Inicializamos con valores vacíos, incluyendo id
  const [noticesList, setNoticesList] = useState([]); // Lista para la tabla
  const [noticeSearchTerm, setNoticeSearchTerm] = useState(''); // Buscador de avisos
  const [processingId, setProcessingId] = useState(null); // Para saber qué fila se está cargando

  // Función para cargar la lista de mensajes registrados
  const loadNotices = async () => {
    try {
      const data = await getNoticesList();
      setNoticesList(data);
    } catch (error) {
      console.error("Error al cargar avisos:", error);
    }
  };

  useEffect(() => {
    if (activeAction === 'applicants') {
      loadNotices();
      // Cargamos el aviso actual para mostrarlo en el formulario
      getWebsiteNotice().then(currentNotice => {
        if (currentNotice && currentNotice.id) {
          setWebsiteNotice({ ...currentNotice });
        }
      });
      
    }

    if (activeAction === 'view_inspections') {
      setLoading(true);
      getBills().then(setInspectionInvoices).catch(console.error).finally(() => setLoading(false));
    }
  }, [activeAction]); // Depende de activeAction para recargar al entrar a la sección

  // Handler para cambios en los inputs del aviso del sitio web
  const handleWebsiteNoticeChange = (e) => {
    const { name, value } = e.target;
    setWebsiteNotice(prev => ({ ...prev, [name]: value }));
  };

  // Handler para publicar oficialmente un mensaje de la tabla
  const handleSelectNotice = async (notice) => {
    setConfirmModal({
      isOpen: true,
      title: 'Confirmar Publicación',
      message: `¿Desea establecer "${notice.name}" como el aviso activo del sitio web?`,
      onConfirm: async () => {
        setProcessingId(notice.id);
        try {
          await publishNotice(notice.id);
          const freshNotice = await getNoticeById(notice.id);
          setWebsiteNotice({ ...freshNotice, enabled: true });
          await loadNotices(); // Refrescar tabla para actualizar el botón resaltado
          showNotification("El aviso ha sido publicado correctamente.");
        } catch (error) {
          showNotification(`Error: ${error.message}`, "error");
        } finally {
          setProcessingId(null);
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  // Estados para la lista de usuarios
  const [users, setUsers] = useState([]);
  const [fetchingUsers, setFetchingUsers] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);
  const [editFormData, setEditFormData] = useState({});

  // Estado para el buscador
  const [searchTerm, setSearchTerm] = useState('');

  // Estados para la lista de postulantes
  const [applicants, setApplicants] = useState([]);
  const [fetchingApplicants, setFetchingApplicants] = useState(false);

  const refreshApplicants = async () => {
    try {
      const data = await getApplicants();
      setApplicants(data);
    } catch (error) {
      console.error("Error al recargar postulantes:", error);
    }
  };

  // Estado para el modal de detalle de postulante
  const [selectedApplicant, setSelectedApplicant] = useState(null);
  const [cvModalUrl, setCvModalUrl] = useState(null);
  const [editApplicantData, setEditApplicantData] = useState({
    interview_formal_date: '',
    interview_formal_result: '',
    interview_medical_date: '',
    interview_medical_result: '',
  });

  // Estado interno para alternar entre la lista de usuarios y el registro
  const [subView, setSubView] = useState('list'); // 'list', 'add' o 'photos'
  const [pendingPhotos, setPendingPhotos] = useState([]);
  const [previewImage, setPreviewImage] = useState(null);

  // Estado para tabs de Página Web (Comunicado web / Postulantes)
  const [websiteTab, setWebsiteTab] = useState('notices');

  // Estado para el Modal de Confirmación
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const refreshPendingPhotos = async () => {
    try {
      const data = await getPendingPhotos();
      setPendingPhotos(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error al cargar fotos pendientes:", error);
    }
  };

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

    // Cargar fotos pendientes de aprobación
    if (activeAction === 'users' && subView === 'photos') {
      refreshPendingPhotos();
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

  const handleInspectionViewChange = async (e) => {
    const { name, value } = e.target;
    if (name === 'invoiceId') {
      setLoading(true);
      try {
        const items = await getBillInputsByBillId(value);
        // Organizamos los insumos por tipo y referencia tal cual como en trabajador
        const sortedItems = items.sort((a, b) => {
          if (a.type_inputs_id !== b.type_inputs_id) return a.type_inputs_id - b.type_inputs_id;
          return (a.reference || '').localeCompare(b.reference || '');
        });
        setSelectedInvoiceItems(sortedItems);
        setInspectionView({ invoiceId: value, insumoIndex: '', currentStep: 1, tipo: '' });
        setInspectionHistory([]);
      } catch (err) { showNotification("Error al cargar insumos", "error"); }
      finally { setLoading(false); }
    } else if (name === 'insumoIndex') {
      const ins = selectedInvoiceItems[value];
      setLoading(true);
      try {
        const results = await getInspectionResults(ins.type_inputs_id, ins.id);
        setInspectionHistory(results);
        setInspectionView(prev => ({ 
          ...prev, 
          insumoIndex: value, 
          currentStep: 1,
          tipo: idToSpanishType[ins.type_inputs_id] || 'Desconocido'
        }));
      } catch (err) { showNotification("Error al cargar inspecciones", "error"); }
      finally { setLoading(false); }
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    // Validación estricta para el número de cédula: solo números
    if (name === 'ci_number') {
      const numericValue = value.replace(/\D/g, '');
      setFormData(prev => ({ ...prev, [name]: numericValue }));
    } else {
    setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Conversión de tipos para asegurar compatibilidad estricta con la DB
      const dataToSend = {
        ...formData,
        ci: `${formData.ci_type}${formData.ci_number}`, // Combina prefijo y número
        roles_id: parseInt(formData.roles_id, 10),
        status: formData.status // Ya viene como 'Activo' o 'Inactivo'
      };

      await registerUser(dataToSend);
      showNotification("Usuario registrado con éxito en la base de datos.");
      
      // Limpiar formulario tras éxito
      setFormData({
        user: '', password: '', name: '', lastname: '',
        ci_type: 'V-', ci_number: '', email: '', roles_id: '1', status: 'Activo'
      });
    } catch (error) {
      showNotification(`Error: ${error.message}`, 'error');
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
      
      showNotification("Usuario actualizado exitosamente.");
      
      const data = await getUsers();
      const updatedList = Array.isArray(data) ? data : (data.data || []);
      setUsers(updatedList);
      handleCancelEdit();
    } catch (error) {
      // 4. Captura de errores de red o de respuesta del servidor (4xx, 5xx)
      console.error("Error capturado:", error);
      showNotification(`No se pudo completar la operación: ${error.message}`, 'error');
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

  // Abrir detalle de un postulante
  const handleOpenApplicantDetail = (applicant) => {
    setSelectedApplicant(applicant);
    const hasFormalDate = !!applicant.interview_formal_date;
    const hasMedicalDate = !!applicant.interview_medical_date;

    // Formatear datetime para input datetime-local (YYYY-MM-DDTHH:MM)
    const formatDatetime = (dateStr) => {
      if (!dateStr) return '';
      const d = new Date(dateStr);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    setEditApplicantData({
      interview_formal_date: formatDatetime(applicant.interview_formal_date),
      interview_formal_result: hasFormalDate ? (applicant.interview_formal_result || 'Pendiente') : '',
      interview_medical_date: formatDatetime(applicant.interview_medical_date),
      interview_medical_result: hasMedicalDate ? (applicant.interview_medical_result || 'Pendiente') : '',
    });
  };

  // Cerrar detalle de postulante
  const handleCloseApplicantDetail = () => {
    setSelectedApplicant(null);
    setEditApplicantData({
      interview_formal_date: '',
      interview_formal_result: '',
      interview_medical_date: '',
      interview_medical_result: '',
    });
  };

  // Guardar cambios del postulante (solo entrevistas, el status se deriva server-side)
  const handleSaveApplicant = async () => {
    // Validación: si el resultado formal es aprobado, debe tener fecha médica
    if (editApplicantData.interview_formal_result === 'Entrevista formal aprobada' && !editApplicantData.interview_medical_date) {
      showNotification('Debe asignar una fecha para la entrevista médica antes de aprobar la entrevista formal.', 'error');
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const payload = {
        interview_formal_date: editApplicantData.interview_formal_date || null,
        interview_formal_result: editApplicantData.interview_formal_result && editApplicantData.interview_formal_result !== 'Pendiente' ? editApplicantData.interview_formal_result : null,
        interview_medical_date: editApplicantData.interview_medical_date || null,
        interview_medical_result: editApplicantData.interview_medical_result && editApplicantData.interview_medical_result !== 'Pendiente' ? editApplicantData.interview_medical_result : null,
      };
      const result = await updateApplicant(selectedApplicant.id, payload);
      await refreshApplicants();
      refreshNotifications();
      showNotification('Postulante actualizado correctamente.');
      handleCloseApplicantDetail();
    } catch (error) {
      showNotification(`Error: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Descartar postulante
  const handleDiscardApplicant = async () => {
    setConfirmModal({
      isOpen: true,
      title: 'Confirmar Descarte',
      message: `¿Está seguro de descartar a ${selectedApplicant.name} ${selectedApplicant.lastname}? Esta acción no se puede deshacer.`,
      onConfirm: async () => {
        setLoading(true);
        try {
          await discardApplicant(selectedApplicant.id);
          const updated = { ...selectedApplicant, status: 'Descartado' };
          setSelectedApplicant(updated);
          await refreshApplicants();
          refreshNotifications();
          showNotification('Postulante descartado correctamente.');
        } catch (error) {
          showNotification(`Error: ${error.message}`, 'error');
        } finally {
          setLoading(false);
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  // Contratar postulante
  const handleHireApplicant = async () => {
    setConfirmModal({
      isOpen: true,
      title: 'Confirmar Contratación',
      message: `¿Está seguro de contratar a ${selectedApplicant.name} ${selectedApplicant.lastname}?`,
      onConfirm: async () => {
        setLoading(true);
        try {
          await hireApplicant(selectedApplicant.id);
          const updated = { ...selectedApplicant, status: 'Contratado' };
          setSelectedApplicant(updated);
          await refreshApplicants();
          refreshNotifications();
          showNotification('Postulante contratado correctamente.');
        } catch (error) {
          showNotification(`Error: ${error.message}`, 'error');
        } finally {
          setLoading(false);
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  // Abrir CV en modal
  const handleViewCv = (applicantId) => {
    const url = getCvUrl(applicantId);
    setCvModalUrl(url);
  };

  // Aprobar foto de perfil
  const handleApprovePhoto = async (userId) => {
    try {
      await approveProfilePhoto(userId);
      await refreshPendingPhotos();
      showNotification('Foto aprobada correctamente.');
      refreshNotifications();
    } catch (error) {
      showNotification(`Error: ${error.message}`, 'error');
    }
  };

  // Rechazar foto de perfil
  const handleRejectPhoto = async (userId) => {
    try {
      await rejectProfilePhoto(userId);
      await refreshPendingPhotos();
      showNotification('Foto rechazada y eliminada.');
      refreshNotifications();
    } catch (error) {
      showNotification(`Error: ${error.message}`, 'error');
    }
  };

  // Badge de color para el status
  const getStatusBadgeStyle = (status) => {
    const styles = {
      'Pendiente': { backgroundColor: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d' },
      'En revision': { backgroundColor: '#dbeafe', color: '#1e40af', border: '1px solid #93c5fd' },
      'Entrevista formal pendiente': { backgroundColor: '#e0e7ff', color: '#3730a3', border: '1px solid #a5b4fc' },
      'Entrevista formal aprobada': { backgroundColor: '#d1fae5', color: '#065f46', border: '1px solid #6ee7b7' },
      'Entrevista formal rechazada': { backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5' },
      'Entrevista medica pendiente': { backgroundColor: '#fce7f3', color: '#9d174d', border: '1px solid #f9a8d4' },
      'Entrevista medica aprobada': { backgroundColor: '#d1fae5', color: '#065f46', border: '1px solid #6ee7b7' },
      'Entrevista medica rechazada': { backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5' },
      'Contratado': { backgroundColor: '#d1fae5', color: '#065f46', border: '1px solid #34d399' },
      'Descartado': { backgroundColor: '#f3f4f6', color: '#374151', border: '1px solid #9ca3af' },
      'Aprobado': { backgroundColor: '#d1fae5', color: '#065f46', border: '1px solid #6ee7b7' },
      'Rechazado': { backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5' },
    };
    return styles[status] || { backgroundColor: '#f3f4f6', color: '#374151', border: '1px solid #9ca3af' };
  };

  // Lógica de filtrado para el buscador (Nombre y CI sin prefijos)
  const filteredUsers = users.filter(u => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;

    // Búsqueda por nombre o apellido ( Gregory, Fabian, etc )
    const fullName = `${u.name} ${u.lastname}`.toLowerCase();
    const nameMatch = fullName.includes(term);

    // Búsqueda por CI ( Permite buscar '123' y encontrar 'V-123' )
    const ciStr = String(u.ci || '').toLowerCase();
    const termDigits = term.replace(/\D/g, '');
    const ciDigits = ciStr.replace(/\D/g, '');
    const ciMatch = ciStr.includes(term) || (termDigits !== '' && ciDigits.includes(termDigits));

    return nameMatch || ciMatch;
  });

  // Lógica de filtrado para el buscador de avisos
  const filteredNotices = noticesList.filter(n => {
    const term = noticeSearchTerm.toLowerCase().trim();
    if (!term) return true;
    const nameMatch = (n.name || '').toLowerCase().includes(term);
    const noteMatch = (n.note || '').toLowerCase().includes(term);
    return nameMatch || noteMatch;
  });

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

      {/* Modal de Detalle de Postulante */}
      {selectedApplicant && (
        <div className="modal-overlay" onClick={handleCloseApplicantDetail}>
          <div className="modal-container" style={{ maxWidth: '600px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ backgroundColor: 'var(--primary)', color: 'white' }}>
              <span className="material-symbols-outlined">person</span>
              <h3>Detalle del Postulante</h3>
            </div>
            <div className="modal-body" style={{ padding: '1.5rem' }}>
              {/* Datos Personales */}
              <div style={{ marginBottom: '1.5rem' }}>
                <h4 style={{ margin: '0 0 0.75rem', color: 'var(--primary)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Datos Personales
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--secondary)', fontWeight: '600' }}>Nombre</label>
                    <p style={{ margin: 0, fontWeight: '600' }}>{selectedApplicant.name} {selectedApplicant.lastname}</p>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--secondary)', fontWeight: '600' }}>CI</label>
                    <p style={{ margin: 0, fontWeight: '600' }}>{selectedApplicant.ci}</p>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--secondary)', fontWeight: '600' }}>Email</label>
                    <p style={{ margin: 0 }}>{selectedApplicant.email}</p>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--secondary)', fontWeight: '600' }}>Teléfono</label>
                    <p style={{ margin: 0 }}>{selectedApplicant.phone || '—'}</p>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--secondary)', fontWeight: '600' }}>Fecha de Nacimiento</label>
                    <p style={{ margin: 0 }}>{selectedApplicant.birth_date ? new Date(selectedApplicant.birth_date).toLocaleDateString('es-VE') : '—'}</p>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--secondary)', fontWeight: '600' }}>Rol</label>
                    <p style={{ margin: 0 }}><span className="role-badge">{selectedApplicant.rol}</span></p>
                  </div>
                </div>
                {selectedApplicant.cv_url && (
                  <div style={{ marginTop: '0.75rem' }}>
                    <button
                      className="btn btn-secondary"
                      onClick={() => handleViewCv(selectedApplicant.id)}
                      style={{ fontSize: '0.85rem' }}
                    >
                      📄 Ver Currículum Vitae
                    </button>
                  </div>
                )}
              </div>

              {/* Estado y Entrevistas */}
              <div style={{ borderTop: '1px solid var(--outline-variant)', paddingTop: '1.5rem' }}>
                <h4 style={{ margin: '0 0 0.75rem', color: 'var(--primary)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Gestión del Proceso
                </h4>
                <div className="form-grid" style={{ gap: '0.75rem' }}>
                  {/* Lógica de bloqueo de campos - basada en el estado GUARDADO */}
                  {(() => {
                    const status = selectedApplicant?.status;
                    const isTerminal = ['Descartado', 'Contratado', 'Rechazado'].includes(status);

                    // Valores GUARDADOS (lo que ya está en la BD)
                    const savedFormalDate = selectedApplicant?.interview_formal_date;
                    const savedFormalResult = selectedApplicant?.interview_formal_result;
                    const savedMedicalDate = selectedApplicant?.interview_medical_date;
                    const savedMedicalResult = selectedApplicant?.interview_medical_result;

                    // Paso 1: No hay fecha formal → solo fecha formal editable
                    // Paso 2: Hay fecha formal pero no resultado → resultado formal + fecha médica editable
                    // Paso 3: Hay fecha médica pero no resultado médico → resultado médico editable
                    const isFormalDateEditable = !isTerminal && !savedFormalDate;
                    const isFormalResultEditable = !isTerminal && !!savedFormalDate && !savedFormalResult;
                    const isMedicalDateEditable = !isTerminal && !!savedFormalDate && !savedFormalResult;
                    const isMedicalResultEditable = !isTerminal && !!savedMedicalDate && !savedMedicalResult;

                    return (
                      <>
                        {/* Estado Actual (solo lectura) + botones de acción */}
                        <div style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                          <label style={{ fontSize: '0.8rem', fontWeight: '600' }}>Estado Actual:</label>
                          <span style={{
                            ...getStatusBadgeStyle(status),
                            padding: '6px 14px',
                            borderRadius: '16px',
                            fontSize: '0.85rem',
                            fontWeight: '700',
                          }}>
                            {status || 'Sin definir'}
                          </span>
                          {!isTerminal && (
                            <button
                              className="btn"
                              onClick={handleDiscardApplicant}
                              disabled={loading}
                              style={{
                                backgroundColor: '#fee2e2',
                                color: '#991b1b',
                                border: '1px solid #fca5a5',
                                padding: '6px 14px',
                                fontSize: '0.8rem',
                                fontWeight: '600',
                                borderRadius: '8px',
                                cursor: 'pointer',
                              }}
                            >
                              Descartar
                            </button>
                          )}
                          {status === 'Aprobado' && (
                            <button
                              className="btn btn-primary"
                              onClick={handleHireApplicant}
                              disabled={loading}
                              style={{
                                padding: '6px 14px',
                                fontSize: '0.8rem',
                                fontWeight: '600',
                                borderRadius: '8px',
                              }}
                            >
                              Contratar
                            </button>
                          )}
                        </div>

                        {/* Entrevista Formal */}
                        <div style={{ gridColumn: 'span 2', marginTop: '0.5rem' }}>
                          <label style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--primary)' }}>Entrevista Formal / Técnica</label>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.5rem' }}>
                            <div className="form-field">
                              <label style={{ fontSize: '0.75rem' }}>Fecha</label>
                              <input
                                type="datetime-local"
                                className="field-input"
                                value={editApplicantData.interview_formal_date}
                                disabled={!isFormalDateEditable}
                                onChange={(e) => setEditApplicantData(prev => ({ ...prev, interview_formal_date: e.target.value }))}
                                style={{ opacity: !isFormalDateEditable ? 0.5 : 1 }}
                              />
                            </div>
                            <div className="form-field">
                              <label style={{ fontSize: '0.75rem' }}>Resultado</label>
                              <select
                                className="field-input"
                                value={editApplicantData.interview_formal_result}
                                disabled={!isFormalResultEditable}
                                onChange={(e) => setEditApplicantData(prev => ({ ...prev, interview_formal_result: e.target.value }))}
                                style={{ opacity: !isFormalResultEditable ? 0.5 : 1 }}
                              >
                                <option value="Pendiente">Pendiente</option>
                                <option value="Entrevista formal aprobada">Aprobado</option>
                                <option value="Entrevista formal rechazada">Rechazado</option>
                              </select>
                            </div>
                          </div>
                        </div>

                        {/* Entrevista Médica */}
                        <div style={{ gridColumn: 'span 2', marginTop: '0.5rem' }}>
                          <label style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--primary)' }}>Entrevista Médica</label>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.5rem' }}>
                            <div className="form-field">
                              <label style={{ fontSize: '0.75rem' }}>Fecha</label>
                              <input
                                type="datetime-local"
                                className="field-input"
                                value={editApplicantData.interview_medical_date}
                                disabled={!isMedicalDateEditable}
                                onChange={(e) => setEditApplicantData(prev => ({ ...prev, interview_medical_date: e.target.value }))}
                                style={{ opacity: !isMedicalDateEditable ? 0.5 : 1 }}
                              />
                            </div>
                            <div className="form-field">
                              <label style={{ fontSize: '0.75rem' }}>Resultado</label>
                              <select
                                className="field-input"
                                value={editApplicantData.interview_medical_result}
                                disabled={!isMedicalResultEditable}
                                onChange={(e) => setEditApplicantData(prev => ({ ...prev, interview_medical_result: e.target.value }))}
                                style={{ opacity: !isMedicalResultEditable ? 0.5 : 1 }}
                              >
                                <option value="Pendiente">Pendiente</option>
                                <option value="Entrevista medica aprobada">Aprobado</option>
                                <option value="Entrevista medica rechazada">Rechazado</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
            <div className="modal-footer" style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--outline-variant)', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button className="btn btn-secondary" onClick={handleCloseApplicantDetail}>
                Cerrar
              </button>
              <button className="btn btn-primary" onClick={handleSaveApplicant} disabled={loading}>
                {loading ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notificación Toast Industrial */}
      <div className={`notification-toast ${notification.visible ? 'visible' : ''} ${notification.type}`}>
        <span className="material-symbols-outlined">
          {notification.type === 'error' ? 'error' : 'check_circle'}
        </span>
        <span className="notification-message">{notification.message}</span>
      </div>

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
            <button 
              className={`btn ${subView === 'photos' ? 'btn-primary' : 'btn-secondary'}`} 
              onClick={() => setSubView('photos')}
            >
              Fotos Pendientes {pendingPhotos.length > 0 && `(${pendingPhotos.length})`}
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
                      <input 
                        type="text" 
                        className="table-search-input" 
                        placeholder="Buscar por nombre o CI..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
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
                        <th style={{ minWidth: '130px' }}>CI</th>
                        <th>Email</th>
                        <th>Estado</th>
                        <th className="text-center">Modificar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.isArray(filteredUsers) && filteredUsers.length > 0 ? (
                        [...filteredUsers]
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
          ) : subView === 'add' ? (
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
                    <label>Cédula de Identidad</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <select 
                        name="ci_type" 
                        className="field-input" 
                        style={{ width: '80px', textAlign: 'center', fontWeight: 'bold' }}
                        value={formData.ci_type} 
                        onChange={handleChange}
                      >
                        <option value="V-">V-</option>
                        <option value="E-">E-</option>
                      </select>
                      <input 
                        type="text" 
                        name="ci_number" 
                        className="field-input" 
                        value={formData.ci_number} 
                        onChange={handleChange} 
                        placeholder="Solo números" 
                        required 
                      />
                    </div>
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
          ) : null}
          </div>
      )}

      {activeAction === 'users' && subView === 'photos' && (
        <div className="form-container">
          <h2 className="form-title">
            <span className="material-symbols-outlined">photo_library</span>
            Fotos de Perfil Pendientes de Aprobación
          </h2>
          {pendingPhotos.length === 0 ? (
            <p className="loading-text">No hay fotos pendientes de aprobación.</p>
          ) : (
            <div className="table-container-card">
              <table className="data-table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th style={{ width: '80px' }}>Foto</th>
                    <th style={{ textAlign: 'center' }}>Usuario</th>
                    <th style={{ width: '200px' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingPhotos.map(photo => (
                    <tr key={photo.id}>
                      <td>
                        <img 
                          src={photo.url_perfil_photo} 
                          alt={`Foto de ${photo.name}`}
                          onClick={() => setPreviewImage(photo.url_perfil_photo)}
                          style={{ width: '50px', height: '50px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border)', cursor: 'pointer', transition: 'transform 0.2s' }}
                          onMouseEnter={e => e.target.style.transform = 'scale(1.15)'}
                          onMouseLeave={e => e.target.style.transform = 'scale(1)'}
                        />
                      </td>
                      <td style={{ fontWeight: 500, textAlign: 'center' }}>{photo.name} {photo.lastname}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button 
                            onClick={() => handleApprovePhoto(photo.id)}
                            className="btn"
                            style={{ backgroundColor: '#059669', color: 'white', padding: '6px 12px', fontSize: '0.8rem' }}
                            title="Aprobar foto"
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>check</span> Aprobar
                          </button>
                          <button 
                            onClick={() => handleRejectPhoto(photo.id)}
                            className="btn"
                            style={{ backgroundColor: '#dc2626', color: 'white', padding: '6px 12px', fontSize: '0.8rem' }}
                            title="Rechazar foto"
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>close</span> Rechazar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {previewImage && (
            <div 
              onClick={() => setPreviewImage(null)}
              style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 4000, cursor: 'pointer' }}
            >
              <img 
                src={previewImage} 
                alt="Vista ampliada"
                style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}
              />
            </div>
          )}
        </div>
      )}

      {activeAction === 'applicants' && (
        <div className="form-container">
          {/* Tabs de navegación */}
          <div className="tab-navigation" style={{ marginBottom: '2rem', display: 'flex', gap: '1rem' }}>
            <button
              className={`btn ${websiteTab === 'notices' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setWebsiteTab('notices')}
            >
              Comunicado web
            </button>
            <button
              className={`btn ${websiteTab === 'applicants' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setWebsiteTab('applicants')}
            >
              Postulantes
            </button>
          </div>

          {/* CONTENIDO: Tab Comunicado web */}
          {websiteTab === 'notices' && (
            <>
              {/* Formulario de comunicado */}
              <div style={{ marginBottom: '2.5rem', padding: '1.5rem', backgroundColor: 'var(--surface-variant)', borderRadius: '12px', border: '2px dashed var(--primary)' }}>
                <h3 style={{ fontSize: '1rem', color: 'var(--primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="material-symbols-outlined">campaign</span>
                  Comunicados para el Sitio Web
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--secondary)', marginBottom: '1rem' }}>
                  Seleccione una categoría para actualizar automáticamente el anuncio en la parte superior del sitio web.
                </p>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <div className="form-field" style={{ flex: 1, minWidth: '300px' }}>
                    <label>Nombre del Comunicado (Ej: VACANTE ACTIVA: ADMINISTRADOR)</label>
                    <input 
                      type="text" 
                      name="name" 
                      className="field-input" 
                      value={websiteNotice.name} 
                      onChange={handleWebsiteNoticeChange} 
                      placeholder="Nombre de la vacante o comunicado" 
                      required 
                    />
                  </div>
                  <div className="form-field" style={{ flexBasis: '100%' }}>
                    <label>Descripción del Mensaje</label>
                    <textarea 
                      name="note" 
                      className="field-input" 
                      value={websiteNotice.note} 
                      onChange={handleWebsiteNoticeChange} 
                      placeholder="Detalle el mensaje que se mostrará en el sitio web..." 
                      rows="4" 
                      required 
                    />
                  </div>
                  <button 
                    className="btn btn-primary" 
                    onClick={async () => {
                      setLoading(true);
                      try {
                        if (!websiteNotice.name || !websiteNotice.note) {
                          showNotification("El nombre y la descripción del aviso no pueden estar vacíos.", "error");
                          setLoading(false);
                          return;
                        } 
                        const updatedNotice = await updateWebsiteNotice(websiteNotice.name, websiteNotice.note);
                        setWebsiteNotice(updatedNotice);
                        loadNotices();
                        showNotification("Comunicado del sitio web actualizado correctamente.");
                      } catch (err) {
                        showNotification(`Error al actualizar el comunicado: ${err.message}`, "error");
                      } finally {
                        setLoading(false);
                      }
                    }}
                    disabled={loading}
                  >
                    {loading ? 'Guardando...' : 'Guardar Comunicado'}
                  </button>
                </div>
              </div>

              {/* Tabla histórica de avisos */}
              <div style={{ marginBottom: '2.5rem' }}>
                <h3 style={{ fontSize: '1rem', color: 'var(--secondary)', marginBottom: '1rem', fontWeight: '700' }}>
                  Historial de Avisos Registrados
                </h3>
                <div className="table-container-card">
                  <div className="table-filters">
                    <div className="table-search-wrapper">
                      <span className="material-symbols-outlined">search</span>
                      <input 
                        type="text" 
                        className="table-search-input" 
                        placeholder="Buscar en el historial de avisos..." 
                        value={noticeSearchTerm}
                        onChange={(e) => setNoticeSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="table-scroll-wrapper">
                    <table className="industrial-table">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Nombre / Vacante</th>
                          <th>Mensaje / Nota</th>
                          <th className="text-center">Seleccionar</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredNotices.length > 0 ? (
                          filteredNotices.map((item) => (
                            <tr key={item.id}>
                              <td style={{ color: 'var(--secondary)', fontSize: '0.8rem' }}>#{item.id}</td>
                              <td style={{ fontWeight: '600' }}>{item.name}</td>
                              <td style={{ fontSize: '0.85rem' }}>{item.note}</td>
                              <td className="text-center">
                                <button 
                                  className={`btn ${item.status || String(websiteNotice.id) === String(item.id) ? 'btn-primary' : 'btn-secondary'}`}
                                  style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }} 
                                  onClick={() => handleSelectNotice(item)}
                                  disabled={processingId !== null || item.status}
                                >
                                  {item.status ? 'Publicado' : (processingId === item.id ? 'Cargando...' : 'Publicar Aviso')}
                                </button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr><td colSpan="4" className="text-center no-data">No hay mensajes registrados.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* CONTENIDO: Tab Postulantes */}
          {websiteTab === 'applicants' && (
            <>
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
                        <th>Estado</th>
                        <th>Entrevista Formal</th>
                        <th>Entrevista Médica</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.isArray(applicants) && applicants.length > 0 ? (
                        [...applicants].sort((a, b) => {
                          const order = { 'En revision': 0, 'Pendiente': 1, 'Aprobado': 2, 'Contratado': 3, 'Rechazado': 4, 'Descartado': 5 };
                          const aOrder = order[a.status] ?? 6;
                          const bOrder = order[b.status] ?? 6;
                          return aOrder - bOrder;
                        }).map((a) => (
                          <tr key={a.id} style={{ cursor: 'pointer' }} onClick={() => handleOpenApplicantDetail(a)}>
                            <td style={{ fontWeight: '600' }}>{a.name}</td>
                            <td>{a.lastname}</td>
                            <td>{a.ci}</td>
                            <td>
                              <span style={{
                                ...getStatusBadgeStyle(a.status),
                                padding: '4px 10px',
                                borderRadius: '12px',
                                fontSize: '0.75rem',
                                fontWeight: '600',
                                whiteSpace: 'nowrap',
                              }}>
                                {a.status}
                              </span>
                            </td>
                            <td>
                              {a.interview_formal_result ? (
                                <span style={{
                                  padding: '4px 10px',
                                  borderRadius: '12px',
                                  fontSize: '0.75rem',
                                  fontWeight: '600',
                                  whiteSpace: 'nowrap',
                                  backgroundColor: a.interview_formal_result.includes('aprobada') ? '#d1fae5' : a.interview_formal_result.includes('rechazada') ? '#fee2e2' : '#f3f4f6',
                                  color: a.interview_formal_result.includes('aprobada') ? '#065f46' : a.interview_formal_result.includes('rechazada') ? '#991b1b' : '#374151',
                                  border: `1px solid ${a.interview_formal_result.includes('aprobada') ? '#6ee7b7' : a.interview_formal_result.includes('rechazada') ? '#fca5a5' : '#9ca3af'}`,
                                }}>
                                  {a.interview_formal_result.replace('Entrevista formal ', '')}
                                </span>
                              ) : a.interview_formal_date ? (
                                <span style={{
                                  padding: '4px 10px',
                                  borderRadius: '12px',
                                  fontSize: '0.75rem',
                                  fontWeight: '600',
                                  whiteSpace: 'nowrap',
                                  backgroundColor: '#f3f4f6',
                                  color: '#374151',
                                  border: '1px solid #9ca3af',
                                }}>
                                  Pendiente
                                </span>
                              ) : (
                                <span style={{ color: 'var(--secondary)', fontSize: '0.8rem' }}>—</span>
                              )}
                            </td>
                            <td>
                              {a.interview_medical_result ? (
                                <span style={{
                                  padding: '4px 10px',
                                  borderRadius: '12px',
                                  fontSize: '0.75rem',
                                  fontWeight: '600',
                                  whiteSpace: 'nowrap',
                                  backgroundColor: a.interview_medical_result.includes('aprobada') ? '#d1fae5' : a.interview_medical_result.includes('rechazada') ? '#fee2e2' : '#f3f4f6',
                                  color: a.interview_medical_result.includes('aprobada') ? '#065f46' : a.interview_medical_result.includes('rechazada') ? '#991b1b' : '#374151',
                                  border: `1px solid ${a.interview_medical_result.includes('aprobada') ? '#6ee7b7' : a.interview_medical_result.includes('rechazada') ? '#fca5a5' : '#9ca3af'}`,
                                }}>
                                  {a.interview_medical_result.replace('Entrevista medica ', '')}
                                </span>
                              ) : a.interview_medical_date ? (
                                <span style={{
                                  padding: '4px 10px',
                                  borderRadius: '12px',
                                  fontSize: '0.75rem',
                                  fontWeight: '600',
                                  whiteSpace: 'nowrap',
                                  backgroundColor: '#f3f4f6',
                                  color: '#374151',
                                  border: '1px solid #9ca3af',
                                }}>
                                  Pendiente
                                </span>
                              ) : (
                                <span style={{ color: 'var(--secondary)', fontSize: '0.8rem' }}>—</span>
                              )}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="6" className="text-center no-data">
                            No hay postulantes registrados o no se pudieron cargar.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {activeAction === 'view_inspections' && (
        <div className="form-container">
          <h2 className="form-title">Consulta de Inspecciones Realizadas</h2>
          <div className="form-grid" style={{ marginBottom: '2rem' }}>
            <div className="form-field">
              <label>Seleccionar Factura</label>
              <select name="invoiceId" className="field-input" value={inspectionView.invoiceId} onChange={handleInspectionViewChange}>
                <option value="" disabled>Seleccione una factura...</option>
                {inspectionInvoices.map(inv => <option key={inv.id} value={inv.id}>{inv.bill_nro}</option>)}
              </select>
            </div>
            <div className="form-field">
              <label>Seleccionar Insumo</label>
              <select name="insumoIndex" className="field-input" value={inspectionView.insumoIndex} onChange={handleInspectionViewChange} disabled={!inspectionView.invoiceId}>
                <option value="" disabled>Seleccione referencia...</option>
                {selectedInvoiceItems.map((ins, idx) => (
                  <option key={ins.id} value={idx}>{ins.reference}</option>
                ))}
              </select>
            </div>
          </div>

          {inspectionHistory.length > 0 && selectedInvoiceItems[inspectionView.insumoIndex] && (
            <div className="table-container-card" style={{ marginTop: '2rem' }}>
              <h3 className="form-subtitle">
                Resultados para: <span className="role-badge">{inspectionView.tipo}</span>
              </h3>
              
              <div className="form-grid">
                <div className="form-field form-field-inline" style={{ gridColumn: 'span 2' }}>
                  <div className="field-input-group">
                    <span className="input-group-addon" style={{ background: 'var(--primary)', color: 'white' }}>
                      Muestra {inspectionView.currentStep} de {inspectionHistory.length}
                    </span>
                  </div>
                </div>

                {getSpecsByTypeId(selectedInvoiceItems[inspectionView.insumoIndex].type_inputs_id).map(key => {
                  const currentRecord = inspectionHistory[inspectionView.currentStep - 1];
                  const savedValue = currentRecord?.[key];
                  const allowedValue = selectedInvoiceItems[inspectionView.insumoIndex][key];
                  const isBool = ['presentation', 'production_test', 'visual', 'joint'].includes(key);
                  const isDate = key.includes('date');
                  const status = getMeasurementStatus(savedValue, allowedValue, key);
                  
                  // Lógica específica para Químicos (Tipo 4): 
                  // No mostrar Fecha de Lote y Prueba de Producción si la Presentación fue aprobada originalmente
                  if (selectedInvoiceItems[inspectionView.insumoIndex].type_inputs_id === 4) {
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
                        <span style={{ color: status.color, fontWeight: 'bold', minWidth: '100px', textAlign: 'right' }}>
                          {status.text}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {/* Dictamen General de la Muestra */}
                <div style={{ gridColumn: 'span 2', marginTop: '1rem', padding: '1rem', backgroundColor: 'var(--surface-variant)', borderRadius: '8px', borderLeft: '4px solid var(--primary)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', alignItems: 'center' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '0.9rem', textTransform: 'uppercase' }}>Dictamen de la Inspección:</span>
                    <span className="role-badge" style={{ 
                      backgroundColor: (inspectionHistory[inspectionView.currentStep - 1]?.status === 'Aprobado' || inspectionHistory[inspectionView.currentStep - 1]?.status === 'Aprobado Observacion') ? '#10b981' : 
                                     (inspectionHistory[inspectionView.currentStep - 1]?.status === 'Rechazado' || inspectionHistory[inspectionView.currentStep - 1]?.status === 'Rechazado Observacion') ? '#ef4444' : '#fbbf24',
                      color: 'white',
                      fontWeight: '800'
                    }}>
                      {inspectionHistory[inspectionView.currentStep - 1]?.status || 'SIN ESTADO'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--secondary)' }}>comment</span>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--on-surface)' }}>
                      <strong>Observación:</strong> {inspectionHistory[inspectionView.currentStep - 1]?.observation || 'Sin observaciones registradas.'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="form-actions" style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setInspectionView(prev => ({ ...prev, currentStep: Math.max(prev.currentStep - 1, 1) }))} 
                  disabled={inspectionView.currentStep === 1}
                >
                  <span className="material-symbols-outlined">arrow_back</span> Anterior
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  onClick={() => setInspectionView(prev => ({ ...prev, currentStep: Math.min(prev.currentStep + 1, inspectionHistory.length) }))} 
                  disabled={inspectionView.currentStep === inspectionHistory.length}
                >
                  Siguiente <span className="material-symbols-outlined">arrow_forward</span>
                </button>
              </div>
            </div>
          )}
          {inspectionView.insumoIndex !== '' && inspectionHistory.length === 0 && !loading && (
            <p className="no-data text-center">No se encontraron inspecciones realizadas para este ítem.</p>
          )}
        </div>
      )}

      {/* Modal Visor de CV */}
      {cvModalUrl && (
        <div className="modal-overlay" onClick={() => setCvModalUrl(null)}>
          <div className="modal-container" style={{ maxWidth: '900px', width: '95%', height: '85vh', display: 'flex', flexDirection: 'column', padding: 0 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ backgroundColor: 'var(--primary)', color: 'white', padding: '0.75rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: '12px 12px 0 0', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="material-symbols-outlined">description</span>
                <h3 style={{ margin: 0, fontSize: '1rem' }}>Currículum Vitae</h3>
              </div>
              <button onClick={() => setCvModalUrl(null)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: '4px', display: 'flex' }}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div style={{ flex: 1, padding: 0, overflow: 'hidden' }}>
              <iframe src={cvModalUrl} style={{ width: '100%', height: '100%', border: 'none' }} title="CV Viewer" />
            </div>
          </div>
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