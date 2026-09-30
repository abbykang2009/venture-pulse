import { AlertTriangle, Loader2, X } from 'lucide-react';

export default function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Delete',
  danger = true,
  isBusy = false,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  isBusy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-3xl p-6 space-y-4 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-xl border ${danger ? 'bg-rose-950/50 border-rose-900/60 text-rose-400' : 'bg-white/10 border-white/20 text-white'}`}>
              <AlertTriangle className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-white">{title}</h3>
          </div>
          <button onClick={onCancel} className="p-1 text-neutral-400 hover:text-white rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-neutral-300 leading-relaxed">{message}</p>

        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={onCancel}
            disabled={isBusy}
            className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold rounded-xl transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isBusy}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition disabled:opacity-50 flex items-center gap-2 ${
              danger ? 'bg-rose-700 hover:bg-rose-600 text-white' : 'bg-white hover:bg-neutral-200 text-black'
            }`}
          >
            {isBusy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
