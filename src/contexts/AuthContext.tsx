import { createContext, useContext, ReactNode, FC } from 'react';
import { useAuthLogic, AuthState, AuthActions } from '../hooks/useAuthLogic'; // We will create this file next

// 1. Define the context type
type AuthContextType = AuthState & AuthActions;

// 2. Create the context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 3. Create the provider component
export const AuthProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const auth = useAuthLogic();
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
};

// 4. Create the consumer hook
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 