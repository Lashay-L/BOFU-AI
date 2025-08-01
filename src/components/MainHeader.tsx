import React, { Fragment, useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { LogIn, Book, Briefcase, Search, Settings, Bell } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Menu, Transition } from '@headlessui/react';
import { UserCircleIcon, ClockIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import { ProfileManager } from '../components/profile/ProfileManager';
import { NotificationCenter } from './user-dashboard/NotificationCenter';
import { AssignmentNotificationCenter } from './admin/AssignmentNotificationCenter';
import { 
  getMentionNotifications, 
  subscribeToMentionNotifications,
  subscribeToAdminMentionNotifications,
  MentionNotification
} from '../lib/commentApi';
import { getBriefApprovalNotifications } from '../lib/briefApprovalNotifications';
import { 
  getUnreadUserNotificationCount, 
  subscribeToUserNotifications,
  UserNotification
} from '../lib/userNotifications';
import { useAdminContext } from '../contexts/AdminContext';


// Logo SVG component
const Logo = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="32" height="32" rx="8" fill="#FFE600" />
    <path d="M18.5 5L7 17.5H14L12.5 27L24 14.5H17L18.5 5Z" fill="#0A0A0A" stroke="#0A0A0A" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

interface MainHeaderProps {
  showHistory?: boolean;
  setShowHistory?: (value: boolean) => void;
  user?: any;
  onShowAuthModal?: () => void;
  onSignOut?: () => Promise<void>;
}

export function MainHeader({
  showHistory, 
  setShowHistory, 
  user: propUser,
  onShowAuthModal,
  onSignOut
}: MainHeaderProps) {
  const [user, setUser] = React.useState(propUser);
  const [showNotificationCenter, setShowNotificationCenter] = useState(false);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const { isAdmin, adminRole, assignedClientIds } = useAdminContext();
  const mentionSubscriptionRef = useRef<any>(null);
  const userNotificationSubscriptionRef = useRef<any>(null);

  const navigate = useNavigate();

  // Helper function to get display name
  const getDisplayName = (userData: any) => {
    // First check user_metadata.company_name
    if (userData?.user_metadata?.company_name) {
      return userData.user_metadata.company_name;
    }
    // Then check name
    if (userData?.user_metadata?.name) {
      return userData.user_metadata.name;
    }
    // Fall back to email prefix
    if (userData?.email) {
      return userData.email.split('@')[0];
    }
    return 'User';
  };

  // Load notification count
  const loadNotificationCount = async () => {
    if (user) {
      try {
        console.log('🔔 Loading notifications for user:', user.email);
        
        // Get mention notifications (with client filtering for sub-admins)
        const clientIdsForFiltering = adminRole === 'sub_admin' ? assignedClientIds : undefined;
        const notifications = await getMentionNotifications(undefined, clientIdsForFiltering);
        let unreadCount = notifications.filter(n => !n.notification_sent).length;
        
        // Get user notifications (content brief and article notifications)
        const userUnreadCount = await getUnreadUserNotificationCount();
        unreadCount += userUnreadCount;
        console.log('🔔 User notifications loaded:', { unread: userUnreadCount });
        
        // Check if user is admin using AdminContext
        if (isAdmin) {
          console.log('🔔 Admin user detected, loading brief approval notifications');
          try {
            const briefNotifications = await getBriefApprovalNotifications(
              user.id, 
              clientIdsForFiltering
            );
            const unreadBriefCount = briefNotifications.filter(n => !n.is_read).length;
            unreadCount += unreadBriefCount;
            console.log('🔔 Brief notifications loaded:', { total: briefNotifications.length, unread: unreadBriefCount });
          } catch (error) {
            console.error('❌ Error loading brief notifications:', error);
          }
        }
        
        console.log('🔔 Total notifications:', unreadCount);
        setUnreadNotificationCount(unreadCount);
      } catch (error) {
        console.error('❌ Error loading notification count:', error);
        setUnreadNotificationCount(0);
      }
    }
  };

  // Refresh notification count manually (can be called from outside)
  const refreshNotificationCount = async () => {
    console.log('🔄 Manually refreshing notification count for user:', user?.email);
    try {
      await loadNotificationCount();
      console.log('✅ Manual refresh completed successfully');
    } catch (error) {
      console.error('❌ Error during manual refresh:', error);
    }
  };

  // Expose refresh function globally for debugging/manual refresh
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).refreshNotificationCount = refreshNotificationCount;
    }
  }, []);

  // Set up real-time mention notification subscription to update count
  useEffect(() => {
    const setupMentionSubscription = async () => {
      if (user?.id) {
        console.log('🔔 Setting up mention notification subscription for header count');
        
        // Clean up any existing subscription first
        if (mentionSubscriptionRef.current) {
          console.log('🔔 Cleaning up existing header mention subscription');
          try {
            if (typeof mentionSubscriptionRef.current.unsubscribe === 'function') {
              mentionSubscriptionRef.current.unsubscribe();
            }
          } catch (error) {
            console.error('❌ Error cleaning up mention subscription:', error);
          }
          mentionSubscriptionRef.current = null;
          
          // Small delay to ensure cleanup completes
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // Determine if this is an admin user and subscribe accordingly
        if (isAdmin) {
          mentionSubscriptionRef.current = subscribeToAdminMentionNotifications(
            user.id,
            assignedClientIds || [],
            (updatedNotification: MentionNotification) => {
              console.log('🔔 Header received admin mention notification update:', updatedNotification);
              
              // If notification is marked as sent/read, decrease count
              if (updatedNotification.notification_sent) {
                console.log('🔔 Admin notification marked as read, decreasing count');
                setUnreadNotificationCount(prev => Math.max(0, prev - 1));
              } else {
                // If notification is new/unread, increase count
                console.log('🔔 New unread admin notification, increasing count');
                setUnreadNotificationCount(prev => prev + 1);
              }
            }
          );
        } else {
          mentionSubscriptionRef.current = subscribeToMentionNotifications(
            user.id,
            (updatedNotification: MentionNotification) => {
              console.log('🔔 Header received mention notification update:', updatedNotification);
              
              // If notification is marked as sent/read, decrease count
              if (updatedNotification.notification_sent) {
                console.log('🔔 Notification marked as read, decreasing count');
                setUnreadNotificationCount(prev => Math.max(0, prev - 1));
              } else {
                // If notification is new/unread, increase count
                console.log('🔔 New unread notification, increasing count');
                setUnreadNotificationCount(prev => prev + 1);
              }
            }
          );
        }
      }
    };

    setupMentionSubscription().catch(error => {
      console.error('❌ Error setting up mention subscription:', error);
    });

    return () => {
      if (mentionSubscriptionRef.current) {
        console.log('🔔 Cleaning up header mention subscription');
        try {
          mentionSubscriptionRef.current.unsubscribe();
        } catch (error) {
          console.error('❌ Error cleaning up header mention subscription:', error);
        }
        mentionSubscriptionRef.current = null;
      }
    };
  }, [user?.id, isAdmin, assignedClientIds]);

  // Set up real-time user notification subscription (for article generation, brief generation)
  useEffect(() => {
    const setupUserNotificationSubscription = async () => {
      if (user?.id) {
        console.log('🔔 Setting up user notification subscription for header count');
        
        // Clean up any existing subscription first
        if (userNotificationSubscriptionRef.current) {
          console.log('🔔 Cleaning up existing header user notification subscription');
          try {
            if (typeof userNotificationSubscriptionRef.current.unsubscribe === 'function') {
              userNotificationSubscriptionRef.current.unsubscribe();
            }
          } catch (error) {
            console.error('❌ Error cleaning up user notification subscription:', error);
          }
          userNotificationSubscriptionRef.current = null;
          
          // Small delay to ensure cleanup completes
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        userNotificationSubscriptionRef.current = subscribeToUserNotifications(
          user.id,
          (updatedNotification: UserNotification) => {
            console.log('🔔 Header received user notification update:', updatedNotification);
            
            // If notification is marked as read, decrease count
            if (updatedNotification.is_read) {
              console.log('🔔 User notification marked as read, decreasing count');
              setUnreadNotificationCount(prev => Math.max(0, prev - 1));
            } else {
              // If notification is new/unread, increase count
              console.log('🔔 New unread user notification, increasing count');
              setUnreadNotificationCount(prev => prev + 1);
            }
          }
        );
      }
    };

    setupUserNotificationSubscription().catch(error => {
      console.error('❌ Error setting up user notification subscription:', error);
    });

    return () => {
      if (userNotificationSubscriptionRef.current) {
        console.log('🔔 Cleaning up header user notification subscription');
        try {
          userNotificationSubscriptionRef.current.unsubscribe();
        } catch (error) {
          console.error('❌ Error cleaning up header user notification subscription:', error);
        }
        userNotificationSubscriptionRef.current = null;
      }
    };
  }, [user?.id]);

  React.useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadNotificationCount();
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadNotificationCount();
      }
    });

    return () => subscription.unsubscribe();
  }, [adminRole, assignedClientIds]);

  // Load notifications when user changes or admin assignments change
  React.useEffect(() => {
    if (user) {
      loadNotificationCount();
      
      // Set up periodic refresh every 30 seconds
      const interval = setInterval(loadNotificationCount, 30000);
      return () => clearInterval(interval);
    }
  }, [user, assignedClientIds, adminRole]);

  const handleSignOut = async () => {
    try {
      if (onSignOut) {
        // Use the provided sign out handler from App.tsx
        console.log('[MainHeader] Using provided onSignOut handler');
        await onSignOut();
      } else {
        // Fallback if no onSignOut prop provided
        console.log('[MainHeader] Using fallback logout logic');
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        console.log("Signed out successfully");
        
        // Use React Router for client-side navigation
        navigate('/', { replace: true });
        
        // Clear history state if available
        if (setShowHistory) {
          setShowHistory(false);
        }
        
        // Show success message
        toast.success('Signed out successfully');
      }
    } catch (error) {
      console.error("Error signing out:", error);
      toast.error('Failed to sign out');
    }
  };

  // Modified navigation handler
  const handleNavigation = (path: string) => {
    // First dispatch the closeModals event to clean up any open modals
    window.dispatchEvent(new CustomEvent('closeModals'));
    
    // Wait a brief moment to ensure cleanup completes
    setTimeout(() => {
      // Then navigate to the desired path
      navigate(path);
      
      // Update history state if navigating to history
      if (path === '/history' && setShowHistory) {
        setShowHistory(true);
      } else if (path === '/' && setShowHistory) {
        setShowHistory(false);
      }
    }, 100);
  };

  return (
    <header className="sticky top-0 z-50 bg-neutral-900 border-b border-primary-500/30 shadow-lg">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <motion.div 
              className="flex-shrink-0 flex items-center cursor-pointer"
              onClick={() => handleNavigation('/')}
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.2 }}
            >
              <Logo />
              <span className="ml-3 text-xl font-bold text-yellow-500 hover:text-yellow-400 transition-colors">
                BOFU.ai
              </span>
            </motion.div>
            <div className="hidden md:ml-6 md:flex md:items-center md:space-x-4">
              <button
                onClick={() => handleNavigation('/research')}
                className="bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-medium py-2 px-4 rounded-md text-sm inline-flex items-center transition-colors"
              >
                <Search size={18} className="mr-2" />
                Analyze Products
              </button>
              {user && (
                <motion.button
                  onClick={() => handleNavigation('/dashboard')}
                  className="px-4 py-2 rounded-lg transition-all flex items-center gap-2 text-gray-300 hover:text-primary-300 hover:bg-secondary-800/70"
                  whileHover={{ y: -1 }}
                  whileTap={{ y: 1 }}
                >
                  <Book className="h-5 w-5" />
                  Dashboard
                </motion.button>
              )}
              {showHistory !== undefined && setShowHistory && (
                <motion.button
                  onClick={() => handleNavigation('/history')}
                  className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2
                    ${showHistory 
                      ? 'bg-gradient-to-r from-secondary-800 to-secondary-700 text-primary-300 border border-primary-500/30 shadow-glow hover:shadow-glow-strong' 
                      : 'text-gray-300 hover:text-primary-300 hover:bg-secondary-800/70'
                    }`}
                  whileHover={{ y: -1 }}
                  whileTap={{ y: 1 }}
                >
                  <ClockIcon className="h-5 w-5" />
                  History
                </motion.button>
              )}
              {user && (
                <motion.button
                  onClick={() => handleNavigation('/products')}
                  className="px-4 py-2 rounded-lg transition-all flex items-center gap-2 text-gray-300 hover:text-primary-300 hover:bg-secondary-800/70"
                  whileHover={{ y: -1 }}
                  whileTap={{ y: 1 }}
                >
                  <Briefcase className="h-5 w-5" />
                  Products
                </motion.button>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                {/* Profile Manager - Shows current profile and allows switching */}
                <ProfileManager 
                  compact={true}
                  showCreateButton={true}
                  className="hidden md:block"
                />
                
                {/* Notification Bell */}
                <motion.button
                  onClick={() => setShowNotificationCenter(true)}
                  className="relative p-2 rounded-lg hover:bg-secondary-800/70 text-gray-300 hover:text-primary-300 border border-transparent hover:border-primary-500/20 transition-all"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  title="Notifications"
                >
                  <Bell className="h-5 w-5" />
                  {unreadNotificationCount > 0 && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-xs text-white font-bold">
                      {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
                    </div>
                  )}
                </motion.button>
                

                
                {/* User Menu */}
                <Menu as="div" className="relative">
                  <Menu.Button className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-secondary-800/70 text-gray-300 hover:text-primary-300 border border-transparent hover:border-primary-500/20 transition-all">
                    <UserCircleIcon className="h-6 w-6" />
                    <span className="max-w-[150px] truncate">
                      {getDisplayName(user)}
                    </span>
                  </Menu.Button>
                  <Transition
                    as={Fragment}
                    enter="transition ease-out duration-200"
                    enterFrom="transform opacity-0 scale-95"
                    enterTo="transform opacity-100 scale-100"
                    leave="transition ease-in duration-150"
                    leaveFrom="transform opacity-100 scale-100"
                    leaveTo="transform opacity-0 scale-95"
                  >
                    <Menu.Items className="absolute right-0 mt-2 w-48 origin-top-right rounded-lg bg-neutral-900 z-[60] opacity-100">
                      <div className="py-1">
                        {/* Profile Management (Mobile) */}
                        <div className="block md:hidden px-4 py-3 border-b border-secondary-700">
                          <ProfileManager 
                            compact={false}
                            showCreateButton={true}
                          />
                        </div>
                        <Menu.Item>
                          {({ active }: { active: boolean }) => (
                            <button
                              onClick={() => handleNavigation('/dashboard')}
                              className={`${
                                active ? 'bg-secondary-600/30 text-primary-300' : 'text-gray-300'
                              } group flex w-full items-center gap-2 px-4 py-3 text-sm transition-colors`}
                            >
                              <UserCircleIcon className="h-4 w-4 opacity-70" />
                              Dashboard
                            </button>
                          )}
                        </Menu.Item>
                        <Menu.Item>
                          {({ active }: { active: boolean }) => (
                            <button
                              onClick={() => handleNavigation('/history')}
                              className={`${
                                active ? 'bg-secondary-600/30 text-primary-300' : 'text-gray-300'
                              } group flex w-full items-center gap-2 px-4 py-3 text-sm transition-colors`}
                            >
                              <ClockIcon className="h-4 w-4 opacity-70" />
                              History
                            </button>
                          )}
                        </Menu.Item>
                        <Menu.Item>
                          {({ active }: { active: boolean }) => (
                            <button
                              onClick={() => handleNavigation('/products')}
                              className={`${
                                active ? 'bg-secondary-600/30 text-primary-300' : 'text-gray-300'
                              } group flex w-full items-center gap-2 px-4 py-3 text-sm transition-colors`}
                            >
                              <Briefcase className="h-4 w-4 opacity-70" />
                              Products
                            </button>
                          )}
                        </Menu.Item>
                        <Menu.Item>
                          {({ active }: { active: boolean }) => (
                            <button
                              onClick={() => handleNavigation('/user-settings')}
                              className={`${
                                active ? 'bg-secondary-600/30 text-primary-300' : 'text-gray-300'
                              } group flex w-full items-center gap-2 px-4 py-3 text-sm transition-colors`}
                            >
                              <Settings className="h-4 w-4 opacity-70" />
                              Settings
                            </button>
                          )}
                        </Menu.Item>
                        <Menu.Item>
                          {({ active }: { active: boolean }) => (
                            <button
                              onClick={handleSignOut}
                              className={`${
                                active ? 'bg-secondary-600/30 text-primary-300' : 'text-gray-300'
                              } group flex w-full items-center gap-2 px-4 py-3 text-sm transition-colors`}
                            >
                              <LogIn className="h-4 w-4 opacity-70" />
                              Sign Out
                            </button>
                          )}
                        </Menu.Item>
                      </div>
                    </Menu.Items>
                  </Transition>
                </Menu>
              </>
            ) : (
              <motion.button
                onClick={() => onShowAuthModal && onShowAuthModal()}
                className="px-5 py-2 bg-gradient-to-r from-primary-500/80 to-yellow-500/80 text-secondary-900 font-medium rounded-lg 
                  transition-all shadow-md hover:shadow-glow-strong hover:from-primary-500 hover:to-yellow-500"
                whileHover={{ y: -1, scale: 1.02 }}
                whileTap={{ y: 1, scale: 0.98 }}
              >
                Sign In
              </motion.button>
            )}
          </div>
        </div>
      </nav>
      
      {/* Notification Center Modal */}
      {isAdmin && (adminRole === 'super_admin' || adminRole === 'sub_admin') ? (
        <AssignmentNotificationCenter
          isVisible={showNotificationCenter}
          onClose={() => {
            setShowNotificationCenter(false);
            // Refresh notification count when closing
            loadNotificationCount();
          }}
        />
      ) : (
        <NotificationCenter
          isVisible={showNotificationCenter}
          onClose={() => {
            setShowNotificationCenter(false);
            // Refresh notification count when closing
            loadNotificationCount();
          }}
        />
      )}
      

    </header>
  );
}