import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useUnifiedToast } from '../../hooks/useUnifiedToast';
import { supabase } from '../../lib/supabase';
import { 
  MediaFile, 
  MediaFolder, 
  MediaFilters,
  getCompanyMediaFiles, 
  getCompanyMediaFolders,
  uploadMediaFile,
  createMediaFolder,
  updateMediaFileMetadata,
  deleteMediaFile
} from '../../lib/storage';
import MediaGrid from './MediaGrid';
import MediaUploadZone from './MediaUploadZone';
import MediaFiltersBar from './MediaFiltersBar';
import MediaPreviewModal from './MediaPreviewModal';
import FolderCreationModal from './FolderCreationModal';
import MediaLibraryCompanySelector from './MediaLibraryCompanySelector';
import { 
  FolderIcon, 
  Squares2X2Icon,
  ListBulletIcon,
  FunnelIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';

interface ImageRepositoryPageProps {
  companyName?: string; // For admin context - if provided, shows specific company's media
  isAdminView?: boolean; // Flag to indicate admin interface
  onMediaSelect?: (media: MediaFile) => void; // For modal usage in article editor
  allowSelection?: boolean; // Whether to show selection checkboxes
  maxSelection?: number; // Max files that can be selected
}

interface BreadcrumbItem {
  id: string | null;
  name: string;
  companyName?: string;
}

export default function ImageRepositoryPage({
  companyName: propCompanyName,
  isAdminView = false,
  onMediaSelect,
  allowSelection = false,
  maxSelection = 1
}: ImageRepositoryPageProps) {
  // State management
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [folders, setFolders] = useState<MediaFolder[]>([]);
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewFile, setPreviewFile] = useState<MediaFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([]);
  const [totalFiles, setTotalFiles] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<MediaFilters>({});

  // Hooks
  const { showToast } = useUnifiedToast();
  const [user, setUser] = useState<any>(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Determine company name
  const [currentCompanyName, setCurrentCompanyName] = useState<string>('');

  // Get user's company name
  const getUserCompanyName = async () => {
    if (!user) return '';
    
    try {
      // Check if user is admin first
      const { data: adminData, error: adminError } = await supabase
        .from('admin_profiles')
        .select('id')
        .eq('id', user.id)
        .single();

      // Handle permission errors gracefully
      if (adminError && (adminError.code === 'PGRST116' || adminError.code === '42501')) {
        // User is not an admin, continue to check user_profiles
      } else if (!adminError && adminData) {
        // Admin users don't have a specific company - they can access all
        // For media library, we'll use a default or require company selection
        return 'ADMIN_ACCESS';
      }

      // If not admin, check user_profiles
      const { data, error } = await supabase
        .from('user_profiles')
        .select('company_name')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching user company:', error);
        return '';
      }

      return data?.company_name || '';
    } catch (error) {
      console.error('Error in getUserCompanyName:', error);
      return '';
    }
  };

  // Initialize company name
  useEffect(() => {
    const initCompanyName = async () => {
      // Check URL parameter first
      const urlCompany = searchParams.get('company');
      
      if (urlCompany) {
        // Company specified in URL (from admin company selector)
        setCurrentCompanyName(decodeURIComponent(urlCompany));
      } else if (propCompanyName) {
        // Admin view with specific company prop
        setCurrentCompanyName(propCompanyName);
      } else {
        // User view - get their company
        const userCompany = await getUserCompanyName();
        if (userCompany === 'ADMIN_ACCESS') {
          // For admin users without a specific company, show company selector
          setCurrentCompanyName(''); // This will show the company selector
        } else {
          setCurrentCompanyName(userCompany);
        }
      }
    };

    initCompanyName();
  }, [propCompanyName, user, searchParams]);

  // Get current user
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      setUser(currentUser);
    };
    getCurrentUser();
  }, []);

  // Build breadcrumbs
  const buildBreadcrumbs = useCallback(async (folderId: string | null) => {
    const crumbs: BreadcrumbItem[] = [];
    
    if (isAdminView && propCompanyName) {
      crumbs.push({ id: null, name: 'Media Library', companyName: propCompanyName });
      crumbs.push({ id: null, name: propCompanyName });
    } else {
      crumbs.push({ id: null, name: 'Media Library' });
    }

    // Build folder path
    let currentFolderId = folderId;
    const folderPath: MediaFolder[] = [];

    while (currentFolderId) {
      try {
        const { data, error } = await supabase
          .from('media_folders')
          .select('*')
          .eq('id', currentFolderId)
          .single();

        if (error || !data) break;

        folderPath.unshift(data);
        currentFolderId = data.parent_folder_id;
      } catch (error) {
        console.error('Error building breadcrumbs:', error);
        break;
      }
    }

    // Add folder breadcrumbs
    folderPath.forEach(folder => {
      crumbs.push({ id: folder.id, name: folder.name });
    });

    setBreadcrumbs(crumbs);
  }, [isAdminView, propCompanyName]);

  // Load media files and folders
  const loadMediaData = async () => {
    if (!currentCompanyName) return;

    setIsLoading(true);
    setError(null);

    try {
      // Load folders
      const foldersResult = await getCompanyMediaFolders(currentCompanyName, currentFolder || undefined);
      if (foldersResult.error) {
        setError(foldersResult.error);
      } else {
        setFolders(foldersResult.folders);
      }

      // Load media files - show all user uploads across companies
      const filesResult = await getCompanyMediaFiles(
        currentCompanyName,
        { ...filters, folderId: currentFolder || undefined, showAllUserUploads: true },
        currentPage,
        50
      );

      if (filesResult.error) {
        setError(filesResult.error);
        setMediaFiles([]); // Clear files on error
        setTotalFiles(0);
      } else {
        console.log('📁 Media files loaded:', filesResult.files.length, 'files, total:', filesResult.total);
        setMediaFiles(filesResult.files);
        setTotalFiles(filesResult.total);
      }

      // Build breadcrumbs
      await buildBreadcrumbs(currentFolder);

    } catch (error) {
      console.error('Error loading media data:', error);
      setError('Failed to load media data');
    } finally {
      setIsLoading(false);
    }
  };

  // Load data when dependencies change
  useEffect(() => {
    if (currentCompanyName) {
      loadMediaData();
    }
  }, [currentCompanyName, currentFolder, filters, currentPage]);

  // Handle file upload
  const handleFileUpload = async (files: File[]) => {
    if (!currentCompanyName || !user) return;

    setIsUploading(true);
    const uploadPromises = files.map(file => 
      uploadMediaFile(
        file,
        currentCompanyName,
        user.id,
        currentFolder || undefined,
        undefined,
        (progress) => {
          // Could show individual progress if needed
        }
      )
    );

    try {
      const results = await Promise.all(uploadPromises);
      const successful = results.filter(r => !r.error);
      const failed = results.filter(r => r.error);

      if (successful.length > 0) {
        showToast('success', `Successfully uploaded ${successful.length} file(s)`);
        loadMediaData(); // Refresh data
      }

      if (failed.length > 0) {
        showToast('error', `Failed to upload ${failed.length} file(s)`);
      }

    } catch (error) {
      console.error('Upload error:', error);
      showToast('error', 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  // Handle folder creation
  const handleCreateFolder = async (name: string, description?: string) => {
    if (!currentCompanyName || !user) return;

    const result = await createMediaFolder(
      currentCompanyName,
      name,
      user.id,
      currentFolder || undefined,
      description
    );

    if (result.error) {
      showToast('error', result.error);
    } else {
      showToast('success', 'Folder created successfully');
      setShowFolderModal(false);
      loadMediaData();
    }
  };

  // Handle folder navigation
  const handleFolderClick = (folderId: string) => {
    setCurrentFolder(folderId);
    setCurrentPage(1);
  };

  // Handle breadcrumb navigation
  const handleBreadcrumbClick = (folderId: string | null) => {
    setCurrentFolder(folderId);
    setCurrentPage(1);
  };

  // Handle file selection
  const handleFileSelection = (fileId: string, selected: boolean) => {
    const newSelection = new Set(selectedFiles);
    
    if (selected) {
      if (newSelection.size < maxSelection) {
        newSelection.add(fileId);
      } else {
        showToast('warning', `Maximum ${maxSelection} file(s) can be selected`);
        return;
      }
    } else {
      newSelection.delete(fileId);
    }
    
    setSelectedFiles(newSelection);
  };

  // Handle file preview
  const handleFilePreview = (file: MediaFile) => {
    setPreviewFile(file);
    setShowPreviewModal(true);
  };

  // Handle file deletion
  const handleFileDelete = async (fileId: string) => {
    const result = await deleteMediaFile(fileId);
    
    if (result.error) {
      showToast('error', result.error);
    } else {
      showToast('success', 'File deleted successfully');
      loadMediaData();
    }
  };

  // Handle file metadata update
  const handleMetadataUpdate = async (fileId: string, metadata: any) => {
    const result = await updateMediaFileMetadata(fileId, metadata);
    
    if (result.error) {
      showToast('error', result.error);
    } else {
      showToast('success', 'Metadata updated successfully');
      loadMediaData();
    }
  };

  // Handle media selection for article editor
  const handleMediaSelectForEditor = (file: MediaFile) => {
    if (onMediaSelect) {
      onMediaSelect(file);
    }
  };

  // Handle back navigation
  const handleBackClick = () => {
    if (isAdminView && searchParams.get('company')) {
      // Admin viewing a specific company - go back to company selector
      navigate('/admin/media-library');
    } else if (isAdminView) {
      // Admin in general media library - go back to admin dashboard
      navigate('/admin');
    } else {
      // Regular user - go back to dashboard
      navigate('/dashboard');
    }
  };

  // Check if we have user info and handle admin case
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminRole, setAdminRole] = useState<'super_admin' | 'admin' | null>(null);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) return;
      
      try {
        const { data: adminData, error: adminError } = await supabase
          .from('admin_profiles')
          .select('id, admin_role')
          .eq('id', user.id)
          .single();

        // Handle 406 error gracefully - user is not an admin
        if (adminError && (adminError.code === 'PGRST116' || adminError.code === '42501')) {
          setIsAdmin(false);
          setAdminRole(null);
          return;
        }

        const isAdminUser = !adminError && !!adminData;
        setIsAdmin(isAdminUser);
        setAdminRole(isAdminUser ? adminData.admin_role : null);
      } catch (error) {
        setIsAdmin(false);
        setAdminRole(null);
      }
    };

    checkAdminStatus();
  }, [user]);

  if (!currentCompanyName) {
    if (isAdmin && !propCompanyName && !searchParams.get('company')) {
      // Show company selector for admin users
      return (
        <MediaLibraryCompanySelector 
          adminRole={adminRole || 'admin'} 
          adminId={user?.id || ''}
        />
      );
    }
    
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-900">
      {/* Header */}
      <div className="border-b border-gray-700 bg-gray-800 px-6 py-4">
        {/* Breadcrumbs */}
        <div className="flex items-center space-x-2 text-sm text-gray-400 mb-4">
          {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={index}>
              {index > 0 && <span>/</span>}
              <button
                onClick={() => handleBreadcrumbClick(crumb.id)}
                className={`hover:text-white transition-colors ${
                  index === breadcrumbs.length - 1 ? 'text-white font-medium' : ''
                }`}
              >
                {crumb.name}
              </button>
            </React.Fragment>
          ))}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Back Button */}
            <button
              onClick={handleBackClick}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
              title="Go back"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </button>
            
            <h1 className="text-2xl font-bold text-white">
              {isAdminView && currentCompanyName 
                ? `${currentCompanyName} Media Library` 
                : isAdminView 
                  ? 'Admin Media Library'
                  : 'Media Library'
              }
            </h1>
            
            {/* View Toggle */}
            <div className="flex bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded ${
                  viewMode === 'grid' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Squares2X2Icon className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded ${
                  viewMode === 'list' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <ListBulletIcon className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Filters Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-lg border transition-colors ${
                showFilters
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'border-gray-600 text-gray-400 hover:border-gray-500 hover:text-white'
              }`}
            >
              <FunnelIcon className="h-4 w-4" />
            </button>

            {/* Create Folder */}
            <button
              onClick={() => setShowFolderModal(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 
                         text-white rounded-lg transition-colors"
            >
              <FolderIcon className="h-4 w-4" />
              <span>New Folder</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      {showFilters && (
        <MediaFiltersBar
          filters={filters}
          onFiltersChange={setFilters}
          onClose={() => setShowFilters(false)}
        />
      )}

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Upload Zone */}
          <MediaUploadZone
            onFileUpload={handleFileUpload}
            isUploading={isUploading}
            className="mx-6 mt-6"
          />

          {/* Selection Help Message */}
          {onMediaSelect && (
            <div className="mx-6 mb-4 p-3 bg-blue-900/30 border border-blue-700/50 rounded-lg">
              <div className="flex items-center space-x-2 text-blue-300">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm font-medium">
                  Hover over any image and click the blue "+" button to insert it into your article
                </span>
              </div>
            </div>
          )}

          {/* Media Grid */}
          <div className="flex-1 overflow-auto p-6">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : error ? (
              <div className="text-center text-red-400 mt-8">
                <p>{error}</p>
                <button
                  onClick={loadMediaData}
                  className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                >
                  Retry
                </button>
              </div>
            ) : (
              <MediaGrid
                files={mediaFiles}
                folders={folders}
                viewMode={viewMode}
                allowSelection={allowSelection}
                selectedFiles={selectedFiles}
                onFileSelection={handleFileSelection}
                onFilePreview={handleFilePreview}
                onFileDelete={handleFileDelete}
                onFolderClick={handleFolderClick}
                onMediaSelect={onMediaSelect ? handleMediaSelectForEditor : undefined}
              />
            )}

            {/* Pagination */}
            {totalFiles > 50 && (
              <div className="mt-6 flex justify-center">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 
                               text-white rounded-lg transition-colors"
                  >
                    Previous
                  </button>
                  <span className="text-gray-400">
                    Page {currentPage} of {Math.ceil(totalFiles / 50)}
                  </span>
                  <button
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage >= Math.ceil(totalFiles / 50)}
                    className="px-3 py-1 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 
                               text-white rounded-lg transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showFolderModal && (
        <FolderCreationModal
          onClose={() => setShowFolderModal(false)}
          onCreateFolder={handleCreateFolder}
        />
      )}

      {showPreviewModal && previewFile && (
        <MediaPreviewModal
          file={previewFile}
          onClose={() => {
            setShowPreviewModal(false);
            setPreviewFile(null);
          }}
          onMetadataUpdate={handleMetadataUpdate}
          onDelete={handleFileDelete}
          onSelect={onMediaSelect ? () => handleMediaSelectForEditor(previewFile) : undefined}
        />
      )}
    </div>
  );
} 