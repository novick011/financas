import React, { useMemo } from 'react';
import { Transaction, Category } from '../types';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Calendar, 
  AlertCircle, 
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend,
  CartesianGrid
} from 'recharts';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, subMonths, isAfter } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DashboardProps {
  transactions: Transaction[];
  categories: Category[];
}

const COLORS = ['#1a1a1a', '#5A5A40', '#8B8B6B', '#B5B59A', '#D9D9C3', '#4a4a4a', '#7a7a7a'];

export default function Dashboard({ transactions, categories }: DashboardProps) {
  const isDarkMode = document.documentElement.classList.contains('dark');
  const currencyFormatter = new Intl.NumberFormat('pt-BR', { 
    style: 'currency', 
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  const currentMonth = new Date();
  const currentMonthTransactions = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return transactions.filter(t => {
      const date = t.date.toDate();
      return date >= start && date <= end;
    });
  }, [transactions]);

  const getNetAmount = (t: Transaction) => {
    if (t.adjustments && t.adjustments.length > 0) {
      const discounts = t.adjustments.filter(a => a.type === 'discount').reduce((acc, a) => acc + a.amount, 0);
      const additions = t.adjustments.filter(a => a.type === 'addition').reduce((acc, a) => acc + a.amount, 0);
      return t.amount - discounts + additions;
    }
    return t.amount - (t.deduction || 0);
  };

  const getDeductionAmount = (t: Transaction) => {
    if (t.adjustments && t.adjustments.length > 0) {
      return t.adjustments.filter(a => a.type === 'discount').reduce((acc, a) => acc + a.amount, 0);
    }
    return t.deduction || 0;
  };

  const stats = useMemo(() => {
    const paidIncome = currentMonthTransactions
      .filter(t => t.type === 'income' && t.status === 'paid')
      .reduce((acc, t) => acc + getNetAmount(t), 0);
    
    const paidExpense = currentMonthTransactions
      .filter(t => t.type === 'expense' && t.status === 'paid')
      .reduce((acc, t) => acc + getNetAmount(t), 0);

    const pendingExpense = transactions
      .filter(t => t.type === 'expense' && t.status === 'pending')
      .reduce((acc, t) => acc + getNetAmount(t), 0);

    const futureDebitsThisMonth = currentMonthTransactions
      .filter(t => t.type === 'expense' && t.status === 'pending')
      .reduce((acc, t) => acc + getNetAmount(t), 0);

    const totalDeductions = currentMonthTransactions
      .reduce((acc, t) => acc + getDeductionAmount(t), 0);

    return { 
      income: paidIncome, 
      expense: paidExpense, 
      balance: paidIncome - paidExpense,
      pendingTotal: pendingExpense,
      pendingMonth: futureDebitsThisMonth,
      deductions: totalDeductions
    };
  }, [currentMonthTransactions, transactions]);

  const pieData = useMemo(() => {
    const categoryTotals: Record<string, number> = {};
    currentMonthTransactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        categoryTotals[t.category] = (categoryTotals[t.category] || 0) + getNetAmount(t);
      });
    return Object.entries(categoryTotals).map(([name, value]) => ({ name, value }));
  }, [currentMonthTransactions]);

  const barData = useMemo(() => {
    const last6Months = Array.from({ length: 6 }).map((_, i) => {
      const date = subMonths(currentMonth, 5 - i);
      const start = startOfMonth(date);
      const end = endOfMonth(date);
      const monthTransactions = transactions.filter(t => {
        const d = t.date.toDate();
        return d >= start && d <= end;
      });
      const income = monthTransactions.filter(t => t.type === 'income' && t.status === 'paid').reduce((acc, t) => acc + getNetAmount(t), 0);
      const expense = monthTransactions.filter(t => t.type === 'expense' && t.status === 'paid').reduce((acc, t) => acc + getNetAmount(t), 0);
      const pending = monthTransactions.filter(t => t.type === 'expense' && t.status === 'pending').reduce((acc, t) => acc + getNetAmount(t), 0);
      return {
        name: format(date, 'MMM', { locale: ptBR }),
        receita: income,
        despesa: expense,
        pendente: pending
      };
    });
    return last6Months;
  }, [transactions]);

  return (
    <div className="space-y-8">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className={`text-2xl font-serif font-bold transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Visão Geral do Patrimônio</h2>
          <p className="text-sm text-gray-500 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Período Contábil: {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`px-4 py-2 border rounded-lg shadow-sm flex items-center gap-3 transition-colors ${isDarkMode ? 'bg-slate-900 border-white/5' : 'bg-white border-gray-300'}`}>
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Sistema Operacional</span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className={`border rounded-lg overflow-hidden flex flex-col shadow-sm transition-colors ${isDarkMode ? 'bg-slate-900 border-white/5' : 'bg-white border-gray-300'}`}>
          <div className="p-4 flex items-start justify-between border-b border-gray-100 dark:border-white/5">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Receita Líquida</p>
              <h3 className={`text-2xl font-mono font-bold tracking-tighter ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {currencyFormatter.format(stats.income)}
              </h3>
            </div>
            <div className="p-2 rounded-lg bg-emerald-500 bg-opacity-10">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
          <div className={`px-4 py-2 flex items-center justify-between transition-colors ${isDarkMode ? 'bg-white/5' : 'bg-gray-50'}`}>
            <span className="text-[9px] font-bold text-gray-500 uppercase">Entradas Efetivadas</span>
            <div className="flex items-center gap-0.5 text-[10px] font-bold text-emerald-600">
              <ArrowUpRight className="w-3 h-3" />
              12%
            </div>
          </div>
        </div>

        <div className={`border rounded-lg overflow-hidden flex flex-col shadow-sm transition-colors ${isDarkMode ? 'bg-slate-900 border-white/5' : 'bg-white border-gray-300'}`}>
          <div className="p-4 flex items-start justify-between border-b border-gray-100 dark:border-white/5">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Despesa Líquida</p>
              <h3 className={`text-2xl font-mono font-bold tracking-tighter ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {currencyFormatter.format(stats.expense)}
              </h3>
            </div>
            <div className="p-2 rounded-lg bg-rose-500 bg-opacity-10">
              <TrendingDown className="w-5 h-5 text-rose-600" />
            </div>
          </div>
          <div className={`px-4 py-2 flex items-center justify-between transition-colors ${isDarkMode ? 'bg-white/5' : 'bg-gray-50'}`}>
            <span className="text-[9px] font-bold text-gray-500 uppercase">Saídas Efetivadas</span>
            <div className="flex items-center gap-0.5 text-[10px] font-bold text-rose-600">
              <ArrowDownRight className="w-3 h-3" />
              5%
            </div>
          </div>
        </div>

        <div className={`border rounded-lg overflow-hidden flex flex-col shadow-sm transition-colors ${isDarkMode ? 'bg-slate-900 border-white/5' : 'bg-white border-gray-300'}`}>
          <div className="p-4 flex items-start justify-between border-b border-gray-100 dark:border-white/5">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Provisão de Débitos</p>
              <h3 className={`text-2xl font-mono font-bold tracking-tighter ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {currencyFormatter.format(stats.pendingTotal)}
              </h3>
            </div>
            <div className="p-2 rounded-lg bg-amber-500 bg-opacity-10">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
          </div>
          <div className={`px-4 py-2 flex items-center justify-between transition-colors ${isDarkMode ? 'bg-white/5' : 'bg-gray-50'}`}>
            <span className="text-[9px] font-bold text-gray-500 uppercase">Pagamentos Pendentes</span>
          </div>
        </div>

        <div className={`border rounded-lg overflow-hidden flex flex-col shadow-lg transition-colors ${isDarkMode ? 'bg-white border-white' : 'bg-[#1a1a1a] border-[#1a1a1a]'}`}>
          <div className={`p-4 flex items-start justify-between border-b ${isDarkMode ? 'border-black/10' : 'border-white/10'}`}>
            <div>
              <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${isDarkMode ? 'text-black/40' : 'text-white/40'}`}>Saldo em Conta</p>
              <h3 className={`text-2xl font-mono font-bold tracking-tighter ${isDarkMode ? 'text-black' : 'text-white'}`}>
                {currencyFormatter.format(stats.balance)}
              </h3>
            </div>
            <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-black/10' : 'bg-white/10'}`}>
              <DollarSign className={`w-5 h-5 ${isDarkMode ? 'text-black' : 'text-white'}`} />
            </div>
          </div>
          <div className={`px-4 py-2 flex items-center justify-between ${isDarkMode ? 'bg-black/5' : 'bg-white/5'}`}>
            <span className={`text-[9px] font-bold uppercase ${isDarkMode ? 'text-black/40' : 'text-white/40'}`}>Disponibilidade Real</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Trend Chart */}
        <div className={`border rounded-lg shadow-sm overflow-hidden flex flex-col lg:col-span-2 transition-colors ${isDarkMode ? 'bg-slate-900 border-white/5' : 'bg-white border-gray-300'}`}>
          <div className={`p-4 border-b flex items-center justify-between transition-colors ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-gray-50 border-gray-300'}`}>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-gray-400" />
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-600">Fluxo de Caixa Semestral</h3>
            </div>
            <div className="flex items-center gap-4 text-[9px] font-bold uppercase text-gray-400">
              <div className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${isDarkMode ? 'bg-white' : 'bg-[#1a1a1a]'}`} />
                Receitas
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600" />
                Despesas
              </div>
            </div>
          </div>
          <div className="p-6 h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? "#333" : "#E5E7EB"} />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#9CA3AF' }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#9CA3AF' }}
                  tickFormatter={(value) => `R$ ${value}`}
                />
                <Tooltip 
                  cursor={{ fill: isDarkMode ? 'rgba(255,255,255,0.05)' : '#F3F4F6' }}
                  contentStyle={{ 
                    backgroundColor: isDarkMode ? '#1a1a1a' : '#fff',
                    borderRadius: '8px', 
                    border: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid #E5E7EB',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    color: isDarkMode ? '#fff' : '#000'
                  }}
                />
                <Bar dataKey="receita" fill={isDarkMode ? "#fff" : "#1a1a1a"} radius={[4, 4, 0, 0]} barSize={32} />
                <Bar dataKey="despesa" fill={isDarkMode ? "#444" : "#D1D5DB"} radius={[4, 4, 0, 0]} barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Activity / Alerts */}
        <div className={`border rounded-lg shadow-sm overflow-hidden flex flex-col transition-colors ${isDarkMode ? 'bg-slate-900 border-white/5' : 'bg-white border-gray-300'}`}>
          <div className={`p-4 border-b flex items-center gap-2 transition-colors ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-gray-50 border-gray-300'}`}>
            <AlertCircle className="w-4 h-4 text-gray-400" />
            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-600">Alertas e Deduções</h3>
          </div>
          <div className="p-6 flex-1 space-y-6">
            <div className={`p-4 border rounded-xl transition-colors ${isDarkMode ? 'bg-rose-500/10 border-rose-500/20' : 'bg-rose-50 border-rose-100'}`}>
              <p className="text-[10px] font-bold text-rose-400 uppercase mb-1">Total de Deduções (Mês)</p>
              <h4 className="text-2xl font-mono font-bold text-rose-600 tracking-tighter">
                {currencyFormatter.format(stats.deductions)}
              </h4>
              <p className="text-[10px] text-rose-500 mt-2 font-medium">
                Soma de faltas e descontos aplicados no período.
              </p>
            </div>

            <div className="space-y-4">
              <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Resumo de Liquidez</h5>
              <div className="space-y-3">
                {[
                  { label: 'Margem de Lucro', value: stats.income > 0 ? ((stats.balance / stats.income) * 100).toFixed(1) + '%' : '0%', color: 'bg-emerald-500' },
                  { label: 'Comprometimento', value: stats.income > 0 ? ((stats.expense / stats.income) * 100).toFixed(1) + '%' : '0%', color: 'bg-rose-500' },
                  { label: 'Provisão Futura', value: stats.pendingTotal > 0 ? currencyFormatter.format(stats.pendingTotal) : 'R$ 0,00', color: 'bg-amber-500' },
                ].map((item, i) => (
                  <div key={i} className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-gray-50 border-gray-100'}`}>
                    <div className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${item.color}`} />
                      <span className="text-[10px] font-bold text-gray-600 uppercase">{item.label}</span>
                    </div>
                    <span className={`text-[11px] font-mono font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
