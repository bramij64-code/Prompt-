// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSy...",
    authDomain: "motioncraft-pro.firebaseapp.com",
    projectId: "motioncraft-pro",
    storageBucket: "motioncraft-pro.appspot.com",
    messagingSenderId: "...",
    appId: "..."
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();
