import React, { useState } from 'react';
import { auth, microsoftProvider } from '../../../firebase';
import { signInWithPopup } from 'firebase/auth';
import { Loader2 } from 'lucide-react';

const Login: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleMicrosoftLogin = async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await signInWithPopup(auth, microsoftProvider);
            // The signed-in user info.
            const user = result.user;
            console.log("User signed in:", user);
            // I can access the Microsoft Access Token if needed:
            // const credential = OAuthProvider.credentialFromResult(result);
            // const accessToken = credential?.accessToken;

            // Redirect or update state here after successful login

            // alert(`Welcome ${user.displayName}!`);
            console.log(user.displayName);

        } catch (err: any) {
            console.error("Login error:", err);
            setError(err.message || "An error occurred during sign in.");
        } finally {
            setLoading(false);
        }
    };

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

                <button
                    onClick={handleMicrosoftLogin}
                    disabled={loading}
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
                </button>

                <div className="text-center text-xs text-gray-400 dark:text-gray-500">
                    By signing in, you agree to our Terms of Service and Privacy Policy.
                </div>
            </div>
        </div>
    );
};

export default Login;
