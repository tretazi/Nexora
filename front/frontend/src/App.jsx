import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  ChevronDown,
  CircleUserRound,
  Edit3,
  Filter,
  History,
  LogOut,
  PieChart as PieChartIcon,
  PlusCircle,
  Trash2,
  Wallet,
} from 'lucide-react';
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import api from './api/axios';
import { clearTokens, getRefreshToken } from './utils/auth';

const DEFAULT_CATEGORY_ICON = 'ðŸ·ï¸';
const DEFAULT_CATEGORY_COLOR = '#2AA3FF';
const ICON_CHOICES = [
  '🏷️', '🛒', '🍔', '🚗', '🏠', '🎓', '💼', '🎮', '🏥', '💡',
  '🍕', '☕', '🧾', '📱', '💻', '🛍️', '✈️', '⛽', '🚕', '🚌',
  '🚲', '🐶', '👶', '🎁', '🎉', '📚', '🎵', '🎬', '🧹', '🛠️',
  '🧴', '💊', '🩺', '🏋️', '⚽', '🏦', '💳', '💰', '📈', '🧠',
  '🌐', '🔒', '🧺', '🍎', '🥖', '🍱', '🏨', '🛏️', '🚿', '🪑'
];
const PIE_COLORS = ['#2AA3FF', '#24C289', '#F3B33D', '#F37BA4', '#8F7BFF', '#FF7E6B', '#2ED3D3', '#9BCF3A'];
const MONTH_START = (d = new Date()) => new Date(d.getFullYear(), d.getMonth(), 1);
const TO_ISO = (d) => d.toISOString().slice(0, 10);

function formatMoney(value, currency = 'FCFA') {
  return `${Number(value || 0).toLocaleString()} ${currency}`;
}

