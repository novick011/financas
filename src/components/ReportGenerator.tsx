import React, { useState } from 'react';
import { Transaction } from '../types';
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths, isSameMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FileText, Download, Calendar, CheckCircle2, Database } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ReportGeneratorProps {
  transactions: Transaction[];
}

export default function ReportGenerator({ transactions }: ReportGeneratorProps) {
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [isGenerating, setIsGenerating] = useState(false);
  const isDarkMode = document.documentElement.classList.contains('dark');

  const currencyFormatter = new Intl.NumberFormat('pt-BR', { 
    style: 'currency', 
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  const months = eachMonthOfInterval({
    start: subMonths(new Date(), 11),
    end: new Date()
  }).reverse();

  const exportBackup = () => {
    const dataStr = JSON.stringify(transactions, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `Backup_Dominio_Financeiro_${format(new Date(), 'yyyy_MM_dd')}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const generatePDF = () => {
    setIsGenerating(true);
    try {
      const doc = new jsPDF();
      const monthStr = format(selectedMonth, 'MMMM yyyy', { locale: ptBR });
      const start = startOfMonth(selectedMonth);
      const end = endOfMonth(selectedMonth);

      const monthTransactions = transactions.filter(t => {
        const date = t.date.toDate();
        return date >= start && date <= end;
      }).sort((a, b) => b.date.toMillis() - a.date.toMillis());

      const getNetAmount = (t: Transaction) => {
        if (t.adjustments && t.adjustments.length > 0) {
          const discounts = t.adjustments.filter(a => a.type === 'discount').reduce((acc, a) => acc + a.amount, 0);
          const additions = t.adjustments.filter(a => a.type === 'addition').reduce((acc, a) => acc + a.amount, 0);
          return t.amount - discounts + additions;
        }
        return t.amount - (t.deduction || 0);
      };

      const getAdjustmentSummary = (t: Transaction) => {
        if (t.adjustments && t.adjustments.length > 0) {
          const discounts = t.adjustments.filter(a => a.type === 'discount').reduce((acc, a) => acc + a.amount, 0);
          const additions = t.adjustments.filter(a => a.type === 'addition').reduce((acc, a) => acc + a.amount, 0);
          return `Desc: R$ ${discounts.toFixed(2)} | Adic: R$ ${additions.toFixed(2)}`;
        }
        return t.deduction > 0 ? `Deduc: R$ ${t.deduction.toFixed(2)}` : '-';
      };

      const income = monthTransactions.filter(t => t.type === 'income' && t.status === 'paid').reduce((acc, t) => acc + getNetAmount(t), 0);
      const expense = monthTransactions.filter(t => t.type === 'expense' && t.status === 'paid').reduce((acc, t) => acc + getNetAmount(t), 0);
      const pending = monthTransactions.filter(t => t.type === 'expense' && t.status === 'pending').reduce((acc, t) => acc + getNetAmount(t), 0);
      const balance = income - expense;

      // Header - Corporate Style
      doc.setFontSize(24);
      doc.setTextColor(26, 26, 26); // #1a1a1a
      doc.text('DOMÍNIO FINANCEIRO', 14, 22);
      
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text('SISTEMA DE CONTABILIDADE PESSOAL E EMPRESARIAL', 14, 28);
      
      doc.setDrawColor(200);
      doc.line(14, 32, 196, 32);

      doc.setFontSize(12);
      doc.setTextColor(26, 26, 26);
      doc.text(`DEMONSTRATIVO MENSAL: ${monthStr.toUpperCase()}`, 14, 42);
      doc.setFontSize(9);
      doc.setTextColor(100);
      doc.text(`Data de Emissão: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 48);

      // Summary Table
      autoTable(doc, {
        startY: 55,
        head: [['Descrição do Fluxo', 'Valor Líquido (R$)']],
        body: [
          ['Receitas Efetivadas (Entradas)', currencyFormatter.format(income)],
          ['Despesas Efetivadas (Saídas)', currencyFormatter.format(expense)],
          ['Saldo Operacional (Caixa)', currencyFormatter.format(balance)],
          ['Provisão de Débitos (Pendentes)', currencyFormatter.format(pending)],
        ],
        theme: 'grid',
        headStyles: { fillColor: [26, 26, 26], textColor: 255 },
        columnStyles: {
          1: { halign: 'right', fontStyle: 'bold' }
        },
        margin: { right: 100 }
      });

      // Detailed Transactions Table
      const tableData = monthTransactions.map(t => [
        format(t.date.toDate(), 'dd/MM/yyyy'),
        t.description || 'Sem descrição',
        t.category,
        t.paymentMethod === 'cash_paid' ? 'À Vista' : t.paymentMethod === 'cash_pending' ? 'A Prazo' : `Parcela ${t.installmentNumber}/${t.installmentsCount}`,
        t.status === 'paid' ? 'Liquidado' : 'Pendente',
        getAdjustmentSummary(t),
        currencyFormatter.format(getNetAmount(t))
      ]);

      doc.setFontSize(12);
      doc.setTextColor(26, 26, 26);
      doc.text('DETALHAMENTO DE LANÇAMENTOS', 14, (doc as any).lastAutoTable.finalY + 15);

      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 20,
        head: [['Data', 'Descrição', 'Categoria', 'Forma Pag.', 'Status', 'Ajustes', 'Vlr Líquido']],
        body: tableData,
        headStyles: { fillColor: [26, 26, 26], textColor: 255 },
        alternateRowStyles: { fillColor: [250, 250, 250] },
        styles: { fontSize: 6, cellPadding: 2 },
        columnStyles: {
          5: { halign: 'right' },
          6: { halign: 'right', fontStyle: 'bold' }
        }
      });

      // Footer
      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Página ${i} de ${pageCount}`, 196, 285, { align: 'right' });
        doc.text('Documento gerado eletronicamente pelo Domínio Financeiro.', 14, 285);
      }

      doc.save(`Relatorio_Contabil_${format(selectedMonth, 'yyyy_MM')}.pdf`);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Ocorreu um erro ao gerar o relatório. Verifique se o seu navegador permite downloads.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className={`p-6 sm:p-8 rounded-[32px] shadow-sm border text-center transition-colors ${isDarkMode ? 'bg-[#111] border-white/5' : 'bg-white border-gray-100'}`}>
        <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center mx-auto mb-6 transition-colors ${isDarkMode ? 'bg-white/5' : 'bg-[#1a1a1a]/5'}`}>
          <FileText className={`w-8 h-8 sm:w-10 sm:h-10 ${isDarkMode ? 'text-white' : 'text-[#1a1a1a]'}`} />
        </div>
        <h2 className={`text-xl sm:text-2xl font-serif font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Relatórios Contábeis</h2>
        <p className="text-sm text-gray-500 mb-8">Gere o demonstrativo mensal de lançamentos e fluxo de caixa.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-8">
          {months.map(month => (
            <button
              key={month.toISOString()}
              onClick={() => setSelectedMonth(month)}
              className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${
                isSameMonth(selectedMonth, month)
                  ? isDarkMode ? 'border-white bg-white/10' : 'border-[#1a1a1a] bg-[#1a1a1a]/5'
                  : isDarkMode ? 'border-white/5 hover:border-white/20' : 'border-gray-100 hover:border-gray-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <Calendar className={`w-5 h-5 ${isSameMonth(selectedMonth, month) ? isDarkMode ? 'text-white' : 'text-[#1a1a1a]' : 'text-gray-400'}`} />
                <span className={`text-sm font-medium ${isSameMonth(selectedMonth, month) ? isDarkMode ? 'text-white' : 'text-[#1a1a1a]' : 'text-gray-600'}`}>
                  {format(month, 'MMMM yyyy', { locale: ptBR })}
                </span>
              </div>
              {isSameMonth(selectedMonth, month) && <CheckCircle2 className={`w-5 h-5 ${isDarkMode ? 'text-white' : 'text-[#1a1a1a]'}`} />}
            </button>
          ))}
        </div>

        <button
          onClick={generatePDF}
          disabled={isGenerating}
          className={`w-full flex items-center justify-center gap-3 py-4 px-6 rounded-full font-bold shadow-lg transition-all disabled:opacity-50 ${
            isDarkMode ? 'bg-white text-black hover:bg-gray-200 shadow-white/5' : 'bg-[#1a1a1a] text-white hover:bg-black shadow-black/20'
          }`}
        >
          {isGenerating ? (
            <div className={`w-5 h-5 border-2 rounded-full animate-spin ${isDarkMode ? 'border-black/30 border-t-black' : 'border-white/30 border-t-white'}`} />
          ) : (
            <>
              <Download className="w-5 h-5" />
              Gerar Demonstrativo PDF
            </>
          )}
        </button>
      </div>

      <div className={`p-6 rounded-[32px] border border-dashed transition-colors ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'}`}>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-center sm:text-left">
            <h3 className={`font-bold flex items-center justify-center sm:justify-start gap-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              <Database className="w-4 h-4" />
              Backup de Segurança
            </h3>
            <p className="text-xs text-gray-500">Exporte todos os seus dados em formato JSON para backup offline.</p>
          </div>
          <button
            onClick={exportBackup}
            className={`w-full sm:w-auto px-6 py-3 border rounded-full text-xs font-bold transition-all shadow-sm ${
              isDarkMode ? 'bg-white/10 border-white/10 text-white hover:bg-white/20' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            Exportar JSON
          </button>
        </div>
      </div>
    </div>
  );
}
