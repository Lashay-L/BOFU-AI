import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, ArrowLeft } from 'lucide-react';

interface AdminStatsCardProps {
  title: string;
  value: string | number;
  change?: string;
  icon: any;
  trend?: 'up' | 'down' | 'neutral';
  color?: 'gray' | 'dark' | 'minimal';
}

export const AdminStatsCard = ({ 
  title, 
  value, 
  change, 
  icon: Icon, 
  trend, 
  color = "gray" 
}: AdminStatsCardProps) => {
  const colorClasses = {
    gray: 'from-gray-600 to-gray-700',
    dark: 'from-gray-700 to-gray-800', 
    minimal: 'from-gray-500 to-gray-600'
  };

  const trendColors = {
    up: 'text-green-400',
    down: 'text-red-400',
    neutral: 'text-gray-400'
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      className="relative group"
    >
      <div className="relative bg-gray-800/60 backdrop-blur-sm p-6 rounded-lg shadow-lg border border-gray-700/30 hover:shadow-xl hover:border-gray-600/50 transition-all duration-300">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-400 mb-1">{title}</p>
            <p className="text-2xl font-bold text-white mb-2">{value}</p>
            {change && (
              <div className="flex items-center gap-1">
                {trend === 'up' && <TrendingUp size={14} className={trendColors.up} />}
                {trend === 'down' && <ArrowLeft size={14} className={`${trendColors.down} rotate-45`} />}
                <span className={`text-xs font-medium ${trend ? trendColors[trend] : 'text-gray-400'}`}>
                  {change}
                </span>
              </div>
            )}
          </div>
          <div className={`p-2 rounded-lg bg-gradient-to-r ${colorClasses[color]} shadow-sm border border-gray-600/20`}>
            <Icon className="h-5 w-5 text-gray-300" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}; 