export default function App() {
  const navigate = useNavigate();
  const menuRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showTxModal, setShowTxModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingWallet, setEditingWallet] = useState(null);
  const [editingBudget, setEditingBudget] = useState(null);
  const [toasts, setToasts] = useState([]);

  const [profile, setProfile] = useState(null);
  const [categories, setCategories] = useState([]);
  const [wallets, setWallets] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [budgetsMeta, setBudgetsMeta] = useState([]);

  const [filters, setFilters] = useState({
    q: '',
    category: '',
    wallet: '',
    type: '',
    date_from: '',
    date_to: '',
  });
  const [budgetMonth, setBudgetMonth] = useState(TO_ISO(MONTH_START()));
  const [transactionForm, setTransactionForm] = useState({
    amount: '',
    type: 'EXP',
    description: '',
    category: '',
    wallet: '',
  });
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    type: 'EXP',
    icon: DEFAULT_CATEGORY_ICON,
    color: DEFAULT_CATEGORY_COLOR,
  });
  const [walletForm, setWalletForm] = useState({ name: '', color: '#24C289' });
  const [budgetForm, setBudgetForm] = useState({
    category: '',
    wallet: '',
    month: TO_ISO(MONTH_START()),
    limit_amount: '',
  });

  const currency = profile?.preferences?.currency || 'FCFA';

  const notify = (message, kind = 'ok') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, kind }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 2600);
  };

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v) params.append(k, v);
    });
    return params.toString();
  }, [filters]);

  const fetchProfile = async () => setProfile((await api.get('profile/')).data);
  const fetchCategories = async () => setCategories((await api.get('categories/')).data);
  const fetchWallets = async () => setWallets((await api.get('wallets/')).data);
  const fetchTransactions = async () => {
    const url = queryString ? `transactions/?${queryString}` : 'transactions/';
    setTransactions((await api.get(url)).data);
  };
  const fetchBudgets = async () => {
    const walletParam = filters.wallet ? `&wallet=${filters.wallet}` : '';
    const [statusRes, metaRes] = await Promise.all([
      api.get(`budgets/status/?month=${budgetMonth}${walletParam}`),
      api.get(`budgets/?month=${budgetMonth}${walletParam}`),
    ]);
    setBudgets(statusRes.data);
    setBudgetsMeta(metaRes.data);
  };

  const refreshAll = async () => {
    try {
      setLoading(true);
      await Promise.all([fetchProfile(), fetchCategories(), fetchWallets(), fetchTransactions(), fetchBudgets()]);
    } catch {
      notify('Erreur de chargement des donnees', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshAll();
  }, []);

  useEffect(() => {
    const timer = setTimeout(async () => {
      await fetchTransactions();
      await fetchBudgets();
    }, 280);
    return () => clearTimeout(timer);
  }, [queryString, budgetMonth]);

  useEffect(() => {
    const outside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', outside);
    return () => document.removeEventListener('mousedown', outside);
  }, []);

  const insights = useMemo(() => {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;

    const currentMonthTx = transactions.filter((t) => {
      const d = new Date(t.date);
      return d.getMonth() === month && d.getFullYear() === year;
    });
    const previousMonthTx = transactions.filter((t) => {
      const d = new Date(t.date);
      return d.getMonth() === prevMonth && d.getFullYear() === prevYear;
    });

    const income = currentMonthTx.filter((t) => Number(t.amount) > 0).reduce((a, b) => a + Number(b.amount), 0);
    const expenses = Math.abs(currentMonthTx.filter((t) => Number(t.amount) < 0).reduce((a, b) => a + Number(b.amount), 0));
    const prevExpenses = Math.abs(previousMonthTx.filter((t) => Number(t.amount) < 0).reduce((a, b) => a + Number(b.amount), 0));
    const avgDailyExpense = expenses / Math.max(new Date().getDate(), 1);

    const byCategory = {};
    currentMonthTx
      .filter((t) => Number(t.amount) < 0)
      .forEach((t) => {
        const key = t.category_name || 'Sans categorie';
        byCategory[key] = (byCategory[key] || 0) + Math.abs(Number(t.amount));
      });

    return {
      income,
      expenses,
      balance: income - expenses,
      avgDailyExpense,
      deltaPct: prevExpenses ? (((expenses - prevExpenses) / prevExpenses) * 100).toFixed(1) : '0.0',
      topCategories: Object.entries(byCategory).sort((a, b) => b[1] - a[1]).slice(0, 3),
    };
  }, [transactions]);

  const chartData = useMemo(() => {
    return categories
      .filter((c) => c.type === 'EXP')
      .map((c, idx) => {
        const total = transactions
          .filter((t) => t.category === c.id && Number(t.amount) < 0)
          .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);
        return {
          name: `${c.icon || DEFAULT_CATEGORY_ICON} ${c.name}`,
          value: total,
          color: PIE_COLORS[idx % PIE_COLORS.length],
        };
      })
      .filter((x) => x.value > 0);
  }, [categories, transactions]);

  const resetTxForm = () => {
    setEditingTransaction(null);
    setTransactionForm({
      amount: '',
      type: 'EXP',
      description: '',
      category: '',
      wallet: filters.wallet || '',
    });
  };

  const openEditTransaction = (t) => {
    setEditingTransaction(t);
    setTransactionForm({
      amount: String(Math.abs(Number(t.amount))),
      type: Number(t.amount) < 0 ? 'EXP' : 'INC',
      description: t.description || '',
      category: t.category ? String(t.category) : '',
      wallet: t.wallet ? String(t.wallet) : '',
    });
    setShowTxModal(true);
  };

  const submitTransaction = async (e) => {
    e.preventDefault();
    const signedAmount =
      transactionForm.type === 'EXP'
        ? -Math.abs(Number(transactionForm.amount))
        : Math.abs(Number(transactionForm.amount));

    const payload = {
      amount: signedAmount,
      description: transactionForm.description,
      category: transactionForm.category || null,
      wallet: transactionForm.wallet || null,
    };

    try {
      if (editingTransaction) {
        await api.put(`transactions/${editingTransaction.id}/`, payload);
        notify('Transaction modifiee');
      } else {
        await api.post('transactions/', payload);
        notify('Transaction ajoutee');
      }
      await fetchTransactions();
      await fetchBudgets();
      setShowTxModal(false);
      resetTxForm();
    } catch {
      notify('Erreur sur la transaction', 'error');
    }
  };

  const deleteTransaction = async (id) => {
    if (!window.confirm('Supprimer cette transaction ?')) return;
    try {
      await api.delete(`transactions/${id}/`);
      notify('Transaction supprimee');
      await fetchTransactions();
      await fetchBudgets();
    } catch {
      notify('Suppression impossible', 'error');
    }
  };

  const submitCategory = async (e) => {
    e.preventDefault();
    try {
      if (editingCategory) {
        await api.put(`categories/${editingCategory.id}/`, categoryForm);
        notify('Categorie modifiee');
      } else {
        await api.post('categories/', categoryForm);
        notify('Categorie ajoutee');
      }
      setEditingCategory(null);
      setCategoryForm({ name: '', type: 'EXP', icon: DEFAULT_CATEGORY_ICON, color: DEFAULT_CATEGORY_COLOR });
      setShowCategoryModal(false);
      await fetchCategories();
    } catch {
      notify('Erreur categorie', 'error');
    }
  };

  const submitWallet = async (e) => {
    e.preventDefault();
    try {
      if (editingWallet) {
        await api.put(`wallets/${editingWallet.id}/`, walletForm);
        notify('Portefeuille modifie');
      } else {
        await api.post('wallets/', walletForm);
        notify('Portefeuille ajoute');
      }
      setEditingWallet(null);
      setWalletForm({ name: '', color: '#24C289' });
      setShowWalletModal(false);
      await fetchWallets();
    } catch {
      notify('Erreur portefeuille', 'error');
    }
  };

  const submitBudget = async (e) => {
    e.preventDefault();
    const payload = {
      ...budgetForm,
      wallet: budgetForm.wallet || null,
      limit_amount: Number(budgetForm.limit_amount),
    };
    try {
      if (editingBudget) {
        await api.put(`budgets/${editingBudget.id}/`, payload);
        notify('Budget modifie');
      } else {
        await api.post('budgets/', payload);
        notify('Budget ajoute');
      }
      setEditingBudget(null);
      setBudgetForm({ category: '', wallet: '', month: TO_ISO(MONTH_START()), limit_amount: '' });
      setShowBudgetModal(false);
      await fetchBudgets();
    } catch {
      notify('Erreur budget', 'error');
    }
  };

  const editCategory = (item) => {
    setEditingCategory(item);
    setCategoryForm({
      name: item.name,
      type: item.type,
      icon: item.icon || DEFAULT_CATEGORY_ICON,
      color: item.color || DEFAULT_CATEGORY_COLOR,
    });
    setShowCategoryModal(true);
  };

  const editWallet = (item) => {
    setEditingWallet(item);
    setWalletForm({ name: item.name, color: item.color || '#24C289' });
    setShowWalletModal(true);
  };

  const editBudget = (id) => {
    const b = budgetsMeta.find((x) => x.id === id);
    if (!b) return;
    setEditingBudget(b);
    setBudgetForm({
      category: b.category ? String(b.category) : '',
      wallet: b.wallet ? String(b.wallet) : '',
      month: b.month || TO_ISO(MONTH_START()),
      limit_amount: String(b.limit_amount || ''),
    });
    setShowBudgetModal(true);
  };

  const deleteCategory = async (item) => {
    if (!window.confirm(`Supprimer la categorie "${item.name}" ?`)) return;
    try {
      await api.delete(`categories/${item.id}/`);
      notify('Categorie supprimee');
      await fetchCategories();
      await fetchTransactions();
      await fetchBudgets();
    } catch {
      notify('Suppression categorie impossible', 'error');
    }
  };

  const deleteWallet = async (item) => {
    if (!window.confirm(`Supprimer le portefeuille "${item.name}" ?`)) return;
    try {
      await api.delete(`wallets/${item.id}/`);
      notify('Portefeuille supprime');
      await fetchWallets();
      await fetchTransactions();
      await fetchBudgets();
    } catch {
      notify('Suppression portefeuille impossible', 'error');
    }
  };

  const deleteBudget = async (id) => {
    if (!window.confirm('Supprimer ce budget ?')) return;
    try {
      await api.delete(`budgets/${id}/`);
      notify('Budget supprime');
      await fetchBudgets();
    } catch {
      notify('Suppression budget impossible', 'error');
    }
  };

  const exportPdf = async () => {
    try {
      const params = queryString ? `${queryString}&format=pdf` : 'format=pdf';
      const res = await api.get(`transactions/export/?${params}`, { responseType: 'blob' });
      const blob = new Blob([res.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'transactions_summary.pdf';
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      let message = 'Export PDF indisponible';
      const data = error?.response?.data;
      if (data instanceof Blob) {
        try {
          const text = await data.text();
          const parsed = JSON.parse(text);
          if (parsed?.detail) message = parsed.detail;
        } catch {
          // Ignore parse errors and keep default message.
        }
      } else if (data?.detail) {
        message = data.detail;
      }
      notify(message, 'error');
    }
  };

  const handleLogout = async () => {
    try {
      const refresh = getRefreshToken();
      if (refresh) await api.post('logout/', { refresh });
    } catch {
      // Keep local logout even if API logout fails.
    } finally {
      clearTokens();
      navigate('/login');
    }
  };

  const userName = profile?.first_name?.trim() || profile?.username || 'Utilisateur';

  return (
    <div className="min-h-screen px-4 py-6 md:px-8 md:py-10">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_15%_20%,rgba(42,163,255,0.18),transparent_28%),radial-gradient(circle_at_80%_0%,rgba(36,194,137,0.14),transparent_24%),linear-gradient(180deg,#0B1017_0%,#090D14_100%)]" />

      <div className="fixed left-4 right-4 top-4 z-[120] space-y-2 sm:left-auto sm:right-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`rounded-lg border px-4 py-2 text-sm shadow-xl ${
              t.kind === 'error'
                ? 'border-rose-700 bg-rose-950 text-rose-200'
                : 'border-emerald-700 bg-emerald-950 text-emerald-200'
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>

      <header className="mx-auto mb-8 flex w-full max-w-7xl flex-col items-start justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-100">Nexora Budget</h1>
          <p className="text-sm text-slate-400">Vue operationnelle de vos flux financiers</p>
        </div>

        <div className="relative flex w-full flex-wrap items-center gap-2 lg:w-auto" ref={menuRef}>
          <button
            onClick={() => {
              setEditingWallet(null);
              setWalletForm({ name: '', color: '#24C289' });
              setShowWalletModal(true);
            }}
            className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-xs font-semibold text-slate-100 transition hover:bg-slate-800 sm:text-sm"
          >
            + Portefeuille
          </button>

          <button
            onClick={() => {
              setEditingCategory(null);
              setCategoryForm({ name: '', type: 'EXP', icon: DEFAULT_CATEGORY_ICON, color: DEFAULT_CATEGORY_COLOR });
              setShowCategoryModal(true);
            }}
            className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-xs font-semibold text-slate-100 transition hover:bg-slate-800 sm:text-sm"
          >
            + Categorie
          </button>

          <button
            onClick={() => {
              setEditingBudget(null);
              setBudgetForm({ category: '', wallet: '', month: TO_ISO(MONTH_START()), limit_amount: '' });
              setShowBudgetModal(true);
            }}
            className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-xs font-semibold text-slate-100 transition hover:bg-slate-800 sm:text-sm"
          >
            + Budget
          </button>

          <button
            onClick={() => {
              resetTxForm();
              setShowTxModal(true);
            }}
            className="rounded-xl bg-sky-600 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-sky-500 sm:text-sm"
          >
            <PlusCircle size={16} className="mr-1 inline" />
            Nouvelle transaction
          </button>

          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="ml-auto flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-xs font-semibold text-slate-100 transition hover:bg-slate-800 sm:text-sm"
          >
            <CircleUserRound size={18} />
            <span>{userName}</span>
            <ChevronDown size={16} />
          </button>

          {menuOpen && (
            <div className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-2xl sm:left-auto sm:right-0 sm:w-64">
              <div className="border-b border-slate-800 px-4 py-3">
                <p className="font-semibold text-slate-100">{userName}</p>
                <p className="text-sm text-slate-400">{profile?.email || 'Aucun email'}</p>
              </div>
              <button
                onClick={() => navigate('/profile')}
                className="w-full px-4 py-3 text-left text-sm text-slate-200 transition hover:bg-slate-800"
              >
                Voir mon profil
              </button>
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-rose-300 transition hover:bg-rose-900/30"
              >
                <LogOut size={16} />
                Deconnexion
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl space-y-6">
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Solde" icon={<Wallet size={18} />} value={formatMoney(insights.balance, currency)} />
          <MetricCard label="Revenus" icon={<ArrowUpCircle size={18} />} value={formatMoney(insights.income, currency)} valueClass="text-emerald-400" />
          <MetricCard label="Depenses" icon={<ArrowDownCircle size={18} />} value={formatMoney(insights.expenses, currency)} valueClass="text-rose-400" />
          <MetricCard
            label="Depense moyenne / jour"
            value={`${Number(insights.avgDailyExpense || 0).toFixed(2)} ${currency}`}
            note={`Variation vs mois precedent: ${insights.deltaPct}%`}
          />
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 xl:col-span-2">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <PieChartIcon size={18} className="text-sky-400" />
                <h2 className="font-semibold text-slate-100">Repartition des depenses</h2>
              </div>
              <button
                onClick={() => setShowFilters((v) => !v)}
                className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200"
              >
                <Filter size={13} className="mr-1 inline" />
                Filtres
              </button>
            </div>

            {showFilters && (
              <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <input
                  className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm outline-none"
                  placeholder="Recherche description..."
                  value={filters.q}
                  onChange={(e) => setFilters((p) => ({ ...p, q: e.target.value }))}
                />
                <select
                  className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
                  value={filters.wallet}
                  onChange={(e) => setFilters((p) => ({ ...p, wallet: e.target.value }))}
                >
                  <option value="">Tous portefeuilles</option>
                  {wallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
                <select
                  className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
                  value={filters.category}
                  onChange={(e) => setFilters((p) => ({ ...p, category: e.target.value }))}
                >
                  <option value="">Toutes categories</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <select
                  className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
                  value={filters.type}
                  onChange={(e) => setFilters((p) => ({ ...p, type: e.target.value }))}
                >
                  <option value="">Tous types</option>
                  <option value="INC">Revenus</option>
                  <option value="EXP">Depenses</option>
                </select>
              </div>
            )}

            <div className="h-64 sm:h-72">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={chartData} dataKey="value" cx="50%" cy="50%" innerRadius={65} outerRadius={95}>
                      {chartData.map((entry, idx) => (
                        <Cell key={idx} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="pt-20 text-center text-sm text-slate-500">Aucune depense exploitable pour le graphique.</p>
              )}
            </div>
          </div>

          <aside className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold text-slate-100">Suivi budgets</h2>
              <div className="flex items-center gap-1">
                <input
                  type="date"
                  value={budgetMonth}
                  onChange={(e) => setBudgetMonth(e.target.value)}
                  className="rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-xs"
                />
                <button onClick={() => setShowBudgetModal(true)} className="rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-xs">+</button>
              </div>
            </div>
            <div className="max-h-72 space-y-3 overflow-auto pr-1">
              {budgets.length === 0 && (
                <p className="text-sm text-slate-500">Aucun budget. Configurez-les dans Profil.</p>
              )}
              {budgets.map((b) => (
                <div key={b.id} className="rounded-lg border border-slate-700 p-3">
                  <div className="mb-1 flex justify-between text-xs text-slate-300">
                    <span>{b.category_name}</span>
                    <span>
                      {formatMoney(b.spent_amount, currency)} / {formatMoney(b.limit_amount, currency)}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded bg-slate-800">
                    <div
                      className={`h-full ${
                        b.status === 'danger'
                          ? 'bg-rose-500'
                          : b.status === 'warning'
                            ? 'bg-amber-400'
                            : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, b.ratio)}%` }}
                    />
                  </div>
                  <div className="mt-2 flex justify-end gap-2">
                    <button onClick={() => editBudget(b.id)} className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-200">Modifier</button>
                    <button onClick={() => deleteBudget(b.id)} className="rounded border border-rose-700 px-2 py-1 text-xs text-rose-300">Supprimer</button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 border-t border-slate-800 pt-4">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Top categories (mois courant)</h3>
              <ul className="space-y-1 text-sm">
                {insights.topCategories.length === 0 && <li className="text-slate-500">Aucune donnee</li>}
                {insights.topCategories.map(([name, amount]) => (
                  <li key={name} className="flex justify-between text-slate-300">
                    <span>{name}</span>
                    <span>{formatMoney(amount, currency)}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-4 border-t border-slate-800 pt-4">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Categories</h3>
                <button onClick={() => setShowCategoryModal(true)} className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-300">+</button>
              </div>
              <div className="max-h-28 space-y-2 overflow-auto pr-1">
                {categories.map((c) => (
                  <div key={c.id} className="flex items-center justify-between rounded border border-slate-700 bg-slate-800/60 px-2 py-1 text-xs">
                    <span>{c.icon || DEFAULT_CATEGORY_ICON} {c.name}</span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => editCategory(c)}
                        title="Modifier categorie"
                        aria-label="Modifier categorie"
                        className="rounded border border-slate-700 p-1 text-slate-200 hover:bg-slate-700"
                      >
                        <Edit3 size={12} />
                      </button>
                      <button
                        onClick={() => deleteCategory(c)}
                        title="Supprimer categorie"
                        aria-label="Supprimer categorie"
                        className="rounded border border-rose-700 p-1 text-rose-300 hover:bg-rose-900/30"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 border-t border-slate-800 pt-4">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Portefeuilles</h3>
                <button onClick={() => setShowWalletModal(true)} className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-300">+</button>
              </div>
              <div className="max-h-24 space-y-2 overflow-auto pr-1">
                {wallets.map((w) => (
                  <div key={w.id} className="flex items-center justify-between rounded border border-slate-700 bg-slate-800/60 px-2 py-1 text-xs">
                    <span style={{ color: w.color || '#E2E8F0' }}>{w.name}</span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => editWallet(w)}
                        title="Modifier portefeuille"
                        aria-label="Modifier portefeuille"
                        className="rounded border border-slate-700 p-1 text-slate-200 hover:bg-slate-700"
                      >
                        <Edit3 size={12} />
                      </button>
                      <button
                        onClick={() => deleteWallet(w)}
                        title="Supprimer portefeuille"
                        aria-label="Supprimer portefeuille"
                        className="rounded border border-rose-700 p-1 text-rose-300 hover:bg-rose-900/30"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900">
          <div className="flex flex-col items-start justify-between gap-2 border-b border-slate-800 px-4 py-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2">
              <History size={18} className="text-sky-400" />
              <h2 className="font-semibold text-slate-100">Historique transactions</h2>
            </div>
            <button
              onClick={exportPdf}
              className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm font-semibold text-slate-200"
            >
              Exporter PDF
            </button>
          </div>

          <div className="h-[60vh] overflow-auto md:h-[480px]">
            <table className="hidden w-full text-left md:table">
              <thead className="sticky top-0 z-10 bg-slate-800 text-xs uppercase text-slate-300">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Categorie</th>
                  <th className="px-4 py-3">Portefeuille</th>
                  <th className="px-4 py-3 text-right">Montant</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="px-4 py-10 text-center text-slate-500">
                      Chargement...
                    </td>
                  </tr>
                ) : (
                  transactions.map((t) => (
                    <tr key={t.id} className="transition hover:bg-slate-800/40">
                      <td className="px-4 py-3 text-sm text-slate-400">{new Date(t.date).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-sm text-slate-200">{t.description || 'Sans titre'}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs text-slate-200">
                          <span
                            className="inline-flex h-5 w-5 items-center justify-center rounded-full"
                            style={{ backgroundColor: t.category_color || DEFAULT_CATEGORY_COLOR }}
                          >
                            {t.category_icon || DEFAULT_CATEGORY_ICON}
                          </span>
                          {t.category_name || 'Sans categorie'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-300">{t.wallet_name || 'Principal'}</td>
                      <td className={`px-4 py-3 text-right text-sm font-semibold ${Number(t.amount) < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {formatMoney(t.amount, currency)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => openEditTransaction(t)} className="rounded-lg p-2 text-slate-300 transition hover:bg-slate-700">
                          <Edit3 size={14} />
                        </button>
                        <button onClick={() => deleteTransaction(t.id)} className="rounded-lg p-2 text-rose-300 transition hover:bg-rose-900/30">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            <div className="space-y-2 p-3 md:hidden">
              {loading ? (
                <p className="rounded-lg border border-slate-800 bg-slate-900 p-4 text-center text-sm text-slate-400">Chargement...</p>
              ) : (
                transactions.map((t) => (
                  <article key={t.id} className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-100">{t.description || 'Sans titre'}</p>
                      <p className={`text-sm font-semibold ${Number(t.amount) < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {formatMoney(t.amount, currency)}
                      </p>
                    </div>
                    <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                      <span>{new Date(t.date).toLocaleDateString()}</span>
                      <span>-</span>
                      <span>{t.wallet_name || 'Principal'}</span>
                    </div>
                    <div className="mb-3">
                      <span className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs text-slate-200">
                        <span
                          className="inline-flex h-5 w-5 items-center justify-center rounded-full"
                          style={{ backgroundColor: t.category_color || DEFAULT_CATEGORY_COLOR }}
                        >
                          {t.category_icon || DEFAULT_CATEGORY_ICON}
                        </span>
                        {t.category_name || 'Sans categorie'}
                      </span>
                    </div>
                    <div className="flex justify-end gap-1">
                      <button onClick={() => openEditTransaction(t)} className="rounded-lg p-2 text-slate-300 transition hover:bg-slate-700">
                        <Edit3 size={14} />
                      </button>
                      <button onClick={() => deleteTransaction(t.id)} className="rounded-lg p-2 text-rose-300 transition hover:bg-rose-900/30">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>
        </section>
      </main>

      {(showTxModal || showCategoryModal || showWalletModal || showBudgetModal) && (
        <div className="fixed inset-0 z-50 overflow-auto bg-black/70 p-4 backdrop-blur-sm">
          <div className="mx-auto mt-2 max-h-[88vh] w-full max-w-md overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-5 sm:mt-8">
            {showTxModal && (
              <>
                <h3 className="mb-4 font-semibold text-slate-100">{editingTransaction ? 'Modifier transaction' : 'Nouvelle transaction'}</h3>
                <form onSubmit={submitTransaction} className="space-y-3">
                  <select className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm" value={transactionForm.type} onChange={(e) => setTransactionForm((p) => ({ ...p, type: e.target.value, category: '' }))}>
                    <option value="EXP">Depense</option>
                    <option value="INC">Revenu</option>
                  </select>
                  <input className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm" type="number" min="0" step="0.01" required placeholder="Montant" value={transactionForm.amount} onChange={(e) => setTransactionForm((p) => ({ ...p, amount: e.target.value }))} />
                  <input className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm" placeholder="Description" value={transactionForm.description} onChange={(e) => setTransactionForm((p) => ({ ...p, description: e.target.value }))} />
                  <select className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm" value={transactionForm.category} onChange={(e) => setTransactionForm((p) => ({ ...p, category: e.target.value }))}>
                    <option value="">Categorie</option>
                    {categories.filter((c) => c.type === transactionForm.type).map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                  </select>
                  <select className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm" value={transactionForm.wallet} onChange={(e) => setTransactionForm((p) => ({ ...p, wallet: e.target.value }))}>
                    <option value="">Portefeuille</option>
                    {wallets.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                  <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
                    <button type="button" className="rounded-lg bg-slate-800 px-3 py-2 text-sm" onClick={() => { setShowTxModal(false); resetTxForm(); }}>Annuler</button>
                    <button type="submit" className="rounded-lg bg-sky-600 px-3 py-2 text-sm font-semibold text-white">{editingTransaction ? 'Mettre a jour' : 'Ajouter'}</button>
                  </div>
                </form>
              </>
            )}

            {showCategoryModal && (
              <>
                <h3 className="mb-4 font-semibold text-slate-100">{editingCategory ? 'Modifier categorie' : 'Nouvelle categorie'}</h3>
                <form onSubmit={submitCategory} className="space-y-3">
                  <input className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm" placeholder="Nom categorie" value={categoryForm.name} onChange={(e) => setCategoryForm((p) => ({ ...p, name: e.target.value }))} required />
                  <select className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm" value={categoryForm.type} onChange={(e) => setCategoryForm((p) => ({ ...p, type: e.target.value }))}>
                    <option value="EXP">Depense</option>
                    <option value="INC">Revenu</option>
                  </select>
                  <div className="grid grid-cols-5 gap-2">
                    {ICON_CHOICES.map((icon) => (
                      <button key={icon} type="button" onClick={() => setCategoryForm((p) => ({ ...p, icon }))} className={`rounded border px-2 py-1 text-sm ${categoryForm.icon === icon ? 'border-sky-500 bg-sky-500/20' : 'border-slate-700 bg-slate-800'}`}>{icon}</button>
                    ))}
                  </div>
                  <input type="color" className="h-10 w-full rounded border border-slate-700 bg-slate-800" value={categoryForm.color} onChange={(e) => setCategoryForm((p) => ({ ...p, color: e.target.value }))} />
                  <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
                    <button type="button" className="rounded-lg bg-slate-800 px-3 py-2 text-sm" onClick={() => { setShowCategoryModal(false); setEditingCategory(null); setCategoryForm({ name: '', type: 'EXP', icon: DEFAULT_CATEGORY_ICON, color: DEFAULT_CATEGORY_COLOR }); }}>Annuler</button>
                    <button type="submit" className="rounded-lg bg-sky-600 px-3 py-2 text-sm font-semibold text-white">{editingCategory ? 'Mettre a jour' : 'Ajouter'}</button>
                  </div>
                </form>
              </>
            )}

            {showWalletModal && (
              <>
                <h3 className="mb-4 font-semibold text-slate-100">{editingWallet ? 'Modifier portefeuille' : 'Nouveau portefeuille'}</h3>
                <form onSubmit={submitWallet} className="space-y-3">
                  <input className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm" placeholder="Nom portefeuille" value={walletForm.name} onChange={(e) => setWalletForm((p) => ({ ...p, name: e.target.value }))} required />
                  <input type="color" className="h-10 w-full rounded border border-slate-700 bg-slate-800" value={walletForm.color} onChange={(e) => setWalletForm((p) => ({ ...p, color: e.target.value }))} />
                  <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
                    <button type="button" className="rounded-lg bg-slate-800 px-3 py-2 text-sm" onClick={() => { setShowWalletModal(false); setEditingWallet(null); setWalletForm({ name: '', color: '#24C289' }); }}>Annuler</button>
                    <button type="submit" className="rounded-lg bg-sky-600 px-3 py-2 text-sm font-semibold text-white">{editingWallet ? 'Mettre a jour' : 'Ajouter'}</button>
                  </div>
                </form>
              </>
            )}

            {showBudgetModal && (
              <>
                <h3 className="mb-4 font-semibold text-slate-100">{editingBudget ? 'Modifier budget' : 'Nouveau budget'}</h3>
                <form onSubmit={submitBudget} className="space-y-3">
                  <input type="date" className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm" value={budgetForm.month} onChange={(e) => setBudgetForm((p) => ({ ...p, month: e.target.value }))} required />
                  <select className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm" value={budgetForm.category} onChange={(e) => setBudgetForm((p) => ({ ...p, category: e.target.value }))} required>
                    <option value="">Categorie</option>
                    {categories.filter((c) => c.type === 'EXP').map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <select className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm" value={budgetForm.wallet} onChange={(e) => setBudgetForm((p) => ({ ...p, wallet: e.target.value }))}>
                    <option value="">Tous portefeuilles</option>
                    {wallets.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                  <input type="number" className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm" placeholder="Plafond budget" value={budgetForm.limit_amount} onChange={(e) => setBudgetForm((p) => ({ ...p, limit_amount: e.target.value }))} required />
                  <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
                    <button type="button" className="rounded-lg bg-slate-800 px-3 py-2 text-sm" onClick={() => { setShowBudgetModal(false); setEditingBudget(null); setBudgetForm({ category: '', wallet: '', month: TO_ISO(MONTH_START()), limit_amount: '' }); }}>Annuler</button>
                    <button type="submit" className="rounded-lg bg-sky-600 px-3 py-2 text-sm font-semibold text-white">{editingBudget ? 'Mettre a jour' : 'Ajouter'}</button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, icon, value, valueClass = 'text-slate-100', note }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <div className="mb-2 flex items-center justify-between text-sm text-slate-400">
        <span>{label}</span>
        {icon || null}
      </div>
      <p className={`break-words text-xl font-bold sm:text-2xl ${valueClass}`}>{value}</p>
      {note && <p className="mt-1 text-xs text-slate-500">{note}</p>}
    </div>
  );
}

