import React, { useState, useEffect, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase, supabaseAdmin } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { User } from '@supabase/supabase-js';
import { toast } from 'react-hot-toast';
import { Eye, EyeOff, Loader2, RefreshCw, UserCircle, ArrowLeft, Users, FileText, Shield, MessageSquare, BarChart3, TrendingUp, Clock, AlertCircle, Plus, Search, Filter, Calendar, Bell, LogOut, Home, Zap, Activity, BookOpen, UserPlus, Crown, Building2, UserCog, ChevronRight, Badge, ChevronDown, Edit, X, Mail, KeyRound, AlertTriangle, Trash2, Slack } from 'lucide-react';
import { useUserDeletion } from './ContentBriefManagement/hooks/useUserDeletion';
import { BaseModal } from '../ui/BaseModal';
import { AuditLogViewer } from './AuditLogViewer';
import { EnhancedCommentDashboard } from './EnhancedCommentDashboard';
import { useAdminContext } from '../../contexts/AdminContext';
import { AssignmentNotificationCenter } from './AssignmentNotificationCenter';
import { ContentBriefManagement } from './ContentBriefManagement';
import { AdminAssignmentHub } from './AdminAssignmentHub';
import { AdminSlackManagement } from './SlackManagement/AdminSlackManagement';
import { sendPasswordResetEmail } from '../../lib/auth';
import { AdminStatsCard, AdminActivityFeed, AdminQuickActions } from './ui';
import { AdminUserArticlesModal, AdminDirectPasswordChangeModal } from './modals';
import { AdminSidebar, AdminHeader, AdminMainContent } from './layout';
import { useUnreadNotificationCount } from '../../hooks/useUnreadNotificationCount';

// Dynamically import AdminArticleManagementPage for article editing functionality
const AdminArticleManagementPage = lazy(() => import('../../pages/AdminArticleManagementPage'));
const ImageRepositoryPage = lazy(() => import('../media/ImageRepositoryPage'));

type AdminView = 'dashboard' | 'userManagement' | 'articleManagement' | 'commentManagement' | 'auditLogs' | 'adminAssignmentHub' | 'contentBriefManagement' | 'mediaLibrary';

interface AdminDashboardProps {
  onLogout: () => void;
  user: User | null;
}

// Interface for user profile with enhanced structure
interface UserProfile {
  id: string;
  email: string;
  company_name: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
  user_type?: 'main' | 'sub';
  profile_role?: 'admin' | 'manager' | 'editor' | 'viewer';
  parent_user_id?: string;
  profile_name?: string;
  articleCount?: number;
}

// Interface for grouped user data
interface CompanyGroup {
  company_name: string;
  main_account: UserProfile;
  sub_accounts: UserProfile[];
  total_users: number;
  created_at: string;
}








