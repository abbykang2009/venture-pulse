import { Building2, Images, Loader2, Trash2, Pencil, MapPin, CheckCircle, AlertTriangle, HelpCircle } from 'lucide-react';
import type { Deal } from '../types';
import { ADMIN_TAG_LABELS } from '../constants';

export function getVerificationStatus(verifications: number = 0, disputes: number = 0) {
  const diff = verifications - disputes;
  if (diff >= 2) {
    return { label: 'Verified', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40', icon: CheckCircle };
  }
  if (disputes - verifications >= 2) {
    return { label: 'Disputed', color: 'bg-rose-500/20 text-rose-400 border-rose-500/40', icon: AlertTriangle };
  }
  return { label: 'Unverified', color: 'bg-amber-500/20 text-amber-400 border-amber-500/40', icon: HelpCircle };
}

export function tagMeta(tag?: string | null) {
  if (tag === 'VC') return { label: ADMIN_TAG_LABELS.VC, classes: 'bg-white text-black border-neutral-300' };
  if (tag === 'Business') return { label: ADMIN_TAG_LABELS.Business, classes: 'bg-neutral-900/90 text-neutral-200 border-neutral-600/60' };
  return null;
}

export function formatPrice(d: Pick<Deal, 'budget' | 'currency' | 'rate'>) {
  return d.budget != null && d.currency ? `${d.currency} ${d.budget.toLocaleString()}` : d.rate || '-';
}

export default function DealCard({
  deal,
  onOpen,
  canDelete,
  isDeleting,
  onDelete,
  onEdit,
}: {
  deal: Deal;
  onOpen: () => void;
  canDelete?: boolean;
  isDeleting?: boolean;
  onDelete?: (e: React.MouseEvent) => void;
  onEdit?: (e: React.MouseEvent) => void;
}) {
  const status = getVerificationStatus(deal.verifications, deal.disputes);
  const StatusIcon = status.icon;
  const meta = tagMeta(deal.tag);

  return (
    <div
      onClick={onOpen}
      className="group relative aspect-square rounded-2xl overflow-hidden bg-neutral-900 border border-neutral-800 hover:border-white/40 cursor-pointer transition-all shadow-md hover:shadow-2xl hover:scale-[1.02]"
    >
      {deal.cover?.kind === 'video' ? (
        <video
          src={`${deal.cover.url}#t=0.1`}
          muted
          playsInline
          preload="metadata"
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
      ) : deal.cover ? (
        <img
          src={deal.cover.url}
          alt={deal.name}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-neutral-900 via-neutral-900 to-black flex items-center justify-center">
          <Building2 className="w-12 h-12 text-neutral-700 group-hover:text-white/40 transition" />
        </div>
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/40 to-transparent opacity-90 group-hover:opacity-80 transition" />

      {meta && (
        <div className="absolute top-3 right-3 z-10">
          <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border backdrop-blur-md shadow-md ${meta.classes}`}>
            {meta.label}
          </span>
        </div>
      )}

      <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5">
        <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border backdrop-blur-md ${status.color}`}>
          <StatusIcon className="w-3 h-3" />
          {status.label}
        </span>

        {deal.isMine && onEdit && (
          <button
            onClick={onEdit}
            title="Edit"
            className="p-1.5 bg-neutral-950/80 hover:bg-neutral-800 text-neutral-400 hover:text-white rounded-lg border border-neutral-800 backdrop-blur-md transition"
          >
            <Pencil className="w-3 h-3" />
          </button>
        )}

        {canDelete && (
          <button
            onClick={onDelete}
            disabled={isDeleting}
            title="Delete"
            className="p-1.5 bg-neutral-950/80 hover:bg-rose-900/80 text-neutral-400 hover:text-rose-300 rounded-lg border border-neutral-800 backdrop-blur-md transition"
          >
            {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
          </button>
        )}
      </div>

      <div className="absolute bottom-0 inset-x-0 p-3.5 z-10 space-y-1">
        <span className="inline-block text-[10px] font-semibold text-neutral-300 uppercase tracking-wider">{deal.stage}</span>
        <h3 className="text-sm font-bold text-white truncate leading-tight group-hover:text-white transition">{deal.name}</h3>
        <div className="flex items-center justify-between text-neutral-400 text-xs pt-0.5">
          <span className="flex items-center gap-1 text-[11px] truncate">
            <MapPin className="w-3 h-3 text-white shrink-0" />
            {deal.location}
          </span>
          {(deal.mediaCount ?? 0) > 1 && (
            <span className="flex items-center gap-1 text-[10px] text-neutral-300">
              <Images className="w-3 h-3" />
              {deal.mediaCount}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
