import React, { memo } from 'react';
import logoImg from '../assets/logo.jpeg'; // Ajusta la ruta según tu estructura

const Logo = ({ variant = 'default', className = '' }) => {
  // Definimos tamaños por defecto según el caso de uso
  const sizeClasses = {
    small: 'h-4 w-auto',      // Para el Navbar superior (reducido para un header más compacto y alineado con el texto)
    medium: 'h-16 w-auto',    // Para el Sidebar o menús laterales
    large: 'h-24 w-auto',     // Para la pantalla de Login / Bienvenida
    default: 'h-12 w-auto'
  };

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <img 
        src={logoImg} 
        alt="Sealing Products C.A. Logo" 
        className={`${sizeClasses[variant] || sizeClasses.default} object-contain`}
      />
    </div>
  );
};

export default memo(Logo);