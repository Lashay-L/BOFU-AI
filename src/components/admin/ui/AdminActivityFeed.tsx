import React from 'react';
import { motion } from 'framer-motion';
import { Activity, Clock } from 'lucide-react';

interface ActivityItem {
  title: string;
  time: string;
}

interface AdminActivityFeedProps {
  activities: ActivityItem[];
}

export const AdminActivityFeed = ({ activities }: AdminActivityFeedProps) => (
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
      <button className="text-sm text-gray-400 hover:text-gray-300 font-medium transition-colors">
        View All
      </button>
    </div>
    <div className="space-y-3">
      {activities.length > 0 ? activities.slice(0, 5).map((activity, index) => (
        <div key={index} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-700/40 transition-colors border border-gray-700/20 hover:border-gray-600/30">
          <div className="flex-shrink-0 w-2 h-2 bg-gray-500 rounded-full mt-2" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-white font-medium">{activity.title}</p>
            <p className="text-xs text-gray-400 mt-1">{activity.time}</p>
          </div>
        </div>
      )) : (
        <div className="text-center py-8">
          <Clock className="h-10 w-10 text-gray-500 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">No recent activity</p>
        </div>
      )}
    </div>
  </motion.div>
); 