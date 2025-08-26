import { createContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { 
  PublicClientApplication
} from "@azure/msal-browser";
import type { 
  IPublicClientApplication, 
  AccountInfo,
  AuthenticationResult,
  SilentRequest,
  EndSessionRequest
} from "@azure/msal-browser";
import { msalConfig, loginRequest } from "../config/authConfig";

interface AuthContextType {
  instance: IPublicClientApplication;
  accounts: AccountInfo[];
  inProgress: boolean;
  isAuthenticated: boolean;
  login: () => Promise<AuthenticationResult | void>;
  logout: () => Promise<void>;
  acquireTokenSilent: (request: SilentRequest) => Promise<AuthenticationResult>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export { AuthContext };

const msalInstance = new PublicClientApplication(msalConfig);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [accounts, setAccounts] = useState<AccountInfo[]>([]);
  const [inProgress, setInProgress] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const initializeMsal = async () => {
      await msalInstance.initialize();
      const currentAccounts = msalInstance.getAllAccounts();
      setAccounts(currentAccounts);
      setIsAuthenticated(currentAccounts.length > 0);
      setInProgress(false);
    };

    initializeMsal();
  }, []);

  const login = async () => {
    try {
      setInProgress(true);
      const response = await msalInstance.loginPopup(loginRequest);
      setAccounts(msalInstance.getAllAccounts());
      setIsAuthenticated(true);
      return response;
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    } finally {
      setInProgress(false);
    }
  };

  const logout = async () => {
    try {
      setInProgress(true);
      const logoutRequest: EndSessionRequest = {
        account: accounts[0],
        postLogoutRedirectUri: msalConfig.auth.postLogoutRedirectUri,
      };
      
      await msalInstance.logoutPopup(logoutRequest);
      setAccounts([]);
      setIsAuthenticated(false);
    } catch (error) {
      console.error("Logout failed:", error);
      throw error;
    } finally {
      setInProgress(false);
    }
  };

  const acquireTokenSilent = async (request: SilentRequest) => {
    try {
      const response = await msalInstance.acquireTokenSilent(request);
      return response;
    } catch (error) {
      console.error("Silent token acquisition failed:", error);
      throw error;
    }
  };

  const value: AuthContextType = {
    instance: msalInstance,
    accounts,
    inProgress,
    isAuthenticated,
    login,
    logout,
    acquireTokenSilent,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
