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
  const isDarkMode = true;

  useEffect(() => {
    document.documentElement.classList.add('dark');
    localStorage.setItem('theme', 'dark');
  }, []);

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
      <div className="min-h-screen bg-discord-deep flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="max-w-md w-full bg-discord-sidebar border border-white/5 rounded-[32px] p-10 text-center shadow-2xl shadow-black/80"
        >
          <div className="w-16 h-16 bg-discord-blurple rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl rotate-3">
            <Wallet className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Finanças Pro</h1>
          <p className="text-discord-text-muted text-sm mb-8 leading-relaxed">
            Gestão financeira profissional com rigor contábil e interface inspirada na Web3.
          </p>
          <button
            onClick={handleLogin}
            className="w-full py-3.5 bg-discord-blurple hover:bg-discord-blurple/95 text-white rounded-xl font-bold flex items-center justify-center gap-3 transition-all shadow-lg active:scale-95 text-sm"
          >
            <img src="https://www.google.com/favicon.ico" className="w-5 h-5 bg-white p-0.5 rounded-full" alt="Google" />
            Entrar com o Google
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
    <div className="min-h-screen flex bg-discord-main text-discord-text-normal">
      {/* Desktop Sidebar */}
      <aside className={`hidden lg:flex flex-col transition-all duration-300 bg-discord-sidebar border-r border-white/5 text-discord-text-normal ${isSidebarOpen ? 'w-64' : 'w-20'}`}>
        <div className="p-6 flex items-center gap-4">
          <div className="w-10 h-10 bg-discord-blurple rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-discord-blurple/25">
            <Wallet className="w-5 h-5 text-white" />
          </div>
          {isSidebarOpen && <span className="font-bold text-lg tracking-tight text-white uppercase font-mono">Finanças Pro</span>}
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-8">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all ${
                activeTab === item.id 
                  ? 'bg-discord-blurple text-white font-bold' 
                  : 'text-discord-text-muted hover:text-white hover:bg-discord-hover'
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
        <header className="border-b border-white/5 h-16 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30 bg-discord-sidebar text-discord-text-normal">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="hidden lg:flex p-2 rounded-lg transition-colors hover:bg-discord-hover text-discord-text-muted hover:text-white"
            >
              {isSidebarOpen ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
            </button>
            <div className="lg:hidden flex items-center gap-2">
              <Wallet className="w-6 h-6 text-discord-blurple" />
              <span className="font-serif font-bold text-lg text-white">Finanças Pro</span>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-[10px] font-bold text-discord-text-muted uppercase tracking-widest ml-4">
              <span className="hover:text-white cursor-pointer">Home</span>
              <span className="text-white/10">/</span>
              <span className="text-white">{navItems.find(i => i.id === activeTab)?.label}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <button className="p-2 rounded-full relative transition-colors hover:bg-discord-hover text-discord-text-muted hover:text-white">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-discord-sidebar" />
            </button>
            <div className="h-8 w-px bg-white/10 mx-1" />
            <div className="flex items-center gap-3 pl-2">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-xs font-bold text-white">{user.displayName}</span>
                <span className="text-[10px] text-discord-text-muted uppercase font-bold">Administrador</span>
              </div>
              <img 
                src={user.photoURL || ''} 
                alt={user.displayName || ''} 
                className="w-8 h-8 rounded-full border border-white/10 shadow-sm"
              />
            </div>
          </div>
        </header>

        {/* Content View */}
        <main className="flex-1 p-4 lg:p-8 pb-24 lg:pb-8 overflow-y-auto bg-discord-main">
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
              <div className="rounded-[24px] p-12 text-center border border-white/5 bg-discord-card shadow-2xl">
                <Settings className="w-12 h-12 mx-auto mb-4 text-discord-text-muted" />
                <h2 className="text-xl font-bold mb-2 text-white">Configurações do Sistema</h2>
                <p className="text-discord-text-normal text-sm max-w-md mx-auto leading-relaxed">
                  Módulo em desenvolvimento. Em breve você poderá gerenciar categorias, importar dados e personalizar as regras do sistema.
                </p>
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
          className="hidden lg:flex fixed bottom-8 right-8 w-14 h-14 bg-discord-blurple text-white rounded-full items-center justify-center shadow-2xl shadow-discord-blurple/30 hover:scale-110 transition-all active:scale-95 z-40"
        >
          <Plus className="w-7 h-7" />
        </button>

        {/* Mobile Bottom Navigation */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 border-t border-white/5 px-6 py-3 flex items-center justify-between z-40 bg-discord-sidebar text-discord-text-normal">
          {navItems.filter(i => i.id !== 'settings').map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`flex flex-col items-center gap-1 transition-all ${
                activeTab === item.id ? 'text-white' : 'text-discord-text-muted'
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
            className="w-12 h-12 text-white rounded-2xl flex items-center justify-center shadow-lg -mt-8 border-4 bg-discord-blurple border-discord-deep hover:scale-105 transition-all"
          >
            <Plus className="w-6 h-6" />
          </button>
          <button
            onClick={handleLogout}
            className="flex flex-col items-center gap-1 text-discord-text-muted"
          >
            <LogOut className="w-6 h-6" />
            <span className="text-[10px] font-bold uppercase text-rose-400">Sair</span>
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
