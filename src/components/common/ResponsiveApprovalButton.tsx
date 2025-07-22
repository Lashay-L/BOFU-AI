import { ApproveContentBrief } from '../content/ApproveContentBrief';
import { ContentBrief } from '../../types/contentBrief';
import { ensureLinksAsText } from '../../utils/contentFormatUtils';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

/**
 * Responsive wrapper for ApproveContentBrief component
 * Handles both desktop and mobile layouts with proper data formatting
 */

interface ResponsiveApprovalButtonProps {
  brief: ContentBrief;
  briefId: string;
  editorContent?: string;
  onSuccess: () => void;
  className?: string;
}

export const ResponsiveApprovalButton = ({
  brief,
  briefId,
  editorContent,
  onSuccess,
  className = ''
}: ResponsiveApprovalButtonProps) => {
  const [contentFramework, setContentFramework] = useState<string>('');

  // Fetch content framework from multiple sources
  useEffect(() => {
    const fetchContentFramework = async () => {
      console.log('🔍 === FRAMEWORK DEBUG START ===');
      console.log('Brief data for framework analysis:', {
        briefId,
        suggested_content_frameworks: brief.suggested_content_frameworks,
        framework: brief.framework,
        research_result_id: brief.research_result_id,
        title: brief.title,
        product_name: brief.product_name
      });

      // Priority 1: Use suggested_content_frameworks from brief
      if (brief.suggested_content_frameworks) {
        console.log('✅ Found framework in suggested_content_frameworks:', brief.suggested_content_frameworks);
        setContentFramework(brief.suggested_content_frameworks);
        return;
      } else {
        console.log('❌ No suggested_content_frameworks found');
      }

      // Priority 2: Use framework from brief
      if (brief.framework) {
        console.log('✅ Found framework in brief.framework:', brief.framework);
        setContentFramework(brief.framework);
        return;
      } else {
        console.log('❌ No brief.framework found');
      }

      // Priority 3: Fetch framework from original research result
      if (brief.research_result_id) {
        console.log('🔍 Attempting to fetch framework from research_result_id:', brief.research_result_id);
        try {
          const { data: researchResult, error } = await supabase
            .from('approved_products')
            .select('id, framework, product_data')
            .eq('id', brief.research_result_id)
            .single();

          console.log('📊 Research result query response:', {
            error: error,
            data: researchResult,
            hasData: !!researchResult
          });

          if (!error && researchResult) {
            console.log('✅ Research result found:', {
              id: researchResult.id,
              hasFramework: !!researchResult.framework,
              frameworkValue: researchResult.framework,
              hasProductData: !!researchResult.product_data,
              productDataType: typeof researchResult.product_data
            });

            // Check if there's a framework field directly
            if (researchResult.framework) {
              console.log('✅ Found framework in research result directly:', researchResult.framework);
              setContentFramework(researchResult.framework);
              return;
            } else {
              console.log('❌ No direct framework field in research result');
            }

            // Check if framework is in product_data
            if (researchResult.product_data) {
              try {
                const productData = typeof researchResult.product_data === 'string' 
                  ? JSON.parse(researchResult.product_data) 
                  : researchResult.product_data;
                
                console.log('📦 Product data parsed:', {
                  hasFramework: !!productData.framework,
                  frameworkValue: productData.framework,
                  productDataKeys: Object.keys(productData || {})
                });
                
                if (productData.framework) {
                  console.log('✅ Found framework in product_data:', productData.framework);
                  setContentFramework(productData.framework);
                  return;
                } else {
                  console.log('❌ No framework in product_data');
                }
              } catch (parseError) {
                console.error('❌ Error parsing product_data:', parseError);
              }
            } else {
              console.log('❌ No product_data in research result');
            }
          } else {
            console.log('❌ No research result found or error occurred:', error);
          }
        } catch (error) {
          console.error('❌ Exception fetching framework from research result:', error);
        }
      } else {
        console.log('❌ No research_result_id found in brief');
      }

      // Fallback: empty string
      console.log('❌ No framework found anywhere - using empty string');
      console.log('🔍 === FRAMEWORK DEBUG END ===');
      setContentFramework('');
    };

    fetchContentFramework();
  }, [brief.suggested_content_frameworks, brief.framework, brief.research_result_id, briefId]);

  // Prepare article title
  const articleTitle = 
    Array.isArray(brief.possible_article_titles) && brief.possible_article_titles.length > 0 
      ? brief.possible_article_titles[0] 
      : (typeof brief.possible_article_titles === 'string' 
          ? brief.possible_article_titles.split('\n')[0] 
          : brief.title || '');

  // Prepare internal links
  const internalLinks = 
    typeof brief.internal_links === 'string' 
      ? brief.internal_links 
      : (Array.isArray(brief.internal_links) 
          ? brief.internal_links.join('\n') 
          : (brief.suggested_links?.map(link => link.url).join('\n') || ''));

  // Prepare content brief
  const contentBrief = brief.brief_content || editorContent || '';

  // Debug logging to verify framework is being sent
  useEffect(() => {
    if (contentFramework) {
      console.log('🎯 Content Framework prepared for AirOps:', {
        source: brief.suggested_content_frameworks ? 'suggested_content_frameworks' : 
               brief.framework ? 'brief.framework' : 'research_result',
        framework: contentFramework,
        briefId: briefId
      });
    } else {
      console.warn('⚠️ No content framework found for brief:', briefId);
    }
  }, [contentFramework, briefId]);

  return (
    <div className={className}>
      <ApproveContentBrief
        contentBrief={contentBrief}
        articleTitle={articleTitle}
        internalLinks={internalLinks}
        contentFramework={contentFramework}
        briefId={briefId}
        briefStatus={brief.status}
        onSuccess={onSuccess}
      />
    </div>
  );
};

/**
 * Desktop version - hidden on small screens
 */
export const DesktopApprovalButton = (props: ResponsiveApprovalButtonProps) => (
  <ResponsiveApprovalButton 
    {...props} 
    className={`hidden sm:block ${props.className || ''}`}
  />
);

/**
 * Mobile version - visible only on small screens
 */
export const MobileApprovalButton = (props: ResponsiveApprovalButtonProps) => (
  <ResponsiveApprovalButton 
    {...props} 
    className={`sm:hidden flex justify-center mt-4 mb-8 ${props.className || ''}`}
  />
); 