import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFileExport, faSpinner, faWifi, faCalendarAlt, faArchive, faDownload } from '@fortawesome/free-solid-svg-icons';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import * as XLSX from 'xlsx';

const ExportReport = () => {
    const [loading, setLoading] = useState(false);
    const [exportedFile, setExportedFile] = useState(null);
    const [error, setError] = useState('');
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const navigate = useNavigate();

    const months = [
        { value: 1, label: 'January' },
        { value: 2, label: 'February' },
        { value: 3, label: 'March' },
        { value: 4, label: 'April' },
        { value: 5, label: 'May' },
        { value: 6, label: 'June' },
        { value: 7, label: 'July' },
        { value: 8, label: 'August' },
        { value: 9, label: 'September' },
        { value: 10, label: 'October' },
        { value: 11, label: 'November' },
        { value: 12, label: 'December' }
    ];

    const years = Array.from({ length: 25 }, (_, i) => new Date().getFullYear() - i);

    const getDateRange = (exportType, year = selectedYear, month = selectedMonth) => {
        const now = new Date();
        let startDate, endDate;

        switch (exportType) {
            case 'current':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
                break;
            case 'previous':
                startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
                break;
            case 'specific':
                startDate = new Date(year, month - 1, 1);
                endDate = new Date(year, month, 0, 23, 59, 59);
                break;
            default:
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        }

        return {
            startDate: Timestamp.fromDate(startDate),
            endDate: Timestamp.fromDate(endDate),
            startDateStr: startDate.toISOString().split('T')[0],
            endDateStr: endDate.toISOString().split('T')[0]
        };
    };

    const fetchDataForExport = async (exportType) => {
        const currentUser = auth.currentUser;
        if (!currentUser) {
            throw new Error('Please login to export reports');
        }

        const { startDate, endDate, startDateStr, endDateStr } = getDateRange(exportType);

        // Fetch expenses
        const expensesQuery = query(
            collection(db, 'expenses'),
            where('userId', '==', currentUser.uid),
            where('date', '>=', startDate),
            where('date', '<=', endDate),
            orderBy('date', 'desc')
        );

        // Fetch income
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
            ...doc.data(),
            type: 'Expense'
        }));

        const income = incomeSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            type: 'Income'
        }));

        return { expenses, income, startDateStr, endDateStr };
    };

    const formatDataForExcel = (expenses, income) => {
        // Format expenses data
        const formattedExpenses = expenses.map(expense => ({
            'Date': expense.date?.toDate?.().toLocaleDateString('en-IN') || 'N/A',
            'Type': 'Expense',
            'Category': expense.category || 'Uncategorized',
            'Description': expense.description || '',
            'Amount': parseFloat(expense.amount || 0),
            'Invoice ID': expense.invoice_id || '',
            'Created At': expense.createdAt?.toDate?.().toLocaleDateString('en-IN') || 'N/A'
        }));

        // Format income data
        const formattedIncome = income.map(inc => ({
            'Date': inc.date?.toDate?.().toLocaleDateString('en-IN') || 'N/A',
            'Type': 'Income',
            'Category': 'Income',
            'Description': inc.description || '',
            'Amount': parseFloat(inc.amount || 0),
            'Invoice ID': inc.invoice_id || '',
            'Created At': inc.createdAt?.toDate?.().toLocaleDateString('en-IN') || 'N/A'
        }));

        // Combine and sort by date
        const allData = [...formattedExpenses, ...formattedIncome].sort((a, b) => 
            new Date(b.Date) - new Date(a.Date)
        );

        return allData;
    };

    const generateExcelFile = (data, startDateStr, endDateStr, exportType) => {
        // Create workbook
        const wb = XLSX.utils.book_new();

        // Add main data sheet
        const ws = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, 'Transactions');

        // Add summary sheet
        const totalIncome = data
            .filter(item => item.Type === 'Income')
            .reduce((sum, item) => sum + item.Amount, 0);

        const totalExpenses = data
            .filter(item => item.Type === 'Expense')
            .reduce((sum, item) => sum + item.Amount, 0);

        const netProfitLoss = totalIncome - totalExpenses;

        const summaryData = [
            ['Report Summary', ''],
            ['Period', `${startDateStr} to ${endDateStr}`],
            ['Total Income', totalIncome],
            ['Total Expenses', totalExpenses],
            ['Net Profit/Loss', netProfitLoss],
            ['Total Transactions', data.length],
            ['Income Transactions', data.filter(item => item.Type === 'Income').length],
            ['Expense Transactions', data.filter(item => item.Type === 'Expense').length],
            ['', ''],
            ['Generated On', new Date().toLocaleDateString('en-IN')],
            ['Generated By', auth.currentUser?.email || 'Unknown']
        ];

        const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');

        // Generate filename
        const period = exportType === 'current' ? 'current-month' : 
                      exportType === 'previous' ? 'previous-month' : 
                      `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}`;
        
        const filename = `BidAccounting_Report_${period}_${new Date().toISOString().slice(0, 10)}.xlsx`;

        // Export to file
        XLSX.writeFile(wb, filename);
        
        return filename;
    };

    const handleExport = async (exportType = 'current') => {
        setLoading(true);
        setError('');
        setExportedFile(null);
        
        try {
            // Check network connection first
            if (!navigator.onLine) {
                throw new Error('No internet connection. Please check your network.');
            }

            const { expenses, income, startDateStr, endDateStr } = await fetchDataForExport(exportType);

            if (expenses.length === 0 && income.length === 0) {
                throw new Error('No data found for the selected period.');
            }

            const formattedData = formatDataForExcel(expenses, income);
            const filename = generateExcelFile(formattedData, startDateStr, endDateStr, exportType);

            setExportedFile(filename);

        } catch (error) {
            console.error('Export error:', error);
            setError(error.message || 'Failed to export report. Please try again.');
            
            // Special handling for network errors
            if (error.message.includes('network') || error.message.includes('timed out')) {
                setError(prev => `${prev} If the problem persists, try a different network.`);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleArchive = async () => {
        setLoading(true);
        setError('');
        
        try {
            // For Firebase, archiving could mean marking documents as archived
            // This is a simplified version - you might want to implement actual archiving logic
            const { expenses, income } = await fetchDataForExport('specific');
            
            if (expenses.length === 0 && income.length === 0) {
                throw new Error('No data found to archive for the selected period.');
            }

            // In a real implementation, you would update documents to mark them as archived
            // For now, we'll just export the data
            const formattedData = formatDataForExcel(expenses, income);
            const filename = generateExcelFile(formattedData, 
                `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-01`,
                `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-31`,
                'archive'
            );

            setExportedFile(`${filename} (Archived)`);
            setError(''); // Clear any previous errors
            
        } catch (error) {
            console.error('Archive error:', error);
            setError(error.message || 'Failed to archive data. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white shadow-md rounded-lg p-6 max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold mb-6 text-gray-800 border-b pb-2">
                <FontAwesomeIcon icon={faFileExport} className="mr-3 text-blue-600" />
                Export Financial Reports
            </h2>
            
            <div className="mb-6">
                <p className="text-gray-600 mb-6">
                    Download Excel spreadsheets containing your expenses and income data for different time periods.
                    All data is exported directly from your Firebase database.
                </p>

                {/* Current Month Export */}
                <div className="mb-6 p-4 border border-gray-200 rounded-lg">
                    <h3 className="text-lg font-semibold mb-3 text-gray-700 flex items-center">
                        <FontAwesomeIcon icon={faCalendarAlt} className="mr-2 text-blue-500" />
                        Current Month
                    </h3>
                    <button
                        onClick={() => handleExport('current')}
                        disabled={loading}
                        className={`flex items-center px-4 py-2 rounded-md text-white 
                                   ${loading ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'}
                                   transition-colors duration-200 mr-3`}
                    >
                        {loading ? (
                            <>
                                <FontAwesomeIcon icon={faSpinner} spin className="mr-2" />
                                Exporting...
                            </>
                        ) : (
                            <>
                                <FontAwesomeIcon icon={faDownload} className="mr-2" />
                                Export Current Month
                            </>
                        )}
                    </button>
                </div>

                {/* Previous Month Export */}
                <div className="mb-6 p-4 border border-gray-200 rounded-lg">
                    <h3 className="text-lg font-semibold mb-3 text-gray-700 flex items-center">
                        <FontAwesomeIcon icon={faCalendarAlt} className="mr-2 text-green-500" />
                        Previous Month
                    </h3>
                    <button
                        onClick={() => handleExport('previous')}
                        disabled={loading}
                        className={`flex items-center px-4 py-2 rounded-md text-white 
                                   ${loading ? 'bg-green-400' : 'bg-green-600 hover:bg-green-700'}
                                   transition-colors duration-200`}
                    >
                        {loading ? (
                            <>
                                <FontAwesomeIcon icon={faSpinner} spin className="mr-2" />
                                Exporting...
                            </>
                        ) : (
                            <>
                                <FontAwesomeIcon icon={faDownload} className="mr-2" />
                                Export Previous Month
                            </>
                        )}
                    </button>
                </div>

                {/* Specific Month Export */}
                <div className="mb-6 p-4 border border-gray-200 rounded-lg">
                    <h3 className="text-lg font-semibold mb-3 text-gray-700 flex items-center">
                        <FontAwesomeIcon icon={faCalendarAlt} className="mr-2 text-purple-500" />
                        Specific Month
                    </h3>
                    <div className="flex items-center gap-3 mb-4">
                        <select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                            className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        >
                            {months.map(month => (
                                <option key={month.value} value={month.value}>
                                    {month.label}
                                </option>
                            ))}
                        </select>
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                            className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        >
                            {years.map(year => (
                                <option key={year} value={year}>
                                    {year}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => handleExport('specific')}
                            disabled={loading}
                            className={`flex items-center px-4 py-2 rounded-md text-white 
                                       ${loading ? 'bg-purple-400' : 'bg-purple-600 hover:bg-purple-700'}
                                       transition-colors duration-200`}
                        >
                            {loading ? (
                                <>
                                    <FontAwesomeIcon icon={faSpinner} spin className="mr-2" />
                                    Exporting...
                                </>
                            ) : (
                                <>
                                    <FontAwesomeIcon icon={faDownload} className="mr-2" />
                                    Download Specific Month
                                </>
                            )}
                        </button>
                        <button
                            onClick={handleArchive}
                            disabled={loading}
                            className={`flex items-center px-4 py-2 rounded-md text-white 
                                       ${loading ? 'bg-orange-400' : 'bg-orange-600 hover:bg-orange-700'}
                                       transition-colors duration-200`}
                        >
                            {loading ? (
                                <>
                                    <FontAwesomeIcon icon={faSpinner} spin className="mr-2" />
                                    Archiving...
                                </>
                            ) : (
                                <>
                                    <FontAwesomeIcon icon={faArchive} className="mr-2" />
                                    Archive Month
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
            
            {exportedFile && (
                <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded mb-4">
                    <p className="flex items-center">
                        <FontAwesomeIcon icon={faFileExport} className="mr-2" />
                        <span className="font-semibold">Success!</span> Report downloaded as: {exportedFile}
                    </p>
                </div>
            )}
            
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded">
                    <div className="flex items-start">
                        <FontAwesomeIcon icon={faWifi} className="mt-1 mr-2" />
                        <div>
                            <p className="font-semibold">Export Failed</p>
                            <p>{error}</p>
                            <button 
                                onClick={() => setError('')}
                                className="mt-2 text-sm text-red-600 hover:text-red-800"
                            >
                                Dismiss
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExportReport;