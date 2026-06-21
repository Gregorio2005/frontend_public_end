/**
 * Servicio para manejar la autenticación mediante fetch.
 */
// CONFIGURACIÓN DE URL DE API
// Descomenta la línea que necesites usar según el entorno:
const API_URL = '/api'; // <--- USAR PARA DESARROLLO LOCAL (Vite Proxy)
// const API_URL = 'https://backend-sealing-products.onrender.com/api'; // <--- USAR PARA PRODUCCIÓN (Render)

export const loginUser = async (username, password) => {
  try {
    // LLAMADA REAL AL BACKEND (Si no es el usuario Master)
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        user: username, // Cambiado de username a 'user' para el backend
        password: password 
      })
    });

    // 1. Verificamos si la respuesta es exitosa ANTES de parsear el JSON
    if (!response.ok) {
      let errorMessage = 'Error en la autenticación';
      try {
        // Intentamos extraer el mensaje de error del JSON del backend
        const errorData = await response.json();
        
        // Si el mensaje del backend menciona la base de datos, aplicamos el texto solicitado
        if (errorData.message && errorData.message.toLowerCase().includes('base de datos')) {
          errorMessage = 'Conexion a la base de datos interrumpida';
        } else {
          errorMessage = errorData.message || errorMessage;
        }
      } catch (e) {
        // Si hay un error 502, 500 o cualquier error de servidor que no devuelva JSON
        if (response.status >= 500 || response.status === 502) {
          errorMessage = 'Conexion a la base de datos interrumpida';
        } else {
          errorMessage = `Error del servidor (${response.status}): ${response.statusText}`;
        }
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    console.log("Respuesta del backend recibida:", data); // Esto te ayudará a ver qué llega realmente

    // Si el backend devuelve un token, lo guardamos
    if (data.token) {
      localStorage.setItem('token', data.token);
    }

    /**
     * IMPORTANTE: Si llegamos aquí es porque response.ok es true.
     * Forzamos success: true para que el LoginPage ejecute onLoginSuccess.
     * Intentamos obtener el usuario de data.user o de la raíz del objeto (data).
     */
    return {
      success: true,
      user: data.user || data 
    };
  } catch (error) {
    console.error("Error capturado en el service:", error);
    // Si es un error de red (el backend no responde o el proxy falló)
    if (error.name === 'TypeError') {
      throw new Error('No se pudo establecer conexión con el servidor. Verifica que el backend esté encendido en el puerto 3000.');
    }
    throw error;
  }
};

/**
 * Servicio para registrar un nuevo usuario en la base de datos.
 */
export const registerUser = async (userData) => {
  try {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        // Si el backend requiere el token para autorizar la creación:
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(userData)
    });

    if (!response.ok) {
      let errorMessage = 'Error al registrar el usuario';
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch (e) {
        if (response.status >= 500) {
          errorMessage = 'Conexion a la base de datos interrumpida';
        }
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error("Error en registro:", error);
    throw error;
  }
};

/**
 * Servicio para obtener la lista de todos los usuarios.
 */
