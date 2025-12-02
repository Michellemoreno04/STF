import { initializeApp } from "firebase/app";
import { getAuth, OAuthProvider } from "firebase/auth";
import { initializeFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = initializeFirestore(app, {
    experimentalForceLongPolling: true,
});
export const microsoftProvider = new OAuthProvider('microsoft.com');

// Optional: Specify tenant if needed (common for enterprise apps)
microsoftProvider.setCustomParameters({
    // tenant: 'TENANT_ID',
    prompt: 'consent'
});
