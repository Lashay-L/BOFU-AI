import React from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Loader2, ChevronDown, ChevronRight, Crown, Edit, Trash2 } from 'lucide-react';
import { ContentBriefsSection as ContentBriefsSectionProps } from './types';
import { ContentBriefEditorSimple } from '../../content-brief/ContentBriefEditorSimple';
import { ResponsiveApprovalButton } from '../../common/ResponsiveApprovalButton';
import { updateBrief } from '../../../lib/contentBriefs';
import { toast } from 'react-hot-toast';

export function ContentBriefsSection({
  contentBriefs,
  companyGroup,
  isLoading,
  collapsedContentBriefs,
  onCollapseToggle,
  onDeleteBrief,
  onRefreshData,
  autoSaving,
  onAutoSaveStateChange
}: ContentBriefsSectionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-800/60 backdrop-blur-sm rounded-lg shadow-lg border border-gray-700/30 p-6"
    >
      <div className="flex items-center gap-3 mb-6">
        <BookOpen className="h-6 w-6 text-green-400" />
        <h3 className="text-xl font-semibold text-white">All Company Content Briefs</h3>
        <span className="px-3 py-1 bg-green-500/20 text-green-300 rounded-full text-sm font-medium border border-green-500/30">
          {contentBriefs.length} briefs
        </span>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-3 text-gray-300">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Loading company content briefs...</span>
          </div>
        </div>
      ) : contentBriefs.length > 0 ? (
        <div className="space-y-6">
          {contentBriefs.map((brief) => {
            // Find which user created this brief
            const briefCreator = companyGroup.main_account.id === brief.user_id 
              ? companyGroup.main_account 
              : companyGroup.sub_accounts.find(sub => sub.id === brief.user_id);
            
            const isCollapsed = collapsedContentBriefs.has(brief.id);
            
            return (
              <div key={brief.id} className="bg-gray-700/40 rounded-lg border border-gray-600/30">
                <div className="p-4 border-b border-gray-600/30 bg-gray-700/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => onCollapseToggle(brief.id)}
                        className="p-1 rounded-lg hover:bg-gray-600/50 transition-colors"
                        title={isCollapsed ? 'Expand content brief' : 'Collapse content brief'}
                      >
                        {isCollapsed ? (
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        )}
                      </button>
                      <div 
                        className="cursor-pointer flex-1"
                        onClick={() => onCollapseToggle(brief.id)}
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="text-xl font-bold text-white leading-tight">
                            {brief.title || brief.product_name || `Content Brief - ${new Date(brief.created_at).toLocaleDateString()}`}
                          </h4>
                          <div className="flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-full border border-green-500/30">
                            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                            <span className="text-xs font-medium text-green-300">Active Brief</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-600/30 rounded-lg">
                            <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                            <span className="text-gray-300 font-medium">Created</span>
                            <span className="text-white font-semibold">
                              {new Date(brief.created_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-600/30 rounded-lg">
                            <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                              <span className="text-xs font-bold text-white">
                                {briefCreator?.profile_name ? briefCreator.profile_name.charAt(0).toUpperCase() : briefCreator?.email.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <span className="text-gray-300 font-medium">Author</span>
                            <span className="text-white font-semibold">
                              {briefCreator ? (briefCreator.profile_name || briefCreator.email.split('@')[0]) : 'Unknown'}
                            </span>
                            {briefCreator?.user_type === 'main' && (
                              <Crown className="w-4 h-4 text-yellow-400 ml-1" />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <BookOpen className="w-4 h-4 text-green-400" />
                      <span className="text-sm text-green-400 font-medium">Content Brief</span>
                      <div className="flex items-center space-x-2">
                        <ResponsiveApprovalButton 
                          brief={brief}
                          briefId={brief.id}
                          onSuccess={onRefreshData}
                        />
                        <button
                          onClick={() => onDeleteBrief(brief.id, brief.title || brief.product_name)}
                          className="flex items-center space-x-1 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded-lg border border-red-500/20 hover:border-red-500/30 transition-colors"
                          title="Delete content brief"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span className="text-sm font-medium">Delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Content section - only show if not collapsed */}
                {!isCollapsed && (
                  <div className="p-6">
                    {(() => {
                    // Check if brief_content exists and has valid content
                    let hasValidContent = false;
                    let contentToPass = '';
                    
                    if (brief.brief_content) {
                      try {
                        // If brief_content is already a string (JSON), use it directly
                        if (typeof brief.brief_content === 'string') {
                          const parsed = JSON.parse(brief.brief_content);
                          hasValidContent = parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0;
                          contentToPass = brief.brief_content;
                        } 
                        // If brief_content is already an object, stringify it
                        else if (typeof brief.brief_content === 'object') {
                          hasValidContent = Object.keys(brief.brief_content).length > 0;
                          contentToPass = JSON.stringify(brief.brief_content);
                        }
                      } catch (error) {
                        console.error('Error parsing brief_content:', error);
                        hasValidContent = false;
                      }
                    }
                    
                    if (hasValidContent) {
                      return (
                        <div className="space-y-6">
                          {/* Editable Content Brief Display */}
                          <div className="bg-gray-700/20 rounded-lg p-4 border border-gray-600/30">
                            <div className="flex items-center justify-between mb-3">
                              <h5 className="text-white font-medium flex items-center gap-2">
                                <Edit className="w-4 h-4" />
                                Edit Content Brief
                              </h5>
                              {/* Auto-save indicator */}
                              {autoSaving[brief.id] && (
                                <div className="flex items-center space-x-2 px-3 py-1 bg-green-50/90 text-green-700 rounded-full text-sm font-medium border border-green-200/50 backdrop-blur-sm">
                                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                  <span>Auto-saving...</span>
                                </div>
                              )}
                            </div>
                            <ContentBriefEditorSimple 
                              initialContent={contentToPass}
                              briefId={brief.id}
                              researchResultId={brief.research_result_id}
                              onUpdate={async (content: string, links: string[], titles: string[]) => {
                                try {
                                  console.log('Admin dashboard: Auto-saving content brief changes');
                                  
                                  // Set auto-saving state
                                  onAutoSaveStateChange(brief.id, true);
                                  
                                  // Use the same updateBrief function as user dashboard for consistency
                                  await updateBrief(brief.id, {
                                    brief_content: content,
                                    internal_links: links,
                                    possible_article_titles: titles
                                  });
                                  
                                  console.log('✅ Admin dashboard: Content brief auto-saved successfully');
                                } catch (error) {
                                  console.error('Auto-save error:', error);
                                  toast.error('Failed to auto-save changes');
                                } finally {
                                  // Clear auto-saving state
                                  onAutoSaveStateChange(brief.id, false);
                                }
                              }}
                            />
                          </div>
                        </div>
                      );
                    } else {
                      return (
                        <div className="text-center py-8 text-gray-500 bg-gray-600/20 rounded-lg border border-gray-600/30">
                          <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
                          <h5 className="font-medium text-gray-300 mb-2">Empty Content Brief</h5>
                          <p className="text-sm text-gray-400 mb-4">
                            This content brief doesn't contain any structured content yet.
                          </p>
                          <div className="text-xs text-gray-500 space-y-1 bg-gray-700/30 rounded p-3 max-w-sm mx-auto">
                            <p><span className="font-medium">Brief Content:</span> {brief.brief_content ? 'Present but empty' : 'null'}</p>
                            <p><span className="font-medium">Product Name:</span> {brief.product_name || 'Not specified'}</p>
                            <p className="text-yellow-400 mt-2">💡 Content briefs are generated when users send products to AirOps</p>
                          </div>
                        </div>
                      );
                    }
                  })()}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <BookOpen className="h-12 w-12 text-gray-500 mx-auto mb-4" />
          <p className="text-gray-400">No content briefs found for this company</p>
          <p className="text-gray-500 text-sm mt-2">
            Content briefs will appear here once company users send products to AirOps
          </p>
        </div>
      )}
    </motion.div>
  );
}