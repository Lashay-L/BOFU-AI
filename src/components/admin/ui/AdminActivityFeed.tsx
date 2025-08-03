import React from 'react';
import { motion } from 'framer-motion';
import { Activity, Clock, MessageSquare, FileText, Users, Package, RefreshCw, Search, CheckCircle, TrendingUp, User, Building2, Calendar, MoreHorizontal } from 'lucide-react';
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
      return User;
    case 'content_brief':
      return Package;
    case 'research':
      return Search;
    case 'approved_product':
      return CheckCircle;
    default:
      return Activity;
  }
};

const getActivityConfig = (type: AdminActivityItem['type']) => {
  switch (type) {
    case 'comment':
      return {
        color: 'text-blue-400',
        bgColor: 'bg-blue-500/10',
        borderColor: 'border-blue-500/20',
        ringColor: 'ring-blue-500/20'
      };
    case 'article':
      return {
        color: 'text-green-400',
        bgColor: 'bg-green-500/10',
        borderColor: 'border-green-500/20',
        ringColor: 'ring-green-500/20'
      };
    case 'user':
      return {
        color: 'text-purple-400',
        bgColor: 'bg-purple-500/10',
        borderColor: 'border-purple-500/20',
        ringColor: 'ring-purple-500/20'
      };
    case 'content_brief':
      return {
        color: 'text-yellow-400',
        bgColor: 'bg-yellow-500/10',
        borderColor: 'border-yellow-500/20',
        ringColor: 'ring-yellow-500/20'
      };
    case 'research':
      return {
        color: 'text-cyan-400',
        bgColor: 'bg-cyan-500/10',
        borderColor: 'border-cyan-500/20',
        ringColor: 'ring-cyan-500/20'
      };
    case 'approved_product':
      return {
        color: 'text-emerald-400',
        bgColor: 'bg-emerald-500/10',
        borderColor: 'border-emerald-500/20',
        ringColor: 'ring-emerald-500/20'
      };
    default:
      return {
        color: 'text-gray-400',
        bgColor: 'bg-gray-500/10',
        borderColor: 'border-gray-500/20',
        ringColor: 'ring-gray-500/20'
      };
  }
};

export const AdminActivityFeed = ({ 
  activities, 
  isLoading = false, 
  error = null, 
  onRefresh 
}: AdminActivityFeedProps) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-sm rounded-2xl shadow-2xl border border-gray-700/40 overflow-hidden"
  >
    {/* Header Section */}
    <div className="px-8 py-6 border-b border-gray-700/30 bg-gradient-to-r from-gray-800/60 to-gray-800/40">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl border border-blue-500/20">
            <TrendingUp className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Recent Activity</h3>
            <p className="text-sm text-gray-400">Real-time system activity</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {activities.length > 0 && (
            <div className="px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-full">
              <span className="text-xs font-semibold text-green-400">
                {activities.length} {activities.length === 1 ? 'event' : 'events'}
              </span>
            </div>
          )}
          {onRefresh && (
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onRefresh}
              disabled={isLoading}
              className="p-2 bg-gray-700/50 hover:bg-gray-600/50 text-gray-400 hover:text-gray-300 rounded-xl transition-all duration-200 disabled:opacity-50 border border-gray-600/30"
              title="Refresh activity"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </motion.button>
          )}
        </div>
      </div>
    </div>

    {/* Content Section */}
    <div className="p-6">
      {isLoading ? (
        // Enhanced Loading skeleton
        <div className="space-y-4">
          {[...Array(4)].map((_, index) => (
            <div key={index} className="flex items-start gap-4 p-4 rounded-xl bg-gray-700/20 animate-pulse">
              <div className="flex-shrink-0 w-12 h-12 bg-gray-600/50 rounded-xl" />
              <div className="flex-1 space-y-3">
                <div className="h-4 bg-gray-600/50 rounded-lg w-3/4" />
                <div className="h-3 bg-gray-700/50 rounded-lg w-1/2" />
                <div className="flex gap-2">
                  <div className="h-2 bg-gray-700/50 rounded w-16" />
                  <div className="h-2 bg-gray-700/50 rounded w-20" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        // Enhanced Error state
        <div className="text-center py-12">
          <div className="p-4 bg-red-500/10 rounded-full w-fit mx-auto mb-4 border border-red-500/20">
            <Clock className="h-8 w-8 text-red-400" />
          </div>
          <h4 className="text-lg font-semibold text-red-400 mb-2">Failed to load activity</h4>
          <p className="text-gray-400 text-sm mb-4">{error}</p>
          {onRefresh && (
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onRefresh}
              className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors border border-red-500/30"
            >
              Try again
            </motion.button>
          )}
        </div>
      ) : activities.length > 0 ? (
        // Enhanced Activity list
        <div className="space-y-3">
          {activities.slice(0, 6).map((activity, index) => {
            const IconComponent = getActivityIcon(activity.type);
            const config = getActivityConfig(activity.type);
            
            return (
              <motion.div 
                key={activity.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ x: 4 }}
                className="group relative"
              >
                <div className={`flex items-start gap-4 p-4 rounded-xl transition-all duration-300 hover:shadow-lg border ${config.borderColor} ${config.bgColor} hover:border-opacity-40`}>
                  {/* Icon Container */}
                  <div className={`flex-shrink-0 w-12 h-12 ${config.bgColor} ${config.borderColor} rounded-xl flex items-center justify-center border group-hover:scale-110 transition-transform duration-200`}>
                    <IconComponent className={`h-5 w-5 ${config.color}`} />
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="text-sm font-semibold text-white leading-tight group-hover:text-blue-300 transition-colors">
                        {activity.title}
                      </h4>
                      <button className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-600/30 rounded-md transition-all duration-200">
                        <MoreHorizontal className="h-3 w-3 text-gray-400" />
                      </button>
                    </div>
                    
                    {activity.details && (
                      <p className="text-xs text-gray-300 mb-2 line-clamp-2 leading-relaxed">
                        {activity.details}
                      </p>
                    )}
                    
                    <div className="flex items-center gap-3 text-xs">
                      <div className="flex items-center gap-1.5 text-gray-400">
                        <Calendar className="h-3 w-3" />
                        <span>{activity.time}</span>
                      </div>
                      {activity.user && (
                        <>
                          <div className="w-1 h-1 bg-gray-600 rounded-full" />
                          <div className="flex items-center gap-1.5 text-gray-500">
                            <User className="h-3 w-3" />
                            <span className="truncate max-w-32">{activity.user}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
          
          {/* View More Button */}
          {activities.length > 6 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="pt-4 border-t border-gray-700/30"
            >
              <button className="w-full py-3 text-sm font-medium text-gray-400 hover:text-blue-400 transition-colors flex items-center justify-center gap-2 hover:bg-gray-700/20 rounded-lg">
                View {activities.length - 6} more activities
                <TrendingUp className="h-4 w-4" />
              </button>
            </motion.div>
          )}
        </div>
      ) : (
        // Enhanced Empty state
        <div className="text-center py-16">
          <div className="p-6 bg-gradient-to-br from-gray-700/30 to-gray-800/30 rounded-2xl w-fit mx-auto mb-6 border border-gray-600/20">
            <Activity className="h-12 w-12 text-gray-500 mx-auto" />
          </div>
          <h4 className="text-lg font-semibold text-gray-300 mb-2">No recent activity</h4>
          <p className="text-gray-500 text-sm max-w-sm mx-auto leading-relaxed">
            Activity from users, content briefs, and system events will appear here in real-time
          </p>
        </div>
      )}
    </div>
  </motion.div>
); 