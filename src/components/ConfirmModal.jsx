import React from 'react';
import '../pages/Dashboard.css';

const ConfirmModal = ({ isOpen, title, message, onConfirm, onCancel, confirmText = "Confirmar", cancelText = "Cancelar", type = "danger", overlayStyle = {}, alarm = false }) => {
  if (!isOpen) return null;

  return (
    <div className={`modal-overlay ${alarm ? 'alarm' : ''}`} style={{ zIndex: 4000, ...overlayStyle }}>
      <div className="modal-container">
        <div className={`modal-header ${type}`}>
          <span className="material-symbols-outlined">
            {type === 'danger' ? 'warning' : 'info'}
          </span>
          <h3>{title}</h3>
        </div>
        <div className="modal-body">
          <p>{message}</p>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onCancel}>
            {cancelText}
          </button>
          <button className={`btn ${type === 'danger' ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;