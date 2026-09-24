import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  ShieldCheck, 
  AlertTriangle, 
  PlusCircle, 
  CheckCircle2, 
  XCircle, 
  Send, 
  Filter,
  User,
  ShieldAlert,
  Loader2,
  RefreshCw
} from 'lucide-react';

type UserRole = 'vc' | 'investor' | 'business' | 'admin';
type Stage = 'Pre-Seed' | 'Seed' | 'Series A' | 'Series B' | 'Series C' | 'Others';
type DealStatus = 'pending' | 'approved' | 'rejected';

interface ActionNote {
  id: string;
  deal_id: string;
  action_type: 'verify' | 'contest';
  notes: string;
  created_at?: string;
}

interface Deal {
  id: string;
  companyName: string;
  stage: Stage;
  sector: string;
  amountRaised: string;
  valuation: string;
  pitch: string;
  postedByRole: UserRole;
  status: DealStatus;
  verifications: ActionNote[];
  contests: ActionNote[];
}

export default function App() {
  const [activeRole, setActiveRole] = useState<UserRole>('investor');
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(true);
  const [tgUser, setTgUser] = useState<string>('investor_anon_99');
  
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [selectedStage, setSelectedStage] = useState<string>('All');
  const [showPostModal, setShowPostModal] = useState<boolean>(false);
  const [activeActionModal, setActiveActionModal] = useState<{ dealId: string; type: 'verify' | 'contest' } | null>(null);
  const [actionNotes, setActionNotes] = useState<string>('');

  // New Deal Form State
  const [newDeal, setNewDeal] = useState({
    companyName: '',
    stage: 'Seed' as Stage,
    sector: '',
    amountRaised: '',
    valuation: '',
    pitch: ''
  });

  // Fetch deals from Cloudflare D1 via Pages Functions API
  const fetchDeals = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/deals');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setDeals(data);
        }
      }
    } catch (err) {
      console.error('Error fetching deals from D1:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeals();
  }, []);

  // Handle submitting a new deal to D1
  const handleCreateDeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeal.companyName || !newDeal.pitch) return;

    setSubmitting(true);
    try {
      const response = await fetch('/api/deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newDeal,
          postedByRole: activeRole
        })
      });

      if (response.ok) {
        setShowPostModal(false);
        setNewDeal({
          companyName: '',
          stage: 'Seed',
          sector: '',
          amountRaised: '',
          valuation: '',
          pitch: ''
        });
        await fetchDeals(); // Reload deals from D1 database
      }
    } catch (err) {
      console.error('Failed to create deal:', err);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle investor actions (Verify / Contest)
  const handleInvestorAction = async () => {
    if (!activeActionModal || !actionNotes.trim()) return;

    setSubmitting(true);
    try {
      const response = await fetch('/api/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: activeActionModal.type,
          dealId: activeActionModal.dealId,
          notes: actionNotes
        })
      });

      if (response.ok) {
        setActiveActionModal(null);
        setActionNotes('');
        await fetchDeals(); // Reload deals from D1 database
      }
    } catch (err) {
      console.error('Failed to submit action:', err);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle admin actions (Approve / Reject)
  const handleAdminDecision = async (dealId: string, status: 'approved' | 'rejected') => {
    setSubmitting(true);
    try {
      const response = await fetch('/api/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: status === 'approved' ? 'approve' : 'reject',
          dealId,
          status
        })
      });

      if (response.ok) {
        await fetchDeals(); // Reload deals from D1 database
      }
    } catch (err) {
      console.error('Failed to update deal status:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredDeals = deals.filter(deal => {
    if (activeRole !== 'admin' && deal.status !== 'approved') return false;
    if (selectedStage !== 'All' && deal.stage !== selectedStage) return false;
    return true;
  });

  const pendingDeals = deals.filter(deal => deal.status === 'pending');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      {/* Top Bar */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
                VenturePulse
              </h1>
              <p className="text-xs text-slate-400">Anonymized VC & Investor Network</p>
            </div>
          </div>

          {/* Role Selector & Login Controls */}
          <div className="flex items-center space-x-3">
            <div className="bg-slate-800 p-1 rounded-lg flex items-center border border-slate-700 text-xs">
              <span className="text-slate-400 px-2 font-medium">Role:</span>
              {(['investor', 'vc', 'business', 'admin'] as UserRole[]).map((r) => (
                <button
                  key={r}
                  onClick={() => setActiveRole(r)}
                  className={`px-3 py-1 rounded-md capitalize font-medium transition-colors ${
                    activeRole === r
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>

            <button 
              onClick={fetchDeals} 
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition"
              title="Refresh Deals"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <div className="flex items-center space-x-2 bg-slate-900 border border-indigo-500/30 px-3 py-1.5 rounded-lg text-xs">
              <Send className="w-3.5 h-3.5 text-sky-400" />
              <span className="text-slate-300">@{tgUser}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        
        {/* Banner Notification for Rules */}
        <div className="mb-6 p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start space-x-3">
            <ShieldAlert className="w-5 h-5 text-indigo-400 mt-0.5" />
            <div className="text-sm">
              <span className="font-semibold text-slate-200">Current Permissions ({activeRole.toUpperCase()}): </span>
              {activeRole === 'investor' && <span className="text-slate-400">Post freely without approval. Exclusive rights to Verify or Contest deals.</span>}
              {activeRole === 'vc' && <span className="text-slate-400">Posts require manual Admin approval before appearing on the feed.</span>}
              {activeRole === 'business' && <span className="text-slate-400">Posts require manual Admin approval before appearing on the feed.</span>}
              {activeRole === 'admin' && <span className="text-slate-400">Full control to Approve or Reject pending VC and Business submissions.</span>}
            </div>
          </div>
          
          <button
            onClick={() => setShowPostModal(true)}
            className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg font-medium text-sm transition shadow-lg shadow-indigo-600/20"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Share Opportunity</span>
          </button>
        </div>

        {/* Admin Review Drawer */}
        {activeRole === 'admin' && (
          <div className="mb-8 bg-amber-500/10 border border-amber-500/30 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-amber-400 flex items-center space-x-2">
                <span>Admin Approval Queue</span>
                <span className="bg-amber-500/20 text-amber-300 text-xs px-2 py-0.5 rounded-full">
                  {pendingDeals.length} Pending
                </span>
              </h2>
            </div>

            {pendingDeals.length === 0 ? (
              <p className="text-sm text-slate-400">No pending submissions requiring approval.</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {pendingDeals.map((deal) => (
                  <div key={deal.id} className="bg-slate-900 border border-slate-800 p-4 rounded-lg flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold text-slate-100">{deal.companyName}</h3>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-indigo-400 border border-indigo-500/20">
                          Role: {deal.postedByRole.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mb-2 line-clamp-2">{deal.pitch}</p>
                      <div className="text-xs text-slate-400 space-x-3 mb-4">
                        <span>Stage: <strong>{deal.stage}</strong></span>
                        <span>Raised: <strong>{deal.amountRaised}</strong></span>
                      </div>
                    </div>

                    <div className="flex space-x-2 pt-2 border-t border-slate-800">
                      <button
                        onClick={() => handleAdminDecision(deal.id, 'approved')}
                        disabled={submitting}
                        className="flex-1 flex items-center justify-center space-x-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 py-1.5 rounded text-xs font-medium transition"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Approve</span>
                      </button>
                      <button
                        onClick={() => handleAdminDecision(deal.id, 'rejected')}
                        disabled={submitting}
                        className="flex-1 flex items-center justify-center space-x-1 bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/30 py-1.5 rounded text-xs font-medium transition"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Stage Filter */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-4 mb-6 border-b border-slate-800">
          <Filter className="w-4 h-4 text-slate-400 mr-2 flex-shrink-0" />
          {['All', 'Pre-Seed', 'Seed', 'Series A', 'Series B', 'Series C', 'Others'].map((stage) => (
            <button
              key={stage}
              onClick={() => setSelectedStage(stage)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                selectedStage === stage
                  ? 'bg-slate-800 text-indigo-400 border border-indigo-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {stage}
            </button>
          ))}
        </div>

        {/* Deals Feed */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin mb-2" />
            <p className="text-sm">Loading opportunities from Cloudflare D1...</p>
          </div>
        ) : filteredDeals.length === 0 ? (
          <div className="text-center py-16 bg-slate-900/50 rounded-xl border border-slate-800">
            <p className="text-slate-400 text-sm">No investment opportunities found for this stage.</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredDeals.map((deal) => (
              <div key={deal.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between hover:border-slate-700 transition">
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-bold text-slate-100">{deal.companyName}</h3>
                      <span className="text-xs text-indigo-400 font-medium">{deal.sector}</span>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                      {deal.stage}
                    </span>
                  </div>

                  <p className="text-sm text-slate-300 mb-4 line-clamp-3">{deal.pitch}</p>

                  <div className="grid grid-cols-2 gap-2 p-3 bg-slate-950/60 rounded-lg text-xs mb-4 border border-slate-800">
                    <div>
                      <span className="text-slate-500 block">Target Raised</span>
                      <span className="font-medium text-slate-200">{deal.amountRaised}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Valuation</span>
                      <span className="font-medium text-slate-200">{deal.valuation}</span>
                    </div>
                  </div>

                  {/* Verifications & Contests List */}
                  {((deal.verifications && deal.verifications.length > 0) || (deal.contests && deal.contests.length > 0)) && (
                    <div className="space-y-2 mb-4">
                      {deal.verifications?.map((v, i) => (
                        <div key={i} className="text-xs p-2 rounded bg-emerald-950/30 border border-emerald-500/20 text-emerald-300 flex items-start space-x-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                          <span><strong>Verified:</strong> {v.notes}</span>
                        </div>
                      ))}
                      {deal.contests?.map((c, i) => (
                        <div key={i} className="text-xs p-2 rounded bg-rose-950/30 border border-rose-500/20 text-rose-300 flex items-start space-x-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                          <span><strong>Contested:</strong> {c.notes}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Investor Action Toolbar */}
                <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-[10px] uppercase text-slate-500 font-semibold">
                    Posted by: {deal.postedByRole}
                  </span>

                  {activeRole === 'investor' ? (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setActiveActionModal({ dealId: deal.id, type: 'verify' })}
                        className="px-2.5 py-1 rounded bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 text-xs font-medium transition flex items-center space-x-1"
                      >
                        <ShieldCheck className="w-3 h-3" />
                        <span>Verify</span>
                      </button>
                      <button
                        onClick={() => setActiveActionModal({ dealId: deal.id, type: 'contest' })}
                        className="px-2.5 py-1 rounded bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/30 text-xs font-medium transition flex items-center space-x-1"
                      >
                        <AlertTriangle className="w-3 h-3" />
                        <span>Contest</span>
                      </button>
                    </div>
                  ) : (
                    <span className="text-[10px] text-slate-500 italic">Verify/Contest reserved for Investors</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Modal: New Opportunity Submission */}
      {showPostModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 shadow-2xl">
            <h2 className="text-xl font-bold mb-1 text-slate-100">Submit Opportunity</h2>
            <p className="text-xs text-slate-400 mb-4">
              Posting as <strong className="text-indigo-400 uppercase">{activeRole}</strong>
              {activeRole !== 'investor' && ' (Will require Admin approval before going live)'}
            </p>

            <form onSubmit={handleCreateDeal} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Company Name</label>
                <input
                  type="text"
                  required
                  value={newDeal.companyName}
                  onChange={(e) => setNewDeal({ ...newDeal, companyName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                  placeholder="e.g. Acme AI"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Stage</label>
                  <select
                    value={newDeal.stage}
                    onChange={(e) => setNewDeal({ ...newDeal, stage: e.target.value as Stage })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                  >
                    {['Pre-Seed', 'Seed', 'Series A', 'Series B', 'Series C', 'Others'].map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Sector</label>
                  <input
                    type="text"
                    required
                    value={newDeal.sector}
                    onChange={(e) => setNewDeal({ ...newDeal, sector: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                    placeholder="e.g. FinTech"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Target Raise ($)</label>
                  <input
                    type="text"
                    required
                    value={newDeal.amountRaised}
                    onChange={(e) => setNewDeal({ ...newDeal, amountRaised: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                    placeholder="$2,000,000"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Valuation ($)</label>
                  <input
                    type="text"
                    required
                    value={newDeal.valuation}
                    onChange={(e) => setNewDeal({ ...newDeal, valuation: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                    placeholder="$10,000,000"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Pitch Summary</label>
                <textarea
                  required
                  rows={3}
                  value={newDeal.pitch}
                  onChange={(e) => setNewDeal({ ...newDeal, pitch: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                  placeholder="Explain why investors should participate..."
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPostModal(false)}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition flex items-center space-x-2"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{activeRole === 'investor' ? 'Publish Deal' : 'Submit for Approval'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Investor Action (Verify or Contest) */}
      {activeActionModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 shadow-2xl">
            <h2 className="text-lg font-bold mb-1 text-slate-100 capitalize">
              {activeActionModal.type} Investment Opportunity
            </h2>
            <p className="text-xs text-slate-400 mb-4">
              Add your verified insights or reasons for contesting this listing.
            </p>

            <textarea
              rows={4}
              value={actionNotes}
              onChange={(e) => setActionNotes(e.target.value)}
              placeholder={
                activeActionModal.type === 'verify'
                  ? 'e.g. Confirmed allocation through lead syndicate...'
                  : 'e.g. Discrepancy found in valuation figures...'
              }
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 mb-4"
            />

            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setActiveActionModal(null)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleInvestorAction}
                disabled={submitting || !actionNotes.trim()}
                className={`px-4 py-2 rounded-lg text-sm font-medium text-white transition flex items-center space-x-2 ${
                  activeActionModal.type === 'verify' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-rose-600 hover:bg-rose-500'
                }`}
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                <span className="capitalize">Submit {activeActionModal.type}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
