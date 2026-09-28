import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  TrendingUp, 
  Plus, 
  ShieldCheck, 
  AlertTriangle, 
  MessageSquare, 
  Search, 
  MapPin, 
  DollarSign, 
  X, 
  Upload, 
  Trash2,
  CheckCircle2,
  XCircle,
  Briefcase
} from 'lucide-react';

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
  verifications?: number;
  disputes?: number;
  comments?: Comment[];
}

export function App() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'All' | 'Business' | 'VC'>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  
  // Admin & Modal state
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  
  // Comment state
  const [newComment, setNewComment] = useState<string>('');
  const [commentAuthor, setCommentAuthor] = useState<string>('');

  // Form State
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

  // Fetch Deals from Backend
  const fetchDeals = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/deals');
      if (res.ok) {
        const data = await res.json();
        setDeals(Array.isArray(data) ? data : []);
      } else {
        console.error('Failed to fetch deals');
      }
    } catch (err) {
      console.error('Error fetching deals:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeals();
  }, []);

  // Fetch Single Deal Details (with comments & votes)
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

  // Submit New Deal
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
      formData.append('postedBy', isAdmin ? 'Admin' : 'Community');

      if (selectedFile) {
        formData.append('file', selectedFile);
      }

      const res = await fetch('/api/create-deal', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create deal');
      }

      // Reset Form & Close Modal
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
    } catch (err: any) {
      alert(`Error publishing deal: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Vote Handler (Verify / Dispute)
  const handleVote = async (dealId: string, voteType: 'verify' | 'dispute') => {
    try {
      const res = await fetch('/api/deals?action=vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dealId,
          userId: 'user_' + Math.random().toString(36).substring(2, 9),
          voteType,
        }),
      });

      if (res.ok) {
        fetchDeals();
        if (selectedDeal && selectedDeal.id === dealId) {
          openDealDetails(selectedDeal);
        }
      }
    } catch (err) {
      console.error('Error submitting vote:', err);
    }
  };

  // Submit Comment
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDeal || !newComment.trim()) return;

    try {
      const res = await fetch('/api/deals?action=comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dealId: selectedDeal.id,
          author: commentAuthor.trim() || 'Anonymous',
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

  // Delete Deal (Admin)
  const handleDeleteDeal = async (dealId: string) => {
    if (!confirm('Are you sure you want to delete this deal?')) return;

    try {
      const res = await fetch(`/api/deals?id=${dealId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        if (selectedDeal?.id === dealId) setSelectedDeal(null);
        fetchDeals();
      }
    } catch (err) {
      console.error('Error deleting deal:', err);
    }
  };

  // Filter Deals based on Tab and Search Query
  const filteredDeals = deals.filter((deal) => {
    const matchesTab =
      activeTab === 'All' ? true : (deal.listingType || 'Business') === activeTab;
    const matchesSearch =
      deal.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      deal.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      deal.originCity.toLowerCase().includes(searchQuery.toLowerCase()) ||
      deal.hqCity.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesTab && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">VenturePulse</span>
          </div>

          <div className="flex items-center space-x-4">
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
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Controls Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          {/* Tabs */}
          <div className="flex bg-slate-800/80 p-1 rounded-xl w-fit border border-slate-700/50">
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

          {/* Search Bar */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search listings or cities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-800/80 border border-slate-700/50 rounded-xl pl-9 pr-4 py-2 text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition"
            />
          </div>
        </div>

        {/* Listings Grid */}
        {loading ? (
          <div className="text-center py-20 text-slate-400">Loading opportunities...</div>
        ) : filteredDeals.length === 0 ? (
          <div className="text-center py-20 bg-slate-800/30 rounded-2xl border border-slate-800">
            <p className="text-slate-400">No opportunities found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDeals.map((deal) => (
              <div
                key={deal.id}
                onClick={() => openDealDetails(deal)}
                className="group bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 rounded-2xl p-5 cursor-pointer transition duration-200 relative flex flex-col justify-between overflow-hidden"
              >
                {/* Type Badge */}
                <div className="absolute top-4 right-4">
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                      deal.listingType === 'VC'
                        ? 'bg-purple-500/10 text-purple-400 border border-purple-500/30'
                        : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                    }`}
                  >
                    {deal.listingType || 'Business'}
                  </span>
                </div>

                <div>
                  <div className="pr-20 mb-2">
                    <h3 className="text-lg font-bold text-white group-hover:text-indigo-400 transition">
                      {deal.name}
                    </h3>
                    <p className="text-xs text-indigo-400 font-medium">{deal.stage} Stage</p>
                  </div>

                  <p className="text-slate-300 text-sm line-clamp-2 mb-4 leading-relaxed">
                    {deal.description}
                  </p>
                </div>

                <div>
                  {/* Location & Rate */}
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-400 py-3 border-t border-slate-700/40 mb-3">
                    <div className="flex items-center space-x-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="truncate">
                        {deal.originCity || 'N/A'} / {deal.hqCity || 'N/A'}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1 justify-end">
                      <DollarSign className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="font-semibold text-slate-200 truncate">
                        {deal.rate ? `${deal.rate} USD` : 'Unspecified'}
                      </span>
                    </div>
                  </div>

                  {/* Actions & Verification */}
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <div className="flex items-center space-x-3">
                      <span className="flex items-center space-x-1 text-emerald-400">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>{deal.verifications || 0}</span>
                      </span>
                      <span className="flex items-center space-x-1 text-rose-400">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>{deal.disputes || 0}</span>
                      </span>
                    </div>

                    {isAdmin && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteDeal(deal.id);
                        }}
                        className="text-rose-400 hover:text-rose-300 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Deal Details Modal */}
      {selectedDeal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 relative shadow-2xl">
            <button
              onClick={() => setSelectedDeal(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-6">
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-semibold inline-block mb-3 ${
                  selectedDeal.listingType === 'VC'
                    ? 'bg-purple-500/10 text-purple-400 border border-purple-500/30'
                    : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                }`}
              >
                {selectedDeal.listingType || 'Business'} Listing
              </span>
              <h2 className="text-2xl font-bold text-white">{selectedDeal.name}</h2>
              <p className="text-sm text-indigo-400 font-medium mt-1">
                {selectedDeal.stage} Stage
              </p>
            </div>

            {selectedDeal.imageUrl && (
              <img
                src={selectedDeal.imageUrl}
                alt={selectedDeal.name}
                className="w-full h-56 object-cover rounded-xl mb-6 border border-slate-800"
              />
            )}

            <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-800 mb-6 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Origin City:</span>
                <span className="text-slate-200 font-medium">{selectedDeal.originCity}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">HQ City:</span>
                <span className="text-slate-200 font-medium">{selectedDeal.hqCity}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Rate / Valuation:</span>
                <span className="text-slate-200 font-medium">{selectedDeal.rate} USD</span>
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

            {/* Voting Section */}
            <div className="flex items-center space-x-4 border-t border-b border-slate-800 py-4 mb-6">
              <button
                onClick={() => handleVote(selectedDeal.id, 'verify')}
                className="flex-1 flex items-center justify-center space-x-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 py-2 rounded-xl text-sm font-medium transition"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Verify ({selectedDeal.verifications || 0})</span>
              </button>
              <button
                onClick={() => handleVote(selectedDeal.id, 'dispute')}
                className="flex-1 flex items-center justify-center space-x-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 py-2 rounded-xl text-sm font-medium transition"
              >
                <AlertTriangle className="w-4 h-4" />
                <span>Dispute ({selectedDeal.disputes || 0})</span>
              </button>
            </div>

            {/* Comments Section */}
            <div>
              <h4 className="text-sm font-bold text-white mb-4">
                Discussion ({selectedDeal.comments?.length || 0})
              </h4>

              <div className="space-y-3 mb-6 max-h-48 overflow-y-auto">
                {selectedDeal.comments && selectedDeal.comments.length > 0 ? (
                  selectedDeal.comments.map((c) => (
                    <div key={c.id} className="bg-slate-800/60 p-3 rounded-xl text-xs">
                      <div className="flex justify-between font-semibold text-slate-300 mb-1">
                        <span>{c.author}</span>
                        <span className="text-slate-500">
                          {new Date(c.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-slate-400">{c.text}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500 italic">No comments yet. Be the first to share feedback!</p>
                )}
              </div>

              {/* Add Comment Form */}
              <form onSubmit={handleAddComment} className="space-y-3">
                <input
                  type="text"
                  placeholder="Your Name / Handle"
                  value={commentAuthor}
                  onChange={(e) => setCommentAuthor(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <div className="flex space-x-2">
                  <input
                    type="text"
                    placeholder="Write a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-xs font-semibold transition"
                  >
                    Post
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Create Deal Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 relative shadow-2xl">
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
                        : 'bg-slate-800 text-slate-400 border-slate-700'
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
                        : 'bg-slate-800 text-slate-400 border-slate-700'
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
                  placeholder="e.g. Bistro Bar Pub Acquisition"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Stage</label>
                  <select
                    value={formState.stage}
                    onChange={(e) => setFormState({ ...formState, stage: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
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
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
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
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">HQ City</label>
                  <input
                    type="text"
                    value={formState.hqCity}
                    onChange={(e) => setFormState({ ...formState, hqCity: e.target.value })}
                    placeholder="e.g. Johor Bahru"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
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
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Upload Image (Optional)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700 cursor-pointer"
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
