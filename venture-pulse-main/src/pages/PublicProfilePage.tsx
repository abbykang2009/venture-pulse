import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Loader2, User as UserIcon, ArrowLeft } from 'lucide-react';
import DealCard from '../components/DealCard';
import DealDetailModal from '../components/DealDetailModal';
import type { PublicProfile } from '../types';

export default function PublicProfilePage({ onUnauthorized }: { onUnauthorized: () => void }) {
  const { id } = useParams<{ id: string }>();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);

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

  const displayName = profile ? (profile.username ? `@${profile.username}` : profile.firstName || 'Investor') : '';

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
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 flex items-center gap-4">
            {profile.photoUrl ? (
              <img src={profile.photoUrl} alt="" referrerPolicy="no-referrer" className="w-14 h-14 rounded-2xl object-cover border border-white/20" />
            ) : (
              <div className="p-3.5 bg-white/10 border border-white/20 rounded-2xl text-white">
                <UserIcon className="w-7 h-7" />
              </div>
            )}
            <div>
              <h2 className="text-lg font-bold text-white">{displayName}</h2>
              <p className="text-xs text-neutral-400">
                Telegram ID <span className="font-mono">{profile.id}</span> · {profile.deals.length} postings
              </p>
            </div>
          </div>

          {profile.deals.length === 0 ? (
            <div className="border border-neutral-800/80 bg-neutral-900/30 rounded-2xl p-16 text-center text-neutral-400 font-medium">
              No public postings yet.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {profile.deals.map((deal) => (
                <DealCard key={deal.id} deal={deal} onOpen={() => setSelectedDealId(deal.id)} />
              ))}
            </div>
          )}
        </>
      )}

      {selectedDealId && (
        <DealDetailModal dealId={selectedDealId} onClose={() => setSelectedDealId(null)} onUnauthorized={onUnauthorized} />
      )}
    </div>
  );
}
