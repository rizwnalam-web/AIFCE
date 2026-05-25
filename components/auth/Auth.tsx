import React, { useState, useEffect } from 'react';
import App from '../../App';
import Login from './Login';
import Register from './Register';
import backendAPI from '../../services/backendAPI';
import { UserProfile } from '../../types';
import { useAppContext } from '../../contexts/AppContext';
import { translate, LANGUAGE_OPTIONS, TranslationKey } from '../../i18n';

const Auth: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { state, dispatch } = useAppContext();
  const t = (key: TranslationKey) => translate(state.settings.language, key);

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
            <div className="mb-6 flex justify-center gap-2">
              <select
                value={state.settings.language}
                onChange={(e) => dispatch({ type: 'SET_LANGUAGE', payload: e.target.value as any })}
                className="bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-1 focus:ring-green-500"
              >
                {LANGUAGE_OPTIONS.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.nativeLabel}
                  </option>
                ))}
              </select>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-green-400 text-center mb-2">
                {t('appTitle')}
            </h1>
            <p className="text-center mb-8 text-gray-400">{t('yourSmartFarmingAssistant')}</p>
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