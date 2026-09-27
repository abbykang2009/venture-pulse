import React, { useState, useEffect } from 'react';
import { Building2, RefreshCw, Send, PlusCircle, ShieldAlert, LogOut, Lock, CheckCircle2, ShieldCheck, X, Image as ImageIcon, Loader2 } from 'lucide-react';

interface User {
  id: string;
  username: string;
  first_name: string;
  auth_date: number;
  hash?: string;
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
}

declare global {
  interface Window {
    onTelegramAuth?: (user: User) => void;
  }
}

const ADMIN_HANDLES = ['exhamstersg', 'EmilyCucCung'];

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [selectedRole, setSelectedRole] = useState<'Investor' | 'Vc' | 'Business' | 'Admin'>('Investor');
  const [selectedStage, setSelectedStage] = useState<string>('All');
  const [deals, setDeals] = useState<Deal[]>([]);
  const [isLoadingDeals, setIsLoadingDeals] = useState(true);

  // Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [stage, setStage] = useState('Pre-Seed');
  const [rate, setRate] = useState('');
  const [originCity, setOriginCity] = useState('');
  const [hqCity, setHqCity] = useState('');
  const [description, setDescription] = useState('');

  // Image Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isAdmin = user ? ADMIN_HANDLES.includes(user.username) : false;

  // Load saved session
  useEffect(() => {
    const savedUser = localStorage.getItem('vp_user');
    if (savedUser) {
      const parsedUser: User = JSON.parse(savedUser);
      setUser(parsedUser);
      setSelectedRole(ADMIN_HANDLES.includes(parsedUser.username) ? 'Admin' : 'Investor');
    }
  }, []);

  // Set up Telegram widget callback
  useEffect(() => {
    window.onTelegramAuth = (telegramUser: User) => {
      setUser(telegramUser);
      localStorage.setItem('vp_user', JSON.stringify(telegramUser));
      setSelectedRole(ADMIN_HANDLES.includes(telegramUser.username) ? 'Admin' : 'Investor');
    };
  }, []);

  // Inject Telegram widget
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

  // Fetch deals from Cloudflare D1 backend API
  const fetchDeals = async () => {
    setIsLoadingDeals(true);
    try {
      const res = await fetch('/api/deals');
      if (res.ok) {
        const data = await res.json();
        setDeals(data);
      } else {
        console.error('Failed to fetch deals from Cloudflare D1 API');
      }
    } catch (err) {
      console.error('Error fetching deals:', err);
    } finally {
      setIsLoadingDeals(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchDeals();
    }
  }, [user]);

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
        // Refetch updated list directly from D1 Database
        await fetchDeals();

        // Reset Form
        setName('');
        setStage('Pre-Seed');
        setRate('');
        setOriginCity('');
        setHqCity('');
        setDescription('');
        setSelectedFile(null);
        setPreviewUrl(null);
        setIsModalOpen(false);
      } else {
        const errText = await res.text();
        console.error('Failed to save deal:', errText);
        alert('Error publishing opportunity. Please try again.');
      }
    } catch (error) {
      console.error('Error saving deal:', error);
      alert('Error publishing opportunity. Check network log.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredDeals = selectedStage === 'All'
    ? deals
    : deals.filter(deal => deal.stage === selectedStage);

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
    <div className="min-h-screen bg-[#070913] text-slate-100 font-sans p-6 space-y-6">
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
              <><strong className="text-white">INVESTOR NETWORK:</strong> Share vetted deals or discover anonymized opportunities directly within the community.</>
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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 pt-2">
          {filteredDeals.map((deal) => (
            <div
              key={deal.id}
              className="border border-slate-800/80 bg-slate-900/50 hover:border-slate-700 p-6 rounded-2xl space-y-4 transition flex flex-col justify-between overflow-hidden"
            >
              <div className="space-y-3">
                {deal.imageUrl && (
                  <div className="h-40 w-full overflow-hidden rounded-xl bg-slate-950 border border-slate-800">
                    <img src={deal.imageUrl} alt={deal.name} className="h-full w-full object-cover" />
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="inline-block text-xs font-semibold px-2.5 py-1 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    {deal.stage}
                  </span>
                  {deal.postedBy && (
                    <span className="text-[11px] font-mono text-slate-500">
                      via @{deal.postedBy}
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-bold text-white tracking-tight">{deal.name}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{deal.description}</p>
              </div>

              <div className="space-y-2 pt-4 border-t border-slate-800/60 text-xs font-medium text-slate-400">
                <div className="flex items-center justify-between">
                  <span>Rate: <strong className="text-slate-200">{deal.rate}</strong></span>
                  <span className="text-indigo-400 font-semibold">HQ: {deal.hqCity}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>Origin: {deal.originCity}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL FORM WITH D1 & R2 SUPPORT */}
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

              {/* PHOTO UPLOAD FIELD */}
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
