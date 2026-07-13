'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';

export default function AppLayout({ children }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  // Check auth page status
  const isAuthPage = 
    pathname === '/login' || 
    pathname === '/login/' ||
    pathname === '/register' || 
    pathname === '/register/' ||
    pathname === '/forgot-password' ||
    pathname === '/forgot-password/';

  useEffect(() => {
    // Determine initial login status client-side
    const checkLoginStatus = () => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      setIsLoggedIn(token !== null);
    };

    checkLoginStatus();
    setInitialized(true);

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

  // Authentication redirection check
  useEffect(() => {
    if (!initialized || showSplash) return;

    if (!isLoggedIn && !isAuthPage) {
      router.push('/login');
    } else if (isLoggedIn && isAuthPage) {
      router.push('/');
    }
  }, [isLoggedIn, isAuthPage, initialized, showSplash, router]);

  // Splash Screen JSX
  if (showSplash) {
    return (
      <div className="fixed inset-0 bg-white flex flex-col items-center justify-center z-50 px-4">
        {/* Logo Container */}
        <div className="mb-4 sm:mb-6 md:mb-8 animate-fade-in">
          <img 
            src="/images/LOGO.png" 
            alt="Accounting Logo" 
            className="w-32 h-auto sm:w-40 md:w-48 lg:w-56 xl:w-64 max-w-[80vw] scale-130"
          />
        </div>
        
        {/* App Name */}
        <h1 
          className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl mb-4 text-center font-black tracking-tight" 
          style={{ 
            animation: 'fadeIn 0.8s ease-out forwards',
            background: 'linear-gradient(to right, #f97316, #22c55e)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}
        >
          Accounting
        </h1>

        {/* Beautiful double-ring dynamic loading spinner */}
        <div className="relative w-16 h-16 sm:w-20 sm:h-20 mb-4 mt-2 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-orange-500 border-b-green-500 animate-spin" style={{ animationDuration: '1.2s' }}></div>
          <div className="absolute inset-2 rounded-full border-4 border-transparent border-l-indigo-600 border-r-purple-600 animate-[spin_1.8s_linear_infinite]" style={{ animationDirection: 'reverse' }}></div>
          <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-tr from-orange-500 to-green-500 rounded-full shadow-lg shadow-green-500/20 flex items-center justify-center animate-[pulse_1.5s_ease-in-out_infinite]">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 sm:h-4 sm:w-4 text-white animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
        </div>

        {/* Loading Progress Bar */}
        <div className="w-48 sm:w-64 bg-gray-100 rounded-full h-1.5 overflow-hidden shadow-inner mt-2">
          <div className="bg-gradient-to-r from-orange-500 to-green-500 h-full rounded-full animate-[loadingProgress_2.5s_ease-in-out_forwards]"></div>
        </div>

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
          @keyframes loadingProgress {
            0% { width: 0%; }
            100% { width: 100%; }
          }
          .animate-fade-in {
            animation: fadeIn 0.8s ease-out forwards;
          }
        `}</style>
      </div>
    );
  }

  // If not logged in and not auth page, prevent flash of layout contents before router redirect kicks in
  if (initialized && !isLoggedIn && !isAuthPage) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Only render Header when logged in AND not on auth pages */}
      {isLoggedIn && !isAuthPage && <Header />}
      
      <div className="flex flex-1 overflow-hidden relative">
        {/* Only show sidebar if user is logged in AND not on auth pages */}
        {isLoggedIn && !isAuthPage && <Sidebar />}
        
        <div className={`flex-1 p-4 overflow-auto transition-all duration-300 ${isLoggedIn && !isAuthPage ? 'ml-16' : ''}`}>
          {children}
        </div>
      </div>
    </div>
  );
}
