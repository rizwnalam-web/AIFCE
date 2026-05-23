import React, { useState, useCallback } from 'react';

interface AutoCompleteInputProps {
  id: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  suggestionsData: string[];
  placeholder?: string;
  error?: string;
}

const getFilteredSuggestions = (value: string, suggestionsData: string[], limit: number = 7): string[] => {
    const trimmedValue = value.trim();
    if (trimmedValue.length === 0) return [];

    const lowerCaseValue = trimmedValue.toLowerCase();

    const startsWithMatches = suggestionsData.filter(item =>
        item.toLowerCase().startsWith(lowerCaseValue)
    );

    const includesMatches = suggestionsData.filter(item =>
        !item.toLowerCase().startsWith(lowerCaseValue) && item.toLowerCase().includes(lowerCaseValue)
    );

    return [...startsWithMatches, ...includesMatches].slice(0, limit);
};

const AutoCompleteInput: React.FC<AutoCompleteInputProps> = ({
  id,
  label,
  value,
  onChange,
  suggestionsData,
  placeholder,
  error,
}) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    setSuggestions(getFilteredSuggestions(newValue, suggestionsData));
    setShowSuggestions(true);
  };

  const handleSuggestionClick = (suggestion: string) => {
    onChange(suggestion);
    setShowSuggestions(false);
  };

  const handleBlur = () => {
    // Timeout allows click event to fire before suggestions disappear
    setTimeout(() => setShowSuggestions(false), 150);
  };
  
  const handleFocus = () => {
    if (value) {
      setSuggestions(getFilteredSuggestions(value, suggestionsData));
      setShowSuggestions(true);
    }
  };

  return (
    <div className="relative w-full">
      {label && <label htmlFor={id} className="block text-sm font-medium text-gray-300">{label}</label>}
      <input
        type="text"
        id={id}
        value={value}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        autoComplete="off"
        className={`mt-1 block w-full bg-gray-700 border rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-green-500 focus:border-green-500 ${error ? 'border-red-500' : 'border-gray-600'}`}
        placeholder={placeholder}
        aria-invalid={!!error}
      />
      {showSuggestions && suggestions.length > 0 && (
        <ul className="absolute z-20 w-full bg-gray-600 border border-gray-500 rounded-md mt-1 max-h-60 overflow-y-auto shadow-lg">
          {suggestions.map(suggestion => (
            <li
              key={suggestion}
              className="px-4 py-2 cursor-pointer text-white hover:bg-green-700"
              onMouseDown={() => handleSuggestionClick(suggestion)}
            >
              {suggestion}
            </li>
          ))}
        </ul>
      )}
       {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
};

export default AutoCompleteInput;
