import React, { useState, useEffect, useRef } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import { collection, query, where, getDocs, orderBy, startAt, endAt, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { auth } from '../config/firebase';

const ProfitLoss = () => {
    const [profitLossData, setProfitLossData] = useState(null);
    const [error, setError] = useState('');
    const [chartData, setChartData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isVisible, setIsVisible] = useState(false);
    const [displayCount, setDisplayCount] = useState(5);
    const [chartRendered, setChartRendered] = useState(false);
    const [reportType, setReportType] = useState('current-month');
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedWeek, setSelectedWeek] = useState(1);
    const [selectedQuarter, setSelectedQuarter] = useState(1);
    const [yearSummaryData, setYearSummaryData] = useState(null);
    const chartContainerRef = useRef(null);

    // Define colors for pie chart segments
    const COLORS = ['#8884d8', '#83a6ed', '#8dd1e1', '#82ca9d', '#a4de6c', '#d0ed57', '#ffc658', '#ff8042', '#ff6361', '#bc5090'];

    const reportTypes = [
        { value: 'current-month', label: 'Current Month' },
        { value: 'monthly', label: 'Specific Month' },
        { value: 'weekly', label: 'Weekly Report' },
        { value: 'quarterly', label: 'Quarterly Report' },
        { value: 'year-summary', label: 'Year Summary' }
    ];

    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const quarters = [
        { value: 1, label: 'Q1 (Jan-Mar)' },
        { value: 2, label: 'Q2 (Apr-Jun)' },
        { value: 3, label: 'Q3 (Jul-Sep)' },
        { value: 4, label: 'Q4 (Oct-Dec)' }
    ];

    // Helper function to get date ranges
    const getDateRange = () => {
        const currentUser = auth.currentUser;
        if (!currentUser) return { startDate: null, endDate: null };

        let startDate, endDate;

        switch (reportType) {
            case 'current-month':
                const now = new Date();
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
                break;
            case 'monthly':
                startDate = new Date(selectedYear, selectedMonth - 1, 1);
                endDate = new Date(selectedYear, selectedMonth, 0, 23, 59, 59);
                break;
            case 'weekly':
                // Simple week calculation - you might want to improve this
                const weekStart = new Date(selectedYear, 0, 1);
                const daysToAdd = (selectedWeek - 1) * 7;
                weekStart.setDate(weekStart.getDate() + daysToAdd);
                startDate = new Date(weekStart);
                endDate = new Date(weekStart);
                endDate.setDate(endDate.getDate() + 6);
                endDate.setHours(23, 59, 59);
                break;
            case 'quarterly':
                const quarterStartMonth = (selectedQuarter - 1) * 3;
                startDate = new Date(selectedYear, quarterStartMonth, 1);
                endDate = new Date(selectedYear, quarterStartMonth + 3, 0, 23, 59, 59);
                break;
            case 'year-summary':
                startDate = new Date(selectedYear, 0, 1);
                endDate = new Date(selectedYear, 11, 31, 23, 59, 59);
                break;
            default:
                return { startDate: null, endDate: null };
        }

        return {
            startDate: Timestamp.fromDate(startDate),
            endDate: Timestamp.fromDate(endDate),
            startDateStr: startDate.toISOString().split('T')[0],
            endDateStr: endDate.toISOString().split('T')[0]
        };
    };

    const fetchProfitLoss = async () => {
        const currentUser = auth.currentUser;
        if (!currentUser) {
            setError('Please login to view profit/loss data');
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            const { startDate, endDate, startDateStr, endDateStr } = getDateRange();
            
            if (!startDate || !endDate) {
                setError('Invalid date range');
                setIsLoading(false);
                return;
            }

            // Fetch expenses for the period
            const expensesQuery = query(
                collection(db, 'expenses'),
                where('userId', '==', currentUser.uid),
                where('date', '>=', startDate),
                where('date', '<=', endDate),
                orderBy('date', 'desc')
            );

            // Fetch income for the period
            const incomeQuery = query(
                collection(db, 'income'),
                where('userId', '==', currentUser.uid),
                where('date', '>=', startDate),
                where('date', '<=', endDate),
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

            // Calculate totals and categories
            const totalExpenses = expenses.reduce((sum, expense) => sum + parseFloat(expense.amount || 0), 0);
            const totalIncome = income.reduce((sum, inc) => sum + parseFloat(inc.amount || 0), 0);
            const netProfitLoss = totalIncome - totalExpenses;

            // Calculate expenses by category
            const expensesByCategory = {};
            expenses.forEach(expense => {
                const category = expense.category || 'Uncategorized';
                expensesByCategory[category] = (expensesByCategory[category] || 0) + parseFloat(expense.amount || 0);
            });

            const profitLossData = {
                total_income: totalIncome,
                total_expenses: totalExpenses,
                net_profit_loss: netProfitLoss,
                expenses_by_category: expensesByCategory,
                start_date: startDateStr,
                end_date: endDateStr
            };

            setProfitLossData(profitLossData);

            // Prepare chart data
            if (reportType !== 'year-summary') {
                if (totalExpenses > 0) {
                    const sortedExpenses = Object.entries(expensesByCategory)
                        .filter(([_, amount]) => amount > 0)
                        .map(([category, amount]) => ({
                            category,
                            amount,
                            percentage: ((amount / totalExpenses) * 100).toFixed(1)
                        }))
                        .sort((a, b) => b.amount - a.amount);
                    
                    if (sortedExpenses.length > displayCount) {
                        const topExpenses = sortedExpenses.slice(0, displayCount);
                        const otherExpenses = sortedExpenses.slice(displayCount);
                        
                        const othersTotal = otherExpenses.reduce((sum, item) => sum + item.amount, 0);
                        const othersPercentage = ((othersTotal / totalExpenses) * 100).toFixed(1);
                        
                        if (othersTotal > 0) {
                            topExpenses.push({
                                category: 'Others',
                                amount: othersTotal,
                                percentage: othersPercentage,
                                isOthers: true,
                                details: otherExpenses
                            });
                        }
                        
                        setChartData(topExpenses);
                    } else {
                        setChartData(sortedExpenses);
                    }
                } else {
                    setChartData([]);
                }
            }

            // For year summary, fetch monthly breakdown
            if (reportType === 'year-summary') {
                const monthlySummary = await fetchYearSummary(currentUser.uid, selectedYear);
                setYearSummaryData({
                    monthly_summary: monthlySummary,
                    year_totals: profitLossData
                });
            } else {
                setYearSummaryData(null);
            }

        } catch (err) {
            console.error('Firestore error:', err);
            setError('Failed to fetch profit/loss data. Please try again.');
        } finally {
            setIsLoading(false);
            setTimeout(() => setIsVisible(true), 100);
            setTimeout(() => setChartRendered(true), 300);
        }
    };

    const fetchYearSummary = async (userId, year) => {
        const monthlyData = [];
        
        for (let month = 0; month < 12; month++) {
            const startDate = new Date(year, month, 1);
            const endDate = new Date(year, month + 1, 0, 23, 59, 59);
            
            const expensesQuery = query(
                collection(db, 'expenses'),
                where('userId', '==', userId),
                where('date', '>=', Timestamp.fromDate(startDate)),
                where('date', '<=', Timestamp.fromDate(endDate))
            );

            const incomeQuery = query(
                collection(db, 'income'),
                where('userId', '==', userId),
                where('date', '>=', Timestamp.fromDate(startDate)),
                where('date', '<=', Timestamp.fromDate(endDate))
            );

            const [expensesSnapshot, incomeSnapshot] = await Promise.all([
                getDocs(expensesQuery),
                getDocs(incomeQuery)
            ]);

            const monthlyExpenses = expensesSnapshot.docs.reduce((sum, doc) => sum + parseFloat(doc.data().amount || 0), 0);
            const monthlyIncome = incomeSnapshot.docs.reduce((sum, doc) => sum + parseFloat(doc.data().amount || 0), 0);
            const monthlyNet = monthlyIncome - monthlyExpenses;

            monthlyData.push({
                month: month + 1,
                month_name: months[month],
                total_income: monthlyIncome,
                total_expenses: monthlyExpenses,
                net_profit_loss: monthlyNet
            });
        }

        return monthlyData;
    };

    useEffect(() => {
        fetchProfitLoss();
    }, [reportType, selectedYear, selectedMonth, selectedWeek, selectedQuarter, displayCount]);

    useEffect(() => {
        const handleResize = () => {
            if (chartRendered) {
                setChartRendered(false);
                setTimeout(() => setChartRendered(true), 100);
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [chartRendered]);

    useEffect(() => {
        if (!isLoading && chartData.length > 0) {
            setTimeout(() => setChartRendered(true), 300);
        }
    }, [chartData, isLoading]);

    const handleShowMoreLess = () => {
        if (displayCount === 5) {
            const nonZeroCategoryCount = Object.entries(profitLossData.expenses_by_category)
                .filter(([_, amount]) => amount > 0).length;
            setDisplayCount(nonZeroCategoryCount);
        } else {
            setDisplayCount(5);
        }
    };

    const getReportTitle = () => {
        switch (reportType) {
            case 'current-month':
                return 'Current Month Financial Summary';
            case 'monthly':
                return `${months[selectedMonth - 1]} ${selectedYear} Financial Summary`;
            case 'weekly':
                return `Week ${selectedWeek}, ${selectedYear} Financial Summary`;
            case 'quarterly':
                return `Q${selectedQuarter} ${selectedYear} Financial Summary`;
            case 'year-summary':
                return `${selectedYear} Year Summary`;
            default:
                return 'Financial Summary';
        }
    };

    const getReportSubtitle = () => {
        switch (reportType) {
            case 'weekly':
                return profitLossData ? `${profitLossData.start_date} to ${profitLossData.end_date}` : '';
            case 'quarterly':
                const quarterMonths = months.slice((selectedQuarter - 1) * 3, selectedQuarter * 3);
                return quarterMonths.join(', ');
            case 'year-summary':
                return 'Monthly breakdown and annual totals';
            default:
                return 'Detailed profit/loss analysis';
        }
    };

    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white p-2 sm:p-3 shadow-lg rounded-md border border-gray-200 text-xs sm:text-sm">
                    <p className="font-medium">{payload[0].name}</p>
                    <p>₹{payload[0].value.toLocaleString()}</p>
                    <p className="text-gray-600">{payload[0].payload.percentage}% of total</p>
                </div>
            );
        }
        return null;
    };

    const animationClasses = isVisible 
        ? "opacity-100 translate-y-0 transition-all duration-700" 
        : "opacity-0 translate-y-8 transition-all duration-700";

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-32 bg-red-50 rounded-lg p-4">
                <span className="text-red-500 font-medium">{error}</span>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-64 p-8">
                <div className="w-12 h-12 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin mb-4"></div>
                <span className="text-gray-600">Loading profit/loss data...</span>
            </div>
        );
    }

    const nonZeroCategoryCount = profitLossData?.expenses_by_category ? 
        Object.entries(profitLossData.expenses_by_category).filter(([_, amount]) => amount > 0).length : 0;

    return (
        <div className="w-full px-2 sm:px-4 mx-auto">
            {/* Report Type Selector */}
            <div className={`mb-6 ${animationClasses}`} style={{ transitionDelay: '50ms' }}>
                <div className="bg-white rounded-lg p-4 shadow-sm border">
                    <h3 className="text-lg font-semibold mb-4">Report Configuration</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Report Type</label>
                            <select 
                                value={reportType} 
                                onChange={(e) => setReportType(e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                {reportTypes.map(type => (
                                    <option key={type.value} value={type.value}>{type.label}</option>
                                ))}
                            </select>
                        </div>

                        {(reportType === 'monthly' || reportType === 'weekly' || reportType === 'quarterly' || reportType === 'year-summary') && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
                                <select 
                                    value={selectedYear} 
                                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    {Array.from({length: 5}, (_, i) => new Date().getFullYear() - i).map(year => (
                                        <option key={year} value={year}>{year}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {reportType === 'monthly' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Month</label>
                                <select 
                                    value={selectedMonth} 
                                    onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    {months.map((month, index) => (
                                        <option key={index + 1} value={index + 1}>{month}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {reportType === 'weekly' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Week</label>
                                <select 
                                    value={selectedWeek} 
                                    onChange={(e) => setSelectedWeek(parseInt(e.target.value))}
                                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    {Array.from({length: 52}, (_, i) => i + 1).map(week => (
                                        <option key={week} value={week}>Week {week}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {reportType === 'quarterly' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Quarter</label>
                                <select 
                                    value={selectedQuarter} 
                                    onChange={(e) => setSelectedQuarter(parseInt(e.target.value))}
                                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    {quarters.map(quarter => (
                                        <option key={quarter.value} value={quarter.value}>{quarter.label}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Report Header */}
            <div className={`mb-4 sm:mb-6 ${animationClasses}`} style={{ transitionDelay: '100ms' }}>
                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-1 sm:mb-2">
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
                        {getReportTitle()}
                    </span>
                </h2>
                <p className="text-sm sm:text-base text-gray-500">{getReportSubtitle()}</p>
            </div>

            {/* Year Summary View */}
            {reportType === 'year-summary' && yearSummaryData && (
                <div className="bg-white shadow-lg rounded-xl p-3 sm:p-4 md:p-6 mb-6">
                    <h3 className="text-lg font-bold mb-4">Monthly Breakdown</h3>
                    <div className="h-64 sm:h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={yearSummaryData.monthly_summary}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="month_name" />
                                <YAxis />
                                <Tooltip formatter={(value) => `₹${value.toLocaleString()}`} />
                                <Legend />
                                <Line type="monotone" dataKey="total_income" stroke="#10B981" name="Income" strokeWidth={2} />
                                <Line type="monotone" dataKey="total_expenses" stroke="#EF4444" name="Expenses" strokeWidth={2} />
                                <Line type="monotone" dataKey="net_profit_loss" stroke="#3B82F6" name="Net P&L" strokeWidth={2} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}
            
            {profitLossData && (
                <div className="bg-white shadow-lg rounded-xl p-3 sm:p-4 md:p-6 overflow-hidden">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-8">
                        <div className={`bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-3 sm:p-5 border-l-4 border-blue-500 ${animationClasses}`} style={{ transitionDelay: '200ms' }}>
                            <span className="text-xs sm:text-sm text-blue-600 font-medium uppercase tracking-wider">Total Income</span>
                            <div className="mt-1 sm:mt-2 flex items-end">
                                <span className="text-lg sm:text-2xl md:text-3xl font-bold text-blue-700">₹</span>
                                <span className="text-lg sm:text-2xl md:text-3xl font-bold text-blue-700 ml-1">{profitLossData.total_income.toLocaleString()}</span>
                            </div>
                        </div>
                        
                        <div className={`bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-3 sm:p-5 border-l-4 border-red-500 ${animationClasses}`} style={{ transitionDelay: '300ms' }}>
                            <span className="text-xs sm:text-sm text-red-600 font-medium uppercase tracking-wider">Total Expenses</span>
                            <div className="mt-1 sm:mt-2 flex items-end">
                                <span className="text-lg sm:text-2xl md:text-3xl font-bold text-red-700">₹</span>
                                <span className="text-lg sm:text-2xl md:text-3xl font-bold text-red-700 ml-1">{profitLossData.total_expenses.toLocaleString()}</span>
                            </div>
                        </div>
                        
                        <div className={`bg-gradient-to-br ${profitLossData.net_profit_loss >= 0 ? 'from-green-50 to-green-100 border-green-500' : 'from-red-50 to-red-100 border-red-500'} rounded-lg p-3 sm:p-5 border-l-4 sm:col-span-2 lg:col-span-1 ${animationClasses}`} style={{ transitionDelay: '400ms' }}>
                            <span className={`text-xs sm:text-sm ${profitLossData.net_profit_loss >= 0 ? 'text-green-600' : 'text-red-600'} font-medium uppercase tracking-wider`}>
                                Net {profitLossData.net_profit_loss >= 0 ? 'Profit' : 'Loss'}
                            </span>
                            <div className="mt-1 sm:mt-2 flex items-end">
                                <span className={`text-lg sm:text-2xl md:text-3xl font-bold ${profitLossData.net_profit_loss >= 0 ? 'text-green-700' : 'text-red-700'}`}>₹</span>
                                <span className={`text-lg sm:text-2xl md:text-3xl font-bold ${profitLossData.net_profit_loss >= 0 ? 'text-green-700' : 'text-red-700'} ml-1`}>
                                    {Math.abs(profitLossData.net_profit_loss).toLocaleString()}
                                </span>
                            </div>
                        </div>
                    </div>
                    
                    {/* Chart Section - Only show for non-year-summary reports */}
                    {reportType !== 'year-summary' && (
                        <div className={`mt-6 sm:mt-10 ${animationClasses}`} style={{ transitionDelay: '500ms' }}>
                            <div className="flex justify-between items-center mb-4 sm:mb-6">
                                <h3 className="text-base sm:text-lg md:text-xl font-bold flex items-center">
                                    <span className="inline-block w-2 h-4 sm:h-6 bg-purple-500 mr-2 sm:mr-3 rounded"></span>
                                    <span>Expenses by Category</span>
                                </h3>
                                
                                {nonZeroCategoryCount > 5 && (
                                    <button 
                                        onClick={handleShowMoreLess}
                                        className="text-xs sm:text-sm text-blue-600 hover:text-blue-800 transition-colors font-medium"
                                    >
                                        {displayCount === 5 ? 'Show All' : 'Show Top 5'}
                                    </button>
                                )}
                            </div>
                            
                            {chartData.length > 0 ? (
                                <>
                                    <div 
                                        ref={chartContainerRef}
                                        className="h-56 sm:h-64 md:h-72 lg:h-96 mb-4 sm:mb-8 transform transition-transform duration-500 hover:scale-102"
                                    >
                                        {chartRendered && (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={chartData}
                                                        dataKey="amount"
                                                        nameKey="category"
                                                        cx="50%"
                                                        cy="50%"
                                                        outerRadius={window.innerWidth < 640 ? 70 : 90}
                                                        innerRadius={window.innerWidth < 640 ? 40 : 60}
                                                        fill="#8884d8"
                                                        stroke="#fff"
                                                        strokeWidth={2}
                                                        startAngle={90}
                                                        endAngle={-270}
                                                        animationBegin={0}
                                                        animationDuration={800}
                                                        paddingAngle={2}
                                                        minAngle={2}
                                                        isAnimationActive={true}
                                                    >
                                                        {chartData.map((entry, index) => (
                                                            <Cell 
                                                                key={`cell-${index}`} 
                                                                fill={COLORS[index % COLORS.length]} 
                                                            />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip content={<CustomTooltip />} />
                                                    <Legend 
                                                        formatter={(value) => {
                                                            const item = chartData.find(item => item.category === value);
                                                            return item ? `${value} (${item.percentage}%)` : value;
                                                        }}
                                                        wrapperStyle={{ fontSize: window.innerWidth < 640 ? '10px' : '12px' }}
                                                    />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        )}
                                    </div>
                                    
                                    {/* Expenses Table */}
                                    <div className="overflow-x-auto mt-4 sm:mt-8">
                                        <table className="min-w-full bg-white border border-gray-200 rounded-lg overflow-hidden text-xs sm:text-sm md:text-base">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="py-2 sm:py-3 px-2 sm:px-4 border-b text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                                                    <th className="py-2 sm:py-3 px-2 sm:px-4 border-b text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                                    <th className="py-2 sm:py-3 px-2 sm:px-4 border-b text-right text-xs font-medium text-gray-500 uppercase tracking-wider">% of Total</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {chartData.map((item, index) => (
                                                    <tr 
                                                        key={item.category}
                                                        className={`hover:bg-gray-50 transition-colors ${animationClasses} ${item.isOthers ? 'bg-gray-50' : ''}`}
                                                        style={{ transitionDelay: `${600 + (index * 100)}ms` }}
                                                    >
                                                        <td className="py-2 sm:py-3 px-2 sm:px-4 border-b text-gray-800">
                                                            <div className="flex items-center">
                                                                <span 
                                                                    className="w-2 sm:w-3 h-2 sm:h-3 rounded-full mr-1 sm:mr-2" 
                                                                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                                                ></span>
                                                                <span className="font-medium truncate max-w-[120px] sm:max-w-none">{item.category}</span>
                                                            </div>
                                                        </td>
                                                        <td className="py-2 sm:py-3 px-2 sm:px-4 border-b text-right font-medium text-gray-800">
                                                            <span>₹{item.amount.toLocaleString()}</span>
                                                        </td>
                                                        <td className="py-2 sm:py-3 px-2 sm:px-4 border-b text-right">
                                                            <span className={`inline-block ${item.isOthers ? 'bg-gray-200 text-gray-700' : 'bg-blue-100 text-blue-800'} rounded-full px-1 sm:px-2 py-0.5 sm:py-1 text-xs font-medium`}>
                                                                {item.percentage}%
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </>
                            ) : (
                                <div className="bg-gray-50 rounded-lg p-4 sm:p-8 text-center">
                                    <span className="text-gray-500 text-sm sm:text-base">No expense data available for this period</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ProfitLoss;