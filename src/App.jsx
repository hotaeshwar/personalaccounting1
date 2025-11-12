import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
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
