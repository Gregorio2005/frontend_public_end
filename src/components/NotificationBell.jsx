import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { getNotifications, getUnreadCount, markNotificationAsRead, markAllNotificationsAsRead } from '../services/authService';

const NotificationBell = forwardRef((props, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  const fetchUnreadCount = async () => {
    try {
      const count = await getUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      console.error('Error al obtener notificaciones no leídas:', error);
    }
  };

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const data = await getNotifications();
      setNotifications(data);
    } catch (error) {
      console.error('Error al obtener notificaciones:', error);
    } finally {
      setLoading(false);
    }
  };

  // Exponer refresh al padre via ref
  useImperativeHandle(ref, () => ({
    refresh: async () => {
      await fetchUnreadCount();
      if (isOpen) await fetchNotifications();
    }
  }));

  useEffect(() => {
    fetchUnreadCount();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = async () => {
    const willOpen = !isOpen;
    setIsOpen(willOpen);
    if (willOpen) {
      await fetchNotifications();
      await fetchUnreadCount();
    }
  };

  const handleMarkAsRead = async (id) => {
    try {
      await markNotificationAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, status: 'Visto' } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error al marcar notificación:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, status: 'Visto' })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error al marcar todas:', error);
    }
  };

  const formatTime = (dateStr) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now - d;
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'Ahora';
    if (diffMin < 60) return `Hace ${diffMin}m`;
    const diffHrs = Math.floor(diffMin / 60);
    if (diffHrs < 24) return `Hace ${diffHrs}h`;
    const diffDays = Math.floor(diffHrs / 24);
    return `Hace ${diffDays}d`;
  };

  return (
    <div className="notification-bell-container" ref={dropdownRef}>
      <button className="notification-bell-btn" onClick={handleToggle}>
        <span className="material-symbols-outlined">notifications</span>
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div className="notification-dropdown">
          <div className="notification-dropdown-header">
            <h4>Notificaciones</h4>
            {unreadCount > 0 && (
              <button className="notification-mark-all" onClick={handleMarkAllAsRead}>
                Marcar todo como leído
              </button>
            )}
          </div>

          <div className="notification-list">
            {loading ? (
              <div className="notification-empty">Cargando...</div>
            ) : notifications.length === 0 ? (
              <div className="notification-empty">No hay notificaciones</div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`notification-item ${n.status === 'No visto' ? 'unread' : ''}`}
                  onClick={() => n.status === 'No visto' && handleMarkAsRead(n.id)}
                >
                  <div className="notification-item-icon">
                    <span className="material-symbols-outlined">
                      {n.status === 'No visto' ? 'circle' : 'check_circle'}
                    </span>
                  </div>
                  <div className="notification-item-content">
                    <p className="notification-item-message">{n.message}</p>
                    <span className="notification-item-time">{formatTime(n.created_at)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
});

export default NotificationBell;
