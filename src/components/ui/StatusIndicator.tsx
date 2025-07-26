import React from 'react';
import { motion } from 'framer-motion';
import { Loader2, CheckCircle, AlertCircle, Save } from 'lucide-react';

export type SaveStatus = 'saved' | 'saving' | 'error' | null;

interface StatusIndicatorProps {
  status: SaveStatus;
  isAutoSaving: boolean;
  lastSaved: Date | null;
  theme?: 'light' | 'dark';
}

const formatTimeAgo = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString();
};

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({ 
  status, 
  isAutoSaving, 
  lastSaved,
  theme = 'light'
}) => {
  const getStatusConfig = () => {
    if (isAutoSaving || status === 'saving') {
      return {
        icon: Loader2,
        text: 'Saving...',
        className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800',
        iconClassName: 'animate-spin text-blue-500'
      };
    }
    
    if (status === 'saved') {
      return {
        icon: CheckCircle,
        text: lastSaved ? `Saved ${formatTimeAgo(lastSaved)}` : 'Saved',
        className: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800',
        iconClassName: 'text-green-500'
      };
    }
    
    if (status === 'error') {
      return {
        icon: AlertCircle,
        text: 'Save failed',
        className: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800',
        iconClassName: 'text-red-500'
      };
    }
    
    return {
      icon: Save,
      text: 'Ready',
      className: 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700',
      iconClassName: 'text-gray-500'
    };
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      className={`
        flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium
        border backdrop-blur-sm min-w-[100px] justify-center
        ${config.className}
      `}
      layout
    >
      <Icon className={`w-3 h-3 flex-shrink-0 ${config.iconClassName}`} />
      <span className="whitespace-nowrap">{config.text}</span>
    </motion.div>
  );
};