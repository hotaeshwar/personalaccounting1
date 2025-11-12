import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Login from './components/Login';
import Register from './components/Register';
import ForgotPassword from './components/ForgotPassword';
import ExpenseList from './components/ExpenseList';
import ExpenseForm from './components/ExpenseForm';
import InvoiceDetails from './components/InvoiceDetails';
import ArchiveList from './components/ArchiveList';
import IncomeForm from './components/IncomeForm';
import ProfitLoss from './components/ProfitLoss';
import ExportReport from './components/ExportReport';
import UserTransactions from './components/UserTransactions';

function App() {
  const [currentView, setCurrentView] = useState('login');
  const [isLoggedIn, setIsLoggedIn] = useState(localStorage.getItem('token') !== null);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(null);
  
  // Check URL hash for special routes
  useEffect(() => {
    const checkRoute = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash && isLoggedIn) {
        if (hash.startsWith('invoice/')) {
          const invoiceId = hash.split('/')[1];
          setSelectedInvoiceId(invoiceId);
          setCurrentView('invoice-details');
        } else {
          setCurrentView(hash);
        }
      } else if (!isLoggedIn && hash) {
        setCurrentView(hash);
      }
    };
    
    checkRoute();
    window.addEventListener('hashchange', checkRoute);
    
    return () => window.removeEventListener('hashchange', checkRoute);
  }, [isLoggedIn]);
  
  // Listen for login state changes
  useEffect(() => {
    const checkLoginStatus = () => {
      const loggedIn = localStorage.getItem('token') !== null;
      setIsLoggedIn(loggedIn);
      if (!loggedIn) {
        setCurrentView('login');
      } else if (currentView === 'login') {
        setCurrentView('expenses');
      }
    };
    
    window.addEventListener('storage', checkLoginStatus);
    window.addEventListener('loginStateChanged', checkLoginStatus);
    
    return () => {
      window.removeEventListener('storage', checkLoginStatus);
      window.removeEventListener('loginStateChanged', checkLoginStatus);
    };
  }, [currentView]);
  
  // Auto scroll to top when view changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentView]);
  
  const renderView = () => {
    // Auth pages
    if (currentView === 'login') {
      return <Login setLoggedIn={setIsLoggedIn} setCurrentView={setCurrentView} />;
    }
    if (currentView === 'register') {
      return <Register setCurrentView={setCurrentView} />;
    }
    if (currentView === 'forgot-password') {
      return <ForgotPassword setCurrentView={setCurrentView} />;
    }
    
    // Protected pages
    if (!isLoggedIn) {
      return <Login setLoggedIn={setIsLoggedIn} setCurrentView={setCurrentView} />;
    }
    
    switch(currentView) {
      case 'expenses':
        return <ExpenseList setCurrentView={setCurrentView} setSelectedInvoiceId={setSelectedInvoiceId} />;
      case 'add-expense':
        return <ExpenseForm setCurrentView={setCurrentView} />;
      case 'invoice-details':
        return <InvoiceDetails invoiceId={selectedInvoiceId} setCurrentView={setCurrentView} />;
      case 'archive':
        return <ArchiveList setCurrentView={setCurrentView} />;
      case 'income':
        return <IncomeForm setCurrentView={setCurrentView} />;
      case 'profit-loss':
        return <ProfitLoss />;
      case 'export-report':
        return <ExportReport />;
      case 'user-transactions':
        return <UserTransactions />;
      default:
        return <ExpenseList setCurrentView={setCurrentView} setSelectedInvoiceId={setSelectedInvoiceId} />;
    }
  };
  
  const isAuthPage = ['login', 'register', 'forgot-password'].includes(currentView);
  
  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {isLoggedIn && !isAuthPage && <Header />}
      
      <div className="flex flex-1 overflow-hidden">
        {isLoggedIn && !isAuthPage && <Sidebar currentView={currentView} setCurrentView={setCurrentView} />}
        
        <div className={`flex-1 p-4 overflow-auto ${isLoggedIn && !isAuthPage ? 'ml-16' : ''}`}>
          {renderView()}
        </div>
      </div>
    </div>
  );
}

export default App;
