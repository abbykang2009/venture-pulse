import React, { useState, useEffect } from 'react';
import {
  Building2,
  RefreshCw,
  Send,
  PlusCircle,
  ShieldAlert,
  LogOut,
  Lock,
  CheckCircle2,
  ShieldCheck,
  X,
  Image as ImageIcon,
  Loader2,
  Trash2,
  MapPin,
  CheckCircle,
  AlertTriangle,
  HelpCircle,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Globe,
  TrendingUp,
  Coins,
  User as UserIcon,
  Bell,
  Users,
  Briefcase,
  Layers,
  Lock as CircleLock
} from 'lucide-react';

interface User {
  id: string;
  username: string | null;
  firstName: string;
  lastName: string | null;
  photoUrl: string | null;
  isAdmin: boolean;
}

interface TelegramAuthData {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

interface Comment {
  id: string;
  author: string;
  text: string;
  createdAt: number;
}

interface Deal {
  id: string;
  name: string;
  stage: string;
  description: string;
  rate: string;
  originCity: string;
  hqCity: string;
  imageUrl?: string;
  postedBy?: string;
  listingType?: 'Business' | 'VC';
  verifications?: number;
  disputes?: number;
  myVote?: 'verify' | 'dispute' | null;
  isMine?: boolean;
  comments?: Comment[];
}

declare global {
  interface Window {
    onTelegramAuth?: (user: TelegramAuthData) => void;
  }
}

const displayName = (u: User) => (u.username ? `@${u.username}` : u.firstName || 'Investor');

function getVerificationStatus(verifications: number = 0, disputes: number = 0) {
  const diff = verifications - disputes;
  if (diff >= 2) {
    return { label: 'Verified', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40', icon: CheckCircle };
  }
  if (disputes - verifications >= 2) {
    return { label: 'Disputed', color: 'bg-rose-500/20 text-rose-400 border-rose-500/40', icon: AlertTriangle };
  }
  return { label: 'Unverified', color: 'bg-amber-500/20 text-amber-400 border-amber-500/40', icon: HelpCircle };
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [voteError, setVoteError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isAdminMode, setIsAdminMode] = useState<boolean>(false);
  const [selectedStage, setSelectedStage] = useState<string>('All');
  const [deals, setDeals] = useState<Deal[]>([]);
  const [isLoadingDeals, setIsLoadingDeals] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Profile Modal State
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profileTab, setProfileTab] = useState<'myPosts' | 'notifications' | 'circles'>('myPosts');

  // Selected Deal Detail Modal
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // Opportunity Creation Form
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [stage, setStage] = useState('Pre-Seed');
  const [rate, setRate] = useState('');
  const [originCity, setOriginCity] = useState('');
  const [hqCity, setHqCity] = useState('');
  const [description, setDescription] = useState('');
  const [listingType, setListingType] = useState<'Business' | 'VC'>('Business');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isUserAdmin = user?.isAdmin ?? false;

  // Restore the session from the server-side cookie (not localStorage).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/auth/me');
        const data = res.ok ? await res.json() : { user: null };
        if (!cancelled && data.user) {
          setUser(data.user);
          setIsAdminMode(!!data.user.isAdmin);
        }
      } catch (err) {
        console.error('Error checking session:', err);
      } finally {
        if (!cancelled) setAuthChecked(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Telegram Login Widget: the server verifies Telegram's signature and sets the session cookie.
  useEffect(() => {
    if (user || !authChecked) return;

    window.onTelegramAuth = async (tg) => {
      setIsLoggingIn(true);
      setLoginError(null);
      try {
        const res = await fetch('/api/auth/telegram', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(tg),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Login failed');
        setUser(data.user);
        setIsAdminMode(!!data.user.isAdmin);
      } catch (err: any) {
        setLoginError(err.message || 'Login failed');
      } finally {
        setIsLoggingIn(false);
      }
    };

    const container = document.getElementById('telegram-widget-container');
    if (container && container.childNodes.length === 0) {
      const script = document.createElement('script');
      script.src = 'https://telegram.org/js/telegram-widget.js?22';
      script.setAttribute('data-telegram-login', 'VenturePulseAuthBot');
      script.setAttribute('data-size', 'large');
      script.setAttribute('data-radius', '12');
      script.setAttribute('data-onauth', 'onTelegramAuth(user)');
      script.setAttribute('data-request-access', 'write');
      script.async = true;
      container.appendChild(script);
    }
  }, [user, authChecked]);

  const handleUnauthorized = () => {
    setUser(null);
    setIsAdminMode(false);
    setDeals([]);
    setSelectedDeal(null);
    setIsProfileOpen(false);
    setIsModalOpen(false);
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('Error logging out:', err);
    }
    handleUnauthorized();
  };

  const fetchDeals = async () => {
    setIsLoadingDeals(true);
    try {
      const res = await fetch('/api/deals');
      if (res.status === 401) return handleUnauthorized();
      if (res.ok) {
        const data = await res.json();
        setDeals(data);
      }
    } catch (err) {
      console.error('Error fetching deals:', err);
    } finally {
      setIsLoadingDeals(false);
    }
  };

  const fetchDealDetail = async (id: string) => {
    setIsLoadingDetail(true);
    try {
      const res = await fetch(`/api/deals?id=${id}`);
      if (res.status === 401) return handleUnauthorized();
      if (res.ok) {
        const data = await res.json();
        setSelectedDeal(data);
      }
    } catch (err) {
      console.error('Error fetching deal details:', err);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchDeals();
    }
  }, [user]);

  const handleVote = async (voteType: 'verify' | 'dispute') => {
    if (!selectedDeal || !user) return;

    setVoteError(null);
    try {
      const res = await fetch('/api/deals?action=vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dealId: selectedDeal.id, voteType }),
      });

      if (res.status === 401) return handleUnauthorized();
      if (res.ok) {
        fetchDealDetail(selectedDeal.id);
        fetchDeals();
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
    if (!selectedDeal || !newComment.trim() || !user) return;

    setIsSubmittingComment(true);
    try {
      const res = await fetch('/api/deals?action=comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dealId: selectedDeal.id, text: newComment }),
      });

      if (res.status === 401) return handleUnauthorized();
      if (res.ok) {
        setNewComment('');
        fetchDealDetail(selectedDeal.id);
      }
    } catch (err) {
      console.error('Error posting comment:', err);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleCreateListing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !description || !rate || !originCity || !hqCity) return;

    setIsSubmitting(true);
    setCreateError(null);
    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('stage', stage);
      formData.append('rate', rate);
      formData.append('originCity', originCity);
      formData.append('hqCity', hqCity);
      formData.append('description', description);
      formData.append('listingType', isAdminMode ? listingType : 'Business');

      if (selectedFile) {
        formData.append('file', selectedFile);
      }

      const res = await fetch('/api/deals', {
        method: 'POST',
        body: formData,
      });

      if (res.status === 401) return handleUnauthorized();
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setCreateError(data.error || 'Could not publish this deal.');
      } else {
        await fetchDeals();
        setName('');
        setStage('Pre-Seed');
        setRate('');
        setOriginCity('');
        setHqCity('');
        setDescription('');
        setSelectedFile(null);
        setPreviewUrl(null);
        setIsModalOpen(false);
      }
    } catch (error) {
      console.error('Error saving deal:', error);
      setCreateError('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteDeal = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this opportunity?')) return;

