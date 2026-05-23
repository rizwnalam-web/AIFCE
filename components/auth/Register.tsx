

import React, { useState } from 'react';
import { User } from '../../types';

interface RegisterProps {
  onRegisterSuccess: (user: User) => void;
  onSwitchToLogin: () => void;
}

const Register: React.FC<RegisterProps> = ({ onRegisterSuccess, onSwitchToLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isRegistered, setIsRegistered] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('All fields are required.');
      return;
    }
    if (password.length < 6) {
        setError('Password must be at least 6 characters long.');
        return;
    }
    
    // NOTE: This is a mock user registration system for demonstration purposes.
    // In a real application, you would make an API call to a secure backend.
    try {
        const storedUsersString = localStorage.getItem('farmAppUsers');
        const storedUsers = storedUsersString ? JSON.parse(storedUsersString) : {};

        if (storedUsers[email.toLowerCase()]) {
            setError('An account with this email already exists.');
            return;
        }

        storedUsers[email.toLowerCase()] = { password };
        localStorage.setItem('farmAppUsers', JSON.stringify(storedUsers));
        
        // Clear the app state for the new user to trigger onboarding
        localStorage.removeItem('farmAppState');

        setIsRegistered(true);

    } catch (e) {
        console.error("Error during registration:", e);
        setError('An unexpected error occurred. Please try again.');
    }
  };
  
  const handleProceedToLogin = () => {
    onRegisterSuccess({ email: email.toLowerCase() });
  };

  if (isRegistered) {
      return (
        <div className="bg-gray-800 p-8 rounded-lg shadow-xl w-full text-center">
            <h2 className="text-2xl font-bold text-green-400 mb-4">Registration Successful!</h2>
            <p className="text-gray-300 mb-6">A confirmation has been sent to your email with your login details. (This is a simulation - no email was actually sent).</p>
            
            <div className="text-left bg-gray-700/50 p-4 rounded-md space-y-2 mb-6">
                <p className="text-gray-400"><strong>Email:</strong> <span className="font-mono text-white">{email}</span></p>
                <p className="text-gray-400"><strong>Password:</strong> <span className="font-mono text-white">{password}</span></p>
            </div>

            <button onClick={handleProceedToLogin} className="w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 focus:ring-offset-gray-800">
                Proceed to App
            </button>
        </div>
      );
  }

  return (
    <div className="bg-gray-800 p-8 rounded-lg shadow-xl w-full">
        <h2 className="text-2xl font-bold text-center text-gray-100 mb-6">Create Account</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label htmlFor="reg-email" className="block text-sm font-medium text-gray-300">Email</label>
                <input
                    type="email"
                    id="reg-email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-green-500 focus:border-green-500"
                    placeholder="you@example.com"
                    required
                />
            </div>
            <div>
                <label htmlFor="reg-password"className="block text-sm font-medium text-gray-300">Password</label>
                <input
                    type="password"
                    id="reg-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-green-500 focus:border-green-500"
                    placeholder="••••••••"
                    required
                />
            </div>
            
            {error && <p className="text-red-400 text-sm text-center">{error}</p>}

            <button type="submit" className="w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 focus:ring-offset-gray-800">
                Register
            </button>
        </form>
        <p className="mt-6 text-center text-sm text-gray-400">
            Already have an account?{' '}
            <button onClick={onSwitchToLogin} className="font-medium text-green-400 hover:text-green-300">
                Sign in
            </button>
        </p>
    </div>
  );
};

export default Register;