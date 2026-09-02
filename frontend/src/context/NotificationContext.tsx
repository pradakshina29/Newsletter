import React, { createContext, useContext, useState, ReactNode } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, Sparkles, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

export interface ModalDialogOptions {
  title?: string;
  message: string;
  type?: ToastType;
  confirmLabel?: string;
  cancelLabel?: string;
  isConfirm?: boolean;
  onConfirm?: () => void;
  onCancel?: () => void;
}

interface NotificationContextType {
  showToast: (message: string, type?: ToastType, title?: string, duration?: number) => void;
  showSuccess: (message: string, title?: string) => void;
  showError: (message: string, title?: string) => void;
  showWarning: (message: string, title?: string) => void;
  showInfo: (message: string, title?: string) => void;
  showAlert: (message: string, title?: string, type?: ToastType) => Promise<void>;
  showConfirm: (message: string, title?: string, confirmLabel?: string, cancelLabel?: string) => Promise<boolean>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [modalOptions, setModalOptions] = useState<ModalDialogOptions | null>(null);
  const [modalResolver, setModalResolver] = useState<((val: boolean) => void) | null>(null);

  const showToast = (message: string, type: ToastType = 'info', title?: string, duration: number = 4000) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const newToast: ToastItem = { id, type, title, message, duration };

    setToasts(prev => [...prev, newToast]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const showSuccess = (message: string, title: string = 'Success') => showToast(message, 'success', title);
  const showError = (message: string, title: string = 'Notice') => showToast(message, 'error', title);
  const showWarning = (message: string, title: string = 'Attention') => showToast(message, 'warning', title);
  const showInfo = (message: string, title: string = 'Information') => showToast(message, 'info', title);

  const showAlert = (message: string, title: string = 'System Message', type: ToastType = 'info'): Promise<void> => {
    return new Promise((resolve) => {
      setModalOptions({
        title,
        message,
        type,
        confirmLabel: 'OK',
        isConfirm: false
      });
      setModalResolver(() => () => {
        setModalOptions(null);
        resolve();
      });
    });
  };

  const showConfirm = (message: string, title: string = 'Confirm Action', confirmLabel: string = 'Confirm', cancelLabel: string = 'Cancel'): Promise<boolean> => {
    return new Promise((resolve) => {
      setModalOptions({
        title,
        message,
        type: 'warning',
        confirmLabel,
        cancelLabel,
        isConfirm: true
      });
      setModalResolver(() => (result: boolean) => {
        setModalOptions(null);
        resolve(result);
      });
    });
  };

  const handleModalConfirm = () => {
    if (modalResolver) modalResolver(true);
  };

  const handleModalCancel = () => {
    if (modalResolver) modalResolver(false);
  };

  return (
    <NotificationContext.Provider
      value={{
        showToast,
        showSuccess,
        showError,
        showWarning,
        showInfo,
        showAlert,
        showConfirm
      }}
    >
      {children}

      {/* --- TOAST NOTIFICATIONS CONTAINER --- */}
      <div className="fixed top-5 right-5 z-[9999] flex flex-col space-y-3 max-w-md w-full pointer-events-none px-4">
        {toasts.map((t) => {
          let bgClass = "bg-slate-900/95 border-slate-750 text-white shadow-2xl backdrop-blur-md";
          let icon = <Sparkles className="w-5 h-5 text-blue-400 shrink-0" />;
          let barColor = "bg-blue-500";

          if (t.type === 'success') {
            bgClass = "bg-emerald-950/90 dark:bg-emerald-950/95 border-emerald-500/40 text-emerald-100 shadow-2xl shadow-emerald-950/40 backdrop-blur-md";
            icon = <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />;
            barColor = "bg-emerald-400";
          } else if (t.type === 'error') {
            bgClass = "bg-rose-950/90 dark:bg-rose-950/95 border-rose-500/40 text-rose-100 shadow-2xl shadow-rose-950/40 backdrop-blur-md";
            icon = <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />;
            barColor = "bg-rose-400";
          } else if (t.type === 'warning') {
            bgClass = "bg-amber-950/90 dark:bg-amber-950/95 border-amber-500/40 text-amber-100 shadow-2xl shadow-amber-950/40 backdrop-blur-md";
            icon = <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />;
            barColor = "bg-amber-400";
          } else if (t.type === 'info') {
            bgClass = "bg-indigo-950/90 dark:bg-indigo-950/95 border-indigo-500/40 text-indigo-100 shadow-2xl shadow-indigo-950/40 backdrop-blur-md";
            icon = <Info className="w-5 h-5 text-indigo-400 shrink-0" />;
            barColor = "bg-indigo-400";
          }

          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-start space-x-3.5 p-4 rounded-2xl border transition-all duration-300 transform animate-in fade-in slide-in-from-top-4 relative overflow-hidden ${bgClass}`}
            >
              <div className="pt-0.5">{icon}</div>
              <div className="flex-1 min-w-0 pr-2">
                {t.title && (
                  <h4 className="text-xs font-bold uppercase tracking-wider mb-0.5 opacity-90">{t.title}</h4>
                )}
                <p className="text-xs font-medium leading-relaxed break-words">{t.message}</p>
              </div>
              <button
                onClick={() => removeToast(t.id)}
                className="p-1 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
              <div className={`absolute bottom-0 left-0 right-0 h-0.5 opacity-60 ${barColor}`} />
            </div>
          );
        })}
      </div>

      {/* --- CUSTOM MODAL DIALOG (REPLACES Native ALERT & CONFIRM) --- */}
      {modalOptions && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-start space-x-4">
              <div className={`p-3 rounded-2xl ${
                modalOptions.type === 'error' ? 'bg-rose-500/10 text-rose-500' :
                modalOptions.type === 'warning' ? 'bg-amber-500/10 text-amber-500' :
                modalOptions.type === 'success' ? 'bg-emerald-500/10 text-emerald-500' :
                'bg-primary/10 text-primary'
              }`}>
                {modalOptions.type === 'error' ? <AlertCircle className="w-6 h-6" /> :
                 modalOptions.type === 'warning' ? <AlertTriangle className="w-6 h-6" /> :
                 modalOptions.type === 'success' ? <CheckCircle2 className="w-6 h-6" /> :
                 <Sparkles className="w-6 h-6" />}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {modalOptions.title || 'System Message'}
                </h3>
                <p className="mt-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium whitespace-pre-wrap">
                  {modalOptions.message}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              {modalOptions.isConfirm && (
                <button
                  onClick={handleModalCancel}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  {modalOptions.cancelLabel || 'Cancel'}
                </button>
              )}
              <button
                onClick={handleModalConfirm}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-lg transition-all transform active:scale-95 ${
                  modalOptions.type === 'error' ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/30' :
                  modalOptions.type === 'warning' ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/30' :
                  modalOptions.type === 'success' ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30' :
                  'bg-primary hover:bg-blue-600 shadow-primary/30'
                }`}
              >
                {modalOptions.confirmLabel || 'OK'}
              </button>
            </div>
          </div>
        </div>
      )}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};
