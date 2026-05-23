
import React from 'react';

interface CardProps {
  title: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
}

const Card: React.FC<CardProps> = ({ title, children, icon }) => {
  return (
    <div className="bg-gray-700/50 rounded-lg shadow-lg p-6">
      <div className="flex items-center mb-4">
        {icon && <div className="text-green-400 mr-3">{icon}</div>}
        <h3 className="text-xl font-semibold text-green-400">{title}</h3>
      </div>
      <div className="text-gray-300 space-y-4">{children}</div>
    </div>
  );
};

export default Card;
