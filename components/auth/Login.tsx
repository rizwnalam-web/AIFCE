
import React, { useState } from 'react';
import backendAPI from '../../services/backendAPI';
import { LoginCredentials, UserProfile } from '../../types';

interface LoginProps {
  onLoginSuccess: (user: UserProfile) => void;
  onSwitchToRegister: () => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess, onSwitchToRegister }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Both fields are required.');
      return;
    }
    
    try {
      const credentials: LoginCredentials = { email, password };
      const response: any = await backendAPI.login(credentials);

      if (!response.user) {
        throw new Error(response.error || response.message || 'Login failed.');
      }

      onLoginSuccess(response.user);
    } catch (e: any) {
      console.error('Login API error:', e);
      setError(e?.message || 'An unexpected error occurred. Please try again.');
    }
  };

  return (
    <div className="bg-gray-800 p-8 rounded-lg shadow-xl w-full">
        <h2 className="text-2xl font-bold text-center text-gray-100 mb-6">Sign In</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
            <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300">Email</label>
                <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-green-500 focus:border-green-500"
                    placeholder="you@example.com"
                    required
                />
            </div>
            <div>
                <label htmlFor="password"className="block text-sm font-medium text-gray-300">Password</label>
                <input
                    type="password"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-green-500 focus:border-green-500"
                    placeholder="••••••••"
                    required
                />
            </div>

            {error && <p className="text-red-400 text-sm text-center">{error}</p>}

            <button type="submit" className="w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 focus:ring-offset-gray-800">
                Login
            </button>
        </form>
        <p className="mt-6 text-center text-sm text-gray-400">
            Don't have an account?{' '}
            <button onClick={onSwitchToRegister} className="font-medium text-green-400 hover:text-green-300">
                Register here
            </button>
        </p>
    </div>
  );
};

export default Login;