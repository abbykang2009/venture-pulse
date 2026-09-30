import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, PlusCircle, ShieldAlert, RefreshCw, Users, Shield, Lock } from 'lucide-react';
import { STAGES, MAX_CIRCLE_MEMBERS } from '../constants';
import DealCard from '../components/DealCard';
import DealDetailModal from '../components/DealDetailModal';
import CreateDealModal from '../components/CreateDealModal';
import type { Deal, CircleSummary, User } from '../types';

export default function FeedPage({
  user,
  isAdminMode,
  isUserAdmin,
  onUnauthorized,
}: {
  user: User;
  isAdminMode: boolean;
  isUserAdmin: boolean;
  onUnauthorized: () => void;
}) {
  const navigate = useNavigate();
  const [tab, setTab] = useState<'feed' | 'circles'>('feed');

  const [selectedStage, setSelectedStage] = useState('All');
  const [deals, setDeals] = useState<Deal[]>([]);
  const [isLoadingDeals, setIsLoadingDeals] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [circles, setCircles] = useState<CircleSummary[]>([]);
  const [isLoadingCircles, setIsLoadingCircles] = useState(true);
  const [newCircleName, setNewCircleName] = useState('');
  const [isCreatingCircle, setIsCreatingCircle] = useState(false);
  const [circleError, setCircleError] = useState<string | null>(null);
  const [joiningId, setJoiningId] = useState<string | null>(null);

  const fetchDeals = async () => {
    setIsLoadingDeals(true);
    try {
      const res = await fetch('/api/deals');
      if (res.status === 401) return onUnauthorized();
      if (res.ok) setDeals(await res.json());
    } catch (err) {
      console.error('Error fetching deals:', err);
    } finally {
      setIsLoadingDeals(false);
    }
  };

  const fetchCircles = async () => {
    setIsLoadingCircles(true);
    try {
      const res = await fetch('/api/circles');
      if (res.status === 401) return onUnauthorized();
      if (res.ok) setCircles(await res.json());
    } catch (err) {
      console.error('Error fetching circles:', err);
    } finally {
      setIsLoadingCircles(false);
    }
  };

  useEffect(() => {
    fetchDeals();
    fetchCircles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDeleteDeal = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this opportunity?')) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/deals?id=${id}`, { method: 'DELETE' });
      if (res.status === 401) return onUnauthorized();
      if (res.ok) setDeals((prev) => prev.filter((d) => d.id !== id));
    } catch (err) {
      console.error('Error deleting deal:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const handleCreateCircle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCircleName.trim()) return;
    setIsCreatingCircle(true);
    setCircleError(null);
    try {
      const res = await fetch('/api/circles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCircleName.trim() }),
      });
      if (res.status === 401) return onUnauthorized();
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setCircleError(data.error || 'Could not create circle.');
      } else {
        setNewCircleName('');
        navigate(`/circles/${data.id}`);
      }
    } catch (err) {
      console.error('Error creating circle:', err);
      setCircleError('Network error. Please try again.');
    } finally {
      setIsCreatingCircle(false);
    }
  };

  const handleRequestJoin = async (circleId: string) => {
    setJoiningId(circleId);
    try {
      const res = await fetch(`/api/circles/${circleId}/join`, { method: 'POST' });
      if (res.status === 401) return onUnauthorized();
      if (res.ok) setCircles((prev) => prev.map((c) => (c.id === circleId ? { ...c, isPending: true } : c)));
    } catch (err) {
      console.error('Error requesting to join circle:', err);
    } finally {
      setJoiningId(null);
    }
  };

  const myCircles = circles.filter((c) => c.isMember);
  const filteredDeals = selectedStage === 'All' ? deals : deals.filter((d) => d.stage === selectedStage);

  return (
    <div className="space-y-6">
      <div className="bg-neutral-900/60 border border-neutral-800/80 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-sm text-neutral-300">
          <ShieldAlert className="w-5 h-5 text-white shrink-0" />
          <span>
            {isAdminMode ? (
              <><strong className="text-white">ADMIN MODE ENABLED:</strong> You can tag posts as Business or VC, and manage all listings.</>
            ) : (
              <><strong className="text-white">NETWORK FEED:</strong> Click any card to inspect full details, community verification scores, or post notes.</>
            )}
          </span>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-neutral-200 text-black text-sm font-semibold rounded-xl transition shadow-lg shadow-black/40"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Post New Opportunity</span>
        </button>
      </div>

      <div className="flex items-center bg-neutral-900 border border-neutral-800 rounded-xl p-1 text-sm font-medium w-fit">
        <button
          onClick={() => setTab('feed')}
          className={`px-4 py-2 rounded-lg transition-all ${tab === 'feed' ? 'bg-white text-black shadow-sm font-semibold' : 'text-neutral-400 hover:text-white'}`}
        >
          Global Feed
        </button>
        <button
          onClick={() => setTab('circles')}
          className={`px-4 py-2 rounded-lg transition-all flex items-center gap-1.5 ${tab === 'circles' ? 'bg-white text-black shadow-sm font-semibold' : 'text-neutral-400 hover:text-white'}`}
        >
          <Users className="w-4 h-4" /> Private Circles
        </button>
      </div>

      {tab === 'feed' ? (
        <>
          <div className="flex flex-wrap items-center gap-2 pt-2">
            {['All', ...STAGES].map((s) => (
              <button
                key={s}
                onClick={() => setSelectedStage(s)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
                  selectedStage === s
                    ? 'bg-white text-black shadow-md shadow-black/40'
                    : 'bg-neutral-900/80 border border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {isLoadingDeals ? (
            <div className="border border-neutral-800/80 bg-neutral-900/30 rounded-2xl p-16 flex flex-col items-center justify-center gap-3 text-neutral-400 font-medium">
              <Loader2 className="w-6 h-6 animate-spin text-white" />
              <span>Loading opportunities...</span>
            </div>
          ) : filteredDeals.length === 0 ? (
            <div className="border border-neutral-800/80 bg-neutral-900/30 rounded-2xl p-16 text-center text-neutral-400 font-medium">
              No opportunities found for this stage.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 pt-2">
              {filteredDeals.map((deal) => (
                <DealCard
                  key={deal.id}
                  deal={deal}
                  onOpen={() => setSelectedDealId(deal.id)}
                  canDelete={isAdminMode}
                  isDeleting={deletingId === deal.id}
                  onDelete={(e) => handleDeleteDeal(e, deal.id)}
                />
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="space-y-4 pt-2">
          <form onSubmit={handleCreateCircle} className="flex flex-wrap items-center gap-2 bg-neutral-900/60 border border-neutral-800/80 rounded-2xl p-3">
            <input
              type="text"
              maxLength={80}
              placeholder="New circle name..."
              value={newCircleName}
              onChange={(e) => setNewCircleName(e.target.value)}
              className="flex-1 min-w-[180px] bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-white/60"
            />
            <button
              type="submit"
              disabled={isCreatingCircle || !newCircleName.trim()}
              className="px-4 py-2 bg-white hover:bg-neutral-200 text-black text-xs font-semibold rounded-xl transition disabled:opacity-50 flex items-center gap-1.5"
            >
              {isCreatingCircle && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Create Circle
            </button>
          </form>
          {circleError && <p className="text-xs text-rose-400 px-1">{circleError}</p>}

          {isLoadingCircles ? (
            <div className="border border-neutral-800/80 bg-neutral-900/30 rounded-2xl p-16 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-white" />
            </div>
          ) : circles.length === 0 ? (
            <div className="border border-neutral-800/80 bg-neutral-900/30 rounded-2xl p-16 text-center text-neutral-400 font-medium">
              No circles yet. Create the first one above.
            </div>
          ) : (
            <div className="space-y-2">
              {circles.map((c) => (
                <div
                  key={c.id}
                  onClick={() => navigate(`/circles/${c.id}`)}
                  className="flex flex-wrap items-center gap-4 bg-neutral-900/70 border border-neutral-800 hover:border-white/40 rounded-2xl px-5 py-4 cursor-pointer transition"
                >
                  <div className="flex items-center gap-2 min-w-[160px]">
                    {c.isCreator ? <Shield className="w-4 h-4 text-white shrink-0" /> : <Lock className="w-4 h-4 text-neutral-500 shrink-0" />}
                    <span className="font-bold text-white text-sm truncate">{c.name}</span>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-neutral-400">
                    <Users className="w-3.5 h-3.5" /> {c.memberCount}/{MAX_CIRCLE_MEMBERS}
                  </div>

                  <div className="text-xs text-neutral-400">
                    <span className="text-emerald-400 font-semibold">{c.verifiedCount}</span> verified · {c.dealCount} shared
                  </div>

                  <div className="flex-1" />

                  {c.isMember ? (
                    <span className="px-4 py-2 bg-neutral-800 text-neutral-300 text-xs font-semibold rounded-xl">Open</span>
                  ) : c.isPending ? (
                    <span className="px-4 py-2 bg-neutral-800 text-neutral-500 text-xs font-semibold rounded-xl">Requested</span>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRequestJoin(c.id);
                      }}
                      disabled={joiningId === c.id || c.memberCount >= MAX_CIRCLE_MEMBERS}
                      className="px-4 py-2 bg-white hover:bg-neutral-200 text-black text-xs font-semibold rounded-xl transition disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {joiningId === c.id && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      {c.memberCount >= MAX_CIRCLE_MEMBERS ? 'Full' : 'Request to Join'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {selectedDealId && (
        <DealDetailModal
          dealId={selectedDealId}
          onClose={() => setSelectedDealId(null)}
          onUnauthorized={onUnauthorized}
          onVoted={fetchDeals}
        />
      )}

      {isModalOpen && (
        <CreateDealModal
          isAdminMode={isAdminMode}
          myCircles={myCircles}
          onClose={() => setIsModalOpen(false)}
          onUnauthorized={onUnauthorized}
          onCreated={() => {
            setIsModalOpen(false);
            fetchDeals();
            fetchCircles();
          }}
        />
      )}
    </div>
  );
}
