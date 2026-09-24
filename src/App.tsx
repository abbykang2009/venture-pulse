import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Plus, 
  Filter, 
  CheckCircle2, 
  XCircle, 
  TrendingUp, 
  Building2, 
  Briefcase, 
  User, 
  Send, 
  Search, 
  ExternalLink, 
  MessageSquare, 
  Check, 
  X, 
  AlertTriangle,
  Info,
  DollarSign,
  PieChart,
  LogOut,
  ChevronRight,
  Shield,
  Layers,
  Sparkles,
  FileText
} from 'lucide-react';

const STAGES = ['Pre-Seed', 'Seed', 'Series A', 'Series B', 'Series C', 'Others'];

const INITIAL_DEALS = [
  {
    id: 'deal-1',
    title: 'AetherAI Labs',
    industry: 'Developer Tools & AI Infrastructure',
    stage: 'Seed',
    raiseAmount: '$2.5M',
    valuation: '$18M Cap',
    description: 'Autonomous agent framework for Cloudflare Workers and distributed serverless edge runtime environments.',
    pitch: 'Building sub-10ms response intelligent routing agents across global edge nodes.',
    posterType: 'VC',
    posterName: 'Apex Capital Partners',
    posterTg: '@apex_vc',
    status: 'approved',
    website: 'https://aetherai.example.com',
    deckUrl: 'https://deck.example.com/aetherai',
    verifications: [
      { id: 'v1', investorTg: '@angel_quant', note: 'Confirmed SAFEs issued in Q2 2026 round.', date: '2026-09-10' },
      { id: 'v2', investorTg: '@solo_gp_tech', note: 'Participated with $150k check. Strong engineering team.', date: '2026-09-12' }
    ],
    contests: [],
    createdAt: '2026-09-08'
  },
  {
    id: 'deal-2',
    title: 'Solstice Energy Stack',
    industry: 'CleanTech & Battery Software',
    stage: 'Series A',
    raiseAmount: '$8.0M',
    valuation: '$45M Post',
    description: 'Grid-scale battery management algorithms optimizing renewable power distribution.',
    pitch: 'Predictive software increasing commercial battery pack life by up to 34%.',
    posterType: 'Business',
    posterName: 'Elena Rostova (Founder)',
    posterTg: '@elena_solstice',
    status: 'approved',
    website: 'https://solstice.example.com',
    deckUrl: 'https://deck.example.com/solstice',
    verifications: [
      { id: 'v3', investorTg: '@greentech_syndicate', note: 'Verified utility pilot results in Germany.', date: '2026-09-15' }
    ],
    contests: [
      { id: 'c1', investorTg: '@synth_fund', reason: 'Claimed pilot ARR seems inflated based on recent audit filings.', date: '2026-09-18' }
    ],
    createdAt: '2026-09-14'
  },
  {
    id: 'deal-3',
    title: 'HyperLedger Protocol',
    industry: 'DeFi & Cross-Chain Yield',
    stage: 'Pre-Seed',
    raiseAmount: '$750K',
    valuation: '$6M Cap',
    description: 'Zero-knowledge optimistic rollup for enterprise cross-border payments with sub-second finality.',
    pitch: 'Eliminating settlement drag for cross-border B2B transactions using ZK-proofs.',
    posterType: 'Investor',
    posterName: 'Anonymous Angel',
    posterTg: '@anon_whale_42',
    status: 'approved', // Investor posts publish instantly!
    website: 'https://hyperledger.example.com',
    deckUrl: 'https://deck.example.com/hyperledger',
    verifications: [
      { id: 'v4', investorTg: '@zk_angel', note: 'Lead angel in this pre-seed round.', date: '2026-09-20' }
    ],
    contests: [],
    createdAt: '2026-09-20'
  },
  {
    id: 'deal-4',
    title: 'BioPulse Diagnostics',
    industry: 'HealthTech & Synthetic Bio',
    stage: 'Series B',
    raiseAmount: '$15.0M',
    valuation: '$120M',
    description: 'Non-invasive continuous biomarker tracking micro-patches.',
    pitch: 'Real-time metabolic tracking powering personalized longevity treatments.',
    posterType: 'VC',
    posterName: 'BioVentures Global',
    posterTg: '@bioventures_gp',
    status: 'pending', // Pending admin approval
    website: 'https://biopulse.example.com',
    deckUrl: 'https://deck.example.com/biopulse',
    verifications: [],
    contests: [],
    createdAt: '2026-09-23'
  }
];

