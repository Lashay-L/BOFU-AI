import React from 'react';
import { motion } from 'framer-motion';
import { Users, BarChart3, BookOpen, Clock } from 'lucide-react';
import { AdminStatsCard, AdminActivityFeed, AdminQuickActions } from '../ui';
import { useAdminActivity } from '../../../hooks/useAdminActivity';

// Types
type AdminView = 'dashboard' | 'userManagement' | 'articleManagement' | 'commentManagement' | 'auditLogs' | 'adminAssignmentHub' | 'contentBriefManagement' | 'mediaLibrary';

interface Stats {
  totalUsers: number;
  totalResearches: number;
  totalApproved: number;
  pendingReview: number;
  monthlyGrowth: number;
}

interface AdminMainContentProps {
  currentView: AdminView;
  stats: Stats;
  renderMainContent: () => React.ReactNode;
}

export const AdminMainContent = ({
  currentView,
  stats,
  renderMainContent
}: AdminMainContentProps) => {
  // Fetch real admin activity data
  const { activities, isLoading, error, refresh } = useAdminActivity(8);

  return (
    <main className="p-6 bg-gray-800/90 min-h-screen">
      {currentView === 'dashboard' ? (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <AdminStatsCard
              title="Total Users"
              value={stats.totalUsers}
              change="+12% vs last month"
              trend="up"
              icon={Users}
              color="gray"
            />
            <AdminStatsCard
              title="Research Projects"
              value={stats.totalResearches}
              change="+8% vs last month"
              trend="up"
              icon={BarChart3}
              color="gray"
            />
            <AdminStatsCard
              title="Content Briefs"
              value={stats.totalApproved}
              change="+15% vs last month"
              trend="up"
              icon={BookOpen}
              color="gray"
            />
            <AdminStatsCard
              title="Active Sessions"
              value={stats.pendingReview}
              change={stats.pendingReview > 0 ? "Currently active" : "No active sessions"}
              trend="neutral"
              icon={Clock}
              color="gray"
            />
          </div>

          {/* Dashboard Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <AdminActivityFeed 
                activities={activities}
                isLoading={isLoading}
                error={error}
                onRefresh={refresh}
              />
            </div>
            <AdminQuickActions />
          </div>
        </motion.div>
      ) : (
        renderMainContent()
      )}
    </main>
  );
}; 