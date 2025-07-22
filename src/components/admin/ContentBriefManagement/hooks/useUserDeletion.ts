import { useState } from 'react';
import { supabaseAdmin, supabase } from '../../../../lib/supabase';
import { toast } from 'react-hot-toast';

interface DeletionSummary {
  contentBriefs: number;
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

      if (!supabaseAdmin) {
        toast.error('Admin permissions not configured');
        return null;
      }

      // Query all related tables to get counts
      const [
        contentBriefsResult,
        researchResultsResult,
        approvedProductsResult,
        articleCommentsResult,
        articlePresenceResult,
        versionHistoryResult,
        commentStatusHistoryResult,
        userDashboardEmbedsResult,
        companyProfilesResult
      ] = await Promise.all([
        supabaseAdmin.from('content_briefs').select('id', { count: 'exact' }).eq('user_id', userId),
        supabaseAdmin.from('research_results').select('id', { count: 'exact' }).eq('user_id', userId),
        supabaseAdmin.from('approved_products').select('id', { count: 'exact' }).eq('approved_by', userId),
        supabaseAdmin.from('article_comments').select('id', { count: 'exact' }).eq('user_id', userId),
        supabaseAdmin.from('article_presence').select('id', { count: 'exact' }).eq('user_id', userId),
        supabaseAdmin.from('version_history').select('id', { count: 'exact' }).eq('created_by', userId),
        supabaseAdmin.from('comment_status_history').select('id', { count: 'exact' }).eq('changed_by', userId),
        supabaseAdmin.from('user_dashboard_embeds').select('id', { count: 'exact' }).eq('user_id', userId),
        supabaseAdmin.from('company_profiles').select('id', { count: 'exact' }).eq('user_id', userId)
      ]);

      const summary: DeletionSummary = {
        contentBriefs: contentBriefsResult.count || 0,
        researchResults: researchResultsResult.count || 0,
        approvedProducts: approvedProductsResult.count || 0,
        articleComments: articleCommentsResult.count || 0,
        articlePresence: articlePresenceResult.count || 0,
        versionHistory: versionHistoryResult.count || 0,
        commentStatusHistory: commentStatusHistoryResult.count || 0,
        userDashboardEmbeds: userDashboardEmbedsResult.count || 0,
        companyProfiles: companyProfilesResult.count || 0
      };

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

      if (!supabaseAdmin) {
        toast.error('Admin permissions not configured');
        return false;
      }

      console.log(`🗑️ Starting deletion process for user: ${userEmail} (${userId})`);

      // Step 1: Delete user dashboard embeds
      const { error: dashboardEmbedsError } = await supabaseAdmin
        .from('user_dashboard_embeds')
        .delete()
        .eq('user_id', userId);

      if (dashboardEmbedsError) {
        console.error('Error deleting user dashboard embeds:', dashboardEmbedsError);
        toast.error('Failed to delete user dashboard data');
        return false;
      }

      // Step 2: Delete comment status history records where user made changes
      const { error: commentStatusError } = await supabaseAdmin
        .from('comment_status_history')
        .delete()
        .eq('changed_by', userId);

      if (commentStatusError) {
        console.error('Error deleting comment status history:', commentStatusError);
        toast.error('Failed to delete comment history records');
        return false;
      }

      // Step 3: Delete version history records created by user
      const { error: versionHistoryError } = await supabaseAdmin
        .from('version_history')
        .delete()
        .eq('created_by', userId);

      if (versionHistoryError) {
        console.error('Error deleting version history:', versionHistoryError);
        toast.error('Failed to delete version history records');
        return false;
      }

      // Step 4: Delete article presence records
      const { error: presenceError } = await supabaseAdmin
        .from('article_presence')
        .delete()
        .eq('user_id', userId);

      if (presenceError) {
        console.error('Error deleting article presence:', presenceError);
        toast.error('Failed to delete presence records');
        return false;
      }

      // Step 5: Delete article comments
      const { error: commentsError } = await supabaseAdmin
        .from('article_comments')
        .delete()
        .eq('user_id', userId);

      if (commentsError) {
        console.error('Error deleting article comments:', commentsError);
        toast.error('Failed to delete user comments');
        return false;
      }

      // Step 6: Delete approved products (where user was the approver)
      const { error: approvedProductsError } = await supabaseAdmin
        .from('approved_products')
        .delete()
        .eq('approved_by', userId);

      if (approvedProductsError) {
        console.error('Error deleting approved products:', approvedProductsError);
        toast.error('Failed to delete approved products');
        return false;
      }

      // Step 7: Delete content briefs
      const { error: contentBriefsError } = await supabaseAdmin
        .from('content_briefs')
        .delete()
        .eq('user_id', userId);

      if (contentBriefsError) {
        console.error('Error deleting content briefs:', contentBriefsError);
        toast.error('Failed to delete content briefs');
        return false;
      }

      // Step 8: Delete research results
      const { error: researchResultsError } = await supabaseAdmin
        .from('research_results')
        .delete()
        .eq('user_id', userId);

      if (researchResultsError) {
        console.error('Error deleting research results:', researchResultsError);
        toast.error('Failed to delete research results');
        return false;
      }

      // Step 9: Delete company profiles
      const { error: companyProfilesError } = await supabaseAdmin
        .from('company_profiles')
        .delete()
        .eq('user_id', userId);

      if (companyProfilesError) {
        console.error('Error deleting company profiles:', companyProfilesError);
        toast.error('Failed to delete company profiles');
        return false;
      }

      // Step 10: Delete user profile
      const { error: userProfileError } = await supabaseAdmin
        .from('user_profiles')
        .delete()
        .eq('id', userId);

      if (userProfileError) {
        console.error('Error deleting user profile:', userProfileError);
        toast.error('Failed to delete user profile');
        return false;
      }

      // Step 11: Delete the user account from Supabase Auth
      const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);

      if (authError) {
        console.error('Error deleting user auth account:', authError);
        toast.error('Failed to delete user authentication account');
        return false;
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