import React, { useState } from 'react';
import { collection, query, where, getDocs, writeBatch, doc, Timestamp, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import * as XLSX from 'xlsx';

const ArchiveList = () => {
  // Set current date as default
  const currentDate = new Date();
  const [month, setMonth] = useState((currentDate.getMonth() + 1).toString());
  const [year, setYear] = useState(currentDate.getFullYear().toString());
  const [archives, setArchives] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('view');
  const [archiveResult, setArchiveResult] = useState(null);
  const [confirmArchive, setConfirmArchive] = useState(false);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({length: 5}, (_, i) => currentYear - i);

  // Correct date range calculation
  const getDateRange = (selectedMonth, selectedYear) => {
    const startDate = new Date(selectedYear, selectedMonth - 1, 1);
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(selectedYear, selectedMonth, 0);
    endDate.setHours(23, 59, 59, 999);
    
    return {
      startDate: Timestamp.fromDate(startDate),
      endDate: Timestamp.fromDate(endDate),
      startDateStr: startDate.toISOString().split('T')[0],
      endDateStr: endDate.toISOString().split('T')[0]
    };
  };

  // Archive viewing
  const handleViewArchives = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setLoading(true);
    setArchives([]);

    const currentUser = auth.currentUser;
    if (!currentUser) {
      setError('Please login to view archives.');
      setLoading(false);
      return;
    }

    if (!month || !year) {
      setError('Please select both month and year.');
      setLoading(false);
      return;
    }

    try {
      const { startDate, endDate } = getDateRange(parseInt(month), parseInt(year));

      const expensesQuery = query(
        collection(db, 'expenses'),
        where('userId', '==', currentUser.uid),
        where('date', '>=', startDate),
        where('date', '<=', endDate)
      );

      const incomeQuery = query(
        collection(db, 'income'),
        where('userId', '==', currentUser.uid),
        where('date', '>=', startDate),
        where('date', '<=', endDate)
      );

      const [expensesSnapshot, incomeSnapshot] = await Promise.all([
        getDocs(expensesQuery),
        getDocs(incomeQuery)
      ]);

      const allExpenses = expensesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        type: 'expense'
      }));

      const allIncome = incomeSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        type: 'income'
      }));

      // Filter for archived items only
      const archivedExpenses = allExpenses.filter(expense => expense.archived === true);
      const archivedIncome = allIncome.filter(income => income.archived === true);

      const allArchives = [...archivedExpenses, ...archivedIncome].sort((a, b) => {
        const dateA = a.date?.toDate ? a.date.toDate() : new Date(a.date);
        const dateB = b.date?.toDate ? b.date.toDate() : new Date(b.date);
        return dateB - dateA;
      });

      if (allArchives.length === 0) {
        const totalTransactions = allExpenses.length + allIncome.length;
        const unarchivedCount = allExpenses.filter(exp => exp.archived !== true).length + 
                               allIncome.filter(inc => inc.archived !== true).length;
        
        setError(`No archived data found for ${months[parseInt(month) - 1]} ${year}. 
        Found ${totalTransactions} total transactions, but none are archived.
        There are ${unarchivedCount} unarchived transactions available. 
        Switch to "Create Archive" tab to archive them.`);
      }

      setArchives(allArchives);

    } catch (err) {
      setError('Failed to fetch archives. Please try again. Error: ' + err.message);
      setArchives([]);
    } finally {
      setLoading(false);
    }
  };

  // Archive creation
  const handleCreateArchive = async (e) => {
    e.preventDefault();
    setError('');
    setArchiveResult(null);
    setLoading(true);

    const currentUser = auth.currentUser;
    if (!currentUser) {
      setError('Please login to create archives.');
      setLoading(false);
      return;
    }

    if (!month || !year) {
      setError('Please select both month and year.');
      setLoading(false);
      return;
    }

    try {
      const { startDate, endDate } = getDateRange(parseInt(month), parseInt(year));

      // Get ALL expenses and income in the date range
      const expensesQuery = query(
        collection(db, 'expenses'),
        where('userId', '==', currentUser.uid),
        where('date', '>=', startDate),
        where('date', '<=', endDate)
      );

      const incomeQuery = query(
        collection(db, 'income'),
        where('userId', '==', currentUser.uid),
        where('date', '>=', startDate),
        where('date', '<=', endDate)
      );

      const [expensesSnapshot, incomeSnapshot] = await Promise.all([
        getDocs(expensesQuery),
        getDocs(incomeQuery)
      ]);

      // Filter for items that are NOT archived (handles undefined, false, null)
      const expensesToArchive = expensesSnapshot.docs.filter(doc => {
        const data = doc.data();
        return data.archived !== true;
      });
      
      const incomeToArchive = incomeSnapshot.docs.filter(doc => {
        const data = doc.data();
        return data.archived !== true;
      });

      if (expensesToArchive.length === 0 && incomeToArchive.length === 0) {
        setError(`No unarchived data found for ${months[parseInt(month) - 1]} ${year}. All data is already archived.`);
        setLoading(false);
        return;
      }

      // Create batch to update all documents
      const batch = writeBatch(db);

      expensesToArchive.forEach(expenseDoc => {
        const expenseRef = doc(db, 'expenses', expenseDoc.id);
        batch.update(expenseRef, {
          archived: true,
          archive_date: serverTimestamp()
        });
      });

      incomeToArchive.forEach(incomeDoc => {
        const incomeRef = doc(db, 'income', incomeDoc.id);
        batch.update(incomeRef, {
          archived: true,
          archive_date: serverTimestamp()
        });
      });

      await batch.commit();

      setArchiveResult({
        archived_expenses_count: expensesToArchive.length,
        archived_income_count: incomeToArchive.length,
        archive_date: new Date().toISOString()
      });

      setConfirmArchive(false);
      setError('');

      // Refresh the archive view
      setTimeout(() => {
        handleViewArchives();
      }, 1500);

    } catch (err) {
      setError('Failed to create archive. Please try again. Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Download functionality
  const handleDownloadArchive = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const currentUser = auth.currentUser;
    if (!currentUser) {
      setError('Please login to download archives.');
      setLoading(false);
      return;
    }

    if (!month || !year) {
      setError('Please select both month and year.');
      setLoading(false);
      return;
    }

    try {
      const { startDate, endDate, startDateStr, endDateStr } = getDateRange(parseInt(month), parseInt(year));

      // Get all expenses and income for the period
      const expensesQuery = query(
        collection(db, 'expenses'),
        where('userId', '==', currentUser.uid),
        where('date', '>=', startDate),
        where('date', '<=', endDate)
      );

      const incomeQuery = query(
        collection(db, 'income'),
        where('userId', '==', currentUser.uid),
        where('date', '>=', startDate),
        where('date', '<=', endDate)
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

      if (expenses.length === 0 && income.length === 0) {
        setError(`No data found for ${months[parseInt(month) - 1]} ${year}.`);
        setLoading(false);
        return;
      }

      // Create Excel workbook
      const wb = XLSX.utils.book_new();

      // Format expenses data
      const formattedExpenses = expenses.map(expense => ({
        'Invoice ID': expense.invoice_id || '',
        'Type': 'Expense',
        'Category': expense.category || 'Uncategorized',
        'Description': expense.description || '',
        'Amount': parseFloat(expense.amount || 0),
        'Date': expense.date?.toDate?.().toLocaleDateString('en-IN') || 'N/A',
        'Archived': expense.archived === true ? 'Yes' : 'No',
        'Archive Date': expense.archive_date?.toDate?.().toLocaleDateString('en-IN') || 'N/A'
      }));

      // Format income data
      const formattedIncome = income.map(inc => ({
        'Invoice ID': inc.invoice_id || '',
        'Type': 'Income',
        'Category': 'Income',
        'Description': inc.description || '',
        'Amount': parseFloat(inc.amount || 0),
        'Date': inc.date?.toDate?.().toLocaleDateString('en-IN') || 'N/A',
        'Archived': inc.archived === true ? 'Yes' : 'No',
        'Archive Date': inc.archive_date?.toDate?.().toLocaleDateString('en-IN') || 'N/A'
      }));

      // Combine all data
      const allData = [...formattedExpenses, ...formattedIncome];

      // Add main data sheet
      const ws = XLSX.utils.json_to_sheet(allData);
      XLSX.utils.book_append_sheet(wb, ws, 'All Transactions');

      // Add summary sheet
      const totalIncome = formattedIncome.reduce((sum, item) => sum + item.Amount, 0);
      const totalExpenses = formattedExpenses.reduce((sum, item) => sum + item.Amount, 0);
      const netProfitLoss = totalIncome - totalExpenses;

      const summaryData = [
        ['Archive Summary', ''],
        ['Period', `${startDateStr} to ${endDateStr}`],
        ['Month', `${months[parseInt(month) - 1]} ${year}`],
        ['', ''],
        ['Total Income', totalIncome],
        ['Total Expenses', totalExpenses],
        ['Net Profit/Loss', netProfitLoss],
        ['', ''],
        ['Total Transactions', allData.length],
        ['Income Transactions', formattedIncome.length],
        ['Expense Transactions', formattedExpenses.length],
        ['Archived Transactions', allData.filter(item => item.Archived === 'Yes').length],
        ['', ''],
        ['Generated On', new Date().toLocaleDateString('en-IN')],
        ['Generated By', currentUser.email || 'Unknown']
      ];

      const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');

      // Generate and download file
      const filename = `BidAccounting_Archive_${year}_${month.toString().padStart(2, '0')}.xlsx`;
      XLSX.writeFile(wb, filename);

    } catch (err) {
      setError('Failed to download archive. Please try again. Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const TabButton = ({ tabId, label, isActive, onClick }) => (
    <button
      onClick={() => onClick(tabId)}
      className={`px-4 py-2 font-medium text-sm rounded-lg transition-all duration-200 ${
        isActive
          ? 'bg-blue-600 text-white shadow-md'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`}
    >
      {label}
    </button>
  );

  const FormSection = ({ title, children, onSubmit, submitLabel, submitDisabled = false }) => (
    <div className="bg-white shadow-md rounded-lg p-6">
      <h3 className="text-lg font-semibold mb-4 text-gray-800">{title}</h3>
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="month" className="block text-sm font-medium text-gray-700 mb-1">Month</label>
            <select
              id="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="">Select Month</option>
              {months.map((monthName, index) => (
                <option key={index + 1} value={index + 1}>{monthName}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="year" className="block text-sm font-medium text-gray-700 mb-1">Year</label>
            <select
              id="year"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="">Select Year</option>
              {years.map(yearOption => (
                <option key={yearOption} value={yearOption}>{yearOption}</option>
              ))}
            </select>
          </div>
        </div>
        
        {children}
        
        <button
          onClick={onSubmit}
          disabled={loading || submitDisabled || !month || !year}
          className={`w-full py-2 px-4 rounded-md font-medium transition-all duration-300 ${
            loading || submitDisabled || !month || !year
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
          } text-white`}
        >
          {loading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </span>
          ) : (
            submitLabel
          )}
        </button>
      </div>
    </div>
  );

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

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-6 text-center sm:text-left">
        <span className="inline-block pb-2 border-b-2 border-blue-500">Archive Management</span>
      </h2>
      
      {error && (
        <div className={`border-l-4 p-4 mb-6 rounded-md ${
          error.includes('No archived data found') 
            ? 'bg-yellow-50 border-yellow-500 text-yellow-700'
            : 'bg-red-50 border-red-500 text-red-700'
        }`}>
          <span>{error}</span>
        </div>
      )}

      {archiveResult && (
        <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-6 rounded-md">
          <div className="text-green-700">
            <h4 className="font-medium">Archive Created Successfully!</h4>
            <p className="text-sm mt-1">
              Archived {archiveResult.archived_expenses_count} expenses and {archiveResult.archived_income_count} income entries
            </p>
            <p className="text-sm">Archive Date: {new Date(archiveResult.archive_date).toLocaleDateString()}</p>
          </div>
        </div>
      )}
      
      {/* Tab Navigation */}
      <div className="flex space-x-2 mb-6 bg-gray-50 p-2 rounded-lg">
        <TabButton
          tabId="view"
          label="View Archives"
          isActive={activeTab === 'view'}
          onClick={setActiveTab}
        />
        <TabButton
          tabId="create"
          label="Create Archive"
          isActive={activeTab === 'create'}
          onClick={setActiveTab}
        />
        <TabButton
          tabId="download"
          label="Download Archive"
          isActive={activeTab === 'download'}
          onClick={setActiveTab}
        />
      </div>

      {/* Tab Content */}
      {activeTab === 'view' && (
        <>
          <FormSection
            title="View Archived Data"
            onSubmit={handleViewArchives}
            submitLabel="Get Archives"
          />

          {archives.length === 0 && !loading ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center mt-6">
              <span className="text-yellow-700 font-medium">
                No archived data found for {month && year ? `${months[parseInt(month) - 1]} ${year}` : 'the selected period'}.
                <br />
                <span className="text-sm text-yellow-600 mt-2 block">
                  Switch to "Create Archive" tab to archive your transactions.
                </span>
              </span>
            </div>
          ) : archives.length > 0 ? (
            <div className="bg-white shadow-md rounded-lg overflow-hidden mt-6">
              <div className="px-4 py-3 bg-gray-50 border-b">
                <h3 className="text-lg font-medium text-gray-900">
                  Archived Data for {months[parseInt(month) - 1]} {year} ({archives.length} records)
                </h3>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Invoice ID
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                        Category
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                        Description
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                        Date Created
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                        Archive Date
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {archives.map((archive) => (
                      <tr key={archive.id} className="hover:bg-gray-50">
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            archive.type === 'income' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {archive.type}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className="font-medium text-gray-900">{archive.invoice_id}</span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className={`text-sm font-semibold ${
                            archive.type === 'income' ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {archive.type === 'income' ? '+' : '-'}₹{parseFloat(archive.amount).toLocaleString()}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap hidden sm:table-cell">
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-indigo-100 text-indigo-800">
                            {archive.category || (archive.type === 'income' ? 'Income' : 'Uncategorized')}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap hidden md:table-cell">
                          <span className="text-sm text-gray-500">{archive.description || 'N/A'}</span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap hidden lg:table-cell">
                          <span className="text-sm text-gray-500">{formatDate(archive.date)}</span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap hidden lg:table-cell">
                          <span className="text-sm text-gray-500">{formatDate(archive.archive_date)}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </>
      )}

      {activeTab === 'create' && (
        <FormSection
          title="Create New Archive"
          onSubmit={handleCreateArchive}
          submitLabel="Create Archive"
          submitDisabled={!confirmArchive}
        >
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">Warning</h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>Creating an archive will mark all expenses and income for the selected month as archived. This helps organize your data but doesn't delete anything.</p>
                </div>
                <div className="mt-3">
                  <div className="flex items-center">
                    <input
                      id="confirm-archive"
                      type="checkbox"
                      checked={confirmArchive}
                      onChange={(e) => setConfirmArchive(e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="confirm-archive" className="ml-2 text-sm text-yellow-700">
                      I understand and want to proceed with archiving
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </FormSection>
      )}

      {activeTab === 'download' && (
        <FormSection
          title="Download Archive Excel"
          onSubmit={handleDownloadArchive}
          submitLabel="Download Excel"
        >
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">Download Information</h3>
                <div className="mt-2 text-sm text-blue-700">
                  <p>This will generate and download an Excel file containing all financial data for the selected month, including expenses, income, and summary sheets.</p>
                </div>
              </div>
            </div>
          </div>
        </FormSection>
      )}
    </div>
  );
};

export default ArchiveList;