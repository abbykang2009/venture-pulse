import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Plus, 
  Search, 
  MapPin, 
  X, 
  Trash2,
  Image as ImageIcon,
  Send,
  LogOut,
  Lock
} from 'lucide-react';

const BOT_USERNAME = 'VenturePulseAuthBot';

interface Comment {
  id: string;
  dealId: string;
  author: string;
  text: string;
  createdAt: number;
}

interface Deal {
  id: string;
  name: string;
  stage: string;
  rate: string;
  originCity: string;
  hqCity: string;
  description: string;
  imageUrl?: string;
  postedBy?: string;
  listingType?: 'Business' | 'VC';
  createdAt?: number;
  comments?: Comment[];
}

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

export function App() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'All' | 'Business' | 'VC'>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  
  // Authenticated User State
  const [telegramUser, setTelegramUser] = useState<TelegramUser | null>(null);

  // Admin & Modal state
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  
  // Comment state
  const [newComment, setNewComment] = useState<string>('');

  // Form State for D1 + R2 payload
  const [formState, setFormState] = useState({
    name: '',
    stage: 'Seed',
    rate: '',
    originCity: '',
    hqCity: '',
    description: '',
    listingType: 'Business' as 'Business' | 'VC',
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Initialize Session from URL Auth Callback or Storage Session
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');
    const first_name = urlParams.get('first_name');
    const username = urlParams.get('username');
    const photo_url = urlParams.get('photo_url');
    const auth_date = urlParams.get('auth_date');
    const hash = urlParams.get('hash');

    if (id && first_name && hash) {
      const authUser: TelegramUser = {
        id: Number(id),
        first_name,
        username: username || undefined,
        photo_url: photo_url || undefined,
        auth_date: Number(auth_date),
        hash,
      };
      setTelegramUser(authUser);
      localStorage.setItem('vp_session', JSON.stringify(authUser));
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    const savedSession = localStorage.getItem('vp_session');
    if (savedSession) {
      try {
        setTelegramUser(JSON.parse(savedSession));
      } catch (e) {
        localStorage.removeItem('vp_session');
      }
    }
  }, []);

  // Direct OAuth redirect to prevent iframe/bot domain rendering bugs
  const triggerTelegramAuth = () => {
    const currentOrigin = encodeURIComponent(window.location.origin + window.location.pathname);
    window.location.href = `https://oauth.telegram.org/auth?bot_id=${BOT_USERNAME}&origin=${currentOrigin}&embed=0&request_access=write`;
  };

  const handleLogout = () => {
    setTelegramUser(null);
    localStorage.removeItem('vp_session');
  };

  // Fetch All Opportunities from Cloudflare D1 via backend Worker/Pages API
  const fetchDeals = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/deals');
      if (res.ok) {
        const data = await res.json();
        setDeals(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error fetching deals from D1:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (telegramUser) {
      fetchDeals();
    }
  }, [telegramUser]);

  // Fetch Full Details + Comments for Selected Opportunity
  const openDealDetails = async (deal: Deal) => {
    setSelectedDeal(deal);
    try {
      const res = await fetch(`/api/deals?id=${deal.id}`);
      if (res.ok) {
        const detailedDeal = await res.json();
        setSelectedDeal(detailedDeal);
      }
    } catch (err) {
      console.error('Error fetching deal details:', err);
    }
  };

  // Publish Opportunity (Image goes to R2, metadata to D1)
  const handlePublishDeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.name || !formState.description) {
      alert('Please fill in all required fields.');
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('name', formState.name);
      formData.append('stage', formState.stage);
      formData.append('rate', formState.rate);
      formData.append('originCity', formState.originCity);
      formData.append('hqCity', formState.hqCity);
      formData.append('description', formState.description);
      formData.append('listingType', formState.listingType);
      formData.append(
        'postedBy', 
        telegramUser?.username ? `@${telegramUser.username}` : telegramUser?.first_name || 'User'
      );

      if (selectedFile) {
        formData.append('file', selectedFile);
      }

      const res = await fetch('/api/create-deal', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        setShowModal(false);
        setFormState({
          name: '',
          stage: 'Seed',
          rate: '',
          originCity: '',
          hqCity: '',
          description: '',
          listingType: 'Business',
        });
        setSelectedFile(null);
        fetchDeals();
      }
    } catch (err) {
      console.error('Error creating deal:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Add Comment stored in D1
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDeal || !newComment.trim()) return;

    try {
      const res = await fetch('/api/deals?action=comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dealId: selectedDeal.id,
          author: telegramUser?.username ? `@${telegramUser.username}` : telegramUser?.first_name || 'Anonymous',
          text: newComment,
        }),
      });

      if (res.ok) {
        setNewComment('');
        openDealDetails(selectedDeal);
      }
    } catch (err) {
      console.error('Error posting comment:', err);
    }
  };

  // Delete Deal from D1 & R2 (Admin)
  const handleDeleteDeal = async (dealId: string) => {
    if (!confirm('Are you sure you want to delete this deal?')) return;

    try {
      const res = await fetch(`/api/deals?id=${dealId}`, { method: 'DELETE' });
      if (res.ok) {
        if (selectedDeal?.id === dealId) setSelectedDeal(null);
        fetchDeals();
      }
    } catch (err) {
      console.error('Error deleting deal:', err);
    }
  };

  const filteredDeals = deals.filter((deal) => {
    const matchesTab = activeTab === 'All' ? true : (deal.listingType || 'Business') === activeTab;
    const matchesSearch =
      deal.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      deal.hqCity.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">VenturePulse</span>
          </div>

          {telegramUser && (
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2.5 bg-slate-800 border border-slate-700/60 rounded-xl px-3 py-1.5 text-xs text-slate-200">
                {telegramUser.photo_url ? (
                  <img 
                    src={telegramUser.photo_url} 
                    alt={telegramUser.first_name} 
                    className="w-5 h-5 rounded-full object-cover" 
                  />
                ) : (
                  <Send className="w-4 h-4 text-sky-400" />
                )}
                <span className="font-semibold text-white">
                  {telegramUser.username ? `@${telegramUser.username}` : telegramUser.first_name}
                </span>
                <button 
                  onClick={handleLogout}
                  title="Logout"
                  className="text-slate-400 hover:text-rose-400 ml-1 transition"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                onClick={() => setIsAdmin(!isAdmin)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  isAdmin
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {isAdmin ? 'Admin Mode' : 'User Mode'}
              </button>

              <button
                onClick={() => setShowModal(true)}
                className="flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition shadow-lg shadow-indigo-600/20"
              >
                <Plus className="w-4 h-4" />
                <span>Post Opportunity</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content Gate */}
      {!telegramUser ? (
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center shadow-2xl">
            <div className="w-12 h-12 bg-indigo-600/20 border border-indigo-500/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Lock className="w-6 h-6 text-indigo-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Authentication Required</h2>
            <p className="text-sm text-slate-400 mb-6">
              Please log in with Telegram to access the VenturePulse deal flow portal.
            </p>

            <button
              onClick={triggerTelegramAuth}
              className="w-full flex items-center justify-center space-x-2 bg-sky-500 hover:bg-sky-400 text-white px-5 py-3 rounded-xl text-sm font-semibold transition shadow-lg shadow-sky-500/20 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>Log in with Telegram</span>
            </button>
          </div>
        </main>
      ) : (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
            <div className="flex bg-slate-900 p-1 rounded-xl w-fit border border-slate-800">
              {(['All', 'Business', 'VC'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-5 py-2 rounded-lg text-sm font-medium transition ${
                    activeTab === tab
                      ? 'bg-indigo-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {tab === 'All' ? 'All Opportunities' : `${tab} Listings`}
                </button>
              ))}
            </div>

            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name or HQ city..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition"
              />
            </div>
          </div>

          {loading ? (
            <div className="text-center py-20 text-slate-400">Loading opportunities from D1...</div>
          ) : filteredDeals.length === 0 ? (
            <div className="text-center py-20 bg-slate-900/40 rounded-2xl border border-slate-800">
              <p className="text-slate-400">No opportunities found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {filteredDeals.map((deal) => (
                <div
                  key={deal.id}
                  onClick={() => openDealDetails(deal)}
                  className="group aspect-square bg-slate-900 border border-slate-800 hover:border-indigo-500/50 rounded-2xl overflow-hidden cursor-pointer relative shadow-lg transition duration-200 flex flex-col justify-between"
                >
                  {deal.imageUrl ? (
                    <img
                      src={deal.imageUrl}
                      alt={deal.name}
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-slate-800/60 flex items-center justify-center">
                      <ImageIcon className="w-10 h-10 text-slate-700" />
                    </div>
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent opacity-90" />

                  <div className="relative z-10 p-3 flex justify-between items-start">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase shadow ${
                        deal.listingType === 'VC' ? 'bg-purple-600 text-white' : 'bg-emerald-600 text-white'
                      }`}
                    >
                      {deal.listingType || 'Business'}
                    </span>

                    {isAdmin && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteDeal(deal.id);
                        }}
                        className="bg-slate-900/80 hover:bg-rose-600 text-slate-300 hover:text-white p-1.5 rounded-lg transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="relative z-10 p-3.5">
                    <h3 className="text-base font-bold text-white leading-snug line-clamp-2 group-hover:text-indigo-300 transition">
                      {deal.name}
                    </h3>
                    <div className="flex items-center space-x-1 text-xs text-slate-300 font-medium mt-1">
                      <MapPin className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span className="truncate">{deal.hqCity || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      )}

      {/* Detail Modal */}
      {selectedDeal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 relative shadow-2xl">
            <button
              onClick={() => setSelectedDeal(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-4">
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-semibold inline-block mb-2 ${
                  selectedDeal.listingType === 'VC'
                    ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                    : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                }`}
              >
                {selectedDeal.listingType || 'Business'} Listing
              </span>
              <h2 className="text-2xl font-bold text-white">{selectedDeal.name}</h2>
              <p className="text-sm text-indigo-400 font-medium mt-0.5">{selectedDeal.stage} Stage</p>
            </div>

            {selectedDeal.imageUrl && (
              <img
                src={selectedDeal.imageUrl}
                alt={selectedDeal.name}
                className="w-full h-56 object-cover rounded-xl mb-6 border border-slate-800"
              />
            )}

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 mb-6 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Origin City:</span>
                <span className="text-slate-200 font-medium">{selectedDeal.originCity || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">HQ City:</span>
                <span className="text-slate-200 font-medium">{selectedDeal.hqCity || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Target / Valuation:</span>
                <span className="text-slate-200 font-medium">
                  {selectedDeal.rate ? `${selectedDeal.rate} USD` : 'N/A'}
                </span>
              </div>
            </div>

            <div className="mb-8">
              <h4 className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-2">
                Description
              </h4>
              <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
                {selectedDeal.description}
              </p>
            </div>

            <div className="border-t border-slate-800 pt-6">
              <h4 className="text-sm font-bold text-white mb-4">
                Discussion ({selectedDeal.comments?.length || 0})
              </h4>

              <div className="space-y-3 mb-6 max-h-48 overflow-y-auto">
                {selectedDeal.comments && selectedDeal.comments.length > 0 ? (
                  selectedDeal.comments.map((c) => (
                    <div key={c.id} className="bg-slate-950 p-3 rounded-xl text-xs border border-slate-800/60">
                      <div className="flex justify-between font-semibold text-slate-300 mb-1">
                        <span>{c.author}</span>
                        <span className="text-slate-500">{new Date(c.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="text-slate-400">{c.text}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500 italic">No comments yet.</p>
                )}
              </div>

              <form onSubmit={handleAddComment} className="flex space-x-2">
                <input
                  type="text"
                  placeholder="Write a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-xs font-semibold transition"
                >
                  Post
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 relative shadow-2xl">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-bold text-white mb-6">Post New Opportunity</h2>

            <form onSubmit={handlePublishDeal} className="space-y-4 text-sm">
              <div>
                <label className="block text-slate-400 mb-1">Listing Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormState({ ...formState, listingType: 'Business' })}
                    className={`py-2 rounded-xl border text-xs font-semibold transition ${
                      formState.listingType === 'Business'
                        ? 'bg-emerald-600/20 text-emerald-400 border-emerald-500'
                        : 'bg-slate-950 text-slate-400 border-slate-800'
                    }`}
                  >
                    Business
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormState({ ...formState, listingType: 'VC' })}
                    className={`py-2 rounded-xl border text-xs font-semibold transition ${
                      formState.listingType === 'VC'
                        ? 'bg-purple-600/20 text-purple-400 border-purple-500'
                        : 'bg-slate-950 text-slate-400 border-slate-800'
                    }`}
                  >
                    VC
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Opportunity Title *</label>
                <input
                  type="text"
                  required
                  value={formState.name}
                  onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                  placeholder="e.g. Bistro Bar Acquisition"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Stage</label>
                  <select
                    value={formState.stage}
                    onChange={(e) => setFormState({ ...formState, stage: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Pre-Seed">Pre-Seed</option>
                    <option value="Seed">Seed</option>
                    <option value="Series A">Series A</option>
                    <option value="Series B">Series B</option>
                    <option value="Acquisition">Acquisition</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Target / Rate ($)</label>
                  <input
                    type="text"
                    value={formState.rate}
                    onChange={(e) => setFormState({ ...formState, rate: e.target.value })}
                    placeholder="e.g. 150000"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Origin City</label>
                  <input
                    type="text"
                    value={formState.originCity}
                    onChange={(e) => setFormState({ ...formState, originCity: e.target.value })}
                    placeholder="e.g. Singapore"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">HQ City</label>
                  <input
                    type="text"
                    value={formState.hqCity}
                    onChange={(e) => setFormState({ ...formState, hqCity: e.target.value })}
                    placeholder="e.g. Singapore"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Description *</label>
                <textarea
                  required
                  rows={3}
                  value={formState.description}
                  onChange={(e) => setFormState({ ...formState, description: e.target.value })}
                  placeholder="Provide overview details about this deal..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Upload Image (Saved to R2)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-950 file:text-slate-200 hover:file:bg-slate-800 cursor-pointer"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white py-2.5 rounded-xl font-semibold transition shadow-lg shadow-indigo-600/20"
              >
                {isSubmitting ? 'Publishing...' : 'Publish Deal'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
