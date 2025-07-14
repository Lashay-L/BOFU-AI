import React from 'react';
import { motion } from 'framer-motion';
import { Activity, Clock, MessageSquare, FileText, Users, Package, RefreshCw } from 'lucide-react';
import { AdminActivityItem } from '../../../hooks/useAdminActivity';

interface AdminActivityFeedProps {
  activities: AdminActivityItem[];
  isLoading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
}

const getActivityIcon = (type: AdminActivityItem['type']) => {
  switch (type) {
    case 'comment':
      return MessageSquare;
    case 'article':
      return FileText;
    case 'user':
      return Users;
    case 'content_brief':
      return Package;
    default:
      return Activity;
  }
};

const getActivityColor = (type: AdminActivityItem['type']) => {
  switch (type) {
    case 'comment':
      return 'text-blue-400';
    case 'article':
      return 'text-green-400';
    case 'user':
      return 'text-purple-400';
    case 'content_brief':
      return 'text-yellow-400';
    default:
      return 'text-gray-400';
  }
};

export const AdminActivityFeed = ({ 
  activities, 
  isLoading = false, 
  error = null, 
  onRefresh 
}: AdminActivityFeedProps) => (
  <motion.div 
    initial={{ opacity: 0, x: 20 }}
    animate={{ opacity: 1, x: 0 }}
    className="bg-gray-800/60 backdrop-blur-sm rounded-lg shadow-lg border border-gray-700/30 p-6"
  >
    <div className="flex items-center justify-between mb-6">
      <h3 className="text-lg font-semibold text-white flex items-center gap-2">
        <Activity className="h-5 w-5 text-gray-400" />
        Recent Activity
      </h3>
      <div className="flex items-center gap-2">
        {onRefresh && (
          <button 
            onClick={onRefresh}
            disabled={isLoading}
            className="p-1.5 text-gray-400 hover:text-gray-300 transition-colors disabled:opacity-50"
            title="Refresh activity"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        )}
        <button className="text-sm text-gray-400 hover:text-gray-300 font-medium transition-colors">
          View All
        </button>
      </div>
    </div>

    <div className="space-y-3">
      {isLoading ? (
        // Loading skeleton
        <div className="space-y-3">
          {[...Array(3)].map((_, index) => (
            <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-gray-700/20 animate-pulse">
              <div className="flex-shrink-0 w-8 h-8 bg-gray-600 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-600 rounded w-3/4" />
                <div className="h-3 bg-gray-700 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        // Error state
        <div className="text-center py-8">
          <Clock className="h-10 w-10 text-red-400 mx-auto mb-3" />
          <p className="text-red-400 text-sm mb-2">Failed to load activity</p>
          <p className="text-gray-500 text-xs">{error}</p>
          {onRefresh && (
            <button 
              onClick={onRefresh}
              className="mt-3 text-xs text-gray-400 hover:text-gray-300 transition-colors"
            >
              Try again
            </button>
          )}
        </div>
      ) : activities.length > 0 ? (
        // Activity list
        activities.slice(0, 5).map((activity) => {
          const IconComponent = getActivityIcon(activity.type);
          const iconColor = getActivityColor(activity.type);
          
          return (
            <motion.div 
              key={activity.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-700/40 transition-colors border border-gray-700/20 hover:border-gray-600/30 group"
            >
              <div className={`flex-shrink-0 w-8 h-8 ${iconColor} bg-gray-700/50 rounded-full flex items-center justify-center group-hover:bg-gray-600/50 transition-colors`}>
                <IconComponent className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white font-medium leading-5">{activity.title}</p>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-xs text-gray-400">{activity.time}</p>
                  {activity.user && (
                    <>
                      <span className="text-xs text-gray-600">•</span>
                      <p className="text-xs text-gray-500">{activity.user}</p>
                    </>
                  )}
                </div>
                {activity.details && (
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{activity.details}</p>
                )}
              </div>
            </motion.div>
          );
        })
      ) : (
        // Empty state
        <div className="text-center py-8">
          <Clock className="h-10 w-10 text-gray-500 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">No recent activity</p>
          <p className="text-gray-500 text-xs mt-1">Activity will appear here as it happens</p>
        </div>
      )}
    </div>
  </motion.div>
); 