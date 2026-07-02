'use client';

import React, { useState, useEffect } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart, 
  Pie, 
  Cell
} from 'recharts';
import { 
  collection, 
  query, 
  where, 
  getDocs,
  doc,
  getDoc
} from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import { useRouter } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faWallet, 
  faArrowTrendUp, 
  faArrowTrendDown, 
  faPiggyBank, 
  faPlus, 
  faList, 
  faChartLine, 
  faCreditCard,
  faEdit,
  faCheckCircle,
  faExclamationTriangle,
  faCalendarAlt,
  faMoneyBillWave,
  faLightbulb,
  faInfoCircle,
  faRobot,
  faPaperPlane
} from '@fortawesome/free-solid-svg-icons';
import DateClock from './DateClock';

export default function Dashboard() {
  const [expenses, setExpenses] = useState([]);
  const [income, setIncome] = useState([]);
  const [userName, setUserName] = useState('');
  const [timeRange, setTimeRange] = useState('thisMonth'); // 'thisMonth', 'last30Days', 'thisYear', 'allTime'
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [userId, setUserId] = useState(null);
  
  // Budget tracking state
  const [budgetLimit, setBudgetLimit] = useState(15000);
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [tempBudget, setTempBudget] = useState('');

  const router = useRouter();

  // Companion panel tab and chatbot state
  const [activeRightTab, setActiveRightTab] = useState('ai'); // 'ai', 'activity', 'insights'
  const [chatMessages, setChatMessages] = useState([
    {
      sender: 'ai',
      text: "Hello! I am Aura, your AI Financial Assistant. I've analyzed your account transactions. Click a prompt tag below or type a custom question to get insights!"
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString('en-IN', { 
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch (err) {
      return 'N/A';
    }
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setUserId(user.uid);
        fetchUserData(user.uid);
        fetchFinancialData(user.uid);
        
        // Load custom budget limit if stored
        const storedBudget = localStorage.getItem(`budget_limit_${user.uid}`);
        if (storedBudget) {
          setBudgetLimit(parseFloat(storedBudget));
        }
      } else {
        setError('Please login to access the dashboard.');
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const fetchUserData = async (uid) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        setUserName(userDoc.data().username || 'User');
      } else {
        setUserName('User');
      }
    } catch (err) {
      console.error('Error fetching user data:', err);
    }
  };

  const fetchFinancialData = async (uid) => {
    setIsLoading(true);
    setError('');
    try {
      const expensesQuery = query(
        collection(db, 'expenses'),
        where('userId', '==', uid)
      );

      const incomeQuery = query(
        collection(db, 'income'),
        where('userId', '==', uid)
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
        .filter(item => item.archived !== true);

      const incomeData = incomeSnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data(),
          type: 'income'
        }))
        .filter(item => item.archived !== true);

      setExpenses(expensesData);
      setIncome(incomeData);
    } catch (err) {
      console.error('Error fetching financial data:', err);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  // Budget calculations
  const getMonthExpensesSum = () => {
    const now = new Date();
    const currentMonthExpenses = expenses.filter(item => {
      const dateVal = item.date?.toDate ? item.date.toDate() : new Date(item.date);
      if (isNaN(dateVal.getTime())) return false;
      return dateVal.getFullYear() === now.getFullYear() && dateVal.getMonth() === now.getMonth();
    });
    return currentMonthExpenses.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
  };

  const currentMonthExpensesSum = getMonthExpensesSum();
  const budgetProgress = budgetLimit > 0 ? (currentMonthExpensesSum / budgetLimit) * 100 : 0;
  const budgetRemaining = Math.max(0, budgetLimit - currentMonthExpensesSum);

  const handleSaveBudget = (e) => {
    e.preventDefault();
    const val = parseFloat(tempBudget);
    if (!isNaN(val) && val >= 0) {
      setBudgetLimit(val);
      if (userId) {
        localStorage.setItem(`budget_limit_${userId}`, val.toString());
      }
      setIsEditingBudget(false);
    }
  };

  // Helper to filter items based on selected range
  const filterDataByRange = (dataList) => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return dataList.filter(item => {
      const dateVal = item.date?.toDate ? item.date.toDate() : new Date(item.date);
      if (isNaN(dateVal.getTime())) return false;

      if (timeRange === 'thisMonth') {
        return dateVal.getFullYear() === now.getFullYear() && dateVal.getMonth() === now.getMonth();
      } else if (timeRange === 'last30Days') {
        const thirtyDaysAgo = new Date(startOfToday.getTime() - 30 * 24 * 60 * 60 * 1000);
        return dateVal >= thirtyDaysAgo;
      } else if (timeRange === 'thisYear') {
        return dateVal.getFullYear() === now.getFullYear();
      }
      return true; // 'allTime'
    });
  };

  const filteredExpenses = filterDataByRange(expenses);
  const filteredIncome = filterDataByRange(income);

  // Compute selected metrics
  const totalIncome = filteredIncome.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
  const totalExpenses = filteredExpenses.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
  const netBalance = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;

  // Chart 1: Category Breakdown for Pie Chart
  const getPieChartData = () => {
    const categoryTotals = {};
    filteredExpenses.forEach(item => {
      const cat = item.category || 'Miscellaneous';
      categoryTotals[cat] = (categoryTotals[cat] || 0) + parseFloat(item.amount || 0);
    });

    const colors = [
      '#6366f1', // Indigo
      '#ef4444', // Red
      '#f59e0b', // Amber
      '#10b981', // Emerald
      '#3b82f6', // Blue
      '#ec4899', // Pink
      '#8b5cf6', // Violet
      '#14b8a6', // Teal
      '#06b6d4'  // Cyan
    ];

    return Object.entries(categoryTotals)
      .map(([name, value], index) => ({
        name,
        value,
        color: colors[index % colors.length]
      }))
      .sort((a, b) => b.value - a.value);
  };

  const pieChartData = getPieChartData();

  // Chart 2: Monthly Trends Bar Chart (last 6 months)
  const getBarChartData = () => {
    const data = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = targetDate.getFullYear();
      const month = targetDate.getMonth();
      const monthLabel = targetDate.toLocaleString('default', { month: 'short' });

      const monthExpenses = expenses.filter(item => {
        const dateVal = item.date?.toDate ? item.date.toDate() : new Date(item.date);
        if (isNaN(dateVal.getTime())) return false;
        return dateVal.getFullYear() === year && dateVal.getMonth() === month;
      });

      const monthIncome = income.filter(item => {
        const dateVal = item.date?.toDate ? item.date.toDate() : new Date(item.date);
        if (isNaN(dateVal.getTime())) return false;
        return dateVal.getFullYear() === year && dateVal.getMonth() === month;
      });

      const expSum = monthExpenses.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
      const incSum = monthIncome.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);

      data.push({
        name: `${monthLabel} ${year.toString().slice(-2)}`,
        Income: incSum,
        Expenses: expSum
      });
    }
    return data;
  };

  const barChartData = getBarChartData();

  // Recent combined transactions sorted by date
  const getRecentTransactions = () => {
    const combined = [
      ...expenses.map(item => ({ ...item, displayType: 'Expense' })),
      ...income.map(item => ({ ...item, displayType: 'Income' }))
    ];

    return combined
      .sort((a, b) => {
        const dateA = a.date?.toDate ? a.date.toDate() : new Date(a.date);
        const dateB = b.date?.toDate ? b.date.toDate() : new Date(b.date);
        return dateB - dateA;
      })
      .slice(0, 6);
  };

  const recentTransactions = getRecentTransactions();

  const getSmartInsights = () => {
    const insightsList = [];
    
    // 1. Savings Rate Insight
    if (savingsRate >= 30) {
      insightsList.push({
        type: 'success',
        icon: faCheckCircle,
        title: 'Excellent Savings Rate!',
        message: `You successfully saved ${savingsRate.toFixed(1)}% of your income this month. Keep it up!`,
        colorClass: 'border-green-200 bg-green-50/30 text-green-800'
      });
    } else if (savingsRate > 0 && savingsRate < 15) {
      insightsList.push({
        type: 'warning',
        icon: faLightbulb,
        title: 'Boost Savings Margin',
        message: `Your savings rate is ${savingsRate.toFixed(1)}%. Try setting aside 15% immediately when income is deposited.`,
        colorClass: 'border-amber-200 bg-amber-50/30 text-amber-800'
      });
    } else if (netBalance < 0 && totalIncome > 0) {
      insightsList.push({
        type: 'danger',
        icon: faExclamationTriangle,
        title: 'Negative Cash Flow Alert',
        message: `You spent ${formatCurrency(Math.abs(netBalance))} more than you earned. Review your miscellaneous categories.`,
        colorClass: 'border-red-200 bg-red-50/30 text-red-800'
      });
    }

    // 2. Budget Alerts
    if (budgetProgress >= 100) {
      insightsList.push({
        type: 'danger',
        icon: faExclamationTriangle,
        title: 'Budget Limit Exceeded',
        message: `You are over your monthly budget by ${formatCurrency(currentMonthExpensesSum - budgetLimit)}. Consider freezing non-essential costs.`,
        colorClass: 'border-red-200 bg-red-50/30 text-red-800'
      });
    } else if (budgetProgress >= 80) {
      insightsList.push({
        type: 'warning',
        icon: faLightbulb,
        title: 'Budget Threshold Warning',
        message: `You have spent ${budgetProgress.toFixed(0)}% of your monthly limit. Plan remaining expenses carefully.`,
        colorClass: 'border-amber-200 bg-amber-50/30 text-amber-800'
      });
    }

    // 3. Category spending insight
    if (pieChartData.length > 0) {
      const highestExpense = pieChartData[0];
      const percentOfExpenses = totalExpenses > 0 ? ((highestExpense.value / totalExpenses) * 100).toFixed(0) : 0;
      if (highestExpense.value > 0) {
        insightsList.push({
          type: 'info',
          icon: faInfoCircle,
          title: `Top Expense: ${highestExpense.name}`,
          message: `This category comprises ${percentOfExpenses}% of your total outflow (${formatCurrency(highestExpense.value)}).`,
          colorClass: 'border-indigo-200 bg-indigo-50/30 text-indigo-800'
        });
      }
    }

    // 4. Default general tips if no active alerts
    if (insightsList.length < 2) {
      insightsList.push({
        type: 'info',
        icon: faLightbulb,
        title: 'Rule of Thumb: 50/30/20',
        message: 'Allocate 50% of income to Needs, 30% to Wants, and commit 20% to Savings.',
        colorClass: 'border-indigo-200 bg-indigo-50/30 text-indigo-800'
      });
    }

    return insightsList;
  };

  const smartInsights = getSmartInsights();

  const generateAIResponse = (userText) => {
    const text = userText.toLowerCase();
    
    // Calculate current stats
    const currentMonthExpenses = currentMonthExpensesSum;
    const currentMonthIncome = filteredIncome.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
    const avgExpense = expenses.length > 0 ? (expenses.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0) / expenses.length) : 0;
    const topCat = pieChartData.length > 0 ? pieChartData[0].name : 'N/A';
    const topCatVal = pieChartData.length > 0 ? pieChartData[0].value : 0;
    const balance = netBalance;
    
    // Projections
    const projectedExpensesNextMonth = currentMonthExpenses * 0.9 + avgExpense * 0.1;
    const projectedIncomeNextMonth = currentMonthIncome > 0 ? currentMonthIncome : (income.length > 0 ? (income.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0) / Math.max(1, income.length)) : 0);
    const projectedSavingsNextMonth = Math.max(0, projectedIncomeNextMonth - projectedExpensesNextMonth);
    
    if (text.includes('forecast') || text.includes('predict') || text.includes('next month') || text.includes('🔮')) {
      return `🔮 **AI Forecast Projections:**
- **Income target**: **${formatCurrency(projectedIncomeNextMonth)}**
- **Expected spending**: **${formatCurrency(projectedExpensesNextMonth)}**
- **Target net savings**: **${formatCurrency(projectedSavingsNextMonth)}**
- **Projected Savings Rate**: **${projectedIncomeNextMonth > 0 ? ((projectedSavingsNextMonth / projectedIncomeNextMonth) * 100).toFixed(0) : 0}%**

*AI Advice*: ${projectedSavingsNextMonth > 0 ? "You are pacing towards a surplus next month. Try allocating ₹5,000 of it towards an investment goal!" : "Your expected cash burn is exceeding your income. I highly recommend cutting back miscellaneous items."}`;
    }
    
    if (text.includes('afford') || text.includes('buy') || text.includes('purchase') || text.includes('cost') || text.includes('💻')) {
      const numbers = text.match(/\d+/g);
      const amountToBuy = numbers ? parseFloat(numbers.join('')) : 20000;
      const affordable = balance > amountToBuy * 1.5;
      
      return `💻 **AI Affordability Check:**
- **Estimated Cost**: **${formatCurrency(amountToBuy)}**
- **Your Net Balance**: **${formatCurrency(balance)}**
- **Verdict**: ${affordable ? '✅ Recommended Purchase' : '⚠️ Not Recommended'}

${affordable 
  ? `This purchase represents **${((amountToBuy / Math.max(1, balance)) * 100).toFixed(0)}%** of your total savings, which falls inside a safe liquidity buffer.`
  : `Buying this would lock up **${((amountToBuy / Math.max(1, balance)) * 100).toFixed(0)}%** of your capital. I suggest waiting another **${Math.ceil((amountToBuy - balance) / Math.max(1, projectedSavingsNextMonth || 5000))} month(s)**.`
}`;
    }
    
    if (text.includes('audit') || text.includes('analyze') || text.includes('spending') || text.includes('diagnos') || text.includes('📊')) {
      return `📊 **AI Spending Diagnostic:**
- **Income vs Expenses ratio**: **${totalExpenses > 0 && totalIncome > 0 ? (totalIncome / totalExpenses).toFixed(1) : 'N/A'}**
- **Savings Margin**: **${savingsRate.toFixed(1)}%**
- **Category Alert**: **${topCat}** represents **${totalExpenses > 0 ? ((topCatVal / totalExpenses) * 100).toFixed(0) : 0}%** of your outlays.
- **Velocity**: Average transaction size is **${formatCurrency(avgExpense)}**.

*AI Diagnosis*: ${savingsRate > 20 ? 'Your financial health is stable.' : 'Your savings margin is weak. Consider adjusting your monthly budget limit down by 10%.'}`;
    }

    if (text.includes('budget') || text.includes('limit') || text.includes('spent') || text.includes('🎯')) {
      return `🎯 **AI Budget Diagnostic:**
- **Limit Cap**: **${formatCurrency(budgetLimit)}**
- **Burn Rate**: **${budgetProgress.toFixed(0)}%** consumed.
- **Velocity**: Spending **${formatCurrency(currentMonthExpenses / Math.max(1, new Date().getDate()))}/day**.
- **End Month Projection**: **${formatCurrency((currentMonthExpenses / Math.max(1, new Date().getDate())) * 30)}**

*Tip*: Your budget remaining is **${formatCurrency(budgetRemaining)}**.`;
    }

    return `🤖 **Aura AI Copilot**

Ask me anything about your finances or choose one of these prompts:
1. *"🔮 Forecast next month"* to see income & expense predictions.
2. *"💻 Can I afford a purchase of ₹30,000?"* to test cash impact.
3. *"📊 Run a financial audit"* to analyze savings rate and spending velocity.`;
  };

  const handleSendMessage = (e, customText = null) => {
    if (e) e.preventDefault();
    const messageText = customText || chatInput;
    if (!messageText.trim()) return;

    // Add user message
    setChatMessages(prev => [...prev, { sender: 'user', text: messageText }]);
    if (!customText) setChatInput('');
    setIsTyping(true);

    setTimeout(() => {
      const responseText = generateAIResponse(messageText);
      setChatMessages(prev => [...prev, { sender: 'ai', text: responseText }]);
      setIsTyping(false);
    }, 850);
  };



  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center h-[70vh] w-full bg-gray-50/50">
        <div className="relative w-20 h-20 mb-6 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-indigo-600 border-b-purple-600 animate-spin" style={{ animationDuration: '1.2s' }}></div>
          <div className="absolute inset-2 rounded-full border-4 border-transparent border-l-orange-500 border-r-green-500 animate-[spin_1.8s_linear_infinite]" style={{ animationDirection: 'reverse' }}></div>
          <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center animate-pulse">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
        </div>
        <p className="text-indigo-600 font-black animate-pulse text-xs tracking-wider uppercase">Assembling your custom dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-2xl mx-auto my-12 bg-red-50 border-l-4 border-red-500 rounded-xl p-5 shadow-md">
        <div className="flex items-center space-x-3">
          <FontAwesomeIcon icon={faExclamationTriangle} className="text-red-500 text-xl" />
          <p className="text-red-700 font-semibold">{error}</p>
        </div>
        <button 
          onClick={() => router.push('/login')} 
          className="mt-4 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold py-2 px-4 rounded-lg transition-colors cursor-pointer"
        >
          Go to Login
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-2 sm:px-4 md:px-6 py-3 sm:py-6 bg-gray-50 min-h-screen">
      
      {/* Personalized Greeting Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6 md:mb-8 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-950 p-6 rounded-2xl shadow-lg border border-indigo-900/40 transition-all duration-300 hover:shadow-xl">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-white flex items-center gap-2">
            <span>{getGreeting()},</span>
            <span className="bg-gradient-to-r from-orange-400 to-green-400 bg-clip-text text-transparent">{userName}</span>
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full text-[10px] font-extrabold flex items-center gap-1">
              <FontAwesomeIcon icon={faRobot} className="text-[9px]" />
              <span>Aura AI Assistant Active</span>
            </span>
            <span className="text-indigo-200/75 text-xs font-semibold">
              Aura predicts a steady {savingsRate > 20 ? 'savings velocity' : 'cash burn trajectory'} for next month.
            </span>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {/* Dropdown for Time Range */}
          <div className="relative">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="bg-white/10 hover:bg-white/15 border border-white/20 text-white font-bold py-2 px-3 pr-8 rounded-xl text-xs sm:text-sm cursor-pointer shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all duration-300 appearance-none"
            >
              <option value="thisMonth" className="text-gray-800">This Month</option>
              <option value="last30Days" className="text-gray-800">Last 30 Days</option>
              <option value="thisYear" className="text-gray-800">This Year</option>
              <option value="allTime" className="text-gray-800">All Time Overview</option>
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-white/80">
              <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
              </svg>
            </div>
          </div>
          
          <DateClock />
        </div>
      </div>

      {/* Financial Overview Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 md:mb-8">
        
        {/* Net Balance Card */}
        <div className="bg-gradient-to-br from-indigo-600 to-purple-700 text-white rounded-2xl p-5 shadow-md hover:shadow-lg transition-all duration-300 relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
            <FontAwesomeIcon icon={faWallet} className="text-8xl" />
          </div>
          <span className="text-indigo-100 text-xs font-bold uppercase tracking-wider">Net Balance</span>
          <div className="mt-2">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-black truncate">{formatCurrency(netBalance)}</h2>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-xs text-indigo-100">
            <span className={`inline-block px-2 py-0.5 rounded-full ${netBalance >= 0 ? 'bg-green-500/25 text-green-300' : 'bg-red-500/25 text-red-300'}`}>
              {netBalance >= 0 ? 'Surplus' : 'Deficit'}
            </span>
            <span>cumulative total</span>
          </div>
        </div>

        {/* Total Income Card */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 opacity-5 text-green-600 group-hover:scale-110 transition-transform duration-500">
            <FontAwesomeIcon icon={faArrowTrendUp} className="text-8xl" />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-xs font-bold uppercase tracking-wider">Total Income</span>
            <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center text-green-600">
              <FontAwesomeIcon icon={faArrowTrendUp} />
            </div>
          </div>
          <div className="mt-2">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-gray-800 truncate">{formatCurrency(totalIncome)}</h2>
          </div>
          <div className="mt-4 text-xs text-gray-500 font-medium">
            Based on active filter parameters
          </div>
        </div>

        {/* Total Expenses Card */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 opacity-5 text-red-600 group-hover:scale-110 transition-transform duration-500">
            <FontAwesomeIcon icon={faArrowTrendDown} className="text-8xl" />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-xs font-bold uppercase tracking-wider">Total Expenses</span>
            <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center text-red-600">
              <FontAwesomeIcon icon={faArrowTrendDown} />
            </div>
          </div>
          <div className="mt-2">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-gray-800 truncate">{formatCurrency(totalExpenses)}</h2>
          </div>
          <div className="mt-4 text-xs text-gray-500 font-medium">
            Based on active filter parameters
          </div>
        </div>

        {/* Savings Rate Card */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 opacity-5 text-orange-600 group-hover:scale-110 transition-transform duration-500">
            <FontAwesomeIcon icon={faPiggyBank} className="text-8xl" />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-xs font-bold uppercase tracking-wider">Savings Rate</span>
            <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center text-orange-600">
              <FontAwesomeIcon icon={faPiggyBank} />
            </div>
          </div>
          <div className="mt-2">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-gray-800 truncate">{savingsRate.toFixed(1)}%</h2>
          </div>
          <div className="mt-3.5 w-full bg-gray-100 rounded-full h-1.5">
            <div 
              className="bg-orange-500 h-1.5 rounded-full transition-all duration-500" 
              style={{ width: `${Math.min(100, Math.max(0, savingsRate))}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Monthly Budget Tracker Card */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5 md:p-6 mb-6 md:mb-8 shadow-sm transition-all duration-300 hover:shadow-md">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <div>
            <h3 className="text-base sm:text-lg font-extrabold text-gray-800 flex items-center gap-2">
              <FontAwesomeIcon icon={faCreditCard} className="text-indigo-500" />
              <span>Monthly Expense Budget Limit Tracker</span>
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">Set a limit to monitor your monthly expenses.</p>
          </div>
          
          <div>
            {isEditingBudget ? (
              <form onSubmit={handleSaveBudget} className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="e.g. 15000"
                  value={tempBudget}
                  onChange={(e) => setTempBudget(e.target.value)}
                  className="w-28 sm:w-36 text-xs sm:text-sm p-1.5 border border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 font-semibold"
                  min="0"
                  required
                />
                <button 
                  type="submit" 
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-1.5 px-3 rounded-lg cursor-pointer transition-colors"
                >
                  Save
                </button>
                <button 
                  type="button" 
                  onClick={() => setIsEditingBudget(false)}
                  className="text-gray-500 hover:text-gray-700 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
              </form>
            ) : (
              <button
                onClick={() => {
                  setTempBudget(budgetLimit.toString());
                  setIsEditingBudget(true);
                }}
                className="bg-gray-100 hover:bg-indigo-50 text-indigo-700 text-xs font-bold py-1.5 px-3 rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors border border-gray-200/50"
              >
                <FontAwesomeIcon icon={faEdit} />
                <span>Adjust Limit ({formatCurrency(budgetLimit)})</span>
              </button>
            )}
          </div>
        </div>

        {/* Progress Display */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
          <div className="md:col-span-8">
            <div className="flex justify-between text-xs text-gray-500 font-bold mb-1">
              <span>Spent: {formatCurrency(currentMonthExpensesSum)}</span>
              <span>Limit: {formatCurrency(budgetLimit)}</span>
            </div>
            
            {/* Double height progress bar */}
            <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden shadow-inner">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  budgetProgress >= 100 
                    ? 'bg-red-600 animate-pulse' 
                    : budgetProgress >= 80 
                      ? 'bg-amber-500' 
                      : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(100, budgetProgress)}%` }}
              ></div>
            </div>
          </div>
          
          <div className="md:col-span-4 flex items-center justify-start md:justify-end">
            {budgetProgress >= 100 ? (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 flex items-start gap-2.5 w-full text-xs">
                <FontAwesomeIcon icon={faExclamationTriangle} className="text-red-500 text-sm mt-0.5" />
                <div>
                  <p className="font-extrabold uppercase tracking-wide">Budget Overrun!</p>
                  <p className="mt-0.5">Exceeded your monthly limit by {formatCurrency(currentMonthExpensesSum - budgetLimit)}.</p>
                </div>
              </div>
            ) : budgetProgress >= 80 ? (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-3 flex items-start gap-2.5 w-full text-xs">
                <FontAwesomeIcon icon={faExclamationTriangle} className="text-amber-500 text-sm mt-0.5" />
                <div>
                  <p className="font-extrabold uppercase tracking-wide">Warning: Nearing Limit</p>
                  <p className="mt-0.5">You have only {formatCurrency(budgetRemaining)} left in your monthly budget.</p>
                </div>
              </div>
            ) : (
              <div className="bg-green-50 border border-green-200 text-green-800 rounded-xl p-3 flex items-start gap-2.5 w-full text-xs">
                <FontAwesomeIcon icon={faCheckCircle} className="text-green-500 text-sm mt-0.5" />
                <div>
                  <p className="font-extrabold uppercase tracking-wide">Budget Health Good</p>
                  <p className="mt-0.5">You have {formatCurrency(budgetRemaining)} remaining safely to spend.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Dashboard Layout Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
        
        {/* Left Column: Visual Charts Analytics (8/12 layout) */}
        <div className="lg:col-span-8 flex flex-col gap-6 md:gap-8">
          
          {/* Income vs Expenses Grouped Bar Chart */}
          <div className="bg-white border border-gray-100 rounded-2xl p-4 md:p-6 shadow-sm hover:shadow-md transition-all duration-300">
            <h3 className="text-base sm:text-lg font-extrabold text-gray-800 mb-4 flex items-center gap-2">
              <span className="inline-block w-1.5 h-5 bg-indigo-600 rounded"></span>
              <span>Income vs Expense Trend</span>
            </h3>
            <div className="h-64 sm:h-80 w-full text-xs">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="name" stroke="#9ca3af" tickLine={false} />
                  <YAxis stroke="#9ca3af" tickLine={false} />
                  <Tooltip 
                    formatter={(value) => [`₹${value.toLocaleString()}`, undefined]}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #f3f4f6', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}
                  />
                  <Legend verticalAlign="top" height={36} iconType="circle" />
                  <Bar dataKey="Income" fill="#10b981" radius={[4, 4, 0, 0]} name="Income" />
                  <Bar dataKey="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} name="Expenses" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Expense Category Breakdown Pie Chart */}
          <div className="bg-white border border-gray-100 rounded-2xl p-4 md:p-6 shadow-sm hover:shadow-md transition-all duration-300">
            <h3 className="text-base sm:text-lg font-extrabold text-gray-800 mb-4 flex items-center gap-2">
              <span className="inline-block w-1.5 h-5 bg-indigo-600 rounded"></span>
              <span>Expense Category Distribution</span>
            </h3>
            {pieChartData.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                <div className="h-56 sm:h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieChartData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={3}
                        isAnimationActive={true}
                        animationDuration={600}
                      >
                        {pieChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `₹${value.toLocaleString()}`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                
                {/* Custom Color Coded Category Legend List */}
                <div className="max-h-64 overflow-y-auto pr-2 space-y-2 text-xs">
                  {pieChartData.map((item, index) => {
                    const percentage = ((item.value / totalExpenses) * 100).toFixed(1);
                    return (
                      <div key={item.name} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }}></span>
                          <span className="font-semibold text-gray-700 truncate">{item.name}</span>
                        </div>
                        <div className="text-right flex-shrink-0 font-mono">
                          <span className="font-bold text-gray-800 mr-2">{formatCurrency(item.value)}</span>
                          <span className="text-gray-400 text-[10px]">({percentage}%)</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FontAwesomeIcon icon={faCalendarAlt} className="text-gray-300 text-4xl mb-3 animate-[pulse_2s_infinite]" />
                <p className="text-gray-500 text-sm font-semibold">No expenses recorded for this filter scope.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: AI Companion panel (4/12 layout) */}
        <div className="lg:col-span-4 flex flex-col gap-6 md:gap-8">
          
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 flex flex-col min-h-[500px] overflow-hidden">
            {/* Tab navigation headers */}
            <div className="flex border-b border-gray-100 font-bold text-xs bg-gray-50/50">
              <button 
                onClick={() => setActiveRightTab('ai')}
                className={`flex-1 py-3 text-center transition-colors border-b-2 cursor-pointer ${
                  activeRightTab === 'ai' 
                    ? 'border-indigo-600 text-indigo-600 bg-white' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100/50'
                }`}
              >
                <FontAwesomeIcon icon={faRobot} className="mr-1.5" /> Aura AI Copilot
              </button>
              <button 
                onClick={() => setActiveRightTab('activity')}
                className={`flex-1 py-3 text-center transition-colors border-b-2 cursor-pointer ${
                  activeRightTab === 'activity' 
                    ? 'border-indigo-600 text-indigo-600 bg-white' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100/50'
                }`}
              >
                <FontAwesomeIcon icon={faList} className="mr-1.5" /> Live Logs
              </button>
              <button 
                onClick={() => setActiveRightTab('insights')}
                className={`flex-1 py-3 text-center transition-colors border-b-2 cursor-pointer ${
                  activeRightTab === 'insights' 
                    ? 'border-indigo-600 text-indigo-600 bg-white' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100/50'
                }`}
              >
                <FontAwesomeIcon icon={faLightbulb} className="mr-1.5" /> AI Insights
              </button>
            </div>

            {/* Panel Contents */}
            <div className="p-4 flex-1 flex flex-col overflow-hidden bg-white">
              
              {/* Tab 1: Aura AI Copilot chatbot */}
              {activeRightTab === 'ai' && (
                <div className="flex-1 flex flex-col overflow-hidden">
                  
                  {/* Chat messages viewport */}
                  <div className="flex-1 overflow-y-auto max-h-[300px] space-y-3 mb-4 pr-1 text-xs">
                    {chatMessages.map((msg, index) => (
                      <div 
                        key={index} 
                        className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                      >
                        <div className={`p-2.5 rounded-2xl max-w-[85%] whitespace-pre-wrap leading-relaxed ${
                          msg.sender === 'user' 
                            ? 'bg-indigo-600 text-white rounded-tr-none' 
                            : 'bg-gray-100 text-gray-800 rounded-tl-none border border-gray-200/50'
                        }`}>
                          {msg.text}
                        </div>
                      </div>
                    ))}
                    {isTyping && (
                      <div className="flex items-center space-x-1.5 bg-gray-100 text-gray-500 p-2.5 rounded-2xl rounded-tl-none w-16 border border-gray-200/50">
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></span>
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></span>
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></span>
                      </div>
                    )}
                  </div>

                  {/* Suggestion prompt tags */}
                  <div className="mb-3 flex flex-wrap gap-1.5">
                    <button 
                      onClick={() => handleSendMessage(null, "📊 Analyze spending habit")}
                      className="text-[10px] font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 py-1 px-2 rounded-lg cursor-pointer transition-colors border border-indigo-100/55"
                      disabled={isTyping}
                    >
                      📊 Spending Diagnostic
                    </button>
                    <button 
                      onClick={() => handleSendMessage(null, "🔮 Forecast next month balance")}
                      className="text-[10px] font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 py-1 px-2 rounded-lg cursor-pointer transition-colors border border-indigo-100/55"
                      disabled={isTyping}
                    >
                      🔮 Next Month Forecast
                    </button>
                    <button 
                      onClick={() => handleSendMessage(null, "💻 Can I afford a purchase of ₹25,000?")}
                      className="text-[10px] font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 py-1 px-2 rounded-lg cursor-pointer transition-colors border border-indigo-100/55"
                      disabled={isTyping}
                    >
                      💻 Affordability Checker
                    </button>
                  </div>

                  {/* Input Form */}
                  <form onSubmit={handleSendMessage} className="flex gap-2 border-t border-gray-100 pt-3">
                    <input
                      type="text"
                      placeholder="Ask Aura anything..."
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      disabled={isTyping}
                      className="flex-1 text-xs border border-gray-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-medium"
                    />
                    <button 
                      type="submit"
                      disabled={isTyping || !chatInput.trim()}
                      className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 text-white rounded-xl w-10 flex items-center justify-center cursor-pointer transition-colors"
                    >
                      <FontAwesomeIcon icon={faPaperPlane} className="text-xs" />
                    </button>
                  </form>
                </div>
              )}

              {/* Tab 2: Recent Activity live logs */}
              {activeRightTab === 'activity' && (
                <div className="flex-1 flex flex-col overflow-hidden">
                  {recentTransactions.length > 0 ? (
                    <div className="space-y-3.5 overflow-y-auto max-h-[380px] pr-1 flex-1">
                      {recentTransactions.map((item) => {
                        const isExp = item.displayType === 'Expense';
                        return (
                          <div key={item.id} className="flex items-center justify-between p-2.5 rounded-xl border border-gray-100/50 hover:border-gray-200 bg-gray-50/30 hover:bg-gray-50 transition-all duration-300">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 font-bold text-xs ${
                                isExp ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
                              }`}>
                                <FontAwesomeIcon icon={isExp ? faArrowTrendDown : faArrowTrendUp} />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-gray-700 truncate leading-snug">
                                  {item.description || (isExp ? item.category : 'Income Deposit')}
                                </p>
                                <div className="flex items-center gap-2 mt-0.5 text-[10px] text-gray-400 font-semibold">
                                  <span>{formatDate(item.date)}</span>
                                  {isExp && item.category && (
                                    <>
                                      <span>•</span>
                                      <span className="text-indigo-600">{item.category}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className={`text-right font-mono font-bold text-xs flex-shrink-0 ${
                              isExp ? 'text-red-600' : 'text-green-600'
                            }`}>
                              {isExp ? '-' : '+'}{formatCurrency(item.amount)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
                      <FontAwesomeIcon icon={faWallet} className="text-gray-300 text-4xl mb-2" />
                      <p className="text-gray-500 text-xs font-semibold">No recent transactions logged.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3: Insights list */}
              {activeRightTab === 'insights' && (
                <div className="flex-1 overflow-y-auto max-h-[380px] space-y-3">
                  {smartInsights.map((insight, idx) => (
                    <div key={idx} className={`p-3 rounded-xl border border-solid text-xs ${insight.colorClass} flex gap-3 items-start transition-all duration-300 hover:scale-102`}>
                      <FontAwesomeIcon icon={insight.icon} className="text-sm mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-extrabold uppercase tracking-wide text-[9px]">{insight.title}</p>
                        <p className="mt-0.5 font-semibold leading-relaxed">{insight.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
