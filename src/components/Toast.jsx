import { useEffect } from 'react';
import { toast } from 'react-toastify';

export default function Toast({ message, onClose, duration = 2800, type = 'default' }) {
  useEffect(() => {
    const normalized = (message || '').toString().trim();
    if (!normalized) return;
    const toastId = `legacy-toast:${normalized}`;
    toast(normalized, {
      toastId,
      autoClose: duration,
      type: type === 'error' ? 'error' : type === 'success' ? 'success' : 'default',
      onClose: () => onClose?.(),
    });
  }, [message, duration, onClose, type]);

  return null;
}

