import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Loader2, User as UserIcon, Briefcase, Bell, Users, MessageSquare, Trash2, Lock as CircleLock, ShieldCheck,
} from 'lucide-react';
import DealCard from '../components/DealCard';
import DealDetailModal from '../components/DealDetailModal';
import ConfirmDialog from '../components/ConfirmDialog';
import type { Deal, User, CircleSummary } from '../types';

const displayName = (u: User) => (u.username ? `@${u.username}` : u.firstName || 'Investor');

export default function ProfilePage({
  user,
  onUnauthorized,
  onProfileDeleted,
}: {
  user: User;
  onUnauthorized: () => void;
  onProfileDeleted: () => void;
}) {
  const [tab, setTab] = useState<'myPosts' | 'notifications' | 'circles'>('myPosts');
  const [deals, setDeals] = useState<Deal[]>([]);
  const [isLoadingDeals, setIsLoadingDeals] = useState(true);
  const [circles, setCircles] = useState<CircleSummary[]>([]);
  const [isLoadingCircles, setIsLoadingCircles] = useState(true);
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);

  const [confirmAction, setConfirmAction] = useState<'deals' | 'profile' | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchDeals = async () => {
    setIsLoadingDeals(true);
    try {
      const res = await fetch('/api/deals');
      if (res.status === 401) return onUnauthorized();
      if (res.ok) {
        const all: Deal[] = await res.json();
        setDeals(all.filter((d) => d.isMine));
      }
    } catch (err) {
      console.error('Error fetching your postings:', err);
    } finally {
      setIsLoadingDeals(false);
    }
  };

  const fetchCircles = async () => {
    setIsLoadingCircles(true);
    try {
      const res = await fetch('/api/circles');
      if (res.status === 401) return onUnauthorized();
      if (res.ok) {
        const all: CircleSummary[] = await res.json();
        setCircles(all.filter((c) => c.isMember));
      }
    } catch (err) {
      console.error('Error fetching your circles:', err);
    } finally {
      setIsLoadingCircles(false);
    }
  };

  useEffect(() => {
    fetchDeals();
    fetchCircles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runConfirmedAction = async () => {
    if (!confirmAction) return;
    setIsBusy(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/auth/me?scope=${confirmAction}`, { method: 'DELETE' });
      if (res.status === 401) return onUnauthorized();
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setActionError(data.error || 'Could not complete this action.');
        setIsBusy(false);
        return;
      }
      if (confirmAction === 'deals') {
        setDeals([]);
        setConfirmAction(null);
        setIsBusy(false);
      } else {
        onProfileDeleted();
      }
    } catch (err) {
      console.error('Error running account action:', err);
      setActionError('Network error. Please try again.');
      setIsBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl overflow-hidden shadow-2xl">
        <div className="p-6 pb-4 border-b border-neutral-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {user.photoUrl ? (
              <img src={user.photoUrl} alt="" referrerPolicy="no-referrer" className="w-12 h-12 rounded-2xl object-cover border border-white/20" />
            ) : (
              <div className="p-3 bg-white/10 border border-white/20 rounded-2xl text-white">
                <UserIcon className="w-6 h-6" />
              </div>
            )}
            <div>
              <h2 className="text-lg font-bold text-white">{displayName(user)}</h2>
              <p className="text-xs text-neutral-400">
                {[user.firstName, user.lastName].filter(Boolean).join(' ')} · Telegram ID <span className="font-mono">{user.id}</span>
                {user.isAdmin && (
                  <span className="ml-2 inline-flex items-center gap-1 text-white"><ShieldCheck className="w-3 h-3" /> Admin</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => { setActionError(null); setConfirmAction('deals'); }}
              className="px-3 py-2 bg-neutral-800 hover:bg-rose-950/50 text-neutral-300 hover:text-rose-300 border border-neutral-700 hover:border-rose-800/60 text-xs font-semibold rounded-xl transition flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete All Postings
            </button>
            <button
              onClick={() => { setActionError(null); setConfirmAction('profile'); }}
              className="px-3 py-2 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-900/60 text-xs font-semibold rounded-xl transition flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete Profile
            </button>
          </div>
        </div>

        <div className="flex border-b border-neutral-800 bg-neutral-950/40 px-6">
          <button
            onClick={() => setTab('myPosts')}
            className={`flex items-center gap-2 py-3 px-3 text-xs font-semibold border-b-2 transition ${tab === 'myPosts' ? 'border-white text-white' : 'border-transparent text-neutral-400 hover:text-neutral-200'}`}
          >
            <Briefcase className="w-4 h-4" /> My Postings ({deals.length})
          </button>
          <button
            onClick={() => setTab('notifications')}
            className={`flex items-center gap-2 py-3 px-3 text-xs font-semibold border-b-2 transition ${tab === 'notifications' ? 'border-white text-white' : 'border-transparent text-neutral-400 hover:text-neutral-200'}`}
          >
            <Bell className="w-4 h-4" /> Notifications
          </button>
          <button
            onClick={() => setTab('circles')}
            className={`flex items-center gap-2 py-3 px-3 text-xs font-semibold border-b-2 transition ${tab === 'circles' ? 'border-white text-white' : 'border-transparent text-neutral-400 hover:text-neutral-200'}`}
          >
            <Users className="w-4 h-4" /> Private Circles ({circles.length})
          </button>
        </div>

        <div className="p-6">
          {tab === 'myPosts' && (
            isLoadingDeals ? (
              <div className="py-12 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-white" /></div>
            ) : deals.length === 0 ? (
              <div className="py-12 text-center text-sm text-neutral-500">You haven't posted any opportunities yet.</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {deals.map((deal) => (
                  <DealCard key={deal.id} deal={deal} onOpen={() => setSelectedDealId(deal.id)} />
                ))}
              </div>
            )
          )}

          {tab === 'notifications' && (
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-neutral-950/60 border border-neutral-800/80 rounded-2xl text-xs">
                <MessageSquare className="w-4 h-4 text-white shrink-0 mt-0.5" />
                <p className="text-neutral-200">Comments and verification activity on your postings will show up here.</p>
              </div>
            </div>
          )}

          {tab === 'circles' && (
            isLoadingCircles ? (
              <div className="py-12 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-white" /></div>
            ) : circles.length === 0 ? (
              <div className="py-12 text-center text-sm text-neutral-500 space-y-3">
                <CircleLock className="w-6 h-6 mx-auto text-neutral-600" />
                <p>You're not in any Private Circle yet. Browse or create one from the main feed.</p>
                <Link to="/" className="inline-block px-4 py-2 bg-white hover:bg-neutral-200 text-black text-xs font-semibold rounded-xl transition">
                  Go to Feed
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {circles.map((c) => (
                  <Link
                    key={c.id}
                    to={`/circles/${c.id}`}
                    className="flex items-center justify-between gap-3 p-3 bg-neutral-950/60 border border-neutral-800 hover:border-white/40 rounded-2xl transition"
                  >
                    <div>
                      <p className="text-sm font-bold text-white">{c.name}</p>
                      <p className="text-xs text-neutral-400">{c.memberCount} members · {c.dealCount} shared postings</p>
                    </div>
                    {c.isCreator && <span className="text-[10px] font-bold uppercase px-2 py-1 rounded-md bg-white text-black">Creator</span>}
                  </Link>
                ))}
              </div>
            )
          )}
        </div>
      </div>

      {selectedDealId && (
        <DealDetailModal dealId={selectedDealId} onClose={() => setSelectedDealId(null)} onUnauthorized={onUnauthorized} onVoted={fetchDeals} />
      )}

      {confirmAction === 'deals' && (
        <ConfirmDialog
          title="Delete all postings?"
          message="This will permanently delete every opportunity you've posted, along with their photos, votes and comments. This action is permanent and cannot be undone."
          confirmLabel="Delete All Postings"
          isBusy={isBusy}
          onConfirm={runConfirmedAction}
          onCancel={() => { setConfirmAction(null); setActionError(null); }}
        />
      )}
      {confirmAction === 'profile' && (
        <ConfirmDialog
          title="Delete your profile?"
          message="Your profile will be deleted and you'll be logged out. Your postings will remain visible and are not deleted."
          confirmLabel="Delete Profile"
          isBusy={isBusy}
          onConfirm={runConfirmedAction}
          onCancel={() => { setConfirmAction(null); setActionError(null); }}
        />
      )}
      {actionError && confirmAction && (
        <p className="fixed bottom-4 inset-x-0 mx-auto w-fit z-[70] text-xs text-rose-300 bg-rose-950/90 border border-rose-900 rounded-xl px-3 py-2">
          {actionError}
        </p>
      )}
    </div>
  );
}
