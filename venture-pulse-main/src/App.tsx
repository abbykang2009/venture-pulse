import { useEffect, useState } from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import { Building2, Send, LogOut, Lock, CheckCircle2, Loader2, ShieldCheck, Users2 } from 'lucide-react';
import type { User, TelegramAuthData } from './types';
import FeedPage from './pages/FeedPage';
import ProfilePage from './pages/ProfilePage';
import PublicProfilePage from './pages/PublicProfilePage';
import CirclePage from './pages/CirclePage';
import DealPage from './pages/DealPage';
import UsersPage from './pages/UsersPage';

declare global {
  interface Window {
    onTelegramAuth?: (user: TelegramAuthData) => void;
  }
}

const displayName = (u: User) => (u.username ? `@${u.username}` : u.firstName || 'Investor');

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const navigate = useNavigate();

  const isUserAdmin = user?.isAdmin ?? false;

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
    navigate('/');
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('Error logging out:', err);
    }
    handleUnauthorized();
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-white" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-black text-neutral-100 flex items-center justify-center p-4 font-sans">
        <div className="w-full max-w-md bg-neutral-900/80 border border-neutral-800 rounded-3xl p-8 space-y-8 shadow-2xl text-center backdrop-blur-xl">
          <div className="space-y-3">
            <div className="inline-flex p-3.5 bg-white/10 border border-white/20 rounded-2xl text-white">
              <Building2 className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">VenturePulse</h1>
            <p className="text-sm text-neutral-400">Anonymized Opportunities Network</p>
          </div>

          <div className="bg-neutral-950/60 border border-neutral-800/80 rounded-2xl p-4 text-left space-y-2 text-xs text-neutral-300">
            <div className="flex items-center gap-2 text-white font-semibold">
              <Lock className="w-4 h-4" />
              <span>Investor Access Only</span>
            </div>
            <p className="text-neutral-400 leading-relaxed">
              Standard registration is restricted to Investors. Authenticate via Telegram to view and submit opportunities.
            </p>
          </div>

          <div className="flex justify-center items-center py-2 min-h-[48px]">
            {isLoggingIn ? (
              <span className="flex items-center gap-2 text-sm text-neutral-400">
                <Loader2 className="w-4 h-4 animate-spin text-white" /> Verifying with Telegram...
              </span>
            ) : (
              <div id="telegram-widget-container"></div>
            )}
          </div>

          {loginError && (
            <p className="text-xs text-rose-400 bg-rose-950/30 border border-rose-900/50 rounded-xl px-3 py-2">{loginError}</p>
          )}

          <div className="flex items-center justify-center gap-4 text-xs text-neutral-500 pt-2 border-t border-neutral-800/60">
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Verified Network</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Vetted Deals</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-neutral-100 font-sans p-6 space-y-6 max-w-7xl mx-auto">
      <header className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-neutral-800/60">
        <Link to="/" className="flex items-center gap-3">
          <div className="p-2.5 bg-white/10 border border-white/20 rounded-xl text-white">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">VenturePulse</h1>
            <p className="text-xs text-neutral-400 font-medium">Anonymized Opportunities Network</p>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          {isUserAdmin && (
            <div className="flex items-center bg-neutral-900 border border-neutral-800 rounded-xl p-1 text-xs font-medium">
              <button
                onClick={() => setIsAdminMode(false)}
                className={`px-3 py-1.5 rounded-lg transition-all ${!isAdminMode ? 'bg-white text-black shadow-sm font-semibold' : 'text-neutral-400 hover:text-white'}`}
              >
                User
              </button>
              <button
                onClick={() => setIsAdminMode(true)}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${isAdminMode ? 'bg-white text-black shadow-sm font-semibold' : 'text-neutral-400 hover:text-white'}`}
              >
                <ShieldCheck className="w-3.5 h-3.5" /> Admin
              </button>
            </div>
          )}

          <Link
            to="/users"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-white/40 rounded-xl text-xs font-semibold text-neutral-300 hover:text-white transition"
          >
            <Users2 className="w-3.5 h-3.5" /> Users
          </Link>

          <Link
            to="/me"
            className="flex items-center gap-2 px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-white/40 rounded-xl text-xs font-mono text-neutral-300 transition"
          >
            {user.photoUrl ? (
              <img src={user.photoUrl} alt="" referrerPolicy="no-referrer" className="w-5 h-5 rounded-full object-cover" />
            ) : (
              <Send className="w-3.5 h-3.5 text-white" />
            )}
            <span>{displayName(user)}</span>
          </Link>

          <button
            onClick={handleLogout}
            title="Log out"
            className="p-2 bg-neutral-900 hover:bg-rose-950/40 border border-neutral-800 hover:border-rose-800/60 text-neutral-400 hover:text-rose-400 rounded-xl transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <Routes>
        <Route
          path="/"
          element={<FeedPage user={user} isAdminMode={isAdminMode} isUserAdmin={isUserAdmin} onUnauthorized={handleUnauthorized} />}
        />
        <Route path="/me" element={<ProfilePage user={user} onUnauthorized={handleUnauthorized} onProfileDeleted={handleLogout} />} />
        <Route path="/u/:id" element={<PublicProfilePage isAdminMode={isAdminMode} onUnauthorized={handleUnauthorized} />} />
        <Route
          path="/circles/:id"
          element={<CirclePage currentUserId={user.id} isAdminMode={isAdminMode} onUnauthorized={handleUnauthorized} />}
        />
        <Route path="/deals/:id" element={<DealPage isAdminMode={isAdminMode} onUnauthorized={handleUnauthorized} />} />
        <Route path="/users" element={<UsersPage currentUserId={user.id} isAdminMode={isAdminMode} onUnauthorized={handleUnauthorized} />} />
      </Routes>
    </div>
  );
}
