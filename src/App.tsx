import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, User } from 'firebase/auth';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { auth, db, OperationType, handleFirestoreError } from './firebase';
import { Transaction, Category } from './types';
import { 
  Sun,
  Moon,
  Wallet, 
  LogIn, 
  LogOut, 
  Plus, 
  FileText, 
  PieChart, 
  List, 
  Settings, 
  Menu, 
  X, 
  Bell,
  LayoutDashboard,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Dashboard from './components/Dashboard';
import TransactionList from './components/TransactionList';
import TransactionForm from './components/TransactionForm';
import ReportGenerator from './components/ReportGenerator';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions' | 'reports' | 'settings'>('dashboard');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' || 
        (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setTransactions([]);
      setCategories([]);
      return;
    }

    const tQuery = query(
      collection(db, 'transactions'),
      where('uid', '==', user.uid),
      orderBy('date', 'desc')
    );

    const unsubscribeTransactions = onSnapshot(tQuery, (snapshot) => {
      const tData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Transaction[];
      setTransactions(tData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'transactions');
    });

    const cQuery = query(
      collection(db, 'categories'),
      where('uid', '==', user.uid)
    );

    const unsubscribeCategories = onSnapshot(cQuery, (snapshot) => {
      const cData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Category[];
      setCategories(cData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'categories');
    });

    return () => {
      unsubscribeTransactions();
      unsubscribeCategories();
    };
  }, [user]);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  const handleLogout = () => signOut(auth);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F3F4F6]">
        <div className="animate-pulse flex flex-col items-center">
          <Wallet className="w-12 h-12 text-[#1a1a1a] mb-4" />
          <p className="text-[#1a1a1a] font-bold uppercase tracking-widest text-xs">Carregando Sistema...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white rounded-[40px] p-12 text-center shadow-2xl"
        >
          <div className="w-20 h-20 bg-[#1a1a1a] rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl rotate-3">
            <Wallet className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-serif font-bold text-[#1a1a1a] mb-4">Finanças Pro</h1>
          <p className="text-gray-500 mb-10 leading-relaxed">
            Gestão financeira profissional com rigor contábil e interface moderna.
          </p>
          <button
            onClick={handleLogin}
            className="w-full py-4 bg-[#1a1a1a] text-white rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-black transition-all shadow-lg hover:shadow-xl active:scale-95"
          >
            <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
            Acessar com Google
          </button>
        </motion.div>
      </div>
    );
  }

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'transactions', label: 'Lançamentos', icon: List },
    { id: 'reports', label: 'Relatórios', icon: FileText },
    { id: 'settings', label: 'Configurações', icon: Settings },
  ];

  return (
    <div className={`min-h-screen flex transition-colors duration-300 ${isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-[#F3F4F6] text-gray-900'}`}>
      {/* Desktop Sidebar */}
      <aside className={`hidden lg:flex flex-col transition-all duration-300 ${isDarkMode ? 'bg-slate-900 border-r border-white/5' : 'bg-[#1a1a1a]'} text-white ${isSidebarOpen ? 'w-64' : 'w-20'}`}>
        <div className="p-6 flex items-center gap-4">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shrink-0">
            <Wallet className="w-6 h-6 text-[#1a1a1a]" />
          </div>
          {isSidebarOpen && <span className="font-serif font-bold text-xl tracking-tight">Finanças Pro</span>}
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-8">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all ${
                activeTab === item.id 
                  ? 'bg-white/10 text-white' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <item.icon className="w-5 h-5" />
              {isSidebarOpen && <span className="text-sm font-medium">{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-white/5">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-4 px-4 py-3 text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all"
          >
            <LogOut className="w-5 h-5" />
            {isSidebarOpen && <span className="text-sm font-medium">Sair do Sistema</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className={`border-b h-16 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30 transition-colors ${isDarkMode ? 'bg-slate-900 border-white/5' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className={`hidden lg:flex p-2 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-white/5 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
            >
              {isSidebarOpen ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
            </button>
            <div className="lg:hidden flex items-center gap-2">
              <Wallet className={`w-6 h-6 ${isDarkMode ? 'text-white' : 'text-[#1a1a1a]'}`} />
              <span className="font-serif font-bold text-lg">Finanças Pro</span>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-4">
              <span className="hover:text-gray-600 cursor-pointer">Home</span>
              <span className="text-gray-300">/</span>
              <span className={`${isDarkMode ? 'text-white' : 'text-[#1a1a1a]'}`}>{navItems.find(i => i.id === activeTab)?.label}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`p-2 rounded-full transition-colors ${isDarkMode ? 'hover:bg-white/5 text-yellow-400' : 'hover:bg-gray-100 text-gray-500'}`}
              title={isDarkMode ? 'Ativar Modo Claro' : 'Ativar Modo Escuro'}
            >
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button className={`p-2 rounded-full relative transition-colors ${isDarkMode ? 'hover:bg-white/5 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white dark:border-[#111]" />
            </button>
            <div className={`h-8 w-px mx-1 ${isDarkMode ? 'bg-white/10' : 'bg-gray-200'}`} />
            <div className="flex items-center gap-3 pl-2">
              <div className="hidden sm:flex flex-col items-end">
                <span className={`text-xs font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{user.displayName}</span>
                <span className="text-[10px] text-gray-400 uppercase font-bold">Administrador</span>
              </div>
              <img 
                src={user.photoURL || ''} 
                alt={user.displayName || ''} 
                className={`w-8 h-8 rounded-full border shadow-sm ${isDarkMode ? 'border-white/10' : 'border-gray-200'}`}
              />
            </div>
          </div>
        </header>

        {/* Content View */}
        <main className="flex-1 p-4 lg:p-8 pb-24 lg:pb-8 overflow-y-auto">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="max-w-7xl mx-auto"
          >
            {activeTab === 'dashboard' && <Dashboard transactions={transactions} categories={categories} />}
            {activeTab === 'transactions' && (
              <TransactionList 
                transactions={transactions} 
                onEdit={(t) => {
                  setEditingTransaction(t);
                  setIsFormOpen(true);
                }} 
              />
            )}
            {activeTab === 'reports' && <ReportGenerator transactions={transactions} />}
            {activeTab === 'settings' && (
              <div className={`rounded-[32px] p-12 text-center border shadow-sm transition-colors ${isDarkMode ? 'bg-slate-900 border-white/5' : 'bg-white border-gray-100'}`}>
                <Settings className={`w-12 h-12 mx-auto mb-4 ${isDarkMode ? 'text-slate-600' : 'text-gray-300'}`} />
                <h2 className={`text-xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Configurações do Sistema</h2>
                <p className="text-gray-500">Módulo em desenvolvimento. Em breve você poderá gerenciar categorias e preferências.</p>
              </div>
            )}
          </motion.div>
        </main>

        {/* Floating Action Button (Desktop Only - Mobile is in Bottom Nav) */}
        <button
          onClick={() => {
            setEditingTransaction(null);
            setIsFormOpen(true);
          }}
          className="hidden lg:flex fixed bottom-8 right-8 w-14 h-14 bg-[#1a1a1a] text-white rounded-full items-center justify-center shadow-2xl hover:scale-110 transition-all active:scale-95 z-40"
        >
          <Plus className="w-7 h-7" />
        </button>

        {/* Mobile Bottom Navigation */}
        <nav className={`lg:hidden fixed bottom-0 left-0 right-0 border-t px-6 py-3 flex items-center justify-between z-40 transition-colors ${isDarkMode ? 'bg-slate-900 border-white/5' : 'bg-white border-gray-200'}`}>
          {navItems.filter(i => i.id !== 'settings').map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`flex flex-col items-center gap-1 transition-all ${
                activeTab === item.id ? (isDarkMode ? 'text-white' : 'text-[#1a1a1a]') : 'text-slate-400'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[9px] font-bold uppercase">{item.label}</span>
            </button>
          ))}
          <button
            onClick={() => {
              setEditingTransaction(null);
              setIsFormOpen(true);
            }}
            className={`w-12 h-12 text-white rounded-2xl flex items-center justify-center shadow-lg -mt-8 border-4 transition-all ${isDarkMode ? 'bg-white text-black border-slate-950' : 'bg-[#1a1a1a] border-[#F3F4F6]'}`}
          >
            <Plus className="w-6 h-6" />
          </button>
          <button
            onClick={handleLogout}
            className="flex flex-col items-center gap-1 text-gray-400"
          >
            <LogOut className="w-6 h-6" />
            <span className="text-[10px] font-bold uppercase">Sair</span>
          </button>
        </nav>
      </div>

      {/* Transaction Modal */}
      <AnimatePresence>
        {isFormOpen && (
          <TransactionForm 
            onClose={() => {
              setIsFormOpen(false);
              setEditingTransaction(null);
            }}
            editingTransaction={editingTransaction}
            categories={categories}
            user={user}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
