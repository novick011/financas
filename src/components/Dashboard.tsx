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
          <h2 className="text-2xl font-bold tracking-tight text-white">Visão Geral do Patrimônio</h2>
          <p className="text-sm text-discord-text-muted flex items-center gap-2">
            <Calendar className="w-4 h-4 text-discord-blurple" />
            Período Contábil: <span className="text-white capitalize">{format(currentMonth, 'MMMM yyyy', { locale: ptBR })}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="px-4 py-2 border border-white/5 bg-discord-sidebar rounded-xl flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-discord-text-muted">Sistema Operacional</span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="border border-white/5 bg-discord-card rounded-2xl overflow-hidden flex flex-col shadow-lg shadow-black/20">
          <div className="p-5 flex items-start justify-between border-b border-white/5">
            <div>
              <p className="text-[10px] font-bold text-discord-text-muted uppercase tracking-widest mb-1.5">Receita Líquida</p>
              <h3 className="text-2xl font-mono font-bold tracking-tight text-white">
                {currencyFormatter.format(stats.income)}
              </h3>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-500 bg-opacity-10">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
            </div>
          </div>
          <div className="px-5 py-3.5 flex items-center justify-between bg-black/15">
            <span className="text-[9px] font-bold text-discord-text-muted uppercase">Entradas Efetivadas</span>
            <div className="flex items-center gap-0.5 text-[10px] font-bold text-emerald-400">
              <ArrowUpRight className="w-3 h-3" />
              12%
            </div>
          </div>
        </div>

        <div className="border border-white/5 bg-discord-card rounded-2xl overflow-hidden flex flex-col shadow-lg shadow-black/20">
          <div className="p-5 flex items-start justify-between border-b border-white/5">
            <div>
              <p className="text-[10px] font-bold text-discord-text-muted uppercase tracking-widest mb-1.5">Despesa Líquida</p>
              <h3 className="text-2xl font-mono font-bold tracking-tight text-white">
                {currencyFormatter.format(stats.expense)}
              </h3>
            </div>
            <div className="p-2.5 rounded-xl bg-rose-500 bg-opacity-10">
              <TrendingDown className="w-5 h-5 text-rose-400" />
            </div>
          </div>
          <div className="px-5 py-3.5 flex items-center justify-between bg-black/15">
            <span className="text-[9px] font-bold text-discord-text-muted uppercase">Saídas Efetivadas</span>
            <div className="flex items-center gap-0.5 text-[10px] font-bold text-rose-400">
              <ArrowDownRight className="w-3 h-3" />
              5%
            </div>
          </div>
        </div>

        <div className="border border-white/5 bg-discord-card rounded-2xl overflow-hidden flex flex-col shadow-lg shadow-black/20">
          <div className="p-5 flex items-start justify-between border-b border-white/5">
            <div>
              <p className="text-[10px] font-bold text-discord-text-muted uppercase tracking-widest mb-1.5">Provisão de Débitos</p>
              <h3 className="text-2xl font-mono font-bold tracking-tight text-white">
                {currencyFormatter.format(stats.pendingTotal)}
              </h3>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-500 bg-opacity-10">
              <Clock className="w-5 h-5 text-amber-400" />
            </div>
          </div>
          <div className="px-5 py-3.5 flex items-center justify-between bg-black/15">
            <span className="text-[9px] font-bold text-discord-text-muted uppercase">Pagamentos Pendentes</span>
          </div>
        </div>

        <div className="border border-discord-blurple/30 bg-discord-blurple rounded-2xl overflow-hidden flex flex-col shadow-xl shadow-discord-blurple/15">
          <div className="p-5 flex items-start justify-between border-b border-white/10 text-white">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5 text-white/70">Saldo em Conta</p>
              <h3 className="text-2xl font-mono font-bold tracking-tight text-white">
                {currencyFormatter.format(stats.balance)}
              </h3>
            </div>
            <div className="p-2.5 rounded-xl bg-white/15">
              <DollarSign className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="px-5 py-3.5 flex items-center justify-between bg-black/15">
            <span className="text-[9px] font-bold uppercase text-white/70">Disponibilidade Real</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Trend Chart */}
        <div className="border border-white/5 bg-discord-card rounded-2xl shadow-lg shadow-black/20 overflow-hidden flex flex-col lg:col-span-2">
          <div className="p-4 border-b border-white/5 flex items-center justify-between bg-discord-sidebar/40">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-discord-text-muted" />
              <h3 className="text-xs font-bold uppercase tracking-widest text-discord-text-normal">Fluxo de Caixa Semestral</h3>
            </div>
            <div className="flex items-center gap-4 text-[9px] font-bold uppercase text-discord-text-muted">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-discord-blurple" />
                Receitas
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-slate-500" />
                Despesas
              </div>
            </div>
          </div>
          <div className="p-6 h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#2b2d31" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#949ba4' }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#949ba4' }}
                  tickFormatter={(value) => `R$ ${value}`}
                />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                  contentStyle={{ 
                    backgroundColor: '#1e1f22',
                    borderRadius: '12px', 
                    border: '1px solid rgba(255,255,255,0.06)',
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.7)',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    color: '#dbdee1'
                  }}
                />
                <Bar dataKey="receita" fill="#5865f2" radius={[4, 4, 0, 0]} barSize={28} />
                <Bar dataKey="despesa" fill="#44464d" radius={[4, 4, 0, 0]} barSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Activity / Alerts */}
        <div className="border border-white/5 bg-discord-card rounded-2xl shadow-lg shadow-black/20 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-white/5 flex items-center gap-2 bg-discord-sidebar/40">
            <AlertCircle className="w-4 h-4 text-discord-text-muted" />
            <h3 className="text-xs font-bold uppercase tracking-widest text-discord-text-normal">Alertas e Deduções</h3>
          </div>
          <div className="p-6 flex-1 space-y-6">
            <div className="p-4 border border-rose-500/10 bg-rose-500/5 rounded-xl">
              <p className="text-[10px] font-bold text-rose-400 uppercase mb-1">Total de Deduções (Mês)</p>
              <h4 className="text-2xl font-mono font-bold text-rose-400 tracking-tight">
                {currencyFormatter.format(stats.deductions)}
              </h4>
              <p className="text-[10px] text-rose-500 mt-2 font-medium">
                Soma de faltas e descontos aplicados no período.
              </p>
            </div>

            <div className="space-y-4">
              <h5 className="text-[10px] font-bold text-discord-text-muted uppercase tracking-widest">Resumo de Liquidez</h5>
              <div className="space-y-3">
                {[
                  { label: 'Margem de Lucro', value: stats.income > 0 ? ((stats.balance / stats.income) * 100).toFixed(1) + '%' : '0%', color: 'bg-emerald-500' },
                  { label: 'Comprometimento', value: stats.income > 0 ? ((stats.expense / stats.income) * 100).toFixed(1) + '%' : '0%', color: 'bg-rose-500' },
                  { label: 'Provisão Futura', value: stats.pendingTotal > 0 ? currencyFormatter.format(stats.pendingTotal) : 'R$ 0,00', color: 'bg-amber-500' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-3.5 rounded-xl border border-white/5 bg-discord-sidebar hover:bg-discord-hover transition-colors">
                    <div className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${item.color}`} />
                      <span className="text-[10px] font-bold text-discord-text-muted uppercase">{item.label}</span>
                    </div>
                    <span className="text-[11px] font-mono font-bold text-white">{item.value}</span>
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
