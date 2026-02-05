import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Role } from '../types';
import { api } from '../services/db';

interface AuthContextType {
  user: User | null;
  // Updated signature to accept expectedRole
  login: (email: string, pass: string, expectedRole?: Role) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>(null!);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check local storage for persisted session
    const storedUser = localStorage.getItem('aquacheck_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, pass: string, expectedRole?: Role) => {
    try {
      const foundUser = await api.login(email, pass);
      
      if (foundUser) {
        // SECURITY CHECK: Ensure user role matches the portal they are trying to access
        if (expectedRole && foundUser.role !== expectedRole) {
            console.warn(`Login blocked: User ${foundUser.role} tried to access ${expectedRole} portal.`);
            return false;
        }

        setUser(foundUser);
        localStorage.setItem('aquacheck_user', JSON.stringify(foundUser));
        return true;
      }
      return false;
    } catch (e) {
      console.error(e);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('aquacheck_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);