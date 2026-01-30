import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUsers, faMoneyBillWave, faFileInvoice, faArrowLeft, faSearch } from '@fortawesome/free-solid-svg-icons';
import { collection, query, where, getDocs, doc, getDoc, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';

const UserTransactions = () => {
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [userExpenses, setUserExpenses] = useState([]);
    const [userIncome, setUserIncome] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('expenses');

    useEffect(() => {
        fetchUsersWithStats();
    }, []);

    const fetchUsersWithStats = async () => {
        setIsLoading(true);
        setError('');
        
        try {
            // Get all guest users
            const usersQuery = query(
                collection(db, 'users'),
                where('role', '==', 'guest')
            );
            
            const usersSnapshot = await getDocs(usersQuery);
            const usersData = [];

            // Get stats for each user
            for (const userDoc of usersSnapshot.docs) {
                const userData = userDoc.data();
                const userId = userDoc.id;

                // Get user's expenses
                const expensesQuery = query(
                    collection(db, 'expenses'),
                    where('userId', '==', userId),
                    orderBy('date', 'desc')
                );
                
                // Get user's income
                const incomeQuery = query(
                    collection(db, 'income'),
                    where('userId', '==', userId),
                    orderBy('date', 'desc')
                );

                const [expensesSnapshot, incomeSnapshot] = await Promise.all([
                    getDocs(expensesQuery),
                    getDocs(incomeQuery)
                ]);

                const expenses = expensesSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));

                const income = incomeSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));

                // Calculate totals
                const totalExpenses = expenses.reduce((sum, expense) => sum + parseFloat(expense.amount || 0), 0);
                const totalIncome = income.reduce((sum, inc) => sum + parseFloat(inc.amount || 0), 0);

                usersData.push({
                    id: userId,
                    username: userData.username,
                    role: userData.role,
                    expense_count: expenses.length,
                    income_count: income.length,
                    total_expenses: totalExpenses,
                    total_income: totalIncome,
                    createdAt: userData.createdAt
                });
            }

            if (usersData.length === 0) {
                setError('No guest users found with transactions');
            }
            
            setUsers(usersData);
        } catch (err) {
            console.error('Firestore error:', err);
            setError('Failed to fetch user data. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchUserTransactions = async (userId) => {
        setIsLoading(true);
        setError('');

        try {
            // Get user's expenses
            const expensesQuery = query(
                collection(db, 'expenses'),
                where('userId', '==', userId),
                orderBy('date', 'desc')
            );
            
            // Get user's income
            const incomeQuery = query(
                collection(db, 'income'),
                where('userId', '==', userId),
                orderBy('date', 'desc')
            );

            const [expensesSnapshot, incomeSnapshot] = await Promise.all([
                getDocs(expensesQuery),
                getDocs(incomeQuery)
            ]);

            const expenses = expensesSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            const income = incomeSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            setUserExpenses(expenses);
            setUserIncome(income);
        } catch (err) {
            console.error('Firestore error:', err);
            setError('Failed to fetch user transactions. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleUserSelect = (user) => {
        setSelectedUser(user);
        setActiveTab('expenses');
        fetchUserTransactions(user.id);
    };

    const handleBackToUsers = () => {
        setSelectedUser(null);
        setUserExpenses([]);
        setUserIncome([]);
        setActiveTab('expenses');
        setError('');
    };

    const formatDate = (timestamp) => {
        if (!timestamp) return 'No date';
        
        try {
            // Handle both Firestore Timestamp and string dates
            const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
            return date.toLocaleDateString('en-IN', { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (err) {
            console.error('Date formatting error:', err);
            return 'Invalid date';
        }
    };

    const formatCurrency = (amount) => {
        const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
        return `₹${numAmount.toFixed(2)}`;
    };

    const filteredUsers = users.filter(user =>
        user.username.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (isLoading && users.length === 0) {
        return (
            <div className="w-full max-w-7xl mx-auto px-4 py-8 bg-gray-50 min-h-screen">
                <div className="flex flex-col justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600 mb-4"></div>
                    <p className="text-blue-600 text-lg font-medium">Loading users...</p>
                </div>
            </div>
        );
    }

    if (error && users.length === 0) {
        return (
            <div className="w-full max-w-7xl mx-auto px-4 py-8 bg-gray-50 min-h-screen">
                <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-lg shadow">
                    <div className="flex items-center">
                        <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <p className="text-red-700 font-medium">{error}</p>
                            <button 
                                onClick={fetchUsersWithStats}
                                className="mt-2 text-sm bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
                            >
                                Retry
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8 bg-gray-50 min-h-screen">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-700 rounded-lg shadow-lg p-4 sm:p-6 mb-6 md:mb-8">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                    <div className="flex items-center">
                        {selectedUser && (
                            <button
                                onClick={handleBackToUsers}
                                className="bg-white hover:bg-purple-50 text-purple-700 font-medium py-2 px-3 sm:px-4 rounded-lg transition-all duration-300 ease-in-out mr-3 sm:mr-4 flex items-center text-sm"
                            >
                                <FontAwesomeIcon icon={faArrowLeft} className="mr-2" />
                                Back
                            </button>
                        )}
                        <div>
                            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-2">
                                {selectedUser ? `${selectedUser.username}'s Transactions` : 'Guest Users Transactions'}
                            </h2>
                            <p className="text-purple-100 text-sm">
                                {selectedUser 
                                    ? 'Viewing guest user transactions' 
                                    : 'Manage and view all guest user transactions'
                                }
                            </p>
                        </div>
                    </div>
                    <div className="mt-3 sm:mt-0">
                        <div className={`bg-white bg-opacity-20 rounded-lg p-2 sm:p-3 ${selectedUser ? 'hidden sm:block' : ''}`}>
                            <div className="flex items-center text-white text-sm">
                                <FontAwesomeIcon icon={faUsers} className="mr-2" />
                                <span>{users.length} Guest Users</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-lg shadow">
                    <div className="flex items-center">
                        <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <p className="text-red-700 text-sm font-medium">{error}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* User List View */}
            {!selectedUser && (
                <div className="bg-white shadow-xl rounded-lg overflow-hidden border border-gray-100">
                    <div className="p-4 border-b border-gray-200 bg-gray-50">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                            <h3 className="text-lg font-semibold text-gray-800">Guest Users</h3>
                            <div className="relative w-full sm:w-64">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <FontAwesomeIcon icon={faSearch} className="text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Search guest users..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="divide-y divide-gray-200">
                        {filteredUsers.length === 0 ? (
                            <div className="p-8 text-center">
                                <FontAwesomeIcon icon={faUsers} className="text-gray-400 text-4xl mb-4" />
                                <p className="text-gray-500">No guest users found with transactions</p>
                                <p className="text-gray-400 text-sm mt-2">Guest users will appear here once they create expenses or income entries</p>
                            </div>
                        ) : (
                            filteredUsers.map((user) => (
                                <div 
                                    key={user.id} 
                                    className="p-4 hover:bg-purple-50 transition duration-200 cursor-pointer"
                                    onClick={() => handleUserSelect(user)}
                                >
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center space-x-4">
                                            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-100 text-blue-600">
                                                <FontAwesomeIcon icon={faUsers} />
                                            </div>
                                            <div>
                                                <h4 className="font-semibold text-gray-800">{user.username}</h4>
                                                <span className="inline-block px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                                                    Guest User
                                                </span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="grid grid-cols-2 gap-4 text-sm">
                                                <div className="text-center">
                                                    <div className="font-semibold text-green-600">{user.income_count}</div>
                                                    <div className="text-gray-500 text-xs">Income</div>
                                                </div>
                                                <div className="text-center">
                                                    <div className="font-semibold text-red-600">{user.expense_count}</div>
                                                    <div className="text-gray-500 text-xs">Expenses</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
                                        <div className="text-center bg-green-50 p-2 rounded-lg">
                                            <div className="font-semibold text-green-700">{formatCurrency(user.total_income)}</div>
                                            <div className="text-green-600 text-xs">Total Income</div>
                                        </div>
                                        <div className="text-center bg-red-50 p-2 rounded-lg">
                                            <div className="font-semibold text-red-700">{formatCurrency(user.total_expenses)}</div>
                                            <div className="text-red-600 text-xs">Total Expenses</div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* User Transactions View */}
            {selectedUser && (
                <div className="space-y-6">
                    {/* User Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                        <div className="bg-white rounded-lg shadow-md p-4 border border-gray-100">
                            <div className="flex items-center">
                                <div className="bg-green-100 p-3 rounded-full">
                                    <FontAwesomeIcon icon={faMoneyBillWave} className="h-6 w-6 text-green-600" />
                                </div>
                                <div className="ml-4">
                                    <p className="text-gray-500 text-sm font-medium">Total Income</p>
                                    <p className="text-xl font-bold text-green-600">
                                        {formatCurrency(selectedUser.total_income)}
                                    </p>
                                </div>
                            </div>
                        </div>
                        
                        <div className="bg-white rounded-lg shadow-md p-4 border border-gray-100">
                            <div className="flex items-center">
                                <div className="bg-red-100 p-3 rounded-full">
                                    <FontAwesomeIcon icon={faFileInvoice} className="h-6 w-6 text-red-600" />
                                </div>
                                <div className="ml-4">
                                    <p className="text-gray-500 text-sm font-medium">Total Expenses</p>
                                    <p className="text-xl font-bold text-red-600">
                                        {formatCurrency(selectedUser.total_expenses)}
                                    </p>
                                </div>
                            </div>
                        </div>
                        
                        <div className="bg-white rounded-lg shadow-md p-4 border border-gray-100">
                            <div className="flex items-center">
                                <div className={`p-3 rounded-full ${
                                    (selectedUser.total_income - selectedUser.total_expenses) >= 0 
                                        ? 'bg-blue-100' 
                                        : 'bg-orange-100'
                                }`}>
                                    <FontAwesomeIcon 
                                        icon={faMoneyBillWave} 
                                        className={`h-6 w-6 ${
                                            (selectedUser.total_income - selectedUser.total_expenses) >= 0 
                                                ? 'text-blue-600' 
                                                : 'text-orange-600'
                                        }`} 
                                    />
                                </div>
                                <div className="ml-4">
                                    <p className="text-gray-500 text-sm font-medium">Net Balance</p>
                                    <p className={`text-xl font-bold ${
                                        (selectedUser.total_income - selectedUser.total_expenses) >= 0 
                                            ? 'text-blue-600' 
                                            : 'text-orange-600'
                                    }`}>
                                        {formatCurrency(selectedUser.total_income - selectedUser.total_expenses)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Transactions Tabs */}
                    <div className="bg-white shadow-xl rounded-lg overflow-hidden border border-gray-100">
                        <div className="border-b border-gray-200">
                            <div className="grid grid-cols-2">
                                <button
                                    className={`py-4 font-medium text-sm ${
                                        activeTab === 'expenses' 
                                            ? 'bg-purple-600 text-white' 
                                            : 'bg-white text-gray-700 hover:bg-gray-50'
                                    } transition-colors duration-200`}
                                    onClick={() => setActiveTab('expenses')}
                                >
                                    <FontAwesomeIcon icon={faFileInvoice} className="mr-2" />
                                    Expenses ({userExpenses.length})
                                </button>
                                <button
                                    className={`py-4 font-medium text-sm ${
                                        activeTab === 'income' 
                                            ? 'bg-green-600 text-white' 
                                            : 'bg-white text-gray-700 hover:bg-gray-50'
                                    } transition-colors duration-200`}
                                    onClick={() => setActiveTab('income')}
                                >
                                    <FontAwesomeIcon icon={faMoneyBillWave} className="mr-2" />
                                    Income ({userIncome.length})
                                </button>
                            </div>
                        </div>

                        {/* Expenses Tab Content */}
                        {activeTab === 'expenses' && (
                            <div className="divide-y divide-gray-200">
                                {isLoading ? (
                                    <div className="p-8 text-center">
                                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-600 mx-auto mb-4"></div>
                                        <p className="text-gray-500">Loading expenses...</p>
                                    </div>
                                ) : userExpenses.length === 0 ? (
                                    <div className="p-8 text-center">
                                        <FontAwesomeIcon icon={faFileInvoice} className="text-gray-400 text-4xl mb-4" />
                                        <p className="text-gray-500">No expenses found for this user</p>
                                    </div>
                                ) : (
                                    userExpenses.map((expense) => (
                                        <div key={expense.id} className="p-4 hover:bg-gray-50 transition duration-200">
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1">
                                                    <div className="flex items-center space-x-3 mb-2">
                                                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-indigo-100 text-indigo-800">
                                                            {expense.category || 'Uncategorized'}
                                                        </span>
                                                        <span className="text-sm font-semibold text-red-600">
                                                            {formatCurrency(expense.amount)}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-gray-600 mb-2">
                                                        {expense.description || 'No description provided'}
                                                    </p>
                                                    <p className="text-xs text-gray-500">
                                                        {formatDate(expense.date)}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {/* Income Tab Content */}
                        {activeTab === 'income' && (
                            <div className="divide-y divide-gray-200">
                                {isLoading ? (
                                    <div className="p-8 text-center">
                                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-600 mx-auto mb-4"></div>
                                        <p className="text-gray-500">Loading income...</p>
                                    </div>
                                ) : userIncome.length === 0 ? (
                                    <div className="p-8 text-center">
                                        <FontAwesomeIcon icon={faMoneyBillWave} className="text-gray-400 text-4xl mb-4" />
                                        <p className="text-gray-500">No income entries found for this user</p>
                                    </div>
                                ) : (
                                    userIncome.map((income) => (
                                        <div key={income.id} className="p-4 hover:bg-gray-50 transition duration-200">
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1">
                                                    <div className="flex items-center space-x-3 mb-2">
                                                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                                                            Income
                                                        </span>
                                                        <span className="text-sm font-semibold text-green-600">
                                                            {formatCurrency(income.amount)}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-gray-600 mb-2">
                                                        {income.description || 'No description provided'}
                                                    </p>
                                                    <p className="text-xs text-gray-500">
                                                        {formatDate(income.date)}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserTransactions;