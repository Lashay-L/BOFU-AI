import React from 'react';
import { motion } from 'framer-motion';
import { 
  Crown, 
  Home, 
  Users, 
  BookOpen, 
  FileText, 
  MessageSquare, 
  Shield, 
  UserCircle, 
  LogOut, 
  AlertCircle,
  Image
} from 'lucide-react';

// Types
type AdminView = 'dashboard' | 'userManagement' | 'articleManagement' | 'commentManagement' | 'auditLogs' | 'adminAssignmentHub' | 'contentBriefManagement' | 'mediaLibrary';

interface AssignedClient {
  id: string;
  client_email: string;
}

interface AdminSidebarProps {
  currentView: AdminView;
  adminRole: 'super_admin' | 'sub_admin' | null;
  adminEmail: string | null;
  assignedClients: AssignedClient[];
  adminError: string | null;
  onNavigation: (view: AdminView) => void;
  onLogout: () => void;
  onRefreshAdminData: () => void;
}

export const AdminSidebar = ({
  currentView,
  adminRole,
  adminEmail,
  assignedClients,
  adminError,
  onNavigation,
  onLogout,
  onRefreshAdminData
}: AdminSidebarProps) => {
  return (
    <motion.aside 
      initial={{ x: -100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="fixed left-0 top-0 h-full w-80 bg-gray-900/95 backdrop-blur-sm border-r border-gray-700/50 shadow-lg z-40"
    >
      <div className="flex flex-col h-full p-6">
        {/* Brand Header */}
        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-gray-700 rounded-lg flex items-center justify-center">
              <Crown className="h-5 w-5 text-gray-300" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white">
                Control Center
              </h1>
              <p className="text-sm text-gray-400">Admin Dashboard</p>
            </div>
          </div>
          <div className="h-px bg-gray-700" />
        </motion.div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1">
          {/* Navigation Menu */}
          <div className="space-y-2">
            {[
              { view: 'dashboard', label: 'Dashboard', icon: Home },
              { view: 'userManagement', label: 'User Management', icon: Users },
              { view: 'contentBriefManagement', label: 'Content Brief Management', icon: BookOpen },
              { view: 'articleManagement', label: 'Article Management', icon: FileText },
              { view: 'mediaLibrary', label: 'Media Library', icon: Image },
              { view: 'commentManagement', label: 'Comment Management', icon: MessageSquare },
              ...(adminRole === 'super_admin' ? [
                { view: 'auditLogs' as AdminView, label: 'Security Logs', icon: Shield },
                { view: 'adminAssignmentHub' as AdminView, label: 'Admin Assignment Hub', icon: Users },
              ] : []),
            ].map((item, index) => (
              <motion.button
                key={item.view}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => onNavigation(item.view as AdminView)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                  currentView === item.view
                    ? 'bg-primary-500/20 text-yellow-300 border border-primary-500/30'
                    : 'text-gray-300 hover:text-white hover:bg-gray-700/50'
                }`}
              >
                <item.icon size={18} />
                <span className="font-medium">{item.label}</span>
                {currentView === item.view && (
                  <div className="ml-auto w-1.5 h-1.5 bg-gray-400 rounded-full" />
                )}
              </motion.button>
            ))}
          </div>
        </nav>

        {/* User Profile & Logout */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="mt-6 pt-6 border-t border-gray-700/50"
        >
          <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-800/60 mb-4 border border-gray-700/30">
            <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center">
              <UserCircle className="h-4 w-4 text-gray-300" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {adminEmail || 'Admin User'}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                  adminRole === 'super_admin' 
                    ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30' 
                    : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                }`}>
                  {adminRole === 'super_admin' ? 'Super Admin' : 'Sub Admin'}
                </span>
                {adminRole === 'sub_admin' && (
                  <span className="text-xs text-gray-400">
                    {assignedClients.length} clients
                  </span>
                )}
              </div>
            </div>
          </div>
          
          {/* Assignment Summary for Sub-Admins */}
          {adminRole === 'sub_admin' && assignedClients.length > 0 && (
            <div className="mb-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <h4 className="text-sm font-medium text-blue-300 mb-2">Your Assigned Clients</h4>
              <div className="space-y-1">
                {assignedClients.slice(0, 3).map(client => (
                  <div key={client.id} className="text-xs text-gray-300 truncate">
                    {client.client_email}
                  </div>
                ))}
                {assignedClients.length > 3 && (
                  <div className="text-xs text-blue-400">
                    +{assignedClients.length - 3} more
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Admin Error Display */}
          {adminError && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-400" />
                <span className="text-sm text-red-300">Admin Error</span>
              </div>
              <p className="text-xs text-red-400 mt-1">{adminError}</p>
              <button
                onClick={onRefreshAdminData}
                className="mt-2 text-xs text-red-300 hover:text-red-200 underline"
              >
                Retry
              </button>
            </div>
          )}
          
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-400 hover:text-white hover:bg-red-500/20 transition-all duration-200 border border-red-500/30 hover:border-red-500/50"
          >
            <LogOut size={16} />
            <span className="font-medium">Sign Out</span>
          </motion.button>
        </motion.div>
      </div>
    </motion.aside>
  );
}; 