import { useState } from 'react';
import { supabase } from '../../../../lib/supabase';
import { ResearchResult } from '../types';

export function useResearchData() {
  const [userResearchResults, setUserResearchResults] = useState<ResearchResult[]>([]);
  const [isLoadingResearch, setIsLoadingResearch] = useState(true);

  // Fetch user's research results (contains product data)
  const fetchUserResearchResults = async (userId: string) => {
    try {
      setIsLoadingResearch(true);
      const { data, error } = await supabase
        .from('research_results')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;

      console.log('📊 useResearchData: Raw research results loaded:', data);
      
      const processedResults = data.map(result => ({
        ...result,
        data: result.data || []
      }));

      // Log keywords found in the data
      processedResults.forEach((result, resultIndex) => {
        if (result.data && Array.isArray(result.data)) {
          result.data.forEach((product: any, productIndex: number) => {
            if (product.keywords && product.keywords.length > 0) {
              console.log(`🏷️ useResearchData: Found keywords in result ${resultIndex}, product ${productIndex}:`, product.keywords);
              console.log(`📝 Product name: ${product.productDetails?.name || product.companyName}`);
            }
          });
        }
      });

      setUserResearchResults(processedResults);
    } catch (error) {
      console.error('❌ useResearchData: Error fetching research results:', error);
    } finally {
      setIsLoadingResearch(false);
    }
  };

  // Fetch research results for all users in a company
  const fetchCompanyResearchResults = async (userIds: string[]) => {
    try {
      setIsLoadingResearch(true);
      
      const { data: researchResults, error: researchError } = await supabase
        .from('research_results')
        .select('*')
        .in('user_id', userIds)
        .order('created_at', { ascending: false });

      if (researchError) throw researchError;

      console.log('📋 Company research results loaded:', researchResults?.length || 0);
      
      setUserResearchResults(researchResults || []);
    } catch (error) {
      console.error('❌ Error fetching company research results:', error);
      setUserResearchResults([]);
    } finally {
      setIsLoadingResearch(false);
    }
  };

  // Update research result product data
  const updateResearchProduct = async (
    resultId: string,
    productIndex: number,
    updatedData: any[]
  ) => {
    try {
      console.log('💾 Saving data to database for result:', resultId);
      
      const { error } = await supabase
        .from('research_results')
        .update({ 
          data: updatedData,
          updated_at: new Date().toISOString()
        })
        .eq('id', resultId);

      if (error) {
        console.error('❌ Database update error:', error);
        throw error;
      }

      console.log('✅ Database update successful for result:', resultId);
      
      // Update local state
      setUserResearchResults(prevResults => 
        prevResults.map(result => 
          result.id === resultId 
            ? { ...result, data: updatedData }
            : result
        )
      );
      
      return true;
    } catch (error) {
      console.error('💥 Error updating research product:', error);
      throw error;
    }
  };

  // Data sanitization utility
  const sanitizeProductData = (productData: any): any => {
    console.log('🧹 Sanitizing product data...');
    const sanitized = { ...productData };
    
    const arrayFields = ['keywords', 'features', 'usps', 'painPoints', 'capabilities'];
    
    // Check for corruption pattern
    const corruptedFields = Object.keys(sanitized).filter(key => /^\d+$/.test(key));
    
    if (corruptedFields.length > 0) {
      console.log('🚨 Found corrupted fields:', corruptedFields);
      
      corruptedFields.forEach(numKey => {
        const fieldName = sanitized[numKey];
        if (typeof fieldName === 'string' && arrayFields.includes(fieldName)) {
          console.log(`🔄 Recovering corrupted field: ${fieldName} from key ${numKey}`);
          
          if (sanitized[fieldName] && Array.isArray(sanitized[fieldName])) {
            console.log(`✅ Field ${fieldName} already has correct array data`);
          } else {
            console.log(`⚠️ Field ${fieldName} missing or not an array, initializing empty array`);
            sanitized[fieldName] = [];
          }
          
          delete sanitized[numKey];
        }
      });
    }
    
    // Ensure array fields are properly formatted
    arrayFields.forEach(field => {
      if (sanitized[field] !== undefined && !Array.isArray(sanitized[field])) {
        console.log(`🔧 Converting ${field} to array:`, sanitized[field]);
        if (typeof sanitized[field] === 'string') {
          sanitized[field] = [sanitized[field]];
        } else if (sanitized[field] === null || sanitized[field] === undefined) {
          sanitized[field] = [];
        } else {
          try {
            const values = Object.values(sanitized[field]);
            if (values.every(v => typeof v === 'string')) {
              sanitized[field] = values;
              console.log(`🔄 Converted object to array for ${field}:`, values);
            }
          } catch (error) {
            console.warn(`⚠️ Could not convert ${field} to array, using empty array`);
            sanitized[field] = [];
          }
        }
      }
    });
    
    return sanitized;
  };

  // Bulk repair function
  const repairAllCorruptedData = async (userId: string) => {
    console.log('🔧 Starting bulk data repair for user:', userId);
    
    try {
      const { data: allResults, error: fetchError } = await supabase
        .from('research_results')
        .select('*')
        .eq('user_id', userId);

      if (fetchError) {
        console.error('❌ Error fetching research results for repair:', fetchError);
        return;
      }

      console.log(`🔍 Found ${allResults?.length || 0} research results to check`);

      let repairedCount = 0;
      const arrayFields = ['keywords', 'features', 'usps', 'painPoints', 'capabilities'];

      for (const result of allResults || []) {
        if (!result.data || !Array.isArray(result.data)) continue;

        let needsRepair = false;
        const repairedData = result.data.map((product: any) => {
          const sanitized = sanitizeProductData(product);
          
          if (JSON.stringify(product) !== JSON.stringify(sanitized)) {
            needsRepair = true;
          }
          
          return sanitized;
        });

        if (needsRepair) {
          console.log(`💾 Updating repaired data for result ${result.id}`);
          const { error: updateError } = await supabase
            .from('research_results')
            .update({ 
              data: repairedData,
              updated_at: new Date().toISOString()
            })
            .eq('id', result.id);

          if (updateError) {
            console.error(`❌ Error updating result ${result.id}:`, updateError);
          } else {
            repairedCount++;
            console.log(`✅ Successfully repaired result ${result.id}`);
          }
        }
      }

      console.log(`🎉 Bulk repair completed! ${repairedCount} results repaired.`);
      
      // Refresh the data after repair
      await fetchUserResearchResults(userId);
      
      return repairedCount;
    } catch (error) {
      console.error('💥 Error during bulk data repair:', error);
      throw error;
    }
  };

  return {
    userResearchResults,
    isLoadingResearch,
    fetchUserResearchResults,
    fetchCompanyResearchResults,
    updateResearchProduct,
    sanitizeProductData,
    repairAllCorruptedData
  };
}