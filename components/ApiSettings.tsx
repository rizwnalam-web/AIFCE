import React, { useState, useEffect } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { ProviderType, ApiConfig } from '../types';
import { PlusIcon, TrashIcon, ExternalLinkIcon } from './icons';

interface ApiSettingsProps {
    onClose: () => void;
}

interface ModelOption {
    value: string;
    label: string;
    description: string;
}

interface ProviderDetails {
    label: string;
    url: string;
    defaultModel: string;
    recommendedModels: ModelOption[];
}

const PROVIDER_INFO: Record<ProviderType, ProviderDetails> = {
    gemini: { 
        label: 'Google Gemini', 
        url: 'https://aistudio.google.com/app/apikey', 
        defaultModel: 'gemini-2.5-flash',
        recommendedModels: [
            { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', description: 'General Purpose, Fast, Efficient' },
            { value: 'gemini-2.5-flash-lite-latest', label: 'Gemini 2.5 Flash Lite', description: 'Cost Effective, Low Latency' },
            { value: 'gemini-3-pro-preview', label: 'Gemini 3.0 Pro (Preview)', description: 'Complex Reasoning, Programming, Coding' },
            { value: 'gemini-2.5-flash-image', label: 'Gemini 2.5 Flash Image', description: 'Image Analysis & Generation' },
            { value: 'imagen-4.0-generate-001', label: 'Imagen 4.0', description: 'High Quality Image Generation' },
            { value: 'veo-3.1-generate-preview', label: 'Veo 3.1', description: 'High Quality Video Generation' },
            { value: 'veo-3.1-fast-generate-preview', label: 'Veo 3.1 Fast', description: 'Fast Video Generation' },
             { value: 'gemini-2.5-flash-native-audio-preview-09-2025', label: 'Gemini 2.5 Audio', description: 'Real-time Audio & Video' }
        ]
    },
    anthropic: { 
        label: 'Anthropic Claude', 
        url: 'https://console.anthropic.com/settings/keys', 
        defaultModel: 'claude-3-5-sonnet-20240620',
        recommendedModels: [
            { value: 'claude-3-5-sonnet-20240620', label: 'Claude 3.5 Sonnet', description: 'Balanced Intelligence & Speed, Coding' },
            { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus', description: 'High Intelligence, Complex Tasks' },
            { value: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku', description: 'Fast, Compact' }
        ]
    },
    cohere: { 
        label: 'Cohere', 
        url: 'https://dashboard.cohere.com/api-keys', 
        defaultModel: 'command-r-plus',
        recommendedModels: [
            { value: 'command-r-plus', label: 'Command R+', description: 'Advanced RAG & Tool Use' },
            { value: 'command-r', label: 'Command R', description: 'Optimized for RAG' }
        ]
    },
    openai: { 
        label: 'OpenAI', 
        url: 'https://platform.openai.com/api-keys', 
        defaultModel: 'gpt-4o',
        recommendedModels: [
            { value: 'gpt-4o', label: 'GPT-4o', description: 'Flagship, Multimodal, Fast' },
            { value: 'gpt-4-turbo', label: 'GPT-4 Turbo', description: 'High Capabilities' },
            { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo', description: 'Fast, Low Cost' },
            { value: 'dall-e-3', label: 'DALL-E 3', description: 'Image Generation' },
            { value: 'o1-preview', label: 'o1 Preview', description: 'Advanced Reasoning & Programming' },
            { value: 'o1-mini', label: 'o1 Mini', description: 'Fast Reasoning & Programming' }
        ]
    },
    grok: { 
        label: 'Grok', 
        url: 'https://x.ai/', 
        defaultModel: 'grok-beta',
        recommendedModels: [
             { value: 'grok-beta', label: 'Grok Beta', description: 'Latest Grok Model' }
        ]
    },
    deepseek: { 
        label: 'DeepSeek', 
        url: 'https://platform.deepseek.com/api_keys', 
        defaultModel: 'deepseek-chat',
        recommendedModels: [
            { value: 'deepseek-chat', label: 'DeepSeek Chat', description: 'General Chat' },
            { value: 'deepseek-coder', label: 'DeepSeek Coder', description: 'Programming & Code Generation' }
        ]
    }
};

const ApiSettings: React.FC<ApiSettingsProps> = ({ onClose }) => {
    const { state, dispatch } = useAppContext();
    const { apiConfigurations } = state;

    const [view, setView] = useState<'list' | 'form'>('list');
    const [editingConfig, setEditingConfig] = useState<ApiConfig | null>(null);

    const [provider, setProvider] = useState<ProviderType>('gemini');
    const [configName, setConfigName] = useState('');
    const [apiKey, setApiKey] = useState('');
    const [modelName, setModelName] = useState('gemini-2.5-flash');
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
    const [apiKeyError, setApiKeyError] = useState('');

    const validateApiKey = (key: string, providerType: ProviderType): string => {
        if (!key.trim()) return "API Key is required.";
        if (providerType === 'gemini' && !key.startsWith('AIzaSy')) {
            return "Invalid Gemini API Key format. It should start with 'AIzaSy'.";
        }
        if (providerType === 'anthropic' && !key.startsWith('sk-ant-')) {
            return "Invalid Anthropic API Key format. It should start with 'sk-ant-'.";
        }
        return '';
    };

    useEffect(() => {
        if (view === 'list') return;

        // Minimal debounce for validation visual feedback
        const timer = setTimeout(() => {
            setApiKeyError(validateApiKey(apiKey, provider));
        }, 500);
        return () => clearTimeout(timer);
    }, [apiKey, provider, view]);


    const handleAddNew = () => {
        setEditingConfig(null);
        setProvider('gemini');
        setConfigName('');
        setApiKey('');
        setModelName(PROVIDER_INFO.gemini.defaultModel);
        setApiKeyError('');
        setView('form');
    };

    const handleEdit = (config: ApiConfig) => {
        setEditingConfig(config);
        setProvider(config.provider);
        setConfigName(config.name);
        setApiKey(config.apiKey);
        setModelName(config.model);
        setApiKeyError('');
        setView('form');
    };

    const handleDelete = (id: string) => {
        if (window.confirm('Are you sure you want to remove this API provider configuration?')) {
            dispatch({ type: 'DELETE_API_CONFIG', payload: id });
        }
    };
    
    const handleProviderChange = (newProvider: ProviderType) => {
        setProvider(newProvider);
        setModelName(PROVIDER_INFO[newProvider].defaultModel);
        setApiKeyError(validateApiKey(apiKey, newProvider));
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        const error = validateApiKey(apiKey, provider);
        setApiKeyError(error);
        if (error) return;

        if (!configName.trim()) {
            // Basic check, though required prop handles it
            return;
        }

        setSaveStatus('saving');
        
        // Simulate network/processing delay
        setTimeout(() => {
             const newConfig: ApiConfig = {
                id: editingConfig ? editingConfig.id : Date.now().toString(),
                name: configName.trim(),
                provider: provider,
                apiKey: apiKey.trim(),
                model: modelName.trim(),
            };

            if (editingConfig) {
                dispatch({ type: 'UPDATE_API_CONFIG', payload: newConfig });
            } else {
                dispatch({ type: 'ADD_API_CONFIG', payload: newConfig });
            }
            
            setSaveStatus('saved');
            setTimeout(() => {
                setSaveStatus('idle');
                setView('list');
            }, 500);
        }, 600);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-gray-700">
                <div className="p-6 border-b border-gray-700 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-white">
                        {view === 'list' ? 'API Configurations' : (editingConfig ? 'Edit Provider' : 'Add Provider')}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">&times;</button>
                </div>
                
                <div className="p-6 overflow-y-auto flex-grow">
                    {view === 'list' ? (
                        <div className="space-y-4">
                            {apiConfigurations.length === 0 ? (
                                <div className="text-center py-8 text-gray-400 bg-gray-700/30 rounded-lg border border-gray-700 border-dashed">
                                    <p className="mb-2">No API providers configured.</p>
                                    <p className="text-sm">Add a provider to start using the AI features.</p>
                                </div>
                            ) : (
                                <div className="grid gap-3">
                                    {apiConfigurations.map(config => (
                                        <div key={config.id} className="flex items-center justify-between bg-gray-700 p-4 rounded-lg border border-gray-600">
                                            <div>
                                                <h3 className="font-bold text-white">{config.name}</h3>
                                                <p className="text-sm text-gray-300 flex items-center gap-2">
                                                    <span className="px-2 py-0.5 rounded bg-gray-600 text-xs uppercase">{config.provider}</span>
                                                    <span className="text-gray-400">{config.model}</span>
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button 
                                                    onClick={() => handleEdit(config)}
                                                    className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-500 transition-colors"
                                                >
                                                    Edit
                                                </button>
                                                <button 
                                                    onClick={() => handleDelete(config.id)}
                                                    className="p-1.5 text-red-400 hover:text-red-300 hover:bg-gray-600 rounded transition-colors"
                                                    title="Delete"
                                                >
                                                    <TrashIcon />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            
                            <button 
                                onClick={handleAddNew}
                                className="w-full py-3 border-2 border-dashed border-gray-600 rounded-lg text-gray-400 hover:border-green-500 hover:text-green-500 flex items-center justify-center gap-2 transition-all font-medium"
                            >
                                <PlusIcon /> Add New Provider
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSave} className="space-y-5" data-tour-id="api-settings-form">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Provider</label>
                                <select 
                                    value={provider}
                                    onChange={(e) => handleProviderChange(e.target.value as ProviderType)}
                                    className="block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-green-500 focus:border-green-500"
                                >
                                    {Object.entries(PROVIDER_INFO).map(([key, info]) => (
                                        <option key={key} value={key}>{info.label}</option>
                                    ))}
                                </select>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Configuration Name</label>
                                <input 
                                    type="text"
                                    value={configName}
                                    onChange={(e) => setConfigName(e.target.value)}
                                    placeholder="e.g., My Gemini Personal"
                                    className="block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-green-500 focus:border-green-500"
                                    required
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">API Key</label>
                                <input 
                                    type="password"
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                    placeholder={`Enter your ${PROVIDER_INFO[provider].label} API Key`}
                                    className={`block w-full bg-gray-700 border rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-green-500 focus:border-green-500 ${apiKeyError ? 'border-red-500' : 'border-gray-600'}`}
                                    required
                                />
                                {apiKeyError && <p className="mt-1 text-xs text-red-400">{apiKeyError}</p>}
                                <a 
                                    href={PROVIDER_INFO[provider].url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="mt-2 inline-flex items-center gap-1 text-xs text-green-400 hover:text-green-300"
                                >
                                    Get API Key <ExternalLinkIcon className="h-3 w-3"/>
                                </a>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Model</label>
                                <div className="relative">
                                    <input 
                                        type="text"
                                        list="model-suggestions"
                                        value={modelName}
                                        onChange={(e) => setModelName(e.target.value)}
                                        className="block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-green-500 focus:border-green-500"
                                        placeholder="Select or type model name..."
                                        required
                                    />
                                    <datalist id="model-suggestions">
                                        {PROVIDER_INFO[provider].recommendedModels.map(model => (
                                            <option key={model.value} value={model.value}>{model.label} - {model.description}</option>
                                        ))}
                                    </datalist>
                                </div>
                                <p className="mt-1 text-xs text-gray-400">Select a recommended model or type a specific model ID.</p>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button 
                                    type="button"
                                    onClick={() => setView('list')}
                                    className="flex-1 py-2 px-4 border border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-300 bg-transparent hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit"
                                    disabled={saveStatus !== 'idle' || !!apiKeyError}
                                    className="flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                >
                                    {saveStatus === 'saving' ? 'Saving...' : (saveStatus === 'saved' ? 'Saved!' : 'Save Provider')}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ApiSettings;