// Simplified component - no complex grouping by approver
export function AdminDashboard({ onLogout, user }: AdminDashboardProps) {
  const navigate = useNavigate();
  const { 
    adminRole, 
    adminEmail, 
    assignedClients, 
    assignedClientIds, 
    allAdmins, 
    unassignedClients,
    refreshAdminData,
    error: adminError 
  } = useAdminContext();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSetupMode, setIsSetupMode] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalResearches: 0,
    totalApproved: 0,
    pendingReview: 0,
    monthlyGrowth: 0
  });
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [currentView, setCurrentView] = useState<AdminView>('dashboard');
  const [expandedCompanies, setExpandedCompanies] = useState<Set<string>>(new Set());
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [userSortBy, setUserSortBy] = useState<'company' | 'email' | 'date'>('company');
  const [selectedArticle, setSelectedArticle] = useState<any>(null);
  const [passwordResetLoading, setPasswordResetLoading] = useState<Set<string>>(new Set());
  const [directPasswordChangeUser, setDirectPasswordChangeUser] = useState<UserProfile | null>(null);
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [isMainAdmin, setIsMainAdmin] = useState(false);
  const [showPasswordChangeModal, setShowPasswordChangeModal] = useState(false);
  const [showNotificationCenter, setShowNotificationCenter] = useState(false);
  const [showSlackManagement, setShowSlackManagement] = useState(false);
  const [selectedCompanyForSlack, setSelectedCompanyForSlack] = useState<{ name: string; id: string } | null>(null);
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [dataInitialized, setDataInitialized] = useState(false);

  // Get unread notification count for the header badge
  const { unreadCount, refreshUnreadCount } = useUnreadNotificationCount(adminRole);

  // User deletion functionality
  const { 
    deleteUser, 
    getDeletionSummary, 
    isDeleting, 
    deletionSummary, 
    isLoadingSummary,
    isMainAdmin: checkIsMainAdmin
  } = useUserDeletion();

  // Article Management state
  const [selectedUserForArticles, setSelectedUserForArticles] = useState<{ user: UserProfile | null; companyGroup?: CompanyGroup | null }>({ user: null, companyGroup: null });

  const refreshData = () => {
    console.log('[AdminDashboard] Manually refreshing data at:', new Date().toISOString());
    setDataInitialized(false); // Force re-initialization
    setRefreshCounter(prev => prev + 1);
    refreshUnreadCount(); // Refresh unread notification count
  };

  const debugDatabase = async () => {
    console.log('[AdminDashboard] Debugging database tables...');
    try {
      // Directly test if we can query the user_profiles table instead of checking pg_tables
      console.log('[AdminDashboard] Testing database connection...');
      
      // Let's directly query the user_profiles table to see if it exists
      const { data: userProfilesData, error: userProfilesError } = await supabase
        .from('user_profiles')
        .select('*')
        .limit(1);
        
      if (userProfilesError) {
        console.error('[AdminDashboard] Error accessing user_profiles table:', userProfilesError);
        toast.error(`Database error: ${userProfilesError.message}`);
        
        // If we get a "relation does not exist" error, suggest running migrations
        if (userProfilesError.code === '42P01') {
          toast.error('The user_profiles table does not exist. Please run the database migrations.');
          console.log('[AdminDashboard] Migration needed. Follow these steps:');
          console.log('1. Go to the Supabase dashboard SQL Editor');
          console.log('2. Run the migration in supabase/migrations/20250615000000_separate_users_admins.sql');
          console.log('3. Run the migration in supabase_schema_update.sql');
        }
        return;
      }
      
      console.log('[AdminDashboard] Successfully accessed user_profiles table:', userProfilesData);
      
      // Check if we can access other required tables
      const tables = ['admin_profiles', 'research_results', 'approved_products'];
      let allTablesExist = true;
      
      for (const table of tables) {
        const { error } = await supabase.from(table).select('*').limit(1);
        if (error) {
          console.error(`[AdminDashboard] Error accessing ${table}:`, error);
          toast.error(`Table ${table} does not exist or is inaccessible`);
          allTablesExist = false;
        } else {
          console.log(`[AdminDashboard] Successfully accessed ${table}`);
        }
      }
      
      if (allTablesExist) {
        toast.success('All required database tables exist and are accessible!');
        // Refresh the data
        refreshData();
      }
    } catch (error) {
      console.error('[AdminDashboard] Debug error:', error);
      toast.error(`Debug error occurred: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const checkRLSPolicies = async () => {
    console.log('[AdminDashboard] Checking RLS policies...');
    try {
      toast.loading('Checking Supabase RLS policies...');
      
      // Test querying user_profiles with some debugging info
      const { data: userData, error: userError } = await supabase
        .from('user_profiles')
        .select('*')
        .limit(10);
        
      if (userError) {
        console.error('[AdminDashboard] Error accessing user_profiles:', userError);
        toast.error(`Policy error: ${userError.message}`);
      } else {
        console.log('[AdminDashboard] User profiles access successful:', userData);
        toast.success(`Successfully accessed user_profiles table. Found ${userData.length} records.`);
      }
      
      // Check if current user is admin
      const { data: { user } } = await supabase.auth.getUser();
      console.log('[AdminDashboard] Current user:', user);
      
      if (user) {
        const { data: adminData, error: adminError } = await supabase
          .from('admin_profiles')
          .select('*')
          .eq('id', user.id)
          .single();
          
        if (adminError && adminError.code !== 'PGRST116') {
          console.error('[AdminDashboard] Error checking admin status:', adminError);
        } else {
          console.log('[AdminDashboard] Admin check:', adminData ? 'User is admin' : 'User is not admin');
        }
      }
    } catch (error) {
      console.error('[AdminDashboard] RLS check error:', error);
      toast.error(`RLS check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  useEffect(() => {
    let mounted = true;
    
    const checkAndSetupDatabase = async () => {
      try {
        if (!mounted) return;
        
        // Skip if data is already initialized (unless refreshCounter changes)
        if (dataInitialized) {
          console.log('[AdminDashboard] Data already initialized, skipping setup');
          return;
        }
        
        setIsLoading(true);
        setSetupError(null);
        
        console.log('[AdminDashboard] Starting database and admin checks...');
        
        // Check tables exist
        const tables = ['admin_profiles', 'research_results'];
        
        for (const table of tables) {
          if (!mounted) return;
          const { error } = await supabase.from(table).select('id').limit(1);
          if (error) {
            console.error(`[AdminDashboard] Table ${table} check failed:`, error);
            throw new Error(`Database table '${table}' is not accessible. Please check your Supabase setup.`);
          }
        }
        
        // ... existing admin setup code ...
        
        if (!mounted) return;
        setIsSetupMode(false);
        
        // Now proceed with normal data fetching
        if (mounted) {
          await Promise.all([fetchStats(), fetchUsers()]);
          setDataInitialized(true);
        }
        
      } catch (error) {
        if (!mounted) return;
        console.error('[AdminDashboard] Setup error:', error);
        setSetupError(`Database setup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    // Fetch basic stats 
    const fetchStats = async () => {
      try {
        if (!mounted) return;
        
        // User count
        const { count: userCount } = await supabase
          .from('user_profiles')
          .select('*', { count: 'exact', head: true });

        // Research results count  
        const { count: researchCount } = await supabase
          .from('research_results')
          .select('*', { count: 'exact', head: true });

        if (!mounted) return;
        
        setStats({
          totalUsers: userCount || 0,
          totalResearches: researchCount || 0,
          totalApproved: 0,
          pendingReview: 0,
          monthlyGrowth: 12
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };

    // Fetch all non-admin users (updated to use role-based API)
    const fetchUsers = async () => {
      try {
        if (!mounted) return;
        
        console.log(`[AdminDashboard] Fetching users with admin permissions...`);
        
        if (!supabaseAdmin) {
          console.error('Admin client not available');
          return;
        }
        
        // Fetch main accounts from user_profiles using admin client
        const { data: mainUsers, error: mainError } = await supabaseAdmin
          .from('user_profiles')
          .select('*')
          .order('company_name', { ascending: true });

        if (mainError) {
          console.error('[AdminDashboard] Error fetching main users:', mainError);
          if (mounted) setSetupError('Failed to load main users');
          return;
        }

        if (!mounted) return;

        // Fetch sub accounts from company_profiles using admin client
        const { data: subProfiles, error: subError } = await supabaseAdmin
          .from('company_profiles')
          .select('*')
          .order('company_id', { ascending: true });

        if (subError) {
          console.error('[AdminDashboard] Error fetching sub profiles:', subError);
        }

        if (!mounted) return;

        console.log('[AdminDashboard] Main users fetched:', mainUsers?.length || 0);
        console.log('[AdminDashboard] Sub profiles fetched:', subProfiles?.length || 0);

        // Transform and combine the data (using ContentBriefManagement logic)
        const transformedUsers: UserProfile[] = [];
        
        // Group users by company and determine main vs sub accounts
        const companiesMap = new Map<string, UserProfile[]>();
        
        (mainUsers || []).forEach(user => {
          const companyName = user.company_name || 'Unknown Company';
          if (!companiesMap.has(companyName)) {
            companiesMap.set(companyName, []);
          }
          companiesMap.get(companyName)!.push(user);
        });
        
        // For each company, assign the earliest created user as main, others as sub
        companiesMap.forEach((companyUsers) => {
          // Sort by creation date (earliest first)
          companyUsers.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
          
          companyUsers.forEach((user, index) => {
            transformedUsers.push({
              ...user,
              user_type: index === 0 ? 'main' : 'sub',
              profile_role: index === 0 ? 'admin' : 'editor', // Main user is admin, others are editors
              parent_user_id: index === 0 ? undefined : companyUsers[0].id
            });
          });
        });

        // Create email lookup from main users
        const emailLookup: { [key: string]: string } = {};
        (mainUsers || []).forEach(user => {
          emailLookup[user.id] = user.email;
        });

        // Add sub users (company profiles)
        (subProfiles || []).forEach(profile => {
          // Try to get email from main user lookup, fallback to profile display
          let displayEmail = emailLookup[profile.user_id];
          if (!displayEmail) {
            displayEmail = profile.profile_name 
              ? `${profile.profile_name}@${profile.company_id || 'company'}`
              : `user-${profile.user_id.substring(0, 8)}@${profile.company_id || 'company'}`;
          }
          
          // Normalize company_id to handle empty strings
          const normalizedCompanyId = profile.company_id && profile.company_id.trim() !== '' 
            ? profile.company_id 
            : 'Unknown Company';
          
          transformedUsers.push({
            id: profile.user_id,
            email: displayEmail,
            company_name: normalizedCompanyId,
            created_at: profile.created_at,
            updated_at: profile.updated_at,
            user_type: 'sub',
            profile_role: profile.profile_role,
            profile_name: profile.profile_name
          });
        });
        
        if (!mounted) return;
        
        console.log('[AdminDashboard] Total transformed users:', transformedUsers.length);
        console.log('[AdminDashboard] Main users:', transformedUsers.filter(u => u.user_type === 'main').length);
        console.log('[AdminDashboard] Sub users:', transformedUsers.filter(u => u.user_type === 'sub').length);
        
        // Fetch article counts for all users
        const userIds = transformedUsers.map(user => user.id);
        
        // Deduplicate user IDs to avoid counting the same articles multiple times
        const uniqueUserIds = [...new Set(userIds)];
        
        const { data: articleCounts, error: articleError } = await supabaseAdmin
          .from('content_briefs')
          .select('user_id, product_name, id')
          .in('user_id', uniqueUserIds)
          .not('article_content', 'is', null)
          .neq('article_content', '')
          .neq('article_content', 'null');

        if (!mounted) return;

        if (articleError) {
          console.error('[AdminDashboard] Error fetching article counts:', articleError);
        } else {
          // Count unique articles per user (by article ID to count each article individually)
          const articleCountMap: { [key: string]: number } = {};
          const uniqueArticles = new Set();
          
          (articleCounts || []).forEach(article => {
            // Use article ID for uniqueness - each article should be counted individually
            const uniqueKey = article.id;
            if (!uniqueArticles.has(uniqueKey)) {
              uniqueArticles.add(uniqueKey);
              articleCountMap[article.user_id] = (articleCountMap[article.user_id] || 0) + 1;
            }
          });

          console.log('[AdminDashboard] Article count processing:', {
            totalRecords: articleCounts?.length || 0,
            uniqueArticles: uniqueArticles.size,
            userCounts: articleCountMap
          });

          // Add article counts to users
          transformedUsers.forEach(user => {
            user.articleCount = articleCountMap[user.id] || 0;
          });

          // For main accounts, aggregate all company articles (main + sub accounts)
          transformedUsers.forEach(user => {
            if (user.user_type === 'main') {
              const companyUsers = transformedUsers.filter(u => 
                u.company_name === user.company_name
              );
              
              // Deduplicate user IDs to avoid counting the same articles multiple times
              const uniqueUserIds = [...new Set(companyUsers.map(u => u.id))];
              const totalCompanyArticles = uniqueUserIds.reduce((sum, userId) => 
                sum + (articleCountMap[userId] || 0), 0
              );
              
              user.articleCount = totalCompanyArticles;
              
              // Reset sub-account counts to 0 since we're aggregating under main account
              companyUsers.forEach(subUser => {
                if (subUser.user_type === 'sub') {
                  subUser.articleCount = 0;
                }
              });
            }
          });
        }

        if (mounted) {
          setUsers(transformedUsers);
        }
      } catch (error) {
        console.error('[AdminDashboard] Exception fetching users:', error);
        if (mounted) {
          setSetupError(`Failed to fetch users: ${(error as any)?.message || String(error)}`);
        }
      }
    };

    // Start with database setup check
    checkAndSetupDatabase();
    
    // Set up real-time subscription for content_briefs table
    console.log('🔄 Setting up real-time subscription for admin dashboard...');
    
    const subscription = supabase
      .channel('admin_dashboard_content_briefs')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'content_briefs'
        },
        (payload) => {
          if (mounted) {
            console.log('🔄 Real-time content brief change detected in admin dashboard:', payload);
            // Refresh user data to update brief counts and statistics
            fetchUsers();
          }
        }
      )
      .subscribe();
    
    return () => {
      mounted = false;
      console.log('🔄 Cleaning up real-time subscription for admin dashboard');
      subscription.unsubscribe();
    };
  }, [refreshCounter]);

  const handleLogout = async () => {
    console.log('[AdminDashboard] handleLogout called, delegating to App.tsx handleSignOut');
    onLogout();
  };

  // Handle navigation
  const handleNavigation = (view: AdminView) => {
    if (view === 'mediaLibrary') {
      // Navigate to standalone media library page
      navigate('/admin/media-library');
      return;
    }
    
    setCurrentView(view);
  };

  // Password management functions
  const handleSendPasswordReset = async (user: UserProfile) => {
    try {
      setPasswordResetLoading(prev => new Set(prev).add(user.id));
      
      const result = await sendPasswordResetEmail(user.email);
      toast.success(`Password reset email sent to ${user.email}`);
    } catch (error) {
      console.error('Error sending password reset:', error);
      toast.error(`Failed to send password reset email to ${user.email}`);
    } finally {
      setPasswordResetLoading(prev => {
        const newSet = new Set(prev);
        newSet.delete(user.id);
        return newSet;
      });
    }
  };

  const handleDirectPasswordChange = async (user: UserProfile, newPassword: string) => {
    try {
      // Check if we have admin access to Supabase
      if (!supabaseAdmin) {
        toast.error('Admin password changes require service role configuration');
        return false;
      }

      const { error } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
        password: newPassword
      });

      if (error) {
        console.error('Error changing password:', error);
        toast.error(`Failed to change password for ${user.email}: ${error.message}`);
        return false;
      }

      toast.success(`Password changed successfully for ${user.email}`);
      return true;
    } catch (error) {
      console.error('Error changing password:', error);
      toast.error(`Failed to change password for ${user.email}`);
      return false;
    }
  };

  // Check if current user is main admin on component mount
  useEffect(() => {
    const checkAdminStatus = async () => {
      const isAdmin = await checkIsMainAdmin();
      setIsMainAdmin(isAdmin);
    };
    checkAdminStatus();
  }, [checkIsMainAdmin]);

  // Handle delete user button click
  const handleDeleteUser = async (user: UserProfile) => {
    if (!isMainAdmin) {
      return;
    }
    
    setUserToDelete(user);
    // Get deletion summary before showing confirmation
    await getDeletionSummary(user.id);
    setShowDeleteConfirmation(true);
  };

  // Handle Slack management for company
  const handleOpenSlackManagement = (companyName: string, companyId: string) => {
    setSelectedCompanyForSlack({ name: companyName, id: companyId });
    setShowSlackManagement(true);
  };

  // Handle confirmed deletion
  const handleConfirmedDelete = async () => {
    if (!isMainAdmin || !userToDelete) {
      return;
    }

    const success = await deleteUser(userToDelete.id, userToDelete.email);
    if (success) {
      setShowDeleteConfirmation(false);
      setUserToDelete(null);
      // Refresh the user data
      refreshData();
    }
  };

  const renderMainContent = () => {
    switch (currentView) {
      case 'userManagement':
        return (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white">User Management</h2>
                <p className="text-gray-400 mt-1">Manage user accounts and reset passwords</p>
              </div>
              <span className="px-3 py-1 bg-yellow-500/20 text-yellow-300 text-sm font-medium rounded-full border border-yellow-500/30">
                {users.length} Users ({sortedCompanyGroups.length} Companies)
              </span>
            </div>

            {/* Password Management Features Info */}
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-6 mb-6">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <KeyRound className="h-6 w-6 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-2">Password Management Available</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-300">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-blue-400" />
                      <span><strong>Email Reset:</strong> Send password reset emails to users</span>
                    </div>
                    {supabaseAdmin && (
                      <div className="flex items-center gap-2">
                        <KeyRound className="h-4 w-4 text-orange-400" />
                        <span><strong>Direct Change:</strong> Set new passwords immediately</span>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    Click the mail icon to send reset emails, or the key icon for direct password changes.
                  </p>
                </div>
              </div>
            </div>

            {/* Search and Filter Controls */}
            <div className="bg-gray-800/60 backdrop-blur-sm rounded-lg shadow-lg border border-gray-700/30 p-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by company name, email, or profile name..."
                    value={userSearchTerm}
                    onChange={(e) => setUserSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-gray-700/50 border border-gray-600/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="h-5 w-5 text-gray-400" />
                  <select
                    value={userSortBy}
                    onChange={(e) => setUserSortBy(e.target.value as 'company' | 'email' | 'date')}
                    className="px-4 py-3 bg-gray-700/50 border border-gray-600/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                  >
                    <option value="company">Sort by Company</option>
                    <option value="email">Sort by Email</option>
                    <option value="date">Sort by Join Date</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Company Groups Display */}
            <div className="space-y-6">
              {sortedCompanyGroups.map((companyGroup, groupIndex) => {
                const isExpanded = expandedCompanies.has(companyGroup.company_name);
                
                return (
                  <motion.div
                    key={companyGroup.company_name}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: groupIndex * 0.1 }}
                    className="bg-gray-800/60 backdrop-blur-sm rounded-xl shadow-lg border border-gray-700/30 overflow-hidden"
                  >
                    {/* Company Header */}
                    <div 
                      className="p-6 cursor-pointer hover:bg-gray-700/30 transition-all duration-200"
                      onClick={() => {
                        const newExpanded = new Set(expandedCompanies);
                        if (isExpanded) {
                          newExpanded.delete(companyGroup.company_name);
                        } else {
                          newExpanded.add(companyGroup.company_name);
                        }
                        setExpandedCompanies(newExpanded);
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0">
                            <Building2 className="h-6 w-6 text-white" />
                          </div>
                          <div>
                            <div className="flex items-center gap-3">
                              <h3 className="text-xl font-bold text-white">
                                {companyGroup.company_name}
                              </h3>
                              <div className="flex items-center gap-2">
                                <Badge className="w-4 h-4 text-blue-400" />
                                <span className="text-sm font-medium text-blue-400">
                                  {companyGroup.total_users} {companyGroup.total_users === 1 ? 'user' : 'users'}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-4 mt-2">
                              <p className="text-gray-400 text-sm">
                                Main: {companyGroup.main_account.email}
                              </p>
                              <div className="flex items-center gap-1 text-xs text-gray-500">
                                <Calendar className="w-3 h-3" />
                                <span>Created {new Date(companyGroup.created_at).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="text-sm text-gray-400">
                              {companyGroup.sub_accounts.length} sub-account{companyGroup.sub_accounts.length !== 1 ? 's' : ''}
                            </div>
                          </div>
                          <motion.div
                            animate={{ rotate: isExpanded ? 90 : 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <ChevronRight className="w-5 h-5 text-gray-400" />
                          </motion.div>
                        </div>
                      </div>
                    </div>

                    {/* Expanded Content - Main and Sub Accounts */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: 'easeInOut' }}
                          className="border-t border-gray-700/30"
                        >
                          <div className="p-6 bg-gray-700/20">
                            {/* Main Account */}
                            <div className="mb-6">
                              <div className="flex items-center gap-2 mb-3">
                                <Crown className="w-4 h-4 text-yellow-400" />
                                <h4 className="text-sm font-semibold text-yellow-400 uppercase tracking-wider">
                                  Main Account
                                </h4>
                              </div>
                              <motion.div
                                whileHover={{ scale: 1.02 }}
                                className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-lg p-4 cursor-pointer hover:border-yellow-500/40 transition-all duration-200"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center">
                                    <Crown className="w-5 h-5 text-white" />
                                  </div>
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <span className="text-white font-medium">
                                        {companyGroup.main_account.email}
                                      </span>
                                      <span className="px-2 py-1 bg-yellow-500/20 text-yellow-300 text-xs rounded-full border border-yellow-500/30">
                                        Owner
                                      </span>
                                    </div>
                                    <p className="text-gray-400 text-xs mt-1">
                                      Joined: {new Date(companyGroup.main_account.created_at).toLocaleDateString()}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {/* Password Reset Button for Main Account */}
                                    <motion.button
                                      whileHover={{ scale: 1.05 }}
                                      whileTap={{ scale: 0.95 }}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleSendPasswordReset(companyGroup.main_account);
                                      }}
                                      disabled={passwordResetLoading.has(companyGroup.main_account.id)}
                                      className="p-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 hover:text-blue-300 rounded-lg transition-colors border border-blue-500/30 hover:border-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                                      title="Send Password Reset Email"
                                    >
                                      {passwordResetLoading.has(companyGroup.main_account.id) ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                      ) : (
                                        <Mail className="w-4 h-4" />
                                      )}
                                    </motion.button>
                                    
                                    {/* Direct Password Change Button for Main Account */}
                                    {supabaseAdmin && (
                                      <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setDirectPasswordChangeUser(companyGroup.main_account);
                                          setShowPasswordChangeModal(true);
                                        }}
                                        className="p-2 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 hover:text-orange-300 rounded-lg transition-colors border border-orange-500/30 hover:border-orange-500/50"
                                        title="Change Password Directly"
                                      >
                                        <KeyRound className="w-4 h-4" />
                                      </motion.button>
                                    )}
                                    
                                    {/* Slack Integration Button */}
                                    <motion.button
                                      whileHover={{ scale: 1.05 }}
                                      whileTap={{ scale: 0.95 }}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleOpenSlackManagement(companyGroup.company_name, companyGroup.main_account.id);
                                      }}
                                      className="p-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 hover:text-purple-300 rounded-lg transition-colors border border-purple-500/30 hover:border-purple-500/50"
                                      title="Manage Slack Integration"
                                    >
                                      <Slack className="w-4 h-4" />
                                    </motion.button>
                                    
                                    {/* Delete User Button - Only visible to main admin */}
                                    {isMainAdmin && (
                                      <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteUser(companyGroup.main_account);
                                        }}
                                        disabled={isLoadingSummary}
                                        className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 hover:text-red-300 rounded-lg transition-colors border border-red-500/30 hover:border-red-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                                        title="Delete User Account"
                                      >
                                        {isLoadingSummary && userToDelete?.id === companyGroup.main_account.id ? (
                                          <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                          <Trash2 className="w-4 h-4" />
                                        )}
                                      </motion.button>
                                    )}
                                    <UserCircle className="w-4 h-4 text-gray-400" />
                                  </div>
                                </div>
                              </motion.div>
                            </div>

                            {/* Sub Accounts */}
                            {companyGroup.sub_accounts.length > 0 && (
                              <div>
                                <div className="flex items-center gap-2 mb-3">
                                  <Users className="w-4 h-4 text-blue-400" />
                                  <h4 className="text-sm font-semibold text-blue-400 uppercase tracking-wider">
                                    Sub Accounts ({companyGroup.sub_accounts.length})
                                  </h4>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {companyGroup.sub_accounts.map((subUser, subIndex) => {
                                    const getRoleIcon = (role?: string) => {
                                      switch (role) {
                                        case 'admin': return <UserCog className="w-4 h-4 text-red-400" />;
                                        case 'manager': return <Users className="w-4 h-4 text-blue-400" />;
                                        case 'editor': return <Edit className="w-4 h-4 text-green-400" />;
                                        case 'viewer': return <Eye className="w-4 h-4 text-gray-400" />;
                                        default: return <UserCircle className="w-4 h-4 text-gray-400" />;
                                      }
                                    };
                                    
                                    const getRoleColor = (role?: string) => {
                                      switch (role) {
                                        case 'admin': return 'from-red-500/10 to-pink-500/10 border-red-500/20 hover:border-red-500/40';
                                        case 'manager': return 'from-blue-500/10 to-cyan-500/10 border-blue-500/20 hover:border-blue-500/40';
                                        case 'editor': return 'from-green-500/10 to-emerald-500/10 border-green-500/20 hover:border-green-500/40';
                                        case 'viewer': return 'from-gray-500/10 to-slate-500/10 border-gray-500/20 hover:border-gray-500/40';
                                        default: return 'from-gray-500/10 to-slate-500/10 border-gray-500/20 hover:border-gray-500/40';
                                      }
                                    };
                                    
                                    return (
                                      <motion.div
                                        key={subUser.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: subIndex * 0.1 }}
                                        whileHover={{ scale: 1.02 }}
                                        className={`bg-gradient-to-r ${getRoleColor(subUser.profile_role)} rounded-lg p-3 cursor-pointer transition-all duration-200`}
                                      >
                                        <div className="flex items-center gap-3">
                                          <div className="w-8 h-8 bg-gray-600 rounded-lg flex items-center justify-center">
                                            {getRoleIcon(subUser.profile_role)}
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                              <span className="text-white text-sm font-medium truncate">
                                                {subUser.profile_name || subUser.email}
                                              </span>
                                              <span className={`px-2 py-1 text-xs rounded-full capitalize ${
                                                subUser.profile_role === 'admin' ? 'bg-red-500/20 text-red-300 border border-red-500/30' :
                                                subUser.profile_role === 'manager' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                                                subUser.profile_role === 'editor' ? 'bg-green-500/20 text-green-300 border border-green-500/30' :
                                                'bg-gray-500/20 text-gray-300 border border-gray-500/30'
                                              }`}>
                                                {subUser.profile_role || 'user'}
                                              </span>
                                            </div>
                                            <p className="text-gray-400 text-xs truncate">
                                              {subUser.email}
                                            </p>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            {/* Password Reset Button */}
                                            <motion.button
                                              whileHover={{ scale: 1.05 }}
                                              whileTap={{ scale: 0.95 }}
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleSendPasswordReset(subUser);
                                              }}
                                              disabled={passwordResetLoading.has(subUser.id)}
                                              className="p-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 hover:text-blue-300 rounded-lg transition-colors border border-blue-500/30 hover:border-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                                              title="Send Password Reset Email"
                                            >
                                              {passwordResetLoading.has(subUser.id) ? (
                                                <Loader2 className="w-3 h-3 animate-spin" />
                                              ) : (
                                                <Mail className="w-3 h-3" />
                                              )}
                                            </motion.button>
                                            
                                            {/* Direct Password Change Button */}
                                            {supabaseAdmin && (
                                              <motion.button
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setDirectPasswordChangeUser(subUser);
                                                  setShowPasswordChangeModal(true);
                                                }}
                                                className="p-2 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 hover:text-orange-300 rounded-lg transition-colors border border-orange-500/30 hover:border-orange-500/50"
                                                title="Change Password Directly"
                                              >
                                                <KeyRound className="w-3 h-3" />
                                              </motion.button>
                                            )}
                                            
                                            {/* Delete User Button - Only visible to main admin */}
                                            {isMainAdmin && (
                                              <motion.button
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleDeleteUser(subUser);
                                                }}
                                                disabled={isLoadingSummary}
                                                className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 hover:text-red-300 rounded-lg transition-colors border border-red-500/30 hover:border-red-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                                                title="Delete User Account"
                                              >
                                                {isLoadingSummary && userToDelete?.id === subUser.id ? (
                                                  <Loader2 className="w-3 h-3 animate-spin" />
                                                ) : (
                                                  <Trash2 className="w-3 h-3" />
                                                )}
                                              </motion.button>
                                            )}
                                            <UserCircle className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                          </div>
                                        </div>
                                      </motion.div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>

            {sortedCompanyGroups.length === 0 && (
              <div className="text-center py-12">
                <Building2 className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                <p className="text-gray-400">
                  {userSearchTerm ? 'No companies found matching your search' : 'No companies found'}
                </p>
              </div>
            )}

            {/* Info card about Content Brief Management */}
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-6">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <BookOpen className="h-6 w-6 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-2">Looking for user content?</h3>
                  <p className="text-gray-300 text-sm mb-3">
                    To view user's research results, product cards, and generated content briefs, 
                    visit the <span className="text-blue-400 font-medium">Content Brief Management</span> section.
                  </p>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleNavigation('contentBriefManagement')}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors duration-200"
                  >
                    Go to Content Brief Management
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        );
      case 'articleManagement':
        return (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Article Management</h2>
                <p className="text-gray-400">Manage generated articles across all company accounts</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-sm text-gray-400">
                  Total: {users.length} users, {users.reduce((acc, user) => acc + (user.articleCount || 0), 0)} articles
                </div>
              </div>
            </div>

            {/* Search and Filter Bar */}
            <div className="flex items-center gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search by company name, email, or user..."
                  value={userSearchTerm}
                  onChange={(e) => setUserSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                />
              </div>
              <select
                value={userSortBy}
                onChange={(e) => setUserSortBy(e.target.value as 'company' | 'email' | 'date')}
                className="px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-purple-500"
              >
                <option value="company">Sort by Company</option>
                <option value="email">Sort by Email</option>
                <option value="date">Sort by Join Date</option>
              </select>
            </div>

            {/* Company Groups - Simplified View */}
            <div className="space-y-4">
              {sortedCompanyGroups.map((company) => {
                // Only show the main account's article count (which now includes all company articles)
                const totalCompanyArticles = company.main_account.articleCount || 0;

                // Debug logging for the specific company
                console.log(`[ArticleManagement] Company: ${company.company_name}`, {
                  mainAccountArticles: company.main_account.articleCount || 0,
                  displayTotal: totalCompanyArticles
                });

                return (
                  <motion.div
                    key={company.company_name}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-gray-900/40 backdrop-blur-sm border border-gray-700/50 rounded-2xl overflow-hidden cursor-pointer hover:bg-gray-800/50 transition-colors duration-200"
                    onClick={() => handleUserArticleSelection(company.main_account)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {/* Company Header - No Expansion */}
                    <div className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl">
                            <Building2 className="h-6 w-6 text-white" />
                          </div>
                          <div>
                            <h3 className="text-xl font-semibold text-white mb-1">
                              {company.company_name}
                            </h3>
                            <div className="flex items-center gap-4 text-sm text-gray-400">
                              <span>{totalCompanyArticles} articles</span>
                              <span>•</span>
                              <span>Owner: {company.main_account.email}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-sm text-gray-400">
                            Created: {new Date(company.created_at).toLocaleDateString()}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400">Click to view articles</span>
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {sortedCompanyGroups.length === 0 && (
              <div className="text-center py-12">
                <Building2 className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                <p className="text-gray-400">
                  {userSearchTerm ? 'No companies found matching your search' : 'No companies found'}
                </p>
              </div>
            )}

            {/* User Articles Modal */}
            {selectedUserForArticles.user && (
              <AdminUserArticlesModal
                user={selectedUserForArticles.user}
                companyGroup={selectedUserForArticles.companyGroup}
                isOpen={!!selectedUserForArticles.user}
                onClose={() => setSelectedUserForArticles({ user: null, companyGroup: null })}
                onEditArticle={handleEditArticleFromList}
              />
            )}
          </motion.div>
        );
      case 'commentManagement':
        return <EnhancedCommentDashboard />;
      case 'auditLogs':
        // Only super admins can access audit logs
        if (adminRole !== 'super_admin') {
          setCurrentView('dashboard');
          toast.error('Access denied: Only super admins can view security logs');
          return null;
        }
        return <AuditLogViewer />;
      case 'contentBriefManagement':
        return <ContentBriefManagement />;
      case 'adminAssignmentHub':
        return <AdminAssignmentHub />;
      case 'mediaLibrary':
        // This case should not be reached since navigation redirects
        return null;
      default:
        return (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="text-center py-12">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-400 to-blue-500 rounded-3xl flex items-center justify-center shadow-xl mx-auto mb-6">
                <Home className="h-12 w-12 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Dashboard</h3>
              <p className="text-gray-300">Select a section from the sidebar to get started.</p>
            </div>
          </motion.div>
        );
    }
  };

  // Group users by company with proper hierarchy (for User Management)
  const groupUsersByCompany = (users: UserProfile[]): CompanyGroup[] => {
    console.log('🔍 Grouping users by company. Total users:', users.length);
    console.log('🔍 User types:', users.map(u => ({ email: u.email, type: u.user_type, company: u.company_name })));
    
    const companies = new Map<string, CompanyGroup>();
    
    users.forEach(user => {
      // Normalize company name - treat empty strings and null as "Unknown Company"
      const rawCompanyName = user.company_name;
      const companyName = rawCompanyName && rawCompanyName.trim() !== '' 
        ? rawCompanyName 
        : 'Unknown Company';
      
      if (!companies.has(companyName)) {
        // Find the main account for this company
        const mainAccount = users.find(
          u => {
            const uCompanyName = u.company_name && u.company_name.trim() !== '' 
              ? u.company_name 
              : 'Unknown Company';
            return uCompanyName === companyName && u.user_type === 'main';
          }
        );
        
        if (mainAccount) {
          companies.set(companyName, {
            company_name: companyName,
            main_account: mainAccount,
            sub_accounts: [],
            total_users: 0,
            created_at: mainAccount.created_at
          });
        }
      }
      
      const company = companies.get(companyName);
      if (company) {
        if (user.user_type === 'sub') {
          console.log('➕ Adding sub-account to', companyName, ':', user.email);
          company.sub_accounts.push(user);
        }
        company.total_users = 1 + company.sub_accounts.length;
      }
    });
    
    // Now calculate the correct total_users for each company
    companies.forEach(company => {
      company.total_users = 1 + company.sub_accounts.length;
    });
    
    const result = Array.from(companies.values());
    console.log('🏢 Final company groups:', result.map(c => ({ 
      company: c.company_name, 
      total: c.total_users, 
      subAccounts: c.sub_accounts.length,
      subAccountEmails: c.sub_accounts.map(s => s.email)
    })));
    
    return result;
  };

  // Filter and group users for User Management
  const filteredUsers = users.filter(user => {
    // Apply text search filter
    const matchesSearch = user.company_name?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      user.profile_name?.toLowerCase().includes(userSearchTerm.toLowerCase());
      
    // For sub-admins, only show users from assigned clients
    if (adminRole === 'sub_admin' && assignedClientIds.length > 0) {
      return matchesSearch && assignedClientIds.includes(user.id);
    }
    
    return matchesSearch;
  });

  const groupedUsers = groupUsersByCompany(filteredUsers);
  
  // Sort company groups
  const sortedCompanyGroups = [...groupedUsers].sort((a, b) => {
    switch (userSortBy) {
      case 'company':
        return a.company_name.localeCompare(b.company_name);
      case 'email':
        return a.main_account.email.localeCompare(b.main_account.email);
      case 'date':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      default:
        return 0;
    }
  });

  // Article Management handlers
  const handleUserArticleSelection = (user: UserProfile) => {
    // Find the company group for this user to get all company users
    const companyGroup = sortedCompanyGroups.find(group => 
      group.main_account.id === user.id || 
      group.sub_accounts.some(subUser => subUser.id === user.id)
    );
    
    if (companyGroup) {
      setSelectedUserForArticles({ user, companyGroup });
    } else {
      setSelectedUserForArticles({ user, companyGroup: null });
    }
  };

  const handleEditArticleFromList = (article: any) => {
    // Navigate to the dedicated admin article editor page instead of opening modal
    navigate(`/admin/articles/${article.id}`);
  };

  // Enhanced article editing handlers for ArticleEditor integration
  const handleOpenArticleEditor = async (article: any) => {
    console.log('🔥 Navigating to ArticleEditor for article:', article);
    navigate(`/admin/articles/${article.id}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Admin Sidebar */}
      <AdminSidebar
        currentView={currentView}
        adminRole={adminRole}
        adminEmail={adminEmail}
        assignedClients={assignedClients}
        adminError={adminError}
        onNavigation={handleNavigation}
        onLogout={handleLogout}
        onRefreshAdminData={refreshAdminData}
      />

      {/* Main Content */}
      <div className="ml-80">
        {/* Admin Header */}
        <AdminHeader
          currentView={currentView}
          adminRole={adminRole}
          assignedClients={assignedClients}
          showNotificationCenter={showNotificationCenter}
          unreadNotificationCount={unreadCount}
          onRefreshData={refreshData}
          onToggleNotificationCenter={setShowNotificationCenter}
        />

        {/* Admin Main Content */}
        <AdminMainContent
          currentView={currentView}
          stats={stats}
          renderMainContent={renderMainContent}
        />
      </div>

      {/* Assignment Notification Center */}
      <AssignmentNotificationCenter
        isVisible={showNotificationCenter}
        onClose={() => {
          setShowNotificationCenter(false);
          refreshUnreadCount(); // Refresh count when notification center is closed
        }}
      />

      {/* Direct Password Change Modal */}
      <AdminDirectPasswordChangeModal
        isOpen={showPasswordChangeModal}
        user={directPasswordChangeUser}
        onClose={() => {
          setShowPasswordChangeModal(false);
          setDirectPasswordChangeUser(null);
        }}
        onPasswordChange={handleDirectPasswordChange}
      />

      {/* Slack Management Modal */}
      <AdminSlackManagement
        isOpen={showSlackManagement}
        onClose={() => {
          setShowSlackManagement(false);
          setSelectedCompanyForSlack(null);
        }}
        companyName={selectedCompanyForSlack?.name}
        companyId={selectedCompanyForSlack?.id}
      />

      {/* Delete Confirmation Dialog */}
      <BaseModal
        isOpen={showDeleteConfirmation}
        onClose={() => setShowDeleteConfirmation(false)}
        title="Delete User Account"
        size="md"
        theme="dark"
      >
        {userToDelete && (
          <div className="space-y-6">
            {/* Warning Icon */}
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-red-500/20 border border-red-500/30">
                <AlertTriangle className="h-6 w-6 text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Permanent Account Deletion</h3>
                <p className="text-sm text-gray-400">This action cannot be undone</p>
              </div>
            </div>

            {/* User Info */}
            <div className="bg-gray-800/60 rounded-lg p-4 border border-gray-700/30">
              <h4 className="text-white font-medium mb-2">Account to be deleted:</h4>
              <div className="space-y-1 text-sm">
                <p><span className="text-gray-400">Email:</span> <span className="text-white">{userToDelete.email}</span></p>
                <p><span className="text-gray-400">Company:</span> <span className="text-white">{userToDelete.company_name || 'N/A'}</span></p>
                <p><span className="text-gray-400">Created:</span> <span className="text-white">{new Date(userToDelete.created_at).toLocaleDateString()}</span></p>
              </div>
            </div>

            {/* Data Impact Summary */}
            {deletionSummary && (
              <div className="bg-red-500/5 rounded-lg p-4 border border-red-500/20">
                <h4 className="text-red-300 font-medium mb-3 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Data that will be permanently deleted:
                </h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Content Briefs:</span>
                      <span className="text-white font-medium">{deletionSummary.contentBriefs}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Research Results:</span>
                      <span className="text-white font-medium">{deletionSummary.researchResults}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Approved Products:</span>
                      <span className="text-white font-medium">{deletionSummary.approvedProducts}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Article Comments:</span>
                      <span className="text-white font-medium">{deletionSummary.articleComments}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Version History:</span>
                      <span className="text-white font-medium">{deletionSummary.versionHistory}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Company Profiles:</span>
                      <span className="text-white font-medium">{deletionSummary.companyProfiles}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Dashboard Data:</span>
                      <span className="text-white font-medium">{deletionSummary.userDashboardEmbeds}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Activity Records:</span>
                      <span className="text-white font-medium">{deletionSummary.commentStatusHistory}</span>
                    </div>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-red-500/20">
                  <div className="flex justify-between">
                    <span className="text-red-300 font-medium">Total Records:</span>
                    <span className="text-red-300 font-bold">
                      {Object.values(deletionSummary).reduce((sum, count) => sum + count, 0)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Warning Message */}
            <div className="bg-yellow-500/10 rounded-lg p-4 border border-yellow-500/20">
              <p className="text-yellow-300 text-sm flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>
                  This will permanently delete the user's account from Supabase authentication, 
                  remove all their data from the database, and cannot be recovered. 
                  Only the main admin (lashay@bofu.ai) can perform this action.
                </span>
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirmation(false)}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmedDelete}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    Delete Account
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </BaseModal>
    </div>
  );
}




export default AdminDashboard;