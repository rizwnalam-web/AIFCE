import React, { useState, useEffect } from 'react';
import App from '../../App';
import Login from './Login';
import Register from './Register';
import { User } from '../../types';

const Auth: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('currentUser');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error("Failed to parse user from localStorage", error);
      localStorage.removeItem('currentUser');
    }
    setIsLoading(false);
  }, []);

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
    localStorage.setItem('currentUser', JSON.stringify(loggedInUser));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('currentUser');
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