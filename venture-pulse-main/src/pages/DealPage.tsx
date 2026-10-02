import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Loader2, Coins, MapPin, Globe, TrendingUp, MessageSquare, ThumbsUp, ThumbsDown,
  User as UserIcon, Pencil, Phone, Link2, Lock, Users,
} from 'lucide-react';
import MediaCarousel from '../components/MediaCarousel';
import CreateDealModal from '../components/CreateDealModal';
import { getVerificationStatus, tagMeta, formatPrice } from '../components/DealCard';
import type { Deal } from '../types';

export default function DealPage({ isAdminMode, onUnauthorized }: { isAdminMode: boolean; onUnauthorized: () => void }) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [deal, setDeal] = useState<Deal | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [voteError, setVoteError] = useState<string | null>(null);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const load = async () => {
    setIsLoading(true);
    setNotFound(false);
    try {
      const res = await fetch(`/api/deals?id=${id}`);
      if (res.status === 401) return onUnauthorized();
      if (res.status === 404) {
        setNotFound(true);
      } else if (res.ok) {
        setDeal(await res.json());
      }
    } catch (err) {
      console.error('Error fetching deal details:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleVote = async (voteType: 'verify' | 'dispute') => {
    setVoteError(null);
    try {
      const res = await fetch('/api/deals?action=vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dealId: id, voteType }),
      });
      if (res.status === 401) return onUnauthorized();
      if (res.ok) {
        await load();
      } else {
        const data = await res.json().catch(() => ({}));
        setVoteError(data.error || 'Could not record your vote.');
      }
    } catch (err) {
      console.error('Error submitting vote:', err);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setIsSubmittingComment(true);
    try {
      const res = await fetch('/api/deals?action=comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dealId: id, text: newComment }),
      });
      if (res.status === 401) return onUnauthorized();
      if (res.ok) {
        setNewComment('');
        await load();
      }
    } catch (err) {
      console.error('Error posting comment:', err);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  if (isLoading) {
    return <div className="py-16 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-white" /></div>;
  }
  if (notFound || !deal) {
    return (
      <div className="space-y-4">
        <Link to="/" className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white transition"><ArrowLeft className="w-3.5 h-3.5" /> Back to Feed</Link>
        <div className="border border-neutral-800/80 bg-neutral-900/30 rounded-2xl p-16 text-center text-neutral-400 font-medium">Opportunity not found.</div>
      </div>
    );
  }

  const status = getVerificationStatus(deal.verifications, deal.disputes);
  const StatusIcon = status.icon;
  const meta = tagMeta(deal.tag);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white transition">
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>
        {deal.isMine && (
          <button
            onClick={() => setIsEditOpen(true)}
            className="px-4 py-2 bg-white hover:bg-neutral-200 text-black text-xs font-semibold rounded-xl transition shadow-lg shadow-black/40 flex items-center gap-1.5"
          >
            <Pencil className="w-3.5 h-3.5" /> Edit
          </button>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="relative w-full aspect-[4/5] md:aspect-square md:sticky md:top-6 rounded-3xl overflow-hidden bg-black border border-neutral-800">
          <MediaCarousel media={deal.media ?? (deal.cover ? [deal.cover] : [])} alt={deal.name} />
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">{deal.name}</h1>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-white text-black uppercase tracking-wider">{deal.stage}</span>
              {meta && (
                <span className={`text-xs font-bold px-2.5 py-1 rounded-md border ${meta.classes}`}>{meta.label}</span>
              )}
              <span className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-md border ${status.color}`}>
                <StatusIcon className="w-3.5 h-3.5" />
                {status.label}
              </span>
              {deal.circleId && (
                <span className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-md border border-neutral-700 text-neutral-300">
                  <Users className="w-3.5 h-3.5" /> Circle{deal.alsoGlobal ? ' + Global' : ''}
                </span>
              )}
            </div>

            {deal.postedById && (
              <Link to={`/u/${deal.postedById}`} className="inline-flex items-center gap-1.5 text-xs font-mono text-neutral-400 hover:text-white transition">
                <UserIcon className="w-3.5 h-3.5" /> Posted by {deal.postedById}
              </Link>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2 bg-neutral-900/60 border border-neutral-800 rounded-2xl p-3 text-center">
            <div>
              <div className="flex items-center justify-center gap-1 text-neutral-400 text-xs mb-1"><Coins className="w-3.5 h-3.5 text-white" /> Budget</div>
              <div className="text-sm font-bold text-white">{formatPrice(deal)}</div>
            </div>
            <div className="border-x border-neutral-800">
              <div className="flex items-center justify-center gap-1 text-neutral-400 text-xs mb-1"><MapPin className="w-3.5 h-3.5 text-white" /> Location</div>
              <div className="text-sm font-bold text-white">{deal.location}</div>
            </div>
            <div>
              <div className="flex items-center justify-center gap-1 text-neutral-400 text-xs mb-1"><Globe className="w-3.5 h-3.5 text-white" /> Origin</div>
              <div className="text-sm font-bold text-white">{deal.origin}</div>
            </div>
          </div>

          {deal.description && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5"><TrendingUp className="w-4 h-4" /> Opportunity Bio & Overview</h3>
              <p className="text-sm text-neutral-300 leading-relaxed bg-neutral-900/60 border border-neutral-800/80 p-4 rounded-2xl whitespace-pre-wrap">{deal.description}</p>
            </div>
          )}

          {deal.contact ? (
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
                <Phone className="w-4 h-4" /> Contact & Socials
                {!deal.contact.public && <span className="text-[10px] font-normal normal-case text-neutral-500 flex items-center gap-1"><Lock className="w-3 h-3" /> only visible to you</span>}
              </h3>
              <div className="bg-neutral-900/60 border border-neutral-800/80 p-4 rounded-2xl space-y-1.5 text-sm text-neutral-200">
                {deal.contact.info && <p>{deal.contact.info}</p>}
                {deal.contact.social && (
                  <p className="flex items-center gap-1.5">
                    <Link2 className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                    <a href={/^https?:\/\//.test(deal.contact.social) ? deal.contact.social : `https://${deal.contact.social}`} target="_blank" rel="noopener noreferrer" className="text-white hover:underline break-all">
                      {deal.contact.social}
                    </a>
                  </p>
                )}
              </div>
            </div>
          ) : null}

          <div className="border border-neutral-800 bg-neutral-900/60 rounded-2xl p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-bold text-white">Community Verification</h4>
                <p className="text-xs text-neutral-400">Net score threshold: +2 Verifications confirm listing</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleVote('verify')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 bg-emerald-950/50 hover:bg-emerald-900/60 border border-emerald-800/60 text-emerald-300 rounded-xl text-xs font-semibold transition ${deal.myVote === 'verify' ? 'ring-2 ring-emerald-400/70' : ''}`}
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                  <span>Verify ({deal.verifications || 0})</span>
                </button>
                <button
                  onClick={() => handleVote('dispute')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 bg-rose-950/50 hover:bg-rose-900/60 border border-rose-800/60 text-rose-300 rounded-xl text-xs font-semibold transition ${deal.myVote === 'dispute' ? 'ring-2 ring-rose-400/70' : ''}`}
                >
                  <ThumbsDown className="w-3.5 h-3.5" />
                  <span>Dispute ({deal.disputes || 0})</span>
                </button>
              </div>
            </div>
            {voteError && <p className="text-xs text-rose-400">{voteError}</p>}
          </div>

          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5"><MessageSquare className="w-4 h-4" /> Discussion & Investor Notes</h3>

            <form onSubmit={handleAddComment} className="flex gap-2">
              <input
                type="text"
                placeholder="Add a comment or feedback..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="flex-1 bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-white/60"
              />
              <button
                type="submit"
                disabled={isSubmittingComment || !newComment.trim()}
                className="px-4 py-2 bg-white hover:bg-neutral-200 text-black text-xs font-semibold rounded-xl transition disabled:opacity-50 flex items-center gap-1"
              >
                {isSubmittingComment ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Post'}
              </button>
            </form>

            <div className="space-y-2">
              {!deal.comments || deal.comments.length === 0 ? (
                <div className="text-center py-4 text-xs text-neutral-500 bg-neutral-900/40 rounded-xl border border-neutral-800/50">
                  No comments yet. Start the conversation!
                </div>
              ) : (
                deal.comments.map((cmt) => (
                  <div key={cmt.id} className="bg-neutral-900/60 border border-neutral-800/80 rounded-xl p-3 space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-mono text-neutral-300 font-semibold">{cmt.author}</span>
                      <span className="text-neutral-500">{new Date(cmt.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p className="text-xs text-neutral-300 leading-relaxed">{cmt.text}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {isEditOpen && (
        <CreateDealModal
          isAdminMode={isAdminMode}
          myCircles={[]}
          editDeal={deal}
          onClose={() => setIsEditOpen(false)}
          onUnauthorized={onUnauthorized}
          onCreated={() => { setIsEditOpen(false); load(); }}
        />
      )}
    </div>
  );
}
