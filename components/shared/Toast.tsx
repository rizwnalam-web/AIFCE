import React, { useEffect } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'deleted';

interface ToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

const Toast: React.FC<ToastProps> = ({ message, type, onClose, duration = 4500, action }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const getStyles = () => {
    switch (type) {
      case 'success':
        return { bg: 'bg-green-950/90', border: 'border-green-500/30', text: 'text-green-200', iconBg: 'bg-green-500/20', icon: '✓' };
      case 'deleted':
      case 'error':
        return { bg: 'bg-red-950/90', border: 'border-red-500/30', text: 'text-red-200', iconBg: 'bg-red-500/20', icon: type === 'deleted' ? '🗑' : '⚠️' };
      case 'info':
      default:
        return { bg: 'bg-gray-800', border: 'border-gray-600', text: 'text-gray-200', iconBg: 'bg-gray-600/20', icon: 'ℹ' };
    }
  };

  const styles = getStyles();

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-fade-in shadow-2xl">
      <div className={`flex items-center gap-3 px-5 py-4 rounded-xl border ${styles.bg} ${styles.border} ${styles.text}`}>
        <div className={`p-1.5 rounded-full ${styles.iconBg}`}>
          {styles.icon}
        </div>
        <p className="text-sm font-medium pr-4">{message}</p>
        {action && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              action.onClick();
            }}
            className="mr-2 px-3 py-1 text-xs font-bold uppercase tracking-wider bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg transition-colors whitespace-nowrap"
          >
            {action.label}
          </button>
        )}
        <button 
          onClick={onClose} 
          className="text-gray-400 hover:text-white text-lg font-semibold select-none focus:outline-none"
        >
          &times;
        </button>
      </div>
    </div>
  );
};

export default Toast;