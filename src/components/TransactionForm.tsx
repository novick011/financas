import React, { useState } from 'react';
import { Adjustment, Transaction, Category, TransactionType, PaymentMethod } from '../types';
import { X, Save, CreditCard, Banknote, CalendarClock, Info, Calculator, FileText, Plus, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, addDoc, updateDoc, doc, Timestamp, writeBatch } from 'firebase/firestore';
import { db, OperationType, handleFirestoreError } from '../firebase';
import { User } from 'firebase/auth';
import { addMonths } from 'date-fns';

interface TransactionFormProps {
  onClose: () => void;
  editingTransaction: Transaction | null;
  categories: Category[];
  user: User;
}

const DEFAULT_CATEGORIES = [
  'Alimentação', 'Transporte', 'Lazer', 'Saúde', 'Educação', 'Moradia', 'Salário', 'Investimentos', 'Outros'
];

type FormTab = 'geral' | 'pagamento' | 'detalhes';

export default function TransactionForm({ onClose, editingTransaction, categories, user }: TransactionFormProps) {
  const [activeTab, setActiveTab] = useState<FormTab>('geral');
  const [amount, setAmount] = useState<string>(editingTransaction?.amount.toString() || '');
  const [type, setType] = useState<TransactionType>(editingTransaction?.type || 'expense');
  const [category, setCategory] = useState<string>(editingTransaction?.category || 'Outros');
  const [date, setDate] = useState<string>(
    editingTransaction ? editingTransaction.date.toDate().toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
  );
  const [description, setDescription] = useState<string>(editingTransaction?.description || '');
  const [adjustments, setAdjustments] = useState<Adjustment[]>(editingTransaction?.adjustments || []);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(editingTransaction?.paymentMethod || 'cash_paid');
  const [installmentsCount, setInstallmentsCount] = useState<number>(editingTransaction?.installmentsCount || 1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isDarkMode = document.documentElement.classList.contains('dark');

  const addAdjustment = (type: 'discount' | 'addition') => {
    const newAdjustment: Adjustment = {
      id: Math.random().toString(36).substr(2, 9),
      description: '',
      amount: 0,
      type
    };
    setAdjustments([...adjustments, newAdjustment]);
  };

  const removeAdjustment = (id: string) => {
    setAdjustments(adjustments.filter(a => a.id !== id));
  };

  const updateAdjustment = (id: string, field: keyof Adjustment, value: any) => {
    setAdjustments(adjustments.map(a => {
      if (a.id === id) {
        if (field === 'amount') {
          // Ensure amount is not negative
          const val = parseFloat(value) || 0;
          return { ...a, [field]: Math.max(0, val) };
        }
        return { ...a, [field]: value };
      }
      return a;
    }));
  };

  const totalDiscounts = adjustments
    .filter(a => a.type === 'discount')
    .reduce((acc, a) => acc + a.amount, 0);

  const totalAdditions = adjustments
    .filter(a => a.type === 'addition')
    .reduce((acc, a) => acc + a.amount, 0);

  const netAmount = parseFloat(amount || '0') - totalDiscounts + totalAdditions;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !category || !date) return;

    setIsSubmitting(true);
    const baseDate = new Date(date);
    const parsedAmount = parseFloat(amount);

    try {
      if (editingTransaction) {
        const transactionData = {
          uid: user.uid,
          amount: parsedAmount,
          deduction: totalDiscounts, // Keep for legacy compatibility
          adjustments,
          type,
          category,
          date: Timestamp.fromDate(baseDate),
          description,
          paymentMethod,
          status: paymentMethod === 'cash_paid' ? 'paid' : 'pending',
          createdAt: editingTransaction.createdAt || Timestamp.now()
        };
        await updateDoc(doc(db, 'transactions', editingTransaction.id), transactionData);
      } else {
        if (paymentMethod === 'installments' && installmentsCount > 1) {
          const batch = writeBatch(db);
          // Distribute adjustments across installments
          const installmentBaseAmount = parsedAmount / installmentsCount;
          const installmentDiscounts = totalDiscounts / installmentsCount;
          const installmentAdditions = totalAdditions / installmentsCount;
          
          // Distribute individual adjustments for detail tracking
          const distributedAdjustments = adjustments.map(adj => ({
            ...adj,
            amount: adj.amount / installmentsCount
          }));

          for (let i = 0; i < installmentsCount; i++) {
            const installmentDate = addMonths(baseDate, i);
            const newDocRef = doc(collection(db, 'transactions'));
            batch.set(newDocRef, {
              uid: user.uid,
              amount: installmentBaseAmount,
              deduction: installmentDiscounts,
              adjustments: distributedAdjustments,
              type,
              category,
              date: Timestamp.fromDate(installmentDate),
              description: `${description} (${i + 1}/${installmentsCount})`,
              paymentMethod: 'installments',
              installmentsCount,
              installmentNumber: i + 1,
              status: i === 0 ? 'paid' : 'pending',
              createdAt: Timestamp.now()
            });
          }
          await batch.commit();
        } else {
          const transactionData = {
            uid: user.uid,
            amount: parsedAmount,
            deduction: totalDiscounts,
            adjustments,
            type,
            category,
            date: Timestamp.fromDate(baseDate),
            description,
            paymentMethod,
            status: paymentMethod === 'cash_paid' ? 'paid' : 'pending',
            createdAt: Timestamp.now()
          };
          await addDoc(collection(db, 'transactions'), transactionData);
        }
      }
      onClose();
    } catch (error) {
      handleFirestoreError(error, editingTransaction ? OperationType.UPDATE : OperationType.CREATE, 'transactions');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: 10 }}
        className="bg-[#F3F4F6] dark:bg-slate-950 w-full max-w-4xl h-full sm:h-auto sm:max-h-[90vh] sm:rounded-lg shadow-2xl overflow-hidden flex flex-col border border-gray-300 dark:border-white/10"
      >
        {/* Header - ERP Style */}
        <div className="bg-white dark:bg-slate-900 border-b border-gray-300 dark:border-white/10 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-[#1a1a1a] dark:bg-white p-1.5 rounded">
              <Calculator className="w-4 h-4 text-white dark:text-black" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-tight">
                {editingTransaction ? 'Editar Lançamento' : 'Novo Lançamento Contábil'}
              </h3>
              <p className="text-[10px] text-gray-500 font-mono uppercase">Módulo: Notas de Entrada/Saída</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-white/5 rounded transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Tabs Navigation */}
        <div className="bg-white dark:bg-slate-900 border-b border-gray-300 dark:border-white/10 flex overflow-x-auto">
          {[
            { id: 'geral', label: 'Dados Gerais', icon: Info },
            { id: 'pagamento', label: 'Pagamento/Parcelas', icon: CreditCard },
            { id: 'detalhes', label: 'Observações', icon: FileText },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as FormTab)}
              className={`flex items-center gap-2 px-6 py-3 text-xs font-bold uppercase tracking-wider border-r border-gray-200 dark:border-white/5 transition-all whitespace-nowrap ${
                activeTab === tab.id 
                  ? 'bg-[#F3F4F6] dark:bg-slate-950 text-[#1a1a1a] dark:text-white border-b-2 border-b-[#1a1a1a] dark:border-b-white' 
                  : 'text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto bg-[#F3F4F6] dark:bg-[#0a0a0a] p-6 space-y-6">
          <AnimatePresence mode="wait">
            {activeTab === 'geral' && (
              <motion.div
                key="geral"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-6"
              >
                {/* Section: Identificação */}
                <div className="bg-white dark:bg-slate-900 p-6 border border-gray-300 dark:border-white/10 rounded shadow-sm space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-1 h-4 bg-[#1a1a1a] dark:bg-white" />
                    <h4 className="text-[10px] font-bold uppercase text-gray-500">Identificação do Lançamento</h4>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-gray-400">Tipo de Operação</label>
                      <select
                        value={type}
                        onChange={(e) => setType(e.target.value as TransactionType)}
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-black border border-gray-200 dark:border-white/10 rounded text-xs font-bold focus:ring-1 focus:ring-[#1a1a1a] dark:focus:ring-white outline-none text-gray-900 dark:text-white"
                      >
                        <option value="expense">Saída (Despesa)</option>
                        <option value="income">Entrada (Receita)</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-gray-400">Data de Emissão</label>
                      <input
                        type="date"
                        required
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-black border border-gray-200 dark:border-white/10 rounded text-xs font-mono focus:ring-1 focus:ring-[#1a1a1a] dark:focus:ring-white outline-none text-gray-900 dark:text-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-gray-400">Categoria Contábil</label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-black border border-gray-200 dark:border-white/10 rounded text-xs font-bold focus:ring-1 focus:ring-[#1a1a1a] dark:focus:ring-white outline-none text-gray-900 dark:text-white"
                      >
                        {DEFAULT_CATEGORIES.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Section: Valores */}
                <div className="bg-white dark:bg-slate-900 p-6 border border-gray-300 dark:border-white/10 rounded shadow-sm space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-1 h-4 bg-[#1a1a1a] dark:bg-white" />
                    <h4 className="text-[10px] font-bold uppercase text-gray-500">Valores e Totais</h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-gray-400">Valor Bruto (R$)</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        placeholder="0.00"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-black border border-gray-200 dark:border-white/10 rounded text-sm font-mono font-bold focus:ring-1 focus:ring-[#1a1a1a] dark:focus:ring-white outline-none text-gray-900 dark:text-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-gray-400">Valor Líquido Final</label>
                      <div className="w-full px-4 py-4 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded flex flex-col items-center justify-center transition-all">
                        <span className={`text-[10px] font-bold uppercase mb-1 ${type === 'income' ? 'text-emerald-500' : 'text-rose-500'}`}>
                          {type === 'income' ? 'Total a Receber' : 'Total a Pagar'}
                        </span>
                        <div className={`text-2xl sm:text-3xl font-mono font-bold tracking-tighter ${isDarkMode ? 'text-white' : 'text-[#1a1a1a]'}`}>
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(netAmount)}
                        </div>
                        {adjustments.length > 0 && (
                          <div className="mt-2 flex gap-2 text-[9px] font-mono text-gray-400 uppercase">
                            <span>Bruto: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parseFloat(amount) || 0)}</span>
                            <span>•</span>
                            <span>Ajustes: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalAdditions - totalDiscounts)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Adjustments Section */}
                  <div className="space-y-3 pt-4 border-t border-gray-100">
                    <div className="flex items-center justify-between">
                      <h5 className="text-[10px] font-bold uppercase text-gray-500">Ajustes Financeiros (Descontos e Adicionais)</h5>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => addAdjustment('discount')}
                          className="flex items-center gap-1 px-2 py-1 bg-rose-50 text-rose-600 rounded text-[9px] font-bold uppercase hover:bg-rose-100 transition-colors"
                        >
                          <Plus className="w-3 h-3" /> Desconto
                        </button>
                        <button
                          type="button"
                          onClick={() => addAdjustment('addition')}
                          className="flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-600 rounded text-[9px] font-bold uppercase hover:bg-emerald-100 transition-colors"
                        >
                          <Plus className="w-3 h-3" /> Adicional
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {adjustments.map((adj) => (
                        <div key={adj.id} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-black border border-gray-200 dark:border-white/10 rounded group">
                          <div className={`w-1 h-8 rounded-full ${adj.type === 'discount' ? 'bg-rose-400' : 'bg-emerald-400'}`} />
                          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <input
                              type="text"
                              placeholder="Descrição (ex: Imposto, Desconto Pontualidade)"
                              value={adj.description}
                              onChange={(e) => updateAdjustment(adj.id, 'description', e.target.value)}
                              className="px-2 py-1 bg-white dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded text-[11px] focus:ring-1 focus:ring-[#1a1a1a] dark:focus:ring-white outline-none text-gray-900 dark:text-white"
                            />
                            <div className="flex items-center gap-2">
                              <span className={`text-[10px] font-bold ${adj.type === 'discount' ? 'text-rose-600' : 'text-emerald-600'}`}>
                                {adj.type === 'discount' ? '-' : '+'} R$
                              </span>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={adj.amount}
                                onChange={(e) => updateAdjustment(adj.id, 'amount', e.target.value)}
                                className="flex-1 px-2 py-1 bg-white dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded text-[11px] font-mono focus:ring-1 focus:ring-[#1a1a1a] dark:focus:ring-white outline-none text-gray-900 dark:text-white"
                              />
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeAdjustment(adj.id)}
                            className="p-1 text-gray-400 hover:text-rose-600 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      {adjustments.length === 0 && (
                        <p className="text-[10px] text-gray-400 text-center py-2 italic">Nenhum ajuste financeiro adicionado.</p>
                      )}
                    </div>

                    {adjustments.length > 0 && (
                      <div className="flex justify-end gap-4 text-[10px] font-mono border-t border-gray-100 pt-2">
                        <span className="text-rose-600">Total Descontos: -R$ {totalDiscounts.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        <span className="text-emerald-600">Total Adicionais: +R$ {totalAdditions.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'pagamento' && (
              <motion.div
                key="pagamento"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-6"
              >
                <div className="bg-white dark:bg-slate-900 p-6 border border-gray-300 dark:border-white/10 rounded shadow-sm space-y-6">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-1 h-4 bg-[#1a1a1a] dark:bg-white" />
                    <h4 className="text-[10px] font-bold uppercase text-gray-500">Condições de Pagamento</h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('cash_paid')}
                      className={`flex items-center gap-3 p-4 border rounded transition-all ${
                        paymentMethod === 'cash_paid' 
                          ? 'bg-[#1a1a1a] dark:bg-white text-white dark:text-black border-[#1a1a1a] dark:border-white' 
                          : 'bg-gray-50 dark:bg-black border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-white/20'
                      }`}
                    >
                      <Banknote className="w-5 h-5" />
                      <div className="text-left">
                        <p className="text-[10px] font-bold uppercase">À Vista</p>
                        <p className="text-[8px] opacity-60">Liquidação Imediata</p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('cash_pending')}
                      className={`flex items-center gap-3 p-4 border rounded transition-all ${
                        paymentMethod === 'cash_pending' 
                          ? 'bg-[#1a1a1a] dark:bg-white text-white dark:text-black border-[#1a1a1a] dark:border-white' 
                          : 'bg-gray-50 dark:bg-black border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-white/20'
                      }`}
                    >
                      <CalendarClock className="w-5 h-5" />
                      <div className="text-left">
                        <p className="text-[10px] font-bold uppercase">A Prazo</p>
                        <p className="text-[8px] opacity-60">Vencimento Futuro</p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('installments')}
                      className={`flex items-center gap-3 p-4 border rounded transition-all ${
                        paymentMethod === 'installments' 
                          ? 'bg-[#1a1a1a] dark:bg-white text-white dark:text-black border-[#1a1a1a] dark:border-white' 
                          : 'bg-gray-50 dark:bg-black border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-white/20'
                      }`}
                    >
                      <CreditCard className="w-5 h-5" />
                      <div className="text-left">
                        <p className="text-[10px] font-bold uppercase">Parcelado</p>
                        <p className="text-[8px] opacity-60">Múltiplos Lançamentos</p>
                      </div>
                    </button>
                  </div>

                  {paymentMethod === 'installments' && (
                    <div className="p-4 bg-gray-50 dark:bg-black border border-gray-200 dark:border-white/10 rounded space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold uppercase text-gray-500">Configuração de Parcelas</label>
                        <span className="text-[10px] font-mono text-gray-400">Limite: 60 parcelas</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <input
                          type="number"
                          min="2"
                          max="60"
                          value={installmentsCount}
                          onChange={(e) => setInstallmentsCount(parseInt(e.target.value))}
                          className="w-24 px-3 py-2 bg-white dark:bg-[#111] border border-gray-300 dark:border-white/10 rounded text-xs font-mono font-bold focus:ring-1 focus:ring-[#1a1a1a] dark:focus:ring-white outline-none text-gray-900 dark:text-white"
                        />
                        <div className="text-[10px] text-gray-500">
                          Valor por parcela: <span className="font-mono font-bold text-[#1a1a1a] dark:text-white">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(netAmount / installmentsCount)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'detalhes' && (
              <motion.div
                key="detalhes"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-6"
              >
                <div className="bg-white dark:bg-slate-900 p-6 border border-gray-300 dark:border-white/10 rounded shadow-sm space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-1 h-4 bg-[#1a1a1a] dark:bg-white" />
                    <h4 className="text-[10px] font-bold uppercase text-gray-500">Informações Complementares</h4>
                  </div>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Digite aqui observações relevantes para este lançamento contábil..."
                    className="w-full h-40 px-4 py-3 bg-gray-50 dark:bg-black border border-gray-200 dark:border-white/10 rounded text-xs focus:ring-1 focus:ring-[#1a1a1a] dark:focus:ring-white outline-none resize-none text-gray-900 dark:text-white"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </form>

        {/* Footer - ERP Style */}
        <div className="bg-white dark:bg-slate-900 border-t border-gray-300 dark:border-white/10 p-4 flex items-center justify-between">
          <div className="hidden sm:flex items-center gap-4 text-[10px] text-gray-400 font-mono">
            <span>USUÁRIO: {user.displayName?.toUpperCase()}</span>
            <span>STATUS: {editingTransaction ? 'EDIÇÃO' : 'INSERÇÃO'}</span>
          </div>
          <div className="flex gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-6 py-2 border border-gray-300 dark:border-white/10 rounded text-[10px] font-bold uppercase hover:bg-gray-50 dark:hover:bg-white/5 transition-all text-gray-700 dark:text-gray-300"
            >
              Cancelar (ESC)
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 sm:flex-none px-8 py-2 bg-[#1a1a1a] dark:bg-white text-white dark:text-black rounded text-[10px] font-bold uppercase hover:bg-black dark:hover:bg-gray-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  Gravar Lançamento (F10)
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
