import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { db } from '../config/firebase';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  serverTimestamp,
  query,
  collection,
  where,
  getDocs
} from 'firebase/firestore';
import { 
  User, 
  Key, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  ArrowLeft,
  CheckCircle,
  Shield,
  AlertCircle
} from 'lucide-react';

const ForgotPassword = () => {
    const [username, setUsername] = useState('');
    const [resetCode, setResetCode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [step, setStep] = useState(1);
    const [message, setMessage] = useState({ text: '', type: '' });
    const [isLoading, setIsLoading] = useState(false);
    const [userId, setUserId] = useState('');
    const navigate = useNavigate();

    const generateResetCode = () => {
        return Math.floor(100000 + Math.random() * 900000).toString();
    };

    const findUserByUsername = async (username) => {
        try {
            const usersRef = collection(db, 'users');
            const q = query(usersRef, where('username', '==', username));
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
                const userDoc = querySnapshot.docs[0];
                return {
                    id: userDoc.id,
                    ...userDoc.data()
                };
            }
            return null;
        } catch (error) {
            return null;
        }
    };

    const handleRequestReset = async (e) => {
        e.preventDefault();
        setMessage({ text: '', type: '' });
        setIsLoading(true);

        try {
            const user = await findUserByUsername(username);

            if (!user) {
                setMessage({ 
                    text: 'No account found with this username. Please check and try again.', 
                    type: 'error' 
                });
                setIsLoading(false);
                return;
            }

            setUserId(user.id);

            const code = generateResetCode();

            const resetRef = doc(db, 'password_resets', user.id);
            await setDoc(resetRef, {
                code: code,
                username: user.username,
                createdAt: serverTimestamp(),
                expiresAt: new Date(Date.now() + 15 * 60 * 1000),
                used: false
            });

            setMessage({ 
                text: `Reset code: ${code} (Valid for 15 minutes)`, 
                type: 'info' 
            });

            setStep(2);
            
        } catch (err) {
            setMessage({ 
                text: 'Failed to process reset request. Please try again.', 
                type: 'error' 
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyCode = async (e) => {
        e.preventDefault();
        setMessage({ text: '', type: '' });
        setIsLoading(true);

        try {
            if (!userId) {
                setMessage({ 
                    text: 'Session expired. Please start over.', 
                    type: 'error' 
                });
                setIsLoading(false);
                return;
            }

            const resetRef = doc(db, 'password_resets', userId);
            const resetDoc = await getDoc(resetRef);

            if (!resetDoc.exists()) {
                setMessage({ 
                    text: 'No reset request found. Please request a new code.', 
                    type: 'error' 
                });
                setIsLoading(false);
                return;
            }

            const resetData = resetDoc.data();

            if (resetCode !== resetData.code) {
                setMessage({ 
                    text: 'Invalid reset code. Please check and try again.', 
                    type: 'error' 
                });
                setIsLoading(false);
                return;
            }

            const expiresAt = resetData.expiresAt.toDate();
            if (new Date() > expiresAt) {
                setMessage({ 
                    text: 'Reset code has expired. Please request a new one.', 
                    type: 'error' 
                });
                setIsLoading(false);
                return;
            }

            if (resetData.used) {
                setMessage({ 
                    text: 'Reset code already used. Please request a new one.', 
                    type: 'error' 
                });
                setIsLoading(false);
                return;
            }

            setMessage({ 
                text: 'Code verified successfully! You can now set your new password.', 
                type: 'success' 
            });

            setStep(3);
            
        } catch (err) {
            setMessage({ 
                text: 'Failed to verify code. Please try again.', 
                type: 'error' 
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        setMessage({ text: '', type: '' });
        setIsLoading(true);

        if (newPassword !== confirmPassword) {
            setMessage({ text: 'Passwords do not match', type: 'error' });
            setIsLoading(false);
            return;
        }

        if (newPassword.length < 6) {
            setMessage({ text: 'Password must be at least 6 characters', type: 'error' });
            setIsLoading(false);
            return;
        }

        try {
            if (!userId) {
                setMessage({ 
                    text: 'Session expired. Please start over.', 
                    type: 'error' 
                });
                setIsLoading(false);
                return;
            }

            const userRef = doc(db, 'users', userId);
            await updateDoc(userRef, {
                password: newPassword
            });

            const resetRef = doc(db, 'password_resets', userId);
            await updateDoc(resetRef, {
                used: true,
                usedAt: serverTimestamp()
            });

            setMessage({ 
                text: 'Password reset successfully! Redirecting to login...', 
                type: 'success' 
            });

            setTimeout(() => {
                navigate('/login');
            }, 2000);
            
        } catch (err) {
            if (err.code === 'permission-denied') {
                setMessage({ 
                    text: 'Permission denied. Please check security rules.', 
                    type: 'error' 
                });
            } else {
                setMessage({ 
                    text: 'Failed to reset password. Please try again.', 
                    type: 'error' 
                });
            }
        } finally {
            setIsLoading(false);
        }
    };

    const resetFlow = () => {
        setUsername('');
        setResetCode('');
        setNewPassword('');
        setConfirmPassword('');
        setUserId('');
        setStep(1);
        setMessage({ text: '', type: '' });
    };

    return (
        <div className="flex justify-center items-center min-h-screen bg-white px-4 py-8">
            <div className="relative w-full max-w-md bg-white rounded-lg overflow-hidden p-2">
                {/* Animated border effects */}
                <div className="absolute inset-0 rounded-lg overflow-hidden">
                    <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-b from-transparent via-orange-400 to-orange-400 animate-[spin_6s_linear_infinite] origin-bottom-right"></div>
                    <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-b from-transparent via-orange-400 to-orange-400 animate-[spin_6s_linear_infinite] origin-bottom-right" style={{animationDelay: '-3s'}}></div>
                    <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-b from-transparent via-green-600 to-green-600 animate-[spin_6s_linear_infinite] origin-bottom-right" style={{animationDelay: '-1.5s'}}></div>
                    <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-b from-transparent via-green-600 to-green-600 animate-[spin_6s_linear_infinite] origin-bottom-right" style={{animationDelay: '-4.5s'}}></div>
                </div>

                {/* Form container */}
                <div className="relative bg-gray-50 rounded-lg p-6 sm:p-8 z-10">
                    <h2 className="text-gray-900 font-medium text-center tracking-wider text-2xl sm:text-3xl mb-8">
                        {step === 1 ? 'Forgot Password' : step === 2 ? 'Verify Code' : 'Reset Password'}
                    </h2>

                    {message.text && (
                        <div className={`${
                            message.type === 'error' ? 'bg-red-100 text-red-700 border-red-300' : 
                            message.type === 'info' ? 'bg-blue-100 text-blue-700 border-blue-300' :
                            'bg-green-100 text-green-700 border-green-300'
                        } p-3 rounded-md mb-6 border flex items-start`}>
                            {message.type === 'error' ? (
                                <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                            ) : (
                                <CheckCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                            )}
                            <span className="text-sm break-words">{message.text}</span>
                        </div>
                    )}
                    
                    {step === 1 && (
                        <div className="space-y-6">
                            <div className="w-full">
                                <label className="block text-gray-700 text-sm font-medium mb-2">
                                    Username
                                </label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
                                    <input
                                        type="text"
                                        name="username"
                                        required
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        className="w-full py-3 px-4 pl-10 bg-white border border-gray-300 rounded-lg text-gray-900 text-base placeholder-gray-400 transition-all duration-300 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400 focus:ring-opacity-50 hover:border-gray-400"
                                        placeholder="Enter your username"
                                        disabled={isLoading}
                                        autoComplete="username"
                                    />
                                </div>
                                <p className="text-xs text-gray-600 mt-2">
                                    We'll generate a reset code for your account
                                </p>
                            </div>
                            
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                                <button
                                    type="button"
                                    onClick={handleRequestReset}
                                    disabled={isLoading}
                                    className="w-full py-3 sm:py-4 bg-gradient-to-r from-orange-500 to-green-500 text-white font-semibold rounded-lg hover:from-orange-600 hover:to-green-600 active:from-orange-700 active:to-green-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl text-base"
                                >
                                    {isLoading ? (
                                        <span className="flex items-center justify-center">
                                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Generating Code...
                                        </span>
                                    ) : (
                                        'Get Reset Code'
                                    )}
                                </button>
                                <Link 
                                    to="/login"
                                    className="w-full sm:w-auto text-center text-orange-600 text-sm hover:text-orange-700 transition-colors duration-300"
                                >
                                    Back to Login
                                </Link>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6">
                            <div className="w-full">
                                <label className="block text-gray-700 text-sm font-medium mb-2">
                                    Reset Code
                                </label>
                                <div className="relative">
                                    <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
                                    <input
                                        type="text"
                                        name="resetCode"
                                        required
                                        value={resetCode}
                                        onChange={(e) => setResetCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                        className="w-full py-3 px-4 pl-10 bg-white border border-gray-300 rounded-lg text-gray-900 text-base placeholder-gray-400 transition-all duration-300 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400 focus:ring-opacity-50 hover:border-gray-400 text-center text-lg tracking-widest font-mono"
                                        placeholder="000000"
                                        disabled={isLoading}
                                        maxLength={6}
                                    />
                                </div>
                                <p className="text-xs text-gray-600 mt-2">
                                    Enter the 6-digit code sent to your account
                                </p>
                            </div>
                            
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                                <button
                                    type="button"
                                    onClick={handleVerifyCode}
                                    disabled={isLoading}
                                    className="w-full py-3 sm:py-4 bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold rounded-lg hover:from-green-600 hover:to-green-700 active:from-green-700 active:to-green-800 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl text-base"
                                >
                                    {isLoading ? (
                                        <span className="flex items-center justify-center">
                                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Verifying...
                                        </span>
                                    ) : (
                                        'Verify Code'
                                    )}
                                </button>
                                <div className="flex gap-4 w-full sm:w-auto justify-center">
                                    <button 
                                        type="button"
                                        onClick={() => setStep(1)}
                                        className="text-orange-600 text-sm hover:text-orange-700 transition-colors duration-300"
                                    >
                                        Back
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={resetFlow}
                                        className="text-gray-600 text-sm hover:text-gray-700 transition-colors duration-300"
                                    >
                                        Start Over
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-6">
                            <div className="w-full">
                                <label className="block text-gray-700 text-sm font-medium mb-2">
                                    New Password
                                </label>
                                <div className="relative">
                                    <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        name="newPassword"
                                        required
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="w-full py-3 px-4 pl-10 pr-12 bg-white border border-gray-300 rounded-lg text-gray-900 text-base placeholder-gray-400 transition-all duration-300 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400 focus:ring-opacity-50 hover:border-gray-400"
                                        placeholder="Enter new password (min 6 characters)"
                                        disabled={isLoading}
                                        minLength={6}
                                        autoComplete="new-password"
                                    />
                                    <button 
                                        type="button" 
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-900 transition-colors duration-300"
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        {showPassword ? '🙈' : '👁️'}
                                    </button>
                                </div>
                            </div>
                            
                            <div className="w-full">
                                <label className="block text-gray-700 text-sm font-medium mb-2">
                                    Confirm Password
                                </label>
                                <div className="relative">
                                    <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        name="confirmPassword"
                                        required
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full py-3 px-4 pl-10 bg-white border border-gray-300 rounded-lg text-gray-900 text-base placeholder-gray-400 transition-all duration-300 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400 focus:ring-opacity-50 hover:border-gray-400"
                                        placeholder="Confirm new password"
                                        disabled={isLoading}
                                        minLength={6}
                                        autoComplete="new-password"
                                    />
                                </div>
                            </div>
                            
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                                <button
                                    type="button"
                                    onClick={handleResetPassword}
                                    disabled={isLoading}
                                    className="w-full py-3 sm:py-4 bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold rounded-lg hover:from-green-600 hover:to-green-700 active:from-green-700 active:to-green-800 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl text-base"
                                >
                                    {isLoading ? (
                                        <span className="flex items-center justify-center">
                                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Resetting...
                                        </span>
                                    ) : (
                                        'Reset Password'
                                    )}
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => setStep(2)}
                                    className="w-full sm:w-auto text-center text-orange-600 text-sm hover:text-orange-700 transition-colors duration-300"
                                >
                                    Back
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="mt-6 text-center">
                        <p className="text-gray-600 text-xs sm:text-sm">
                            🔒 Secure Password Reset
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;
