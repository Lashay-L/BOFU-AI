import { ProductAnalysis } from '../../../types/product/types';
import { ContentBrief } from '../../../types/contentBrief';

// Interface for research results from database
export interface ResearchResult {
  id: string;
  user_id: string;
  title: string;
  data: any[]; // This contains the product analysis data
  is_draft: boolean;
  is_approved: boolean;
  approved_by?: string;
  created_at: string;
  updated_at: string;
}

// Interface for user profile with enhanced structure
export interface UserProfile {
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
  briefCount?: number; // Add brief count for aggregation
  researchResultsCount?: number; // Add research results count
}

// Interface for grouped user data
export interface CompanyGroup {
  company_name: string;
  main_account: UserProfile;
  sub_accounts: UserProfile[];
  total_users: number;
  created_at: string;
}

// Interface for selected user context
export interface SelectedUserContext {
  user: UserProfile;
  companyGroup: CompanyGroup;
}

// Props interfaces for child components
export interface ContentBriefManagementProps {
  onBack?: () => void;
}

export interface CompanyGroupsListProps {
  companyGroups: CompanyGroup[];
  searchTerm: string;
  onSearchChange: (value: string) => void;
  sortBy: 'company' | 'email' | 'date';
  onSortChange: (value: 'company' | 'email' | 'date') => void;
  onCompanySelect: (user: UserProfile) => void;
  approvedProducts: any[];
}

export interface CompanyDetailViewProps {
  companyGroup: CompanyGroup;
  userContentBriefs: ContentBrief[];
  approvedProducts: any[];
  isLoadingBriefs: boolean;
  isLoadingApproved: boolean;
  onBack: () => void;
  onUpdateApprovedProduct: (approvedProductId: string, sectionType: string, newValue: any) => void;
  onDeleteBrief: (briefId: string, briefTitle?: string) => void;
  onDeleteApprovedProduct: (approvedProductId: string, productName?: string) => void;
  onRefreshData: () => void;
}

export interface UserDetailViewProps {
  selectedUser: UserProfile;
  userResearchResults: ResearchResult[];
  userContentBriefs: ContentBrief[];
  isLoadingResearch: boolean;
  isLoadingBriefs: boolean;
  onBack: () => void;
  onUpdateSection: (productIndex: number, sectionType: string, newValue: any) => void;
  onDeleteBrief: (briefId: string, briefTitle?: string) => void;
}

export interface ApprovedProductsSectionProps {
  approvedProducts: any[];
  companyName: string;
  companyGroup: CompanyGroup;
  isLoading: boolean;
  expandedProductIndex: string | null;
  onExpandToggle: (expandKey: string) => void;
  onUpdateApprovedProduct: (approvedProductId: string, sectionType: string, newValue: any) => void;
  onDeleteApprovedProduct: (approvedProductId: string, productName?: string) => void;
  onGenerateArticleSuccess: () => void;
}

export interface ContentBriefsSectionProps {
  contentBriefs: ContentBrief[];
  companyGroup: CompanyGroup;
  isLoading: boolean;
  collapsedContentBriefs: Set<string>;
  onCollapseToggle: (briefId: string) => void;
  onDeleteBrief: (briefId: string, briefTitle?: string) => void;
  onRefreshData: () => void;
  autoSaving: { [key: string]: boolean };
  onAutoSaveStateChange: (briefId: string, isSaving: boolean) => void;
}

export interface AdminProductCardProps {
  product: any;
  approvedProductId: string;
  companyGroup: CompanyGroup;
  isExpanded: boolean;
  onUpdateSection: (approvedProductId: string, sectionType: string, newValue: any) => void;
  onGenerateArticle: () => void;
}