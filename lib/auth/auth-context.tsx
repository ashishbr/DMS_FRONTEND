"use client";

import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";

type Role = "finance" | "marketing" | "admin";

interface User {
  name: string;
  email: string;
  role: Role;
}

interface AuthContextValue {
  user: User;
  isAuthenticated: boolean;
  hydrated: boolean;
  setRole: (role: Role) => void;
  login: (username: string, password: string) => boolean;
  logout: () => void;
}

const CREDENTIALS = { username: "embadmin", password: "emb@admin2026" };

const defaultUser: User = {
  name: "EMB Admin",
  email: "embadmin@embglobal.com",
  role: "admin"
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User>(defaultUser);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem("dms_auth");
    if (stored === "true") setIsAuthenticated(true);
    setHydrated(true);
  }, []);

  const login = useCallback((username: string, password: string) => {
    if (username === CREDENTIALS.username && password === CREDENTIALS.password) {
      sessionStorage.setItem("dms_auth", "true");
      setIsAuthenticated(true);
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem("dms_auth");
    setIsAuthenticated(false);
  }, []);

  const setRole = useCallback((role: Role) => {
    setUser((current) => ({ ...current, role }));
  }, []);

  const value = useMemo(
    () => ({ user, isAuthenticated, hydrated, setRole, login, logout }),
    [user, isAuthenticated, hydrated, setRole, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return context;
}
