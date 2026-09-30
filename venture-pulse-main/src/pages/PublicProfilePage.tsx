import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Loader2, User as UserIcon, ArrowLeft, ShieldCheck, ThumbsUp, ShieldAlert, ShieldX } from 'lucide-react';
import DealCard from '../components/DealCard';
import ConfirmDialog from '../components/ConfirmDialog';
import type { PublicProfile, AccountStatus } from '../types';

function statusBadge(status: AccountStatus) {
  if (status === 'banned') return { label: 'Banned', classes: 'bg-rose-950/60 text-rose-300 border-rose-800/60' };
  if (status === 'restricted') return { label: 'Restricted', classes: 'bg-amber-950/60 text-amber-300 border-amber-800/60' };
  return null;
}

export default function PublicProfilePage({
  isAdminMode,
  onUnauthorized,
}: {
  isAdminMode: boolean;
  onUnauthorized: () => void;
}) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmBan, setConfirmBan] = useState(false);

  const load = async () => {
    setIsLoading(true);
    setNotFound(false);
    try {
      const res = await fetch(`/api/users/${id}`);
      if (res.status === 401) return onUnauthorized();
      if (res.status === 404) {
        setNotFound(true);
      } else if (res.ok) {
        setProfile(await res.json());
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const setStatus = async (status: AccountStatus) => {
    setIsBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.status === 401) return onUnauthorized();
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Could not update this account.');
      } else {
        setConfirmBan(false);
        load();
      }
    } catch (err) {
      console.error('Error updating user status:', err);
      setError('Network error. Please try again.');
    } finally {
      setIsBusy(false);
    }
  };

  const displayName = profile ? (profile.username ? `@${profile.username}` : profile.firstName || 'Investor') : '';
  const badge = profile ? statusBadge(profile.status) : null;
  const canManage = isAdminMode && profile && !profile.isSelf && !profile.isAdmin;

  return (
    <div className="space-y-6">
      <Link to="/" className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white transition">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Feed
      </Link>

      {isLoading ? (
        <div className="py-16 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-white" /></div>
      ) : notFound || !profile ? (
        <div className="border border-neutral-800/80 bg-neutral-900/30 rounded-2xl p-16 text-center text-neutral-400 font-medium">
          This profile no longer exists.
        </div>
      ) : (
        <>
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 flex flex-wrap items-center gap-4">
            {profile.photoUrl ? (
              <img src={profile.photoUrl} alt="" referrerPolicy="no-referrer" className="w-14 h-14 rounded-2xl object-cover border border-white/20" />
            ) : (
              <div className="p-3.5 bg-white/10 border border-white/20 rounded-2xl text-white">
                <UserIcon className="w-7 h-7" />
              </div>
            )}
            <div className="flex-1 min-w-[200px]">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-white">{displayName}</h2>
                {profile.isAdmin && (
                  <span className="flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-white text-black"><ShieldCheck className="w-3 h-3" /> Admin</span>
                )}
                {badge && <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${badge.classes}`}>{badge.label}</span>}
              </div>
              <p className="text-xs text-neutral-400 mt-1">
                Telegram ID <span className="font-mono">{profile.id}</span> · {profile.deals.length} postings
              </p>
              <p className="text-xs text-neutral-400 flex items-center gap-1 mt-0.5">
                <ThumbsUp className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-400 font-semibold">{profile.verificationsReceived}</span> verifications received ·{' '}
                <span className="text-white font-semibold">{profile.verificationsGiven}</span> given
              </p>
            </div>

            {canManage && (
              <div className="flex items-center gap-1.5">
                {profile.status !== 'active' && (
                  <button onClick={() => setStatus('active')} disabled={isBusy} className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold rounded-lg transition disabled:opacity-50">
                    Reinstate
                  </button>
                )}
                {profile.status !== 'restricted' && (
                  <button onClick={() => setStatus('restricted')} disabled={isBusy} className="flex items-center gap-1 px-3 py-1.5 bg-amber-950/50 hover:bg-amber-900/60 border border-amber-800/60 text-amber-300 text-xs font-semibold rounded-lg transition disabled:opacity-50">
                    <ShieldAlert className="w-3.5 h-3.5" /> Restrict
                  </button>
                )}
                {profile.status !== 'banned' && (
                  <button onClick={() => setConfirmBan(true)} disabled={isBusy} className="flex items-center gap-1 px-3 py-1.5 bg-rose-950/50 hover:bg-rose-900/60 border border-rose-800/60 text-rose-300 text-xs font-semibold rounded-lg transition disabled:opacity-50">
                    <ShieldX className="w-3.5 h-3.5" /> Ban
                  </button>
                )}
              </div>
            )}
          </div>

          {error && <p className="text-xs text-rose-400 bg-rose-950/30 border border-rose-900/50 rounded-xl px-3 py-2">{error}</p>}

          {profile.deals.length === 0 ? (
            <div className="border border-neutral-800/80 bg-neutral-900/30 rounded-2xl p-16 text-center text-neutral-400 font-medium">
              No public postings yet.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {profile.deals.map((deal) => (
                <DealCard key={deal.id} deal={deal} onOpen={() => navigate(`/deals/${deal.id}`)} />
              ))}
            </div>
          )}
        </>
      )}

      {confirmBan && profile && (
        <ConfirmDialog
          title={`Ban ${displayName}?`}
          message="They'll no longer be able to log in. Any of their postings that are already Verified will stay up; everything else they've posted will be permanently deleted. This cannot be undone."
          confirmLabel="Ban User"
          isBusy={isBusy}
          onConfirm={() => setStatus('banned')}
          onCancel={() => setConfirmBan(false)}
        />
      )}
    </div>
  );
}
