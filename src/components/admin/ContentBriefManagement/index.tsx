import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { toast } from 'react-hot-toast';

// Import types
import { 
  ContentBriefManagementProps, 
  UserProfile, 
  SelectedUserContext,
  CompanyGroup
} from './types';

// Import hooks
import { useUsersData } from './hooks/useUsersData';
import { useResearchData } from './hooks/useResearchData';
import { useContentBriefs } from './hooks/useContentBriefs';
import { useApprovedProducts } from './hooks/useApprovedProducts';

// Import components
import { CompanyGroupsList } from './CompanyGroupsList';
import { CompanyDetailView } from './CompanyDetailView';
import { UserDetailView } from './UserDetailView';

export function ContentBriefManagement({ onBack }: ContentBriefManagementProps) {
  // State for current view
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [selectedUserForBriefs, setSelectedUserForBriefs] = useState<SelectedUserContext | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'company' | 'email' | 'date'>('company');
  const [expandedProductIndex, setExpandedProductIndex] = useState<string | null>(null);

  // Initialize hooks
  const { users, isLoading, error, groupUsersByCompany, refreshUsers } = useUsersData();
  const { 
    userResearchResults, 
    isLoadingResearch, 
    fetchUserResearchResults,
    fetchCompanyResearchResults,
    updateResearchProduct,
    sanitizeProductData
  } = useResearchData();
  const {
    userContentBriefs,
    isLoadingBriefs,
    fetchUserContentBriefs,
    fetchCompanyContentBriefs,
    handleDeleteBrief
  } = useContentBriefs();
  const {
    approvedProducts,
    isLoadingApproved,
    fetchApprovedProductsData,
    handleUpdateApprovedProduct,
    handleDeleteApprovedProduct
  } = useApprovedProducts();

  // Filter and sort users
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.profile_name?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const groupedUsers = groupUsersByCompany(filteredUsers);
  
  const sortedCompanyGroups = [...groupedUsers].sort((a, b) => {
    switch (sortBy) {
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

  // Handle company selection for briefs view
  const handleCompanyBriefSelection = (user: UserProfile) => {
    const companyGroup = sortedCompanyGroups.find(group => 
      group.main_account.id === user.id
    );
    
    if (companyGroup) {
      setSelectedUserForBriefs({ user, companyGroup });
      
      // Fetch company data
      const allCompanyUserIds = [
        companyGroup.main_account.id,
        ...companyGroup.sub_accounts.map(sub => sub.id)
      ];
      
      fetchCompanyContentBriefs(allCompanyUserIds);
      fetchCompanyResearchResults(allCompanyUserIds);
    }
  };

  // Handle user selection for detailed view
  const handleSelectUser = async (user: UserProfile) => {
    setSelectedUser(user);
    await Promise.all([
      fetchUserResearchResults(user.id),
      fetchUserContentBriefs(user.id)
    ]);
  };

  // Handle section updates for research results
  const handleUpdateSection = async (productIndex: number, sectionType: string, newValue: any) => {
    try {
      console.log('🚀 handleUpdateSection called:', { productIndex, sectionType, newValue });
      
      const currentUser = selectedUser || selectedUserForBriefs?.user;
      if (!currentUser || !userResearchResults.length) {
        console.error('❌ No user selected or no research results');
        return;
      }

      // Find the research result that contains the product
      let targetResearchResult = null;
      let targetProductIndex = -1;
      let globalProductIndex = 0;

      for (const result of userResearchResults) {
        if (result.data && Array.isArray(result.data)) {
          for (let i = 0; i < result.data.length; i++) {
            if (globalProductIndex === productIndex) {
              targetResearchResult = result;
              targetProductIndex = i;
              break;
            }
            globalProductIndex++;
          }
        }
        if (targetResearchResult) break;
      }

      if (!targetResearchResult || targetProductIndex === -1) {
        console.error('❌ Could not find target product for update');
        return;
      }

      // Create updated data array with sanitization
      const updatedData = [...targetResearchResult.data];
      const currentProduct = updatedData[targetProductIndex];
      
      // Sanitize the current product data
      const sanitizedCurrentProduct = sanitizeProductData(currentProduct);
      
      const updatedProduct = {
        ...sanitizedCurrentProduct,
        [sectionType]: newValue
      };
      
      const finalSanitizedProduct = sanitizeProductData(updatedProduct);
      updatedData[targetProductIndex] = finalSanitizedProduct;

      // Update the database
      await updateResearchProduct(targetResearchResult.id, targetProductIndex, updatedData);
      
    } catch (error) {
      console.error('💥 Error updating product section:', error);
      throw error;
    }
  };

  // Real-time subscription for content_briefs table
  useEffect(() => {
    console.log('🔄 Setting up real-time subscription for content_briefs...');
    
    const subscription = supabase
      .channel('content_briefs_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'content_briefs'
        },
        (payload) => {
          console.log('🔄 Real-time content brief change detected:', payload);
          
          setTimeout(() => {
            if (selectedUserForBriefs && !selectedUser) {
              const allCompanyUserIds = [
                selectedUserForBriefs.companyGroup.main_account.id,
                ...selectedUserForBriefs.companyGroup.sub_accounts.map(sub => sub.id)
              ];
              fetchCompanyContentBriefs(allCompanyUserIds);
            } else if (selectedUser) {
              fetchUserContentBriefs(selectedUser.id);
            } else {
              refreshUsers();
            }
          }, 750);
        }
      )
      .subscribe();

    return () => {
      console.log('🔄 Cleaning up real-time subscription for content_briefs');
      subscription.unsubscribe();
    };
  }, [selectedUserForBriefs, selectedUser]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="flex items-center gap-3 text-gray-300">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading users...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-400">{error}</p>
        <button 
          onClick={refreshUsers}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    );
  }

  // Company Content Briefs View
  if (selectedUserForBriefs) {
    return (
      <CompanyDetailView
        companyGroup={selectedUserForBriefs.companyGroup}
        userContentBriefs={userContentBriefs}
        approvedProducts={approvedProducts}
        isLoadingBriefs={isLoadingBriefs}
        isLoadingApproved={isLoadingApproved}
        onBack={() => setSelectedUserForBriefs(null)}
        onUpdateApprovedProduct={handleUpdateApprovedProduct}
        onDeleteBrief={async (briefId: string, briefTitle?: string) => {
          const success = await handleDeleteBrief(briefId, briefTitle);
          if (success) {
            const allCompanyUserIds = [
              selectedUserForBriefs.companyGroup.main_account.id,
              ...selectedUserForBriefs.companyGroup.sub_accounts.map(sub => sub.id)
            ];
            fetchCompanyContentBriefs(allCompanyUserIds);
            refreshUsers();
          }
        }}
        onDeleteApprovedProduct={async (approvedProductId: string, productName?: string) => {
          const success = await handleDeleteApprovedProduct(approvedProductId, productName);
          if (success) {
            await fetchApprovedProductsData();
            const allCompanyUserIds = [
              selectedUserForBriefs.companyGroup.main_account.id,
              ...selectedUserForBriefs.companyGroup.sub_accounts.map(sub => sub.id)
            ];
            fetchCompanyContentBriefs(allCompanyUserIds);
            refreshUsers();
          }
        }}
        onRefreshData={() => {
          const allCompanyUserIds = [
            selectedUserForBriefs.companyGroup.main_account.id,
            ...selectedUserForBriefs.companyGroup.sub_accounts.map(sub => sub.id)
          ];
          fetchCompanyContentBriefs(allCompanyUserIds);
        }}
      />
    );
  }

  // User Detail View
  if (selectedUser) {
    return (
      <UserDetailView
        selectedUser={selectedUser}
        userResearchResults={userResearchResults}
        userContentBriefs={userContentBriefs}
        isLoadingResearch={isLoadingResearch}
        isLoadingBriefs={isLoadingBriefs}
        onBack={() => {
          setSelectedUser(null);
        }}
        onUpdateSection={handleUpdateSection}
        onDeleteBrief={async (briefId: string, briefTitle?: string) => {
          const success = await handleDeleteBrief(briefId, briefTitle);
          if (success) {
            fetchUserContentBriefs(selectedUser.id);
            refreshUsers();
          }
        }}
      />
    );
  }

  // Users List View
  return (
    <CompanyGroupsList
      companyGroups={sortedCompanyGroups}
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      sortBy={sortBy}
      onSortChange={setSortBy}
      onCompanySelect={handleCompanyBriefSelection}
      approvedProducts={approvedProducts}
    />
  );
}