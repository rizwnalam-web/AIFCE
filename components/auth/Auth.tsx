import React, { useState, useEffect } from 'react';
import App from '../../App';
import Login from './Login';
import Register from './Register';
import backendAPI from '../../services/backendAPI';
import { UserProfile } from '../../types';

const Auth: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Aligned with DEPLOYMENT.md: Removed localStorage usage.
    // Session should be initialized/verified via a backend call.
    const initSession = async () => {
      try {
        const response: any = await backendAPI.initSession();
        if (response?.user) setUser(response.user);
      } catch (error) {
        console.error('Failed to initialize session', error);
      } finally {
        setIsLoading(false);
      }
    };
    initSession();
  }, []);

  const handleLogin = (loggedInUser: UserProfile) => {
    setUser(loggedInUser);
    backendAPI.setUserId(loggedInUser.id ?? null);
  };

  const handleLogout = () => {
    setUser(null);
    // Aligned with DEPLOYMENT.md: Removed localStorage usage.
    // Session termination should be handled via backend/cookies.
    backendAPI.setUserId(null);
  };
  
  if (isLoading) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-gray-900">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-400"></div>
          </div>
      );
  }

  if (user) {
    return <App user={user} onLogout={handleLogout} />;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-900">
       <div className="w-full max-w-md">
            <h1 className="text-3xl md:text-4xl font-bold text-green-400 text-center mb-2">
                AI Farming Cultivation Estimator
            </h1>
            <p className="text-center mb-8 text-gray-400">Your smart farming assistant</p>
            {isRegistering ? (
                <Register onRegisterSuccess={handleLogin} onSwitchToLogin={() => setIsRegistering(false)} />
            ) : (
                <Login onLoginSuccess={handleLogin} onSwitchToRegister={() => setIsRegistering(true)} />
            )}
       </div>
    </div>
  );
};

export default Auth;