export const getUsers = async () => {
  try {
    const token = localStorage.getItem('token');
    
    if (!token) {
      throw new Error('No hay una sesión activa. Por favor, inicie sesión.');
    }

    const response = await fetch(`${API_URL}/users`, {
      method: 'GET',
      headers: { 
        'Authorization': `Bearer ${token}`, // ¡Confirmado: Esto es vital!
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      if (response.status === 401) throw new Error('Sesión expirada o token inválido');
      if (response.status === 403) throw new Error('No tienes permisos para ver esta lista');
      throw new Error('Error al obtener la lista de usuarios');
    }

    const data = await response.json();
    
    // Normalización de respuesta: siempre devolvemos un array
    if (data && Array.isArray(data.data)) return data.data;
    if (Array.isArray(data)) return data;
    return []; 
  } catch (error) {
    console.error("Error obteniendo usuarios:", error);
    throw error;
  }
};

export const updateUser = async (userId, userData) => {
  try {
    const token = localStorage.getItem('token');
    
    const response = await fetch(`${API_URL}/users/${userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(userData)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Error del servidor: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error en updateUser service:", error);
    throw error;
  }
};

/**
 * Servicio para obtener el perfil completo del usuario autenticado.
 * Realiza una consulta directa a la base de datos para obtener información actualizada.
 */
export const getProfile = async () => {
  try {
    const token = localStorage.getItem('token');
    
    if (!token) {
      throw new Error('No hay una sesión activa. Por favor, inicie sesión.');
    }

    const response = await fetch(`${API_URL}/auth/profile`, {
      method: 'GET',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Error al obtener el perfil del usuario');
    }

    const data = await response.json();
    return data.data; // El backend devuelve { success: true, data: { ... } }
  } catch (error) {
    console.error("Error obteniendo el perfil:", error);
    throw error;
  }
};

/**
 * Servicio para solicitar la recuperación de contraseña.
 */
export const forgotPassword = async (email) => {
  try {
    const response = await fetch(`${API_URL}/auth/forgot_password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });

    // Manejo seguro de la respuesta para evitar el error "Unexpected token <"
    const contentType = response.headers.get("content-type");
    let data = null;
    
    if (contentType && contentType.includes("application/json")) {
      data = await response.json();
    }

    if (!response.ok) {
      const errorMessage = data?.message || (response.status === 404 
        ? 'El endpoint de recuperación no fue encontrado (404).' 
        : `Error del servidor (${response.status})`);
      throw new Error(errorMessage);
    }

    return data;
  } catch (error) {
    console.error("Error en forgotPassword service:", error);
    throw error;
  }
};

/**
 * Servicio para restablecer la contraseña usando un token.
 */
export const resetPassword = async (token, password) => {
  try {
    const response = await fetch(`${API_URL}/auth/reset_password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password })
    });

    const contentType = response.headers.get("content-type");
    let data = null;
    
    if (contentType && contentType.includes("application/json")) {
      data = await response.json();
    }

    if (!response.ok) {
      const errorMessage = data?.message || `Error del servidor (${response.status})`;
      throw new Error(errorMessage);
    }

    return data;
  } catch (error) {
    console.error("Error en resetPassword service:", error);
    throw error;
  }
};

/**
 * Servicio para actualizar el perfil del usuario autenticado (propio).
 */
export const updateProfile = async (profileData) => {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/auth/profile_update`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      // profileData ahora contendrá { currentPassword, password: newPassword, ...otros }
      body: JSON.stringify(profileData) 
    });

    const data = await response.json();
    if (!response.ok) {
      // El backend ahora enviará mensajes específicos como 'La contraseña actual es incorrecta.'
      // Es bueno pasarlos directamente al usuario.
      throw new Error(data.message || `Error ${response.status}: ${response.statusText}`);
    }
    return data;
  } catch (error) {
    console.error("Error en updateProfile service:", error);
    throw error;
  }
};

/**
 * Servicio para obtener la lista de todos los postulantes desde la tabla 'postulantes'.
 */
export const getApplicants = async () => {
  try {
    const token = localStorage.getItem('token');
    
    if (!token) {
      throw new Error('No hay una sesión activa. Por favor, inicie sesión.');
    }

    const response = await fetch(`${API_URL}/applicants`, {
      method: 'GET',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Error al obtener la lista de postulantes');
    }

    const data = await response.json();
    // Retornamos los datos normalizados (asumiendo que el backend los envía en .data o raíz)
    return Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : []);
  } catch (error) {
    console.error("Error obteniendo postulantes:", error);
    throw error;
  }
};

/**
 * Servicio para obtener la lista de todos los proveedores desde la tabla 'suppliers'.
 */
export const getSuppliers = async () => {
  try {
    const token = localStorage.getItem('token');
    
    if (!token) {
      throw new Error('No hay una sesión activa. Por favor, inicie sesión.');
    }

    const response = await fetch(`${API_URL}/suppliers`, {
      method: 'GET',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Error al obtener la lista de proveedores');
    }

    const data = await response.json();
    return Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : []);
  } catch (error) {
    console.error("Error obteniendo proveedores:", error);
    throw error;
  }
};

