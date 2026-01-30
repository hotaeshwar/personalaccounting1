import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faFilter, 
  faPlus, 
  faFileInvoice, 
  faTimes, 
  faSort, 
  faMoneyBillWave,
  faCalendarAlt,
  faCalendarDay,
  faCalendarWeek,
  faCalendar
} from '@fortawesome/free-solid-svg-icons';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import { useNavigate } from 'react-router-dom';

const ExpenseList = () => {
  // States for data
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
    amountMin: '',
    amountMax: '',
    dateRange: 'all' // New: predefined date ranges
  });
  
  // Date range presets
  const dateRangePresets = [
    { id: 'today', label: 'Today', icon: faCalendarDay },
    { id: 'yesterday', label: 'Yesterday', icon: faCalendarDay },
    { id: 'thisWeek', label: 'This Week', icon: faCalendarWeek },
    { id: 'lastWeek', label: 'Last Week', icon: faCalendarWeek },
    { id: 'thisMonth', label: 'This Month', icon: faCalendar },
    { id: 'lastMonth', label: 'Last Month', icon: faCalendar },
    { id: 'thisYear', label: 'This Year', icon: faCalendarAlt },
    { id: 'lastYear', label: 'Last Year', icon: faCalendarAlt },
    { id: 'custom', label: 'Custom Range', icon: faCalendarAlt },
    { id: 'all', label: 'All Time', icon: faCalendarAlt }
  ];
  
  const navigate = useNavigate();

  // Fetch data on component mount
  useEffect(() => {
    fetchData();
  }, []);

  // Apply filters when active tab changes
  useEffect(() => {
    if (expenses.length > 0 || income.length > 0) {
      applyFilters();
    }
  }, [activeTab]);

  const fetchData = async () => {
    setIsLoading(true);
    const currentUser = auth.currentUser;
    
    if (!currentUser) {
      setError('Please login to view data.');
      setIsLoading(false);
      return;
    }

    try {
      const expensesQuery = query(
        collection(db, 'expenses'),
        where('userId', '==', currentUser.uid),
        orderBy('date', 'desc')
      );

      const incomeQuery = query(
        collection(db, 'income'),
        where('userId', '==', currentUser.uid),
        orderBy('date', 'desc')
      );

      const [expensesSnapshot, incomeSnapshot] = await Promise.all([
        getDocs(expensesQuery),
        getDocs(incomeQuery)
      ]);

      const expensesData = expensesSnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data(),
          type: 'expense'
        }))
        .filter(expense => expense.archived !== true);

      const incomeData = incomeSnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data(),
          type: 'income'
        }))
        .filter(income => income.archived !== true);

      setExpenses(expensesData);
      setFilteredExpenses(expensesData);
      setIncome(incomeData);
      setFilteredIncome(incomeData);

    } catch (err) {
      setError('Failed to fetch data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Get date range based on preset
  const getDateRange = (rangeId) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay()); // Sunday start
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    switch (rangeId) {
      case 'today':
        return {
          from: today,
          to: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1) // End of today
        };
      case 'yesterday':
        const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
        return {
          from: yesterday,
          to: new Date(yesterday.getTime() + 24 * 60 * 60 * 1000 - 1)
        };
      case 'thisWeek':
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);
        return {
          from: startOfWeek,
          to: endOfWeek
        };
      case 'lastWeek':
        const lastWeekStart = new Date(startOfWeek);
        lastWeekStart.setDate(startOfWeek.getDate() - 7);
        const lastWeekEnd = new Date(lastWeekStart);
        lastWeekEnd.setDate(lastWeekStart.getDate() + 6);
        lastWeekEnd.setHours(23, 59, 59, 999);
        return {
          from: lastWeekStart,
          to: lastWeekEnd
        };
      case 'thisMonth':
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        endOfMonth.setHours(23, 59, 59, 999);
        return {
          from: startOfMonth,
          to: endOfMonth
        };
      case 'lastMonth':
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
        lastMonthEnd.setHours(23, 59, 59, 999);
        return {
          from: lastMonthStart,
          to: lastMonthEnd
        };
      case 'thisYear':
        const endOfYear = new Date(now.getFullYear(), 11, 31);
        endOfYear.setHours(23, 59, 59, 999);
        return {
          from: startOfYear,
          to: endOfYear
        };
      case 'lastYear':
        const lastYearStart = new Date(now.getFullYear() - 1, 0, 1);
        const lastYearEnd = new Date(now.getFullYear() - 1, 11, 31);
        lastYearEnd.setHours(23, 59, 59, 999);
        return {
          from: lastYearStart,
          to: lastYearEnd
        };
      default:
        return null; // 'all' or 'custom'
    }
  };

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

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleDateRangeChange = (rangeId) => {
    if (rangeId === 'custom') {
      setFilters(prev => ({
        ...prev,
        dateRange: 'custom',
        dateFrom: '',
        dateTo: ''
      }));
    } else if (rangeId === 'all') {
      setFilters(prev => ({
        ...prev,
        dateRange: 'all',
        dateFrom: '',
        dateTo: ''
      }));
    } else {
      const range = getDateRange(rangeId);
      if (range) {
        setFilters(prev => ({
          ...prev,
          dateRange: rangeId,
          dateFrom: range.from.toISOString().split('T')[0],
          dateTo: range.to.toISOString().split('T')[0]
        }));
      }
    }
  };

  const applyFilters = () => {
    if (activeTab === 'expenses') {
      let result = [...expenses];

      // Apply category filter
      if (filters.category) {
        result = result.filter(expense => 
          expense.category && 
          expense.category.toLowerCase() === filters.category.toLowerCase()
        );
      }

      // Apply amount filters
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

      // Apply date filters
      if (filters.dateRange !== 'all' && (filters.dateFrom || filters.dateTo)) {
        const fromDate = filters.dateFrom ? new Date(filters.dateFrom) : null;
        const toDate = filters.dateTo ? new Date(filters.dateTo) : null;
        
        if (fromDate) {
          fromDate.setHours(0, 0, 0, 0);
          result = result.filter(expense => {
            const expenseDate = expense.date?.toDate ? expense.date.toDate() : new Date(expense.date);
            expenseDate.setHours(0, 0, 0, 0);
            return expenseDate >= fromDate;
          });
        }
        
        if (toDate) {
          toDate.setHours(23, 59, 59, 999);
          result = result.filter(expense => {
            const expenseDate = expense.date?.toDate ? expense.date.toDate() : new Date(expense.date);
            return expenseDate <= toDate;
          });
        }
      }

      const sorted = sortData(result);
      setFilteredExpenses(sorted);
    } else if (activeTab === 'income') {
      let result = [...income];

      // Apply amount filters
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

      // Apply date filters
      if (filters.dateRange !== 'all' && (filters.dateFrom || filters.dateTo)) {
        const fromDate = filters.dateFrom ? new Date(filters.dateFrom) : null;
        const toDate = filters.dateTo ? new Date(filters.dateTo) : null;
        
        if (fromDate) {
          fromDate.setHours(0, 0, 0, 0);
          result = result.filter(item => {
            const itemDate = item.date?.toDate ? item.date.toDate() : new Date(item.date);
            itemDate.setHours(0, 0, 0, 0);
            return itemDate >= fromDate;
          });
        }
        
        if (toDate) {
          toDate.setHours(23, 59, 59, 999);
          result = result.filter(item => {
            const itemDate = item.date?.toDate ? item.date.toDate() : new Date(item.date);
            return itemDate <= toDate;
          });
        }
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
      amountMin: '',
      amountMax: '',
      dateRange: 'all'
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
    return filters.dateRange !== 'all' || 
           filters.category !== '' || 
           filters.amountMin !== '' || 
           filters.amountMax !== '';
  };

  const getFilterSummary = () => {
    const summary = [];
    
    if (filters.dateRange !== 'all') {
      const preset = dateRangePresets.find(p => p.id === filters.dateRange);
      if (preset) {
        summary.push(preset.label);
      } else if (filters.dateFrom && filters.dateTo) {
        summary.push(`${formatDisplayDate(filters.dateFrom)} to ${formatDisplayDate(filters.dateTo)}`);
      }
    }
    
    if (filters.category) {
      summary.push(`Category: ${filters.category}`);
    }
    
    if (filters.amountMin) {
      summary.push(`Min: ${formatNumber(parseFloat(filters.amountMin))}`);
    }
    
    if (filters.amountMax) {
      summary.push(`Max: ${formatNumber(parseFloat(filters.amountMax))}`);
    }
    
    return summary.length > 0 ? summary.join(' • ') : 'No filters applied';
  };

  const formatDisplayDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { 
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString('en-IN', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric'
      });
    } catch (err) {
      return 'Invalid date';
    }
  };

  const getCurrentData = () => {
    return activeTab === 'expenses' ? filteredExpenses : filteredIncome;
  };

  const currentData = getCurrentData();
  const isIncomeTab = activeTab === 'income';

  return (
    <div className="w-full max-w-7xl mx-auto px-2 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-6 md:py-8 bg-gray-50 min-h-screen">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl shadow-lg p-4 mb-4 sm:mb-6 md:mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-3 sm:space-y-0">
          <div>
            <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-white mb-1">
              {activeTab === 'expenses' ? 'My Expenses' : 'My Income'}
            </h2>
            <p className="text-blue-100 text-xs sm:text-sm">
              Manage and track your financial transactions
            </p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            {activeTab === 'expenses' && (
              <button
                onClick={() => navigate('/add-expense')}
                className="bg-white hover:bg-blue-50 text-blue-700 font-medium py-2 px-3 rounded-lg transition-all duration-300 flex items-center text-xs sm:text-sm w-full sm:w-auto justify-center"
              >
                <FontAwesomeIcon icon={faPlus} className="mr-2" />
                <span>Add Expense</span>
              </button>
            )}
            {activeTab === 'income' && (
              <button
                onClick={() => navigate('/income')}
                className="bg-white hover:bg-green-50 text-green-700 font-medium py-2 px-3 rounded-lg transition-all duration-300 flex items-center text-xs sm:text-sm w-full sm:w-auto justify-center"
              >
                <FontAwesomeIcon icon={faPlus} className="mr-2" />
                <span>Add Income</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden mb-4 sm:mb-6">
        <div className="grid grid-cols-2">
          <button
            className={`py-3 font-medium text-sm ${
              activeTab === 'expenses' 
                ? 'bg-blue-600 text-white' 
                : 'bg-white text-gray-700 hover:bg-gray-50'
            } transition-colors duration-200`}
            onClick={() => setActiveTab('expenses')}
          >
            <FontAwesomeIcon icon={faFileInvoice} className="mr-2" />
            Expenses
          </button>
          <button
            className={`py-3 font-medium text-sm ${
              activeTab === 'income' 
                ? 'bg-green-600 text-white' 
                : 'bg-white text-gray-700 hover:bg-gray-50'
            } transition-colors duration-200`}
            onClick={() => setActiveTab('income')}
          >
            <FontAwesomeIcon icon={faMoneyBillWave} className="mr-2" />
            Income
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-3 mb-4 rounded-lg shadow">
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

      {/* Active Filters Summary */}
      {hasActiveFilters() && !isLoading && currentData.length > 0 && (
        <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <FontAwesomeIcon icon={faFilter} className="text-blue-500 mr-2" />
              <span className="text-sm text-blue-700 font-medium">Active Filters:</span>
              <span className="text-sm text-blue-600 ml-2">{getFilterSummary()}</span>
            </div>
            <button
              onClick={resetFilters}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center"
            >
              <FontAwesomeIcon icon={faTimes} className="mr-1" />
              Clear All
            </button>
          </div>
        </div>
      )}

      {/* Stats Cards - Mobile Optimized */}
      {!isLoading && currentData.length > 0 && (
        <div className="mb-4 sm:mb-6 md:mb-8">
          <div className="grid grid-cols-1 gap-3">
            <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-xs font-medium uppercase">Total Amount</p>
                  <p className={`text-lg font-bold ${!isIncomeTab ? 'text-gray-800' : 'text-green-800'}`}>
                    {formatNumber(currentData.reduce((sum, item) => sum + parseFloat(item.amount), 0))}
                  </p>
                </div>
                <div className={`${!isIncomeTab ? 'bg-blue-100' : 'bg-green-100'} p-3 rounded-full`}>
                  <FontAwesomeIcon icon={!isIncomeTab ? faFileInvoice : faMoneyBillWave} className={`h-5 w-5 ${!isIncomeTab ? 'text-blue-600' : 'text-green-600'}`} />
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
                <div className="flex items-center">
                  <div>
                    <p className="text-gray-500 text-xs font-medium uppercase">Entries</p>
                    <p className="text-base font-bold text-gray-800">{currentData.length}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
                <div className="flex items-center">
                  <div>
                    <p className="text-gray-500 text-xs font-medium uppercase">Average</p>
                    <p className="text-base font-bold text-gray-800">
                      {formatNumber(currentData.reduce((sum, item) => sum + parseFloat(item.amount), 0) / currentData.length)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading ? (
        <div className="flex flex-col justify-center items-center h-48">
          <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-600 mb-4"></div>
          <p className="text-blue-600 text-sm font-medium">Loading your data...</p>
        </div>
      ) : currentData.length === 0 ? (
        /* Empty State */
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center shadow-sm">
          <div className={`${!isIncomeTab ? 'text-blue-400' : 'text-green-400'} mb-4`}>
            <FontAwesomeIcon icon={!isIncomeTab ? faFileInvoice : faMoneyBillWave} size="2x" />
          </div>
          <span className="text-gray-700 font-medium text-base">
            {hasActiveFilters() 
              ? `No ${!isIncomeTab ? 'expenses' : 'income entries'} match your filters.`
              : `No ${!isIncomeTab ? 'expenses' : 'income entries'} found.`
            }
          </span>
          <p className="text-gray-500 mt-3 text-sm">
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
                className={`mt-2 ${!isIncomeTab ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'} text-white font-medium py-2 px-4 rounded-lg transition-all duration-300 text-sm`}
              >
                Add your first {!isIncomeTab ? 'expense' : 'income entry'}
              </button>
            )}
          </p>
        </div>
      ) : (
        /* Data Table Section */
        <div className="bg-white shadow-sm rounded-xl overflow-hidden border border-gray-100">
          {/* Table Header with Filters */}
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <div className="flex flex-col space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-medium text-gray-700">
                  {currentData.length} {!isIncomeTab ? 'expenses' : 'entries'}
                </h3>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`inline-flex items-center px-3 py-1 border text-xs font-medium rounded-md ${
                      hasActiveFilters()
                        ? 'border-blue-300 bg-blue-50 text-blue-700'
                        : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <FontAwesomeIcon icon={faFilter} className="mr-2" />
                    Filters
                    {hasActiveFilters() && (
                      <span className="ml-2 bg-blue-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs">
                        !
                      </span>
                    )}
                  </button>
                  {hasActiveFilters() && (
                    <button
                      onClick={resetFilters}
                      className="inline-flex items-center px-3 py-1 border border-gray-300 text-xs font-medium rounded-md bg-white text-gray-700 hover:bg-gray-50"
                    >
                      <FontAwesomeIcon icon={faTimes} className="mr-2" />
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="px-4 py-4 bg-gray-50 border-b border-gray-200">
              {/* Date Range Presets */}
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-700 mb-2">Quick Date Ranges</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                  {dateRangePresets.map(preset => (
                    <button
                      key={preset.id}
                      onClick={() => handleDateRangeChange(preset.id)}
                      className={`inline-flex flex-col items-center justify-center p-2 border rounded-md text-xs ${
                        filters.dateRange === preset.id
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <FontAwesomeIcon icon={preset.icon} className="mb-1" />
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Date Range */}
              {(filters.dateRange === 'custom' || (filters.dateFrom && filters.dateTo)) && (
                <div className="mb-4">
                  <label className="block text-xs font-medium text-gray-700 mb-2">Custom Date Range</label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">From Date</label>
                      <input
                        type="date"
                        name="dateFrom"
                        value={filters.dateFrom}
                        onChange={handleFilterChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                        max={filters.dateTo || undefined}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">To Date</label>
                      <input
                        type="date"
                        name="dateTo"
                        value={filters.dateTo}
                        onChange={handleFilterChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                        min={filters.dateFrom || undefined}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Category Filter (Only for Expenses) */}
              {activeTab === 'expenses' && (
                <div className="mb-4">
                  <label className="block text-xs font-medium text-gray-700 mb-2">Category</label>
                  <select
                    name="category"
                    value={filters.category}
                    onChange={handleFilterChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                  >
                    <option value="">All Categories</option>
                    {getUniqueCategories().map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Amount Range Filter */}
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-700 mb-2">Amount Range</label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Minimum Amount</label>
                    <input
                      type="number"
                      name="amountMin"
                      placeholder="0"
                      value={filters.amountMin}
                      onChange={handleFilterChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Maximum Amount</label>
                    <input
                      type="number"
                      name="amountMax"
                      placeholder="No limit"
                      value={filters.amountMax}
                      onChange={handleFilterChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-2">
                <button
                  onClick={resetFilters}
                  className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Reset All
                </button>
                <button
                  onClick={applyFilters}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          )}

          {/* Mobile Cards View */}
          <div className="block sm:hidden">
            <div className="divide-y divide-gray-200">
              {currentData.map((item) => (
                <div key={item.id} className="p-4 hover:bg-gray-50 transition-colors duration-150">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {item.description || 'No description'}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatDate(item.date)}
                      </p>
                    </div>
                    <p className={`text-sm font-medium ml-2 ${
                      item.type === 'income' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {item.type === 'income' ? '+' : ''}{formatNumber(parseFloat(item.amount))}
                    </p>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    {activeTab === 'expenses' && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                        {item.category}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Desktop Table View */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th 
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('date')}
                  >
                    <div className="flex items-center">
                      Date
                      <FontAwesomeIcon 
                        icon={faSort} 
                        className={`ml-1 text-gray-400 ${
                          sortField === 'date' ? 'text-blue-500' : ''
                        }`}
                      />
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  {activeTab === 'expenses' && (
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                  )}
                  <th 
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('amount')}
                  >
                    <div className="flex items-center">
                      Amount
                      <FontAwesomeIcon 
                        icon={faSort} 
                        className={`ml-1 text-gray-400 ${
                          sortField === 'amount' ? 'text-blue-500' : ''
                        }`}
                      />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentData.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors duration-150">
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(item.date)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate">
                      {item.description || 'No description'}
                    </td>
                    {activeTab === 'expenses' && (
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {item.category}
                        </span>
                      </td>
                    )}
                    <td className={`px-4 py-3 whitespace-nowrap text-sm font-medium ${
                      item.type === 'income' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {item.type === 'income' ? '+' : ''}{formatNumber(parseFloat(item.amount))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpenseList;
