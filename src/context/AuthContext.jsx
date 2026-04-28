import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../firebase-config';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

import { ADMIN_EMAILS } from '../constants';

const AuthContext = createContext();

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setCurrentUser(user);
            if (user) {
                try {
                    // Fetch user data from Firestore
                    const userDocRef = doc(db, 'users', user.uid);
                    const userDoc = await getDoc(userDocRef);
                    let data = userDoc.exists() ? userDoc.data() : null;

                    if (!data) {
                        let role = ADMIN_EMAILS.includes(user.email) ? 'admin' : 'employee';
                        data = {
                            id: user.uid,
                            email: user.email,
                            name: user.displayName || user.email.split('@')[0],
                            role: role,
                            createdAt: new Date().toISOString()
                        };
                        
                        try {
                            await setDoc(userDocRef, data);
                        } catch (writeErr) {
                            console.error("Permission error creating user document:", writeErr);
                        }
                    }
                    setUserData(data);
                    localStorage.setItem('hrms_user', JSON.stringify(data));
                } catch (err) {
                    console.error("Error fetching user data in AuthContext:", err);
                    let localUser = JSON.parse(localStorage.getItem('hrms_user') || 'null');
                    
                    if (!localUser) {
                        let role = ADMIN_EMAILS.includes(user.email) ? 'admin' : 'employee';
                        localUser = {
                            id: user.uid,
                            email: user.email,
                            name: user.displayName || user.email.split('@')[0],
                            role: role,
                            createdAt: new Date().toISOString()
                        };
                    }
                    
                    setUserData(localUser);
                }
            } else {
                setUserData(null);
                localStorage.removeItem('hrms_user');
            }
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const value = {
        currentUser,
        userData,
        loading
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
}
