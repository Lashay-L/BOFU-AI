import React, { useState, useEffect, useContext } from 'react';
import { motion } from 'framer-motion';
import { supabaseAdmin } from '../../../lib/supabase';
import { toast } from 'react-hot-toast';
import { 
  Building2, 
  Search, 
  Loader2, 
  FileText, 
  Eye 
} from 'lucide-react';
import { BaseModal } from '../../ui/BaseModal';
import { ArticleCard } from '../ArticleCard';
import { unifiedArticleService } from '../../../lib/unifiedArticleApi';
import { AdminContext } from '../../../contexts/AdminContext';

// Types for the modal
interface UserProfile {
  id: string;
  email: string;
  company_name: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
  user_type?: 'main' | 'sub';
  profile_role?: 'admin' | 'manager' | 'editor' | 'viewer';
  parent_user_id?: string;
  profile_name?: string;
  articleCount?: number;
}

interface CompanyGroup {
  company_name: string;
  main_account: UserProfile;
  sub_accounts: UserProfile[];
  total_users: number;
  created_at: string;
}

interface AdminUserArticlesModalProps {
  user: UserProfile;
  companyGroup?: CompanyGroup | null;
  isOpen: boolean;
  onClose: () => void;
  onEditArticle: (article: any) => void;
}

export const AdminUserArticlesModal = ({ 
  user, 
  companyGroup, 
  isOpen, 
  onClose, 
  onEditArticle 
}: AdminUserArticlesModalProps) => {
  const adminContext = useContext(AdminContext);
  const [loading, setLoading] = useState(false);
  const [articles, setArticles] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingArticleId, setDeletingArticleId] = useState<string | null>(null);

  // Utility function to extract first keyword from brief content
  const extractFirstKeyword = (briefContent: any): string | null => {
    if (!briefContent) return null;
    
    try {
      let parsedContent = briefContent;
      
      // Handle case where brief_content is stored as a JSON string
      if (typeof briefContent === 'string') {
        parsedContent = JSON.parse(briefContent);
      }
      
      // Check for keywords array in the parsed content
      if (parsedContent.keywords && Array.isArray(parsedContent.keywords) && parsedContent.keywords.length > 0) {
        // Extract the first keyword and clean it from backticks and quotes
        const firstKeyword = parsedContent.keywords[0].replace(/[`'"]/g, '').trim();
        // Remove any URL patterns that might be in the keyword
        const cleanKeyword = firstKeyword.replace(/^\/|\/$|^https?:\/\//, '').replace(/[-_]/g, ' ');
        return cleanKeyword;
      }
      
      // Try to get primary keyword from SEO Strategy as fallback
      const seoStrategy = parsedContent['4. SEO Strategy'];
      if (seoStrategy && seoStrategy['Primary Keyword']) {
        const primaryKeyword = seoStrategy['Primary Keyword'].replace(/[`'"]/g, '').trim();
        if (primaryKeyword) {
          return primaryKeyword;
        }
      }
    } catch (error) {
      console.warn('Could not extract keyword from brief content:', error);
    }
    
    return null;
  };

  // Fetch articles for all users in the company
  useEffect(() => {
    if (isOpen && user) {
      fetchCompanyArticles();
    }
  }, [isOpen, user, companyGroup]);

  const fetchCompanyArticles = async () => {
    setLoading(true);
    try {
      if (!supabaseAdmin) {
        console.error('Admin client not available');
        return;
      }

      let userIds: string[] = [];
      
      if (companyGroup) {
        // Get all user IDs from the company (main account + sub accounts)
        userIds = [
          companyGroup.main_account.id,
          ...companyGroup.sub_accounts.map(subUser => subUser.id)
        ];
      } else {
        // Fallback to just the selected user
        userIds = [user.id];
      }

      // First, fetch articles without the join
      const { data: articlesData, error } = await supabaseAdmin
        .from('content_briefs')
        .select('id, user_id, product_name, possible_article_titles, article_content, editing_status, last_edited_at, last_edited_by, article_version, created_at, updated_at, google_doc_url, brief_content')
        .in('user_id', userIds)
        .not('article_content', 'is', null)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching articles:', error);
        toast.error('Failed to fetch articles');
        return;
      }

      // If we have articles, fetch user information for those users
      let enrichedArticles = articlesData || [];
      
      if (articlesData && articlesData.length > 0) {
        const articleUserIds = [...new Set(articlesData.map(article => article.user_id))];
        
        // Fetch user profiles for the article authors
        const { data: usersData, error: usersError } = await supabaseAdmin
          .from('user_profiles')
          .select('id, email, company_name')
          .in('id', articleUserIds);

        if (usersError) {
          console.error('Error fetching user profiles:', usersError);
          // Continue without user data - we'll show the article anyway
        } else {
          // Create a map for quick lookup
          const userMap = new Map(usersData.map(u => [u.id, u]));
          
          // Enrich articles with user data
          enrichedArticles = articlesData.map(article => ({
            ...article,
            user_profiles: userMap.get(article.user_id) || null
          }));
        }
      }

      setArticles(enrichedArticles);
    } catch (error) {
      console.error('Exception fetching articles:', error);
      toast.error('Failed to fetch articles');
    } finally {
      setLoading(false);
    }
  };

  // Handle article deletion
  const handleDeleteArticle = async (article: any) => {
    if (!adminContext?.adminId) {
      toast.error('Admin authentication required');
      return;
    }

    // Confirm deletion
    if (!window.confirm(`Are you sure you want to delete the article "${article.product_name || 'Untitled'}"? This action cannot be undone.`)) {
      return;
    }

    setDeletingArticleId(article.id);
    
    try {
      const result = await unifiedArticleService.deleteArticle(article.id);
      
      if (result.success) {
        toast.success('Article deleted successfully');
        // Refresh the articles list
        await fetchCompanyArticles();
      } else {
        toast.error(result.error || 'Failed to delete article');
      }
    } catch (error) {
      console.error('Error deleting article:', error);
      toast.error('An unexpected error occurred while deleting the article');
    } finally {
      setDeletingArticleId(null);
    }
  };

  const filteredArticles = articles.filter(article =>
    article.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    article.article_content?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    article.user_profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    article.user_profiles?.profile_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const companyName = companyGroup?.company_name || user.company_name || 'Unknown Company';
  const totalArticles = articles.length;

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={`${companyName} - All Articles`}
      size="xl"
      theme="dark"
    >
      {/* Title icon and subtitle section */}
      <div className="flex items-center gap-4 mb-6">
        <div className="p-2 bg-purple-500/20 rounded-lg">
          <Building2 className="h-6 w-6 text-purple-400" />
        </div>
        <div>
          <p className="text-gray-400 text-sm">
            {companyGroup ? `${companyGroup.total_users} users` : '1 user'} • {totalArticles} articles
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6 pb-6 border-b border-gray-700">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search articles, authors, or content..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
          />
        </div>
      </div>

      {/* Article List */}
      <div className="overflow-y-auto max-h-96">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 text-purple-400 animate-spin" />
            <span className="ml-2 text-gray-400">Loading articles...</span>
          </div>
        ) : filteredArticles.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredArticles.map((article) => {
              // Parse article title from possible_article_titles (same logic as user dashboard)
              let parsedTitle = `Untitled Article ${article.id.substring(0, 4)}`;
              if (typeof article.possible_article_titles === 'string' && article.possible_article_titles.trim() !== '') {
                const titlesString = article.possible_article_titles;
                const match = titlesString.match(/^1\\.s*(.*?)(?:\\n2\\.|$)/s);
                if (match && match[1]) {
                  parsedTitle = match[1].trim();
                } else {
                  const firstLine = titlesString.split('\n')[0].trim();
                  if (firstLine) parsedTitle = firstLine;
                }
              }
              
              // Transform the article data to match ArticleCard expected format
              const transformedArticle = {
                id: article.id,
                title: parsedTitle, // Use parsed article title instead of product_name
                content: article.article_content || '',
                user_id: article.user_id,
                user_email: article.user_profiles?.email || 'unknown@example.com',
                user_company: article.user_profiles?.company_name || companyName,
                product_name: article.product_name,
                editing_status: article.editing_status || 'draft' as const,
                last_edited_at: article.updated_at || article.created_at,
                last_edited_by: article.user_profiles?.email || 'unknown@example.com',
                article_version: article.article_version || 1,
                created_at: article.created_at,
                updated_at: article.updated_at || article.created_at,
                google_doc_url: article.google_doc_url || null,
                first_keyword: extractFirstKeyword(article.brief_content)
              };

              return (
                <ArticleCard
                  key={article.id}
                  article={transformedArticle}
                  onEditArticle={() => onEditArticle(article)}
                  onDeleteArticle={() => handleDeleteArticle(article)}
                  isDeleting={deletingArticleId === article.id}
                  className="h-fit"
                />
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400">
              {searchTerm ? 'No articles found matching your search' : `No articles found for ${companyName}`}
            </p>
          </div>
        )}
      </div>
    </BaseModal>
  );
}; 