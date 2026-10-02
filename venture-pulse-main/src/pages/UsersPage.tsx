import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, User as UserIcon, ShieldCheck, ShieldAlert, ShieldX } from 'lucide-react';
import ConfirmDialog from '../components/ConfirmDialog';
import type { DirectoryUser, AccountStatus } from '../types';

function statusBadge(status: AccountStatus) {
  if (status === 'banned') return { label: 'Banned', classes: 'bg-rose-950/60 text-rose-300 border-rose-800/60' };
  if (status === 'restricted') return { label: 'Restricted', classes: 'bg-amber-950/60 text-amber-300 border-amber-800/60' };
  return { label: 'Active', classes: 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60' };
}

export default function UsersPage({
  currentUserId,
  isAdminMode,
  onUnauthorized,
}: {
  currentUserId: string;
  isAdminMode: boolean;
  onUnauthorized: () => void;
}) {
  const [users, setUsers] = useState<DirectoryUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmBan, setConfirmBan] = useState<DirectoryUser | null>(null);

  const load = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/users');
      if (res.status === 401) return onUnauthorized();
      if (res.ok) setUsers(await res.json());
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const setStatus = async (id: string, status: AccountStatus) => {
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
        setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, status } : u)));
        setConfirmBan(null);
      }
    } catch (err) {
      console.error('Error updating user status:', err);
      setError('Network error. Please try again.');
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">Users</h2>
        <p className="text-xs text-neutral-400 mt-1">{users.length} registered investors</p>
      </div>

      {error && <p className="text-xs text-rose-400 bg-rose-950/30 border border-rose-900/50 rounded-xl px-3 py-2">{error}</p>}

      {isLoading ? (
        <div className="py-16 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-white" /></div>
      ) : (
        <div className="space-y-2">
          {users.map((u) => {
            const badge = statusBadge(u.status);
            const canManage = isAdminMode && u.id !== currentUserId && !u.isAdmin;
            return (
              <div key={u.id} className="flex flex-wrap items-center gap-3 bg-neutral-900/70 border border-neutral-800 rounded-2xl px-4 py-3">
                {u.photoUrl ? (
                  <img src={u.photoUrl} alt="" referrerPolicy="no-referrer" className="w-9 h-9 rounded-full object-cover" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white">
                    <UserIcon className="w-4 h-4" />
                  </div>
                )}

                <Link to={`/u/${u.id}`} className="min-w-[140px] text-sm font-semibold text-white hover:underline truncate">
                  {u.username ? `@${u.username}` : u.firstName || 'Investor'}
                </Link>

                {u.isAdmin && (
                  <span className="flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-white text-black">
                    <ShieldCheck className="w-3 h-3" /> Admin
                  </span>
                )}

                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${badge.classes}`}>{badge.label}</span>

                <span className="text-xs text-neutral-400">{u.postCount} posts</span>

                <div className="flex-1" />

                {canManage && (
                  <div className="flex items-center gap-1.5">
                    {u.status !== 'active' && (
                      <button
                        onClick={() => setStatus(u.id, 'active')}
                        disabled={isBusy}
                        title="Reinstate"
                        className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold rounded-lg transition disabled:opacity-50"
                      >
                        Reinstate
                      </button>
                    )}
                    {u.status !== 'restricted' && (
                      <button
                        onClick={() => setStatus(u.id, 'restricted')}
                        disabled={isBusy}
                        title="Restrict from posting"
                        className="flex items-center gap-1 px-3 py-1.5 bg-amber-950/50 hover:bg-amber-900/60 border border-amber-800/60 text-amber-300 text-xs font-semibold rounded-lg transition disabled:opacity-50"
                      >
                        <ShieldAlert className="w-3.5 h-3.5" /> Restrict
                      </button>
                    )}
                    {u.status !== 'banned' && (
                      <button
                        onClick={() => setConfirmBan(u)}
                        disabled={isBusy}
                        title="Ban"
                        className="flex items-center gap-1 px-3 py-1.5 bg-rose-950/50 hover:bg-rose-900/60 border border-rose-800/60 text-rose-300 text-xs font-semibold rounded-lg transition disabled:opacity-50"
                      >
                        <ShieldX className="w-3.5 h-3.5" /> Ban
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {confirmBan && (
        <ConfirmDialog
          title={`Ban ${confirmBan.username ? `@${confirmBan.username}` : confirmBan.firstName}?`}
          message="They'll no longer be able to log in. Any of their postings that are already Verified will stay up; everything else they've posted will be permanently deleted. This cannot be undone."
          confirmLabel="Ban User"
          isBusy={isBusy}
          onConfirm={() => setStatus(confirmBan.id, 'banned')}
          onCancel={() => setConfirmBan(null)}
        />
      )}
    </div>
  );
}
