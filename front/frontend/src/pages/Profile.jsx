import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import api from '../api/axios';

const fmtDate = (v) => (v ? new Date(v).toLocaleString() : 'Non disponible');

export default function Profile() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [profile, setProfile] = useState(null);
  const [preferences, setPreferences] = useState({
    avatar_url: '',
    currency: 'FCFA',
    timezone: 'UTC',
    date_format: 'DD/MM/YYYY',
  });

  const fetchProfile = async () => {
    try {
      const res = await api.get('profile/');
      setProfile(res.data);
      setPreferences({
        avatar_url: res.data?.preferences?.avatar_url || '',
        currency: res.data?.preferences?.currency || 'FCFA',
        timezone: res.data?.preferences?.timezone || 'UTC',
        date_format: res.data?.preferences?.date_format || 'DD/MM/YYYY',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const savePreferences = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.patch('profile/', { preferences });
      await fetchProfile();
    } finally {
      setSaving(false);
    }
  };

  const handleResetAllData = async () => {
    const accepted = window.confirm(
      'Cette action va supprimer toutes vos transactions, categories, portefeuilles et budgets. Continuer ?'
    );
    if (!accepted) return;

    const typed = window.prompt('Tapez RESET pour confirmer la reinitialisation complete:');
    if (typed !== 'RESET') return;

    setResetting(true);
    try {
      await api.post('reset-data/', { confirm: 'RESET' });
      await fetchProfile();
      window.alert('Toutes vos donnees ont ete remises a zero.');
    } catch {
      window.alert('Echec de la reinitialisation. Reessayez.');
    } finally {
      setResetting(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen p-8 text-slate-200">Chargement...</div>;
  }

  const fullName = `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || profile?.username || '-';

  return (
    <div className="min-h-screen px-4 py-6 md:px-8 md:py-10">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_10%_15%,rgba(42,163,255,0.15),transparent_30%),linear-gradient(180deg,#0B1017_0%,#090D14_100%)]" />

      <div className="mx-auto w-full max-w-5xl">
        <button onClick={() => navigate('/dashboard')} className="mb-6 inline-flex items-center gap-2 text-slate-300 hover:text-white">
          <ArrowLeft size={18} />
          Retour dashboard
        </button>

        <section className="mb-6 grid grid-cols-1 gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-6 lg:grid-cols-2">
          <div>
            <h1 className="text-2xl font-bold text-slate-100">Profil utilisateur</h1>
            <p className="mt-1 text-sm text-slate-400">Informations de compte et preferences d’affichage.</p>
          </div>
          <div className="space-y-1 text-sm">
            <p><span className="text-slate-400">Nom:</span> <span className="text-slate-200">{fullName}</span></p>
            <p><span className="text-slate-400">Username:</span> <span className="text-slate-200">@{profile?.username || '-'}</span></p>
            <p><span className="text-slate-400">Email:</span> <span className="text-slate-200">{profile?.email || 'Aucun'}</span></p>
            <p><span className="text-slate-400">Inscription:</span> <span className="text-slate-200">{fmtDate(profile?.date_joined)}</span></p>
            <p><span className="text-slate-400">Derniere connexion:</span> <span className="text-slate-200">{fmtDate(profile?.last_login)}</span></p>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="mb-4 text-lg font-semibold text-slate-100">Preferences</h2>
          <form onSubmit={savePreferences} className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <input className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm" placeholder="URL avatar" value={preferences.avatar_url} onChange={(e) => setPreferences((p) => ({ ...p, avatar_url: e.target.value }))} />
            <select className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm" value={preferences.currency} onChange={(e) => setPreferences((p) => ({ ...p, currency: e.target.value }))}>
              <option value="FCFA">FCFA</option>
              <option value="EUR">EUR</option>
              <option value="USD">USD</option>
              <option value="XOF">XOF</option>
              <option value="XAF">XAF</option>
              <option value="GBP">GBP</option>
              <option value="CAD">CAD</option>
              <option value="CHF">CHF</option>
              <option value="JPY">JPY</option>
              <option value="CNY">CNY</option>
              <option value="NGN">NGN</option>
              <option value="GHS">GHS</option>
              <option value="MAD">MAD</option>
              <option value="DZD">DZD</option>
            </select>
            <input className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm" placeholder="Fuseau horaire" value={preferences.timezone} onChange={(e) => setPreferences((p) => ({ ...p, timezone: e.target.value }))} />
            <select className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm" value={preferences.date_format} onChange={(e) => setPreferences((p) => ({ ...p, date_format: e.target.value }))}>
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
            </select>
            <div className="md:col-span-2">
              <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
                <Save size={15} />
                {saving ? 'Enregistrement...' : 'Sauvegarder'}
              </button>
            </div>
          </form>
        </section>

        <section className="mt-6 rounded-2xl border border-rose-800/70 bg-rose-950/20 p-6">
          <h2 className="text-lg font-semibold text-rose-200">Zone de danger</h2>
          <p className="mt-1 text-sm text-rose-300/90">
            Reinitialiser efface toutes vos donnees de gestion et recree un portefeuille par defaut.
          </p>
          <button
            type="button"
            onClick={handleResetAllData}
            disabled={resetting}
            className="mt-4 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-500 disabled:opacity-60"
          >
            {resetting ? 'Reinitialisation...' : 'Reinitialiser toutes mes donnees'}
          </button>
        </section>
      </div>
    </div>
  );
}
