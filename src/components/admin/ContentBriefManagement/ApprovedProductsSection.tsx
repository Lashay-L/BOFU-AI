import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Loader2, Eye, Package, Trash2, X } from 'lucide-react';
import { ApprovedProductsSectionProps } from './types';
import { AdminProductCard } from './AdminProductCard';

export function ApprovedProductsSection({
  approvedProducts,
  companyName,
  companyGroup,
  isLoading,
  expandedProductIndex,
  onExpandToggle,
  onUpdateApprovedProduct,
  onDeleteApprovedProduct,
  onGenerateArticleSuccess
}: ApprovedProductsSectionProps) {
  const filteredProducts = approvedProducts.filter(p => p.company_name === companyName);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-800/60 backdrop-blur-sm rounded-lg shadow-lg border border-gray-700/30 p-6"
    >
      <div className="flex items-center gap-3 mb-6">
        <CheckCircle className="h-6 w-6 text-green-400" />
        <h3 className="text-xl font-semibold text-white">Approved Product Cards</h3>
        <span className="px-3 py-1 bg-green-500/20 text-green-300 rounded-full text-sm font-medium border border-green-500/30">
          {filteredProducts.length} approved
        </span>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-3 text-gray-300">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Loading approved products...</span>
          </div>
        </div>
      ) : filteredProducts.length > 0 ? (
        <div className="space-y-4">
          {filteredProducts.map((approvedProduct) => {
            const product = approvedProduct.product_data;
            const expandKey = `approved-${approvedProduct.id}`;
            const isExpanded = expandedProductIndex === expandKey;
            
            return (
              <div key={approvedProduct.id}>
                <div 
                  onClick={() => onExpandToggle(expandKey)}
                  className="bg-gray-700/40 rounded-lg p-4 border border-gray-600/30 cursor-pointer hover:bg-gray-600/50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="text-xl font-bold text-white leading-tight">
                          {product?.productDetails?.name || product?.companyName || approvedProduct.product_name || 'Unnamed Product'}
                        </h4>
                        <div className="flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-full border border-green-500/30">
                          <CheckCircle className="w-4 h-4 text-green-400" />
                          <span className="text-xs font-medium text-green-300">Approved Product</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-600/30 rounded-lg">
                          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                          <span className="text-gray-300 font-medium">Approved</span>
                          <span className="text-white font-semibold">
                            {new Date(approvedProduct.approved_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-600/30 rounded-lg">
                          <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center">
                            <Package className="w-3 h-3 text-white" />
                          </div>
                          <span className="text-gray-300 font-medium">Status</span>
                          <span className="text-white font-semibold capitalize">
                            {approvedProduct.reviewed_status}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-600/30 rounded-lg">
                          <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                          <span className="text-gray-300 font-medium">Source</span>
                          <span className="text-white font-semibold">
                            {approvedProduct.research_result_id ? 'Research Data' : 'Product Page'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2 text-green-400">
                        <Eye className="w-4 h-4" />
                        <span className="text-sm font-medium">
                          {isExpanded ? 'Hide Details' : 'View Full Card'}
                        </span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteApprovedProduct(
                            approvedProduct.id, 
                            product?.productDetails?.name || product?.companyName || approvedProduct.product_name
                          );
                        }}
                        className="flex items-center space-x-1 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded-lg border border-red-500/20 hover:border-red-500/30 transition-colors"
                        title="Delete approved product"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span className="text-sm font-medium">Delete</span>
                      </button>
                    </div>
                  </div>
                  
                  {/* Product Stats */}
                  {product && (
                    <div className="mt-3 bg-gray-600/30 rounded p-3">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        {product.usps?.length > 0 && (
                          <div>
                            <span className="text-gray-400">USPs:</span>
                            <span className="text-white ml-2">{product.usps.length}</span>
                          </div>
                        )}
                        {product.features?.length > 0 && (
                          <div>
                            <span className="text-gray-400">Features:</span>
                            <span className="text-white ml-2">{product.features.length}</span>
                          </div>
                        )}
                        {product.painPoints?.length > 0 && (
                          <div>
                            <span className="text-gray-400">Pain Points:</span>
                            <span className="text-white ml-2">{product.painPoints.length}</span>
                          </div>
                        )}
                        {product.capabilities?.length > 0 && (
                          <div>
                            <span className="text-gray-400">Capabilities:</span>
                            <span className="text-white ml-2">{product.capabilities.length}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Expanded ProductCard */}
                {isExpanded && product && (
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
                        onClick={(e) => {
                          e.stopPropagation();
                          onExpandToggle(expandKey);
                        }}
                        className="text-gray-400 hover:text-white"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <AdminProductCard
                      product={product}
                      approvedProductId={approvedProduct.id}
                      companyGroup={companyGroup}
                      isExpanded={true}
                      onUpdateSection={onUpdateApprovedProduct}
                      onGenerateArticle={onGenerateArticleSuccess}
                    />
                  </motion.div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <CheckCircle className="h-12 w-12 text-gray-500 mx-auto mb-4" />
          <p className="text-gray-400">No approved products found for this company</p>
          <p className="text-gray-500 text-sm mt-2">
            Research results and product cards will appear here once company users upload documents
          </p>
        </div>
      )}
    </motion.div>
  );
}