import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, User, LogIn, UserPlus, Eye, EyeOff } from 'lucide-react';
import api from '../api/axios';
import { isAuthenticated, setTokens } from '../utils/auth';

export default function Login() {
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const navigate = useNavigate();

  const sessionExpiredMessage = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('reason') === 'expired' ? 'Session expiree. Veuillez vous reconnecter.' : '';
  }, []);

  const verifyEmailMessage = useMemo(() => {
    const state = new URLSearchParams(window.location.search).get('verified');
    if (state === 'pending') return 'Inscription reussie. Verifiez votre email pour activer le compte.';
    if (state === 'success') return 'Email verifie. Vous pouvez maintenant vous connecter.';
    if (state === 'invalid') return 'Lien de verification invalide ou expire.';
    if (state === 'missing') return 'Token de verification manquant.';
    return '';
  }, []);

  useEffect(() => {
    if (isAuthenticated()) navigate('/dashboard', { replace: true });
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSubmitting(true);
    try {
      const res = await api.post('token/', credentials);
      setTokens(res.data.access, res.data.refresh, rememberMe);
      navigate('/dashboard', { replace: true });
    } catch {
      setErrorMessage('Identifiants invalides.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_20%_10%,rgba(42,163,255,0.18),transparent_30%),radial-gradient(circle_at_85%_15%,rgba(36,194,137,0.13),transparent_25%),linear-gradient(180deg,#0B1017_0%,#090D14_100%)]" />
      <div className="mx-auto grid w-full max-w-6xl overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl lg:grid-cols-2">
        <aside className="hidden lg:block border-r border-slate-800 p-10">
          <h1 className="text-3xl font-bold text-slate-100">Nexora Budget</h1>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            Plateforme de pilotage financier personnel: suivi des flux, budgets intelligents, export de reporting.
          </p>
          <div className="mt-8 space-y-3 text-sm text-slate-300">
            <p>1. Suivi des transactions en temps reel</p>
            <p>2. Budgets mensuels par categorie</p>
            <p>3. Analyse visuelle et rapport PDF</p>
          </div>
        </aside>

        <main className="p-8 md:p-10">
          <h2 className="text-2xl font-bold text-slate-100">Connexion</h2>
          <p className="mt-1 text-sm text-slate-400">Accedez a votre espace de gestion.</p>

          {sessionExpiredMessage && <p className="mt-4 text-sm text-amber-300">{sessionExpiredMessage}</p>}
          {verifyEmailMessage && (
            <p className={`mt-2 text-sm ${verifyEmailMessage.includes('maintenant') ? 'text-emerald-300' : 'text-rose-300'}`}>
              {verifyEmailMessage}
            </p>
          )}

          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <div className="relative">
              <User className="absolute left-3 top-3 text-slate-500" size={18} />
              <input
                type="text"
                required
                placeholder="Nom d'utilisateur"
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 pl-10 text-sm text-slate-100 outline-none focus:border-sky-500"
                value={credentials.username}
                onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-3 text-slate-500" size={18} />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="Mot de passe"
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 pl-10 pr-10 text-sm text-slate-100 outline-none focus:border-sky-500"
                value={credentials.password}
                onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200"
                aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                title={showPassword ? 'Masquer' : 'Afficher'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <label className="flex items-center gap-2 text-xs text-slate-400">
              <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
              Se souvenir de moi
            </label>

            {errorMessage && <p className="text-sm text-rose-400">{errorMessage}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-500 disabled:opacity-60"
            >
              <LogIn size={18} />
              {submitting ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>

          <div className="mt-5">
            <Link to="/signup" className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-400 hover:text-emerald-300">
              <UserPlus size={17} />
              Creer un compte
            </Link>
          </div>
        </main>
      </div>
    </div>
  );
}