    setDeletingId(id);
    try {
      const res = await fetch(`/api/deals?id=${id}`, { method: 'DELETE' });
      if (res.status === 401) return handleUnauthorized();
      if (res.ok) {
        setDeals((prev) => prev.filter((d) => d.id !== id));
        if (selectedDeal?.id === id) setSelectedDeal(null);
      }
    } catch (err) {
      console.error('Error deleting deal:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const myPostedDeals = deals.filter((d) => d.isMine);

  const filteredDeals = selectedStage === 'All'
    ? deals
    : deals.filter((deal) => deal.stage === selectedStage);

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-[#070913] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#070913] text-slate-100 flex items-center justify-center p-4 font-sans">
        <div className="w-full max-w-md bg-slate-900/80 border border-slate-800 rounded-3xl p-8 space-y-8 shadow-2xl text-center backdrop-blur-xl">
          <div className="space-y-3">
            <div className="inline-flex p-3.5 bg-indigo-600/20 border border-indigo-500/30 rounded-2xl text-indigo-400">
              <Building2 className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">VenturePulse</h1>
            <p className="text-sm text-slate-400">Anonymized Opportunities Network</p>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 text-left space-y-2 text-xs text-slate-300">
            <div className="flex items-center gap-2 text-indigo-400 font-semibold">
              <Lock className="w-4 h-4" />
              <span>Investor Access Only</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Standard registration is restricted to Investors. Authenticate via Telegram to view and submit opportunities.
            </p>
          </div>

          <div className="flex justify-center items-center py-2 min-h-[48px]">
            {isLoggingIn ? (
              <span className="flex items-center gap-2 text-sm text-slate-400">
                <Loader2 className="w-4 h-4 animate-spin text-indigo-500" /> Verifying with Telegram...
              </span>
            ) : (
              <div id="telegram-widget-container"></div>
            )}
          </div>

          {loginError && (
            <p className="text-xs text-rose-400 bg-rose-950/30 border border-rose-900/50 rounded-xl px-3 py-2">
              {loginError}
            </p>
          )}

          <div className="flex items-center justify-center gap-4 text-xs text-slate-500 pt-2 border-t border-slate-800/60">
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Verified Network</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Vetted Deals</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070913] text-slate-100 font-sans p-6 space-y-6 max-w-7xl mx-auto">
      
      {/* HEADER SECTION */}
      <header className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800/60">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-600/20 border border-indigo-500/30 rounded-xl text-indigo-400">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">VenturePulse</h1>
            <p className="text-xs text-slate-400 font-medium">Anonymized Opportunities Network</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* USER / ADMIN MODE TOGGLE */}
          {isUserAdmin && (
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1 text-xs font-medium">
              <button
                onClick={() => setIsAdminMode(false)}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  !isAdminMode ? 'bg-indigo-600 text-white shadow-sm font-semibold' : 'text-slate-400 hover:text-white'
                }`}
              >
                User
              </button>
              <button
                onClick={() => setIsAdminMode(true)}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                  isAdminMode ? 'bg-indigo-600 text-white shadow-sm font-semibold' : 'text-slate-400 hover:text-white'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" /> Admin
              </button>
            </div>
          )}

          <button
            onClick={fetchDeals}
            title="Refresh Feed"
            className="p-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 hover:text-white transition"
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingDeals ? 'animate-spin' : ''}`} />
          </button>

          {/* TELEGRAM USER PROFILE BUTTON */}
          <button
            onClick={() => setIsProfileOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/50 rounded-xl text-xs font-mono text-indigo-300 transition"
          >
            {user.photoUrl ? (
              <img src={user.photoUrl} alt="" referrerPolicy="no-referrer" className="w-5 h-5 rounded-full object-cover" />
            ) : (
              <Send className="w-3.5 h-3.5 text-indigo-400" />
            )}
            <span>{displayName(user)}</span>
          </button>

          <button
            onClick={handleLogout}
            title="Log out"
            className="p-2 bg-slate-900 hover:bg-rose-950/40 border border-slate-800 hover:border-rose-800/60 text-slate-400 hover:text-rose-400 rounded-xl transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* BANNER NOTICE */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-sm text-slate-300">
          <ShieldAlert className="w-5 h-5 text-indigo-400 shrink-0" />
          <span>
            {isAdminMode ? (
              <><strong className="text-white">ADMIN MODE ENABLED:</strong> You can post on behalf of Businesses or VCs, and manage opportunity listings.</>
            ) : (
              <><strong className="text-white">NETWORK FEED:</strong> Click any card to inspect full details, community verification scores, or post notes.</>
            )}
          </span>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl transition shadow-lg shadow-indigo-600/20"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Post New Opportunity</span>
        </button>
      </div>

      {/* STAGE FILTERS */}
      <div className="flex flex-wrap items-center gap-2 pt-2">
        {['All', 'Pre-Seed', 'Seed', 'Series A', 'Series B', 'Series C', 'Others'].map((s) => (
          <button
            key={s}
            onClick={() => setSelectedStage(s)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
              selectedStage === s
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* OPPORTUNITY CARDS (1x1 SQUARE) */}
      {isLoadingDeals ? (
        <div className="border border-slate-800/80 bg-slate-900/30 rounded-2xl p-16 flex flex-col items-center justify-center gap-3 text-slate-400 font-medium">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
          <span>Loading opportunities...</span>
        </div>
      ) : filteredDeals.length === 0 ? (
        <div className="border border-slate-800/80 bg-slate-900/30 rounded-2xl p-16 text-center text-slate-400 font-medium">
          No opportunities found for this stage.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 pt-2">
          {filteredDeals.map((deal) => {
            const status = getVerificationStatus(deal.verifications, deal.disputes);
            const StatusIcon = status.icon;
            const isVcListing = deal.listingType === 'VC';

            return (
              <div
                key={deal.id}
                onClick={() => {
                  setSelectedDeal(deal);
                  fetchDealDetail(deal.id);
                }}
                className="group relative aspect-square rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 hover:border-indigo-500/60 cursor-pointer transition-all shadow-md hover:shadow-2xl hover:scale-[1.02]"
              >
                {/* Background Image / Placeholder */}
                {deal.imageUrl ? (
                  <img
                    src={deal.imageUrl}
                    alt={deal.name}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 flex items-center justify-center">
                    <Building2 className="w-12 h-12 text-slate-700 group-hover:text-indigo-400/50 transition" />
                  </div>
                )}

                {/* Dark Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent opacity-90 group-hover:opacity-80 transition" />

                {/* TYPE RIBBON / BADGE (Top-Right) */}
                <div className="absolute top-3 right-3 z-10">
                  <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border backdrop-blur-md shadow-md ${
                    isVcListing 
                      ? 'bg-purple-950/80 text-purple-300 border-purple-700/60' 
                      : 'bg-blue-950/80 text-blue-300 border-blue-700/60'
                  }`}>
                    {isVcListing ? 'VC Deal' : 'Business'}
                  </span>
                </div>

                {/* VERIFICATION BADGE & ADMIN DELETE (Top-Left) */}
                <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5">
                  <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border backdrop-blur-md ${status.color}`}>
                    <StatusIcon className="w-3 h-3" />
                    {status.label}
                  </span>

                  {isAdminMode && (
                    <button
                      onClick={(e) => handleDeleteDeal(e, deal.id)}
                      disabled={deletingId === deal.id}
                      title="Delete"
                      className="p-1.5 bg-slate-950/80 hover:bg-rose-900/80 text-slate-400 hover:text-rose-300 rounded-lg border border-slate-800 backdrop-blur-md transition"
                    >
                      {deletingId === deal.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                    </button>
                  )}
                </div>

                {/* Bottom Overlay Info */}
                <div className="absolute bottom-0 inset-x-0 p-3.5 z-10 space-y-1">
                  <span className="inline-block text-[10px] font-semibold text-indigo-300 uppercase tracking-wider">
                    {deal.stage}
                  </span>
                  <h3 className="text-sm font-bold text-white truncate leading-tight group-hover:text-indigo-300 transition">
                    {deal.name}
                  </h3>
                  <div className="flex items-center justify-between text-slate-400 text-xs pt-0.5">
                    <span className="flex items-center gap-1 text-[11px] truncate">
                      <MapPin className="w-3 h-3 text-indigo-400 shrink-0" />
                      {deal.hqCity}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* USER PROFILE & NOTIFICATIONS MODAL */}
      {isProfileOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl relative flex flex-col max-h-[85vh]">
            
            {/* Header */}
            <div className="p-6 pb-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {user.photoUrl ? (
                  <img src={user.photoUrl} alt="" referrerPolicy="no-referrer" className="w-12 h-12 rounded-2xl object-cover border border-indigo-500/30" />
                ) : (
                  <div className="p-3 bg-indigo-600/20 border border-indigo-500/30 rounded-2xl text-indigo-400">
                    <UserIcon className="w-6 h-6" />
                  </div>
                )}
                <div>
                  <h2 className="text-lg font-bold text-white">{displayName(user)}</h2>
                  <p className="text-xs text-slate-400">
                    {[user.firstName, user.lastName].filter(Boolean).join(' ')} · Telegram ID <span className="font-mono">{user.id}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsProfileOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl bg-slate-800/60"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Profile Navigation Tabs */}
            <div className="flex border-b border-slate-800 bg-slate-950/40 px-6">
              <button
                onClick={() => setProfileTab('myPosts')}
                className={`flex items-center gap-2 py-3 px-3 text-xs font-semibold border-b-2 transition ${
                  profileTab === 'myPosts'
                    ? 'border-indigo-500 text-indigo-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Briefcase className="w-4 h-4" /> My Submissions ({myPostedDeals.length})
              </button>

              <button
                onClick={() => setProfileTab('notifications')}
                className={`flex items-center gap-2 py-3 px-3 text-xs font-semibold border-b-2 transition ${
                  profileTab === 'notifications'
                    ? 'border-indigo-500 text-indigo-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Bell className="w-4 h-4" /> Notifications
              </button>

              <button
                onClick={() => setProfileTab('circles')}
                className={`flex items-center gap-2 py-3 px-3 text-xs font-semibold border-b-2 transition ${
                  profileTab === 'circles'
                    ? 'border-indigo-500 text-indigo-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Users className="w-4 h-4" /> Private Circles
              </button>
            </div>

            {/* Profile Tab Contents */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {profileTab === 'myPosts' && (
                <div className="space-y-3">
                  {myPostedDeals.length === 0 ? (
                    <div className="text-center py-8 text-xs text-slate-500 border border-slate-800/80 rounded-2xl bg-slate-950/30">
                      You haven't posted any opportunities yet.
                    </div>
                  ) : (
                    myPostedDeals.map((deal) => (
                      <div
                        key={deal.id}
                        onClick={() => {
                          setIsProfileOpen(false);
                          setSelectedDeal(deal);
                          fetchDealDetail(deal.id);
                        }}
                        className="p-3 bg-slate-950/60 border border-slate-800 hover:border-indigo-500/50 rounded-2xl flex items-center justify-between cursor-pointer transition"
                      >
                        <div className="flex items-center gap-3">
                          {deal.imageUrl ? (
                            <img src={deal.imageUrl} alt={deal.name} className="w-10 h-10 rounded-xl object-cover" />
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500">
                              <Building2 className="w-5 h-5" />
                            </div>
                          )}
                          <div>
                            <h4 className="text-sm font-bold text-white">{deal.name}</h4>
                            <p className="text-xs text-slate-400">{deal.stage} • {deal.hqCity}</p>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                          {deal.verifications || 0} Verifications
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}

              {profileTab === 'notifications' && (
                <div className="space-y-3">
                  <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-2xl flex gap-3 items-start">
                    <MessageSquare className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                    <div className="text-xs space-y-0.5">
                      <p className="text-slate-200"><strong className="text-white">@investor_lead</strong> commented on your post <span className="text-indigo-400">"Cross-Border Payments"</span></p>
                      <p className="text-[10px] text-slate-500">2 hours ago</p>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-2xl flex gap-3 items-start">
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div className="text-xs space-y-0.5">
                      <p className="text-slate-200">Your opportunity achieved <strong className="text-emerald-400">Verified Status (+2 threshold)</strong>.</p>
                      <p className="text-[10px] text-slate-500">1 day ago</p>
                    </div>
                  </div>
                </div>
              )}

              {profileTab === 'circles' && (
                <div className="p-5 bg-slate-950/60 border border-slate-800 rounded-2xl text-center space-y-3">
                  <div className="inline-flex p-3 bg-indigo-600/20 text-indigo-400 rounded-2xl border border-indigo-500/30">
                    <CircleLock className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-white">Private Circles (Coming Soon)</h4>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                      Invite trusted co-investors to private circles. Deals shared within circles remain invisible on the public network feed.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* DETAIL MODAL */}
      {selectedDeal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl my-8 relative flex flex-col max-h-[90vh]">
            
            <button
              onClick={() => setSelectedDeal(null)}
              className="absolute top-4 right-4 z-20 p-2 bg-slate-950/80 hover:bg-slate-800 text-slate-300 rounded-full border border-slate-700/60 backdrop-blur-md transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="overflow-y-auto space-y-6">
              <div className="relative h-64 sm:h-72 w-full bg-slate-950">
                {selectedDeal.imageUrl ? (
                  <img src={selectedDeal.imageUrl} alt={selectedDeal.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 flex items-center justify-center">
                    <Building2 className="w-20 h-20 text-slate-700" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/30 to-transparent" />

                <div className="absolute bottom-4 left-6 right-6 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-indigo-600 text-white uppercase tracking-wider">
                      {selectedDeal.stage}
                    </span>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-md border backdrop-blur-md ${
                      selectedDeal.listingType === 'VC' ? 'bg-purple-950/80 text-purple-300 border-purple-700/60' : 'bg-blue-950/80 text-blue-300 border-blue-700/60'
                    }`}>
                      {selectedDeal.listingType === 'VC' ? 'VC Listing' : 'Business Listing'}
                    </span>
                    {(() => {
                      const status = getVerificationStatus(selectedDeal.verifications, selectedDeal.disputes);
                      const StatusIcon = status.icon;
                      return (
                        <span className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-md border ${status.color}`}>
                          <StatusIcon className="w-3.5 h-3.5" />
                          {status.label}
                        </span>
                      );
                    })()}
                  </div>
                  <h2 className="text-2xl font-black text-white tracking-tight">{selectedDeal.name}</h2>
                </div>
              </div>

              <div className="px-6 space-y-6">
                <div className="grid grid-cols-3 gap-3 bg-slate-950/60 border border-slate-800 rounded-2xl p-4 text-center">
                  <div>
                    <div className="flex items-center justify-center gap-1 text-slate-400 text-xs mb-1">
                      <Coins className="w-3.5 h-3.5 text-indigo-400" /> Rate
                    </div>
                    <div className="text-sm font-bold text-white">{selectedDeal.rate}</div>
                  </div>
                  <div className="border-x border-slate-800">
                    <div className="flex items-center justify-center gap-1 text-slate-400 text-xs mb-1">
                      <MapPin className="w-3.5 h-3.5 text-indigo-400" /> HQ Location
                    </div>
                    <div className="text-sm font-bold text-white">{selectedDeal.hqCity}</div>
                  </div>
                  <div>
                    <div className="flex items-center justify-center gap-1 text-slate-400 text-xs mb-1">
                      <Globe className="w-3.5 h-3.5 text-indigo-400" /> Origin
                    </div>
                    <div className="text-sm font-bold text-white">{selectedDeal.originCity}</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4" /> Opportunity Bio & Overview
                  </h3>
                  <p className="text-sm text-slate-300 leading-relaxed bg-slate-950/40 border border-slate-800/80 p-4 rounded-2xl">
                    {selectedDeal.description}
                  </p>
                </div>

                <div className="border border-slate-800 bg-slate-950/80 rounded-2xl p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-white">Community Verification</h4>
                      <p className="text-xs text-slate-400">Net score threshold: +2 Verifications confirm listing</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleVote('verify')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 bg-emerald-950/50 hover:bg-emerald-900/60 border border-emerald-800/60 text-emerald-300 rounded-xl text-xs font-semibold transition ${selectedDeal.myVote === 'verify' ? 'ring-2 ring-emerald-400/70' : ''}`}
                      >
                        <ThumbsUp className="w-3.5 h-3.5" />
                        <span>Verify ({selectedDeal.verifications || 0})</span>
                      </button>

                      <button
                        onClick={() => handleVote('dispute')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 bg-rose-950/50 hover:bg-rose-900/60 border border-rose-800/60 text-rose-300 rounded-xl text-xs font-semibold transition ${selectedDeal.myVote === 'dispute' ? 'ring-2 ring-rose-400/70' : ''}`}
                      >
                        <ThumbsDown className="w-3.5 h-3.5" />
                        <span>Dispute ({selectedDeal.disputes || 0})</span>
                      </button>
                    </div>
                  </div>
                  {voteError && <p className="text-xs text-rose-400">{voteError}</p>}
                </div>

                <div className="space-y-4 pb-6">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                    <MessageSquare className="w-4 h-4" /> Discussion & Investor Notes
                  </h3>

                  <form onSubmit={handleAddComment} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Add a comment or feedback..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      type="submit"
                      disabled={isSubmittingComment || !newComment.trim()}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition disabled:opacity-50 flex items-center gap-1"
                    >
                      {isSubmittingComment ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Post'}
                    </button>
                  </form>

                  <div className="space-y-2">
                    {isLoadingDetail ? (
                      <div className="text-center py-4 text-xs text-slate-500">Loading discussion...</div>
                    ) : !selectedDeal.comments || selectedDeal.comments.length === 0 ? (
                      <div className="text-center py-4 text-xs text-slate-500 bg-slate-950/30 rounded-xl border border-slate-800/50">
                        No comments yet. Start the conversation!
                      </div>
                    ) : (
                      selectedDeal.comments.map((cmt) => (
                        <div key={cmt.id} className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-mono text-indigo-400 font-semibold">{cmt.author}</span>
                            <span className="text-slate-500">{new Date(cmt.createdAt).toLocaleDateString()}</span>
                          </div>
                          <p className="text-xs text-slate-300 leading-relaxed">{cmt.text}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE OPPORTUNITY MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-indigo-400" />
                Post Investment Opportunity
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateListing} className="space-y-4">
              
              {/* ADMIN CONDITIONAL FIELD: LISTING TYPE */}
              {isAdminMode && (
                <div className="bg-indigo-950/30 border border-indigo-500/30 rounded-2xl p-3 space-y-1.5">
                  <label className="block text-xs font-semibold text-indigo-300">Listing Category (Admin Only)</label>
                  <select
                    value={listingType}
                    onChange={(e) => setListingType(e.target.value as 'Business' | 'VC')}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Business">Business Listing</option>
                    <option value="VC">VC Listing</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cross-Border Payments Infrastructure"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Stage</label>
                  <select
                    value={stage}
                    onChange={(e) => setStage(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                  >
                    {['Pre-Seed', 'Seed', 'Series A', 'Series B', 'Series C', 'Others'].map((st) => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Rate (per unit)</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. $50,000 / unit"
                    value={rate}
                    onChange={(e) => setRate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Origin City</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ho Chi Minh City"
                    value={originCity}
                    onChange={(e) => setOriginCity(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">HQ City</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Singapore"
                    value={hqCity}
                    onChange={(e) => setHqCity(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Description</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Provide brief details about the opportunity..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Opportunity Photo</label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-800 border-dashed rounded-2xl bg-slate-950 hover:border-indigo-500/50 transition">
                  {previewUrl ? (
                    <div className="relative w-full space-y-2 text-center">
                      <img src={previewUrl} alt="Preview" className="max-h-36 mx-auto rounded-xl object-cover" />
                      <button
                        type="button"
                        onClick={() => { setSelectedFile(null); setPreviewUrl(null); }}
                        className="text-xs text-rose-400 hover:underline"
                      >
                        Remove Photo
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-1 text-center">
                      <ImageIcon className="mx-auto h-8 w-8 text-slate-500" />
                      <div className="flex text-xs text-slate-400">
                        <label className="relative cursor-pointer rounded-md font-semibold text-indigo-400 hover:text-indigo-300 focus-within:outline-none">
                          <span>Upload photo</span>
                          <input type="file" accept="image/*" onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              setSelectedFile(e.target.files[0]);
                              setPreviewUrl(URL.createObjectURL(e.target.files[0]));
                            }
                          }} className="sr-only" />
                        </label>
                        <p className="pl-1">or drag and drop</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {createError && (
                <p className="text-xs text-rose-400 bg-rose-950/30 border border-rose-900/50 rounded-xl px-3 py-2">{createError}</p>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition shadow-lg shadow-indigo-600/20 disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Publish Deal</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
