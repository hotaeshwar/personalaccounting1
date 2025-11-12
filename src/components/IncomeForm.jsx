import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../config/firebase';

const IncomeForm = () => {
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const generateInvoiceId = () => {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000);
        return `INC-${timestamp}-${random}`;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        // Parse amount as float to ensure it's a numeric value
        const amountValue = parseFloat(amount);
        if (isNaN(amountValue) || amountValue <= 0) {
            setError('Please enter a valid positive amount');
            setLoading(false);
            return;
        }

        const currentUser = auth.currentUser;
        if (!currentUser) {
            setError('Please login to add income');
            navigate('/login');
            setLoading(false);
            return;
        }

        try {
            // Add income document to Firestore
            const incomeData = {
                userId: currentUser.uid,
                description: description.trim(),
                amount: amountValue,
                invoice_id: generateInvoiceId(),
                date: serverTimestamp(),
                createdAt: serverTimestamp(),
                type: 'income'
            };

            await addDoc(collection(db, 'income'), incomeData);

            // Success - redirect to profit/loss page
            navigate('/profit-loss');
            
        } catch (err) {
            console.error('Firestore error:', err);
            
            // Handle different error cases
            if (err.code === 'permission-denied') {
                setError('You do not have permission to add income.');
            } else if (err.code === 'unauthenticated') {
                setError('Authentication failed. Please login again.');
                setTimeout(() => navigate('/login'), 2000);
            } else {
                setError('Failed to add income. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-md mx-auto p-4 md:p-6 lg:p-8 bg-white rounded-lg shadow-lg transition-all duration-300 hover:shadow-xl">
            <h2 className="text-2xl md:text-3xl font-bold mb-4 text-center text-green-600">
                <span className="inline-block transform hover:scale-105 transition-transform duration-300">Add Income</span>
            </h2>
            {error && 
                <div className="text-red-500 mb-4 p-2 bg-red-50 rounded border-l-4 border-red-500 animate-pulse">
                    <span className="font-medium">{error}</span>
                </div>
            }
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="mb-4">
                    <label className="block text-gray-700 text-sm md:text-base font-bold mb-2" htmlFor="description">
                        <span className="inline-block transform hover:translate-x-1 transition-transform duration-200">Description</span>
                    </label>
                    <input
                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline transition-all duration-300 hover:border-green-500 focus:border-green-500 focus:ring-2 focus:ring-green-200"
                        id="description"
                        type="text"
                        placeholder="Enter income description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        required
                        maxLength={500}
                    />
                    <div className="text-right text-xs text-gray-500 mt-1">
                        {description.length}/500 characters
                    </div>
                </div>
                <div className="mb-6">
                    <label className="block text-gray-700 text-sm md:text-base font-bold mb-2" htmlFor="amount">
                        <span className="inline-block transform hover:translate-x-1 transition-transform duration-200">Amount</span>
                    </label>
                    <div className="relative">
                        <span className="absolute left-3 top-2 text-gray-500">₹</span>
                        <input
                            className="shadow appearance-none border rounded w-full py-2 pl-6 pr-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline transition-all duration-300 hover:border-green-500 focus:border-green-500 focus:ring-2 focus:ring-green-200"
                            id="amount"
                            type="number"
                            step="0.01"
                            min="0.01"
                            placeholder="0.00"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            required
                        />
                    </div>
                    <div className="text-right text-xs text-gray-500 mt-1">
                        Enter amount in INR
                    </div>
                </div>
                <div className="flex items-center justify-between pt-2">
                    <button
                        className={`w-full md:w-auto bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-6 rounded focus:outline-none focus:shadow-outline transition-all duration-300 transform hover:scale-105 hover:shadow-lg ${
                            loading ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                        type="submit"
                        disabled={loading}
                    >
                        {loading ? (
                            <span className="inline-flex items-center">
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Adding...
                            </span>
                        ) : (
                            <span className="inline-flex items-center">
                                Add Income
                                <span className="inline-block ml-2 transition-transform duration-300 transform group-hover:translate-x-1">→</span>
                            </span>
                        )}
                    </button>
                </div>
            </form>
            <div className="mt-4 text-center text-sm text-gray-500">
                <span className="hover:text-green-600 transition-colors duration-300">Track your finances with ease</span>
            </div>
            
            {/* Success message that appears briefly after successful submission */}
            {!loading && !error && (
                <div className="mt-4 text-center text-sm text-green-600 opacity-0 animate-fade-in">
                    Income added successfully! Redirecting...
                </div>
            )}
        </div>
    );
};

export default IncomeForm;