import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Loader2, ArrowLeft, Users, Shield, PlusCircle, Trash2, Check, X as XIcon, UserPlus,
} from 'lucide-react';
import DealCard from '../components/DealCard';
import DealDetailModal from '../components/DealDetailModal';
import CreateDealModal from '../components/CreateDealModal';
import ConfirmDialog from '../components/ConfirmDialog';
import { MAX_CIRCLE_MEMBERS } from '../constants';
import type { CircleDetail, Deal } from '../types';

export default function CirclePage({
  currentUserId,
  isAdminMode,
  onUnauthorized,
}: {
  currentUserId: string;
  isAdminMode: boolean;
  onUnauthorized: () => void;
}) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [circle, setCircle] = useState<CircleDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [isLoadingDeals, setIsLoadingDeals] = useState(false);

  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recommendInput, setRecommendInput] = useState('');
  const [showDeleteCircle, setShowDeleteCircle] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<{ id: string; name: string } | null>(null);

  const loadCircle = async () => {
    setIsLoading(true);
    setNotFound(false);
    try {
      const res = await fetch(`/api/circles/${id}`);
      if (res.status === 401) return onUnauthorized();
      if (res.status === 404) {
        setNotFound(true);
      } else if (res.ok) {
        setCircle(await res.json());
      }
    } catch (err) {
      console.error('Error fetching circle:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadDeals = async () => {
    setIsLoadingDeals(true);
    try {
      const res = await fetch(`/api/deals?circleId=${id}`);
      if (res.status === 401) return onUnauthorized();
      if (res.ok) setDeals(await res.json());
    } catch (err) {
      console.error('Error fetching circle deals:', err);
    } finally {
      setIsLoadingDeals(false);
    }
  };

  useEffect(() => {
    loadCircle();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (circle?.isMember) loadDeals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [circle?.isMember, id]);

  const act = async (fn: () => Promise<Response>, after?: () => void) => {
    setIsBusy(true);
    setError(null);
    try {
      const res = await fn();
      if (res.status === 401) return onUnauthorized();
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Something went wrong.');
      } else {
        after?.();
      }
    } catch (err) {
      console.error('Circle action failed:', err);
      setError('Network error. Please try again.');
    } finally {
      setIsBusy(false);
    }
  };

  const requestJoin = () => act(() => fetch(`/api/circles/${id}/join`, { method: 'POST' }), loadCircle);
  const cancelRequest = () => act(() => fetch(`/api/circles/${id}/join`, { method: 'DELETE' }), loadCircle);
  const leaveCircle = () => {
    if (!window.confirm('Leave this circle?')) return;
    act(() => fetch(`/api/circles/${id}/join`, { method: 'DELETE' }), () => navigate('/'));
  };
  const approveRequest = (telegramId: string) =>
    act(
      () => fetch(`/api/circles/${id}/approve`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ telegramId }) }),
      loadCircle
    );
  const rejectRequest = (telegramId: string) =>
    act(() => fetch(`/api/circles/${id}/join?telegramId=${telegramId}`, { method: 'DELETE' }), loadCircle);
  const removeMember = () => {
    if (!removeTarget) return;
    act(
      () => fetch(`/api/circles/${id}/members`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ telegramId: removeTarget.id }) }),
      () => { setRemoveTarget(null); loadCircle(); }
    );
  };
  const deleteCircle = () => act(() => fetch(`/api/circles/${id}`, { method: 'DELETE' }), () => navigate('/'));

  const submitRecommend = (e: React.FormEvent) => {
    e.preventDefault();
    const username = recommendInput.trim();
    if (!username) return;
    act(
      () => fetch(`/api/circles/${id}/recommend`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username }) }),
      () => { setRecommendInput(''); loadCircle(); }
    );
  };

  if (isLoading) {
    return <div className="py-16 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-white" /></div>;
  }
  if (notFound || !circle) {
    return (
      <div className="space-y-4">
        <Link to="/" className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white transition"><ArrowLeft className="w-3.5 h-3.5" /> Back to Feed</Link>
        <div className="border border-neutral-800/80 bg-neutral-900/30 rounded-2xl p-16 text-center text-neutral-400 font-medium">Circle not found.</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link to="/" className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white transition"><ArrowLeft className="w-3.5 h-3.5" /> Back to Feed</Link>

      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              {circle.isCreator && <Shield className="w-4 h-4 text-white" />}
              <h2 className="text-xl font-bold text-white">{circle.name}</h2>
            </div>
            <p className="text-xs text-neutral-400 mt-1">
              {circle.memberCount}/{MAX_CIRCLE_MEMBERS} members · <span className="text-emerald-400 font-semibold">{circle.verifiedCount}</span> verified postings · {circle.dealCount} shared
            </p>
          </div>

          <div className="flex items-center gap-2">
            {circle.isMember && (
              <button
                onClick={() => setIsCreateOpen(true)}
                className="px-4 py-2 bg-white hover:bg-neutral-200 text-black text-xs font-semibold rounded-xl transition shadow-lg shadow-black/40 flex items-center gap-1.5"
              >
                <PlusCircle className="w-3.5 h-3.5" /> Post to Circle
              </button>
            )}
            {!circle.isMember && !circle.isPending && (
              <button onClick={requestJoin} disabled={isBusy || circle.memberCount >= MAX_CIRCLE_MEMBERS} className="px-4 py-2 bg-white hover:bg-neutral-200 text-black text-xs font-semibold rounded-xl transition disabled:opacity-50">
                {circle.memberCount >= MAX_CIRCLE_MEMBERS ? 'Full' : 'Request to Join'}
              </button>
            )}
            {!circle.isMember && circle.isPending && (
              <button onClick={cancelRequest} disabled={isBusy} className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold rounded-xl transition disabled:opacity-50">
                Cancel Request
              </button>
            )}
            {circle.isMember && !circle.isCreator && (
              <button onClick={leaveCircle} disabled={isBusy} className="px-3 py-2 bg-neutral-800 hover:bg-rose-950/50 text-neutral-300 hover:text-rose-300 text-xs font-semibold rounded-xl transition disabled:opacity-50">
                Leave
              </button>
            )}
            {circle.isCreator && (
              <button onClick={() => setShowDeleteCircle(true)} disabled={isBusy} className="p-2 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-900/60 rounded-xl transition">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {error && <p className="text-xs text-rose-400 bg-rose-950/30 border border-rose-900/50 rounded-xl px-3 py-2">{error}</p>}
      </div>

      {circle.isMember && (
        <>
          {circle.isCreator && circle.pendingRequests && circle.pendingRequests.length > 0 && (
            <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-4 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">Pending Requests ({circle.pendingRequests.length})</h3>
              {circle.pendingRequests.map((r) => (
                <div key={r.id} className="flex items-center gap-3 bg-neutral-950/60 border border-neutral-800/80 rounded-xl p-3">
                  {r.photoUrl ? (
                    <img src={r.photoUrl} alt="" referrerPolicy="no-referrer" className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white text-xs">?</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{r.username ? `@${r.username}` : r.firstName}</p>
                    {r.recommendedByName && <p className="text-[11px] text-neutral-500">Recommended by {r.recommendedByName}</p>}
                  </div>
                  <button onClick={() => approveRequest(r.id)} disabled={isBusy} className="p-1.5 bg-emerald-950/50 hover:bg-emerald-900/60 border border-emerald-800/60 text-emerald-300 rounded-lg transition"><Check className="w-4 h-4" /></button>
                  <button onClick={() => rejectRequest(r.id)} disabled={isBusy} className="p-1.5 bg-rose-950/50 hover:bg-rose-900/60 border border-rose-800/60 text-rose-300 rounded-lg transition"><XIcon className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          )}

          <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-4 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5"><Users className="w-4 h-4" /> Members</h3>
            <form onSubmit={submitRecommend} className="flex gap-2">
              <input
                type="text"
                placeholder="Recommend a Telegram @username to join..."
                value={recommendInput}
                onChange={(e) => setRecommendInput(e.target.value)}
                className="flex-1 bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-white/60"
              />
              <button type="submit" disabled={isBusy || !recommendInput.trim()} className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold rounded-xl transition disabled:opacity-50 flex items-center gap-1.5">
                <UserPlus className="w-3.5 h-3.5" /> Recommend
              </button>
            </form>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(circle.members || []).map((m) => (
                <div key={m.id} className="flex items-center gap-2 bg-neutral-950/60 border border-neutral-800/80 rounded-xl p-2.5">
                  {m.photoUrl ? (
                    <img src={m.photoUrl} alt="" referrerPolicy="no-referrer" className="w-7 h-7 rounded-full object-cover" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-white text-xs">?</div>
                  )}
                  <Link to={`/u/${m.id}`} className="flex-1 min-w-0 text-xs text-neutral-200 hover:text-white truncate">
                    {m.username ? `@${m.username}` : m.firstName}
                  </Link>
                  {m.role === 'creator' ? (
                    <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-white text-black">Creator</span>
                  ) : circle.isCreator ? (
                    <button onClick={() => setRemoveTarget({ id: m.id, name: m.username ? `@${m.username}` : m.firstName })} className="p-1 text-neutral-500 hover:text-rose-400 transition">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-white mb-3">Shared Postings</h3>
            {isLoadingDeals ? (
              <div className="py-12 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-white" /></div>
            ) : deals.length === 0 ? (
              <div className="border border-neutral-800/80 bg-neutral-900/30 rounded-2xl p-16 text-center text-neutral-400 font-medium">
                Nothing shared in this circle yet.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {deals.map((deal) => (
                  <DealCard key={deal.id} deal={deal} onOpen={() => setSelectedDealId(deal.id)} canDelete={isAdminMode} />
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {selectedDealId && (
        <DealDetailModal dealId={selectedDealId} onClose={() => setSelectedDealId(null)} onUnauthorized={onUnauthorized} onVoted={loadDeals} />
      )}

      {isCreateOpen && (
        <CreateDealModal
          isAdminMode={isAdminMode}
          myCircles={[{ id: circle.id, name: circle.name, createdAt: circle.createdAt, memberCount: circle.memberCount, dealCount: circle.dealCount, verifiedCount: circle.verifiedCount, isCreator: circle.isCreator, isMember: true, isPending: false }]}
          defaultCircleId={circle.id}
          onClose={() => setIsCreateOpen(false)}
          onUnauthorized={onUnauthorized}
          onCreated={() => { setIsCreateOpen(false); loadDeals(); loadCircle(); }}
        />
      )}

      {showDeleteCircle && (
        <ConfirmDialog
          title="Delete this circle?"
          message="This permanently deletes the circle and every posting shared inside it, for all members. This cannot be undone."
          confirmLabel="Delete Circle"
          isBusy={isBusy}
          onConfirm={deleteCircle}
          onCancel={() => setShowDeleteCircle(false)}
        />
      )}
      {removeTarget && (
        <ConfirmDialog
          title={`Remove ${removeTarget.name}?`}
          message="They'll lose access to this circle and its shared postings. They can request to join again later."
          confirmLabel="Remove Member"
          isBusy={isBusy}
          onConfirm={removeMember}
          onCancel={() => setRemoveTarget(null)}
        />
      )}
    </div>
  );
}
