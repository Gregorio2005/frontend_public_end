# Proyecto SICVIC - Frontend

Este es el repositorio del frontend para el sistema **SICVIC**, desarrollado con **React** y **Vite**.

## 📂 Estructura del Proyecto

La organización del código dentro de la carpeta `src/` sigue un diseño modular para facilitar el mantenimiento:

- **assets/**: Recursos estáticos como imágenes, logotipos, fuentes y estilos CSS globales.
- **components/**: Componentes de UI reutilizables (botones, campos de texto, barras de navegación, etc.).
- **hooks/**: Funciones personalizadas (Custom Hooks) para encapsular lógica de estado compleja.
- **pages/**: Vistas principales de la aplicación. Cada archivo aquí representa una ruta o página completa.
- **services/**: Lógica de comunicación con el backend (peticiones a la API, servicios de autenticación).
- **utils/**: Funciones de ayuda general, validadores de formularios y constantes globales.
- **App.jsx**: El componente principal que gestiona el enrutamiento y la estructura base.
- **main.jsx**: Punto de entrada de la aplicación donde se inicializa React.

## 🚀 Comandos Rápidos

### Instalación
```bash
npm install
```

### Inicio del proyecto
```bash
npm run dev
```

### Construcción (Production)
```bash
npm run build
```
## 🔑 Roles de Acceso (Entorno de Desarrollo)

Para probar las funcionalidades por rol, utilice las credenciales de prueba configuradas en la base de datos local. Los roles disponibles son:

- **Administrador**
- **Jefe de Calidad**
- **Jefe de Ingeniería**
- **Trabajador**

*Nota: Las contraseñas se encuentran encriptadas en la base de datos mediante Bcrypt.*