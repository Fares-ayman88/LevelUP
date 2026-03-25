import { useEffect } from 'react';
import { toast } from 'react-toastify';

export default function Toast({ message, onClose, duration = 2800 }) {
  useEffect(() => {
    const normalized = (message || '').toString().trim();
    if (!normalized) return;
    const toastId = `legacy-toast:${normalized}`;
    toast(normalized, {
      toastId,
      autoClose: duration,
      onClose: () => onClose?.(),
    });
  }, [message, duration, onClose]);

  return null;
}

