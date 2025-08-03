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

      // Step 3: Process all users from user_profiles (simplified - no company_profiles needed)
      const allUsers: UserProfile[] = (mainUsersData || []).map(user => ({
        id: user.id,
        email: user.email,
        company_name: user.company_name || 'Unknown Company',
        created_at: user.created_at,
        updated_at: user.updated_at,
        avatar_url: user.avatar_url || undefined,
        user_type: 'main', // Will be properly assigned in grouping
        briefCount: 0,
        researchResultsCount: 0
      }));

      console.log('🔍 [CONTENT_BRIEF_DEBUG] All processed users:', allUsers.length);
      console.log('🔍 [CONTENT_BRIEF_DEBUG] User emails:', allUsers.map(u => u.email));

      // Step 4: Get all unique user IDs for content brief and research results counting
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
      
      // Create company representatives with accurate counts - FIX: Include ALL users, not just first one
      const companyRepresentatives = new Map();
      
      usersWithCounts.forEach(user => {
        const companyName = user.company_name;
        const companyBriefSet = companyBriefCounts.get(companyName);
        const briefCount = companyBriefSet ? companyBriefSet.size : 0;
        const researchCount = companyResearchCounts.get(companyName) || 0;
        
        // Always update with the latest counts, and prefer the earliest created user as main
        if (!companyRepresentatives.has(companyName)) {
          companyRepresentatives.set(companyName, {
            ...user,
            user_type: 'main',
            briefCount: briefCount,
            researchResultsCount: researchCount
          });
        } else {
          // If this user was created earlier, make them the main representative
          const currentRep = companyRepresentatives.get(companyName);
          if (new Date(user.created_at) < new Date(currentRep.created_at)) {
            companyRepresentatives.set(companyName, {
              ...user,
              user_type: 'main',
              briefCount: briefCount,
              researchResultsCount: researchCount
            });
          }
        }
      });

      const finalUsers = Array.from(companyRepresentatives.values());

      console.log('🔍 [CONTENT_BRIEF_DEBUG] Final company representatives (ALL COMPANIES):', {
        totalCompanies: finalUsers.length,
        companies: finalUsers.map(u => ({ company: u.company_name, mainUser: u.email, briefCount: u.briefCount }))
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
    
    // Group all users by company name, regardless of user_type (which doesn't exist in DB)
    const companiesMap = new Map<string, UserProfile[]>();
    
    users.forEach(user => {
      const companyName = user.company_name || 'Unknown Company';
      if (!companiesMap.has(companyName)) {
        companiesMap.set(companyName, []);
      }
      companiesMap.get(companyName)!.push(user);
      console.log(`🔍 Adding user ${user.email} to company "${companyName}"`);
    });
    
    console.log('🔍 Companies found:', companiesMap.size);
    
    // Create company groups - use the first user (chronologically) as main account
    companiesMap.forEach((companyUsers, companyName) => {
      // Sort by creation date to get the original account
      const sortedUsers = companyUsers.sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      
      const mainAccount = sortedUsers[0]; // First user is considered main
      const subAccounts = sortedUsers.slice(1); // Rest are sub-accounts
      
      console.log(`🔍 Company "${companyName}": main=${mainAccount.email}, subs=${subAccounts.length}`, {
        allUsers: companyUsers.map(u => u.email),
        mainUserBriefs: mainAccount.briefCount,
        mainUserId: mainAccount.id
      });
      
      companies.set(companyName, {
        company_name: companyName,
        main_account: {
          ...mainAccount,
          user_type: 'main' // Set the user_type for consistency
        },
        sub_accounts: subAccounts.map(user => ({
          ...user,
          user_type: 'sub' // Set the user_type for consistency
        })),
        total_users: companyUsers.length,
        created_at: mainAccount.created_at
      });
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