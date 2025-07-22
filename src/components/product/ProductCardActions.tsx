import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAdaptiveStyles, useProductCardTheme } from '../../contexts/ProductCardThemeContext';
import { ProductAnalysis } from '../../types/product/types';
import { 
  Save, 
  CheckSquare, 
  Download, 
  Share2, 
  Copy, 
  FileText, 
  ExternalLink, 
  MoreHorizontal,
  Star,
  Edit,
  Trash2,
  Archive,
  Send
} from 'lucide-react';
import { sendProductCardToMoonlit } from '../../lib/moonlit';
import { toast } from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
// Database trigger will handle notifications automatically when content briefs are created

interface ProductCardActionsProps {
  product: ProductAnalysis;
  context?: 'history' | 'product' | 'admin';
  researchResultId?: string; // Add research result ID for Moonlit integration
  approvedProductId?: string; // Add approved product ID as fallback for tracking
  // User information for Moonlit integration
  userUUID?: string;
  userEmail?: string;
  userCompanyName?: string;
  onSave?: (product: ProductAnalysis) => Promise<void>;
  onApprove?: (product: ProductAnalysis) => Promise<void>;
  onExport?: (product: ProductAnalysis, format: 'pdf' | 'json' | 'csv') => Promise<void>;
  onEdit?: (product: ProductAnalysis) => void;
  onDelete?: (product: ProductAnalysis) => void;
  onShare?: (product: ProductAnalysis) => void;
  isLoading?: boolean;
  disabled?: boolean;
}

// Enhanced action button with sophisticated animations
const ActionButton = ({ 
  icon, 
  label, 
  variant = 'secondary',
  size = 'md',
  isLoading = false,
  disabled = false,
  onClick,
  styles,
  isReducedMotion,
  className = ''
}: {
  icon: React.ReactNode;
  label: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  styles: any;
  isReducedMotion: boolean;
  className?: string;
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const variants = {
    primary: 'bg-primary-500 hover:bg-primary-600 text-white shadow-lg shadow-primary-500/25',
    secondary: `${styles.interactive.buttonSecondary} shadow-md`,
    danger: 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/25',
    success: 'bg-green-500 hover:bg-green-600 text-white shadow-lg shadow-green-500/25',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled || isLoading}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      whileHover={!isReducedMotion && !disabled ? { scale: 1.05, y: -2 } : undefined}
      whileTap={!isReducedMotion && !disabled ? { scale: 0.95 } : undefined}
      className={`
        ${variants[variant]}
        ${sizes[size]}
        font-medium rounded-lg
        transition-all duration-200
        flex items-center space-x-2
        disabled:opacity-50 disabled:cursor-not-allowed
        focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-1
        relative overflow-hidden
        ${className}
      `}
    >
      {/* Loading spinner overlay */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-current/20 flex items-center justify-center"
          >
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Icon with hover animation */}
      <motion.div
        animate={{ 
          rotate: isHovered && !isReducedMotion ? [0, -10, 10, 0] : 0,
          scale: isLoading ? 0 : 1
        }}
        transition={{ duration: 0.3 }}
        className="flex-shrink-0"
      >
        {icon}
      </motion.div>

      {/* Label */}
      <motion.span
        animate={{ opacity: isLoading ? 0 : 1 }}
        transition={{ duration: 0.2 }}
        className="hidden sm:inline"
      >
        {label}
      </motion.span>
    </motion.button>
  );
};

