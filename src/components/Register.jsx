import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

const Register = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('guest');
    const [adminKey, setAdminKey] = useState('');
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const ADMIN_SECRET_KEY = import.meta.env.VITE_ADMIN_SECRET_KEY;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (role === 'admin') {
                const metadataDoc = await getDoc(doc(db, 'metadata', 'config'));
                
                if (metadataDoc.exists() && metadataDoc.data().adminExists) {
                    setError('Admin registration is disabled. Admin user already exists.');
                    setLoading(false);
                    return;
                }

                if (adminKey !== ADMIN_SECRET_KEY) {
                    setError('Invalid admin registration key');
                    setLoading(false);
                    return;
                }
            }

            const email = `${username}@expense-tracker.local`;
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            await setDoc(doc(db, 'users', user.uid), {
                username: username,
                role: role,
                createdAt: serverTimestamp()
            });

            if (role === 'admin') {
                await setDoc(doc(db, 'metadata', 'config'), {
                    adminExists: true,
                    adminUserId: user.uid,
                    updatedAt: serverTimestamp()
                });
            }

            navigate('/login');
            
        } catch (err) {
            if (err.code === 'auth/email-already-in-use') {
                setError('Username already registered');
            } else if (err.code === 'auth/weak-password') {
                setError('Password should be at least 6 characters');
            } else if (err.code === 'auth/invalid-email') {
                setError('Invalid username format');
            } else {
                setError(err.message || 'Registration failed. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
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
                <div className="relative bg-gray-100 rounded-lg p-6 sm:p-8 z-10">
                    <h2 className="text-gray-900 font-medium text-center tracking-wider text-2xl sm:text-3xl mb-8">
                        Create Account
                    </h2>

                    {error && (
                        <div className="bg-orange-100 text-orange-700 p-3 rounded-md mb-6 border border-orange-300">
                            <span className="text-sm">{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
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
                                disabled={loading}
                            />
                        </div>

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
                                    placeholder="Create a strong password (min 6 chars)"
                                    disabled={loading}
                                    minLength={6}
                                />
                                <button 
                                    type="button" 
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-900 transition-colors duration-300"
                                    onClick={togglePasswordVisibility}
                                    disabled={loading}
                                >
                                    {showPassword ? '🙈' : '👁️'}
                                </button>
                            </div>
                        </div>

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
                                    disabled={loading}
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

                        {role === 'admin' && (
                            <div className="w-full">
                                <label className="block text-gray-700 text-sm font-medium mb-2">
                                    Admin Key
                                </label>
                                <input
                                    type="password"
                                    name="adminKey"
                                    required={role === 'admin'}
                                    value={adminKey}
                                    onChange={(e) => setAdminKey(e.target.value)}
                                    className="w-full py-3 px-4 bg-white border border-gray-300 rounded-lg text-gray-900 text-base placeholder-gray-400 transition-all duration-300 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400 focus:ring-opacity-50 hover:border-gray-400"
                                    placeholder="Enter admin key"
                                    disabled={loading}
                                />
                            </div>
                        )}

                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 sm:py-4 bg-gradient-to-r from-orange-500 to-green-500 text-white font-semibold rounded-lg hover:from-orange-600 hover:to-green-600 active:from-orange-700 active:to-green-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl text-base"
                            >
                                {loading ? (
                                    <span className="flex items-center justify-center">
                                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Registering...
                                    </span>
                                ) : (
                                    'Register'
                                )}
                            </button>
                            <Link 
                                to="/login"
                                className="w-full sm:w-auto text-center text-orange-500 text-sm hover:text-orange-600 transition-colors duration-300"
                            >
                                Already have an account? Login
                            </Link>
                        </div>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-gray-600 text-xs sm:text-sm">
                            🔒 Secure Firebase Registration
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Register;
