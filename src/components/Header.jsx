import React, { useState, useEffect } from 'react';
import { auth, db } from '../config/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

const Header = () => {
    const [username, setUsername] = useState('');
    const [userRole, setUserRole] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                try {
                    // Get user data from Firestore
                    const userDoc = await getDoc(doc(db, 'users', user.uid));
                    
                    if (userDoc.exists()) {
                        const userData = userDoc.data();
                        setUsername(userData.username || 'User');
                        setUserRole(userData.role || 'user');
                        
                        // Also store in localStorage for quick access
                        localStorage.setItem('username', userData.username);
                        localStorage.setItem('userRole', userData.role);
                    } else {
                        // Fallback to localStorage if Firestore data not available
                        const storedUsername = localStorage.getItem('username');
                        const storedUserRole = localStorage.getItem('userRole');
                        
                        if (storedUsername) setUsername(storedUsername);
                        if (storedUserRole) setUserRole(storedUserRole);
                    }
                } catch (error) {
                    console.error("Error fetching user data:", error);
                    // Fallback to localStorage on error
                    const storedUsername = localStorage.getItem('username');
                    const storedUserRole = localStorage.getItem('userRole');
                    
                    if (storedUsername) setUsername(storedUsername);
                    if (storedUserRole) setUserRole(storedUserRole);
                }
            } else {
                // User is signed out
                setUsername('');
                setUserRole('');
                localStorage.removeItem('username');
                localStorage.removeItem('userRole');
            }
            setIsLoading(false);
        });

        // Cleanup subscription
        return () => unsubscribe();
    }, []);

    // Extract initials from username
    const getInitials = () => {
        if (!username) return 'U';
        
        // Split the username by spaces or special characters
        const nameParts = username.split(/[\s._-]+/);
        
        // If single name, return first letter
        if (nameParts.length === 1) {
            return nameParts[0].charAt(0).toUpperCase();
        }
        
        // Get first letter of first name and first letter of last name
        const firstInitial = nameParts[0].charAt(0).toUpperCase();
        const lastInitial = nameParts[nameParts.length - 1].charAt(0).toUpperCase();
        
        return `${firstInitial}${lastInitial}`;
    };

    // Get background color based on user role
    const getAvatarColor = () => {
        switch (userRole) {
            case 'admin':
                return 'bg-red-600';
            case 'guest':
                return 'bg-green-600';
            default:
                return 'bg-blue-600';
        }
    };

    // Get status dot color based on user role
    const getStatusDotColor = () => {
        switch (userRole) {
            case 'admin':
                return 'bg-red-400';
            case 'guest':
                return 'bg-green-400';
            default:
                return 'bg-blue-400';
        }
    };

    if (isLoading) {
        return (
            <header className="bg-white shadow-md py-2 px-3 sm:px-4 flex justify-between items-center sticky top-0 z-10 border-b border-gray-200 h-14">
                <div className="flex items-center ml-16 sm:ml-20">
                    <span className="hidden sm:inline-block w-5 h-5 bg-blue-600 rounded-full"></span>
                    <span className="text-lg sm:text-xl font-bold tracking-tight ml-2">
                        <span className="text-orange-500">BiD</span>
                        <span className="text-blue-800 mx-1">•</span>
                        <span className="text-green-600">ACCOUNTING</span>
                    </span>
                </div>
                
                <div className="flex items-center space-x-2 bg-gray-50 p-1 sm:p-2 rounded border border-gray-200">
                    <div className="w-8 h-8 rounded-md bg-gray-300 animate-pulse"></div>
                    <div className="hidden sm:block">
                        <div className="h-3 w-20 bg-gray-300 rounded animate-pulse mb-1"></div>
                        <div className="h-2 w-16 bg-gray-300 rounded animate-pulse"></div>
                    </div>
                </div>
            </header>
        );
    }

    return (
        <header className="bg-white shadow-md py-2 px-3 sm:px-4 flex justify-between items-center sticky top-0 z-10 border-b border-gray-200 h-14">
            <div className="flex items-center ml-16 sm:ml-20">
                <span className="hidden sm:inline-block w-5 h-5 bg-blue-600 rounded-full"></span>
                <span className="text-lg sm:text-xl font-bold tracking-tight ml-2">
                    <span className="text-orange-500 hover:scale-110 transition-transform duration-300 inline-block">BiD</span>
                    <span className="text-blue-800 mx-1 animate-pulse">•</span>
                    <span className="text-green-600 relative group">
                        <span className="inline-block group-hover:-translate-y-1 transition-transform duration-200">A</span>
                        <span className="inline-block group-hover:-translate-y-1 transition-transform duration-200 delay-75">C</span>
                        <span className="inline-block group-hover:-translate-y-1 transition-transform duration-200 delay-100">C</span>
                        <span className="inline-block group-hover:-translate-y-1 transition-transform duration-200 delay-150">O</span>
                        <span className="inline-block group-hover:-translate-y-1 transition-transform duration-200 delay-200">U</span>
                        <span className="inline-block group-hover:-translate-y-1 transition-transform duration-200 delay-250">N</span>
                        <span className="inline-block group-hover:-translate-y-1 transition-transform duration-200 delay-300">T</span>
                        <span className="inline-block group-hover:-translate-y-1 transition-transform duration-200 delay-350">I</span>
                        <span className="inline-block group-hover:-translate-y-1 transition-transform duration-200 delay-400">N</span>
                        <span className="inline-block group-hover:-translate-y-1 transition-transform duration-200 delay-450">G</span>
                    </span>
                </span>
            </div>
            
            {username && (
                <div className="flex items-center space-x-2 bg-gray-50 p-1 sm:p-2 rounded border border-gray-200 hover:shadow-sm transition-shadow group cursor-pointer">
                    <div className="relative">
                        <div className={`w-8 h-8 rounded-md ${getAvatarColor()} flex items-center justify-center text-white font-medium group-hover:scale-110 transition-transform duration-200`}>
                            <span className="text-sm">{getInitials()}</span>
                        </div>
                        <span className={`absolute -top-1 -right-1 w-2 h-2 ${getStatusDotColor()} rounded-full border border-white group-hover:scale-125 transition-transform duration-200`}></span>
                    </div>
                    <div className="text-left hidden sm:block">
                        <p className="font-medium text-gray-800 text-sm group-hover:text-gray-900 transition-colors duration-200">
                            {username}
                        </p>
                        <p className="text-xs text-gray-600 capitalize group-hover:text-gray-700 transition-colors duration-200">
                            {userRole || 'user'}
                        </p>
                    </div>
                </div>
            )}
            
            {!username && !isLoading && (
                <div className="text-sm text-gray-500 italic">
                    Not signed in
                </div>
            )}
        </header>
    );
};

export default Header;