

import React, { useState } from 'react';
import backendAPI from '../../services/backendAPI';
import { RegistrationFormData, UserProfile } from '../../types';
import { useAppContext } from '../../contexts/AppContext';
import { translate, TranslationKey } from '../../i18n';

interface RegisterProps {
  onRegisterSuccess: (user: UserProfile) => void;
  onSwitchToLogin: () => void;
}

const Register: React.FC<RegisterProps> = ({ onRegisterSuccess, onSwitchToLogin }) => {
  const { state } = useAppContext();
  const t = (key: TranslationKey) => translate(state.settings.language, key);
  const [formData, setFormData] = useState<RegistrationFormData>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    streetAddress: '',
    city: '',
    state: '',
    country: '',
    zipCode: '',
  });
  const [error, setError] = useState('');
  const [isRegistered, setIsRegistered] = useState(false);
  const [registeredUser, setRegisteredUser] = useState<UserProfile | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.email || !formData.password) {
      setError(t('errorRequiredFields'));
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError(t('errorPasswordsMismatch'));
      return;
    }

    if (!formData.firstName || !formData.lastName) {
      setError(t('errorNameRequired'));
      return;
    }

    try {
      // Sanitizing payload: remove confirmPassword before sending to API
      const { confirmPassword, ...registrationData } = formData;
      const response: any = await backendAPI.register(registrationData);
      
      if (response && response.user) {
        setRegisteredUser(response.user);
        setIsRegistered(true);
      }
    } catch (e: any) {
      console.error('Registration API error:', e);
      setError(e?.message || t('errorUnexpected'));
    }
  };
  
  const handleProceedToLogin = () => {
    if (registeredUser) {
      // Log the user in with the profile returned from registration
      onRegisterSuccess(registeredUser);
    }
    // Fallback switch if user state wasn't captured
    onSwitchToLogin();
  };

  if (isRegistered) {
      return (
        <div className="bg-gray-800 p-8 rounded-lg shadow-xl w-full text-center">
            <h2 className="text-2xl font-bold text-green-400 mb-4">{t('registrationSuccessful')}</h2>
            <p className="text-gray-300 mb-6">{t('welcomeUser')} {formData.firstName}! {t('yourSmartFarmingAssistant')}</p>
            
            <div className="text-left bg-gray-700/50 p-4 rounded-md space-y-2 mb-6">
                <p className="text-gray-400"><strong>Name:</strong> <span className="font-mono text-white">{formData.firstName} {formData.lastName}</span></p>
                <p className="text-gray-400"><strong>Email:</strong> <span className="font-mono text-white">{formData.email}</span></p>
                <p className="text-gray-400"><strong>Phone:</strong> <span className="font-mono text-white">{formData.phone || 'Not provided'}</span></p>
                <p className="text-gray-400"><strong>Location:</strong> <span className="font-mono text-white">{formData.city}, {formData.state} {formData.country}</span></p>
            </div>

            <button onClick={handleProceedToLogin} className="w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 focus:ring-offset-gray-800">
                Proceed to Login
            </button>
        </div>
      );
  }

  return (
    <div className="bg-gray-800 rounded-lg shadow-xl w-full">
        <div className="p-8">
            <h2 className="text-2xl font-bold text-center text-gray-100 mb-6">Create Account</h2>
            
            <form onSubmit={handleSubmit} className="space-y-3">
                {/* Personal Information Section */}
                <div>
                    <h3 className="text-sm font-semibold text-green-400 mb-3 uppercase tracking-wide">{t('personalInformation')}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                            <label htmlFor="firstName" className="block text-xs font-medium text-gray-300 mb-1">{t('firstName')} *</label>
                            <input
                                type="text"
                                id="firstName"
                                name="firstName"
                                value={formData.firstName}
                                onChange={handleChange}
                                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
                                placeholder="John"
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="lastName" className="block text-xs font-medium text-gray-300 mb-1">{t('lastName')} *</label>
                            <input
                                type="text"
                                id="lastName"
                                name="lastName"
                                value={formData.lastName}
                                onChange={handleChange}
                                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
                                placeholder="Doe"
                                required
                            />
                        </div>
                    </div>
                </div>

                {/* Account Credentials Section */}
                <div>
                    <h3 className="text-sm font-semibold text-green-400 mb-3 uppercase tracking-wide">{t('accountCredentials')}</h3>
                    <div className="space-y-3">
                        <div>
                            <label htmlFor="email" className="block text-xs font-medium text-gray-300 mb-1">{t('email')} *</label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
                                placeholder="you@example.com"
                                required
                            />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                                <label htmlFor="password" className="block text-xs font-medium text-gray-300 mb-1">{t('password')} *</label>
                                <input
                                    type="password"
                                    id="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                            <div>
                                <label htmlFor="confirmPassword" className="block text-xs font-medium text-gray-300 mb-1">{t('confirmPassword')} *</label>
                                <input
                                    type="password"
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Contact Information Section */}
                <div>
                    <h3 className="text-sm font-semibold text-green-400 mb-3 uppercase tracking-wide">{t('contactInformation')}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="md:col-span-2">
                            <label htmlFor="phone" className="block text-xs font-medium text-gray-300 mb-1">{t('phone')}</label>
                            <input
                                type="tel"
                                id="phone"
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
                                placeholder="+1 (555) 123-4567"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label htmlFor="streetAddress" className="block text-xs font-medium text-gray-300 mb-1">{t('streetAddress')}</label>
                            <input
                                type="text"
                                id="streetAddress"
                                name="streetAddress"
                                value={formData.streetAddress}
                                onChange={handleChange}
                                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
                                placeholder="123 Farm Lane"
                            />
                        </div>
                        <div>
                            <label htmlFor="city" className="block text-xs font-medium text-gray-300 mb-1">{t('city')}</label>
                            <input
                                type="text"
                                id="city"
                                name="city"
                                value={formData.city}
                                onChange={handleChange}
                                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
                                placeholder="Springfield"
                            />
                        </div>
                        <div>
                            <label htmlFor="state" className="block text-xs font-medium text-gray-300 mb-1">{t('state')}</label>
                            <input
                                type="text"
                                id="state"
                                name="state"
                                value={formData.state}
                                onChange={handleChange}
                                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
                                placeholder="IL"
                            />
                        </div>
                        <div>
                            <label htmlFor="country" className="block text-xs font-medium text-gray-300 mb-1">{t('country')}</label>
                            <input
                                type="text"
                                id="country"
                                name="country"
                                value={formData.country}
                                onChange={handleChange}
                                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
                                placeholder="USA"
                            />
                        </div>
                        <div>
                            <label htmlFor="zipCode" className="block text-xs font-medium text-gray-300 mb-1">{t('zipCode')}</label>
                            <input
                                type="text"
                                id="zipCode"
                                name="zipCode"
                                value={formData.zipCode}
                                onChange={handleChange}
                                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
                                placeholder="62701"
                            />
                        </div>
                    </div>
                </div>
                
                {error && <p className="text-red-400 text-sm text-center bg-red-900/20 p-2 rounded">{error}</p>}

                <button type="submit" className="w-full mt-4 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 focus:ring-offset-gray-800 transition-colors">
                    {t('register')}
                </button>
            </form>
        </div>
        
        <div className="border-t border-gray-700 px-8 py-4 bg-gray-900/50">
            <p className="text-center text-sm text-gray-400">
                {t('haveAccount')}{' '}
                <button onClick={onSwitchToLogin} className="font-medium text-green-400 hover:text-green-300 transition-colors">
                    {t('signIn')}
                </button>
            </p>
        </div>
    </div>
  );
};

export default Register;