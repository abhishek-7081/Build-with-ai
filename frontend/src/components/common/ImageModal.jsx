import React from "react";

export function ImageModal({ imgSrc, onClose }) {
  if (!imgSrc) return null;

  return (
    <div className="image-modal-overlay" onClick={onClose}>
      <div className="image-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="image-modal-close" onClick={onClose}>
          ✕
        </button>
        <img src={imgSrc} alt="Full resolution evidence" />
      </div>
    </div>
  );
}
