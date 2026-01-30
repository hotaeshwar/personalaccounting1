import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
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
import PrivateRoute from './components/PrivateRoute';

// Layout component that conditionally renders sidebar based on route
const AppLayout = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(localStorage.getItem('token') !== null);
  const [showSplash, setShowSplash] = useState(true);
  const location = useLocation();
  
  // Check if current route is login, register, or forgot-password
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register' || location.pathname === '/forgot-password';
  
  useEffect(() => {
    const checkLoginStatus = () => {
      setIsLoggedIn(localStorage.getItem('token') !== null);
    };
    
    checkLoginStatus();
    window.addEventListener('storage', checkLoginStatus);
    window.addEventListener('loginStateChanged', checkLoginStatus);
    
    return () => {
      window.removeEventListener('storage', checkLoginStatus);
      window.removeEventListener('loginStateChanged', checkLoginStatus);
    };
  }, []);

  // Handle splash screen timeout
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2500); // Show splash for 2.5 seconds

    return () => clearTimeout(timer);
  }, []);

  // Splash Screen JSX
  if (showSplash) {
    return (
      <div className="fixed inset-0 bg-white flex flex-col items-center justify-center z-50 px-4">
        {/* Logo Container */}
        <div className="mb-4 sm:mb-6 md:mb-8" style={{ animation: 'fadeIn 0.8s ease-out forwards' }}>
          <img 
            src="/images/LOGO.png" 
            alt="Accounting Logo" 
            className="w-32 h-auto sm:w-40 md:w-48 lg:w-56 xl:w-64 max-w-[80vw]"
            style={{ transform: 'scale(1.3)' }}
          />
        </div>
        
        {/* App Name */}
        <h1 
          className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl mb-6 sm:mb-8 text-center" 
          style={{ 
            animation: 'fadeIn 0.8s ease-out forwards',
            background: 'linear-gradient(to right, #f97316, #22c55e)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            fontWeight: '900'
          }}
        >
          <span style={{ fontWeight: '900' }}>Accounting</span>
        </h1>
        
        {/* Dotted Animation */}
        <div className="flex space-x-1.5 sm:space-x-2 md:space-x-3">
          <div 
            className="w-2 h-2 sm:w-3 sm:h-3 md:w-4 md:h-4 bg-orange-500 rounded-full" 
            style={{ animation: 'bounce 1s infinite', animationDelay: '0s' }}
          ></div>
          <div 
            className="w-2 h-2 sm:w-3 sm:h-3 md:w-4 md:h-4 rounded-full" 
            style={{ 
              animation: 'bounce 1s infinite', 
              animationDelay: '0.1s',
              background: 'linear-gradient(to right, #f97316, #22c55e)'
            }}
          ></div>
          <div 
            className="w-2 h-2 sm:w-3 sm:h-3 md:w-4 md:h-4 bg-green-500 rounded-full" 
            style={{ animation: 'bounce 1s infinite', animationDelay: '0.2s' }}
          ></div>
        </div>

        {/* Inline styles for animations */}
        <style>{`
          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: translateY(-20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          @keyframes bounce {
            0%, 100% {
              transform: translateY(0);
            }
            50% {
              transform: translateY(-10px);
            }
          }
        `}</style>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Only render Header when logged in AND not on auth pages */}
      {isLoggedIn && !isAuthPage && <Header />}
      
      <div className="flex flex-1 overflow-hidden">
        {/* Only show sidebar if user is logged in AND not on auth pages */}
        {isLoggedIn && !isAuthPage && <Sidebar />}
        
        <div className={`flex-1 p-4 overflow-auto ${isLoggedIn && !isAuthPage ? 'ml-16' : ''}`}>
          <Routes>
            <Route path="/login" element={<Login setLoggedIn={setIsLoggedIn} />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/" element={<PrivateRoute><ExpenseList /></PrivateRoute>} />
            <Route path="/expenses" element={<PrivateRoute><ExpenseList /></PrivateRoute>} />
            <Route path="/add-expense" element={<PrivateRoute><ExpenseForm /></PrivateRoute>} />
            <Route path="/invoice/:invoice_id" element={<PrivateRoute><InvoiceDetails /></PrivateRoute>} />
            <Route path="/archive" element={<PrivateRoute><ArchiveList /></PrivateRoute>} />
            <Route path="/income" element={<PrivateRoute><IncomeForm /></PrivateRoute>} />
            <Route path="/profit-loss" element={<PrivateRoute><ProfitLoss /></PrivateRoute>} />
            <Route path="/export-report" element={<PrivateRoute><ExportReport /></PrivateRoute>} />
            <Route path="/user-transactions" element={<PrivateRoute><UserTransactions /></PrivateRoute>} />
          </Routes>
        </div>
      </div>
    </div>
  );
};

const App = () => {
  return (
    <Router>
      <AppLayout />
    </Router>
  );
};

export default App;