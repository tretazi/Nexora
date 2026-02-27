import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Lock, Mail, UserPlus, Eye, EyeOff } from 'lucide-react';
import api from '../api/axios';

export default function Signup() {
  const [formData, setFormData] = useState({ username: '', email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSubmitting(true);

    try {
      await api.post('register/', formData);
      navigate('/login?verified=pending', { replace: true });
    } catch (err) {
      setErrorMessage("Impossible de creer le compte. Verifiez les informations saisies.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-slate-800 p-8 rounded-2xl w-full max-w-md shadow-2xl">
        <h2 className="text-3xl font-bold text-center text-white mb-2">Creer un compte</h2>
        <p className="text-center text-slate-400 mb-8">Inscription rapide pour acceder au dashboard.</p>

        <form onSubmit={handleSignup} className="space-y-5">
          <div className="relative">
            <User className="absolute left-3 top-3 text-slate-500" size={20} />
            <input
              type="text"
              placeholder="Nom d'utilisateur"
              required
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 pl-10 text-white outline-none focus:ring-2 focus:ring-emerald-500"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            />
          </div>
          <div className="relative">
            <Mail className="absolute left-3 top-3 text-slate-500" size={20} />
            <input
              type="email"
              placeholder="Email"
              required
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 pl-10 text-white outline-none focus:ring-2 focus:ring-emerald-500"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-3 text-slate-500" size={20} />
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Mot de passe"
              required
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 pl-10 pr-10 text-white outline-none focus:ring-2 focus:ring-emerald-500"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-3 text-slate-400 hover:text-slate-200"
              aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              title={showPassword ? 'Masquer' : 'Afficher'}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {errorMessage && <p className="text-sm text-rose-400">{errorMessage}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-60"
          >
            <UserPlus size={20} />
            {submitting ? 'Creation...' : "S'inscrire"}
          </button>
        </form>

        <p className="text-center text-slate-400 mt-6 text-sm">
          Deja un compte ? <Link to="/login" className="text-emerald-400 hover:underline">Se connecter</Link>
        </p>
      </div>
    </div>
  );
}
