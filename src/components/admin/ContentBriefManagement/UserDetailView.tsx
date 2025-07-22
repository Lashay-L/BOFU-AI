import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, FileText, Eye, BookOpen, Loader2, Edit, X } from 'lucide-react';
import { UserDetailViewProps } from './types';
import { ProductCard } from '../../product/ProductCard';
import { ContentBriefEditorSimple } from '../../content-brief/ContentBriefEditorSimple';

export function UserDetailView({
  selectedUser,
  userResearchResults,
  userContentBriefs,
  isLoadingResearch,
  isLoadingBriefs,
  onBack,
  onUpdateSection,
  onDeleteBrief
}: UserDetailViewProps) {
  const [expandedProductIndex, setExpandedProductIndex] = useState<string | null>(null);

  const handleProductClick = (product: any, resultId: string, productIndex: number) => {
    console.log(`Product ${productIndex + 1} clicked in research result ${resultId}`);
    console.log('Full product data:', JSON.stringify(product, null, 2));
    console.log('Product structure keys:', Object.keys(product));
    const expandKey = `${resultId}-${productIndex}`;
    setExpandedProductIndex(expandedProductIndex === expandKey ? null : expandKey);
  };

  const handleCloseProductModal = () => {
    setExpandedProductIndex(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center gap-4">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onBack}
          className="p-2 rounded-lg bg-gray-700/60 hover:bg-gray-600/60 border border-gray-600/30"
        >
          <ArrowLeft size={18} className="text-gray-300" />
        </motion.button>
        <div>
          <h2 className="text-2xl font-bold text-white">
            {selectedUser.company_name || selectedUser.email}
          </h2>
          <p className="text-gray-400">{selectedUser.email}</p>
        </div>
      </div>

      {/* User Research Results Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-800/60 backdrop-blur-sm rounded-lg shadow-lg border border-gray-700/30 p-6"
      >
        <div className="flex items-center gap-3 mb-6">
          <FileText className="h-6 w-6 text-blue-400" />
          <h3 className="text-xl font-semibold text-white">Research Results & Product Cards</h3>
          <span className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-sm font-medium border border-blue-500/30">
            {userResearchResults.length} results
          </span>
        </div>

        {userResearchResults.length > 0 ? (
          <div className="space-y-4">
            {userResearchResults.map((result) => (
              <div key={result.id} className="bg-gray-700/40 rounded-lg p-4 border border-gray-600/30">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="text-white font-semibold">Research Result #{result.id}</h4>
                    <span className="text-sm text-gray-400">
                      Status: {result.is_approved ? 'Approved' : (result.is_draft ? 'Draft' : 'Pending')}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400">
                    {new Date(result.created_at).toLocaleDateString()}
                  </span>
                </div>
                
                {/* Display products in this research result */}
                {result.data && result.data.length > 0 ? (
                  <div className="mt-4">
                    <p className="text-gray-400 text-sm mb-3">
                      Contains {result.data.length} product{result.data.length !== 1 ? 's' : ''}
                    </p>
                    <div className="space-y-3">
                      {result.data.map((product, index) => {
                        const expandKey = `${result.id}-${index}`;
                        const isExpanded = expandedProductIndex === expandKey;
                        
                        return (
                          <div key={index}>
                            {/* Product Summary Card */}
                            <div 
                              onClick={() => handleProductClick(product, result.id, index)}
                              className="bg-gray-600/30 rounded p-3 cursor-pointer hover:bg-gray-600/50 transition-colors border border-gray-600/20 hover:border-gray-500/40"
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <h5 className="text-white text-sm font-medium">
                                    {product.productDetails?.name || product.companyName || `Product ${index + 1}`}
                                  </h5>
                                  <p className="text-gray-400 text-xs mt-1">
                                    {product.companyName || 'No company name'}
                                  </p>
                                  <div className="flex items-center space-x-4 mt-2 text-xs text-gray-400">
                                    {product.usps?.length > 0 && (
                                      <span>USPs: {product.usps.length}</span>
                                    )}
                                    {product.features?.length > 0 && (
                                      <span>Features: {product.features.length}</span>
                                    )}
                                    {product.painPoints?.length > 0 && (
                                      <span>Pain Points: {product.painPoints.length}</span>
                                    )}
                                    {product.capabilities?.length > 0 && (
                                      <span>Capabilities: {product.capabilities.length}</span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2 text-blue-400">
                                  <Eye className="w-4 h-4" />
                                  <span className="text-sm font-medium">
                                    {isExpanded ? 'Hide Details' : 'View Full Card'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Expanded ProductCard */}
                            {isExpanded && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="mt-4 bg-gray-700/40 rounded-lg p-4 border border-gray-600/30"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="flex justify-between items-center mb-4">
                                  <h6 className="text-white font-medium">Full Product Analysis</h6>
                                  <button
                                    onClick={handleCloseProductModal}
                                    className="text-gray-400 hover:text-white"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                                <ProductCard
                                  product={product}
                                  isExpanded={true}
                                  showExpandButton={false}
                                  className="bg-transparent"
                                  context="admin"
                                  enableEditing={true}
                                  userUUID={selectedUser.id}
                                  userEmail={selectedUser.email}
                                  userCompanyName={selectedUser.company_name}
                                  onUpdateSection={onUpdateSection}
                                />
                              </motion.div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No product analysis available</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400">No research results found</p>
            <p className="text-gray-500 text-sm mt-2">
              Research results will appear here once the user uploads product documents
            </p>
          </div>
        )}
      </motion.div>

      {/* User Content Briefs Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-800/60 backdrop-blur-sm rounded-lg shadow-lg border border-gray-700/30 p-6"
      >
        <div className="flex items-center gap-3 mb-6">
          <BookOpen className="h-6 w-6 text-green-400" />
          <h3 className="text-xl font-semibold text-white">Content Briefs</h3>
          <span className="px-3 py-1 bg-green-500/20 text-green-300 rounded-full text-sm font-medium border border-green-500/30">
            {userContentBriefs.length} briefs
          </span>
        </div>

        {isLoadingBriefs ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-3 text-gray-300">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>Loading content briefs...</span>
            </div>
          </div>
        ) : userContentBriefs.length > 0 ? (
          <div className="space-y-6">
            {userContentBriefs.map((brief) => (
              <div key={brief.id} className="bg-gray-700/40 rounded-lg border border-gray-600/30">
                <div className="p-4 border-b border-gray-600/30 bg-gray-700/20">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="text-xl font-bold text-white leading-tight mb-2">
                        {(() => {
                          // Use the same clean title logic as user dashboard
                          if (brief.title && brief.title.trim()) {
                            return brief.title;
                          }
                          // Extract first keyword from brief content if available
                          if (brief.brief_content) {
                            try {
                              let briefContent = brief.brief_content as any;
                              if (typeof briefContent === 'string') {
                                briefContent = JSON.parse(briefContent);
                              }
                              if (briefContent.keywords && Array.isArray(briefContent.keywords) && briefContent.keywords.length > 0) {
                                const firstKeyword = briefContent.keywords[0].replace(/[`'"]/g, '').trim();
                                const cleanKeyword = firstKeyword.replace(/^\/|\/$|^https?:\/\//, '').replace(/[-_]/g, ' ');
                                return cleanKeyword;
                              }
                            } catch (error) {
                              console.warn('Could not extract keywords from brief content:', error);
                            }
                          }
                          // Fallback to product name only (no ID)
                          return brief.product_name || `Content Brief - ${new Date(brief.created_at).toLocaleDateString()}`;
                        })()}
                      </h4>
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
                          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                          <span className="text-gray-300 font-medium">Status</span>
                          <span className="text-white font-semibold">Active</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <BookOpen className="w-4 h-4 text-green-400" />
                      <span className="text-sm text-green-400 font-medium">Content Brief</span>
                      <button
                        onClick={() => onDeleteBrief(brief.id, brief.title || brief.product_name)}
                        className="ml-2 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded-lg border border-red-500/20 hover:border-red-500/30 transition-colors text-sm font-medium"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="p-6">
                  {brief.brief_content && Object.keys(brief.brief_content).length > 0 ? (
                    <div className="space-y-6">
                      <div className="bg-gray-600/20 rounded-lg p-4 border border-gray-600/30">
                        <h5 className="text-white font-medium mb-3">📝 Content Brief Structure</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          {Object.entries(brief.brief_content).map(([section, content]) => (
                            <div key={section} className="bg-gray-700/30 rounded p-3">
                              <h6 className="text-blue-300 font-medium mb-2">{section}</h6>
                              <div className="text-gray-300 text-xs">
                                {typeof content === 'object' && content !== null ? (
                                  <div className="space-y-1">
                                    {Object.entries(content).map(([key, value]) => (
                                      <div key={key}>
                                        <span className="text-yellow-300">{key}:</span>{' '}
                                        <span className="text-gray-300">
                                          {Array.isArray(value) ? `${value.length} items` : 
                                           typeof value === 'string' ? value.substring(0, 100) + (value.length > 100 ? '...' : '') :
                                           typeof value}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-gray-300">
                                    {typeof content === 'string' ? content.substring(0, 150) + (content.length > 150 ? '...' : '') : String(content)}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      {/* Editable Content Brief Display */}
                      <div className="bg-gray-700/20 rounded-lg p-4 border border-gray-600/30">
                        <h5 className="text-white font-medium mb-3 flex items-center gap-2">
                          <Edit className="w-4 h-4" />
                          Edit Content Brief
                        </h5>
                        <ContentBriefEditorSimple 
                          initialContent={brief.brief_content}
                          briefId={brief.id}
                          researchResultId={brief.research_result_id}
                          onUpdate={(content: string, links: string[], titles: string[]) => {
                            // The ContentBriefEditorSimple component handles database saving automatically
                          }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500 bg-gray-600/20 rounded-lg border border-gray-600/30">
                      <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <h5 className="font-medium text-gray-300 mb-2">Empty Content Brief</h5>
                      <p className="text-sm text-gray-400 mb-4">
                        This content brief doesn't contain any structured content yet.
                      </p>
                      <div className="text-xs text-gray-500 space-y-1 bg-gray-700/30 rounded p-3 max-w-sm mx-auto">
                        <p><span className="font-medium">Brief Content:</span> {brief.brief_content ? 'Present but empty' : 'null'}</p>
                        <p><span className="font-medium">Product Name:</span> {brief.product_name || 'Not specified'}</p>
                        <p className="text-yellow-400 mt-2">💡 Content briefs are generated when users send products to Moonlit</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <BookOpen className="h-12 w-12 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400">No content briefs generated yet</p>
            <p className="text-gray-500 text-sm mt-2">
              Content briefs will appear here once the user sends products to Moonlit
            </p>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}