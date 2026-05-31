import React, { useState } from 'react';
import { Transaction } from '../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowUpCircle, ArrowDownCircle, Edit2, Trash2, Search, CheckCircle2, Clock, CreditCard, Filter, ChevronRight, ChevronLeft } from 'lucide-react';
import { doc, deleteDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { db, OperationType, handleFirestoreError } from '../firebase';

interface TransactionListProps {
  transactions: Transaction[];
  onEdit: (transaction: Transaction) => void;
}

export default function TransactionList({ transactions, onEdit }: TransactionListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const isDarkMode = document.documentElement.classList.contains('dark');

  const currencyFormatter = new Intl.NumberFormat('pt-BR', { 
    style: 'currency', 
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'transactions', id));
      setDeleteId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `transactions/${id}`);
    }
  };

  const toggleStatus = async (t: Transaction) => {
    try {
      const isPending = t.status === 'pending';
      const updates: any = {
        status: isPending ? 'paid' : 'pending'
      };

      if (t.paymentMethod === 'cash_pending' && isPending) {
        updates.paymentMethod = 'cash_paid';
        // Atualiza a data do lançamento para hoje, para que seja contabilizado como despesa real do mês corrente
        updates.date = Timestamp.now();
      } else if (t.paymentMethod === 'cash_paid' && !isPending) {
        updates.paymentMethod = 'cash_pending';
      }

      await updateDoc(doc(db, 'transactions', t.id), updates);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `transactions/${t.id}`);
    }
  };

  const getNetAmount = (t: Transaction) => {
    if (t.adjustments && t.adjustments.length > 0) {
      const discounts = t.adjustments.filter(a => a.type === 'discount').reduce((acc, a) => acc + a.amount, 0);
      const additions = t.adjustments.filter(a => a.type === 'addition').reduce((acc, a) => acc + a.amount, 0);
      return t.amount - discounts + additions;
    }
    return t.amount - (t.deduction || 0);
  };

  const filteredTransactions = transactions
    .filter(t => {
      const matchesSearch = (t.description?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                           t.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = typeFilter === 'all' || t.type === typeFilter;
      return matchesSearch && matchesType;
    })
    .sort((a, b) => b.date.toMillis() - a.date.toMillis());  return (
    <div className="border border-white/5 rounded-2xl shadow-xl shadow-black/30 overflow-hidden flex flex-col bg-discord-card text-discord-text-normal">
      {/* Filter/Header Section - ERP Style */}
      <div className="border-b border-white/5 p-5 space-y-4 bg-discord-sidebar">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-1 h-5 bg-discord-blurple rounded-full shadow-sm shadow-discord-blurple/50" />
            <h3 className="text-xs font-bold uppercase tracking-widest text-white">Consulta de Lançamentos</h3>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-1.5 rounded-lg border border-white/5 bg-discord-deep text-discord-text-muted hover:text-white hover:bg-discord-hover transition-all">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button className="p-1.5 rounded-lg border border-white/5 bg-discord-deep text-discord-text-muted hover:text-white hover:bg-discord-hover transition-all">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="sm:col-span-2 relative">
            <label className="text-[9px] font-bold uppercase text-discord-text-muted mb-1 block">Pesquisa Geral</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-discord-text-muted" />
              <input 
                type="text" 
                placeholder="Descrição, categoria..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-discord-deep border border-white/5 rounded-xl text-xs outline-none text-white focus:border-discord-blurple focus:ring-1 focus:ring-discord-blurple/50 transition-colors"
              />
            </div>
          </div>
          <div>
            <label className="text-[9px] font-bold uppercase text-discord-text-muted mb-1 block">Tipo de Operação</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="w-full px-3 py-2 bg-discord-deep border border-white/5 rounded-xl text-xs font-bold outline-none text-white focus:border-discord-blurple focus:ring-1 focus:ring-discord-blurple/50 transition-colors"
            >
              <option value="all">Todos os Tipos</option>
              <option value="income">Entradas (Receitas)</option>
              <option value="expense">Saídas (Despesas)</option>
            </select>
          </div>
          <div className="flex items-end">
            <button className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-white/5 bg-discord-deep text-discord-text-normal rounded-xl text-[10px] font-bold uppercase hover:bg-discord-hover transition-colors">
              <Filter className="w-3 h-3 text-discord-blurple" />
              Filtros Avançados
            </button>
          </div>
        </div>
      </div>

      {/* Ledger Table Section */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-white/5 bg-discord-deep/40 transition-colors">
              <th className="px-4 py-3 text-[10px] font-bold uppercase text-discord-text-muted border-r border-white/5 text-center w-24">Data</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase text-discord-text-muted border-r border-white/5">Descrição do Lançamento</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase text-discord-text-muted border-r border-white/5 w-32">Categoria</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase text-discord-text-muted border-r border-white/5 w-32 text-center">Pagamento</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase text-discord-text-muted border-r border-white/5 w-28 text-center">Situação</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase text-discord-text-muted border-r border-white/5 w-32 text-right">Valor Líquido</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase text-discord-text-muted w-20 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 bg-discord-card">
            {filteredTransactions.length > 0 ? (
              filteredTransactions.map((t) => (
                <tr key={t.id} className="transition-colors group border-b border-white/5 hover:bg-discord-hover/30">
                  <td className="px-4 py-3 whitespace-nowrap text-[11px] font-mono text-discord-text-muted border-r border-white/5 text-center">
                    {format(t.date.toDate(), 'dd/MM/yyyy', { locale: ptBR })}
                  </td>
                  <td className="px-4 py-3 border-r border-white/5">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          {t.type === 'income' ? (
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow shadow-emerald-500/50" />
                          ) : (
                            <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow shadow-rose-500/50" />
                          )}
                          <span className="text-[11px] font-semibold uppercase tracking-tight text-white">
                            {t.description || 'Lançamento sem descrição'}
                          </span>
                        </div>
                        {t.isLoan && (
                          <div className="flex items-center gap-1.5 mt-1 ml-3.5">
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold uppercase bg-amber-500/15 text-amber-500 border border-amber-500/20">
                              Empréstimo {t.loanType === 'borrowed' ? 'Tomado' : 'Concedido'}
                            </span>
                            {t.loanPartner && (
                              <span className="text-[9px] font-bold text-discord-text-muted uppercase tracking-tight">
                                {t.loanType === 'borrowed' ? 'Credor' : 'Devedor'}: {t.loanPartner}
                              </span>
                            )}
                          </div>
                        )}
                        {t.adjustments && t.adjustments.length > 0 ? (
                          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 ml-3.5">
                            {t.adjustments.map((adj, idx) => (
                              <span key={adj.id || idx} className={`text-[8px] font-mono uppercase ${adj.type === 'discount' ? 'text-rose-400' : 'text-emerald-400'}`}>
                                {adj.type === 'discount' ? 'DESC' : 'ADIC'}: {adj.description || '(Sem desc.)'} ({adj.type === 'discount' ? '-' : '+'} {currencyFormatter.format(adj.amount)})
                              </span>
                            ))}
                          </div>
                        ) : t.deduction > 0 && (
                          <span className="text-[9px] font-mono text-rose-400 ml-3.5">
                            DEDUÇÃO: - {currencyFormatter.format(t.deduction)}
                          </span>
                        )}
                      </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap border-r border-white/5">
                    <span className="text-[10px] font-bold text-discord-text-muted uppercase">
                      {t.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-[10px] font-bold text-center border-r border-white/5">
                    {t.paymentMethod === 'cash_paid' && (
                      <span className="text-emerald-400">
                        {t.type === 'expense' ? 'DÉBITO PAGO' : 'À VISTA'}
                      </span>
                    )}
                    {t.paymentMethod === 'cash_pending' && (
                      t.status === 'paid' ? (
                        <span className="text-emerald-400">DÍVIDA PAGA</span>
                      ) : (
                        <span className="text-amber-400">A PRAZO</span>
                      )
                    )}
                    {t.paymentMethod === 'installments' && (
                      <span className={`inline-flex items-center gap-1 ${t.status === 'paid' ? 'text-emerald-400' : 'text-amber-400'}`}>
                        <CreditCard className="w-3 h-3" />
                        {t.installmentNumber}/{t.installmentsCount} {t.status === 'paid' ? '(PAGO)' : '(PENDENTE)'}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap border-r border-white/5 text-center">
                    <button 
                      onClick={() => toggleStatus(t)}
                      className={`inline-flex items-center px-2.5 py-1 rounded text-[9px] font-bold uppercase border transition-colors ${
                        t.status === 'paid' 
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20' 
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20'
                      }`}
                    >
                      {t.status === 'paid' ? 'LIQUIDADO' : 'PENDENTE'}
                    </button>
                  </td>
                  <td className={`px-4 py-3 whitespace-nowrap text-[11px] font-mono font-bold text-right border-r border-white/5 ${
                    t.type === 'income' ? 'text-emerald-400' : 'text-rose-400'
                  }`}>
                    {currencyFormatter.format(getNetAmount(t))}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button 
                        onClick={() => onEdit(t)}
                        className="p-1.5 rounded-lg text-discord-text-muted hover:text-white hover:bg-white/5 transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => setDeleteId(t.id)}
                        className="p-1.5 rounded-lg text-discord-text-muted hover:text-rose-400 hover:bg-rose-500/15 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="px-6 py-20 text-center text-discord-text-muted italic text-xs bg-discord-card">
                  Nenhum registro encontrado para os filtros aplicados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer / Summary Bar - ERP Style */}
      <div className="border-t border-white/5 p-4.5 flex flex-col sm:flex-row items-center justify-between text-[10px] font-bold text-discord-text-muted uppercase px-6 bg-discord-deep/40 gap-4">
        <div className="flex flex-wrap gap-x-6 gap-y-1">
          <span>Total de Registros: <span className="text-white">{filteredTransactions.length}</span></span>
          <span>Filtro Ativo: <span className="text-white">{typeFilter === 'all' ? 'Todos' : typeFilter === 'income' ? 'Receitas' : 'Despesas'}</span></span>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-1 sm:text-right">
          <span className="text-emerald-400">Total Entradas: {currencyFormatter.format(filteredTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + getNetAmount(t), 0))}</span>
          <span className="text-rose-400">Total Saídas: {currencyFormatter.format(filteredTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + getNetAmount(t), 0))}</span>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-sm p-6 rounded-2xl border border-white/5 bg-discord-sidebar shadow-2xl shadow-black/80">
            <h4 className="text-lg font-bold mb-2 text-white">Confirmar Exclusão</h4>
            <p className="text-sm text-discord-text-muted mb-6">Tem certeza que deseja excluir esta transação? Esta ação não pode ser desfeita e alterará os relatórios contábeis.</p>
            <div className="flex gap-3">
              <button 
                onClick={() => setDeleteId(null)}
                className="flex-1 px-4 py-2 bg-discord-deep hover:bg-discord-hover text-white border border-white/5 rounded-xl text-xs font-bold uppercase transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={() => handleDelete(deleteId)}
                className="flex-1 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold uppercase transition-all shadow-lg"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
