import React, { useState, useEffect, useRef } from 'react';
import { registerUser, getUsers, updateUser, getApplicants, updateApplicant, getCvUrl, discardApplicant, hireApplicant, updateWebsiteNotice, getWebsiteNotice, getNoticesList, getNoticeById, publishNotice, getBills, getBillInputsByBillId, getInspectionResults, getPendingPhotos, approveProfilePhoto, rejectProfilePhoto, getWebsiteProductsAll, createWebsiteProduct, updateWebsiteProduct, deleteWebsiteProduct, getReportPdfUrl } from '../services/authService'; 
import ConfirmModal from '../components/ConfirmModal';
import Pagination from '../components/Pagination';
import Avatar from '../components/Avatar';
import TextInput from '../components/TextInput';
import CustomSelect from '../components/CustomSelect';
import DataTable from '../components/DataTable';
 
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
  const [showPassword, setShowPassword] = useState(false);

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
  const [noticesPagination, setNoticesPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [noticeSearchTerm, setNoticeSearchTerm] = useState(''); // Buscador de avisos
  const [processingId, setProcessingId] = useState(null); // Para saber qué fila se está cargando

  // Estado para productos del catálogo web
  const [websiteProducts, setWebsiteProducts] = useState([]);
  const [productsPagination, setProductsPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState({ name: '', description: '', display_order: '0', status: 'Activo' });
  const [productImage, setProductImage] = useState(null);
  const [productImagePreview, setProductImagePreview] = useState(null);
  const [productLoading, setProductLoading] = useState(false);
  const [productNotification, setProductNotification] = useState({ message: '', type: 'success', visible: false });
  const [productModalOpen, setProductModalOpen] = useState(false);

  const showProductNotification = (message, type = 'success') => {
    setProductNotification({ message, type, visible: true });
    setTimeout(() => setProductNotification(prev => ({ ...prev, visible: false })), 4000);
  };

  const loadWebsiteProducts = async (page = 1) => {
    try {
      const result = await getWebsiteProductsAll({ page, limit: 10 });
      setWebsiteProducts(result.data);
      setProductsPagination({ page: result.page, totalPages: result.totalPages, total: result.total });
    } catch (error) {
      console.error("Error al cargar productos del sitio web:", error);
    }
  };

  const handleProductFormChange = (e) => {
    const { name, value } = e.target;
    setProductForm(prev => ({ ...prev, [name]: value }));
  };

  const handleProductImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        showProductNotification('Solo se permiten imágenes JPG, PNG o WEBP.', 'error');
        e.target.value = '';
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        showProductNotification('La imagen no debe exceder 5MB.', 'error');
        e.target.value = '';
        return;
      }
      setProductImage(file);
      setProductImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSelectProduct = (product) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name,
      description: product.description,
      display_order: String(product.display_order),
      status: product.status
    });
    setProductImage(null);
    setProductImagePreview(product.image_url);
    setProductModalOpen(true);
  };

  const handleOpenNewProduct = (slot = 0) => {
    setEditingProduct(null);
    setProductForm({ name: '', description: '', display_order: String(slot), status: 'Activo' });
    setProductImage(null);
    setProductImagePreview(null);
    setProductModalOpen(true);
  };

  const handleResetProductForm = () => {
    setEditingProduct(null);
    setProductForm({ name: '', description: '', display_order: '0', status: 'Activo' });
    setProductImage(null);
    setProductImagePreview(null);
    setProductModalOpen(false);
  };

  const handleSaveProduct = async () => {
    if (!productForm.name || !productForm.description) {
      showProductNotification('El nombre y la descripción son obligatorios.', 'error');
      return;
    }
    if (!editingProduct && !productImage) {
      showProductNotification('Debe seleccionar una imagen para el producto.', 'error');
      return;
    }
    setProductLoading(true);
    try {
      const formData = new FormData();
      formData.append('name', productForm.name);
      formData.append('description', productForm.description);
      formData.append('display_order', productForm.display_order);
      formData.append('status', productForm.status);
      if (productImage) {
        formData.append('image', productImage);
      }

      if (editingProduct) {
        await updateWebsiteProduct(editingProduct.id, formData);
        showProductNotification('Producto actualizado correctamente.');
      } else {
        await createWebsiteProduct(formData);
        showProductNotification('Producto creado correctamente.');
      }
      handleResetProductForm();
      loadWebsiteProducts();
    } catch (error) {
      showProductNotification(`Error: ${error.message}`, 'error');
    } finally {
      setProductLoading(false);
    }
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este producto del catálogo?')) return;
    setProductLoading(true);
    try {
      await deleteWebsiteProduct(id);
      showProductNotification('Producto eliminado correctamente.');
      if (editingProduct && editingProduct.id === id) handleResetProductForm();
      loadWebsiteProducts();
    } catch (error) {
      showProductNotification(`Error: ${error.message}`, 'error');
    } finally {
      setProductLoading(false);
    }
  };

  // Función para cargar la lista de mensajes registrados
  const loadNotices = async (page = 1) => {
    try {
      const result = await getNoticesList({ page, limit: 10 });
      setNoticesList(result.data);
      setNoticesPagination({ page: result.page, totalPages: result.totalPages, total: result.total });
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
  const [usersPagination, setUsersPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [fetchingUsers, setFetchingUsers] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [selectedUser, setSelectedUser] = useState(null);
  const [isEditingModal, setIsEditingModal] = useState(false);

  // Filtros/orden del DataTable de usuarios
  const [usersSort, setUsersSort] = useState(null);
  const [usersSearch, setUsersSearch] = useState('');
  const [usersFilters, setUsersFilters] = useState({});

  const loadUsers = async (page = 1) => {
    setFetchingUsers(true);
    try {
      const params = { page, limit: 10 };
      if (usersSearch) params.search = usersSearch;
      if (usersSort) {
        params.sort = usersSort.column;
        params.sortDir = usersSort.direction;
      }
      const rolesFilter = usersFilters.roles_id;
      if (rolesFilter && rolesFilter.size > 0) {
        params.roles_id = Array.from(rolesFilter).join(',');
      }
      const statusFilter = usersFilters.status;
      if (statusFilter && statusFilter.size > 0) {
        params.status = Array.from(statusFilter).join(',');
      }
      const result = await getUsers(params);
      setUsers(result.data);
      setUsersPagination({ page: result.page, totalPages: result.totalPages, total: result.total });
    } catch (error) {
      console.error("Error al cargar la tabla:", error);
    } finally {
      setFetchingUsers(false);
    }
  };

  // Estados para la lista de postulantes
  const [applicants, setApplicants] = useState([]);
  const [applicantsPagination, setApplicantsPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [fetchingApplicants, setFetchingApplicants] = useState(false);

  // Filtros/orden del DataTable de postulantes
  const [applicantsSort, setApplicantsSort] = useState(null);
  const [applicantsSearch, setApplicantsSearch] = useState('');
  const [applicantsFilters, setApplicantsFilters] = useState({});

  const loadApplicants = async (page = 1) => {
    setFetchingApplicants(true);
    try {
      const params = { page, limit: 10 };
      if (applicantsSearch) params.search = applicantsSearch;
      if (applicantsSort) {
        params.sort = applicantsSort.column;
        params.sortDir = applicantsSort.direction;
      }
      const statusFilter = applicantsFilters.status;
      if (statusFilter && statusFilter.size > 0) {
        params.status = Array.from(statusFilter).join(',');
      }
      const result = await getApplicants(params);
      setApplicants(result.data);
      setApplicantsPagination({ page: result.page, totalPages: result.totalPages, total: result.total });
    } catch (error) {
      console.error("Error al recargar postulantes:", error);
    } finally {
      setFetchingApplicants(false);
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
  const [photosPagination, setPhotosPagination] = useState({ page: 1, totalPages: 1, total: 0 });
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

  // Bloquear scroll del body cuando cualquier modal esté abierto
  useEffect(() => {
    const isAnyModalOpen = selectedUser || selectedApplicant || cvModalUrl || confirmModal.isOpen;
    if (isAnyModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [selectedUser, selectedApplicant, cvModalUrl, confirmModal.isOpen]);

  const refreshPendingPhotos = async (page = 1) => {
    try {
      const result = await getPendingPhotos({ page, limit: 10 });
      setPendingPhotos(result.data);
      setPhotosPagination({ page: result.page, totalPages: result.totalPages, total: result.total });
    } catch (error) {
      console.error("Error al cargar fotos pendientes:", error);
    }
  };

  // Cargar usuarios cuando se entra a la sección de usuarios en modo lista
  useEffect(() => {
    if (activeAction === 'users' && subView === 'list') {
      loadUsers();
    }

    // Cargar fotos pendientes de aprobación
    if (activeAction === 'users' && subView === 'photos') {
      refreshPendingPhotos();
    }

    // Cargar postulantes cuando se selecciona la acción correspondiente
    if (activeAction === 'applicants') {
      loadApplicants();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeAction, subView, refreshKey]);

  // Recargar usuarios al cambiar filtros de búsqueda/orden
  const filterTimerRef = useRef(null);
  useEffect(() => {
    if (activeAction !== 'users' || subView !== 'list') return;
    if (filterTimerRef.current) clearTimeout(filterTimerRef.current);
    filterTimerRef.current = setTimeout(() => {
      loadUsers(1);
    }, usersSearch ? 350 : 0);
    return () => { if (filterTimerRef.current) clearTimeout(filterTimerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeAction, subView, usersSearch, usersSort, usersFilters]);

  // Recargar postulantes al cambiar filtros de búsqueda/orden
  const applicantsFilterTimerRef = useRef(null);
  useEffect(() => {
    if (activeAction !== 'applicants') return;
    if (applicantsFilterTimerRef.current) clearTimeout(applicantsFilterTimerRef.current);
    applicantsFilterTimerRef.current = setTimeout(() => {
      loadApplicants(1);
    }, applicantsSearch ? 350 : 0);
    return () => { if (applicantsFilterTimerRef.current) clearTimeout(applicantsFilterTimerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeAction, applicantsSearch, applicantsSort, applicantsFilters]);

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
    setFormData(prev => ({ ...prev, [name]: value }));
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
      setShowPassword(false);
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
    setIsEditingModal(false);
  };

  const handleRowClick = (user) => {
    setSelectedUser(user);
    setIsEditingModal(false);
  };

  const handleCloseModal = () => {
    setSelectedUser(null);
    setIsEditingModal(false);
    setEditFormData({});
    setEditingUserId(null);
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveEdit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        user: String(editFormData.user || ''),
        name: String(editFormData.name || ''),
        lastname: String(editFormData.lastname || ''),
        ci: String(editFormData.ci_type || 'V-') + String(editFormData.ci_number || ''),
        email: String(editFormData.email || ''),
        roles_id: parseInt(editFormData.roles_id, 10),
        status: editFormData.status === 'Inactivo' ? 'Inactivo' : 'Activo'
      };

      await updateUser(editingUserId, payload);
      
      showNotification("Usuario actualizado exitosamente.");
      
      await loadUsers(usersPagination.page);
      handleCloseModal();
    } catch (error) {
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
      await loadApplicants();
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
          await loadApplicants();
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
          await loadApplicants();
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
          <div className="modal-container" style={{ maxWidth: '700px', width: '95%', maxHeight: '92vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
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
                              <TextInput
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
                              <CustomSelect
                                value={editApplicantData.interview_formal_result}
                                disabled={!isFormalResultEditable}
                                onChange={(e) => setEditApplicantData(prev => ({ ...prev, interview_formal_result: e.target.value }))}
                                options={[
                                  { value: 'Pendiente', label: 'Pendiente' },
                                  { value: 'Entrevista formal aprobada', label: 'Aprobado' },
                                  { value: 'Entrevista formal rechazada', label: 'Rechazado' }
                                ]}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Entrevista Médica */}
                        <div style={{ gridColumn: 'span 2', marginTop: '0.5rem' }}>
                          <label style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--primary)' }}>Entrevista Médica</label>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.5rem' }}>
                            <div className="form-field">
                              <label style={{ fontSize: '0.75rem' }}>Fecha</label>
                              <TextInput
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
                              <CustomSelect
                                value={editApplicantData.interview_medical_result}
                                disabled={!isMedicalResultEditable}
                                onChange={(e) => setEditApplicantData(prev => ({ ...prev, interview_medical_result: e.target.value }))}
                                options={[
                                  { value: 'Pendiente', label: 'Pendiente' },
                                  { value: 'Entrevista medica aprobada', label: 'Aprobado' },
                                  { value: 'Entrevista medica rechazada', label: 'Rechazado' }
                                ]}
                              />
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
                  <DataTable
                    columns={[
                      { key: 'name', label: 'Nombre completo', type: 'text', filterType: 'sort', getSearchValue: (row) => `${row.name} ${row.lastname}`, render: (val, row) => <span style={{ fontWeight: 600 }}>{row.name} {row.lastname}</span> },
                      { key: 'user', label: 'Usuario', type: 'text', filterType: 'sort' },
                      { key: 'roles_id', label: 'Rol', type: 'select', filterType: 'select', filterTransform: (val) => getRoleName(Number(val)), filterOptions: [
                        { value: '1', label: 'Administrador' },
                        { value: '2', label: 'Trabajador' },
                        { value: '3', label: 'Jefe de Calidad' },
                        { value: '4', label: 'Jefe de Ingeniería' }
                      ], render: (val) => <span className="role-badge">{getRoleName(val)}</span> },
                      { key: 'status', label: 'Estado', type: 'text', filterType: 'sort', render: (val) => (
                        <div className="status-indicator">
                          <div className={`status-dot ${val?.toLowerCase() === 'activo' ? 'active' : 'inactive'}`}></div>
                          <span style={{ color: val?.toLowerCase() === 'activo' ? 'var(--on-surface)' : 'var(--secondary)', fontSize: '0.85rem' }}>{val}</span>
                        </div>
                      )}
                    ]}
                    data={users}
                    searchPlaceholder="Buscar por nombre, apellido o usuario..."
                    onRowClick={handleRowClick}
                    getRowId={(u) => u.user_id || u.id || u.user}
                    emptyMessage="No hay usuarios registrados o no se pudieron cargar."
                    selectable={false}
                    onSortChange={(sort) => { setUsersSort(sort); }}
                    onFilterChange={(filters) => { setUsersFilters(filters); }}
                    onSearchChange={(search) => { setUsersSearch(search); }}
                    sortConfig={usersSort}
                    globalSearch={usersSearch}
                    columnFilters={usersFilters}
                  />
                  <Pagination
                    currentPage={usersPagination.page}
                    totalPages={usersPagination.totalPages}
                    total={usersPagination.total}
                    onPageChange={(page) => loadUsers(page)}
                  />
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
                    <TextInput type="text" name="name" className="field-input" value={formData.name} onChange={handleChange} placeholder="Nombre" sanitize="alpha" required />
                  </div>
                  <div className="form-field">
                    <label>Apellido</label>
                    <TextInput type="text" name="lastname" className="field-input" value={formData.lastname} onChange={handleChange} placeholder="Apellido" sanitize="alpha" required />
                  </div>
                  <div className="form-field">
                    <label>Nombre de Usuario</label>
                    <TextInput type="text" name="user" className="field-input" value={formData.user} onChange={handleChange} placeholder="Nombre de acceso" sanitize="quotes" required />
                  </div>
                  <div className="form-field">
                    <label>Contraseña</label>
                    <div style={{ position: 'relative' }}>
                      <TextInput 
                        type={showPassword ? 'text' : 'password'} 
                        name="password" 
                        className="field-input" 
                        style={{ paddingRight: '40px' }}
                        value={formData.password} 
                        onChange={handleChange} 
                        placeholder="••••••••" 
                        sanitize="quotes"
                        required 
                      />
                      <button 
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        style={{
                          position: 'absolute',
                          right: '8px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--secondary)'
                        }}
                        title={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                          {showPassword ? 'visibility_off' : 'visibility'}
                        </span>
                      </button>
                    </div>
                  </div>
                  <div className="form-field">
                    <label>Cédula de Identidad</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <CustomSelect
                        name="ci_type"
                        style={{ minWidth: '100px', maxWidth: '100px' }}
                        value={formData.ci_type}
                        onChange={handleChange}
                        options={[
                          { value: 'V-', label: 'V-' },
                          { value: 'E-', label: 'E-' }
                        ]}
                      />
                      <TextInput 
                        type="text" 
                        name="ci_number" 
                        className="field-input" 
                        value={formData.ci_number} 
                        onChange={handleChange} 
                        placeholder="Solo números" 
                        sanitize="digits"
                        required 
                      />
                    </div>
                  </div>
                  <div className="form-field">
                    <label>Correo Electrónico</label>
                    <TextInput type="email" name="email" className="field-input" value={formData.email} onChange={handleChange} placeholder="correo@ejemplo.com" sanitize="quotes" required />
                  </div>
                  <div className="form-field">
                    <label>Rol asignado</label>
                    <CustomSelect name="roles_id" value={formData.roles_id} onChange={handleChange} options={[
                      { value: '1', label: 'Administrador' },
                      { value: '2', label: 'Trabajador' },
                      { value: '3', label: 'Jefe de Calidad' },
                      { value: '4', label: 'Jefe de Ingeniería' }
                    ]} />
                  </div>
                  <div className="form-field">
                    <label>Estado de Cuenta</label>
                    <CustomSelect name="status" value={formData.status} onChange={handleChange} options={[
                      { value: 'Activo', label: 'Activo' },
                      { value: 'Inactivo', label: 'Inactivo' }
                    ]} />
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
              <Pagination
                currentPage={photosPagination.page}
                totalPages={photosPagination.totalPages}
                total={photosPagination.total}
                onPageChange={(page) => refreshPendingPhotos(page)}
              />
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
              className={`btn ${websiteTab === 'products' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => { setWebsiteTab('products'); loadWebsiteProducts(); }}
            >
              Imágenes
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
                    <TextInput
                      type="text"
                      name="name"
                      className="field-input"
                      value={websiteNotice.name}
                      onChange={handleWebsiteNoticeChange}
                      placeholder="Nombre de la vacante o comunicado"
                      sanitize="quotesNoSpaces"
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
                      <TextInput
                        type="text"
                        className="table-search-input"
                        placeholder="Buscar en el historial de avisos..."
                        value={noticeSearchTerm}
                        onChange={(e) => setNoticeSearchTerm(e.target.value)}
                        sanitize="quotes"
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
                    <Pagination
                      currentPage={noticesPagination.page}
                      totalPages={noticesPagination.totalPages}
                      total={noticesPagination.total}
                      onPageChange={(page) => loadNotices(page)}
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* CONTENIDO: Tab Imágenes */}
          {websiteTab === 'products' && (
            <>
              {/* Notificación */}
              {productNotification.visible && (
                <div style={{
                  padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem',
                  backgroundColor: productNotification.type === 'error' ? '#fee2e2' : '#d1fae5',
                  color: productNotification.type === 'error' ? '#991b1b' : '#065f46',
                  border: `1px solid ${productNotification.type === 'error' ? '#fca5a5' : '#6ee7b7'}`,
                  fontWeight: '600', fontSize: '0.85rem'
                }}>
                  {productNotification.message}
                </div>
              )}

              <p style={{ fontSize: '0.85rem', color: 'var(--secondary)', marginBottom: '1.5rem' }}>
                Administra las imágenes que se muestran en la sección de Productos del sitio web. Máximo 6 productos (slots del 1 al 6).
              </p>

              {/* Vista previa del catálogo - Grid 3x2 */}
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1rem', color: 'var(--secondary)', marginBottom: '1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="material-symbols-outlined">visibility</span>
                  Vista Previa del Catálogo
                </h3>
                <div style={{
                  backgroundColor: '#f8fafc', borderRadius: '16px', padding: '1.5rem',
                  border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
                }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'center', alignItems: 'flex-start' }}>
                    {Array.from({ length: 6 }, (_, i) => i).map((slotIndex) => {
                      const product = websiteProducts.find(p => p.display_order === slotIndex && p.status === 'Activo');
                      if (product) {
                        return (
                          <div key={product.id} style={{
                            backgroundColor: 'white', borderRadius: '12px', overflow: 'hidden',
                            border: '1px solid #e2e8f0', transition: 'all 0.2s ease', cursor: 'pointer',
                            width: 'calc((100% - 2rem) / 3)'
                          }}
                          onClick={() => handleSelectProduct(product)}>
                            <img
                              src={product.image_url}
                              alt={product.name}
                              style={{ width: '100%', height: '130px', objectFit: 'contain', backgroundColor: 'transparent' }}
                              onError={(e) => { e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 130"><rect fill="%23f1f5f9" width="300" height="130"/><text fill="%2394a3b8" font-family="sans-serif" font-size="14" text-anchor="middle" x="150" y="70">Sin imagen</text></svg>'; }}
                            />
                            <div style={{ padding: '0.75rem' }}>
                              <p style={{ fontWeight: '700', fontSize: '0.85rem', color: '#d32f2f', margin: 0 }}>#{slotIndex + 1} {product.name}</p>
                              <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0.25rem 0 0', lineHeight: '1.3' }}>
                                {product.description.length > 50 ? product.description.substring(0, 50) + '...' : product.description}
                              </p>
                            </div>
                          </div>
                        );
                      }
                      return (
                        <div key={`empty-${slotIndex}`} onClick={() => handleOpenNewProduct(slotIndex)} style={{
                          backgroundColor: '#f8fafc', borderRadius: '12px', border: '2px dashed #e2e8f0',
                          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                          minHeight: '196px', opacity: 0.6, cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          width: 'calc((100% - 2rem) / 3)'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#d32f2f'; e.currentTarget.style.opacity = '1'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.opacity = '0.6'; }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '2rem', color: '#cbd5e1' }}>add</span>
                          <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '0.5rem 0 0' }}>Slot {slotIndex + 1}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Botón agregar producto */}
              <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '1rem', color: 'var(--secondary)', fontWeight: '700' }}>
                  Productos Registrados ({websiteProducts.length}/6)
                </h3>
                {websiteProducts.length < 6 && (
                  <button className="btn btn-primary" onClick={() => {
                    const usedSlots = websiteProducts.map(p => p.display_order);
                    const nextSlot = Array.from({ length: 6 }, (_, i) => i).find(i => !usedSlots.includes(i));
                    handleOpenNewProduct(nextSlot !== undefined ? nextSlot : 0);
                  }} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '1.2rem' }}>add_photo_alternate</span>
                    Agregar producto
                  </button>
                )}
              </div>

              {/* Tabla de productos */}
              <div className="table-container-card">
                <div className="table-scroll-wrapper">
                  <table className="industrial-table">
                    <thead>
                      <tr>
                        <th>Slot</th>
                        <th>Nombre</th>
                        <th>Descripción</th>
                        <th>Estado</th>
                        <th className="text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {websiteProducts.length > 0 ? (
                        websiteProducts.map((product) => (
                          <tr key={product.id} style={{ cursor: 'pointer' }} onClick={() => handleSelectProduct(product)}>
                            <td style={{ fontWeight: '700', color: 'var(--primary)' }}>#{product.display_order + 1}</td>
                            <td style={{ fontWeight: '600' }}>{product.name}</td>
                            <td style={{ fontSize: '0.8rem', color: 'var(--secondary)', maxWidth: '300px' }}>
                              {product.description.length > 80 ? product.description.substring(0, 80) + '...' : product.description}
                            </td>
                            <td>
                              <span style={{
                                padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '600',
                                backgroundColor: product.status === 'Activo' ? '#d1fae5' : '#fee2e2',
                                color: product.status === 'Activo' ? '#065f46' : '#991b1b',
                                border: `1px solid ${product.status === 'Activo' ? '#6ee7b7' : '#fca5a5'}`
                              }}>
                                {product.status}
                              </span>
                            </td>
                            <td className="text-center">
                              <button
                                className="btn btn-secondary"
                                style={{ padding: '0.3rem 0.6rem', fontSize: '0.7rem', color: '#ef4444' }}
                                onClick={(e) => { e.stopPropagation(); handleDeleteProduct(product.id); }}
                                disabled={productLoading}
                              >
                                <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>delete</span>
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr><td colSpan="5" className="text-center no-data">No hay productos registrados en el catálogo. Haz clic en "Agregar producto" para crear uno.</td></tr>
                      )}
                    </tbody>
                  </table>
                  <Pagination
                    currentPage={productsPagination.page}
                    totalPages={productsPagination.totalPages}
                    total={productsPagination.total}
                    onPageChange={(page) => loadWebsiteProducts(page)}
                  />
                </div>
              </div>

              {/* Modal de producto */}
              {productModalOpen && (
                <div className="modal-overlay" onClick={() => setProductModalOpen(false)}>
                  <div className="modal-container" style={{ maxWidth: '550px', width: '95%' }} onClick={(e) => e.stopPropagation()}>
                    <div className="modal-header" style={{ backgroundColor: 'var(--primary)', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span className="material-symbols-outlined">{editingProduct ? 'edit' : 'add_photo_alternate'}</span>
                        <h3 style={{ margin: 0 }}>{editingProduct ? `Editando Slot #${editingProduct.display_order + 1}` : 'Nuevo Producto'}</h3>
                      </div>
                      <button onClick={() => setProductModalOpen(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '1.5rem', lineHeight: 1 }}>×</button>
                    </div>
                    <div className="modal-body" style={{ padding: '1.5rem', maxHeight: '75vh', overflowY: 'auto' }}>
                      {/* Preview de imagen */}
                      {productImagePreview && (
                        <div style={{ marginBottom: '1rem', textAlign: 'center' }}>
                          <img src={productImagePreview} alt="Preview" style={{ maxWidth: '100%', maxHeight: '180px', borderRadius: '8px', objectFit: 'cover', border: '1px solid var(--outline-variant)' }} />
                        </div>
                      )}

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div className="form-field">
                          <label style={{ fontSize: '0.75rem', color: 'var(--secondary)', fontWeight: '600' }}>Slot (Orden)</label>
                          <CustomSelect
                            name="display_order"
                            value={productForm.display_order}
                            onChange={handleProductFormChange}
                            options={Array.from({ length: 6 }, (_, i) => ({ value: String(i), label: `Slot ${i + 1}` }))}
                            isDisabled={!!editingProduct}
                          />
                        </div>

                        <div className="form-field">
                          <label style={{ fontSize: '0.75rem', color: 'var(--secondary)', fontWeight: '600' }}>Nombre del Producto</label>
                          <TextInput
                            name="name"
                            className="field-input"
                            value={productForm.name}
                            onChange={handleProductFormChange}
                            placeholder="Ej: Estoperas"
                            sanitize="alphaWithSpaces"
                            required
                          />
                        </div>

                        <div className="form-field">
                          <label style={{ fontSize: '0.75rem', color: 'var(--secondary)', fontWeight: '600' }}>Descripción</label>
                          <textarea
                            name="description"
                            className="field-input"
                            value={productForm.description}
                            onChange={handleProductFormChange}
                            placeholder="Descripción del producto para el catálogo web..."
                            rows="3"
                            style={{ resize: 'vertical' }}
                            required
                          />
                        </div>

                        <div className="form-field">
                          <label style={{ fontSize: '0.75rem', color: 'var(--secondary)', fontWeight: '600' }}>Estado</label>
                          <CustomSelect
                            name="status"
                            value={productForm.status}
                            onChange={handleProductFormChange}
                            options={[
                              { value: 'Activo', label: 'Activo (visible en web)' },
                              { value: 'Inactivo', label: 'Inactivo (oculto)' }
                            ]}
                          />
                        </div>

                        <div className="form-field">
                          <label style={{ fontSize: '0.75rem', color: 'var(--secondary)', fontWeight: '600' }}>Imagen (JPG, PNG o WEBP, máx. 5MB)</label>
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={handleProductImageChange}
                            style={{
                              padding: '0.75rem', border: '1px solid var(--outline-variant)', borderRadius: '8px',
                              fontSize: '0.9rem', width: '100%', boxSizing: 'border-box', cursor: 'pointer',
                              backgroundColor: 'var(--surface)'
                            }}
                          />
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', padding: '1rem 1.5rem', borderTop: '1px solid var(--outline-variant)' }}>
                      <button className="btn btn-secondary" onClick={() => setProductModalOpen(false)} disabled={productLoading}>Cancelar</button>
                      <button className="btn btn-primary" onClick={handleSaveProduct} disabled={productLoading}>
                        {productLoading ? 'Guardando...' : (editingProduct ? 'Actualizar' : 'Crear Producto')}
                      </button>
                    </div>
                  </div>
                </div>
              )}
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
                  <DataTable
                    columns={[
                      { key: 'name', label: 'Nombre', type: 'text', filterType: 'sort', getSearchValue: (row) => `${row.name} ${row.lastname}`, render: (val, row) => <span style={{ fontWeight: 600 }}>{val}</span> },
                      { key: 'lastname', label: 'Apellido', type: 'text', filterType: 'sort' },
                      { key: 'ci', label: 'CI', type: 'text', filterType: 'sort' },
                      { key: 'status', label: 'Estado', type: 'text', filterType: 'sort', render: (val) => (
                        <span style={{
                          ...getStatusBadgeStyle(val),
                          padding: '4px 10px',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          whiteSpace: 'nowrap',
                        }}>
                          {val}
                        </span>
                      )},
                      { key: 'interview_formal_result', label: 'Entrevista Formal', type: 'text', filterable: false, render: (val, row) => (
                        val ? (
                          <span style={{
                            padding: '4px 10px',
                            borderRadius: '12px',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            whiteSpace: 'nowrap',
                            backgroundColor: val.includes('aprobada') ? '#d1fae5' : val.includes('rechazada') ? '#fee2e2' : '#f3f4f6',
                            color: val.includes('aprobada') ? '#065f46' : val.includes('rechazada') ? '#991b1b' : '#374151',
                            border: `1px solid ${val.includes('aprobada') ? '#6ee7b7' : val.includes('rechazada') ? '#fca5a5' : '#9ca3af'}`,
                          }}>
                            {val.replace('Entrevista formal ', '')}
                          </span>
                        ) : row.interview_formal_date ? (
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
                        )
                      )},
                      { key: 'interview_medical_result', label: 'Entrevista Médica', type: 'text', filterable: false, render: (val, row) => (
                        val ? (
                          <span style={{
                            padding: '4px 10px',
                            borderRadius: '12px',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            whiteSpace: 'nowrap',
                            backgroundColor: val.includes('aprobada') ? '#d1fae5' : val.includes('rechazada') ? '#fee2e2' : '#f3f4f6',
                            color: val.includes('aprobada') ? '#065f46' : val.includes('rechazada') ? '#991b1b' : '#374151',
                            border: `1px solid ${val.includes('aprobada') ? '#6ee7b7' : val.includes('rechazada') ? '#fca5a5' : '#9ca3af'}`,
                          }}>
                            {val.replace('Entrevista medica ', '')}
                          </span>
                        ) : row.interview_medical_date ? (
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
                        )
                      )},
                    ]}
                    data={applicants}
                    searchPlaceholder="Buscar por nombre, apellido o CI..."
                    onRowClick={handleOpenApplicantDetail}
                    getRowId={(a) => a.id}
                    emptyMessage="No hay postulantes registrados o no se pudieron cargar."
                    selectable={false}
                    onSortChange={(sort) => { setApplicantsSort(sort); }}
                    onFilterChange={(filters) => { setApplicantsFilters(filters); }}
                    onSearchChange={(search) => { setApplicantsSearch(search); }}
                    sortConfig={applicantsSort}
                    globalSearch={applicantsSearch}
                    columnFilters={applicantsFilters}
                  />
                  <Pagination
                    currentPage={applicantsPagination.page}
                    totalPages={applicantsPagination.totalPages}
                    total={applicantsPagination.total}
                    onPageChange={(page) => loadApplicants(page)}
                  />
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
              <CustomSelect name="invoiceId" value={inspectionView.invoiceId} onChange={handleInspectionViewChange} options={inspectionInvoices.map(inv => ({ value: inv.id, label: inv.bill_nro }))} placeholder="Seleccione una factura..." />
            </div>
            <div className="form-field">
              <label>Seleccionar Insumo</label>
              <CustomSelect name="insumoIndex" value={inspectionView.insumoIndex} onChange={handleInspectionViewChange} disabled={!inspectionView.invoiceId} options={selectedInvoiceItems.map((ins, idx) => ({ value: idx, label: ins.reference }))} placeholder="Seleccione referencia..." />
            </div>
          </div>

          {inspectionView.invoiceId && (
            <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
              <a
                href={getReportPdfUrl(inspectionView.invoiceId)}
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
                          <TextInput
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

      {/* Modal de Detalle de Usuario */}
      {selectedUser && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-container" style={{ maxWidth: '700px', width: '95%' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ backgroundColor: 'var(--primary)', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="material-symbols-outlined">person</span>
                <h3 style={{ margin: 0 }}>Detalle del Usuario</h3>
              </div>
              <button onClick={handleCloseModal} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '1.5rem', lineHeight: 1 }}>×</button>
            </div>
            <div className="modal-body" style={{ padding: '1.5rem', maxHeight: '80vh', overflowY: 'auto' }}>
              {isEditingModal ? (
                /* ---- MODO EDICION ---- */
                <form onSubmit={handleSaveEdit}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-field">
                      <label style={{ fontSize: '0.75rem', color: 'var(--secondary)', fontWeight: '600' }}>Nombre</label>
                      <TextInput name="name" className="field-input" value={editFormData.name || ''} onChange={handleEditChange} sanitize="alpha" required />
                    </div>
                    <div className="form-field">
                      <label style={{ fontSize: '0.75rem', color: 'var(--secondary)', fontWeight: '600' }}>Apellido</label>
                      <TextInput name="lastname" className="field-input" value={editFormData.lastname || ''} onChange={handleEditChange} sanitize="alpha" required />
                    </div>
                    <div className="form-field">
                      <label style={{ fontSize: '0.75rem', color: 'var(--secondary)', fontWeight: '600' }}>Usuario</label>
                      <TextInput name="user" className="field-input" value={editFormData.user || ''} onChange={handleEditChange} sanitize="quotesNoSpaces" required />
                    </div>
                    <div className="form-field">
                      <label style={{ fontSize: '0.75rem', color: 'var(--secondary)', fontWeight: '600' }}>CI</label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <CustomSelect
                          name="ci_type"
                          style={{ minWidth: '100px', maxWidth: '100px' }}
                          value={editFormData.ci_type || 'V-'}
                          onChange={handleEditChange}
                          menuPosition="fixed"
                          options={[
                            { value: 'V-', label: 'V-' },
                            { value: 'E-', label: 'E-' }
                          ]}
                        />
                        <TextInput
                          name="ci_number"
                          className="field-input"
                          value={editFormData.ci_number || ''}
                          onChange={handleEditChange}
                          placeholder="Solo números"
                          sanitize="digits"
                          required
                        />
                      </div>
                    </div>
                    <div className="form-field" style={{ gridColumn: '1 / -1' }}>
                      <label style={{ fontSize: '0.75rem', color: 'var(--secondary)', fontWeight: '600' }}>Email</label>
                      <TextInput name="email" className="field-input" type="email" value={editFormData.email || ''} onChange={handleEditChange} sanitize="quotesNoSpaces" required />
                    </div>
                    <div className="form-field">
                      <label style={{ fontSize: '0.75rem', color: 'var(--secondary)', fontWeight: '600' }}>Rol</label>
                      <CustomSelect name="roles_id" value={editFormData.roles_id || ''} onChange={handleEditChange} menuPosition="fixed" options={[
                        { value: '1', label: 'Administrador' },
                        { value: '2', label: 'Trabajador' },
                        { value: '3', label: 'Jefe de Calidad' },
                        { value: '4', label: 'Jefe de Ingenieria' }
                      ]} />
                    </div>
                    <div className="form-field">
                      <label style={{ fontSize: '0.75rem', color: 'var(--secondary)', fontWeight: '600' }}>Estado</label>
                      <CustomSelect name="status" value={editFormData.status || ''} onChange={handleEditChange} menuPosition="fixed" options={[
                        { value: 'Activo', label: 'Activo' },
                        { value: 'Inactivo', label: 'Inactivo' }
                      ]} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem', borderTop: '1px solid var(--outline-variant)', paddingTop: '1rem' }}>
                    <button type="button" className="btn btn-secondary" onClick={handleCancelEdit} disabled={loading}>Cancelar</button>
                    <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Guardando...' : 'Guardar Cambios'}</button>
                  </div>
                </form>
              ) : (
                /* ---- MODO LECTURA ---- */
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label style={{ fontSize: '0.75rem', color: 'var(--secondary)', fontWeight: '600' }}>Nombre completo</label>
                      <p style={{ margin: 0, fontWeight: '600', fontSize: '0.95rem' }}>{selectedUser.name} {selectedUser.lastname}</p>
                    </div>
                    <div>
                      <label style={{ fontSize: '0.75rem', color: 'var(--secondary)', fontWeight: '600' }}>Usuario</label>
                      <p style={{ margin: 0, fontWeight: '600', fontSize: '0.95rem' }}>{selectedUser.user}</p>
                    </div>
                    <div>
                      <label style={{ fontSize: '0.75rem', color: 'var(--secondary)', fontWeight: '600' }}>CI</label>
                      <p style={{ margin: 0, fontSize: '0.95rem' }}>{selectedUser.ci}</p>
                    </div>
                    <div>
                      <label style={{ fontSize: '0.75rem', color: 'var(--secondary)', fontWeight: '600' }}>Email</label>
                      <p style={{ margin: 0, fontSize: '0.95rem' }}>{selectedUser.email}</p>
                    </div>
                    <div>
                      <label style={{ fontSize: '0.75rem', color: 'var(--secondary)', fontWeight: '600' }}>Rol</label>
                      <p style={{ margin: 0 }}><span className="role-badge">{getRoleName(selectedUser.roles_id)}</span></p>
                    </div>
                    <div>
                      <label style={{ fontSize: '0.75rem', color: 'var(--secondary)', fontWeight: '600' }}>Estado</label>
                      <div className="status-indicator">
                        <div className={`status-dot ${selectedUser.status?.toLowerCase() === 'activo' ? 'active' : 'inactive'}`}></div>
                        <span style={{ color: selectedUser.status?.toLowerCase() === 'activo' ? 'var(--on-surface)' : 'var(--secondary)', fontSize: '0.85rem' }}>
                          {selectedUser.status}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem', borderTop: '1px solid var(--outline-variant)', paddingTop: '1rem' }}>
                    <button className="btn btn-primary" onClick={() => { const ci = selectedUser.ci || ''; const ci_type = ci.startsWith('E-') ? 'E-' : 'V-'; const ci_number = ci.replace(/^V-|^E-/, ''); setEditingUserId(selectedUser.user_id || selectedUser.id); setEditFormData({ ...selectedUser, ci_type, ci_number }); setIsEditingModal(true); }}>
                      Editar
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
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