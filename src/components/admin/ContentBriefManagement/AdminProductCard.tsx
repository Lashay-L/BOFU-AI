import React from 'react';
import { ProductCard } from '../../product/ProductCard';
import { AdminProductCardProps } from './types';
import { ProductAnalysis } from '../../../types/product/types';

export function AdminProductCard({
  product,
  approvedProductId,
  companyGroup,
  isExpanded,
  onUpdateSection,
  onGenerateArticle
}: AdminProductCardProps) {
  // Ensure product data is properly formatted and includes user information for admin context
  const cleanProduct = {
    ...(product || {}),
    // Add user information for admin context
    userEmail: companyGroup.main_account.email,
    userCompanyName: companyGroup.company_name,
    userUUID: companyGroup.main_account.id,
    approvedBy: approvedProductId
  };

  // Log enhanced product for debugging
  console.log('Admin product card with user context:', {
    productName: cleanProduct.productDetails?.name,
    userEmail: cleanProduct.userEmail,
    userCompany: cleanProduct.userCompanyName
  });

  return (
    <ProductCard
      product={cleanProduct}
      isExpanded={isExpanded}
      showExpandButton={false}
      className="bg-transparent"
      context="admin"
      enableEditing={true}
      researchResultId={undefined}
      approvedProductId={approvedProductId}
      userUUID={companyGroup.main_account.id}
      userEmail={companyGroup.main_account.email}
      userCompanyName={companyGroup.company_name}
      onUpdateSection={(productIndex: number, sectionType: keyof ProductAnalysis, newValue: any) => {
        console.log('🎯 Product update in approved products section:', {
          approvedProductId,
          sectionType,
          newValue
        });
        // Handle the update for approved products using the approved product ID
        onUpdateSection(approvedProductId, sectionType, newValue);
      }}
      onGenerateArticle={onGenerateArticle}
    />
  );
}