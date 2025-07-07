import React from 'react';
import { motion } from 'framer-motion';
import { Zap, Plus, Eye, BarChart3, Activity } from 'lucide-react';

interface QuickAction {
  label: string;
  icon: any;
}

interface AdminQuickActionsProps {
  onActionClick?: (action: QuickAction) => void;
}

export const AdminQuickActions = ({ onActionClick }: AdminQuickActionsProps) => {
  const actions: QuickAction[] = [
    { label: 'New Article', icon: Plus },
    { label: 'Review Queue', icon: Eye },
    { label: 'User Reports', icon: BarChart3 },
    { label: 'System Health', icon: Activity }
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="bg-gray-800/60 backdrop-blur-sm rounded-lg shadow-lg border border-gray-700/30 p-6"
    >
      <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
        <Zap className="h-5 w-5 text-gray-400" />
        Quick Actions
      </h3>
      <div className="grid grid-cols-2 gap-3">
        {actions.map((action, index) => (
          <motion.button
            key={action.label}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onActionClick?.(action)}
            className="relative p-4 rounded-lg bg-gray-700/60 hover:bg-gray-600/60 text-gray-300 hover:text-white shadow-sm hover:shadow-md transition-all duration-200 border border-gray-600/30 hover:border-gray-500/50"
          >
            <div className="flex flex-col items-center gap-2">
              <action.icon className="h-5 w-5" />
              <span className="text-sm font-medium">{action.label}</span>
            </div>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}; 