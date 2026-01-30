import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faSpinner, faFilePdf, faDownload } from '@fortawesome/free-solid-svg-icons';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const InvoiceDetails = () => {
    const { invoice_id } = useParams();
    const navigate = useNavigate();
    const [invoice, setInvoice] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [downloadingPdf, setDownloadingPdf] = useState(false);
    const [downloadingJson, setDownloadingJson] = useState(false);
    const invoiceRef = useRef(null);
    const pdfContentRef = useRef(null);

    useEffect(() => {
        const fetchInvoiceDetails = async () => {
            try {
                const currentUser = auth.currentUser;
                if (!currentUser) {
                    navigate('/login');
                    return;
                }

                // Try to find the invoice in expenses collection first
                let invoiceData = null;
                let userData = null;

                // Search in expenses collection
                const expensesQuery = query(
                    collection(db, 'expenses'),
                    where('invoice_id', '==', invoice_id)
                );
                
                const expensesSnapshot = await getDocs(expensesQuery);
                
                if (!expensesSnapshot.empty) {
                    const expenseDoc = expensesSnapshot.docs[0];
                    invoiceData = {
                        id: expenseDoc.id,
                        ...expenseDoc.data(),
                        type: 'expense'
                    };
                } else {
                    // If not found in expenses, search in income collection
                    const incomeQuery = query(
                        collection(db, 'income'),
                        where('invoice_id', '==', invoice_id)
                    );
                    
                    const incomeSnapshot = await getDocs(incomeQuery);
                    
                    if (!incomeSnapshot.empty) {
                        const incomeDoc = incomeSnapshot.docs[0];
                        invoiceData = {
                            id: incomeDoc.id,
                            ...incomeDoc.data(),
                            type: 'income'
                        };
                    }
                }

                if (!invoiceData) {
                    throw new Error('Invoice not found');
                }

                // Get user data
                const userDoc = await getDoc(doc(db, 'users', invoiceData.userId));
                if (userDoc.exists()) {
                    userData = userDoc.data();
                }

                // Combine invoice and user data
                const combinedData = {
                    ...invoiceData,
                    username: userData?.username || 'Unknown User',
                    role: userData?.role || 'Unknown Role',
                    // Map Firestore fields to match your existing structure
                    invoice_id: invoiceData.invoice_id,
                    amount: invoiceData.amount,
                    category: invoiceData.category || (invoiceData.type === 'income' ? 'Income' : 'Uncategorized'),
                    description: invoiceData.description,
                    date_created: invoiceData.date || invoiceData.createdAt,
                    archive_date: invoiceData.archive_date || invoiceData.archivedAt
                };

                setInvoice(combinedData);

            } catch (error) {
                setError(error.message || 'An error occurred while fetching the invoice');
                console.error('Invoice fetch error:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchInvoiceDetails();
    }, [invoice_id, navigate]);

    const formatDate = (timestamp) => {
        if (!timestamp) return 'N/A';
        
        try {
            // Handle both Firestore Timestamp and string dates
            const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (err) {
            console.error('Date formatting error:', err);
            return 'Invalid date';
        }
    };

    // Format amount to display in Indian Rupees with commas as per Indian numbering system
    const formatIndianRupees = (amount) => {
        const num = parseFloat(amount);
        const result = num.toLocaleString('en-IN', {
            maximumFractionDigits: 2,
            minimumFractionDigits: 2
        });
        return `₹${result}`;
    };

    // Improved function to generate and download PDF
    const handleDownloadPdf = async () => {
        if (!invoice) return;
        
        try {
            setDownloadingPdf(true);
            
            // Create a hidden div for PDF content if it doesn't exist
            if (!pdfContentRef.current) {
                const div = document.createElement('div');
                div.style.position = 'absolute';
                div.style.left = '-9999px';
                div.style.top = '-9999px';
                document.body.appendChild(div);
                pdfContentRef.current = div;
            }
            
            // Add Bid Accounting logo and info with address - changed color to green (#138808)
            const logoPlaceholder = `
                <div style="text-align: center; margin-bottom: 10px;">
                    <div style="font-size: 24px; font-weight: bold; color: #138808;">BID ACCOUNTING</div>
                    <div style="font-size: 12px; color: #64748b;">DEVA JI VIP PLAZA, 246, VIP Rd, Zirakpur, Sahibzada Ajit Singh Nagar, Punjab 140603</div>
                    <div style="font-size: 12px; color: #64748b;">Phone: (555) 123-4567 | Email: contact@bidaccounting.com</div>
                </div>
            `;
            
            // Add a professional header with invoice title and number using Indian flag colors
            const header = `
                <div style="background: linear-gradient(to bottom, #FF9933 50%, #FFFFFF 0%, #138808 50%); color: white; padding: 15px; text-align: center; margin-bottom: 20px; border-radius: 5px;">
                    <h1 style="margin: 0; font-size: 28px; text-shadow: 1px 1px 2px rgba(0,0,0,0.5);">${invoice.type === 'income' ? 'INCOME RECEIPT' : 'INVOICE'}</h1>
                    <p style="margin: 5px 0 0 0; font-size: 16px; color: #000; font-weight: bold;">${invoice.type === 'income' ? 'Receipt' : 'Invoice'} #${invoice.invoice_id}</p>
                </div>
            `;
            
            // Define a proper footer with terms and contact info
            const footer = `
                <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">
                    <p style="margin-bottom: 8px;"><strong>Payment Terms:</strong> Due upon receipt</p>
                    <p style="margin-bottom: 8px;"><strong>Thank you for your business!</strong></p>
                    <p style="margin-top: 15px; text-align: center;">This ${invoice.type === 'income' ? 'receipt' : 'invoice'} was generated on ${new Date().toLocaleDateString()} and is valid for 30 days.</p>
                </div>
            `;
            
            // Format amounts in Indian Rupees for the PDF
            const formattedAmount = parseFloat(invoice.amount).toLocaleString('en-IN', {
                maximumFractionDigits: 2,
                minimumFractionDigits: 2
            });
            
            // Fill the PDF content with well-styled HTML
            pdfContentRef.current.innerHTML = `
                <div style="padding: 40px; font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
                    ${logoPlaceholder}
                    ${header}
                    
                    <div style="display: flex; justify-content: space-between; margin-bottom: 30px; flex-wrap: wrap;">
                        <div style="flex: 1; min-width: 250px; margin-right: 20px;">
                            <h2 style="color: #334155; margin-bottom: 10px; font-size: 16px; border-bottom: 2px solid #FF9933; padding-bottom: 5px;">${invoice.type === 'income' ? 'RECEIPT' : 'INVOICE'} DETAILS</h2>
                            <table style="width: 100%; border-collapse: collapse;">
                                <tr>
                                    <td style="padding: 8px 0; font-weight: bold; width: 40%;">${invoice.type === 'income' ? 'Receipt' : 'Invoice'} Number:</td>
                                    <td style="padding: 8px 0;">${invoice.invoice_id}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; font-weight: bold;">Date Created:</td>
                                    <td style="padding: 8px 0;">${formatDate(invoice.date_created)}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; font-weight: bold;">Category:</td>
                                    <td style="padding: 8px 0;">${invoice.category}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; font-weight: bold;">Type:</td>
                                    <td style="padding: 8px 0;">${invoice.type === 'income' ? 'Income' : 'Expense'}</td>
                                </tr>
                            </table>
                        </div>
                        
                        <div style="flex: 1; min-width: 250px;">
                            <h2 style="color: #334155; margin-bottom: 10px; font-size: 16px; border-bottom: 2px solid #138808; padding-bottom: 5px;">BILLING INFORMATION</h2>
                            <table style="width: 100%; border-collapse: collapse;">
                                <tr>
                                    <td style="padding: 8px 0; font-weight: bold; width: 40%;">Created By:</td>
                                    <td style="padding: 8px 0;">${invoice.username || 'N/A'}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; font-weight: bold;">User Role:</td>
                                    <td style="padding: 8px 0;">${invoice.role || 'N/A'}</td>
                                </tr>
                                ${invoice.archive_date ? `
                                <tr>
                                    <td style="padding: 8px 0; font-weight: bold;">Archived Date:</td>
                                    <td style="padding: 8px 0;">${formatDate(invoice.archive_date)}</td>
                                </tr>
                                ` : ''}
                            </table>
                        </div>
                    </div>
                    
                    <div style="margin-bottom: 30px;">
                        <h2 style="color: #334155; margin-bottom: 10px; font-size: 16px; border-bottom: 2px solid #FF9933; padding-bottom: 5px;">${invoice.type === 'income' ? 'RECEIPT' : 'INVOICE'} SUMMARY</h2>
                        <table style="width: 100%; border-collapse: collapse; border: 1px solid #e2e8f0;">
                            <thead>
                                <tr style="background-color: #f1f5f9; text-align: left;">
                                    <th style="padding: 12px; border: 1px solid #e2e8f0;">Description</th>
                                    <th style="padding: 12px; border: 1px solid #e2e8f0; width: 30%; text-align: right;">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td style="padding: 12px; border: 1px solid #e2e8f0;">${invoice.category} - ${invoice.description || 'No description provided'}</td>
                                    <td style="padding: 12px; border: 1px solid #e2e8f0; text-align: right;">₹${formattedAmount}</td>
                                </tr>
                                <tr style="background-color: #f8fafc;">
                                    <td style="padding: 12px; border: 1px solid #e2e8f0; text-align: right; font-weight: bold;">Subtotal:</td>
                                    <td style="padding: 12px; border: 1px solid #e2e8f0; text-align: right;">₹${formattedAmount}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 12px; border: 1px solid #e2e8f0; text-align: right; font-weight: bold;">GST (0%):</td>
                                    <td style="padding: 12px; border: 1px solid #e2e8f0; text-align: right;">₹0.00</td>
                                </tr>
                                <tr style="background-color: #e2e8f0;">
                                    <td style="padding: 12px; border: 1px solid #e2e8f0; text-align: right; font-weight: bold;">Total:</td>
                                    <td style="padding: 12px; border: 1px solid #e2e8f0; text-align: right; font-weight: bold; font-size: 16px;">₹${formattedAmount}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    
                    <div style="margin-bottom: 30px;">
                        <h2 style="color: #334155; margin-bottom: 10px; font-size: 16px; border-bottom: 2px solid #138808; padding-bottom: 5px;">DESCRIPTION</h2>
                        <div style="padding: 15px; background-color: #f8fafc; border-radius: 4px; border: 1px solid #e2e8f0;">
                            ${invoice.description || 'No description provided'}
                        </div>
                    </div>
                    
                    ${footer}
                </div>
            `;
            
            // Use better html2canvas settings for improved quality
            const canvas = await html2canvas(pdfContentRef.current, {
                scale: 2, // Higher scale for better quality
                useCORS: true,
                logging: false,
                allowTaint: true,
                letterRendering: true
            });
            
            // Create a PDF of the proper size
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4',
                compress: true
            });
            
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const imgWidth = canvas.width;
            const imgHeight = canvas.height;
            const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
            const imgX = (pdfWidth - imgWidth * ratio) / 2;
            const imgY = 0;
            
            pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
            
            // Add page numbers if multiple pages
            const pageCount = pdf.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                pdf.setPage(i);
                pdf.setFontSize(10);
                pdf.setTextColor(150);
                pdf.text(`Page ${i} of ${pageCount}`, pdf.internal.pageSize.getWidth() - 30, pdf.internal.pageSize.getHeight() - 10);
            }
            
            // Save the PDF with a meaningful name
            const docType = invoice.type === 'income' ? 'Receipt' : 'Invoice';
            pdf.save(`BidAccounting_${docType}_${invoice.invoice_id}_${new Date().toISOString().split('T')[0]}.pdf`);
            
        } catch (err) {
            console.error('Error generating PDF:', err);
            alert('Failed to generate PDF. Please try again.');
        } finally {
            setDownloadingPdf(false);
        }
    };

    // Enhanced function to download JSON data
    const handleDownloadJson = () => {
        if (!invoice) return;
        
        try {
            setDownloadingJson(true);
            
            // Format the JSON with additional metadata
            const enhancedInvoiceData = {
                invoice_data: invoice,
                metadata: {
                    exported_at: new Date().toISOString(),
                    format_version: "1.0",
                    system: "Bid Accounting Invoice Management System",
                    currency: "INR",
                    source: "Firebase Firestore"
                }
            };
            
            // Create a JSON blob with proper formatting
            const invoiceData = JSON.stringify(enhancedInvoiceData, null, 2);
            const blob = new Blob([invoiceData], { type: 'application/json' });
            
            // Create download link with improved naming
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            const docType = invoice.type === 'income' ? 'Receipt' : 'Invoice';
            link.download = `BidAccounting_${docType}_${invoice.invoice_id}_${new Date().toISOString().split('T')[0]}.json`;
            
            // Trigger download
            document.body.appendChild(link);
            link.click();
            
            // Clean up resources
            setTimeout(() => {
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            }, 100);
            
        } catch (err) {
            console.error('Error downloading JSON:', err);
            alert('Failed to download JSON data. Please try again.');
        } finally {
            setDownloadingJson(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <FontAwesomeIcon icon={faSpinner} spin size="3x" className="text-blue-500 animate-pulse" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative max-w-2xl mx-auto mt-8 shadow-md transform transition-all duration-300 hover:shadow-lg" role="alert">
                <strong className="font-bold">Error: </strong>
                <span className="block sm:inline">{error}</span>
                <div className="mt-4">
                    <button 
                        onClick={() => navigate('/expenses')}
                        className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition-all duration-300 transform hover:scale-105"
                    >
                        <FontAwesomeIcon icon={faArrowLeft} className="mr-2 transition-transform duration-300 hover:translate-x-1" />
                        <span className="inline-block">Back to Expenses</span>
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-3 sm:p-4 lg:p-5">
            <div className="mb-6">
                <button 
                    onClick={() => navigate('/expenses')}
                    className="bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-md flex items-center transition-all duration-300 transform hover:scale-105 hover:shadow-md"
                >
                    <FontAwesomeIcon icon={faArrowLeft} className="mr-2 transition-transform duration-300 group-hover:-translate-x-1" />
                    <span className="inline-block">Back to Expenses</span>
                </button>
            </div>

            <div ref={invoiceRef} className="bg-white shadow-md rounded-lg p-4 sm:p-5 lg:p-6 transition-all duration-300 hover:shadow-xl">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-800">
                        <span className="inline-block transform transition-all duration-300 hover:text-orange-500">
                            {invoice?.type === 'income' ? 'Receipt' : 'Invoice'} #
                        </span>
                        <span className="inline-block transform transition-all duration-300 hover:scale-105 text-orange-500">{invoice?.invoice_id}</span>
                    </h2>
                    <div className="flex space-x-2">
                        <button 
                            onClick={handleDownloadPdf}
                            disabled={downloadingPdf}
                            className={`bg-orange-500 hover:bg-orange-600 text-white py-2 px-3 rounded-md flex items-center transition-all duration-300 transform hover:scale-105 ${downloadingPdf ? 'opacity-75 cursor-not-allowed' : ''}`}
                        >
                            <FontAwesomeIcon icon={downloadingPdf ? faSpinner : faFilePdf} className={`mr-2 ${downloadingPdf ? 'animate-spin' : ''}`} />
                            <span className="inline-block">{downloadingPdf ? 'Processing...' : 'PDF'}</span>
                        </button>
                        <button 
                            onClick={handleDownloadJson}
                            disabled={downloadingJson}
                            className={`bg-green-500 hover:bg-green-600 text-white py-2 px-3 rounded-md flex items-center transition-all duration-300 transform hover:scale-105 ${downloadingJson ? 'opacity-75 cursor-not-allowed' : ''}`}
                        >
                            <FontAwesomeIcon icon={downloadingJson ? faSpinner : faDownload} className={`mr-2 ${downloadingJson ? 'animate-spin' : ''}`} />
                            <span className="inline-block">{downloadingJson ? 'Processing...' : 'Download'}</span>
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-6">
                    <div className="transition-all duration-300 hover:transform hover:scale-102">
                        <h3 className="text-gray-600 font-semibold mb-2">
                            <span className="inline-block border-b-2 border-orange-500 pb-1">
                                {invoice?.type === 'income' ? 'Receipt' : 'Invoice'} Details
                            </span>
                        </h3>
                        <div className="bg-gray-50 p-4 rounded-md shadow-sm transition-all duration-300 hover:shadow-md">
                            <p className="mb-2 transition-all duration-300 hover:bg-gray-100 p-1 rounded">
                                <span className="font-semibold text-orange-500">
                                    {invoice?.type === 'income' ? 'Receipt' : 'Invoice'} ID:
                                </span> 
                                <span className="ml-2">{invoice?.invoice_id}</span>
                            </p>
                            <p className="mb-2 transition-all duration-300 hover:bg-gray-100 p-1 rounded">
                                <span className="font-semibold text-orange-500">Date Created:</span> 
                                <span className="ml-2">{formatDate(invoice?.date_created)}</span>
                            </p>
                            <p className="mb-2 transition-all duration-300 hover:bg-gray-100 p-1 rounded">
                                <span className="font-semibold text-orange-500">Category:</span> 
                                <span className="ml-2">{invoice?.category}</span>
                            </p>
                            <p className="mb-2 transition-all duration-300 hover:bg-gray-100 p-1 rounded">
                                <span className="font-semibold text-orange-500">Type:</span> 
                                <span className="ml-2 capitalize">{invoice?.type}</span>
                            </p>
                            <p className="transition-all duration-300 hover:bg-gray-100 p-1 rounded">
                                <span className="font-semibold text-orange-500">Amount:</span> 
                                <span className="ml-2 font-bold">{formatIndianRupees(invoice?.amount)}</span>
                            </p>
                        </div>
                    </div>

                    <div className="transition-all duration-300 hover:transform hover:scale-102">
                        <h3 className="text-gray-600 font-semibold mb-2">
                            <span className="inline-block border-b-2 border-green-500 pb-1">Additional Information</span>
                        </h3>
                        <div className="bg-gray-50 p-4 rounded-md shadow-sm transition-all duration-300 hover:shadow-md">
                            <p className="mb-2 transition-all duration-300 hover:bg-gray-100 p-1 rounded">
                                <span className="font-semibold text-green-600">Created By:</span> 
                                <span className="ml-2">{invoice?.username || 'N/A'}</span>
                            </p>
                            <p className="mb-2 transition-all duration-300 hover:bg-gray-100 p-1 rounded">
                                <span className="font-semibold text-green-600">User Role:</span> 
                                <span className="ml-2">{invoice?.role || 'N/A'}</span>
                            </p>
                            {invoice?.archive_date && (
                                <p className="transition-all duration-300 hover:bg-gray-100 p-1 rounded">
                                    <span className="font-semibold text-green-600">Archived Date:</span> 
                                    <span className="ml-2">{formatDate(invoice.archive_date)}</span>
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                <div className="mb-6 transition-all duration-300 hover:transform hover:scale-102">
                    <h3 className="text-gray-600 font-semibold mb-2">
                        <span className="inline-block border-b-2 border-green-500 pb-1">Description</span>
                    </h3>
                    <div className="bg-gray-50 p-4 rounded-md shadow-sm transition-all duration-300 hover:shadow-md">
                        <p className="transition-all duration-300 hover:bg-gray-100 p-2 rounded leading-relaxed">
                            <span>{invoice?.description || 'No description provided'}</span>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InvoiceDetails;