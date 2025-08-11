import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Building2 } from 'lucide-react';
import { CompanyDetailViewProps } from './types';
import { ApprovedProductsSection } from './ApprovedProductsSection';
import { ContentBriefsSection } from './ContentBriefsSection';
import { AdminArticleTracker } from './AdminArticleTracker';

export function CompanyDetailView({
  companyGroup,
  userContentBriefs,
  approvedProducts,
  isLoadingBriefs,
  isLoadingApproved,
  onBack,
  onUpdateApprovedProduct,
  onDeleteBrief,
  onDeleteApprovedProduct,
  onRefreshData,
  onSelectUser
}: CompanyDetailViewProps) {
  const [expandedProductIndex, setExpandedProductIndex] = React.useState<string | null>(null);
  const [collapsedContentBriefs, setCollapsedContentBriefs] = React.useState<Set<string>>(new Set());
  const [autoSaving, setAutoSaving] = React.useState<{ [key: string]: boolean }>({});

  const handleExpandToggle = (expandKey: string) => {
    setExpandedProductIndex(expandedProductIndex === expandKey ? null : expandKey);
  };

  const handleCollapseToggle = (briefId: string) => {
    setCollapsedContentBriefs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(briefId)) {
        newSet.delete(briefId);
      } else {
        newSet.add(briefId);
      }
      return newSet;
    });
  };

  const handleAutoSaveStateChange = (briefId: string, isSaving: boolean) => {
    setAutoSaving(prev => ({ ...prev, [briefId]: isSaving }));
  };

  const handleGenerateArticleSuccess = () => {
    console.log('Article generation initiated successfully!');
    onRefreshData();
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      {/* Header with back button */}
      <div className="flex items-center gap-4">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onBack}
          className="p-2 rounded-lg bg-gray-700/60 hover:bg-gray-600/60 border border-gray-600/30 hover:border-gray-500/50 transition-all duration-200"
        >
          <ArrowLeft size={18} className="text-gray-300" />
        </motion.button>
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl">
            <Building2 className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">
              {companyGroup.company_name}
            </h2>
            <p className="text-gray-400">Company Content Briefs</p>
            <div className="flex items-center gap-4 text-sm text-gray-400 mt-1">
              <span>{companyGroup.total_users} total users</span>
              <span>•</span>
              <span>Owner: {companyGroup.main_account.email}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Article Tracking Overview */}
      <AdminArticleTracker
        contentBriefs={userContentBriefs}
        companyGroup={companyGroup}
        isLoading={isLoadingBriefs}
        onRefreshData={onRefreshData}
      />

      {/* Approved Product Cards Section */}
      <ApprovedProductsSection
        approvedProducts={approvedProducts}
        companyName={companyGroup.company_name}
        companyGroup={companyGroup}
        isLoading={isLoadingApproved}
        expandedProductIndex={expandedProductIndex}
        onExpandToggle={handleExpandToggle}
        onUpdateApprovedProduct={onUpdateApprovedProduct}
        onDeleteApprovedProduct={onDeleteApprovedProduct}
        onGenerateArticleSuccess={handleGenerateArticleSuccess}
      />

      {/* Content Briefs Section */}
      <ContentBriefsSection
        contentBriefs={userContentBriefs}
        companyGroup={companyGroup}
        isLoading={isLoadingBriefs}
        collapsedContentBriefs={collapsedContentBriefs}
        onCollapseToggle={handleCollapseToggle}
        onDeleteBrief={onDeleteBrief}
        onRefreshData={onRefreshData}
        autoSaving={autoSaving}
        onAutoSaveStateChange={handleAutoSaveStateChange}
      />
    </motion.div>
  );
}