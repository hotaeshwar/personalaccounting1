import React, { useEffect, useState, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faHome, 
    faList, 
    faPlus, 
    faFileInvoice, 
    faArchive, 
    faMoneyBill, 
    faChartLine, 
    faSignOutAlt,
    faFileExport,
    faBars,
    faUsers,
    faHandHoldingUsd
} from '@fortawesome/free-solid-svg-icons';
import { auth, db } from '../config/firebase';
import { signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

const Sidebar = () => {
    const navigate = useNavigate();
    const [userRole, setUserRole] = useState(null);
    const [userName, setUserName] = useState('');
    const [expanded, setExpanded] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const sidebarRef = useRef(null);
    
    useEffect(() => {
        // Check user role from Firebase Auth and Firestore
        const checkUserRole = async () => {
            const currentUser = auth.currentUser;
            if (currentUser) {
                try {
                    // Get user data from Firestore
                    const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
                    if (userDoc.exists()) {
                        const userData = userDoc.data();
                        setUserRole(userData.role);
                        setUserName(userData.username || 'User');
                    }
                } catch (error) {
                    console.error("Error fetching user data:", error);
                }
            }
        };

        checkUserRole();

        // Listen for auth state changes
        const unsubscribe = auth.onAuthStateChanged((user) => {
            if (user) {
                checkUserRole();
            } else {
                setUserRole(null);
                setUserName('');
            }
        });

        // Check if device is mobile
        const checkIfMobile = () => {
            setIsMobile(window.innerWidth < 768);
            // Auto-close sidebar on mobile by default
            if (window.innerWidth < 768) {
                setExpanded(false);
            }
        };

        checkIfMobile();
        window.addEventListener('resize', checkIfMobile);
        
        return () => {
            unsubscribe();
            window.removeEventListener('resize', checkIfMobile);
        };
    }, []);

    const handleLogout = async () => {
        try {
            await signOut(auth);
            // Clear localStorage
            localStorage.removeItem('token');
            localStorage.removeItem('userRole');
            localStorage.removeItem('userId');
            localStorage.removeItem('username');
            
            // Notify the app about logout state change
            window.dispatchEvent(new Event('loginStateChanged'));
            
            navigate('/login');
        } catch (error) {
            console.error('Logout error:', error);
            // Fallback: clear localStorage and redirect anyway
            localStorage.clear();
            navigate('/login');
        }
    };

    const toggleSidebar = () => {
        setExpanded(!expanded);
    };

    const handleMouseEnter = () => {
        if (!isMobile) {
            setExpanded(true);
        }
    };

    const handleMouseLeave = () => {
        if (!isMobile) {
            setExpanded(false);
        }
    };

    const handleLoanAppNavigation = () => {
        window.open('https://loan.accountsonline.info/', '_blank');
    };

    // Close sidebar when clicking outside on mobile
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (isMobile && expanded && sidebarRef.current && !sidebarRef.current.contains(event.target)) {
                setExpanded(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isMobile, expanded]);

    return (
        <>
            {/* Mobile overlay */}
            {isMobile && expanded && (
                <div 
                    className="fixed inset-0 bg-black bg-opacity-50 z-40"
                    onClick={() => setExpanded(false)}
                />
            )}
            
            <div 
                ref={sidebarRef}
                className={`bg-gradient-to-b from-gray-800 to-gray-900 text-white fixed top-0 left-0 h-screen z-50 shadow-lg transition-all duration-300 ease-in-out ${
                    expanded ? 'w-64' : 'w-16'
                } ${isMobile && !expanded ? 'translate-x-0' : ''} ${
                    isMobile && expanded ? 'translate-x-0 w-64' : ''
                } ${isMobile ? 'transform transition-transform' : ''}`}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
            >
                <div className="sticky top-0">
                    {/* Header with user info */}
                    <div className="flex items-center justify-between p-4 border-b border-gray-700">
                        <div className={`flex items-center space-x-3 transition-opacity duration-300 ${expanded ? 'opacity-100' : 'opacity-0 hidden'}`}>
                            <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-sm font-bold">
                                {userName ? userName.charAt(0).toUpperCase() : 'U'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h1 className="text-lg font-bold truncate">Expense Tracker</h1>
                                <p className="text-xs text-gray-300 truncate">
                                    {userName} {userRole && `(${userRole})`}
                                </p>
                            </div>
                        </div>
                        
                        {!expanded && (
                            <div className="flex flex-col items-center">
                                <div className="w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center text-xs font-bold mb-1">
                                    {userName ? userName.charAt(0).toUpperCase() : 'U'}
                                </div>
                            </div>
                        )}
                        
                        {isMobile && (
                            <button 
                                onClick={toggleSidebar} 
                                className="p-1 rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-600 transition-all duration-300"
                            >
                                <FontAwesomeIcon icon={faBars} className="text-gray-300 hover:text-white" />
                            </button>
                        )}
                    </div>

                    <nav className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 80px)' }}>
                        <ul>
                            <li className="transition-all duration-300 hover:bg-gray-700 hover:border-l-4 border-indigo-500 group">
                                <NavLink 
                                    to="/" 
                                    className={({ isActive }) => 
                                        `flex items-center p-3 pl-4 ${isActive ? 'bg-gray-700 border-l-4 border-indigo-500 font-semibold' : ''}`
                                    }
                                    onClick={() => isMobile && setExpanded(false)}
                                >
                                    <FontAwesomeIcon 
                                        icon={faHome} 
                                        className={`transition-all duration-300 ${expanded ? 'mr-3' : 'mx-auto text-lg'} group-hover:scale-110`} 
                                    />
                                    <span className={`whitespace-nowrap transition-opacity duration-300 ${expanded ? 'opacity-100' : 'opacity-0 hidden'}`}>
                                        Dashboard
                                    </span>
                                </NavLink>
                            </li>
                            
                            <li className="transition-all duration-300 hover:bg-gray-700 hover:border-l-4 border-indigo-500 group">
                                <NavLink 
                                    to="/expenses" 
                                    className={({ isActive }) => 
                                        `flex items-center p-3 pl-4 ${isActive ? 'bg-gray-700 border-l-4 border-indigo-500 font-semibold' : ''}`
                                    }
                                    onClick={() => isMobile && setExpanded(false)}
                                >
                                    <FontAwesomeIcon 
                                        icon={faList} 
                                        className={`transition-all duration-300 ${expanded ? 'mr-3' : 'mx-auto text-lg'} group-hover:scale-110`} 
                                    />
                                    <span className={`whitespace-nowrap transition-opacity duration-300 ${expanded ? 'opacity-100' : 'opacity-0 hidden'}`}>
                                        Expenses
                                    </span>
                                </NavLink>
                            </li>
                            
                            <li className="transition-all duration-300 hover:bg-gray-700 hover:border-l-4 border-indigo-500 group">
                                <NavLink 
                                    to="/add-expense" 
                                    className={({ isActive }) => 
                                        `flex items-center p-3 pl-4 ${isActive ? 'bg-gray-700 border-l-4 border-indigo-500 font-semibold' : ''}`
                                    }
                                    onClick={() => isMobile && setExpanded(false)}
                                >
                                    <FontAwesomeIcon 
                                        icon={faPlus} 
                                        className={`transition-all duration-300 ${expanded ? 'mr-3' : 'mx-auto text-lg'} group-hover:scale-110`} 
                                    />
                                    <span className={`whitespace-nowrap transition-opacity duration-300 ${expanded ? 'opacity-100' : 'opacity-0 hidden'}`}>
                                        Add Expense
                                    </span>
                                </NavLink>
                            </li>
                            
                            <li className="transition-all duration-300 hover:bg-gray-700 hover:border-l-4 border-indigo-500 group">
                                <NavLink 
                                    to="/archive" 
                                    className={({ isActive }) => 
                                        `flex items-center p-3 pl-4 ${isActive ? 'bg-gray-700 border-l-4 border-indigo-500 font-semibold' : ''}`
                                    }
                                    onClick={() => isMobile && setExpanded(false)}
                                >
                                    <FontAwesomeIcon 
                                        icon={faArchive} 
                                        className={`transition-all duration-300 ${expanded ? 'mr-3' : 'mx-auto text-lg'} group-hover:scale-110`} 
                                    />
                                    <span className={`whitespace-nowrap transition-opacity duration-300 ${expanded ? 'opacity-100' : 'opacity-0 hidden'}`}>
                                        Archive
                                    </span>
                                </NavLink>
                            </li>
                            
                            {/* Add Income - Visible to both users and admins */}
                            <li className="transition-all duration-300 hover:bg-gray-700 hover:border-l-4 border-indigo-500 group">
                                <NavLink 
                                    to="/income" 
                                    className={({ isActive }) => 
                                        `flex items-center p-3 pl-4 ${isActive ? 'bg-gray-700 border-l-4 border-indigo-500 font-semibold' : ''}`
                                    }
                                    onClick={() => isMobile && setExpanded(false)}
                                >
                                    <FontAwesomeIcon 
                                        icon={faMoneyBill} 
                                        className={`transition-all duration-300 ${expanded ? 'mr-3' : 'mx-auto text-lg'} group-hover:scale-110`} 
                                    />
                                    <span className={`whitespace-nowrap transition-opacity duration-300 ${expanded ? 'opacity-100' : 'opacity-0 hidden'}`}>
                                        Add Income
                                    </span>
                                </NavLink>
                            </li>
                            
                            <li className="transition-all duration-300 hover:bg-gray-700 hover:border-l-4 border-indigo-500 group">
                                <NavLink 
                                    to="/profit-loss" 
                                    className={({ isActive }) => 
                                        `flex items-center p-3 pl-4 ${isActive ? 'bg-gray-700 border-l-4 border-indigo-500 font-semibold' : ''}`
                                    }
                                    onClick={() => isMobile && setExpanded(false)}
                                >
                                    <FontAwesomeIcon 
                                        icon={faChartLine} 
                                        className={`transition-all duration-300 ${expanded ? 'mr-3' : 'mx-auto text-lg'} group-hover:scale-110`} 
                                    />
                                    <span className={`whitespace-nowrap transition-opacity duration-300 ${expanded ? 'opacity-100' : 'opacity-0 hidden'}`}>
                                        Profit/Loss
                                    </span>
                                </NavLink>
                            </li>

                            {/* Admin Only Sections */}
                            {userRole === 'admin' && (
                                <>
                                    {/* Loan App Navigation */}
                                    <li className="transition-all duration-300 hover:bg-gray-700 hover:border-l-4 border-green-500 group">
                                        <button 
                                            onClick={() => {
                                                handleLoanAppNavigation();
                                                if (isMobile) setExpanded(false);
                                            }}
                                            className="flex items-center p-3 pl-4 w-full text-left"
                                        >
                                            <FontAwesomeIcon 
                                                icon={faHandHoldingUsd} 
                                                className={`transition-all duration-300 ${expanded ? 'mr-3' : 'mx-auto text-lg'} group-hover:scale-110 text-green-400 group-hover:text-green-300`} 
                                            />
                                            <span className={`whitespace-nowrap transition-opacity duration-300 ${expanded ? 'opacity-100' : 'opacity-0 hidden'} text-green-400 group-hover:text-green-300`}>
                                                Loan App
                                            </span>
                                        </button>
                                    </li>
                                    
                                    {/* User Transactions */}
                                    <li className="transition-all duration-300 hover:bg-gray-700 hover:border-l-4 border-indigo-500 group">
                                        <NavLink 
                                            to="/user-transactions" 
                                            className={({ isActive }) => 
                                                `flex items-center p-3 pl-4 ${isActive ? 'bg-gray-700 border-l-4 border-indigo-500 font-semibold' : ''}`
                                            }
                                            onClick={() => isMobile && setExpanded(false)}
                                        >
                                            <FontAwesomeIcon 
                                                icon={faUsers} 
                                                className={`transition-all duration-300 ${expanded ? 'mr-3' : 'mx-auto text-lg'} group-hover:scale-110`} 
                                            />
                                            <span className={`whitespace-nowrap transition-opacity duration-300 ${expanded ? 'opacity-100' : 'opacity-0 hidden'}`}>
                                                User Transactions
                                            </span>
                                        </NavLink>
                                    </li>
                                    
                                    {/* Export Report */}
                                    <li className="transition-all duration-300 hover:bg-gray-700 hover:border-l-4 border-indigo-500 group">
                                        <NavLink 
                                            to="/export-report" 
                                            className={({ isActive }) => 
                                                `flex items-center p-3 pl-4 ${isActive ? 'bg-gray-700 border-l-4 border-indigo-500 font-semibold' : ''}`
                                            }
                                            onClick={() => isMobile && setExpanded(false)}
                                        >
                                            <FontAwesomeIcon 
                                                icon={faFileExport} 
                                                className={`transition-all duration-300 ${expanded ? 'mr-3' : 'mx-auto text-lg'} group-hover:scale-110`} 
                                            />
                                            <span className={`whitespace-nowrap transition-opacity duration-300 ${expanded ? 'opacity-100' : 'opacity-0 hidden'}`}>
                                                Export Report
                                            </span>
                                        </NavLink>
                                    </li>
                                </>
                            )}
                            
                            {/* Logout Button */}
                            <li className="transition-all duration-300 hover:bg-gray-700 hover:border-l-4 border-red-500 group mt-6">
                                <button 
                                    onClick={() => {
                                        handleLogout();
                                        if (isMobile) setExpanded(false);
                                    }}
                                    className="flex items-center p-3 pl-4 w-full text-left"
                                >
                                    <FontAwesomeIcon 
                                        icon={faSignOutAlt} 
                                        className={`transition-all duration-300 ${expanded ? 'mr-3' : 'mx-auto text-lg'} group-hover:scale-110 text-red-400 group-hover:text-red-300`} 
                                    />
                                    <span className={`whitespace-nowrap transition-opacity duration-300 ${expanded ? 'opacity-100' : 'opacity-0 hidden'} text-red-400 group-hover:text-red-300`}>
                                        Logout
                                    </span>
                                </button>
                            </li>
                        </ul>
                    </nav>
                </div>
            </div>
        </>
    );
};

export default Sidebar;