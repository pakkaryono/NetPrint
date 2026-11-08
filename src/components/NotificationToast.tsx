import React from 'react';
import { LabNotification } from '../types';
import { Bell, AlertTriangle, CheckCircle2, Clock, X, Trash2 } from 'lucide-react';

interface NotificationToastProps {
  notifications: LabNotification[];
  isOpen: boolean;
  onClose: () => void;
  onMarkRead: (id: string) => void;
  onClearAll: () => void;
}

export const NotificationToast: React.FC<NotificationToastProps> = ({
  notifications,
  isOpen,
  onClose,
  onMarkRead,
  onClearAll,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end p-4 sm:p-6 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full shadow-2xl overflow-hidden mt-12 animate-in fade-in slide-in-from-top-4 duration-200">
        {/* Header */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-red-600" />
            <h3 className="font-extrabold text-slate-900 text-sm">Notifikasi Lab Komputer</h3>
            <span className="text-[10px] bg-red-100 text-red-800 px-2 py-0.5 rounded-full font-mono font-bold">
              {notifications.length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {notifications.length > 0 && (
              <button
                onClick={onClearAll}
                title="Hapus Semua"
                className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-slate-100 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Notification List */}
        <div className="max-h-[460px] overflow-y-auto p-3 space-y-2.5">
          {notifications.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              Belum ada notifikasi baru.
            </div>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => onMarkRead(notif.id)}
                className={`p-3 rounded-2xl border text-xs cursor-pointer transition-all ${
                  notif.type === 'warning'
                    ? 'bg-orange-50 border-orange-300 text-orange-950'
                    : notif.type === 'payment'
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                    : notif.type === 'completed'
                    ? 'bg-blue-50 border-blue-300 text-blue-950'
                    : 'bg-slate-50 border-slate-200 text-slate-800'
                } ${!notif.read ? 'ring-2 ring-red-400/50 shadow-xs' : 'opacity-85'}`}
              >
                <div className="flex items-start gap-2.5">
                  {notif.type === 'warning' && (
                    <AlertTriangle className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
                  )}
                  {notif.type === 'payment' && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  )}
                  {notif.type === 'completed' && (
                    <Clock className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  )}
                  {notif.type === 'booking' && (
                    <Bell className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  )}

                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-xs">{notif.title}</span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {new Date(notif.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className="text-[11px] mt-1 text-slate-600 leading-relaxed font-medium">
                      {notif.message}
                    </p>
                    {notif.computerCode && (
                      <span className="inline-block mt-1 font-mono text-[10px] font-bold text-red-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                        {notif.computerCode}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
