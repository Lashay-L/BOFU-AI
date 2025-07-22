import { useState, useEffect } from 'react';
import { supabaseAdmin } from '../../../../lib/supabase';
import { UserProfile, CompanyGroup } from '../types';
import { useAdminContext } from '../../../../contexts/AdminContext';

export function useUsersData() {
  const { adminRole, assignedClientIds } = useAdminContext();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = async () => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('🔍 useUsersData: Starting to fetch users...');
      
      if (!supabaseAdmin) {
        console.error('Admin client not available');
        setError('Admin permissions not configured');
        return;
      }
      
      // Step 1: Fetch main user profiles
      const { data: mainUsersData, error: mainUsersError } = await supabaseAdmin
        .from('user_profiles')
        .select('*')
        .not('company_name', 'is', null)
        .neq('company_name', '');

      if (mainUsersError) {
        console.error('Error fetching main users:', mainUsersError);
        throw mainUsersError;
      }

      console.log('🔍 [CONTENT_BRIEF_DEBUG] Main users fetched:', mainUsersData?.length || 0);

      // Step 2: Fetch company profiles to understand user hierarchy
      const { data: companyProfiles, error: companyError } = await supabaseAdmin
        .from('company_profiles')
        .select('*');

      if (companyError) {
        console.error('Error fetching company profiles:', companyError);
        throw companyError;
      }

      console.log('🔍 [CONTENT_BRIEF_DEBUG] Company profiles fetched:', companyProfiles?.length || 0);

      // Step 3: Process users and determine types
      const mainUsersProcessed: UserProfile[] = (mainUsersData || []).map(user => ({
        id: user.id,
        email: user.email,
        company_name: user.company_name || 'Unknown Company',
        created_at: user.created_at,
        updated_at: user.updated_at,
        avatar_url: user.avatar_url || undefined,
        user_type: 'main',
        briefCount: 0,
        researchResultsCount: 0
      }));

      // Step 4: Process sub-users (company_profiles that have different user_ids)
      const subUsersProcessed: UserProfile[] = (companyProfiles || [])
        .filter(profile => profile.company_id)
        .map(profile => {
          const mainUser = mainUsersProcessed.find(u => u.id === profile.user_id);
          return {
            id: profile.user_id,
            email: mainUser?.email || `user-${profile.user_id}`,
            company_name: profile.company_id || 'Unknown Company',
            created_at: profile.created_at,
            updated_at: profile.updated_at,
            avatar_url: mainUser?.avatar_url || undefined,
            user_type: 'sub' as const,
            briefCount: 0,
            researchResultsCount: 0
          };
        });

      console.log('🔍 [CONTENT_BRIEF_DEBUG] Processed users:', {
        mainUsers: mainUsersProcessed.length,
        subUsers: subUsersProcessed.length
      });

      // Step 5: Get all unique user IDs for content brief and research results counting
      const allUsers = [...mainUsersProcessed, ...subUsersProcessed];
      const uniqueUserIds = [...new Set(allUsers.map(user => user.id))];

      console.log('🔍 [CONTENT_BRIEF_DEBUG] Unique user IDs for queries:', {
        totalUniqueUsers: uniqueUserIds.length,
        userIds: uniqueUserIds.slice(0, 5)
      });

      // Step 6: Fetch content briefs for all users
      const { data: contentBriefs, error: briefsError } = await supabaseAdmin
        .from('content_briefs')
        .select('user_id, product_name, id')
        .in('user_id', uniqueUserIds)
        .order('created_at', { ascending: false });

      if (briefsError) {
        console.error('Error fetching content briefs:', briefsError);
      } else {
        console.log('🔍 [CONTENT_BRIEF_DEBUG] Raw content briefs fetched:', {
          totalBriefs: contentBriefs?.length || 0
        });
      }

      // Step 7: Fetch research results for all users  
      const { data: researchResults, error: researchError } = await supabaseAdmin
        .from('research_results')
        .select('user_id, id')
        .in('user_id', uniqueUserIds)
        .order('created_at', { ascending: false });

      if (researchError) {
        console.error('Error fetching research results:', researchError);
      } else {
        console.log('🔍 [CONTENT_BRIEF_DEBUG] Raw research results fetched:', {
          totalResults: researchResults?.length || 0
        });
      }

      // Step 8: Count unique content briefs per user (avoid double counting)
      const briefCountMap: { [key: string]: number } = {};
      const uniqueBriefs = new Set();

      (contentBriefs || []).forEach(brief => {
        const normalizedProductName = (brief.product_name || 'untitled')
          .toLowerCase().trim().replace(/\s+/g, ' ');
        const uniqueKey = `${brief.user_id}-${normalizedProductName}`;
        
        if (!uniqueBriefs.has(uniqueKey)) {
          uniqueBriefs.add(uniqueKey);
          briefCountMap[brief.user_id] = (briefCountMap[brief.user_id] || 0) + 1;
        }
      });

      // Step 9: Count research results per user
      const researchCountMap: { [key: string]: number } = {};
      (researchResults || []).forEach(result => {
        researchCountMap[result.user_id] = (researchCountMap[result.user_id] || 0) + 1;
      });

      console.log('🔍 [CONTENT_BRIEF_DEBUG] Count maps:', {
        briefCountMap,
        researchCountMap,
        totalUniqueBriefs: uniqueBriefs.size,
        totalResearchResults: (researchResults || []).length
      });

      // Step 10: Apply counts to users
      const usersWithCounts = allUsers.map(user => ({
        ...user,
        briefCount: briefCountMap[user.id] || 0,
        researchResultsCount: researchCountMap[user.id] || 0
      }));

      // Step 11: Group by company and create company representatives 
      // For each company, count briefs across all users but ensure we don't double-count
      const companyBriefCounts = new Map<string, Set<string>>();
      const companyResearchCounts = new Map<string, number>();
      
      // First, collect all unique briefs per company
      (contentBriefs || []).forEach(brief => {
        // Find which company this brief belongs to
        const user = usersWithCounts.find(u => u.id === brief.user_id);
        if (user) {
          const companyName = user.company_name;
          if (!companyBriefCounts.has(companyName)) {
            companyBriefCounts.set(companyName, new Set());
          }
          // Use brief ID to ensure uniqueness
          companyBriefCounts.get(companyName)!.add(brief.id);
        }
      });
      
      // Count research results per company
      (researchResults || []).forEach(result => {
        const user = usersWithCounts.find(u => u.id === result.user_id);
        if (user) {
          const companyName = user.company_name;
          companyResearchCounts.set(companyName, (companyResearchCounts.get(companyName) || 0) + 1);
        }
      });
      
      // Create company representatives with accurate counts
      const companyRepresentatives = new Map();
      
      usersWithCounts.forEach(user => {
        const companyName = user.company_name;
        if (!companyRepresentatives.has(companyName)) {
          const companyBriefSet = companyBriefCounts.get(companyName);
          const briefCount = companyBriefSet ? companyBriefSet.size : 0;
          const researchCount = companyResearchCounts.get(companyName) || 0;
          
          companyRepresentatives.set(companyName, {
            ...user,
            user_type: 'main',
            briefCount: briefCount,
            researchResultsCount: researchCount
          });
        }
      });

      const finalUsers = Array.from(companyRepresentatives.values());

      console.log('🔍 [CONTENT_BRIEF_DEBUG] Final company representatives (ALL COMPANIES):', {
        totalCompanies: finalUsers.length
      });

      setUsers(finalUsers);

    } catch (err) {
      console.error('useUsersData: Error in fetchUsers:', err);
      setError('Failed to load users. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Group users by company with proper hierarchy
  const groupUsersByCompany = (users: UserProfile[]): CompanyGroup[] => {
    console.log('🔍 Grouping users by company. Total users:', users.length);
    
    const companies = new Map<string, CompanyGroup>();
    
    const mainUsers = users.filter(user => user.user_type === 'main');
    
    console.log('🔍 All main users:', mainUsers.length);
    
    mainUsers.forEach(user => {
      const companyName = user.company_name || 'Unknown Company';
      
      if (!companies.has(companyName)) {
        const companyUsers = users.filter(u => u.company_name === companyName);
        const subAccounts = companyUsers.filter(u => u.user_type === 'sub');
        
        companies.set(companyName, {
          company_name: companyName,
          main_account: user,
          sub_accounts: subAccounts,
          total_users: companyUsers.length,
          created_at: user.created_at
        });
      }
    });
    
    const result = Array.from(companies.values());
    console.log('🏢 Final company groups (all companies):', result.length);
    
    return result;
  };

  useEffect(() => {
    console.log('🔍 useUsersData: Hook mounted, fetching data...');
    fetchUsers();
  }, []);

  // Handle user deletion callback
  const handleUserDeleted = async (userId: string) => {
    console.log('User deleted, refreshing users data...');
    await fetchUsers();
  };

  return {
    users,
    isLoading,
    error,
    groupUsersByCompany,
    refreshUsers: fetchUsers,
    handleUserDeleted
  };
}