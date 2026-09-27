import React, { useState, useEffect } from 'react';
import { Building2, RefreshCw, Send, PlusCircle, ShieldAlert, LogOut, Lock, CheckCircle2 } from 'lucide-react';

interface User {
  id: string;
  username: string;
  first_name: string;
  auth_date: number;
}

interface Deal {
  id: string;
  title: string;
  stage: string;
  description: string;
  amountNeeded: string;
  location: string;
}

const INITIAL_DEALS: Deal[] = [
  {
    id: '1',
    title: 'Fintech Cross-Border Payments',
    stage: 'Seed',
    description: 'B2B payment rail infrastructure expansion across Southeast Asia.',
    amountNeeded: '$1.5M',
    location: 'Singapore'
  },
  {
    id: '2',
    title: 'AI Workflow Automation Platform',
    stage: 'Pre-Seed',
    description: 'LLM-powered document processing agent for enterprise compliance.',
    amountNeeded: '$500k',
    location: 'Remote'
  },
  {
    id: '3',
    title: 'Logistics Optimization API',
    stage: 'Series A',
    description: 'Route planning and telemetry data analytics for regional fleets.',
    amountNeeded: '$5.0M',
    location: 'Vietnam'
  }
];

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [selectedRole, setSelectedRole] = useState<'Investor' | 'Vc' | 'Business' | 'Admin'>('Investor');
  const [selectedStage, setSelectedStage] = useState<string>('All');
  const [deals, setDeals] = useState<Deal[]>(INITIAL_DEALS);

  // Load user session on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('vp_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const handleDemoLogin = () => {
    const mockUser: User = {
      id: '99823411',
      username: 'investor_anon_99',
      first_name: 'Alex',
      auth_date: Math.floor(Date.now() / 1000)
    };
    setUser(mockUser);
    localStorage.setItem('vp_user', JSON.stringify(mockUser));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('vp_user');
  };

  const filteredDeals = selectedStage === 'All'
    ? deals
    : deals.filter(deal => deal.stage === selectedStage);

  // ---------------------------------------------------------------------------
  // COMPULSORY LOGIN SCREEN (Rendered if user is not authenticated)
  // ---------------------------------------------------------------------------
  if (!user) {
    return (
      <div className="min-h-screen bg-[#070913] text-slate-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-900/80 border border-slate-800 rounded-3xl p-8 space-y-8 shadow-2xl text-center">
          
          <div className="space-y-3">
            <div className="inline-flex p-3 bg-indigo-600/20 border border-indigo-500/30 rounded-2xl text-indigo-400">
              <Building2 className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">VenturePulse</h1>
            <p className="text-sm text-slate-400">
              Anonymized VC & Investor Network. Login required to view deals and participate.
            </p>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 text-left space-y-2 text-xs text-slate-300">
            <div className="flex items-center gap-2 text-indigo-400 font-semibold">
              <Lock className="w-4 h-4" />
              <span>Restricted Access</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              To preserve deal confidentiality and network trust, all participants must authenticate via Telegram.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            {/* Primary Telegram Action */}
            <button
              onClick={handleDemoLogin}
              className="w-full flex items-center justify-center gap-3 py-3.5 px-4 bg-[#2AABEE] hover:bg-[#229ED9] text-white font-semibold rounded-xl transition shadow-lg shadow-[#2AABEE]/20 text-sm"
            >
              <Send className="w-4 h-4 fill-current" />
              <span>Log in with Telegram</span>
            </button>

            {/* Quick Demo Bypass */}
            <button
              onClick={handleDemoLogin}
              className="w-full py-2.5 px-4 bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-white font-medium rounded-xl transition text-xs border border-slate-700/50"
            >
              Quick Test Login (Demo Mode)
            </button>
          </div>

          <div className="flex items-center justify-center gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Verified Investors</span>
            <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Anonymous Handles</span>
          </div>

        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // MAIN PLATFORM INTERFACE (Rendered once authenticated)
  // ---------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-[#070913] text-slate-100 font-sans p-6 space-y-6">
      {/* Top Header Navigation */}
      <header className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800/60">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-600/20 border border-indigo-500/30 rounded-xl text-indigo-400">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              VenturePulse
            </h1>
            <p className="text-xs text-slate-400 font-medium">Anonymized VC & Investor Network</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Role Switcher */}
          <div className="flex items-center bg-slate-900/80 border border-slate-800 rounded-xl p-1 text-xs font-semibold">
            <span className="px-3 text-slate-400">Role:</span>
            {(['Investor', 'Vc', 'Business', 'Admin'] as const).map((role) => (
              <button
                key={role}
                onClick={() => setSelectedRole(role)}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  selectedRole === role
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {role}
              </button>
            ))}
          </div>

          <button className="p-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 hover:text-white transition">
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* User Badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono text-indigo-300">
            <Send className="w-3.5 h-3.5 text-indigo-400" />
            <span>@{user.username}</span>
          </div>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            title="Log out"
            className="p-2 bg-slate-900 hover:bg-rose-950/40 border border-slate-800 hover:border-rose-800/60 text-slate-400 hover:text-rose-400 rounded-xl transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Permissions Banner & Share Button */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-sm text-slate-300">
          <ShieldAlert className="w-5 h-5 text-indigo-400 shrink-0" />
          <span>
            <strong className="text-white">Current Permissions ({selectedRole.toUpperCase()}):</strong> Post freely without approval. Exclusive rights to Verify or Contest deals.
          </span>
        </div>

        <button className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl transition shadow-lg shadow-indigo-600/20">
          <PlusCircle className="w-4 h-4" />
          <span>Share Opportunity</span>
        </button>
      </div>

      {/* Stage Filter Tab Bar */}
      <div className="flex flex-wrap items-center gap-2 pt-2">
        {['All', 'Pre-Seed', 'Seed', 'Series A', 'Series B', 'Series C', 'Others'].map((stage) => (
          <button
            key={stage}
            onClick={() => setSelectedStage(stage)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
              selectedStage === stage
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
            }`}
          >
            {stage}
          </button>
        ))}
      </div>

      {/* Deals Feed Grid */}
      {filteredDeals.length === 0 ? (
        <div className="border border-slate-800/80 bg-slate-900/30 rounded-2xl p-16 text-center text-slate-400 font-medium">
          No investment opportunities found for this stage.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 pt-2">
          {filteredDeals.map((deal) => (
            <div
              key={deal.id}
              className="border border-slate-800/80 bg-slate-900/50 hover:border-slate-700 p-6 rounded-2xl space-y-4 transition flex flex-col justify-between"
            >
              <div className="space-y-3">
                <span className="inline-block text-xs font-semibold px-2.5 py-1 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {deal.stage}
                </span>
                <h3 className="text-lg font-bold text-white tracking-tight">{deal.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{deal.description}</p>
              </div>

              <div className="text-xs text-slate-500 flex items-center justify-between pt-4 border-t border-slate-800/60 font-medium">
                <span>Target: <strong className="text-slate-300">{deal.amountNeeded}</strong></span>
                <span className="text-slate-400">{deal.location}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
