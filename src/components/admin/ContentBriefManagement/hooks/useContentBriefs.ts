import { useState, useEffect } from 'react';
import { supabase } from '../../../../lib/supabase';
import { ContentBrief } from '../../../../types/contentBrief';
import { updateBrief } from '../../../../lib/contentBriefs';
import { clearContentBriefData, deleteContentBriefWithCleanup } from '../../../../lib/contentBriefApi';
import { toast } from 'react-hot-toast';

export function useContentBriefs() {
  const [userContentBriefs, setUserContentBriefs] = useState<ContentBrief[]>([]);
  const [isLoadingBriefs, setIsLoadingBriefs] = useState(true);
  const [collapsedContentBriefs, setCollapsedContentBriefs] = useState<Set<string>>(new Set());
  const [autoSaving, setAutoSaving] = useState<{ [key: string]: boolean }>({});

  // Helper function to generate title using keywords
  const generateKeywordTitle = async (brief: ContentBrief) => {
    console.log('🔍 TITLE_DEBUG: Starting title generation for brief:', brief.id);
    
    // First try to get keywords from the content brief's own content
    if (brief.brief_content) {
      try {
        let briefContent = brief.brief_content as any;
        
        // Handle case where brief_content is stored as a JSON string
        if (typeof briefContent === 'string') {
          briefContent = JSON.parse(briefContent);
        }
        
        // Check for keywords array in the parsed content - this is the primary source
        if (briefContent.keywords && Array.isArray(briefContent.keywords) && briefContent.keywords.length > 0) {
          // Extract the first keyword and clean it from backticks and quotes
          const firstKeyword = briefContent.keywords[0].replace(/[`'"]/g, '').trim();
          // Remove any URL patterns that might be in the keyword
          const cleanKeyword = firstKeyword.replace(/^\/|\/$|^https?:\/\//, '').replace(/[-_]/g, ' ');
          console.log('🔍 TITLE_DEBUG: Using first keyword from brief content:', cleanKeyword);
          // Return clean keyword without ID suffix - let users customize titles
          return cleanKeyword;
        }
        
        // Try to get primary keyword from SEO Strategy as fallback
        const seoStrategy = briefContent['4. SEO Strategy'];
        if (seoStrategy && seoStrategy['Primary Keyword']) {
          const primaryKeyword = seoStrategy['Primary Keyword'].replace(/[`'"]/g, '').trim();
          if (primaryKeyword) {
            console.log('🔍 TITLE_DEBUG: Using primary keyword from SEO strategy:', primaryKeyword);
            return primaryKeyword;
          }
        }
      } catch (error) {
        console.warn('Could not extract keywords from brief content:', error);
      }
    }
    
    // Fallback: try to get keywords from approved product data if research_result_id exists
    if (brief.research_result_id) {
      try {
        const { data: approvedProduct, error: productError } = await supabase
          .from('approved_products')
          .select('product_data')
          .eq('id', brief.research_result_id)
          .single();
        
        if (approvedProduct && !productError) {
          const productData = typeof approvedProduct.product_data === 'string' 
            ? JSON.parse(approvedProduct.product_data) 
            : approvedProduct.product_data;
          
          if (productData.keywords && Array.isArray(productData.keywords) && productData.keywords.length > 0) {
            return productData.keywords[0];
          }
        }
      } catch (error) {
        console.error('Error fetching approved product:', error);
      }
    }
    
    // Try to find approved product by product_name match
    if (brief.product_name) {
      try {
        const { data: approvedProducts } = await supabase
          .from('approved_products')
          .select('product_data')
          .ilike('product_name', `%${brief.product_name}%`);
        
        if (approvedProducts && approvedProducts.length > 0) {
          const productData = typeof approvedProducts[0].product_data === 'string' 
            ? JSON.parse(approvedProducts[0].product_data) 
            : approvedProducts[0].product_data;
          
          if (productData.keywords && Array.isArray(productData.keywords) && productData.keywords.length > 0) {
            return productData.keywords[0];
          }
        }
      } catch (error) {
        console.error('Error searching approved products by name:', error);
      }
    }
    
    // Fallback to product_name
    return `${brief.product_name || 'Untitled'} - Content Brief`;
  };

  // Fetch user's content briefs
  const fetchUserContentBriefs = async (userId: string) => {
    try {
      setIsLoadingBriefs(true);
      const { data, error } = await supabase
        .from('content_briefs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching content briefs:', error);
        setUserContentBriefs([]);
        return;
      }

      // Filter out content briefs with empty brief_content (cleared briefs)
      const activeBriefs = (data || []).filter(brief => {
        // Check if brief_content exists and has meaningful content
        if (!brief.brief_content) return false;
        
        // If it's an object, check if it has any keys
        if (typeof brief.brief_content === 'object') {
          return Object.keys(brief.brief_content).length > 0;
        }
        
        // If it's a string, check if it's not empty or just whitespace
        if (typeof brief.brief_content === 'string') {
          return brief.brief_content.trim().length > 0;
        }
        
        return false;
      });

      console.log('Content briefs fetched:', data?.length || 0);
      console.log('Active content briefs (with content):', activeBriefs.length);
      
      // Process each brief to generate keyword-based titles
      const briefsWithKeywordTitles = await Promise.all(
        activeBriefs.map(async (brief) => {
          const title = await generateKeywordTitle(brief);
          return {
            ...brief,
            title
          };
        })
      );
      
      setUserContentBriefs(briefsWithKeywordTitles);
    } catch (error) {
      console.error('Error in fetchUserContentBriefs:', error);
      setUserContentBriefs([]);
    } finally {
      setIsLoadingBriefs(false);
    }
  };

  // Fetch content briefs for all users in a company
  const fetchCompanyContentBriefs = async (userIds: string[]) => {
    try {
      setIsLoadingBriefs(true);
      
      console.log('🔍 [CONTENT_BRIEF_DEBUG] Fetching content briefs for userIds:', userIds);
      
      const { data: contentBriefs, error: briefsError } = await supabase
        .from('content_briefs')
        .select('*')
        .in('user_id', userIds)
        .order('created_at', { ascending: false });

      if (briefsError) {
        console.error('🔍 [CONTENT_BRIEF_DEBUG] Query error:', briefsError);
        throw briefsError;
      }

      // Filter out content briefs with empty brief_content (cleared briefs)
      const activeBriefs = (contentBriefs || []).filter(brief => {
        // Check if brief_content exists and has meaningful content
        if (!brief.brief_content) return false;
        
        // If it's an object, check if it has any keys
        if (typeof brief.brief_content === 'object') {
          return Object.keys(brief.brief_content).length > 0;
        }
        
        // If it's a string, check if it's not empty or just whitespace
        if (typeof brief.brief_content === 'string') {
          return brief.brief_content.trim().length > 0;
        }
        
        return false;
      });

      console.log('📋 Total content briefs loaded:', contentBriefs?.length || 0);
      console.log('📋 Active content briefs (with content):', activeBriefs.length);
      console.log('🔍 [CONTENT_BRIEF_DEBUG] Content briefs data:', contentBriefs);
      
      // Process content briefs to generate keyword-based titles and fetch source product data
      const briefsWithEnhancedData = await Promise.all(
        activeBriefs.map(async (brief) => {
          const title = await generateKeywordTitle(brief);
          
          // Fetch source product data using dual-ID system
          let sourceProductData = null;
          
          // Prioritize source_product_id for dual-ID system
          if (brief.source_product_id) {
            try {
              console.log('Fetching source product data for brief:', brief.id, 'using source_product_id:', brief.source_product_id);
              const { data: approvedProduct, error: productError } = await supabase
                .from('approved_products')
                .select('product_data')
                .eq('id', brief.source_product_id)
                .single();

              if (!productError && approvedProduct?.product_data) {
                sourceProductData = typeof approvedProduct.product_data === 'string' 
                  ? JSON.parse(approvedProduct.product_data) 
                  : approvedProduct.product_data;
                console.log('✅ Source product data loaded for brief:', brief.id);
              }
            } catch (productError) {
              console.warn('Could not fetch source product data using source_product_id:', productError);
            }
          }
          
          // Fallback to research_result_id if source_product_id didn't work
          if (!sourceProductData && brief.research_result_id) {
            try {
              console.log('Fallback: fetching source product data using research_result_id:', brief.research_result_id);
              const { data: approvedProduct, error: productError } = await supabase
                .from('approved_products')
                .select('product_data')
                .or(`id.eq.${brief.research_result_id},research_result_id.eq.${brief.research_result_id}`)
                .single();

              if (!productError && approvedProduct?.product_data) {
                sourceProductData = typeof approvedProduct.product_data === 'string' 
                  ? JSON.parse(approvedProduct.product_data) 
                  : approvedProduct.product_data;
                console.log('✅ Source product data loaded via fallback for brief:', brief.id);
              }
            } catch (productError) {
              console.warn('Could not fetch source product data using research_result_id fallback:', productError);
            }
          }
          
          return {
            ...brief,
            title,
            sourceProductData
          };
        })
      );
      
      setUserContentBriefs(briefsWithEnhancedData);
    } catch (error) {
      console.error('❌ Error fetching company content briefs:', error);
      setUserContentBriefs([]);
    } finally {
      setIsLoadingBriefs(false);
    }
  };

  // Handle content brief updates
  const handleContentBriefUpdate = async (briefId: string, updatedContent: string | object) => {
    try {
      const { error } = await supabase
        .from('content_briefs')
        .update({ 
          brief_content: updatedContent,
          updated_at: new Date().toISOString()
        })
        .eq('id', briefId);

      if (error) {
        toast.error('Failed to update content brief');
        return;
      }

      toast.success('Content brief updated successfully');
      
      // Update local state
      setUserContentBriefs(prev => 
        prev.map(b => b.id === briefId 
          ? { ...b, brief_content: updatedContent, updated_at: new Date().toISOString() }
          : b
        )
      );
    } catch (error) {
      console.error('Error updating content brief:', error);
      toast.error('Failed to update content brief');
    }
  };

  // Auto-save content brief
  const handleAutoSave = async (
    briefId: string, 
    content: string, 
    links: string[], 
    titles: string[]
  ) => {
    try {
      console.log('Admin dashboard: Auto-saving content brief changes');
      
      setAutoSaving(prev => ({ ...prev, [briefId]: true }));
      
      await updateBrief(briefId, {
        brief_content: content,
        internal_links: links,
        possible_article_titles: titles
      });
      
      console.log('✅ Admin dashboard: Content brief auto-saved successfully');
      
      // Update local state
      const updatedBrief = userContentBriefs.find(b => b.id === briefId);
      if (updatedBrief) {
        const updated = {
          ...updatedBrief,
          brief_content: content,
          internal_links: links,
          possible_article_titles: titles
        };
        
        setUserContentBriefs(prev => 
          prev.map(b => b.id === briefId ? updated : b)
        );
      }
    } catch (error) {
      console.error('Auto-save error:', error);
      toast.error('Failed to auto-save changes');
    } finally {
      setAutoSaving(prev => ({ ...prev, [briefId]: false }));
    }
  };

  // ADMIN: Fully delete content brief with cleanup (including generated articles)
  const handleDeleteBrief = async (briefId: string, briefTitle?: string) => {
    const confirmation = window.confirm(
      `⚠️ ADMIN DELETE: Are you sure you want to PERMANENTLY DELETE the entire content brief${briefTitle ? ` "${briefTitle}"` : ''}? This will remove everything including the content brief, generated article, comments, version history, and all associated data. This action cannot be undone.`
    );
    
    if (!confirmation) return false;

    try {
      const result = await deleteContentBriefWithCleanup(briefId);
      
      if (!result.success) {
        toast.error(result.error || 'Failed to delete content brief');
        return false;
      }

      // Show success message with deletion details
      const deletedImages = result.deletedImages?.length || 0;
      if (deletedImages > 0) {
        toast.success(`Content brief permanently deleted. Cleaned up ${deletedImages} images and all associated data.`);
      } else {
        toast.success('Content brief permanently deleted with all associated data.');
      }
      
      // Remove the deleted brief from local state
      setUserContentBriefs(prev => 
        prev.filter(b => b.id !== briefId)
      );
      
      return true;
    } catch (error) {
      console.error('Error deleting content brief:', error);
      toast.error('Failed to delete content brief');
      return false;
    }
  };

  // Toggle collapse state
  const toggleCollapseBrief = (briefId: string) => {
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

  // Set all content briefs to collapsed by default when they load
  useEffect(() => {
    if (userContentBriefs.length > 0) {
      const allBriefIds = new Set(userContentBriefs.map(brief => brief.id));
      setCollapsedContentBriefs(allBriefIds);
    }
  }, [userContentBriefs]);

  return {
    userContentBriefs,
    isLoadingBriefs,
    collapsedContentBriefs,
    autoSaving,
    fetchUserContentBriefs,
    fetchCompanyContentBriefs,
    handleContentBriefUpdate,
    handleAutoSave,
    handleDeleteBrief,
    toggleCollapseBrief
  };
}