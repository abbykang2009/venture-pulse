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
  Coins
} from 'lucide-react';

interface User {
  id: string;
  username: string;
  first_name: string;
  auth_date: number;
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
  verifications?: number;
  disputes?: number;
  comments?: Comment[];
}

declare global {
  interface Window {
    onTelegramAuth?: (user: User) => void;
  }
}

const ADMIN_HANDLES = ['exhamstersg', 'EmilyCucCung'];

// Verification status calculation helper logic
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
  const [selectedRole, setSelectedRole] = useState<'Investor' | 'Vc' | 'Business' | 'Admin'>('Investor');
  const [selectedStage, setSelectedStage] = useState<string>('All');
  const [deals, setDeals] = useState<Deal[]>([]);
  const [isLoadingDeals, setIsLoadingDeals] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Selected Deal for Profile Modal
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // Creation Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [stage, setStage] = useState('Pre-Seed');
  const [rate, setRate] = useState('');
  const [originCity, setOriginCity] = useState('');
  const [hqCity, setHqCity] = useState('');
  const [description, setDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isAdmin = user ? ADMIN_HANDLES.includes(user.username) : false;

  useEffect(() => {
    const savedUser = localStorage.getItem('vp_user');
    if (savedUser) {
      const parsedUser: User = JSON.parse(savedUser);
      setUser(parsedUser);
      setSelectedRole(ADMIN_HANDLES.includes(parsedUser.username) ? 'Admin' : 'Investor');
    }
  }, []);

  useEffect(() => {
    window.onTelegramAuth = (telegramUser: User) => {
      setUser(telegramUser);
      localStorage.setItem('vp_user', JSON.stringify(telegramUser));
      setSelectedRole(ADMIN_HANDLES.includes(telegramUser.username) ? 'Admin' : 'Investor');
    };
  }, []);

  useEffect(() => {
    if (!user) {
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
    }
  }, [user]);

  const fetchDeals = async () => {
    setIsLoadingDeals(true);
    try {
      const res = await fetch('/api/deals');
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

    try {
      const res = await fetch('/api/deals?action=vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dealId: selectedDeal.id,
          userId: user.username || user.id,
          voteType,
        }),
      });

      if (res.ok) {
        fetchDealDetail(selectedDeal.id);
        fetchDeals();
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
        body: JSON.stringify({
          dealId: selectedDeal.id,
          author: `@${user.username || user.first_name}`,
          text: newComment,
        }),
      });

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('vp_user');
  };

  const handleCreateListing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !description || !rate || !originCity || !hqCity) return;

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('stage', stage);
      formData.append('rate', rate);
      formData.append('originCity', originCity);
      formData.append('hqCity', hqCity);
      formData.append('description', description);
      formData.append('postedBy', user?.username || user?.first_name || 'Anonymous');

      if (selectedFile) {
        formData.append('file', selectedFile);
      }

      const res = await fetch('/api/create-deal', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
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

  const filteredDeals = selectedStage === 'All'
    ? deals
    : deals.filter((deal) => deal.stage === selectedStage);

  if (!user) {
    return (
      <div className="min-h-screen bg-[#070913] text-slate-100 flex items-center justify-center p-4 font-sans">
        <div className="w-full max-w-md bg-slate-900/80 border border-slate-800 rounded-3xl p-8 space-y-8 shadow-2xl text-center backdrop-blur-xl">
          <div className="space-y-3">
            <div className="inline-flex p-3.5 bg-indigo-600/20 border border-indigo-500/30 rounded-2xl text-indigo-400">
              <Building2 className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">VenturePulse</h1>
            <p className="text-sm text-slate-400">Anonymized VC & Investor Network.</p>
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
            <div id="telegram-widget-container"></div>
          </div>

          <div className="flex items-center justify-center gap-4 text-xs text-slate-500 pt-2 border-t border-slate-800/60">
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Verified Investor</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Vetted Deals</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070913] text-slate-100 font-sans p-6 space-y-6 max-w-7xl mx-auto">
      <header className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800/60">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-600/20 border border-indigo-500/30 rounded-xl text-indigo-400">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">VenturePulse</h1>
            <p className="text-xs text-slate-400 font-medium">Anonymized VC & Investor Network</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isAdmin ? (
            <div className="flex items-center bg-slate-900/80 border border-indigo-500/30 rounded-xl p-1 text-xs font-semibold">
              <span className="px-3 text-indigo-400 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Admin Mode:
              </span>
              {(['Investor', 'Vc', 'Business', 'Admin'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setSelectedRole(r)}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    selectedRole === r ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900/80 border border-slate-800 rounded-xl text-xs font-semibold text-slate-300">
              <span className="text-slate-500">Role:</span>
              <span className="text-indigo-400 font-bold">Investor</span>
            </div>
          )}

          <button
            onClick={fetchDeals}
            title="Refresh Feed"
            className="p-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 hover:text-white transition"
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingDeals ? 'animate-spin' : ''}`} />
          </button>

          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono text-indigo-300">
            <Send className="w-3.5 h-3.5 text-indigo-400" />
            <span>@{user.username || user.first_name}</span>
          </div>

          <button
            onClick={handleLogout}
            title="Log out"
            className="p-2 bg-slate-900 hover:bg-rose-950/40 border border-slate-800 hover:border-rose-800/60 text-slate-400 hover:text-rose-400 rounded-xl transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-sm text-slate-300">
          <ShieldAlert className="w-5 h-5 text-indigo-400 shrink-0" />
          <span>
            {isAdmin ? (
              <><strong className="text-white">ADMIN PERMISSIONS:</strong> You can manage, post, and review deal submissions on behalf of VCs and Businesses.</>
            ) : (
              <><strong className="text-white">INVESTOR NETWORK:</strong> Click any card to inspect full profile data, verify details, or add community comments.</>
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

      {isLoadingDeals ? (
        <div className="border border-slate-800/80 bg-slate-900/30 rounded-2xl p-16 flex flex-col items-center justify-center gap-3 text-slate-400 font-medium">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
          <span>Loading live investment deals...</span>
        </div>
      ) : filteredDeals.length === 0 ? (
        <div className="border border-slate-800/80 bg-slate-900/30 rounded-2xl p-16 text-center text-slate-400 font-medium">
          No investment opportunities found for this stage.
        </div>
      ) : (
        /* 1x1 SQUARE CARDS GRID */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 pt-2">
          {filteredDeals.map((deal) => {
            const status = getVerificationStatus(deal.verifications, deal.disputes);
            const StatusIcon = status.icon;

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

                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent opacity-90 group-hover:opacity-80 transition" />

                {/* Top Badge Overlay */}
                <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10">
                  <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border backdrop-blur-md ${status.color}`}>
                    <StatusIcon className="w-3 h-3" />
                    {status.label}
                  </span>

                  {isAdmin && (
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

                {/* Bottom Content */}
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

      {/* DATING-PROFILE STYLE OPPORTUNITY MODAL */}
      {selectedDeal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl my-8 relative flex flex-col max-h-[90vh]">
            
            {/* Close Button */}
            <button
              onClick={() => setSelectedDeal(null)}
              className="absolute top-4 right-4 z-20 p-2 bg-slate-950/80 hover:bg-slate-800 text-slate-300 rounded-full border border-slate-700/60 backdrop-blur-md transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="overflow-y-auto space-y-6">
              
              {/* Profile Cover Image Banner */}
              <div className="relative h-64 sm:h-72 w-full bg-slate-950">
                {selectedDeal.imageUrl ? (
                  <img src={selectedDeal.imageUrl} alt={selectedDeal.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 flex items-center justify-center">
                    <Building2 className="w-20 h-20 text-slate-700" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/30 to-transparent" />

                {/* Profile Header overlay */}
                <div className="absolute bottom-4 left-6 right-6 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-indigo-600 text-white uppercase tracking-wider">
                      {selectedDeal.stage}
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

              {/* Profile Details Body */}
              <div className="px-6 space-y-6">
                
                {/* Stats Grid */}
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

                {/* Description Prompt */}
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4" /> Opportunity Bio & Overview
                  </h3>
                  <p className="text-sm text-slate-300 leading-relaxed bg-slate-950/40 border border-slate-800/80 p-4 rounded-2xl">
                    {selectedDeal.description}
                  </p>
                </div>

                {/* Verification Voting & Sentiment Bar */}
                <div className="border border-slate-800 bg-slate-950/80 rounded-2xl p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-white">Community Verification</h4>
                      <p className="text-xs text-slate-400">Net score required: +2 Verifications to confirm listing</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleVote('verify')}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-950/50 hover:bg-emerald-900/60 border border-emerald-800/60 text-emerald-300 rounded-xl text-xs font-semibold transition"
                      >
                        <ThumbsUp className="w-3.5 h-3.5" />
                        <span>Verify ({selectedDeal.verifications || 0})</span>
                      </button>

                      <button
                        onClick={() => handleVote('dispute')}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-950/50 hover:bg-rose-900/60 border border-rose-800/60 text-rose-300 rounded-xl text-xs font-semibold transition"
                      >
                        <ThumbsDown className="w-3.5 h-3.5" />
                        <span>Dispute ({selectedDeal.disputes || 0})</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Comment / Discussion Section */}
                <div className="space-y-4 pb-6">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                    <MessageSquare className="w-4 h-4" /> Discussion & Investor Notes
                  </h3>

                  <form onSubmit={handleAddComment} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Add a comment or investor feedback..."
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

                  {/* Comment List */}
                  <div className="space-y-2">
                    {isLoadingDetail ? (
                      <div className="text-center py-4 text-xs text-slate-500">Loading discussion thread...</div>
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

      {/* CREATE OPPORTUNITY MODAL FORM */}
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
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Rate (per investment)</label>
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
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Country of Origin (City)</label>
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
                  <label className="block text-xs font-semibold text-slate-300 mb-1">HQ Location (City)</label>
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
                <label className="block text-xs font-semibold text-slate-300 mb-1">Brief Description</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Provide brief details about the company, market traction, or revenue infrastructure..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Opportunity Photo / Banner</label>
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
                          <span>Upload a photo</span>
                          <input type="file" accept="image/*" onChange={handleFileChange} className="sr-only" />
                        </label>
                        <p className="pl-1">or drag and drop</p>
                      </div>
                      <p className="text-[10px] text-slate-500">PNG, JPG, WEBP up to 10MB (Stored via Cloudflare R2)</p>
                    </div>
                  )}
                </div>
              </div>

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
                  <span>{isSubmitting ? 'Saving to Database...' : 'Publish Deal'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
