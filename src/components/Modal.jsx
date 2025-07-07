import React from 'react';
import '../styles/Modal.css';

const Modal = ({ isOpen, onClose, onConfirm, message, style }) => {
  if (!isOpen) return null;

  const handleOverlayClick = (e) => {
    if (e.target.className === 'modal-overlay') {
      console.log('Modal: Closing modal via overlay click');
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-content" style={style}>
        <button
          className="modal-close-btn"
          onClick={() => {
            console.log('Modal: Closing modal via close button');
            onClose();
          }}
          style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            background: 'none',
            border: 'none',
            fontSize: '16px',
            cursor: 'pointer',
            color: '#dc3545',
          }}
          title="Fermer"
        >
          ✕
        </button>
        <div className="modal-body">{message}</div>
        {onConfirm && (
          <div className="modal-buttons">
            <button
              onClick={() => {
                console.log('Modal: Confirm button clicked');
                onConfirm();
              }}
              className="modal-confirm-btn"
            >
              Confirmer
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;