/**
 * Servicio para actualizar el nombre de un proveedor.
 */
export const updateSupplier = async (supplierId, name, userId) => {
  try {
    const token = localStorage.getItem('token');
    
    const response = await fetch(`${API_URL}/suppliers/${supplierId}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ name, user_id: userId })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Error al actualizar el proveedor');
    }
    return await response.json();
  } catch (error) {
    console.error("Error en updateSupplier service:", error);
    throw error;
  }
};

/**
 * Servicio para registrar un nuevo proveedor.
 */
export const registerSupplier = async (supplierData) => {
  try {
    const token = localStorage.getItem('token');
    
    if (!token) {
      throw new Error('No hay una sesión activa. Por favor, inicie sesión.');
    }

    const response = await fetch(`${API_URL}/suppliers`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(supplierData)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Error al registrar el proveedor');
    }
    return await response.json();
  } catch (error) {
    // Si es un error de red (el backend no responde o el proxy falló)
    if (error.name === 'TypeError') {
      throw new Error('No se pudo establecer conexión con el servidor para registrar el proveedor. Verifica que el backend esté encendido y el proxy de Vite configurado.');
    }
    throw error;
  }
};

/**
 * Servicio para crear una nueva entrada en la tabla master_inputs.
 */
export const assignMasterInput = async (assignmentData) => {
  try {
    const token = localStorage.getItem('token');
    
    if (!token) {
      throw new Error('No hay una sesión activa.');
    }

    const response = await fetch(`${API_URL}/master-inputs`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(assignmentData)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Error al realizar la asignación en master_inputs');
    }
    return await response.json();
  } catch (error) {
    if (error.name === 'TypeError') {
      throw new Error('No se pudo establecer conexión con el servidor.');
    }
    throw error;
  }
};

/**
 * Elimina una asignación del maestro de insumos.
 */
export const deleteMasterInput = async (id) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('No hay una sesión activa.');

    const response = await fetch(`${API_URL}/master-inputs/${id}`, {
      method: 'DELETE',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('No se pudo eliminar la asignación.');
    }
    return await response.json();
  } catch (error) {
    console.error("Error en deleteMasterInput:", error);
    throw error;
  }
};

/**
 * Registra una nueva factura y sus insumos asociados.
 */
export const registerBill = async (billData) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('No hay una sesión activa.');

    const response = await fetch(`${API_URL}/bill-data`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(billData)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Error al registrar la factura');
    }
    return await response.json();
  } catch (error) {
    console.error("Error en registerBill:", error);
    throw error;
  }
};

/**
 * Obtiene la lista de facturas registradas (cabeceras).
 */
export const getBills = async () => {
  try {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('No hay una sesión activa.');

    const response = await fetch(`${API_URL}/bill-data`, {
      method: 'GET',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) throw new Error('Error al obtener las facturas');
    const data = await response.json();
    return Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : []);
  } catch (error) {
    console.error("Error en getBills:", error);
    throw error;
  }
};

/**
 * Obtiene los insumos asociados a una factura específica.
 */
export const getBillInputsByBillId = async (billId) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('No hay una sesión activa.');

    const response = await fetch(`${API_URL}/bill-inputs?bill_data_id=${billId}`, {
      method: 'GET',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) throw new Error('Error al obtener los detalles de la factura');
    const data = await response.json();
    const rawItems = Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : []);

    // 1. Filtrado de seguridad por ID de factura
    const items = rawItems.filter(item => String(item.bill_data_id) === String(billId))
      .map(item => ({ ...item, bill_inputs_id: item.id })); // Mapeo preventivo del ID correcto

    // 2. ENRIQUECIMIENTO PROFUNDO: Obtenemos el catálogo maestro y los detalles técnicos específicos
    // Esto soluciona el problema de los valores permitidos en 0.00
    const masterRes = await fetch(`${API_URL}/master-inputs`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (masterRes.ok) {
      const master = await masterRes.json();
      const masterList = master.data || master;

      const typeEndpoints = {
        1: 'inputs-stuffing', 2: 'inputs-stamps', 3: 'inputs-oring', 4: 'inputs-chemicals',
        5: 'inputs-bags', 6: 'inputs-cardboard', 7: 'inputs-cases', 8: 'inputs-thermoplastics',
        9: 'inputs-cameras', 10: 'inputs-collars'
      };

      // Procesamos cada ítem en paralelo para traer sus medidas reales
      const enrichedItems = await Promise.all(items.map(async (item) => {
        const masterInfo = masterList.find(m => String(m.id) === String(item.master_inputs_id));
        if (!masterInfo) return item;

        // Verificamos que tengamos un endpoint y un ID técnico válido para evitar errores 500 en el backend
        const endpoint = typeEndpoints[masterInfo.type_inputs_id];
        if (!endpoint || !masterInfo.inputs_id) return { ...item, ...masterInfo, id: item.id };

        const specRes = await fetch(`${API_URL}/${endpoint}/${masterInfo.inputs_id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        const specData = specRes.ok ? await specRes.json() : {};
        const specs = specData.data || specData;

        return { 
          ...item, 
          ...masterInfo, 
          ...specs,
          // Normalización para compatibilidad con la DB (Typos incluidos)
          heigth: specs.heigth || specs.height || 0,
          heigth_a: specs.heigth_a || specs.height_a || 0,
          heigth_b: specs.heigth_b || specs.height_b || 0,
          widht: specs.widht || specs.width || 0,
          bathc_date: specs.bathc_date || specs.batch_date || '',
          batch_date: specs.batch_date || specs.bathc_date || '',
          bill_inputs_id: item.id, // ID explícito para la clave foránea de inspección
          id: item.id 
        };
      }));

      return enrichedItems;
    }

    return items;
  } catch (error) {
    console.error("Error en getBillInputsByBillId:", error);
    throw error;
  }
};

/**
 * Obtiene los resultados de inspección para un insumo específico.
 */
export const getInspectionResults = async (typeId, billInputId) => {
  const INSPECTION_ENDPOINTS = {
    1: 'inspection-stuffing', 2: 'inspection-stamps', 3: 'inspection-oring',
    4: 'inspection-chemicals', 5: 'inspection-bags', 6: 'inspection-cardboard',
    7: 'inspection-cases', 8: 'inspection-thermoplastics', 9: 'inspection-cameras',
    10: 'inspection-collars'
  };

  try {
    const token = localStorage.getItem('token');
    const endpoint = INSPECTION_ENDPOINTS[typeId];
    if (!endpoint) return [];

    const response = await fetch(`${API_URL}/${endpoint}?bill_inputs_id=${billInputId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) return [];
    const data = await response.json();
    return Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : []);
  } catch (error) {
    console.error("Error en getInspectionResults:", error);
    return [];
  }
};

/**
 * Obtiene el conteo de inspecciones por estado (Aprobado, Observacion, Rechazado, Incompleta).
 */
export const getInspectionStats = async () => {
  try {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('No hay una sesión activa.');

    const response = await fetch(`${API_URL}/inspection-stats/status-counts`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) throw new Error('Error al obtener estadísticas de inspección');
    const data = await response.json();
    return data.data || { Aprobado: 0, Observacion: 0, Rechazado: 0, Incompleta: 0, 'Aprobado Observacion': 0, 'Rechazado Observacion': 0 };
  } catch (error) {
    console.error("Error en getInspectionStats:", error);
    return { Aprobado: 0, Observacion: 0, Rechazado: 0, Incompleta: 0, 'Aprobado Observacion': 0, 'Rechazado Observacion': 0 };
  }
};

/**
 * Obtiene el flujo de manufactura del mes actual (facturas + insumos + conteo de inspecciones).
 */
export const getManufacturingFlow = async () => {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/manufacturing-flow/current-month`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) return [];
    const data = await response.json();
    return Array.isArray(data.data) ? data.data : [];
  } catch (error) {
    console.error("Error en getManufacturingFlow:", error);
    return [];
  }
};

