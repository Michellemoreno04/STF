import React, { useState } from 'react';
import { auth, db } from '../../../firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';

const Login: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);

    const handleEmailAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (isSignUp) {
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
            setError(err.message || "An error occurred during authentication.");
        } finally {
            setLoading(false);
        }
    };

    // const handleMicrosoftLogin = async () => {
    //     setLoading(true);
    //     setError(null);
    //     try {
    //         const result = await signInWithPopup(auth, microsoftProvider);
    //         // The signed-in user info.
    //         const user = result.user;
    //         //console.log("User signed in:", user);

    //         // Save/Update user info in Firestore
    //         const userRef = doc(db, "users", user.uid);
    //         await setDoc(userRef, {
    //             uid: user.uid,
    //             email: user.email,
    //             displayName: user.displayName,
    //             photoURL: user.photoURL,
    //             lastLogin: serverTimestamp(),
    //         }, { merge: true }); // para que no se sobreescriba la informacion

    //         console.log("User info saved to DB");

    //         // I can access the Microsoft Access Token if needed:
    //         // const credential = OAuthProvider.credentialFromResult(result);
    //         // const accessToken = credential?.accessToken;

    //         // Redirect or update state here after successful login

    //         // alert(`Welcome ${user.displayName}!`);
    //         console.log(user.displayName);

    //     } catch (err: any) {
    //         console.error("Login error:", err);
    //         setError(err.message || "An error occurred during sign in.");
    //     } finally {
    //         setLoading(false);
    //     }
    // };

    // const handleGuestLogin = async () => {
    //     setLoading(true);
    //     setError(null);
    //     try {
    //         const result = await signInAnonymously(auth);
    //         const user = result.user;
    //         console.log("Guest user signed in:", user);

    //         // Save/Update guest user info in Firestore
    //         const userRef = doc(db, "users", user.uid);
    //         await setDoc(userRef, {
    //             uid: user.uid,
    //             email: null,
    //             displayName: "Guest User",
    //             photoURL: null,
    //             isGuest: true,
    //             lastLogin: serverTimestamp(),
    //         }, { merge: true });

    //         console.log("Guest user info saved to DB");

    //     } catch (err: any) {
    //         console.error("Guest login error:", err);
    //         setError(err.message || "An error occurred during guest sign in.");
    //     } finally {
    //         setLoading(false);
    //     }
    // };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-zinc-900 p-4">
            <div className="max-w-md w-full bg-white dark:bg-zinc-800 rounded-xl shadow-lg p-8 space-y-6 border border-gray-100 dark:border-zinc-700">
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Welcome Back</h1>
                    <p className="text-gray-500 dark:text-gray-400">Sign in to access your dashboard</p>
                </div>

                {error && (
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
                        {error}
                    </div>
                )}

                <form onSubmit={handleEmailAuth} className="space-y-4">
                    {isSignUp && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                placeholder="John Doe"
                                required={isSignUp}
                            />
                        </div>
                    )}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            placeholder="name@example.com"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            placeholder="••••••••"
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : (isSignUp ? 'Sign Up' : 'Sign In')}
                    </button>
                </form>

                <div className="text-center">

                    {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
                    <button
                        type="button"
                        onClick={() => setIsSignUp(!isSignUp)}
                        className="text-sm text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                    >
                        {isSignUp ? 'Sign in' : 'Sign up'}
                    </button>
                </div>

                {/* <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-200 dark:border-zinc-700"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-white dark:bg-zinc-800 text-gray-500">Or continue with</span>
                    </div>
                </div> */}

                {/* <button
                    onClick={handleMicrosoftLogin}
                    disabled={true}
                    className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-[#2F2F2F] hover:bg-[#1a1a1a] text-white rounded-lg transition-all duration-200 font-medium disabled:opacity-70 disabled:cursor-not-allowed shadow-sm hover:shadow-md"

                >
                    {loading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                        <svg className="w-5 h-5" viewBox="0 0 23 23" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path fill="#F35325" d="M1 1H10V10H1V1Z" />
                            <path fill="#81BC06" d="M12 1H21V10H12V1Z" />
                            <path fill="#05A6F0" d="M1 12H10V21H1V12Z" />
                            <path fill="#FFBA08" d="M12 12H21V21H12V12Z" />
                        </svg>
                    )}
                    <span>{loading ? 'Signing in...' : 'Sign in with Microsoft'}</span>
                </button> */}

                {/* <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-200 dark:border-zinc-700"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-white dark:bg-zinc-800 text-gray-500">Or continue with</span>
                    </div>
                </div> */}

                {/* <button
                    onClick={handleGuestLogin}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white dark:bg-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-600 text-gray-700 dark:text-white border border-gray-200 dark:border-zinc-600 rounded-lg transition-all duration-200 font-medium disabled:opacity-70 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
                >
                    {loading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                        <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                    )}
                    <span>Continue as Guest</span>
                </button> */}

                {/* <div className="text-center text-xs text-gray-400 dark:text-gray-500">
                    By signing in, you agree to our Terms of Service and Privacy Policy.
                </div> */}
            </div>
        </div>
    );
};

export default Login;
