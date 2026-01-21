// js/auth.js
class AuthManager {
    constructor() {
        this.auth = firebase.auth();
        this.db = firebase.firestore();
        this.initAuthListeners();
    }
    
    initAuthListeners() {
        this.auth.onAuthStateChanged((user) => {
            if (user) {
                this.handleUserLogin(user);
            } else {
                window.location.href = 'auth.html';
            }
        });
    }
    
    async signInWithEmail(email, password) {
        try {
            const userCredential = await this.auth.signInWithEmailAndPassword(email, password);
            return { success: true, user: userCredential.user };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    async signUpWithEmail(displayName, email, password) {
        try {
            const userCredential = await this.auth.createUserWithEmailAndPassword(email, password);
            await userCredential.user.updateProfile({ displayName });
            
            // Create user profile in Firestore
            await this.db.collection('users').doc(userCredential.user.uid).set({
                displayName: displayName,
                email: email,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                subscription: 'free',
                projectsCount: 0,
                templatesCreated: 0
            });
            
            return { success: true, user: userCredential.user };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    async signInWithGoogle() {
        const provider = new firebase.auth.GoogleAuthProvider();
        try {
            const result = await this.auth.signInWithPopup(provider);
            const user = result.user;
            
            // Check if user exists in Firestore
            const userDoc = await this.db.collection('users').doc(user.uid).get();
            if (!userDoc.exists) {
                await this.db.collection('users').doc(user.uid).set({
                    displayName: user.displayName,
                    email: user.email,
                    photoURL: user.photoURL,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    subscription: 'free',
                    projectsCount: 0,
                    templatesCreated: 0
                });
            }
            
            return { success: true, user };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    async handleUserLogin(user) {
        // Update last login
        await this.db.collection('users').doc(user.uid).update({
            lastLogin: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Redirect to editor
        window.location.href = 'editor.html';
    }
    
    async signOut() {
        await this.auth.signOut();
    }
}

// Initialize auth manager
const authManager = new AuthManager();

// Form handlers
document.getElementById('email-login-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    const result = await authManager.signInWithEmail(email, password);
    if (!result.success) {
        alert('Login failed: ' + result.error);
    }
});

document.getElementById('email-signup-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const displayName = document.getElementById('display-name').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    
    const result = await authManager.signUpWithEmail(displayName, email, password);
    if (!result.success) {
        alert('Signup failed: ' + result.error);
    }
});

// UI functions
function showSignUp() {
    document.getElementById('login-form').classList.add('hidden');
    document.getElementById('signup-form').classList.remove('hidden');
}

function showLogin() {
    document.getElementById('signup-form').classList.add('hidden');
    document.getElementById('login-form').classList.remove('hidden');
}
