import React, { useState, useEffect } from 'react';
import { Building2, RefreshCw, Send, PlusCircle, ShieldAlert, LogOut, Lock, CheckCircle2, ShieldCheck } from 'lucide-react';

interface User {
  id: string;
  username: string;
  first_name: string;
  auth_date: number;
  hash?: string;
}

interface Deal {
  id: string;
  title: string;
  stage: string;
  description: string;
  amountNeeded: string;
  location: string;
}

// Global interface for Telegram window callback
declare global {
  interface Window {
    onTelegramAuth?: (user: User) => void;
  }
}

// LIST YOUR ADMIN TELEGRAM USERNAMES HERE (without the @ symbol)
const ADMIN_HANDLES = [
  'exhamstersg',
  'EmilyCucCung'
]; 

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

  // Check if current user is an Admin
  const isAdmin = user ? ADMIN_HANDLES.includes(user.username) : false;

  // Load saved user session on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('vp_user');
    if (savedUser) {
      const parsedUser: User = JSON.parse(savedUser);
      setUser(parsedUser);
      if (ADMIN_HANDLES.includes(parsedUser.username)) {
        setSelectedRole('Admin');
      } else {
        setSelectedRole('Investor');
      }
    }
  }, []);

  // Global Telegram callback listener
  useEffect(() => {
    window.onTelegramAuth = (telegramUser: User) => {
      setUser(telegramUser);
      localStorage.setItem('vp_user', JSON.stringify(telegramUser));
      if (ADMIN_HANDLES.includes(telegramUser.username)) {
        setSelectedRole('Admin');
      } else {
        setSelectedRole('Investor');
      }
    };
  }, []);

  // Dynamically inject Telegram Script into container element
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

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('vp_user');
  };

  const filteredDeals = selectedStage === 'All'
    ? deals
    : deals.filter(deal => deal.stage === selectedStage);

  // ---------------------------------------------------------------------------
  // COMPULSORY LOGIN SCREEN (Active enforcement if unauthenticated)
  // ---------------------------------------------------------------------------
  if (!user) {
    return (
      <div className="min-h-screen bg-[#070913] text-slate-100 flex items-center justify-center p-4 font-sans">
        <div className="w-full max-w-md bg-slate-900/80 border border-slate-800 rounded-3xl p-8 space-y-8 shadow-2xl text-center backdrop-blur-xl">
          
          <div className="space-y-3">
            <div className="inline-flex p-3.5 bg-indigo-600/20 border border-indigo-500/30 rounded-2xl text-indigo-400">
              <Building2 className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">VenturePulse</h1>
            <p className="text-sm text-slate-400">
              Anonymized VC & Investor Network.
            </p>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 text-left space-y-2 text-xs text-slate-300">
            <div className="flex items-center gap-2 text-indigo-400 font-semibold">
              <Lock className="w-4 h-4" />
              <span>Investor Access Only</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Standard registration is restricted to Investors. VCs and Businesses seeking portal listings must submit details via an Admin.
            </p>
          </div>

          {/* Official Telegram Widget Injected Here */}
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
          {/* Role Display: Admin Switcher vs Locked Investor Badge */}
          {isAdmin ? (
            <div className="flex items-center bg-slate-900/80 border border-indigo-500/30 rounded-xl p-1 text-xs font-semibold">
              <span className="px-3 text-indigo-400 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Admin Mode:
              </span>
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
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900/80 border border-slate-800 rounded-xl text-xs font-semibold text-slate-300">
              <span className="text-slate-500">Role:</span>
              <span className="text-indigo-400 font-bold">Investor</span>
            </div>
          )}

          <button className="p-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 hover:text-white transition">
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* User Badge showing verified Telegram Handle */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono text-indigo-300">
            <Send className="w-3.5 h-3.5 text-indigo-400" />
            <span>@{user.username || user.first_name}</span>
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

      {/* Permissions Banner & Action Button */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-sm text-slate-300">
          <ShieldAlert className="w-5 h-5 text-indigo-400 shrink-0" />
          <span>
            {isAdmin ? (
              <><strong className="text-white">ADMIN PERMISSIONS:</strong> You can manage, post, and review deal submissions on behalf of VCs and Businesses.</>
            ) : (
              <><strong className="text-white">INVESTOR ACCESS:</strong> View curated opportunities, verify deal details, and connect directly with verified deal leads.</>
            )}
          </span>
        </div>

        <button className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl transition shadow-lg shadow-indigo-600/20">
          <PlusCircle className="w-4 h-4" />
          <span>{isAdmin ? 'Post Deal (Admin)' : 'Submit Listing Application'}</span>
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