// Export dropdown menu
const ExportDropdown = ({ 
  onExport, 
  styles, 
  isReducedMotion 
}: {
  onExport: (format: 'pdf' | 'json' | 'csv') => void;
  styles: any;
  isReducedMotion: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const exportOptions = [
    { format: 'pdf' as const, label: 'Export as PDF', icon: '📄' },
    { format: 'json' as const, label: 'Export as JSON', icon: '📊' },
    { format: 'csv' as const, label: 'Export as CSV', icon: '📈' },
  ];

  return (
    <div className="relative">
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileHover={!isReducedMotion ? { scale: 1.05 } : undefined}
        className={`
          ${styles.interactive.buttonSecondary}
          px-4 py-2 text-sm font-medium rounded-lg
          flex items-center space-x-2
          transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-1
        `}
      >
        <Download className="w-4 h-4" />
        <span className="hidden sm:inline">Export</span>
        <motion.svg 
          className="w-3 h-3" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </motion.svg>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />
            
            {/* Dropdown menu */}
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className={`
                absolute right-0 top-full mt-2 z-20
                ${styles.card.background} ${styles.card.border}
                rounded-lg shadow-xl backdrop-blur-md
                min-w-[160px] overflow-hidden
              `}
            >
              {exportOptions.map((option, index) => (
                <motion.button
                  key={option.format}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => {
                    onExport(option.format);
                    setIsOpen(false);
                  }}
                  className={`
                    w-full text-left px-4 py-3 text-sm
                    ${styles.text.primary}
                    hover:bg-primary-500/10 transition-colors duration-150
                    flex items-center space-x-3
                  `}
                >
                  <span className="text-base">{option.icon}</span>
                  <span>{option.label}</span>
                </motion.button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

// More actions dropdown
const MoreActionsDropdown = ({ 
  onEdit, 
  onDelete, 
  onShare,
  context,
  styles, 
  isReducedMotion 
}: {
  onEdit?: () => void;
  onDelete?: () => void;
  onShare?: () => void;
  context: string;
  styles: any;
  isReducedMotion: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const actions = [
    ...(onEdit ? [{ 
      action: onEdit, 
      label: 'Edit Product', 
      icon: <Edit className="w-4 h-4" />, 
      variant: 'default' as const 
    }] : []),
    ...(onShare ? [{ 
      action: onShare, 
      label: 'Share', 
      icon: <Share2 className="w-4 h-4" />, 
      variant: 'default' as const 
    }] : []),
    { 
      action: () => navigator.clipboard.writeText(window.location.href), 
      label: 'Copy Link', 
      icon: <Copy className="w-4 h-4" />, 
      variant: 'default' as const 
    },
    { 
      action: () => {}, 
      label: 'Add to Favorites', 
      icon: <Star className="w-4 h-4" />, 
      variant: 'default' as const 
    },
    ...(context === 'admin' && onDelete ? [{ 
      action: onDelete, 
      label: 'Delete', 
      icon: <Trash2 className="w-4 h-4" />, 
      variant: 'danger' as const 
    }] : []),
  ];

  if (actions.length === 0) return null;

  return (
    <div className="relative">
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileHover={!isReducedMotion ? { scale: 1.05 } : undefined}
        className={`
          ${styles.interactive.buttonSecondary}
          w-9 h-9 rounded-lg
          flex items-center justify-center
          transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-1
        `}
      >
        <MoreHorizontal className="w-4 h-4" />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />
            
            {/* Dropdown menu */}
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className={`
                absolute right-0 top-full mt-2 z-20
                ${styles.card.background} ${styles.card.border}
                rounded-lg shadow-xl backdrop-blur-md
                min-w-[180px] overflow-hidden
              `}
            >
              {actions.map((action, index) => (
                <motion.button
                  key={action.label}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => {
                    action.action();
                    setIsOpen(false);
                  }}
                  className={`
                    w-full text-left px-4 py-3 text-sm
                    ${action.variant === 'danger' ? styles.text.danger || 'text-red-400' : styles.text.primary}
                    hover:bg-primary-500/10 transition-colors duration-150
                    flex items-center space-x-3
                  `}
                >
                  {action.icon}
                  <span>{action.label}</span>
                </motion.button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export function ProductCardActions({
  product,
  context = 'product',
  researchResultId,
  approvedProductId,
  userUUID,
  userEmail,
  userCompanyName,
  onSave,
  onApprove,
  onExport,
  onEdit,
  onDelete,
  onShare,
  isLoading = false,
  disabled = false,
}: ProductCardActionsProps) {
  const { theme, isReducedMotion } = useProductCardTheme();
  const styles = useAdaptiveStyles();
  
  const [actionStates, setActionStates] = useState<Record<string, boolean>>({});
  // Removed showContentNotification and trackingId - not needed for "Send to Moonlit" action

  const handleAction = async (actionName: string, actionFn?: () => Promise<void> | void) => {
    if (!actionFn || disabled) return;

    setActionStates(prev => ({ ...prev, [actionName]: true }));
    
    try {
      await actionFn();
    } catch (error) {
      console.error(`Error in ${actionName}:`, error);
    } finally {
      setActionStates(prev => ({ ...prev, [actionName]: false }));
    }
  };

  const handleExport = async (format: 'pdf' | 'json' | 'csv') => {
    if (onExport) {
      await handleAction('export', () => onExport(product, format));
    }
  };

  const handleSendToMoonlit = async () => {
    // Use research result ID if available, otherwise fall back to approved product ID
    // Handle empty strings by treating them as falsy
    const trackingId = (researchResultId && researchResultId.trim()) || (approvedProductId && approvedProductId.trim());
    
    // Debug logging to see what values we have
    console.log('🔍 Moonlit Tracking Debug:', {
      researchResultId,
      approvedProductId,
      trackingId,
      researchResultIdType: typeof researchResultId,
      approvedProductIdType: typeof approvedProductId,
      researchResultIdLength: researchResultId?.length,
      approvedProductIdLength: approvedProductId?.length
    });
    
    if (!trackingId) {
      toast.error('Unable to send to Moonlit: No tracking ID available. Please contact support.');
      return;
    }

    // Generate a new UUID for each content brief to ensure uniqueness
    // This creates a valid UUID v4 format
    const generateUUID = () => {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    };
    
    const uniqueResearchResultId = generateUUID();
    
    console.log('🔍 Unique Research Result ID Generation:', {
      originalId: trackingId,
      uniqueId: uniqueResearchResultId,
      isValidUUID: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uniqueResearchResultId)
    });

    // Note: User notification removed - only admins should see notifications for actual article generation
    // The "Send to Moonlit" action generates content briefs, not articles, so users don't need to be notified

    // Use the action handler for proper loading state management
    await handleAction('sendToMoonlit', async () => {
      try {
        let completeProductData = product;
        
        // If we have an approved product ID, fetch the complete data from approved_products table
        if (approvedProductId) {
          console.log('🔍 Fetching complete approved product data from database...');
          
          const { data: approvedProductData, error } = await supabase
            .from('approved_products')
            .select(`
              *,
              research_results!approved_products_research_result_id_fkey (
                id,
                user_id
              )
            `)
            .eq('id', approvedProductId)
            .single();
            
          if (error) {
            console.error('❌ Error fetching approved product data:', error);
            throw new Error('Failed to fetch complete product data');
          }
          
          if (approvedProductData) {
            console.log('✅ Complete approved product data fetched:', approvedProductData);
            
            // Fetch user profile separately if we have a user_id
            let userProfileData = null;
            if (approvedProductData.research_results?.user_id) {
              const { data: profileData } = await supabase
                .from('user_profiles')
                .select('id, email, company_name')
                .eq('user_id', approvedProductData.research_results.user_id)
                .single();
              userProfileData = profileData;
            }
            
            // Use the complete product data from the database
            completeProductData = {
              ...approvedProductData.product_data,
              // Ensure user information is included
              userUUID: userProfileData?.id || userUUID,
              userEmail: userProfileData?.email || userEmail,
              userCompanyName: userProfileData?.company_name || userCompanyName
            };
            
            console.log('🎯 Using complete approved product data for Moonlit:', {
              hasGoogleDoc: !!completeProductData.google_doc,
              hasKeywords: !!completeProductData.keywords?.length,
              hasFramework: !!completeProductData.framework,
              keywords: completeProductData.keywords,
              framework: completeProductData.framework,
              googleDoc: completeProductData.google_doc
            });
          }
        }
        
        // Format data according to MoonlitProductInput interface
        const moonlitData = {
          productCard: {
            ...completeProductData,
            google_doc: completeProductData.google_doc || completeProductData.competitorAnalysisUrl || '',
            userUUID: completeProductData.userUUID || userUUID,
            userEmail: completeProductData.userEmail || userEmail,
            userCompanyName: completeProductData.userCompanyName || userCompanyName
          },
          researchResultId: uniqueResearchResultId
        };

        // Log framework being sent to Moonlit for verification
        console.log('🎯 Framework being sent to Moonlit:', {
          framework: completeProductData.framework,
          frameworkType: typeof completeProductData.framework,
          hasFramework: !!completeProductData.framework
        });

        const moonlitResponse = await sendProductCardToMoonlit(moonlitData);
        console.log('🎯 Moonlit response received:', moonlitResponse);
        
        toast.success('Successfully sent to Moonlit for processing. You will be notified when your content brief is ready.');
      } catch (error: any) {
        console.error('Error sending to Moonlit:', error);
        
        if (error.message.includes('AUTHENTICATION_ERROR')) {
          toast.error('Moonlit API authentication failed. Please check your credentials.');
        } else if (error.message.includes('PERMISSION_ERROR')) {
          toast.error('Insufficient permissions for Moonlit API. Please contact support.');
        } else if (error.message.includes('RATE_LIMIT_ERROR')) {
          toast.error('Rate limit exceeded. Please try again later.');
        } else {
          toast.error(`Failed to send to Moonlit: ${error.message}`);
        }
        throw error; // Re-throw to ensure the action handler catches it
      }
    });
  };

  return (
    <>
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="flex items-center justify-between gap-3 pt-4 border-t border-primary-500/20"
    >
      {/* Primary actions */}
      <div className="flex items-center space-x-3">
        {/* Save action */}
        {onSave && (
          <ActionButton
            icon={<Save className="w-4 h-4" />}
            label="Save"
            variant="secondary"
            isLoading={actionStates.save}
            disabled={disabled}
            onClick={() => handleAction('save', () => onSave(product))}
            styles={styles}
            isReducedMotion={isReducedMotion}
          />
        )}

        {/* Approve action */}
        {onApprove && !product.isApproved && (
          <ActionButton
            icon={<CheckSquare className="w-4 h-4" />}
            label="Approve"
            variant="success"
            isLoading={actionStates.approve}
            disabled={disabled}
            onClick={() => handleAction('approve', () => onApprove(product))}
            styles={styles}
            isReducedMotion={isReducedMotion}
          />
        )}

        {/* External link action */}
        {(product.competitorAnalysisUrl || product.google_doc) && (
          <ActionButton
            icon={<ExternalLink className="w-4 h-4" />}
            label="Open Doc"
            variant="secondary"
            disabled={disabled}
            onClick={() => window.open(product.competitorAnalysisUrl || product.google_doc, '_blank')}
            styles={styles}
            isReducedMotion={isReducedMotion}
          />
        )}

        {/* Moonlit action */}
        {context === 'admin' && (
          <ActionButton
            icon={<Send className="w-4 h-4" />}
            label="Send to Moonlit to generate content brief"
            variant="secondary"
            isLoading={actionStates.sendToMoonlit}
            disabled={disabled}
            onClick={() => handleSendToMoonlit()}
            styles={styles}
            isReducedMotion={isReducedMotion}
          />
        )}
      </div>

      {/* Secondary actions */}
      <div className="flex items-center space-x-3">
        {/* Export dropdown */}
        {onExport && (
          <ExportDropdown
            onExport={handleExport}
            styles={styles}
            isReducedMotion={isReducedMotion}
          />
        )}

        {/* More actions dropdown */}
        <MoreActionsDropdown
          onEdit={onEdit ? () => onEdit(product) : undefined}
          onDelete={onDelete ? () => onDelete(product) : undefined}
          onShare={onShare ? () => onShare(product) : undefined}
          context={context}
          styles={styles}
          isReducedMotion={isReducedMotion}
        />
      </div>

      {/* Status indicator */}
      {product.isApproved && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3, type: 'spring', stiffness: 500 }}
          className="flex items-center space-x-2 text-green-400 text-sm font-medium"
        >
          <CheckSquare className="w-4 h-4" />
          <span className="hidden sm:inline">Approved</span>
        </motion.div>
      )}
    </motion.div>

    {/* ContentGenerationSuccessModal removed - users should only see notifications from "Approve & Generate" action */}
    </>
  );
} 