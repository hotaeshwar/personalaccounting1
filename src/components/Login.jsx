import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

const Login = ({ setLoggedIn }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('guest');
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const email = `${username}@expense-tracker.local`;
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            const userDoc = await getDoc(doc(db, 'users', user.uid));
            
            if (!userDoc.exists()) {
                throw new Error('User data not found');
            }

            const userData = userDoc.data();

            if (userData.role !== role) {
                throw new Error(`Invalid role. Your account is registered as ${userData.role}`);
            }

            localStorage.setItem('token', user.accessToken);
            localStorage.setItem('userRole', userData.role);
            localStorage.setItem('userId', user.uid);
            localStorage.setItem('username', username);
            
            setLoggedIn(true);
            window.dispatchEvent(new Event('loginStateChanged'));
            navigate('/');
            
        } catch (err) {
            if (err.code === 'auth/invalid-email') {
                setError('Invalid username format');
            } else if (err.code === 'auth/user-disabled') {
                setError('This account has been disabled');
            } else if (err.code === 'auth/user-not-found') {
                setError('Username not found. Please check your username or register.');
            } else if (err.code === 'auth/wrong-password') {
                setError('Incorrect password. Please try again.');
            } else if (err.code === 'auth/too-many-requests') {
                setError('Too many failed attempts. Please try again later.');
            } else if (err.code === 'auth/network-request-failed') {
                setError('Network error. Please check your internet connection.');
            } else {
                setError(err.message || 'Login failed. Please try again.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    const testConnection = async () => {
        try {
            setError('Testing Firebase connection...');
            const currentUser = auth.currentUser;
            setError('✅ Firebase connection successful! Try logging in again.');
        } catch (err) {
            setError(`❌ Firebase connection failed: ${err.message}`);
        }
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
                        Sign in
                    </h2>

                    {error && (
                        <div className="bg-red-100 text-red-700 p-3 rounded-md mb-6 border border-red-300">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                                <span className="font-medium text-sm break-words">{error}</span>
                                {error.includes('Network error') && (
                                    <button 
                                        onClick={testConnection}
                                        className="text-xs bg-orange-600 text-white px-2 py-1 rounded hover:bg-orange-700 transition-colors whitespace-nowrap"
                                    >
                                        Test Connection
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Username Input */}
                        <div className="w-full">
                            <label className="block text-gray-700 text-sm font-medium mb-2">
                                Username
                            </label>
                            <input
                                type="text"
                                name="username"
                                required
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full py-3 px-4 bg-white border border-gray-300 rounded-lg text-gray-900 text-base placeholder-gray-400 transition-all duration-300 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400 focus:ring-opacity-50 hover:border-gray-400"
                                placeholder="Enter your username"
                                disabled={isLoading}
                            />
                        </div>

                        {/* Password Input */}
                        <div className="w-full">
                            <label className="block text-gray-700 text-sm font-medium mb-2">
                                Password
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    name="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full py-3 px-4 pr-12 bg-white border border-gray-300 rounded-lg text-gray-900 text-base placeholder-gray-400 transition-all duration-300 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400 focus:ring-opacity-50 hover:border-gray-400"
                                    placeholder="Enter your password"
                                    disabled={isLoading}
                                />
                                <button 
                                    type="button" 
                                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-900 transition-colors duration-300"
                                    onClick={togglePasswordVisibility}
                                    disabled={isLoading}
                                >
                                    {showPassword ? '🙈' : '👁️'}
                                </button>
                            </div>
                        </div>

                        {/* Role Selection */}
                        <div className="w-full">
                            <label className="block text-gray-700 text-sm font-medium mb-2">
                                Role
                            </label>
                            <div className="relative">
                                <select
                                    name="role"
                                    value={role}
                                    onChange={(e) => setRole(e.target.value)}
                                    className="w-full py-3 px-4 pr-10 bg-white border border-gray-300 rounded-lg text-gray-900 text-base appearance-none transition-all duration-300 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400 focus:ring-opacity-50 hover:border-gray-400 cursor-pointer"
                                    disabled={isLoading}
                                >
                                    <option value="guest" className="bg-white">Guest</option>
                                    <option value="admin" className="bg-white">Admin</option>
                                </select>
                                <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        {/* Links */}
                        <div className="flex flex-col sm:flex-row justify-between gap-3 sm:gap-0 pt-2">
                            <Link 
                                to="/forgot-password" 
                                className="text-orange-600 text-sm hover:text-orange-700 transition-colors duration-300 text-center sm:text-left"
                            >
                                Forgot Password?
                            </Link>
                            <Link 
                                to="/register" 
                                className="text-orange-600 text-sm hover:text-orange-700 transition-colors duration-300 text-center sm:text-right"
                            >
                                Create Account
                            </Link>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-3 sm:py-4 bg-gradient-to-r from-orange-500 to-green-500 text-white font-semibold rounded-lg hover:from-orange-600 hover:to-green-600 active:from-orange-700 active:to-green-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl text-base"
                        >
                            {isLoading ? (
                                <span className="flex items-center justify-center">
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Signing In...
                                </span>
                            ) : (
                                'Sign In'
                            )}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-gray-600 text-xs sm:text-sm">
                            🔒 Secure Firebase Authentication
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
