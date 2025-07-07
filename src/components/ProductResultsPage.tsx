import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { 
  saveResearchResults, 
  updateResearchResults, 
  saveApprovedProduct 
} from '../lib/research';
import { ProductCard } from './product/ProductCard';
import { ProductAnalysis } from '../types/product';
import { Plus, Loader2, Home, Save, ArrowLeft, MessageSquare } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { MainHeader } from './MainHeader';
import ChatWindow from './ChatWindow';

export interface ProductResultsPageProps {
  products: ProductAnalysis[];
  onStartNew: () => void;
  existingId?: string;
  showHistory?: boolean;
  setShowHistory?: (show: boolean) => void;
  forceHistoryView?: () => void;
  onHistorySave?: () => Promise<void>;
  onSaveComplete?: (newId: string) => void;
}

// Debounce utility for session storage
const useDebounce = (value: any, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  
  return debouncedValue;
};

function ProductResultsPage({ 
  products, 
  onStartNew, 
  existingId,
  showHistory,
  setShowHistory,
  forceHistoryView,
  onHistorySave,
  onSaveComplete
}: ProductResultsPageProps) {
  const [editedProducts, setEditedProducts] = useState<ProductAnalysis[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [actionLoadingIndex, setActionLoadingIndex] = useState<number | null>(null);
  const [user, setUser] = useState<any>(null);
  const [hasSavedToHistory, setHasSavedToHistory] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const navigate = useNavigate();
  const params = useParams();
  
  // Get the current product ID from the URL params
  const currentProductId = params.id === 'new' ? undefined : params.id;
  
  // Use refs to avoid unnecessary re-renders
  const initialSaveRef = useRef({
    inProgress: false,
    completed: false,
    attemptCount: 0,
    savedId: null as string | null,
    productsHash: ""
  });

  // Memoize the effective ID to prevent unnecessary recalculations
  const effectiveId = useMemo(() => existingId || currentProductId, [existingId, currentProductId]);

  // Debounce edited products for session storage
  const debouncedEditedProducts = useDebounce(editedProducts, 500);

  // Memoize products hash function
  const getProductsHash = useCallback((prods: ProductAnalysis[]) => {
    if (!prods || prods.length === 0) return "";
    return `${prods[0]?.companyName || "unknown"}-${prods.length}`;
  }, []);

  // Memoize user fetch to prevent unnecessary API calls
  const getCurrentUser = useCallback(async () => {
    try {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
    } catch (error) {
      console.error('Error fetching user:', error);
    }
  }, []);

  // Initialize user once
  useEffect(() => {
    getCurrentUser();
  }, [getCurrentUser]);

  // Initialize component state - consolidated into single effect
  useEffect(() => {
    // Set initial save state
    if (effectiveId) {
      initialSaveRef.current = {
        inProgress: false,
        completed: true,
        attemptCount: 0,
        savedId: effectiveId,
        productsHash: getProductsHash(products)
      };
      setHasSavedToHistory(true);
    }

    // Initialize products
    if (Array.isArray(products) && products.length > 0) {
      setEditedProducts(products);
      setHasUnsavedChanges(!effectiveId);
    } else {
      // Try to restore from session storage
      const savedProducts = sessionStorage.getItem('bofu_edited_products');
      if (savedProducts) {
        try {
          const parsedProducts = JSON.parse(savedProducts);
          if (Array.isArray(parsedProducts) && parsedProducts.length > 0) {
            setEditedProducts(parsedProducts);
          }
        } catch (error) {
          console.error('Error parsing saved products:', error);
        }
      }
    }
  }, [products, effectiveId, getProductsHash]);

  // Debounced session storage sync
  useEffect(() => {
    if (debouncedEditedProducts.length > 0) {
      sessionStorage.setItem('bofu_edited_products', JSON.stringify(debouncedEditedProducts));
      
      // Notify parent component of changes
      if (debouncedEditedProducts !== products) {
        window.dispatchEvent(new CustomEvent('productsUpdated', { 
          detail: { products: debouncedEditedProducts } 
        }));
      }
    }
  }, [debouncedEditedProducts, products]);

  // Cleanup on unmount
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (editedProducts.length > 0) {
        sessionStorage.setItem('bofu_edited_products', JSON.stringify(editedProducts));
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      initialSaveRef.current = {
        inProgress: false,
        completed: false,
        attemptCount: 0,
        savedId: null,
        productsHash: ""
      };
    };
  }, [editedProducts]);

  // Memoized handlers to prevent unnecessary re-renders
  const handleSaveAllToHistory = useCallback(async () => {
    if (isSaving) return;
    
    setIsSaving(true);
    
    try {
      // Create title from the first product
      const title = editedProducts.length === 1 
        ? `${editedProducts[0]?.companyName || 'Unknown'} - ${editedProducts[0]?.productDetails?.name || 'Product'}`
        : `${editedProducts[0]?.companyName || 'Unknown'} - ${editedProducts.length} Products`;
      
      if (effectiveId) {
        // Update existing history entry
        await updateResearchResults(effectiveId, editedProducts, title, false);
        toast.success('Analysis updated in history');
      } else {
        // Create new history entry
        const newId = await saveResearchResults(editedProducts, title, false);
        
        // Update URL to reflect the saved ID
        navigate(`/product/${newId}`, { replace: true });
        
        // Update the app state with the new ID
        if (onSaveComplete) {
          onSaveComplete(newId);
        }
        
        setHasSavedToHistory(true);
        toast.success('Analysis saved to history');
      }
      
      // Refresh the history list
      if (onHistorySave) {
        await onHistorySave();
      }
      
      // Reset the unsaved changes flag
      setHasUnsavedChanges(false);
      
    } catch (error: any) {
      console.error('Error saving to history:', error);
      toast.error(`Failed to save: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  }, [editedProducts, effectiveId, navigate, onSaveComplete, onHistorySave, isSaving]);

  const handleProductSave = useCallback(async (product: ProductAnalysis, index: number): Promise<void> => {
    if (actionLoadingIndex !== null || isSaving) {
      return;
    }
    
    setActionLoadingIndex(index);
    
    try {
      const productDeepCopy = JSON.parse(JSON.stringify(product));
      const currentProducts = [...editedProducts];
      currentProducts[index] = productDeepCopy;
      
      if (effectiveId) {
        await updateResearchResults(
          effectiveId,
          currentProducts,
          `${product.companyName || 'Unknown'} - ${product.productDetails?.name || 'Product'}`,
          false
        );
        
        toast.success(`Updated "${product.productDetails?.name || 'Product'}" analysis`);
        
        if (onHistorySave) {
          await onHistorySave();
        }
        
        setHasUnsavedChanges(false);
      } else {
        toast.success(`Changes saved locally. Click "Save to History" to permanently save.`);
        setHasUnsavedChanges(true);
      }
      
      setEditedProducts(currentProducts);
      
    } catch (error: any) {
      console.error('Error saving product:', error);
      toast.error(`Failed to save: ${error.message}`);
    } finally {
      setActionLoadingIndex(null);
    }
  }, [editedProducts, effectiveId, onHistorySave, actionLoadingIndex, isSaving]);

  const handleUpdateSection = useCallback(async (productIndex: number, section: keyof ProductAnalysis, value: any): Promise<void> => {
    const productToUpdate = editedProducts[productIndex];
    const updatedProductData = {
      ...productToUpdate,
      [section]: value
    };

    // Optimistically update local state
    setEditedProducts(prevProducts => {
      const newProducts = [...prevProducts];
      newProducts[productIndex] = updatedProductData;
      return newProducts;
    });

    if (effectiveId) {
      setHasUnsavedChanges(false);
      setIsSaving(true); 
      setActionLoadingIndex(productIndex);
      
      try {
        const { data: currentResearchResult, error: fetchError } = await supabase
          .from('research_results')
          .select('data')
          .eq('id', effectiveId)
          .single();

        if (fetchError) {
          toast.error(`Failed to fetch history: ${fetchError.message}`);
          setHasUnsavedChanges(true);
          return;
        }

        if (!currentResearchResult || !Array.isArray(currentResearchResult.data)) {
          toast.error('Invalid historical data format found.');
          setHasUnsavedChanges(true);
          return;
        }
        
        const historicalProducts: ProductAnalysis[] = [...currentResearchResult.data];

        if (productIndex < 0 || productIndex >= historicalProducts.length) {
          toast.error('Product index out of bounds for historical data.');
          setHasUnsavedChanges(true);
          return;
        }
        
        historicalProducts[productIndex] = {
          ...historicalProducts[productIndex],
          [section]: value
        };

        const { error: updateError } = await supabase
          .from('research_results')
          .update({ data: historicalProducts, updated_at: new Date().toISOString() })
          .eq('id', effectiveId);

        if (updateError) {
          toast.error(`Failed to save section: ${updateError.message}`);
          setHasUnsavedChanges(true);
        } else {
          toast.success(`${String(section)} saved to history!`);
          if (onHistorySave) {
            await onHistorySave();
          }
        }
      } catch (error: any) {
        console.error('Error saving section update to history:', error);
        toast.error(`Save error: ${error.message || 'Unexpected error'}`);
        setHasUnsavedChanges(true);
      } finally {
        setIsSaving(false);
        setActionLoadingIndex(null);
      }
    } else {
      setHasUnsavedChanges(true);
    }
  }, [editedProducts, effectiveId, onHistorySave]);

  const handleUpdateProduct = useCallback((updatedProductData: ProductAnalysis): void => {
    setEditedProducts(prevProducts =>
      prevProducts.map(p =>
        p.research_result_id === updatedProductData.research_result_id ? updatedProductData : p
      )
    );
    setHasUnsavedChanges(true);
  }, []);

  const handleProductApprove = useCallback(async (product: ProductAnalysis, index: number): Promise<void> => {
    if (!user) {
      toast.error('You must be logged in to approve products');
      return;
    }
    
    if (actionLoadingIndex !== null) {
      return;
    }
    
    setActionLoadingIndex(index);
    
    try {
      if (!effectiveId && !hasSavedToHistory) {
        toast.error('You must save to history first before approving products');
        return;
      }
      
      const researchId = effectiveId as string;
      
      await saveApprovedProduct(
        researchId,
        product,
        index,
        user.id
      );
      
      toast.success(`Added "${product.productDetails?.name || 'Product'}" to review queue`);
      
      const updatedProducts = [...editedProducts];
      updatedProducts[index] = {
        ...updatedProducts[index],
        isApproved: true,
        approvedBy: user.id
      };
      
      setEditedProducts(updatedProducts);
      
      if (effectiveId) {
        await updateResearchResults(
          effectiveId,
          updatedProducts,
          `${product.companyName || 'Unknown'} - ${product.productDetails?.name || 'Product'}`,
          false
        );
      }
      
    } catch (error: any) {
      console.error('Error approving product:', error);
      toast.error(`Failed to approve: ${error.message}`);
    } finally {
      setActionLoadingIndex(null);
    }
  }, [user, actionLoadingIndex, effectiveId, hasSavedToHistory, editedProducts]);

  // Memoized computed values
  const displayTitle = useMemo(() => {
    return editedProducts && editedProducts.length > 0 && editedProducts[0]?.companyName 
      ? `${editedProducts[0].companyName}` 
      : 'Product Analysis';
  }, [editedProducts]);

  const displaySubtitle = useMemo(() => {
    return editedProducts 
      ? `${editedProducts.length} product${editedProducts.length === 1 ? '' : 's'} analyzed` 
      : 'No products analyzed';
  }, [editedProducts]);

  const showSaveButton = useMemo(() => {
    return editedProducts && editedProducts.length > 0;
  }, [editedProducts]);

  const saveButtonDisabled = useMemo(() => {
    return isSaving || (!hasUnsavedChanges && hasSavedToHistory);
  }, [isSaving, hasUnsavedChanges, hasSavedToHistory]);

  // Memoized ProductCard components to prevent unnecessary re-renders
  const productCards = useMemo(() => {
    if (!editedProducts || editedProducts.length === 0) return null;
    
    return editedProducts.map((product, index) => (
      <motion.div
        key={`${product.companyName}-${index}`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.1 }}
      >
        <ProductCard 
          product={product}
          index={index}
          onSave={handleProductSave}
          onApprove={handleProductApprove}
          onUpdateSection={handleUpdateSection}
          updateProduct={handleUpdateProduct}
          isActionLoading={actionLoadingIndex === index}
          isMultipleProducts={editedProducts.length > 0}
          isAdmin={false}
          researchResultId={existingId}
          approvedProductId={existingId}
        />
      </motion.div>
    ));
  }, [editedProducts, handleProductSave, handleProductApprove, handleUpdateSection, handleUpdateProduct, actionLoadingIndex, existingId]);

  return (
    <div 
      className="min-h-screen bg-gradient-to-br from-gray-900 to-secondary-900 text-white"
      style={{ background: 'linear-gradient(to bottom right, #111827, #1f2937)' }}
    >
      <MainHeader 
        user={user} 
        showHistory={showHistory} 
        setShowHistory={setShowHistory} 
      /> 
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-0"
          >
            <h2 
              className="text-3xl font-bold text-white cursor-pointer flex items-center gap-2 hover:opacity-90 transition-opacity"
              onClick={onStartNew} 
            >
              <Home size={20} className="text-primary-400"/>
              {displayTitle}
            </h2>
            <p className="text-sm text-gray-400">
              {displaySubtitle}
            </p>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex items-center gap-3"
          >
            {showHistory && setShowHistory && (
              <button
                onClick={() => setShowHistory(false)} 
                className="px-4 py-2 rounded-lg transition-all flex items-center gap-2
                           text-gray-300 hover:text-primary-300 hover:bg-secondary-800/70"
              >
                <ArrowLeft size={18} />
                Back to Analysis
              </button>
            )}
            
            {!showHistory && (
              <button 
                onClick={onStartNew} 
                className="px-4 py-2 rounded-lg transition-all flex items-center gap-2
                           text-gray-300 hover:text-primary-300 hover:bg-secondary-800/70"
              >
                <Plus size={18} className="text-primary-400"/>
                New Analysis
              </button>
            )}
            
            {showSaveButton && (
              <button 
                onClick={handleSaveAllToHistory} 
                disabled={saveButtonDisabled}
                className={`px-4 py-2.5 rounded-lg hover:bg-primary-400 transition-all 
                            shadow-glow hover:shadow-glow-strong flex items-center gap-2 font-medium 
                            ${saveButtonDisabled ? 'bg-gray-600 text-gray-400 cursor-not-allowed' : 'bg-primary-500 text-secondary-900'}`}
              >
                {isSaving ? (
                  <Loader2 size={18} className="animate-spin"/>
                ) : (
                  <Save size={18} />
                )}
                {isSaving ? 'Saving...' : (effectiveId ? 'Update in History' : 'Save to History')}
              </button>
            )}
          </motion.div>
        </div>

        <div className="mt-0 pb-12">
          {/* Warning for unsaved changes */}
          {hasUnsavedChanges && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4 rounded shadow-sm dark:bg-yellow-900/20 dark:border-yellow-600">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-700 dark:text-yellow-200">
                    You have unsaved changes. Click <strong>"{effectiveId ? 'Update in History' : 'Save to History'}"</strong> to permanently save your analysis.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Help text for new users */}
          {!hasSavedToHistory && (
            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4 rounded shadow-sm dark:bg-blue-900/20 dark:border-blue-600">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-blue-700 dark:text-blue-200">
                    This analysis has not been saved yet. Edit individual products if needed, then click <strong>"Save to History"</strong> to save this analysis to your history.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Products grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {productCards || (
              <div className="col-span-1 lg:col-span-2 p-8 text-center">
                <div className="mb-4">
                  <svg className="w-12 h-12 mx-auto text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m0 16v1m-8-8h1m16 0h1M5.6 5.6l.8.8m12 12l-.8-.8m-12 0l.8-.8m12-12l-.8.8" />
                  </svg>
                </div>
                <h3 className="text-xl font-medium text-primary-400 mb-2">No Analysis Results Found</h3>
                <p className="text-gray-400 mb-4">We couldn't find any product analysis results to display.</p>
                <button 
                  onClick={onStartNew} 
                  className="px-4 py-2 bg-primary-500 text-secondary-900 rounded-lg font-medium hover:bg-primary-400 transition-colors"
                >
                  Start New Analysis
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating Chat Button */}
      <button
        onClick={() => setIsChatOpen(!isChatOpen)}
        className="fixed bottom-6 right-6 bg-primary-500 hover:bg-primary-600 text-white p-4 rounded-full shadow-lg z-50 transition-transform duration-300 ease-in-out transform hover:scale-110"
        aria-label={isChatOpen ? 'Close Chat' : 'Open Chat'}
      >
        <MessageSquare size={24} />
      </button>

      {/* Chat Window */}
      {isChatOpen && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          transition={{ duration: 0.3 }}
          className="fixed bottom-20 right-6 z-40 w-full max-w-md h-3/4 max-h-[700px] bg-secondary-800 rounded-lg shadow-xl border border-secondary-700 flex flex-col"
        >
          <ChatWindow isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
        </motion.div>
      )}
    </div>
  );
}

export default ProductResultsPage;