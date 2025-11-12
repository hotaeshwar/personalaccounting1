import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faFilter, faPlus, faFileInvoice, faTimes, faChartLine, faSort, faMoneyBillWave, faUserShield } from '@fortawesome/free-solid-svg-icons';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import { useNavigate } from 'react-router-dom';

const ExpenseList = () => {
  const [expenses, setExpenses] = useState([]);
  const [income, setIncome] = useState([]);
  const [filteredExpenses, setFilteredExpenses] = useState([]);
  const [filteredIncome, setFilteredIncome] = useState([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [sortField, setSortField] = useState('date');
  const [sortDirection, setSortDirection] = useState('desc');
  const [activeTab, setActiveTab] = useState('expenses');
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    category: '',
    createdBy: '',
    amountMin: '',
    amountMax: '',
  });
  
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState(localStorage.getItem('userRole') || 'user');
  const [isAdmin, setIsAdmin] = useState(userRole === 'admin');

  const getUniqueCategories = () => {
    const categories = new Set();
    expenses.forEach(expense => {
      if (expense.category) {
        categories.add(expense.category);
      }
    });
    return Array.from(categories).sort();
  };

  const formatNumber = (num) => {
    const absNum = Math.abs(num);
    if (absNum >= 10000000) {
      return '₹' + (num / 10000000).toFixed(1) + 'Cr';
    } else if (absNum >= 100000) {
      return '₹' + (num / 100000).toFixed(1) + 'L';
    } else if (absNum >= 1000) {
      return '₹' + (num / 1000).toFixed(1) + 'K';
    }
    return '₹' + num.toFixed(2);
  };

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        setError('Please login to view data.');
        setIsLoading(false);
        return;
      }

      try {
        // FIXED: Added archive filter to exclude archived items
        const expensesQuery = query(
          collection(db, 'expenses'),
          where('userId', '==', currentUser.uid),
          where('archived', '==', false), // Only show non-archived expenses
          orderBy('date', 'desc')
        );

        const incomeQuery = query(
          collection(db, 'income'),
          where('userId', '==', currentUser.uid),
          where('archived', '==', false), // Only show non-archived income
          orderBy('date', 'desc')
        );

        const [expensesSnapshot, incomeSnapshot] = await Promise.all([
          getDocs(expensesQuery),
          getDocs(incomeQuery)
        ]);

        // Process expenses
        const expensesData = expensesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          type: 'expense'
        }));

        // Process income
        const incomeData = incomeSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          type: 'income'
        }));

        setExpenses(expensesData);
        setFilteredExpenses(expensesData);
        setIncome(incomeData);
        setFilteredIncome(incomeData);
        
        setSortField('date');
        setSortDirection('desc');

      } catch (err) {
        setError('Failed to fetch data. Please try again. Error: ' + err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [isAdmin, userRole]);

  // Debug function to check archive status
  const debugArchiveStatus = () => {
    console.log('=== ARCHIVE DEBUG ===');
    console.log('All expenses:', expenses.length);
    console.log('All income:', income.length);
    
    const archivedExpenses = expenses.filter(exp => exp.archived);
    const archivedIncome = income.filter(inc => inc.archived);
    
    console.log('Archived expenses:', archivedExpenses.length);
    console.log('Archived income:', archivedIncome.length);
    
    expenses.forEach(exp => {
      if (exp.archived) {
        console.log(`ARCHIVED Expense: ${exp.description} - ${exp.amount}`);
      }
    });
    
    income.forEach(inc => {
      if (inc.archived) {
        console.log(`ARCHIVED Income: ${inc.description} - ${inc.amount}`);
      }
    });
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const applyFilters = () => {
    if (activeTab === 'expenses') {
      let result = [...expenses];

      if (filters.category) {
        result = result.filter(expense => 
          expense.category && 
          expense.category.toLowerCase() === filters.category.toLowerCase()
        );
      }

      if (filters.amountMin) {
        result = result.filter(expense => 
          parseFloat(expense.amount) >= parseFloat(filters.amountMin)
        );
      }
      if (filters.amountMax) {
        result = result.filter(expense => 
          parseFloat(expense.amount) <= parseFloat(filters.amountMax)
        );
      }

      if (filters.dateFrom) {
        const fromDate = new Date(filters.dateFrom);
        result = result.filter(expense => {
          const expenseDate = expense.date?.toDate ? expense.date.toDate() : new Date(expense.date);
          return expenseDate >= fromDate;
        });
      }
      if (filters.dateTo) {
        const toDate = new Date(filters.dateTo);
        toDate.setHours(23, 59, 59, 999);
        result = result.filter(expense => {
          const expenseDate = expense.date?.toDate ? expense.date.toDate() : new Date(expense.date);
          return expenseDate <= toDate;
        });
      }

      const sorted = sortData(result);
      setFilteredExpenses(sorted);
    } else if (activeTab === 'income') {
      let result = [...income];

      if (filters.amountMin) {
        result = result.filter(item => 
          parseFloat(item.amount) >= parseFloat(filters.amountMin)
        );
      }
      if (filters.amountMax) {
        result = result.filter(item => 
          parseFloat(item.amount) <= parseFloat(filters.amountMax)
        );
      }

      if (filters.dateFrom) {
        const fromDate = new Date(filters.dateFrom);
        result = result.filter(item => {
          const itemDate = item.date?.toDate ? item.date.toDate() : new Date(item.date);
          return itemDate >= fromDate;
        });
      }
      if (filters.dateTo) {
        const toDate = new Date(filters.dateTo);
        toDate.setHours(23, 59, 59, 999);
        result = result.filter(item => {
          const itemDate = item.date?.toDate ? item.date.toDate() : new Date(item.date);
          return itemDate <= toDate;
        });
      }

      const sorted = sortData(result);
      setFilteredIncome(sorted);
    }
    
    setShowFilters(false);
  };

  const sortData = (dataToSort) => {
    const sorted = [...dataToSort].sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];
      
      if (sortField === 'amount') {
        aValue = parseFloat(aValue);
        bValue = parseFloat(bValue);
      }
      
      if (sortField === 'date') {
        aValue = a.date?.toDate ? a.date.toDate() : new Date(a.date);
        bValue = b.date?.toDate ? b.date.toDate() : new Date(b.date);
      }
      
      if (aValue < bValue) {
        return sortDirection === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortDirection === 'asc' ? 1 : -1;
      }
      return 0;
    });
    
    return sorted;
  };

  const handleSort = (field) => {
    const newDirection = field === sortField && sortDirection === 'asc' ? 'desc' : 'asc';
    setSortField(field);
    setSortDirection(newDirection);
    
    if (activeTab === 'expenses') {
      const sorted = sortData(filteredExpenses);
      setFilteredExpenses(sorted);
    } else if (activeTab === 'income') {
      const sorted = sortData(filteredIncome);
      setFilteredIncome(sorted);
    }
  };

  const resetFilters = () => {
    setFilters({
      dateFrom: '',
      dateTo: '',
      category: '',
      createdBy: '',
      amountMin: '',
      amountMax: '',
    });
    
    if (activeTab === 'expenses') {
      setFilteredExpenses(expenses);
    } else if (activeTab === 'income') {
      setFilteredIncome(income);
    }
    
    setSortField('date');
    setSortDirection('desc');
  };

  const hasActiveFilters = () => {
    return Object.values(filters).some(filter => filter !== '');
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString('en-IN', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (err) {
      return 'Invalid date';
    }
  };

  const getCurrentData = () => {
    return activeTab === 'expenses' ? filteredExpenses : filteredIncome;
  };

  const getTabTitle = () => {
    return activeTab === 'expenses' ? 'My Expenses' : 'My Income';
  };

  const currentData = getCurrentData();
  const isIncomeTab = activeTab === 'income';

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8 bg-gray-50 min-h-screen">
      {/* Debug button - you can remove this after testing */}
      <button 
        onClick={debugArchiveStatus}
        className="fixed bottom-4 right-4 bg-red-500 text-white p-2 rounded text-xs z-50"
        style={{display: 'none'}} // Hidden by default
      >
        Debug Archive
      </button>

      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-lg shadow-lg p-4 sm:p-6 mb-4 sm:mb-6 md:mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
          <div>
            <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-2">
              {getTabTitle()}
            </h2>
            <p className="text-blue-100 text-xs sm:text-sm md:text-base">
              Manage and track your financial transactions
            </p>
            {isAdmin && (
              <div className="flex items-center mt-2 bg-orange-500 bg-opacity-50 px-3 py-1 rounded-full">
                <FontAwesomeIcon icon={faUserShield} className="text-white mr-2" />
                <span className="text-white text-sm font-medium">Admin Account</span>
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2 sm:gap-3 mt-3 sm:mt-0 w-full sm:w-auto">
            {activeTab === 'expenses' && (
              <button
                onClick={() => navigate('/add-expense')}
                className="bg-white hover:bg-blue-50 text-blue-700 font-medium py-2 px-3 sm:px-4 rounded-lg transition-all duration-300 ease-in-out transform hover:-translate-y-1 hover:shadow-lg flex items-center text-xs sm:text-sm w-full sm:w-auto justify-center sm:justify-start mb-2 sm:mb-0"
              >
                <FontAwesomeIcon icon={faPlus} className="mr-1 sm:mr-2" />
                <span>Add Expense</span>
              </button>
            )}
            {activeTab === 'income' && (
              <button
                onClick={() => navigate('/income')}
                className="bg-white hover:bg-green-50 text-green-700 font-medium py-2 px-3 sm:px-4 rounded-lg transition-all duration-300 ease-in-out transform hover:-translate-y-1 hover:shadow-lg flex items-center text-xs sm:text-sm w-full sm:w-auto justify-center sm:justify-start mb-2 sm:mb-0"
              >
                <FontAwesomeIcon icon={faPlus} className="mr-1 sm:mr-2" />
                <span>Add Income</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden mb-4 sm:mb-6">
        <div className="grid grid-cols-2">
          <button
            className={`py-3 sm:py-4 font-medium text-xs sm:text-sm md:text-base ${
              activeTab === 'expenses' 
                ? 'bg-blue-600 text-white' 
                : 'bg-white text-gray-700 hover:bg-gray-50'
            } transition-colors duration-200`}
            onClick={() => setActiveTab('expenses')}
          >
            <FontAwesomeIcon icon={faFileInvoice} className="mr-1 sm:mr-2" />
            My Expenses
          </button>
          <button
            className={`py-3 sm:py-4 font-medium text-xs sm:text-sm md:text-base ${
              activeTab === 'income' 
                ? 'bg-green-600 text-white' 
                : 'bg-white text-gray-700 hover:bg-gray-50'
            } transition-colors duration-200`}
            onClick={() => setActiveTab('income')}
          >
            <FontAwesomeIcon icon={faMoneyBillWave} className="mr-1 sm:mr-2" />
            My Income
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-3 sm:p-4 mb-4 sm:mb-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-4 w-4 sm:h-5 sm:w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-2 sm:ml-3">
              <p className="text-red-700 text-xs sm:text-sm font-medium">{error}</p>
            </div>
          </div>
        </div>
      )}

      {!isLoading && currentData.length > 0 && (
        <div className="mb-4 sm:mb-6 md:mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
            {/* Total Amount Card */}
            <div className="bg-white rounded-lg shadow-md p-3 sm:p-4 md:p-5 border border-gray-100 transition-all duration-300 hover:shadow-lg">
              <div className="flex items-center">
                <div className={`${!isIncomeTab ? 'bg-blue-100' : 'bg-green-100'} p-2 sm:p-3 rounded-full`}>
                  <FontAwesomeIcon icon={!isIncomeTab ? faFileInvoice : faMoneyBillWave} className={`h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 ${!isIncomeTab ? 'text-blue-600' : 'text-green-600'}`} />
                </div>
                <div className="ml-3 sm:ml-4 flex-1 min-w-0">
                  <p className="text-gray-500 text-xs font-medium uppercase truncate">Total Amount</p>
                  <p className={`text-sm sm:text-base md:text-lg font-bold ${!isIncomeTab ? 'text-gray-800' : 'text-green-800'} truncate`}>
                    {formatNumber(currentData.reduce((sum, item) => sum + parseFloat(item.amount), 0))}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Entry Count Card */}
            <div className="bg-white rounded-lg shadow-md p-3 sm:p-4 md:p-5 border border-gray-100 transition-all duration-300 hover:shadow-lg">
              <div className="flex items-center">
                <div className={`${!isIncomeTab ? 'bg-indigo-100' : 'bg-green-100'} p-2 sm:p-3 rounded-full`}>
                  <svg className={`h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 ${!isIncomeTab ? 'text-indigo-600' : 'text-green-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                </div>
                <div className="ml-3 sm:ml-4 flex-1 min-w-0">
                  <p className="text-gray-500 text-xs font-medium uppercase truncate">Your Entries</p>
                  <p className="text-sm sm:text-base md:text-lg font-bold text-gray-800 truncate">{currentData.length}</p>
                </div>
              </div>
            </div>
            
            {/* Average Amount Card */}
            <div className="bg-white rounded-lg shadow-md p-3 sm:p-4 md:p-5 border border-gray-100 transition-all duration-300 hover:shadow-lg">
              <div className="flex items-center">
                <div className={`${!isIncomeTab ? 'bg-emerald-100' : 'bg-green-100'} p-2 sm:p-3 rounded-full`}>
                  <svg className={`h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 ${!isIncomeTab ? 'text-emerald-600' : 'text-green-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <div className="ml-3 sm:ml-4 flex-1 min-w-0">
                  <p className="text-gray-500 text-xs font-medium uppercase truncate">Average Amount</p>
                  <p className="text-sm sm:text-base md:text-lg font-bold text-gray-800 truncate">
                    {formatNumber(currentData.reduce((sum, item) => sum + parseFloat(item.amount), 0) / currentData.length)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-col justify-center items-center h-48 sm:h-64">
          <div className="animate-spin rounded-full h-10 w-10 sm:h-16 sm:w-16 border-t-4 border-b-4 border-blue-600 mb-3 sm:mb-4"></div>
          <p className="text-blue-600 text-sm sm:text-base font-medium">Loading your data...</p>
        </div>
      ) : currentData.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-6 sm:p-12 text-center shadow-md">
          <div className={`${!isIncomeTab ? 'text-blue-400' : 'text-green-400'} mb-4 sm:mb-6`}>
            <FontAwesomeIcon icon={!isIncomeTab ? faFileInvoice : faMoneyBillWave} size="3x" className="sm:text-4xl md:text-5xl" />
          </div>
          <span className="text-gray-700 font-medium text-base sm:text-lg md:text-xl">
            {hasActiveFilters() 
              ? `No ${!isIncomeTab ? 'expenses' : 'income entries'} match your filters.`
              : `No ${!isIncomeTab ? 'expenses' : 'income entries'} found.`
            }
          </span>
          <p className="text-gray-500 mt-3 sm:mt-4 text-sm sm:text-base">
            {hasActiveFilters() ? (
              <button 
                onClick={resetFilters}
                className={`${!isIncomeTab ? 'text-blue-500 hover:text-blue-700' : 'text-green-500 hover:text-green-700'} hover:underline`}
              >
                Clear filters
              </button>
            ) : (
              <button
                onClick={() => navigate(!isIncomeTab ? '/add-expense' : '/income')}
                className={`mt-2 ${!isIncomeTab ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'} text-white font-medium py-2 px-4 sm:px-6 rounded-lg transition-all duration-300 text-sm sm:text-base`}
              >
                Add your first {!isIncomeTab ? 'expense' : 'income entry'}
              </button>
            )}
          </p>
        </div>
      ) : (
        <div className="bg-white shadow-xl rounded-lg overflow-hidden border border-gray-100">
          {/* Table content would go here */}
        </div>
      )}
    </div>
  );
};

export default ExpenseList