/**
 * Actualiza el dictamen final (status y observación) de una inspección.
 */
export const updateInspection = async (typeId, inspectionId, updateData) => {
  const INSPECTION_ENDPOINTS = {
    1: 'inspection-stuffing', 2: 'inspection-stamps', 3: 'inspection-oring',
    4: 'inspection-chemicals', 5: 'inspection-bags', 6: 'inspection-cardboard',
    7: 'inspection-cases', 8: 'inspection-thermoplastics', 9: 'inspection-cameras',
    10: 'inspection-collars'
  };

  try {
    const token = localStorage.getItem('token');
    const endpoint = INSPECTION_ENDPOINTS[typeId];
    if (!endpoint) throw new Error(`No se encontró endpoint para el tipo ${typeId}`);

    const response = await fetch(`${API_URL}/${endpoint}/${inspectionId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(updateData)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      // Si el backend envía un mensaje de validación, lo mostramos
      throw new Error(errorData.message || `Error ${response.status}: No se pudo actualizar el dictamen.`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error en updateInspection:", error);
    throw error;
  }
};

/**
 * Registra los resultados de una inspección técnica en la tabla correspondiente según el tipo.
 */
export const registerInspection = async (typeId, inspectionData) => {
  const INSPECTION_ENDPOINTS = {
    1: 'inspection-stuffing', 2: 'inspection-stamps', 3: 'inspection-oring',
    4: 'inspection-chemicals', 5: 'inspection-bags', 6: 'inspection-cardboard',
    7: 'inspection-cases', 8: 'inspection-thermoplastics', 9: 'inspection-cameras',
    10: 'inspection-collars'
  };

  try {
    const token = localStorage.getItem('token');
    const endpoint = INSPECTION_ENDPOINTS[typeId];
    if (!endpoint) throw new Error(`No se encontró endpoint de inspección para el tipo ${typeId}`);

    // Limpieza de datos: eliminamos campos que no pertenecen a las tablas de inspección
    // para evitar errores 400 por parte del backend (Zod/Validación)
    const { numero_recepcion, ...cleanData } = inspectionData;

    const response = await fetch(`${API_URL}/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(cleanData)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Error al registrar la inspección');
    }
    return await response.json();
  } catch (error) {
    console.error("Error en registerInspection:", error);
    throw error;
  }
};

/**
 * Registra un detalle de insumo vinculado a una factura específica.
 */
export const registerBillInput = async (inputData) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('No hay una sesión activa.');

    const response = await fetch(`${API_URL}/bill-inputs`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(inputData)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Error al registrar el insumo de la factura');
    }
    return await response.json();
  } catch (error) {
    console.error("Error en registerBillInput:", error);
    throw error;
  }
};

/**
 * Actualiza el estado de una asignación en el maestro de insumos (Vigente/Desuso).
 */
