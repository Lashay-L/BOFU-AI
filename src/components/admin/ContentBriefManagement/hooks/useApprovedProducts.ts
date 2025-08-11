import { useState, useEffect } from 'react';
import { supabase } from '../../../../lib/supabase';
import { getApprovedProducts, updateApprovedProduct } from '../../../../lib/research';
import { toast } from 'react-hot-toast';

export function useApprovedProducts() {
  const [approvedProducts, setApprovedProducts] = useState<any[]>([]);
  const [isLoadingApproved, setIsLoadingApproved] = useState(true);

  // Fetch approved products
  const fetchApprovedProductsData = async () => {
    try {
      setIsLoadingApproved(true);
      console.log('🔍 Fetching approved products...');
      const products = await getApprovedProducts();
      console.log('✅ Approved products fetched:', products.length);
      setApprovedProducts(products);
    } catch (error) {
      console.error('❌ Error fetching approved products:', error);
      toast.error('Failed to load approved products');
    } finally {
      setIsLoadingApproved(false);
    }
  };

  // Handle approved product updates
  const handleUpdateApprovedProduct = async (approvedProductId: string, sectionType: string, newValue: any) => {
    try {
      console.log('🚀 handleUpdateApprovedProduct called:', { approvedProductId, sectionType, newValue });
      
      // Find the approved product to update
      const approvedProduct = approvedProducts.find(p => p.id === approvedProductId);
      if (!approvedProduct) {
        console.error('❌ Approved product not found:', approvedProductId);
        return;
      }

      // Update the product data
      const updatedProductData = {
        ...approvedProduct.product_data,
        [sectionType]: newValue
      };

      console.log('📝 Updating approved product data:', {
        productName: updatedProductData?.productDetails?.name || updatedProductData?.companyName,
        sectionType,
        newValue
      });

      // Update local state first (prevents race condition)
      setApprovedProducts(prevProducts => 
        prevProducts.map(product => 
          product.id === approvedProductId 
            ? { ...product, product_data: updatedProductData }
            : product
        )
      );
      console.log('✅ Local approved products state updated immediately');

      // Update the database
      await updateApprovedProduct(approvedProductId, updatedProductData);
      console.log('✅ Database update successful for approved product:', approvedProductId);
      
    } catch (error) {
      console.error('💥 Error updating approved product:', error);
      // Revert local state on error
      await fetchApprovedProductsData();
      throw error;
    }
  };

  // Delete approved product
  const handleDeleteApprovedProduct = async (approvedProductId: string, productName?: string) => {
    const confirmation = window.confirm(
      `Are you sure you want to delete this approved product${productName ? ` "${productName}"` : ''}? This will only remove it from the admin dashboard and will not affect the original product data. This action cannot be undone.`
    );
    
    if (!confirmation) return false;

    try {
      // Use Edge Function for secure admin operations
      const { data: deleteResponse, error } = await supabase.functions.invoke('admin-data-access', {
        body: { 
          action: 'delete_approved_product',
          productId: approvedProductId
        }
      });

      if (error) {
        throw error;
      }

      if (!deleteResponse.success) {
        throw new Error(deleteResponse.error || 'Failed to delete product');
      }

      toast.success('Approved product deleted successfully');
      
      // Update local state
      setApprovedProducts(prev => prev.filter(p => p.id !== approvedProductId));
      
      return true;
    } catch (error) {
      console.error('Error deleting approved product:', error);
      toast.error('Failed to delete approved product');
      return false;
    }
  };

  useEffect(() => {
    console.log('🔍 useApprovedProducts: Hook mounted, fetching data...');
    fetchApprovedProductsData();
  }, []);

  return {
    approvedProducts,
    isLoadingApproved,
    fetchApprovedProductsData,
    handleUpdateApprovedProduct,
    handleDeleteApprovedProduct
  };
}