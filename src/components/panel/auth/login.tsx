import React, { useState } from 'react';
import { auth, db } from '../../../firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, sendPasswordResetEmail } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Loader2, Mail, Lock, User, ArrowRight, CheckCircle2, Eye, EyeOff } from 'lucide-react';

const Login: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false)

    const [name, setName] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);
    const [resetEmailSent, setResetEmailSent] = useState(false);

    const handleResetPassword = async () => {
        if (!email) {
            setError("Please enter your email address to reset your password.");
            return;
        }

        try {
            await sendPasswordResetEmail(auth, email);
            setResetEmailSent(true);
            setError(null);
            setTimeout(() => setResetEmailSent(false), 6000); // Hide success message after 5s
        } catch (err: any) {
            console.error("Reset password error:", err);
            if (err.code === 'auth/user-not-found') {
                setError("No account found with this email.");
            } else {
                setError(err.message);
            }
        }
    };

    const handleEmailAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (isSignUp) {
                if (password !== confirmPassword) {
                    setError("The passwords do not match");
                    setLoading(false);
                    return;
                }
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;

                await updateProfile(user, {
                    displayName: name
                });

                const userRef = doc(db, "users", user.uid);
                await setDoc(userRef, {
                    uid: user.uid,
                    email: user.email,
                    displayName: name,
                    photoURL: user.photoURL,
                    lastLogin: serverTimestamp(),
                }, { merge: true });
            } else {
                const userCredential = await signInWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;

                const userRef = doc(db, "users", user.uid);
                await setDoc(userRef, {
                    uid: user.uid,
                    email: user.email,
                    lastLogin: serverTimestamp(),
                }, { merge: true });
            }
        } catch (err: any) {
            console.error("Auth error:", err);
            if (err.code === "auth/network-request-failed") {
                setError("No hay conexión a internet");
            } else if (err.code === 'auth/invalid-credential') {
                setError("This user doesn't exist yet, create an account by clicking on the Create an account button.");
            } else {
                setError(err.message);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex bg-white dark:bg-zinc-900">
            {/* Left Side - Decorative */}
            <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-zinc-900">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-indigo-900 opacity-90" />
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=2029&auto=format&fit=crop')] bg-cover bg-center mix-blend-overlay" />

                <div className="relative z-10 flex flex-col justify-between p-12 h-full text-white">
                    <div className="space-y-2">
                        <div className="flex flex-row items-center gap-3 h-12 mb-6">
                            <div className="h-12 w-12 bg-white/10 backdrop-blur-lg rounded-xl flex items-center justify-center border border-white/20">
                                <div className="h-6 w-6 bg-blue-500 rounded-full" />
                            </div>

                            <h2 className="text-4xl font-bold tracking-tight">STF</h2>
                        </div>

                        <h2 className="text-4xl font-bold tracking-tight">Sells Tracking Flow</h2>
                        <p className="text-blue-200 text-lg">Track your success, one sale at a time.</p>
                    </div>


                    <div className="space-y-6">
                        <div className="p-6 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10">
                            <p className="text-lg font-medium mb-4">"Become the best seller every day!"</p>
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-blue-400 to-indigo-400" />
                                <div>
                                    <p className="font-semibold">Sales is a numbers game: more attempts = more results.</p>
                                    <p className="text-sm text-blue-200">STF</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <div className="h-1 w-12 bg-white rounded-full" />
                            <div className="h-1 w-2 bg-white/30 rounded-full" />
                            <div className="h-1 w-2 bg-white/30 rounded-full" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Side - Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
                <div className="max-w-md w-full space-y-8">
                    <div className="text-center lg:text-left">
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight mb-2">
                            {isSignUp ? 'Create an account' : 'Welcome back'}
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400">
                            {isSignUp ? 'Enter your details to get started' : 'Please enter your details to sign in'}
                        </p>
                    </div>

                    <form onSubmit={handleEmailAuth} className="space-y-5">
                        {isSignUp && (
                            <div className="space-y-1.5">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Full Name</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <User className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-zinc-700 rounded-xl bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                        placeholder="John Doe"
                                        required={isSignUp}
                                    />
                                </div>
                            </div>
                        )}

                        <div className="space-y-1.5">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Mail className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-zinc-700 rounded-xl bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                    placeholder="name@company.com"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-zinc-700 rounded-xl bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                    placeholder="Password"
                                    required
                                />
                                <button className='absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'>
                                    {showPassword ? <EyeOff onClick={() => setShowPassword(false)} /> : <Eye onClick={() => setShowPassword(true)} />}
                                </button>
                            </div>
                            {isSignUp && (
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Lock className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-zinc-700 rounded-xl bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                        placeholder="Confirm Password"
                                        required

                                    />
                                </div>
                            )}
                        </div>

                        {!isSignUp && (
                            <div className="flex justify-end">
                                <button
                                    type="button"
                                    onClick={handleResetPassword}
                                    className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 hover:underline cursor-pointer"
                                >
                                    Forgot password?
                                </button>
                            </div>
                        )}

                        {error && (
                            <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-start gap-3">
                                <div className="flex-shrink-0">
                                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <div className="text-sm text-red-600 dark:text-red-400">
                                    {error}
                                </div>
                            </div>
                        )}

                        {resetEmailSent && (
                            <div className="p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 flex items-start gap-3">
                                <div className="flex-shrink-0">
                                    <CheckCircle2 className="h-5 w-5 text-green-400" />
                                </div>
                                <div className="text-sm text-green-600 dark:text-green-400">
                                    Password reset email sent! Check your inbox.
                                </div>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-semibold shadow-lg shadow-blue-500/30 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none cursor-pointer"
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    {isSignUp ? 'Create account' : 'Sign in'}
                                    <ArrowRight className="w-5 h-5" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-200 dark:border-zinc-800"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-2 bg-white dark:bg-zinc-900 text-gray-500">
                                {isSignUp ? 'Already have an account?' : "Don't have an account?"}
                            </span>
                        </div>
                    </div>

                    <div className="text-center">
                        <button
                            type="button"
                            onClick={() => {
                                setIsSignUp(!isSignUp);
                                setError(null);
                            }}
                            className="text-blue-600 underline dark:text-blue-400 hover:text-blue-700 font-medium transition-colors cursor-pointer"
                        >
                            {isSignUp ? 'Sign in' : 'Create an account'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
