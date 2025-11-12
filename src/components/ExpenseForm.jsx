import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../config/firebase';

const ExpenseForm = () => {
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Business expense categories
  const defaultCategories = [
    "Office Supplies",
    "Rent",
    "Utilities",
    "Salary",
    "Travel",
    "Equipment",
    "Software",
    "Marketing",
    "Insurance",
    "Taxes",
    "Maintenance",
    "Telecommunications",
    "Consulting",
    "Legal",
    "Personal Expenses",
    "Food",
    "Food Expenses for Other",
    "Miscellaneous"
  ];

  useEffect(() => {
    setCategories(defaultCategories.map((name, index) => ({
      key: index,
      name: name
    })));
  }, []);

  const generateInvoiceId = () => {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `EXP-${timestamp}-${random}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const currentUser = auth.currentUser;
    if (!currentUser) {
      setError('Please login to add expenses');
      setLoading(false);
      return;
    }

    // Validate amount
    const amountValue = parseFloat(amount);
    if (isNaN(amountValue) || amountValue <= 0) {
      setError('Please enter a valid positive amount');
      setLoading(false);
      return;
    }

    try {
      // Create expense document with current user's UID
      const expenseData = {
        userId: currentUser.uid,
        amount: amountValue,
        category: category.trim(),
        description: description.trim(),
        invoice_id: generateInvoiceId(),
        date: serverTimestamp(),
        createdAt: serverTimestamp(),
        type: 'expense'
      };

      // Add expense to Firestore
      await addDoc(collection(db, 'expenses'), expenseData);

      // Success - redirect to expenses list
      navigate('/expenses');
      
    } catch (err) {
      console.error('Firestore error:', err);
      
      // Handle specific Firebase errors
      if (err.code === 'permission-denied') {
        setError('Permission denied. Check security rules and user authentication.');
      } else if (err.code === 'unauthenticated') {
        setError('Authentication failed. Please login again.');
      } else {
        setError('Failed to add expense. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-4 md:py-6 lg:py-8">
      <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold mb-4 sm:mb-6 text-center">
        <span className="inline-block pb-2 relative">
          Add Expense
          <span className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full"></span>
        </span>
      </h2>
      
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-3 sm:p-4 mb-4 sm:mb-6 rounded-md shadow-sm animate-pulse">
          <span className="text-red-700 text-sm sm:text-base font-medium">{error}</span>
        </div>
      )}
      
      <div className="bg-white shadow-lg rounded-lg overflow-hidden border border-gray-100 hover:shadow-xl transition-all duration-300">
        <div className="p-3 sm:p-4 md:p-6 lg:p-8 bg-gradient-to-br from-white to-blue-50">
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <div className="transition-all duration-300 hover:transform hover:scale-102">
                <label className="block text-gray-700 text-xs sm:text-sm font-semibold mb-1 sm:mb-2" htmlFor="amount">
                  <span className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Amount</span>
                    <span className="ml-1 text-xs text-blue-600">*</span>
                  </span>
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-2 sm:pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 text-sm sm:text-base font-bold">₹</span>
                  </div>
                  <input
                    className="block w-full pl-6 sm:pl-8 pr-2 sm:pr-3 py-2 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150 ease-in-out"
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <span className="text-xs text-gray-500 mt-1 block">Enter the expense amount in rupees</span>
              </div>
              
              <div className="transition-all duration-300 hover:transform hover:scale-102">
                <label className="block text-gray-700 text-xs sm:text-sm font-semibold mb-1 sm:mb-2" htmlFor="category">
                  <span className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                    <span>Category</span>
                    <span className="ml-1 text-xs text-purple-600">*</span>
                  </span>
                </label>
                <div className="mt-1 relative">
                  <select
                    className="block w-full py-2 sm:py-3 px-2 sm:px-3 text-sm sm:text-base border border-gray-300 bg-white rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition duration-150 ease-in-out appearance-none"
                    id="category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    required
                    disabled={loading}
                  >
                    <option value="">Select a category</option>
                    {categories.map((cat) => (
                      <option key={cat.key} value={cat.name}>{cat.name}</option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                    <svg className="h-4 w-4 sm:h-5 sm:w-5 text-purple-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                <span className="text-xs text-gray-500 mt-1 block">Choose the most relevant category</span>
              </div>
            </div>
            
            <div className="transition-all duration-300 hover:transform hover:scale-102">
              <label className="block text-gray-700 text-xs sm:text-sm font-semibold mb-1 sm:mb-2" htmlFor="description">
                <span className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                  </svg>
                  <span>Description</span>
                </span>
              </label>
              <div className="mt-1">
                <textarea
                  className="block w-full px-2 sm:px-3 py-2 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition duration-150 ease-in-out"
                  id="description"
                  rows={3}
                  placeholder="Add details about this expense..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={loading}
                  maxLength={500}
                />
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-xs text-gray-500">Briefly describe what this expense is for</span>
                <span className="text-xs text-gray-400">{description.length}/500</span>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center justify-end pt-3 sm:pt-4 space-y-2 sm:space-y-0">
              <button
                type="button"
                onClick={() => navigate('/expenses')}
                disabled={loading}
                className="w-full sm:w-auto mb-2 sm:mb-0 mr-0 sm:mr-4 inline-flex items-center justify-center px-3 sm:px-4 py-2 text-xs sm:text-sm border border-gray-300 shadow-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Cancel
                </span>
              </button>
              <button
                className={`w-full sm:w-auto inline-flex items-center justify-center px-4 sm:px-6 py-2 sm:py-3 border border-transparent text-sm sm:text-base font-medium rounded-lg text-white shadow-md transform transition-all duration-300 ease-in-out hover:-translate-y-1 hover:shadow-lg group ${
                  loading 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                }`}
                type="submit"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 sm:h-5 sm:w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Adding...
                  </span>
                ) : (
                  <span className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2 group-hover:animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <span className="group-hover:font-bold">Add Expense</span>
                  </span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
      
      <div className="mt-4 sm:mt-6 text-center">
        <span className="text-xs text-gray-500">
          <span className="font-medium text-blue-600">Note:</span> All expenses are recorded in <span className="font-medium">INR (₹)</span> and will appear in your expense history
        </span>
      </div>
    </div>
  );
};

export default ExpenseForm;