export default function App() {
  const [userRole, setUserRole] = useState('Investor'); // 'VC', 'Investor', 'Business', 'Admin'
  const [deals, setDeals] = useState(INITIAL_DEALS);
  const [selectedStage, setSelectedStage] = useState('All');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Telegram auth state mock
  const [isTgLoggedIn, setIsTgLoggedIn] = useState(true);
  const [tgUser, setTgUser] = useState({
    username: 'crypto_scout_99',
    firstName: 'Anon',
    id: '891048201',
    verifiedInvestor: true
  });

  // Modal states
  const [isNewDealModalOpen, setIsNewDealModalOpen] = useState(false);
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [isContestModalOpen, setIsContestModalOpen] = useState(false);
  const [activeDealForAction, setActiveDealForAction] = useState(null);

  // Form states
  const [newDealForm, setNewDealForm] = useState({
    title: '',
    industry: '',
    stage: 'Seed',
    raiseAmount: '',
    valuation: '',
    description: '',
    pitch: '',
    website: '',
    deckUrl: ''
  });

  const [verifyNote, setVerifyNote] = useState('');
  const [contestReason, setContestReason] = useState('');
  const [toastMessage, setToastMessage] = useState(null);

  // Auto hide toast
  const showToast = (msg, type = 'info') => {
    setToastMessage({ text: msg, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const filteredDeals = useMemo(() => {
    return deals.filter(deal => {
      // Role filter visibility
      if (userRole !== 'Admin') {
        // Non-admins can only see approved deals OR their own pending deals
        if (deal.status !== 'approved' && deal.posterTg !== `@${tgUser.username}`) {
          return false;
        }
      }

      // Stage Filter
      if (selectedStage !== 'All' && deal.stage !== selectedStage) {
        return false;
      }

      // Status Filter
      if (selectedStatusFilter === 'Verified' && deal.verifications.length === 0) return false;
      if (selectedStatusFilter === 'Contested' && deal.contests.length === 0) return false;
      if (selectedStatusFilter === 'Pending' && deal.status !== 'pending') return false;

      // Search Query
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const matchesTitle = deal.title.toLowerCase().includes(q);
        const matchesIndustry = deal.industry.toLowerCase().includes(q);
        const matchesPoster = deal.posterName.toLowerCase().includes(q);
        if (!matchesTitle && !matchesIndustry && !matchesPoster) return false;
      }

      return true;
    });
  }, [deals, selectedStage, selectedStatusFilter, searchQuery, userRole, tgUser.username]);

  // Dynamic statistics
  const stats = useMemo(() => {
    const verifiedCount = deals.filter(d => d.verifications.length > 0 && d.status === 'approved').length;
    const pendingCount = deals.filter(d => d.status === 'pending').length;
    const totalDeals = deals.filter(d => d.status === 'approved').length;
    return { verifiedCount, pendingCount, totalDeals };
  }, [deals]);

  const handleCreateDeal = (e) => {
    e.preventDefault();
    if (!isTgLoggedIn) {
      showToast('Please login via Telegram to post!', 'error');
      return;
    }

    // Determine status based on User Role
    // Investors publish instantly. VCs and Businesses require manual admin approval.
    const autoApprove = userRole === 'Investor';
    const initialStatus = autoApprove ? 'approved' : 'pending';

    let posterNameDisplay = tgUser.username;
    if (userRole === 'VC') posterNameDisplay = `${tgUser.username} (VC Syndicate)`;
    if (userRole === 'Business') posterNameDisplay = `${newDealForm.title} Founder`;
    if (userRole === 'Investor') posterNameDisplay = `Verified Investor (@${tgUser.username})`;

    const newEntry = {
      id: `deal-${Date.now()}`,
      title: newDealForm.title,
      industry: newDealForm.industry || 'Tech & Software',
      stage: newDealForm.stage,
      raiseAmount: newDealForm.raiseAmount || 'TBD',
      valuation: newDealForm.valuation || 'Undisclosed',
      description: newDealForm.description,
      pitch: newDealForm.pitch,
      posterType: userRole,
      posterName: posterNameDisplay,
      posterTg: `@${tgUser.username}`,
      status: initialStatus,
      website: newDealForm.website || '#',
      deckUrl: newDealForm.deckUrl || '#',
      verifications: [],
      contests: [],
      createdAt: new Date().toISOString().split('T')[0]
    };

    setDeals([newEntry, ...deals]);
    setIsNewDealModalOpen(false);
    setNewDealForm({
      title: '', industry: '', stage: 'Seed', raiseAmount: '', valuation: '', description: '', pitch: '', website: '', deckUrl: ''
    });

    if (autoApprove) {
      showToast('Investment opportunity published instantly!', 'success');
    } else {
      showToast('Submission received! Awaiting Admin Approval prior to public listing.', 'warning');
    }
  };

  const handleAdminApproval = (dealId, approve) => {
    setDeals(prev => prev.map(d => {
      if (d.id === dealId) {
        return { ...d, status: approve ? 'approved' : 'rejected' };
      }
      return d;
    }));
    showToast(approve ? 'Posting approved & published live!' : 'Posting rejected.', approve ? 'success' : 'error');
  };

  const handleVerifySubmit = (e) => {
    e.preventDefault();
    if (userRole !== 'Investor') {
      showToast('Only verified Investors can verify investments.', 'error');
      return;
    }

    setDeals(prev => prev.map(d => {
      if (d.id === activeDealForAction.id) {
        const updatedVerifications = [
          ...d.verifications,
          {
            id: `v-${Date.now()}`,
            investorTg: `@${tgUser.username}`,
            note: verifyNote || 'Confirmed deal backing and syndicate terms.',
            date: new Date().toISOString().split('T')[0]
          }
        ];
        return { ...d, verifications: updatedVerifications };
      }
      return d;
    }));

    setIsVerifyModalOpen(false);
    setVerifyNote('');
    showToast('Investment successfully verified!', 'success');
  };

  const handleContestSubmit = (e) => {
    e.preventDefault();
    if (userRole !== 'Investor') {
      showToast('Only verified Investors can contest investments.', 'error');
      return;
    }

    setDeals(prev => prev.map(d => {
      if (d.id === activeDealForAction.id) {
        const updatedContests = [
          ...d.contests,
          {
            id: `c-${Date.now()}`,
            investorTg: `@${tgUser.username}`,
            reason: contestReason || 'Disputed deal valuation or terms.',
            date: new Date().toISOString().split('T')[0]
          }
        ];
        return { ...d, contests: updatedContests };
      }
      return d;
    }));

    setIsContestModalOpen(false);
    setContestReason('');
    showToast('Deal contested and flagged for community review.', 'warning');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500 selection:text-slate-950">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl border shadow-2xl backdrop-blur-md transition-all animate-bounce ${
          toastMessage.type === 'success' ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200' :
          toastMessage.type === 'warning' ? 'bg-amber-950/90 border-amber-500/50 text-amber-200' :
          'bg-rose-950/90 border-rose-500/50 text-rose-200'
        }`}>
          {toastMessage.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
          {toastMessage.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-400" />}
          {toastMessage.type === 'error' && <XCircle className="w-5 h-5 text-rose-400" />}
          <span className="text-sm font-medium">{toastMessage.text}</span>
        </div>
      )}

      {/* Navigation Bar */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-500 text-slate-950 font-bold shadow-lg shadow-emerald-500/20">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-lg tracking-wider text-white">VENTURE<span className="text-emerald-400">PULSE</span></span>
                <span className="text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">CF Edge</span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">Anonymous VC & Deal Verification Network</p>
            </div>
          </div>

          {/* Role Switcher & Telegram Auth */}
          <div className="flex items-center gap-3">
            
            {/* Active Role Selector Switcher */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-1 flex items-center">
              <span className="text-[11px] uppercase tracking-wider text-slate-500 px-2 font-bold hidden md:inline">Role:</span>
              {[
                { key: 'Investor', label: 'Investor', icon: User, color: 'text-cyan-400' },
                { key: 'VC', label: 'VC', icon: Briefcase, color: 'text-purple-400' },
                { key: 'Business', label: 'Business', icon: Building2, color: 'text-amber-400' },
                { key: 'Admin', label: 'Admin', icon: Shield, color: 'text-emerald-400' }
              ].map(role => {
                const Icon = role.icon;
                const active = userRole === role.key;
                return (
                  <button
                    key={role.key}
                    onClick={() => setUserRole(role.key)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                      active 
                        ? 'bg-slate-800 text-white shadow-inner border border-slate-700' 
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${role.color}`} />
                    <span>{role.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Telegram Auth Widget Simulation */}
            <div className="border-l border-slate-800 pl-3">
              {isTgLoggedIn ? (
                <div className="flex items-center gap-2 bg-slate-900/80 border border-cyan-500/30 rounded-xl px-3 py-1.5 text-xs text-cyan-200">
                  <div className="relative">
                    <Send className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-400 rounded-full animate-ping" />
                  </div>
                  <span className="font-mono text-slate-300">@{tgUser.username}</span>
                  <button 
                    onClick={() => setIsTgLoggedIn(false)} 
                    title="Log out Telegram session"
                    className="ml-1 text-slate-500 hover:text-rose-400 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsTgLoggedIn(true)}
                  className="flex items-center gap-2 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                >
                  <Send className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Login via Telegram</span>
                </button>
              )}
            </div>

          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Banner Explaining Role Rules */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-900 border border-slate-800/80 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-cyan-400 shrink-0">
              <Info className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-sm text-slate-200">
                  Active Mode: <span className="text-cyan-400 font-bold uppercase">{userRole}</span>
                </h2>
                <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded border border-slate-700">
                  Telegram Identity Guard
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {userRole === 'Investor' && '✨ Instant post publishing. Exclusive privilege to Verify or Contest any deal.'}
                {userRole === 'VC' && '🛡️ Share existing investments/portfolio. Posts require Admin Approval prior to listing.'}
                {userRole === 'Business' && '🚀 Share funding pitches. Posts require Admin Approval prior to appearing live.'}
                {userRole === 'Admin' && '⚡ Moderation mode. Approve or reject pending VC & Business submissions.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto justify-end">
            {userRole !== 'Admin' && (
              <button
                onClick={() => setIsNewDealModalOpen(true)}
                className="flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-semibold px-4 py-2 rounded-xl text-sm transition-all shadow-lg shadow-emerald-500/20 w-full sm:w-auto"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Post Investment / Pitch</span>
              </button>
            )}
          </div>
        </div>

        {/* Stats Metrics Dashboard */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium">Verified Active Deals</p>
              <h3 className="text-2xl font-bold text-emerald-400 mt-1">{stats.verifiedCount}</h3>
            </div>
            <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400 border border-emerald-500/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium">Public Listings</p>
              <h3 className="text-2xl font-bold text-cyan-400 mt-1">{stats.totalDeals}</h3>
            </div>
            <div className="p-3 bg-cyan-500/10 rounded-xl text-cyan-400 border border-cyan-500/20">
              <Layers className="w-6 h-6" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium">Pending Moderation</p>
              <h3 className="text-2xl font-bold text-amber-400 mt-1">{stats.pendingCount}</h3>
            </div>
            <div className="p-3 bg-amber-500/10 rounded-xl text-amber-400 border border-amber-500/20">
              <AlertTriangle className="w-6 h-6" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium">Investor Verifiers</p>
              <h3 className="text-2xl font-bold text-purple-400 mt-1">100% Tg Auth</h3>
            </div>
            <div className="p-3 bg-purple-500/10 rounded-xl text-purple-400 border border-purple-500/20">
              <Send className="w-6 h-6" />
            </div>
          </div>

        </div>

        {/* Filter Toolbar & Stage Selectors */}
        <div className="space-y-4">
          
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
            
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search deals by company, sector, or syndicate..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 transition-colors"
              />
            </div>

            {/* Status Filter Buttons */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0">
              <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider flex items-center gap-1 mr-1">
                <Filter className="w-3.5 h-3.5" /> Status:
              </span>
              {['All', 'Verified', 'Contested', 'Pending'].map(status => (
                <button
                  key={status}
                  onClick={() => setSelectedStatusFilter(status)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                    selectedStatusFilter === status
                      ? 'bg-slate-800 text-cyan-300 border border-cyan-500/40 shadow-sm'
                      : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>

          </div>

          {/* Business Stage Selector Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto border-b border-slate-800/80 pb-3">
            <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider mr-2 shrink-0">
              Stage:
            </span>
            {['All', ...STAGES].map(stage => {
              const active = selectedStage === stage;
              return (
                <button
                  key={stage}
                  onClick={() => setSelectedStage(stage)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    active 
                      ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/10' 
                      : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800/80'
                  }`}
                >
                  {stage}
                </button>
              );
            })}
          </div>

        </div>

        {/* Deals Listing Feed */}
        <div className="space-y-4">
          
          {filteredDeals.length === 0 ? (
            <div className="text-center py-16 bg-slate-900/40 rounded-3xl border border-dashed border-slate-800 space-y-3">
              <Building2 className="w-10 h-10 text-slate-600 mx-auto" />
              <h3 className="text-slate-300 font-semibold text-lg">No deal opportunities found</h3>
              <p className="text-slate-500 text-xs max-w-sm mx-auto">
                No investment entries match your current search, stage filter, or status criteria.
              </p>
            </div>
          ) : (
            filteredDeals.map(deal => {
              const isPending = deal.status === 'pending';
              const isContested = deal.contests.length > 0;
              const isVerified = deal.verifications.length > 0;

              return (
                <div 
                  key={deal.id}
                  className={`group relative rounded-2xl bg-slate-900/80 border transition-all duration-200 hover:border-slate-700/80 overflow-hidden ${
                    isPending ? 'border-amber-500/30 bg-amber-950/10' : 'border-slate-800'
                  }`}
                >
                  {/* Card Header & Badges */}
                  <div className="p-6 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      
                      {/* Title & Stage */}
                      <div>
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <h3 className="text-xl font-bold text-white tracking-wide">{deal.title}</h3>
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-800 text-emerald-400 border border-emerald-500/20">
                            {deal.stage}
                          </span>
                          
                          {/* Approval / Verification Badges */}
                          {isPending && (
                            <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                              <AlertTriangle className="w-3 h-3" /> Pending Admin Approval
                            </span>
                          )}

                          {isVerified && !isPending && (
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                              <ShieldCheck className="w-3 h-3" /> {deal.verifications.length} Investor Verifications
                            </span>
                          )}

                          {isContested && !isPending && (
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">
                              <ShieldAlert className="w-3 h-3" /> Contested ({deal.contests.length})
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-1">{deal.industry}</p>
                      </div>

                      {/* Deal Size & Valuation Metrics */}
                      <div className="flex items-center gap-3 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 shrink-0">
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Target Raise</p>
                          <p className="text-sm font-bold text-cyan-300">{deal.raiseAmount}</p>
                        </div>
                        <div className="w-px h-6 bg-slate-800" />
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Valuation</p>
                          <p className="text-sm font-bold text-slate-300">{deal.valuation}</p>
                        </div>
                      </div>

                    </div>

                    {/* Elevator Pitch & Description */}
                    <div className="space-y-2">
                      <p className="text-sm text-slate-200 font-medium bg-slate-950/40 p-3 rounded-xl border border-slate-800/50">
                        💡 "{deal.pitch}"
                      </p>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        {deal.description}
                      </p>
                    </div>

                    {/* Metadata Footer & Links */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-400 pt-2 border-t border-slate-800/60">
                      
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="flex items-center gap-1 text-slate-400">
                          Posted by: <strong className="text-slate-200">{deal.posterName}</strong> 
                          <span className="font-mono text-cyan-400/80">({deal.posterTg})</span>
                        </span>
                        <span className="text-slate-600">•</span>
                        <span>{deal.createdAt}</span>
                      </div>

                      <div className="flex items-center gap-3">
                        {deal.website && (
                          <a 
                            href={deal.website} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="flex items-center gap-1 hover:text-cyan-400 transition-colors"
                          >
                            <ExternalLink className="w-3.5 h-3.5" /> Website
                          </a>
                        )}
                        {deal.deckUrl && (
                          <a 
                            href={deal.deckUrl} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="flex items-center gap-1 hover:text-cyan-400 transition-colors"
                          >
                            <FileText className="w-3.5 h-3.5" /> Pitch Deck
                          </a>
                        )}
                      </div>

                    </div>

                    {/* Verification and Contest Notes Section */}
                    {(deal.verifications.length > 0 || deal.contests.length > 0) && (
                      <div className="bg-slate-950/80 rounded-xl p-3 border border-slate-800 space-y-2">
                        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                          Investor Verification & Community Notes
                        </p>
                        
                        {/* Verifications list */}
                        {deal.verifications.map(v => (
                          <div key={v.id} className="text-xs flex items-start gap-2 text-emerald-300 bg-emerald-950/20 p-2 rounded-lg border border-emerald-500/20">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-semibold text-slate-200">{v.investorTg}: </span>
                              <span>{v.note}</span>
                            </div>
                          </div>
                        ))}

                        {/* Contests list */}
                        {deal.contests.map(c => (
                          <div key={c.id} className="text-xs flex items-start gap-2 text-rose-300 bg-rose-950/20 p-2 rounded-lg border border-rose-500/20">
                            <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-semibold text-slate-200">{c.investorTg} (Contested): </span>
                              <span>{c.reason}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                  </div>

                  {/* Action Bar (Investor Verifications OR Admin Moderation) */}
                  <div className="bg-slate-950/80 px-6 py-3 border-t border-slate-800 flex items-center justify-between gap-4">
                    
                    {/* Admin Moderation Controls */}
                    {userRole === 'Admin' && isPending ? (
                      <div className="flex items-center justify-between w-full">
                        <span className="text-xs text-amber-400 font-semibold flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" /> VC/Business Posting Awaiting Review
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleAdminApproval(deal.id, false)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 transition-all"
                          >
                            <X className="w-3.5 h-3.5" /> Reject
                          </button>
                          <button
                            onClick={() => handleAdminApproval(deal.id, true)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 transition-all"
                          >
                            <Check className="w-3.5 h-3.5" /> Approve & Publish
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Investor Exclusive Verification & Contest Buttons */
                      <div className="flex items-center justify-between w-full">
                        <div className="text-xs text-slate-400">
                          {userRole === 'Investor' ? (
                            <span className="text-emerald-400 font-medium">Verified Investor Access Active</span>
                          ) : (
                            <span className="text-slate-500">Switch role to 'Investor' to verify or contest deals</span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              if (userRole !== 'Investor') {
                                showToast('Only verified Investors can contest deals!', 'error');
                                return;
                              }
                              setActiveDealForAction(deal);
                              setIsContestModalOpen(true);
                            }}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                              userRole === 'Investor'
                                ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                : 'bg-slate-800/50 text-slate-500 border border-slate-700/50 cursor-not-allowed'
                            }`}
                          >
                            <ShieldAlert className="w-3.5 h-3.5" /> Contest Deal
                          </button>

                          <button
                            onClick={() => {
                              if (userRole !== 'Investor') {
                                showToast('Only verified Investors can verify deals!', 'error');
                                return;
                              }
                              setActiveDealForAction(deal);
                              setIsVerifyModalOpen(true);
                            }}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                              userRole === 'Investor'
                                ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 shadow-sm'
                                : 'bg-slate-800/50 text-slate-500 border border-slate-700/50 cursor-not-allowed'
                            }`}
                          >
                            <ShieldCheck className="w-3.5 h-3.5" /> Verify Investment
                          </button>
                        </div>
                      </div>
                    )}

                  </div>

                </div>
              );
            })
          )}

        </div>

      </main>

      {/* MODAL: Create New Deal / Pitch Posting */}
      {isNewDealModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white">
                  Submit Investment Opportunity
                </h3>
                <p className="text-xs text-slate-400">
                  Posting as: <span className="text-cyan-400 font-semibold">{userRole}</span> (@{tgUser.username})
                </p>
              </div>
              <button 
                onClick={() => setIsNewDealModalOpen(false)}
                className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800/50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Approval Info Alert Banner */}
            <div className={`p-3.5 rounded-xl text-xs flex items-start gap-2 border ${
              userRole === 'Investor' 
                ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200' 
                : 'bg-amber-950/30 border-amber-500/30 text-amber-200'
            }`}>
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                {userRole === 'Investor' ? (
                  <span><strong>Instant Listing:</strong> As a verified Investor, your post will be published immediately to the live deal stream.</span>
                ) : (
                  <span><strong>Approval Required:</strong> VCs & Business submissions require manual Admin review prior to appearing publicly on the platform.</span>
                )}
              </div>
            </div>

            <form onSubmit={handleCreateDeal} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Company / Project Name *</label>
                <input
                  type="text"
                  required
                  value={newDealForm.title}
                  onChange={(e) => setNewDealForm({...newDealForm, title: e.target.value})}
                  placeholder="e.g. CloudPulse Systems"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Funding Stage *</label>
                  <select
                    value={newDealForm.stage}
                    onChange={(e) => setNewDealForm({...newDealForm, stage: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
                  >
                    {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Sector / Industry</label>
                  <input
                    type="text"
                    value={newDealForm.industry}
                    onChange={(e) => setNewDealForm({...newDealForm, industry: e.target.value})}
                    placeholder="e.g. FinTech / AI Edge"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Target Raise Size</label>
                  <input
                    type="text"
                    value={newDealForm.raiseAmount}
                    onChange={(e) => setNewDealForm({...newDealForm, raiseAmount: e.target.value})}
                    placeholder="e.g. $1.5M SAFEs"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Valuation Cap / Terms</label>
                  <input
                    type="text"
                    value={newDealForm.valuation}
                    onChange={(e) => setNewDealForm({...newDealForm, valuation: e.target.value})}
                    placeholder="e.g. $12M Post"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Elevator Pitch (1 Line Summary) *</label>
                <input
                  type="text"
                  required
                  value={newDealForm.pitch}
                  onChange={(e) => setNewDealForm({...newDealForm, pitch: e.target.value})}
                  placeholder="Sub-10ms decentralized database built on Workers..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Detailed Narrative & Metrics *</label>
                <textarea
                  required
                  rows={3}
                  value={newDealForm.description}
                  onChange={(e) => setNewDealForm({...newDealForm, description: e.target.value})}
                  placeholder="Share traction, MoM growth, team background, syndicate leads..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Website URL</label>
                  <input
                    type="url"
                    value={newDealForm.website}
                    onChange={(e) => setNewDealForm({...newDealForm, website: e.target.value})}
                    placeholder="https://example.com"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Pitch Deck Link</label>
                  <input
                    type="url"
                    value={newDealForm.deckUrl}
                    onChange={(e) => setNewDealForm({...newDealForm, deckUrl: e.target.value})}
                    placeholder="https://docsend.com/..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewDealModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-sm font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20"
                >
                  Submit Opportunity
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* MODAL: Investor Verification */}
      {isVerifyModalOpen && activeDealForAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-white">Verify Investment</h3>
              </div>
              <button onClick={() => setIsVerifyModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              You are verifying <strong className="text-emerald-400">{activeDealForAction.title}</strong> as a verified investor under <span className="font-mono text-cyan-300">@{tgUser.username}</span>.
            </p>

            <form onSubmit={handleVerifySubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Verification Note / Endorsement (Optional)
                </label>
                <textarea
                  rows={3}
                  value={verifyNote}
                  onChange={(e) => setVerifyNote(e.target.value)}
                  placeholder="e.g. Participated in this round with $50k check. SAFE terms verified."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsVerifyModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-500 text-slate-950 font-bold shadow-lg shadow-emerald-500/20"
                >
                  Confirm Verification
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* MODAL: Investor Contest */}
      {isContestModalOpen && activeDealForAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-400" />
                <h3 className="font-bold text-white">Contest / Dispute Deal</h3>
              </div>
              <button onClick={() => setIsContestModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Contesting <strong className="text-rose-400">{activeDealForAction.title}</strong> will flag this posting for community review.
            </p>

            <form onSubmit={handleContestSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Reason for Contest / Dispute *
                </label>
                <textarea
                  required
                  rows={3}
                  value={contestReason}
                  onChange={(e) => setContestReason(e.target.value)}
                  placeholder="e.g. Valuation cap reported is incorrect, or founder claims lead investor backing without authorization."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsContestModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-500 text-white font-bold shadow-lg shadow-rose-500/20"
                >
                  Submit Contest Flag
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
