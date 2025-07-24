import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Package, 
  ExternalLink,
  ChevronRight,
  ChevronDown,
  AlertCircle,
  Award,
  Target,
  Users,
  Building,
  DollarSign
} from 'lucide-react';

interface SourceProductBrowserProps {
  sourceProductId?: string;
  sourceProductData?: any;
  briefTitle?: string;
  onNavigateToProduct?: (sourceProductId: string) => void;
}

export const SourceProductBrowser: React.FC<SourceProductBrowserProps> = ({
  sourceProductId,
  sourceProductData,
  briefTitle,
  onNavigateToProduct
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!sourceProductId && !sourceProductData) {
    return null;
  }

  const productData = sourceProductData;
  const productName = productData?.productDetails?.name || productData?.companyName || 'Product Card';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-6"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
            <Package className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <h4 className="text-white font-medium">Original Product Card</h4>
            <p className="text-blue-200 text-sm">{productName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onNavigateToProduct && sourceProductId && (
            <button
              onClick={() => onNavigateToProduct(sourceProductId)}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 hover:text-blue-200 rounded-lg border border-blue-500/30 hover:border-blue-500/40 transition-colors text-sm"
            >
              <ExternalLink className="w-3 h-3" />
              View Full Card
            </button>
          )}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 hover:bg-blue-500/20 rounded-lg transition-colors"
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-blue-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-blue-400" />
            )}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && productData && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 space-y-4"
          >
            {/* Pain Points */}
            {productData.painPoints && productData.painPoints.length > 0 && (
              <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/30">
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle className="w-4 h-4 text-red-400" />
                  <h5 className="text-white font-medium text-sm">Pain Points</h5>
                  <span className="text-xs bg-red-500/20 text-red-300 px-2 py-0.5 rounded-full">
                    {productData.painPoints.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {productData.painPoints.slice(0, 3).map((point: string, index: number) => (
                    <div key={index} className="text-sm text-gray-300 leading-relaxed">
                      • {point.length > 120 ? point.substring(0, 120) + '...' : point}
                    </div>
                  ))}
                  {productData.painPoints.length > 3 && (
                    <div className="text-xs text-gray-400 italic">
                      +{productData.painPoints.length - 3} more pain points...
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* USPs */}
            {productData.usps && productData.usps.length > 0 && (
              <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/30">
                <div className="flex items-center gap-2 mb-3">
                  <Award className="w-4 h-4 text-green-400" />
                  <h5 className="text-white font-medium text-sm">Unique Selling Points</h5>
                  <span className="text-xs bg-green-500/20 text-green-300 px-2 py-0.5 rounded-full">
                    {productData.usps.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {productData.usps.slice(0, 2).map((usp: string, index: number) => (
                    <div key={index} className="text-sm text-gray-300 leading-relaxed">
                      • {usp.length > 100 ? usp.substring(0, 100) + '...' : usp}
                    </div>
                  ))}
                  {productData.usps.length > 2 && (
                    <div className="text-xs text-gray-400 italic">
                      +{productData.usps.length - 2} more USPs...
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Capabilities */}
            {productData.capabilities && productData.capabilities.length > 0 && (
              <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/30">
                <div className="flex items-center gap-2 mb-3">
                  <Target className="w-4 h-4 text-blue-400" />
                  <h5 className="text-white font-medium text-sm">Key Capabilities</h5>
                  <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full">
                    {productData.capabilities.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {productData.capabilities.slice(0, 3).map((cap: any, index: number) => {
                    const title = typeof cap === 'object' ? cap.title || cap.name : cap;
                    const description = typeof cap === 'object' ? cap.description || cap.content : '';
                    return (
                      <div key={index} className="text-sm text-gray-300">
                        <div className="font-medium">{title}</div>
                        {description && (
                          <div className="text-xs text-gray-400 mt-1">
                            {description.length > 80 ? description.substring(0, 80) + '...' : description}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {productData.capabilities.length > 3 && (
                    <div className="text-xs text-gray-400 italic">
                      +{productData.capabilities.length - 3} more capabilities...
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Competitors */}
            {productData.competitors && (
              <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/30">
                <div className="flex items-center gap-2 mb-3">
                  <Building className="w-4 h-4 text-orange-400" />
                  <h5 className="text-white font-medium text-sm">Competitive Landscape</h5>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  {productData.competitors.direct_competitors && productData.competitors.direct_competitors.length > 0 && (
                    <div>
                      <div className="text-orange-300 font-medium mb-1">Direct</div>
                      {productData.competitors.direct_competitors.slice(0, 2).map((comp: any, index: number) => (
                        <div key={index} className="text-gray-400">
                          {typeof comp === 'object' ? comp.company_name || comp.name : comp}
                        </div>
                      ))}
                    </div>
                  )}
                  {productData.competitors.niche_competitors && productData.competitors.niche_competitors.length > 0 && (
                    <div>
                      <div className="text-orange-300 font-medium mb-1">Niche</div>
                      {productData.competitors.niche_competitors.slice(0, 2).map((comp: any, index: number) => (
                        <div key={index} className="text-gray-400">
                          {typeof comp === 'object' ? comp.company_name || comp.name : comp}
                        </div>
                      ))}
                    </div>
                  )}
                  {productData.competitors.broader_competitors && productData.competitors.broader_competitors.length > 0 && (
                    <div>
                      <div className="text-orange-300 font-medium mb-1">Broader</div>
                      {productData.competitors.broader_competitors.slice(0, 2).map((comp: any, index: number) => (
                        <div key={index} className="text-gray-400">
                          {typeof comp === 'object' ? comp.company_name || comp.name : comp}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Target Persona */}
            {productData.targetPersona && (
              <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/30">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="w-4 h-4 text-purple-400" />
                  <h5 className="text-white font-medium text-sm">Target Audience</h5>
                </div>
                <div className="text-sm text-gray-300">
                  {productData.targetPersona.primaryAudience && (
                    <div className="mb-2">
                      <span className="text-purple-300 font-medium">Primary: </span>
                      {productData.targetPersona.primaryAudience}
                    </div>
                  )}
                  {productData.targetPersona.industrySegments && productData.targetPersona.industrySegments.length > 0 && (
                    <div className="text-xs text-gray-400">
                      <span className="text-purple-300 font-medium">Industries: </span>
                      {productData.targetPersona.industrySegments.slice(0, 3).join(', ')}
                      {productData.targetPersona.industrySegments.length > 3 && '...'}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Pricing */}
            {productData.pricing && (
              <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/30">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-4 h-4 text-yellow-400" />
                  <h5 className="text-white font-medium text-sm">Pricing</h5>
                </div>
                <div className="text-sm text-gray-300">
                  {productData.pricing.length > 100 ? productData.pricing.substring(0, 100) + '...' : productData.pricing}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};