import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { loginUser, registerUser, fetchCurrentUser, UserLoginInput, UserRegisterInput, User } from '../api/auth'
import { deleteUserAccount } from '../api/users'

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (data: UserLoginInput) => Promise<void>;
  register: (data: UserRegisterInput) => Promise<void>;
  logout: () => void;
  deleteAccount: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('access_token'));
  const [user, setUser] = useState<User | null>(null);

  const isAuthenticated = Boolean(token);

  useEffect(() => {
    if (token) {
      localStorage.setItem('access_token', token);
    } else {
      localStorage.removeItem('access_token');
    }
  }, [token]);

  // Restore user from backend if token exists but user is null
  useEffect(() => {
    if (token && !user) {
      fetchCurrentUser(token)
        .then(u => setUser(u))
        .catch(() => {
          setToken(null);
          setUser(null);
        });
    }
  }, [token]);

  const login = async (data: UserLoginInput) => {
    const resp = await loginUser(data);
    setToken(resp.access_token);
    setUser(resp.user);
  };

  const register = async (data: UserRegisterInput) => {
    await registerUser(data);
    // auto-login
    await login({ email: data.email, password: data.password });
  };

  const deleteAccount = async () => {
    if (!token) return;
    await deleteUserAccount(token);
    logout();
  };

  const logout = () => {
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, deleteAccount, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
