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
  faCalendar,
  faDownload,
  faSpinner
} from '@fortawesome/free-solid-svg-icons';
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons';
import { collection, query, where, getDocs, orderBy, doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, auth, storage } from '../config/firebase';
import { useRouter } from 'next/navigation';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas-pro';

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

  // States for sharing & receipt preview modal
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [isSharing, setIsSharing] = useState(false);
  
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
  
  const router = useRouter();

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

  const generateReceiptPdfBlob = async (item) => {
    // Create a temporary container
    const div = document.createElement('div');
    div.style.position = 'absolute';
    div.style.left = '-9999px';
    div.style.top = '-9999px';
    div.style.width = '450px'; // standard width for receipt
    div.style.backgroundColor = '#ffffff';
    document.body.appendChild(div);

    const formattedAmount = parseFloat(item.amount).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

    // Populate with beautifully styled HTML
    div.innerHTML = `
      <div style="padding: 30px; font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; box-sizing: border-box;">
        <!-- Logo & Branding -->
        <div style="text-align: center; margin-bottom: 20px;">
          <img src="/images/LOGO.png" alt="BiD Logo" style="height: 56px; margin: 0 auto 8px auto; display: block; object-fit: contain;" />
          <h2 style="font-size: 22px; font-weight: 800; color: #1e293b; margin: 0 0 4px 0; font-family: sans-serif;">BiD Finance</h2>
          <p style="font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin: 0;">Official Transaction Receipt</p>
        </div>

        <!-- Dotted Divider -->
        <div style="border-top: 1px dashed #cbd5e1; margin: 15px 0;"></div>

        <!-- Details -->
        <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin: 20px 0;">
          <tr style="height: 32px;">
            <td style="color: #64748b; font-weight: 500;">Reference No:</td>
            <td style="text-align: right; color: #1e293b; font-weight: 700; font-family: monospace;">${item.invoice_id}</td>
          </tr>
          <tr style="height: 32px;">
            <td style="color: #64748b; font-weight: 500;">Date:</td>
            <td style="text-align: right; color: #1e293b; font-weight: 600;">${formatDate(item.date)}</td>
          </tr>
          <tr style="height: 32px;">
            <td style="color: #64748b; font-weight: 500;">Category:</td>
            <td style="text-align: right; color: #1e293b; font-weight: 600;">${item.category}</td>
          </tr>
          <tr style="height: 32px; vertical-align: top;">
            <td style="color: #64748b; font-weight: 500; padding-top: 6px;">Description:</td>
            <td style="text-align: right; color: #1e293b; font-weight: 600; padding-top: 6px; max-width: 200px; word-wrap: break-word;">${item.description || 'No description'}</td>
          </tr>
          <tr style="height: 32px;">
            <td style="color: #64748b; font-weight: 500;">Payment Status:</td>
            <td style="text-align: right; color: #15803d; font-weight: 700;">Paid</td>
          </tr>
        </table>

        <!-- Dotted Divider -->
        <div style="border-top: 1px dashed #cbd5e1; margin: 15px 0;"></div>

        <!-- Total Amount -->
        <div style="text-align: center; margin: 20px 0;">
          <span style="font-size: 9px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 5px;">Total Amount</span>
          <span style="font-size: 26px; font-weight: 800; color: #0f172a; display: block;">₹ ${formattedAmount}</span>
          <span style="display: inline-block; padding: 4px 10px; border-radius: 9999px; background-color: #dcfce7; color: #166534; font-size: 10px; font-weight: 700; margin-top: 10px; text-transform: uppercase;">Completed</span>
        </div>
        
        <!-- Footer -->
        <div style="text-align: center; font-size: 9px; color: #64748b; margin-top: 25px; padding-top: 15px; border-top: 1px solid #f1f5f9;">
          Thank you for using BiD Finance. This receipt is automatically generated and is valid for reference.
        </div>
      </div>
    `;

    // Wait a short duration to ensure styles and fonts render
    await new Promise((resolve) => setTimeout(resolve, 150));

      // Render canvas
      const canvas = await html2canvas(div, {
        scale: 2,
        useCORS: true,
        logging: false,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });

    // Clean up temporary div
    document.body.removeChild(div);

    // Create PDF
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'px',
      format: [canvas.width / 2, canvas.height / 2]
    });

    pdf.addImage(imgData, 'PNG', 0, 0, canvas.width / 2, canvas.height / 2);
    return {
      pdf,
      canvas,
      blob: pdf.output('blob')
    };
  };

  const handleShareClick = (item) => {
    setSelectedItem(item);
    setShowReceiptModal(true);
  };

  const handleShareToWhatsApp = async () => {
    if (!selectedItem) return;
    setIsSharing(true);
    console.log("Starting WhatsApp sharing for:", selectedItem);
    try {
      console.log("Generating PDF blob...");
      const { blob, pdf } = await generateReceiptPdfBlob(selectedItem);
      console.log("PDF blob generated successfully.");

      // Direct native share if supported on mobile
      let sharedDirectly = false;
      if (navigator.share && navigator.canShare && blob) {
        try {
          console.log("Attempting direct Web Share API...");
          const file = new File([blob], `Receipt_${selectedItem.invoice_id}.pdf`, { type: 'application/pdf' });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: 'Transaction Receipt',
              text: `Official Transaction Receipt: ${selectedItem.invoice_id}`
            });
            sharedDirectly = true;
            console.log("Shared directly via Web Share API.");
          }
        } catch (err) {
          console.warn("Direct file sharing failed, falling back to desktop flow", err);
        }
      }

      if (!sharedDirectly) {
        // Prepare WhatsApp message
        const message = `Please find attached the transaction receipt for Reference No: ${selectedItem.invoice_id}`;
        const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
        console.log("Opening WhatsApp URL:", waUrl);

        // Open WhatsApp Web or mobile app link in a new tab
        const newWindow = window.open(waUrl, '_blank');
        if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
          console.warn("Popup blocked! Redirecting current window for WhatsApp...");
          window.open(waUrl, '_self');
        }

        // Trigger local download of the PDF so user can drag-and-drop it into WhatsApp Web
        console.log("Downloading PDF locally for drag-and-drop...");
        pdf.save(`Receipt_${selectedItem.invoice_id}.pdf`);
        console.log("Local PDF download triggered.");
      }
    } catch (err) {
      console.error("Error during WhatsApp sharing: ", err);
      alert("Failed to share PDF. Please try again.");
    } finally {
      setIsSharing(false);
      console.log("WhatsApp sharing process finished.");
    }
  };

  const handleDownloadPDF = async () => {
    if (!selectedItem) return;
    try {
      console.log("Generating and downloading PDF...");
      const { pdf } = await generateReceiptPdfBlob(selectedItem);
      pdf.save(`Receipt_${selectedItem.invoice_id}.pdf`);
    } catch (err) {
      console.error("Error downloading PDF:", err);
      alert("Failed to generate PDF download.");
    }
  };

  const handleDownloadPNG = async () => {
    if (!selectedItem) return;
    try {
      const { canvas } = await generateReceiptPdfBlob(selectedItem);
      const link = document.createElement('a');
      link.download = `Receipt_${selectedItem.invoice_id}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error("Error downloading PNG:", err);
      alert("Failed to generate PNG image.");
    }
  };

  const handlePrintReceipt = async () => {
    if (!selectedItem) return;
    try {
      const formattedAmount = parseFloat(selectedItem.amount).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
      const printWindow = window.open('', '_blank');
      printWindow.document.write(`
        <html>
          <head>
            <title>Receipt ${selectedItem.invoice_id}</title>
            <style>
              body {
                font-family: 'Segoe UI', Arial, sans-serif;
                color: #1e293b;
                background-color: #ffffff;
                margin: 40px;
                display: flex;
                justify-content: center;
              }
              .receipt-container {
                width: 450px;
                padding: 30px;
                border: 1px solid #e2e8f0;
                border-radius: 12px;
                box-sizing: border-box;
              }
              .text-center { text-align: center; }
              .logo { height: 56px; margin: 0 auto 8px auto; display: block; object-fit: contain; }
              .title { font-size: 22px; font-weight: 800; color: #1e293b; margin: 0 0 4px 0; }
              .subtitle { font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin: 0; }
              .divider { border-top: 1px dashed #cbd5e1; margin: 15px 0; }
              table { width: 100%; border-collapse: collapse; font-size: 13px; margin: 20px 0; }
              tr { height: 32px; }
              td.label { color: #64748b; font-weight: 500; }
              td.value { text-align: right; color: #1e293b; font-weight: 600; }
              td.mono { font-family: monospace; font-weight: 700; }
              td.status { color: #15803d; font-weight: 700; }
              .amount-section { text-align: center; margin: 20px 0; }
              .amount-label { font-size: 9px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 5px; }
              .amount-val { font-size: 26px; font-weight: 800; color: #0f172a; display: block; }
              .badge { display: inline-block; padding: 4px 10px; border-radius: 9999px; background-color: #dcfce7; color: #166534; font-size: 10px; font-weight: 700; margin-top: 10px; text-transform: uppercase; }
              .footer { text-align: center; font-size: 9px; color: #64748b; margin-top: 25px; padding-top: 15px; border-top: 1px solid #f1f5f9; }
              @media print {
                body { margin: 0; display: block; }
                .receipt-container { width: 100%; border: none; padding: 0; }
              }
            </style>
          </head>
          <body onload="window.print(); window.close();">
            <div class="receipt-container">
              <div class="text-center">
                <img src="/images/LOGO.png" alt="BiD Logo" class="logo" />
                <h2 class="title">BiD Finance</h2>
                <p class="subtitle">Official Transaction Receipt</p>
              </div>
              <div class="divider"></div>
              <table>
                <tr>
                  <td class="label">Reference No:</td>
                  <td class="value mono">${selectedItem.invoice_id}</td>
                </tr>
                <tr>
                  <td class="label">Date:</td>
                  <td class="value">${formatDate(selectedItem.date)}</td>
                </tr>
                <tr>
                  <td class="label">Category:</td>
                  <td class="value">${selectedItem.category}</td>
                </tr>
                <tr style="vertical-align: top;">
                  <td class="label" style="padding-top: 6px;">Description:</td>
                  <td class="value" style="padding-top: 6px; max-width: 200px; word-wrap: break-word;">${selectedItem.description || 'No description'}</td>
                </tr>
                <tr>
                  <td class="label">Payment Status:</td>
                  <td class="value status">Paid</td>
                </tr>
              </table>
              <div class="divider"></div>
              <div class="amount-section">
                <span class="amount-label">Total Amount</span>
                <span class="amount-val">₹ ${formattedAmount}</span>
                <span class="badge">Completed</span>
              </div>
              <div class="footer">
                Thank you for using BiD Finance. This receipt is automatically generated and is valid for reference.
              </div>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
    } catch (err) {
      console.error("Error printing receipt:", err);
      alert("Failed to open print page.");
    }
  };

  const currentData = getCurrentData();
  const isIncomeTab = activeTab === 'income';

  return (
    <div className="w-full max-w-7xl mx-auto px-2 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-6 md:py-8 bg-gray-50 min-h-screen">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl shadow-lg p-5 mb-4 sm:mb-6 md:mb-8">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-1">
              {activeTab === 'expenses' ? 'My Expenses' : 'My Income'}
            </h2>
            <p className="text-blue-100 text-xs sm:text-sm">
              Manage and track your financial transactions
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
            <div className="flex gap-2 w-full sm:w-auto">
              {activeTab === 'expenses' && (
                <button
                  onClick={() => router.push('/add-expense')}
                  className="bg-white hover:bg-blue-50 text-blue-700 font-medium py-2.5 px-4 rounded-lg transition-all duration-300 flex items-center text-xs sm:text-sm justify-center cursor-pointer whitespace-nowrap shadow-sm w-full sm:w-auto"
                >
                  <FontAwesomeIcon icon={faPlus} className="mr-2" />
                  <span>Add Expense</span>
                </button>
              )}
              {activeTab === 'income' && (
                <button
                  onClick={() => router.push('/income')}
                  className="bg-white hover:bg-green-50 text-green-700 font-medium py-2.5 px-4 rounded-lg transition-all duration-300 flex items-center text-xs sm:text-sm justify-center cursor-pointer whitespace-nowrap shadow-sm w-full sm:w-auto"
                >
                  <FontAwesomeIcon icon={faPlus} className="mr-2" />
                  <span>Add Income</span>
                </button>
              )}
            </div>
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
                onClick={() => router.push(!isIncomeTab ? '/add-expense' : '/income')}
                className={`mt-2 ${!isIncomeTab ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'} text-white font-medium py-2 px-4 rounded-lg transition-all duration-300 text-sm cursor-pointer`}
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
                  
                  <div className="flex justify-between items-center mt-2">
                    <div>
                      {activeTab === 'expenses' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          {item.category}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => handleShareClick(item)}
                      className="inline-flex items-center space-x-1 text-green-600 hover:text-green-700 bg-green-50 hover:bg-green-100 px-2 py-1 rounded text-xs font-medium transition-all duration-150 cursor-pointer"
                    >
                      <FontAwesomeIcon icon={faWhatsapp} className="w-3.5 h-3.5" />
                      <span>Share Receipt</span>
                    </button>
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
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
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
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      <button
                        onClick={() => handleShareClick(item)}
                        className="inline-flex items-center space-x-1.5 text-green-600 hover:text-green-700 hover:bg-green-50 px-2.5 py-1 rounded-md text-xs font-semibold border border-green-200 transition-all duration-150 cursor-pointer"
                        title="Share on WhatsApp"
                      >
                        <FontAwesomeIcon icon={faWhatsapp} className="w-3.5 h-3.5" />
                        <span>Share Receipt</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {/* Receipt Preview & Share Modal */}
      {showReceiptModal && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-lg bg-gray-50 rounded-2xl shadow-2xl overflow-hidden my-8 transform transition-all duration-300 scale-100">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-100">
              <div className="flex items-center space-x-2 text-gray-800 font-semibold">
                <FontAwesomeIcon icon={faFileInvoice} className="text-blue-600 w-5 h-5" />
                <span>Transaction Receipt</span>
              </div>
              <button
                onClick={() => setShowReceiptModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors duration-150 p-1 cursor-pointer"
              >
                <FontAwesomeIcon icon={faTimes} className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body / Receipt Container */}
            <div className="p-6 overflow-y-auto max-h-[calc(100vh-200px)]">
              {/* Receipt Card */}
              <div className="bg-white rounded-xl border border-gray-200/80 shadow-md p-6 mb-6 relative">
                {/* Logo & Branding */}
                <div className="text-center mb-6">
                  <img src="/images/LOGO.png" alt="BiD Logo" className="h-14 mx-auto mb-2 object-contain" />
                  <h3 className="text-lg font-bold text-gray-800">BiD Finance</h3>
                  <p className="text-[10px] font-semibold text-gray-400 tracking-wider uppercase">Official Transaction Receipt</p>
                </div>

                {/* Dotted Divider */}
                <div className="border-t border-dashed border-gray-300 my-4"></div>

                {/* Details Table */}
                <div className="space-y-3.5 text-sm my-6">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 font-medium">Reference No:</span>
                    <span className="text-gray-800 font-bold font-mono">{selectedItem.invoice_id}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 font-medium">Date:</span>
                    <span className="text-gray-800 font-semibold flex items-center">
                      <FontAwesomeIcon icon={faCalendarAlt} className="text-gray-400 mr-1.5 w-3.5 h-3.5" />
                      {formatDate(selectedItem.date)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 font-medium">Category:</span>
                    <span className="text-gray-800 font-semibold">{selectedItem.category}</span>
                  </div>
                  <div className="flex justify-between items-start">
                    <span className="text-gray-400 font-medium">Description:</span>
                    <span className="text-gray-800 font-semibold text-right max-w-[200px] break-words">
                      {selectedItem.description || 'No description'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 font-medium">Payment Status:</span>
                    <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                      Paid
                    </span>
                  </div>
                </div>

                {/* Dotted Divider */}
                <div className="border-t border-dashed border-gray-300 my-4"></div>

                {/* Amount Section */}
                <div className="text-center my-6">
                  <span className="text-[10px] font-bold text-gray-400 tracking-wider uppercase block mb-1">Total Amount</span>
                  <span className="text-3xl font-extrabold text-gray-800 block">
                    ₹ {parseFloat(selectedItem.amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <div className="mt-3">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800 uppercase tracking-wide">
                      ● Completed
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <button
                  onClick={handleShareToWhatsApp}
                  disabled={isSharing}
                  className="w-full bg-[#00a884] hover:bg-[#008f72] text-white py-3 px-4 rounded-xl font-semibold flex items-center justify-center transition-all duration-200 shadow-md cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed transform active:scale-[0.98]"
                >
                  {isSharing ? (
                    <>
                      <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-2 w-5 h-5" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <FontAwesomeIcon icon={faWhatsapp} className="mr-2 w-5 h-5" />
                      <span>Share PDF to WhatsApp</span>
                    </>
                  )}
                </button>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={handleDownloadPDF}
                    className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 py-2.5 px-2 rounded-xl text-xs font-semibold flex flex-col items-center justify-center transition-all duration-150 cursor-pointer shadow-sm"
                  >
                    <FontAwesomeIcon icon={faDownload} className="text-blue-500 mb-1.5 w-4 h-4" />
                    <span>PDF File</span>
                  </button>
                  <button
                    onClick={handleDownloadPNG}
                    className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 py-2.5 px-2 rounded-xl text-xs font-semibold flex flex-col items-center justify-center transition-all duration-150 cursor-pointer shadow-sm"
                  >
                    <FontAwesomeIcon icon={faDownload} className="text-indigo-500 mb-1.5 w-4 h-4" />
                    <span>PNG Image</span>
                  </button>
                  <button
                    onClick={handlePrintReceipt}
                    className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 py-2.5 px-2 rounded-xl text-xs font-semibold flex flex-col items-center justify-center transition-all duration-150 cursor-pointer shadow-sm"
                  >
                    <FontAwesomeIcon icon={faFileInvoice} className="text-green-500 mb-1.5 w-4 h-4" />
                    <span>Print/PDF</span>
                  </button>
                </div>

                {/* Info Banner */}
                <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-3.5 text-xs text-blue-700/80 leading-relaxed">
                  💡 <strong>WhatsApp Sharing:</strong> On mobile devices, <em>Share PDF to WhatsApp</em> will prompt the native app directly. On desktop computers, it downloads the PDF file and opens WhatsApp so you can drag-and-drop the PDF.
                </div>

                {/* Close Button */}
                <button
                  onClick={() => setShowReceiptModal(false)}
                  className="w-full bg-[#1e293b] hover:bg-[#0f172a] text-white py-3 px-4 rounded-xl font-semibold transition-all duration-200 cursor-pointer shadow-md text-sm mt-2"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpenseList;