export const updateMasterInputStatus = async (id, updateData) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('No hay una sesión activa.');

    const response = await fetch(`${API_URL}/master-inputs/${id}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(updateData)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Error al actualizar el estado del insumo');
    }
    return await response.json();
  } catch (error) {
    console.error("Error en updateMasterInputStatus:", error);
    throw error;
  }
};

/**
 * Obtiene los insumos del maestro filtrados directamente por el ID del proveedor.
 */
export const getMasterInputsBySupplier = async (supplierId) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('No hay una sesión activa.');

    const response = await fetch(`${API_URL}/master-inputs?suppliers_id=${supplierId}&status=Vigente`, {
      method: 'GET',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Error al obtener los insumos del proveedor');
    }

    const data = await response.json();
    return Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : []);
  } catch (error) {
    console.error("Error en getMasterInputsBySupplier:", error);
    throw error;
  }
};

/**
 * Servicio para enviar una nueva postulación desde el sitio web público.
 */
export const submitApplication = async (applicantData) => {
  try {
    const response = await fetch(`${API_URL}/applicants`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(applicantData)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Error al enviar la postulación');
    }

    return await response.json();
  } catch (error) {
    console.error("Error en submitApplication:", error);
    throw error;
  }
};

/**
 * Actualiza un postulante completo (status, entrevistas, resultados).
 */
export const updateApplicant = async (applicantId, data) => {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/applicants/${applicantId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Error al actualizar el postulante');
    }

    return await response.json();
  } catch (error) {
    console.error("Error en updateApplicant:", error);
    throw error;
  }
};

/**
 * Obtiene la URL del CV de un postulante.
 */
export const getCvUrl = (applicantId) => {
  const token = localStorage.getItem('token');
  return `${API_URL}/applicants/${applicantId}/cv?token=${token}`;
};

/**
 * Descarta un postulante (status = 'Descartado').
 */
export const discardApplicant = async (applicantId) => {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/applicants/${applicantId}/discard`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Error al descartar el postulante');
    }

    return await response.json();
  } catch (error) {
    console.error("Error en discardApplicant:", error);
    throw error;
  }
};

/**
 * Contrata un postulante (status = 'Contratado').
 */
export const hireApplicant = async (applicantId) => {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/applicants/${applicantId}/hire`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Error al contratar el postulante');
    }

    return await response.json();
  } catch (error) {
    console.error("Error en hireApplicant:", error);
    throw error;
  }
};

/**
 * Mapeo interno para dirigir las peticiones a los módulos específicos del backend.
 * Se usa como fallback si typeInputsList no está disponible.
 */
const INPUT_ENDPOINTS = {
  'Stuffing': 'inputs-stuffing',
  'Stamps': 'inputs-stamps',
  'Oring': 'inputs-oring',
  'Chemicals': 'inputs-chemicals',
  'Bags': 'inputs-bags',
  'Cardboard': 'inputs-cardboard',
  'Cases': 'inputs-cases',
  'Thermoplastics': 'inputs-thermoplastics',
  'Packings': 'inputs-cameras',
  'Collars': 'inputs-collars'
};

/**
 * Caché local de la lista de tipos de insumo (cargada desde type_inputs).
 * Se usa para resolver endpoints dinámicamente sin depender del mapping hardcoded.
 */
let _typesList = [];

export const setTypesList = (types) => {
  _typesList = Array.isArray(types) ? types : [];
};

export const getTypesList = () => _typesList;

const resolveEndpoint = (tipo) => {
  const found = _typesList.find(t => t.name === tipo || String(t.id) === String(tipo));
  if (found && found.endpoint) return found.endpoint;
  return INPUT_ENDPOINTS[tipo] || null;
};

const resolveTypeId = (tipo) => {
  const found = _typesList.find(t => t.name === tipo || String(t.id) === String(tipo));
  return found ? found.id : null;
};

/**
 * Obtiene el catálogo global desde la tabla maestra.
 */
export const getInsumos = async () => {
  try {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('No hay una sesión activa.');
    const response = await fetch(`${API_URL}/master-inputs?status=Vigente`, {
      method: 'GET',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Error al obtener la lista de insumos del servidor');
    }

    const data = await response.json();
    return Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : []);
  } catch (error) {
    console.error("Error obteniendo insumos:", error);
    throw error;
  }
};

/**
 * Obtiene la lista de tipos de insumo desde la tabla 'types_inputs'.
 */
export const getTypeInputs = async () => {
  try {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('No hay una sesión activa.');

    const response = await fetch(`${API_URL}/type-inputs`, {
      method: 'GET',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Error al obtener los tipos de insumo del servidor');
    }

    const data = await response.json();
    return Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : []);
  } catch (error) {
    console.error("Error obteniendo tipos de insumo:", error);
    throw error;
  }
};

/**
 * Registra un nuevo tipo de insumo en la tabla 'type_inputs'.
 */
export const createTypeInput = async (name) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('No hay una sesión activa.');

    const response = await fetch(`${API_URL}/type-inputs`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ name })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Error al registrar el tipo de insumo');
    }

    return await response.json();
  } catch (error) {
    console.error("Error en createTypeInput:", error);
    throw error;
  }
};

/**
 * Actualiza un tipo de insumo existente en la tabla 'type_inputs'.
 */
export const updateTypeInput = async (id, name) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('No hay una sesión activa.');

    const response = await fetch(`${API_URL}/type-inputs/${id}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ name })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Error al actualizar el tipo de insumo');
    }

    return await response.json();
  } catch (error) {
    console.error("Error en updateTypeInput:", error);
    throw error;
  }
};

/**
 * Elimina un tipo de insumo de la tabla 'type_inputs'.
 */
export const deleteTypeInput = async (id) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('No hay una sesión activa.');

    const response = await fetch(`${API_URL}/type-inputs/${id}`, {
      method: 'DELETE',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Error al eliminar el tipo de insumo');
    }

    return await response.json();
  } catch (error) {
    console.error("Error en deleteTypeInput:", error);
    throw error;
  }
};

/**
 * Obtiene la lista de insumos de una tabla técnica específica usando el endpoint unificado.
 * Resuelve el type_inputs_id desde la caché de tipos y llama a GET /api/type-inputs/:id/inputs.
 * Inyecta el nombre del tipo ('tipo') en cada resultado para compatibilidad con el frontend.
 */
export const getInsumosByType = async (tipo) => {
  try {
    const token = localStorage.getItem('token');
    
    // 1. Resolver el ID del tipo desde la caché local
    const typeId = resolveTypeId(tipo);
    if (!typeId) {
      throw new Error(`No se encontró configuración para el tipo: ${tipo}`);
    }

    // Buscar el nombre del tipo para inyectarlo en los resultados
    const typeRecord = _typesList.find(t => t.id === typeId || String(t.id) === String(typeId));
    const typeName = typeRecord ? typeRecord.name : tipo;

    // 2. Usar el nuevo endpoint unificado del backend
    const response = await fetch(`${API_URL}/type-inputs/${typeId}/inputs`, {
      method: 'GET',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) throw new Error('Error al conectar con la tabla técnica');
    const data = await response.json();
    const results = Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : []);
    // Inyectamos 'tipo' (nombre) para que el frontend mantenga el mapeo de labels y filtrado
    return results.map(item => ({ ...item, tipo: typeName }));
  } catch (error) {
    console.error("Error en getInsumosByType:", error);
    throw error;
  }
};

/**
 * Registra un insumo en su tabla técnica específica según el tipo.
 * Resuelve el endpoint dinámicamente desde la caché de tipos.
 */
export const registerInsumo = async (insumoData) => {
  try {
    const token = localStorage.getItem('token');
    
    // Extraemos 'tipo' para la URL y lo quitamos del cuerpo para evitar error 400
    const { tipo, ...dataToSend } = insumoData;
    const modulePath = resolveEndpoint(tipo);
    
    if (!modulePath) {
      throw new Error(`No se encontró un endpoint configurado para el tipo: ${tipo}`);
    }

    const response = await fetch(`${API_URL}/${modulePath}`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(dataToSend)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Error al registrar el insumo en la base de datos');
    }

    return await response.json();
  } catch (error) {
    console.error("Error en registerInsumo:", error);
    throw error;
  }
};

/**
 * Servicio para actualizar las especificaciones de un insumo existente.
 * Resuelve el endpoint dinámicamente desde la caché de tipos.
 */
