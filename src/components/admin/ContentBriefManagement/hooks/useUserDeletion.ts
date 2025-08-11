import { useState } from 'react';
import { supabase } from '../../../../lib/supabase';
import { toast } from 'react-hot-toast';

interface DeletionSummary {
  contentBriefs: number; // Will be cleared, not deleted (preserved)
  researchResults: number;
  approvedProducts: number;
  articleComments: number;
  articlePresence: number;
  versionHistory: number;
  commentStatusHistory: number;
  userDashboardEmbeds: number;
  companyProfiles: number;
}

export function useUserDeletion() {
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletionSummary, setDeletionSummary] = useState<DeletionSummary | null>(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);

  // Get deletion impact summary for a user
  const getDeletionSummary = async (userId: string): Promise<DeletionSummary | null> => {
    try {
      setIsLoadingSummary(true);

      // Use secure Edge Function to get deletion summary
      const { data: summaryResponse, error } = await supabase.functions.invoke('admin-data-access', {
        body: { 
          action: 'get_deletion_summary',
          userId: userId
        }
      });

      if (error) {
        console.error('Error fetching deletion summary via Edge Function:', error);
        throw error;
      }

      if (!summaryResponse.success) {
        console.error('Deletion summary Edge Function returned error:', summaryResponse.error);
        throw new Error(summaryResponse.error);
      }

      const summary: DeletionSummary = summaryResponse.data;
      setDeletionSummary(summary);
      return summary;

    } catch (error) {
      console.error('Error getting deletion summary:', error);
      toast.error('Failed to analyze user data impact');
      return null;
    } finally {
      setIsLoadingSummary(false);
    }
  };

  // Delete user account and all related data
  const deleteUser = async (userId: string, userEmail: string): Promise<boolean> => {
    try {
      setIsDeleting(true);

      console.log(`🗑️ Starting deletion process for user: ${userEmail} (${userId})`);

      // Use secure Edge Function to delete user and all related data
      const { data: deleteResponse, error } = await supabase.functions.invoke('admin-data-access', {
        body: { 
          action: 'delete_user',
          userId: userId
        }
      });

      if (error) {
        console.error('Error deleting user via Edge Function:', error);
        throw error;
      }

      if (!deleteResponse.success) {
        console.error('User deletion Edge Function returned error:', deleteResponse.error);
        throw new Error(deleteResponse.error);
      }

      console.log(`✅ Successfully deleted user account: ${userEmail}`);
      toast.success(`User account ${userEmail} has been completely deleted`);
      
      return true;

    } catch (error) {
      console.error('Error in user deletion process:', error);
      toast.error('Failed to delete user account');
      return false;
    } finally {
      setIsDeleting(false);
    }
  };

  // Check if current user is the main admin (Lashay@bofu.ai)
  const isMainAdmin = async (): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      return user?.email === 'lashay@bofu.ai';
    } catch (error) {
      console.error('Error checking admin status:', error);
      return false;
    }
  };

  return {
    deleteUser,
    getDeletionSummary,
    isDeleting,
    deletionSummary,
    isLoadingSummary,
    isMainAdmin
  };
}