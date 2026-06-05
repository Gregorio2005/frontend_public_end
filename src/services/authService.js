/**
 * Servicio para manejar la autenticación mediante fetch.
 */
const API_URL = '/api'; // Usamos un proxy definido en vite.config.js

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
 * Servicio para actualizar el estado de un postulante.
 */
export const updateApplicantStatus = async (applicantId, newStatus) => {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/applicants/${applicantId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ status: newStatus })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Error al actualizar el estado');
    }

    return await response.json();
  } catch (error) {
    console.error("Error en updateApplicantStatus:", error);
    throw error;
  }
};

/**
 * Mapeo interno para dirigir las peticiones a los módulos específicos del backend.
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
 * Obtiene el catálogo global desde la tabla maestra.
 */
export const getInsumos = async () => {
  try {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('No hay una sesión activa.');
    const response = await fetch(`${API_URL}/master-inputs`, {
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
 * Obtiene la lista de insumos de una tabla técnica específica.
 * Esto permite realizar búsquedas directas en el módulo seleccionado.
 */
export const getInsumosByType = async (tipo) => {
  try {
    const token = localStorage.getItem('token');
    const modulePath = INPUT_ENDPOINTS[tipo];
    
    if (!modulePath) {
      throw new Error(`No se encontró un endpoint para el tipo: ${tipo}`);
    }

    const response = await fetch(`${API_URL}/${modulePath}`, {
      method: 'GET',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) throw new Error('Error al conectar con la tabla técnica');
    const data = await response.json();
    const results = Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : []);
    // Inyectamos el tipo para que el frontend mantenga el mapeo de labels
    return results.map(item => ({ ...item, tipo }));
  } catch (error) {
    console.error("Error en getInsumosByType:", error);
    throw error;
  }
};

/**
 * Registra un insumo en su tabla técnica específica según el tipo.
 */
export const registerInsumo = async (insumoData) => {
  try {
    const token = localStorage.getItem('token');
    
    // Extraemos 'tipo' para la URL y lo quitamos del cuerpo para evitar error 400
    const { tipo, ...dataToSend } = insumoData;
    const modulePath = INPUT_ENDPOINTS[tipo];
    
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
 */
export const updateInsumo = async (id, insumoData) => {
  try {
    const token = localStorage.getItem('token');
    
    const { tipo, ...dataToSend } = insumoData;
    const modulePath = INPUT_ENDPOINTS[tipo];

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