export const updateInsumo = async (id, insumoData) => {
  try {
    const token = localStorage.getItem('token');
    
    const { tipo, ...dataToSend } = insumoData;
    const modulePath = resolveEndpoint(tipo);

    if (!modulePath) {
      throw new Error(`No se encontró un endpoint configurado para el tipo: ${tipo}`);
    }

    const response = await fetch(`${API_URL}/${modulePath}/${id}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(dataToSend)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Error al actualizar el insumo');
    }

    return await response.json();
  } catch (error) {
    console.error("Error en updateInsumo:", error);
    throw error;
  }
};

/** 
 * Obtiene un aviso específico por su ID desde el backend.
 */
export const getNoticeById = async (id) => {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/website-notice/${id}`, {
      method: 'GET',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    if (!response.ok) throw new Error('Error al recuperar el aviso específico');
    
    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error("Error en getNoticeById API:", error);
    throw error;
  }
};

/** 
 * Publica oficialmente un aviso (marca status = true en la DB).
 */
export const publishNotice = async (id) => {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/website-notice/${id}/publish`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    if (!response.ok) throw new Error('No se pudo publicar el aviso.');
    return await response.json();
  } catch (error) {
    console.error("Error en publishNotice API:", error);
    throw error;
  }
};

/** 
 * Obtiene la lista de todos los avisos registrados en 'mensajes_web'.
 */
export const getNoticesList = async () => {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/website-notice`, {
      method: 'GET',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    if (!response.ok) throw new Error('Error al obtener lista de avisos');
    
    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error("Error en getNoticesList API:", error);
    return [];
  }
};

/** 
 * Obtiene el aviso activo para el sitio web.
 */
export const getWebsiteNotice = async () => {
  try {
    const response = await fetch(`${API_URL}/website-notice`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    const data = await response.json();
    
    // El backend devuelve un array de mensajes ordenados por ID desc.
    // Tomamos el primero (el más reciente) como el aviso activo.
    const latestNotice = Array.isArray(data.data) && data.data.length > 0 ? data.data[0] : null;
    
    return { 
      enabled: !!latestNotice, 
      note: latestNotice?.note || 'Actualmente no contamos con vacantes disponibles.', 
      name: latestNotice?.name || '',
      id: latestNotice?.id || null
    };
  } catch (error) {
    return { enabled: false, note: "No disponible", name: 'none' };
  }
};

/** 
 * Actualiza o crea el aviso que se mostrará en el sitio web.
 */
export const updateWebsiteNotice = async (name, note) => {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/website-notice`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ name, note })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Error al actualizar aviso');
    }
    const res = await response.json();
    return { id: res.data.id, name: res.data.name, note: res.data.note, enabled: true };
  } catch (error) {
    throw error;
  }
};

// =============================================
// Servicios de Notificaciones
// =============================================

export const getNotifications = async () => {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_URL}/notificaciones`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!response.ok) throw new Error('Error al obtener notificaciones');
  const res = await response.json();
  return res.data;
};

export const getUnreadCount = async () => {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_URL}/notificaciones/unread-count`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!response.ok) throw new Error('Error al obtener conteo');
  const res = await response.json();
  return res.data.count;
};

export const markNotificationAsRead = async (id) => {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_URL}/notificaciones/${id}/read`, {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!response.ok) throw new Error('Error al marcar notificación');
  return await response.json();
};

export const markAllNotificationsAsRead = async () => {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_URL}/notificaciones/read-all`, {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!response.ok) throw new Error('Error al marcar notificaciones');
  return await response.json();
};

// =============================================
// Servicios de Foto de Perfil
// =============================================

export const uploadProfilePhoto = async (file) => {
  const token = localStorage.getItem('token');
  const formData = new FormData();
  formData.append('photo', file);
  const response = await fetch(`${API_URL}/profile-photo/photo`, {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || 'Error al subir la foto');
  }
  return await response.json();
};

export const getPendingPhotos = async () => {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_URL}/profile-photo/pending`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!response.ok) throw new Error('Error al obtener fotos pendientes');
  const res = await response.json();
  return res.data;
};

export const approveProfilePhoto = async (userId) => {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_URL}/profile-photo/${userId}/approve`, {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!response.ok) throw new Error('Error al aprobar foto');
  return await response.json();
};

export const rejectProfilePhoto = async (userId) => {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_URL}/profile-photo/${userId}/reject`, {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!response.ok) throw new Error('Error al rechazar foto');
  return await response.json();
};