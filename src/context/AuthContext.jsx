import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../firebase-config';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { SUPER_OWNER_EMAIL } from '../constants';

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
                    // Try to find the user in the 'users' collection
                    // We query by email because one email might belong to multiple companies
                    // We prioritize the companyId stored in localStorage during login
                    const lastCompanyId = localStorage.getItem('hrms_company_id');
                    
                    const q = query(collection(db, 'users'), where('email', '==', user.email));
                    const snapshot = await getDocs(q);
                    
                    let data = null;
                    if (!snapshot.empty) {
                        const matches = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
                        if (lastCompanyId) {
                            data = matches.find(m => m.companyId === lastCompanyId) || matches[0];
                        } else {
                            data = matches[0];
                        }
                    }

                    if (!data) {
                        // Logic for new users or Super Owner auto-creation
                        let role = 'employee';
                        if (user.email === SUPER_OWNER_EMAIL) role = 'super_owner';
                        
                        data = {
                            id: user.uid, // Use UID for new users/super owner
                            email: user.email,
                            name: user.displayName || user.email.split('@')[0],
                            role: role,
                            companyId: role === 'super_owner' ? 'platform' : 'pending',
                            status: 'active',
                            createdAt: new Date().toISOString()
                        };
                    } else {
                        // Force super_owner role for master email
                        if (user.email === SUPER_OWNER_EMAIL && data.role !== 'super_owner') {
                            data.role = 'super_owner';
                            data.companyId = 'platform';
                        }
                    }
                    
                    setUserData(data);
                    if (data.companyId) localStorage.setItem('hrms_company_id', data.companyId);
                    localStorage.setItem('hrms_user', JSON.stringify(data));
                } catch (err) {
                    console.error("Error fetching user data in AuthContext:", err);
                    const localUser = JSON.parse(localStorage.getItem('hrms_user') || 'null');
                    setUserData(localUser);
                }
            } else {
                setUserData(null);
                localStorage.removeItem('hrms_user');
                localStorage.removeItem('hrms_company_id');
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
