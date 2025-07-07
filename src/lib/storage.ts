import { supabase } from './supabase';

export interface UploadResult {
  url: string;
  path: string;
  error?: string;
}

export interface UploadProgress {
  progress: number;
  isUploading: boolean;
  error?: string;
}

// Storage bucket names
export const CAPABILITY_IMAGES_BUCKET = 'capability-images'; // DEPRECATED - use MEDIA_LIBRARY_BUCKET
export const ARTICLE_IMAGES_BUCKET = 'article-images';
export const MEDIA_LIBRARY_BUCKET = 'media-library';
export const MEDIA_THUMBNAILS_BUCKET = 'media-thumbnails';

/**
 * Reliably delete files from Supabase storage with verification and retry
 * @param bucketName - The storage bucket name
 * @param filePaths - Array of file paths to delete
 * @param maxRetries - Maximum number of retry attempts (default: 3)
 * @returns Object with success status and any errors
 */
export async function deleteFromStorageWithVerification(
  bucketName: string,
  filePaths: string[],
  maxRetries: number = 3
): Promise<{ success: boolean; errors: string[]; deletedFiles: string[] }> {
  const errors: string[] = [];
  const deletedFiles: string[] = [];
  
  console.log(`🗑️ Starting verified deletion from bucket "${bucketName}":`, filePaths);

  for (const filePath of filePaths) {
    let retryCount = 0;
    let deleted = false;

    while (retryCount < maxRetries && !deleted) {
      try {
        // Attempt to delete the file
        const { error: deleteError } = await supabase.storage
          .from(bucketName)
          .remove([filePath]);

        if (deleteError) {
          console.error(`❌ Delete attempt ${retryCount + 1} failed for ${filePath}:`, deleteError);
          retryCount++;
          
          // Wait before retry (exponential backoff)
          if (retryCount < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
          }
          continue;
        }

        // Verify the file is actually deleted by trying to get its public URL and checking if it exists
        const { data: listData, error: listError } = await supabase.storage
          .from(bucketName)
          .list(filePath.split('/').slice(0, -1).join('/'), {
            limit: 100,
            search: filePath.split('/').pop()
          });

        if (!listError && (!listData || listData.length === 0)) {
          // File successfully deleted
          deleted = true;
          deletedFiles.push(filePath);
          console.log(`✅ Successfully deleted and verified: ${filePath}`);
        } else {
          console.warn(`⚠️ File may still exist after deletion attempt: ${filePath}`);
          retryCount++;
        }

      } catch (error) {
        console.error(`❌ Unexpected error deleting ${filePath}:`, error);
        retryCount++;
      }
    }

    if (!deleted) {
      errors.push(`Failed to delete ${filePath} after ${maxRetries} attempts`);
    }
  }

  const success = errors.length === 0;
  
  console.log(`📊 Storage deletion summary:`, {
    totalFiles: filePaths.length,
    deletedFiles: deletedFiles.length,
    failedFiles: errors.length,
    success
  });

  return { success, errors, deletedFiles };
}

// Media Library Types
export interface MediaFile {
  id: string;
  company_name: string;
  user_id: string;
  filename: string;
  original_filename: string;
  file_path: string;
  file_type: 'image' | 'video' | 'gif';
  file_size: number;
  mime_type: string;
  width?: number;
  height?: number;
  duration?: number;
  folder_id?: string;
  tags: string[];
  thumbnail_path?: string;
  thumbnail_width?: number;
  thumbnail_height?: number;
  upload_date: string;
  uploaded_by_user_id?: string;
  download_count?: number;
  last_accessed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface MediaFolder {
  id: string;
  company_name: string;
  name: string;
  description?: string;
  parent_folder_id?: string;
  created_by_user_id?: string;
  created_at: string;
  updated_at: string;
}

export interface MediaUploadResult extends UploadResult {
  mediaFile?: MediaFile;
  thumbnail?: {
    url: string;
    path: string;
  };
}

export interface MediaFilters {
  fileType?: 'image' | 'video' | 'gif';
  folderId?: string;
  tags?: string[];
  search?: string;
  searchQuery?: string;
  dateFrom?: string;
  dateTo?: string;
  dateRange?: 'today' | 'week' | 'month' | 'quarter' | 'year';
  sortBy?: 'upload_date' | 'original_filename' | 'title' | 'file_size' | 'file_type';
  sortOrder?: 'asc' | 'desc';
  showAllUserUploads?: boolean; // Show all files uploaded by the current user regardless of company
}

/**
 * Upload an image file to Supabase storage (DEPRECATED - use uploadProductImage instead)
 * @deprecated This function uses the old capability-images bucket. Use uploadProductImage() for new uploads.
 */
export async function uploadCapabilityImage(
  file: File,
  userId: string,
  capabilityId: string,
  onProgress?: (progress: number) => void
): Promise<UploadResult> {
  console.warn('uploadCapabilityImage is deprecated. Please use uploadProductImage() instead.');
  // Redirect to the new function
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return {
      url: '',
      path: '',
      error: 'User not authenticated'
    };
  }
  
  // Try to get company name
  let companyName = 'default';
  try {
    const { data: companyProfile } = await supabase
      .from('company_profiles')
      .select('company_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();
    
    if (companyProfile?.company_id) {
      companyName = companyProfile.company_id;
    } else {
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('company_name')
        .eq('id', user.id)
        .single();
      
      if (userProfile?.company_name) {
        companyName = userProfile.company_name;
      }
    }
  } catch (error) {
    console.warn('Could not get company name, using default');
  }
  
  return uploadProductImage(file, companyName, userId, onProgress);
}

/**
 * Upload a product image directly to the media library
 * This replaces the old capability-images bucket approach
 */
export async function uploadProductImage(
  file: File,
  companyName: string,
  userId: string,
  onProgress?: (progress: number) => void
): Promise<UploadResult> {
  try {
    console.log('📤 uploadProductImage: Starting upload', {
      fileName: file.name,
      companyName,
      userId
    });

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return {
        url: '',
        path: '',
        error: 'Invalid file type. Please upload JPG, PNG, GIF, or WebP images.'
      };
    }

    // Validate file size (10MB max for product images)
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    if (file.size > maxSize) {
      return {
        url: '',
        path: '',
        error: 'File size too large. Please upload images smaller than 10MB.'
      };
    }

    onProgress?.(5);

    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2);
    const fileName = `${timestamp}_${randomId}.${fileExt}`;
    
    // Create path in media library: companyName/product-capabilities/filename
    const filePath = `${companyName}/product-capabilities/${fileName}`;

    onProgress?.(10);

    // Upload file to media library bucket
    const { data, error } = await supabase.storage
      .from(MEDIA_LIBRARY_BUCKET)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('❌ uploadProductImage: Upload error:', error);
      return {
        url: '',
        path: '',
        error: `Upload failed: ${error.message}`
      };
    }

    onProgress?.(70);

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(MEDIA_LIBRARY_BUCKET)
      .getPublicUrl(filePath);

    onProgress?.(80);

    // Get image dimensions
    let width: number | undefined;
    let height: number | undefined;
    
    try {
      const dimensions = await getImageDimensions(file);
      width = dimensions.width;
      height = dimensions.height;
    } catch (error) {
      console.warn('Could not get image dimensions:', error);
    }

    onProgress?.(85);

    // Save to media_files table
    const { data: mediaFile, error: dbError } = await supabase
      .from('media_files')
      .insert({
        company_name: companyName,
        user_id: userId,
        filename: fileName,
        original_filename: file.name,
        file_path: filePath,
        file_type: 'image',
        file_size: file.size,
        mime_type: file.type,
        width,
        height,
        tags: ['product-capabilities', 'auto-uploaded'],
        uploaded_by_user_id: userId
      })
      .select()
      .single();

    if (dbError) {
      console.error('❌ uploadProductImage: Database save error:', dbError);
      // Don't fail the upload if database save fails - the image is still uploaded
      console.warn('Image uploaded successfully but metadata save failed');
    } else {
      console.log('✅ uploadProductImage: Successfully saved to media library', mediaFile);
    }

    onProgress?.(100);

    return {
      url: urlData.publicUrl,
      path: filePath
    };

  } catch (error) {
    console.error('❌ uploadProductImage: Unexpected error:', error);
    return {
      url: '',
      path: '',
      error: 'Unexpected error occurred during upload'
    };
  }
}

/**
 * Delete an image from Supabase storage
 */
export async function deleteCapabilityImage(filePath: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.storage
      .from(CAPABILITY_IMAGES_BUCKET)
      .remove([filePath]);

    if (error) {
      console.error('Delete error:', error);
      return {
        success: false,
        error: `Delete failed: ${error.message}`
      };
    }

    return { success: true };

  } catch (error) {
    console.error('Unexpected delete error:', error);
    return {
      success: false,
      error: 'Unexpected error occurred during deletion'
    };
  }
}

/**
 * Upload an image file for articles to Supabase storage
 */
export async function uploadArticleImage(
  file: File,
  userId: string,
  articleId: string,
  onProgress?: (progress: number) => void
): Promise<UploadResult> {
  try {
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return {
        url: '',
        path: '',
        error: 'Invalid file type. Please upload JPG, PNG, GIF, or WebP images.'
      };
    }

    // Validate file size (10MB max for articles)
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    if (file.size > maxSize) {
      return {
        url: '',
        path: '',
        error: 'File size too large. Please upload images smaller than 10MB.'
      };
    }

    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${userId}/${articleId}/${fileName}`;

    // Simulate progress for user feedback
    onProgress?.(10);

    // Upload file to Supabase storage
    const { data, error } = await supabase.storage
      .from(ARTICLE_IMAGES_BUCKET)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    onProgress?.(90);

    if (error) {
      console.error('Article image upload error:', error);
      return {
        url: '',
        path: '',
        error: `Upload failed: ${error.message}`
      };
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(ARTICLE_IMAGES_BUCKET)
      .getPublicUrl(filePath);

    onProgress?.(100);

    return {
      url: urlData.publicUrl,
      path: filePath
    };

  } catch (error) {
    console.error('Unexpected article image upload error:', error);
    return {
      url: '',
      path: '',
      error: 'Unexpected error occurred during upload'
    };
  }
}

/**
 * Delete an article image from Supabase storage
 */
export async function deleteArticleImage(filePath: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.storage
      .from(ARTICLE_IMAGES_BUCKET)
      .remove([filePath]);

    if (error) {
      console.error('Article image delete error:', error);
      return {
        success: false,
        error: `Delete failed: ${error.message}`
      };
    }

    return { success: true };

  } catch (error) {
    console.error('Unexpected article image delete error:', error);
    return {
      success: false,
      error: 'Unexpected error occurred during deletion'
    };
  }
}

/**
 * Save article image metadata to database
 */
export async function saveArticleImageMetadata(
  articleId: string,
  storagePath: string,
  filename: string,
  altText?: string,
  caption?: string,
  fileSize?: number,
  mimeType?: string,
  width?: number,
  height?: number
) {
  try {
    const { data, error } = await supabase
      .from('article_images')
      .insert({
        article_id: articleId,
        storage_path: storagePath,
        filename,
        alt_text: altText,
        caption,
        file_size: fileSize,
        mime_type: mimeType,
        width,
        height,
        created_by: (await supabase.auth.getUser()).data.user?.id
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving article image metadata:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Unexpected error saving article image metadata:', error);
    return { success: false, error: 'Failed to save image metadata' };
  }
}

/**
 * Get all images for an article
 */
export async function getArticleImages(articleId: string) {
  try {
    const { data, error } = await supabase
      .from('article_images')
      .select('*')
      .eq('article_id', articleId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching article images:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Unexpected error fetching article images:', error);
    return { success: false, error: 'Failed to fetch article images' };
  }
}

/**
 * Delete article image and its metadata
 */
export async function deleteArticleImageComplete(imageId: string, storagePath: string) {
  try {
    // Delete from storage
    const storageResult = await deleteArticleImage(storagePath);
    if (!storageResult.success) {
      return storageResult;
    }

    // Delete metadata from database
    const { error } = await supabase
      .from('article_images')
      .delete()
      .eq('id', imageId);

    if (error) {
      console.error('Error deleting article image metadata:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Unexpected error deleting article image:', error);
    return { success: false, error: 'Failed to delete image completely' };
  }
}

/**
 * Upload a media file to the media library
 */
export async function uploadMediaFile(
  file: File,
  companyName: string,
  userId: string,
  folderId?: string,
  metadata?: {
    title?: string;
    caption?: string;
    alt_text?: string;
    tags?: string[];
  },
  onProgress?: (progress: number) => void
): Promise<MediaUploadResult> {
  try {
    // Validate file type
    const imageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const gifTypes = ['image/gif'];
    const videoTypes = ['video/mp4', 'video/webm', 'video/mov', 'video/avi'];
    
    const allowedTypes = [...imageTypes, ...gifTypes, ...videoTypes];
    if (!allowedTypes.includes(file.type)) {
      return {
        url: '',
        path: '',
        error: 'Invalid file type. Please upload images, GIFs, or videos (MP4, WebM, MOV, AVI).'
      };
    }

    // Validate file size (50MB max for media library)
    const maxSize = 50 * 1024 * 1024; // 50MB in bytes
    if (file.size > maxSize) {
      return {
        url: '',
        path: '',
        error: 'File size too large. Please upload files smaller than 50MB.'
      };
    }

    // Determine file type
    let fileType: 'image' | 'video' | 'gif';
    if (gifTypes.includes(file.type)) {
      fileType = 'gif';
    } else if (videoTypes.includes(file.type)) {
      fileType = 'video';
    } else {
      fileType = 'image';
    }

    onProgress?.(5);

    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2);
    const fileName = `${timestamp}_${randomId}.${fileExt}`;
    
    // Create path with folder structure
    const folderPath = folderId ? `${companyName}/folders/${folderId}` : `${companyName}/root`;
    const filePath = `${folderPath}/${fileName}`;

    onProgress?.(10);

    // Upload file to Supabase storage
    const { data, error } = await supabase.storage
      .from(MEDIA_LIBRARY_BUCKET)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Media upload error:', error);
      return {
        url: '',
        path: '',
        error: `Upload failed: ${error.message}`
      };
    }

    onProgress?.(70);

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(MEDIA_LIBRARY_BUCKET)
      .getPublicUrl(filePath);

    onProgress?.(80);

    // Get file dimensions for images
    let width: number | undefined;
    let height: number | undefined;
    let duration: number | undefined;

    if (fileType === 'image' || fileType === 'gif') {
      try {
        const dimensions = await getImageDimensions(file);
        width = dimensions.width;
        height = dimensions.height;
      } catch (error) {
        console.warn('Could not get image dimensions:', error);
      }
    }

    onProgress?.(85);

    // Save media file record to database
    const { data: mediaFile, error: dbError } = await supabase
      .from('media_files')
      .insert({
        company_name: companyName,
        user_id: userId,
        filename: fileName,
        original_filename: file.name,
        file_path: filePath,
        file_type: fileType,
        file_size: file.size,
        mime_type: file.type,
        width,
        height,
        duration,
        folder_id: folderId,
        tags: metadata?.tags || [],
        uploaded_by_user_id: userId
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database save error:', dbError);
      // Try to cleanup uploaded file
      await supabase.storage.from(MEDIA_LIBRARY_BUCKET).remove([filePath]);
      return {
        url: '',
        path: '',
        error: `Failed to save file metadata: ${dbError.message}`
      };
    }

    onProgress?.(100);

    return {
      url: urlData.publicUrl,
      path: filePath,
      mediaFile: mediaFile as MediaFile
    };

  } catch (error) {
    console.error('Unexpected media upload error:', error);
    return {
      url: '',
      path: '',
      error: 'Unexpected error occurred during upload'
    };
  }
}

/**
 * Get image dimensions from file
 */
function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Get media files for a company with optional filtering
 */
export async function getCompanyMediaFiles(
  companyName: string,
  filters?: MediaFilters,
  page: number = 1,
  pageSize: number = 50
): Promise<{ files: MediaFile[]; total: number; error?: string }> {
  try {
    let query = supabase
      .from('media_files')
      .select('*', { count: 'exact' });
    
    // Always filter by company - this ensures company-specific access
    query = query.eq('company_name', companyName);
    // RLS policies will additionally filter by user permissions
    
    query = query.order('upload_date', { ascending: false });

    // Apply filters
    if (filters?.fileType) {
      query = query.eq('file_type', filters.fileType);
    }

    if (filters?.folderId) {
      query = query.eq('folder_id', filters.folderId);
    } else if (filters?.folderId === null) {
      query = query.is('folder_id', null);
    }

    if (filters?.tags && filters.tags.length > 0) {
      query = query.overlaps('tags', filters.tags);
    }

    if (filters?.searchQuery) {
      query = query.or(`original_filename.ilike.%${filters.searchQuery}%,title.ilike.%${filters.searchQuery}%,caption.ilike.%${filters.searchQuery}%`);
    }

    if (filters?.dateFrom) {
      query = query.gte('upload_date', filters.dateFrom);
    }

    if (filters?.dateTo) {
      query = query.lte('upload_date', filters.dateTo);
    }

    // Apply pagination
    const offset = (page - 1) * pageSize;
    query = query.range(offset, offset + pageSize - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching media files:', error);
      return {
        files: [],
        total: 0,
        error: `Failed to fetch media files: ${error.message}`
      };
    }

    return {
      files: data as MediaFile[],
      total: count || 0
    };

  } catch (error) {
    console.error('Unexpected error fetching media files:', error);
    return {
      files: [],
      total: 0,
      error: 'Unexpected error occurred while fetching files'
    };
  }
}

/**
 * Get media folders for a company
 */
export async function getCompanyMediaFolders(
  companyName: string,
  parentFolderId?: string
): Promise<{ folders: MediaFolder[]; error?: string }> {
  try {
    let query = supabase
      .from('media_folders')
      .select('*')
      .eq('company_name', companyName)
      .order('name');

    if (parentFolderId) {
      query = query.eq('parent_folder_id', parentFolderId);
    } else {
      query = query.is('parent_folder_id', null);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching media folders:', error);
      return {
        folders: [],
        error: `Failed to fetch folders: ${error.message}`
      };
    }

    return {
      folders: data as MediaFolder[]
    };

  } catch (error) {
    console.error('Unexpected error fetching media folders:', error);
    return {
      folders: [],
      error: 'Unexpected error occurred while fetching folders'
    };
  }
}

/**
 * Create a new media folder
 */
export async function createMediaFolder(
  companyName: string,
  name: string,
  userId: string,
  parentFolderId?: string,
  description?: string
): Promise<{ folder?: MediaFolder; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('media_folders')
      .insert({
        company_name: companyName,
        name,
        description,
        parent_folder_id: parentFolderId,
        created_by_user_id: userId
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating media folder:', error);
      return {
        error: `Failed to create folder: ${error.message}`
      };
    }

    return {
      folder: data as MediaFolder
    };

  } catch (error) {
    console.error('Unexpected error creating media folder:', error);
    return {
      error: 'Unexpected error occurred while creating folder'
    };
  }
}

/**
 * Update media file metadata
 */
export async function updateMediaFileMetadata(
  fileId: string,
  metadata: {
    title?: string;
    caption?: string;
    alt_text?: string;
    tags?: string[];
    folder_id?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('media_files')
      .update(metadata)
      .eq('id', fileId);

    if (error) {
      console.error('Error updating media file metadata:', error);
      return {
        success: false,
        error: `Failed to update metadata: ${error.message}`
      };
    }

    return { success: true };

  } catch (error) {
    console.error('Unexpected error updating media file metadata:', error);
    return {
      success: false,
      error: 'Unexpected error occurred while updating metadata'
    };
  }
}

/**
 * Delete a media file
 */
export async function deleteMediaFile(fileId: string): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('🗑️ Starting media file deletion for ID:', fileId);
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return {
        success: false,
        error: 'You must be logged in to delete files'
      };
    }
    
    // Get file info first
    const { data: mediaFile, error: fetchError } = await supabase
      .from('media_files')
      .select('file_path, thumbnail_path, user_id, uploaded_by_user_id')
      .eq('id', fileId)
      .single();

    if (fetchError) {
      console.error('Error fetching media file for deletion:', fetchError);
      if (fetchError.code === 'PGRST116') {
        return {
          success: false,
          error: 'File not found'
        };
      }
      return {
        success: false,
        error: `Failed to fetch file info: ${fetchError.message}`
      };
    }

    // Check if user is an admin first
    const { data: adminProfile } = await supabase
      .from('admin_profiles')
      .select('id, admin_role')
      .eq('id', user.id)
      .single();
    
    const isAdmin = !!adminProfile;
    
    // Check if user has permission to delete
    if (!isAdmin && mediaFile.user_id !== user.id && mediaFile.uploaded_by_user_id !== user.id) {
      console.warn('User does not have permission to delete this file', {
        fileUserId: mediaFile.user_id,
        fileUploadedBy: mediaFile.uploaded_by_user_id,
        currentUser: user.id,
        isAdmin: false
      });
      return {
        success: false,
        error: 'You can only delete files that you uploaded'
      };
    }
    
    if (isAdmin) {
      console.log('🔓 Admin user detected, allowing deletion of any file');
    }

    console.log('📁 File to delete:', {
      path: mediaFile.file_path,
      thumbnail: mediaFile.thumbnail_path,
      userId: mediaFile.user_id,
      uploadedBy: mediaFile.uploaded_by_user_id
    });

    // Delete from storage with verification
    const filesToDelete = [mediaFile.file_path];
    if (mediaFile.thumbnail_path) {
      filesToDelete.push(mediaFile.thumbnail_path);
    }

    const { success: storageSuccess, errors: storageErrors } = await deleteFromStorageWithVerification(
      MEDIA_LIBRARY_BUCKET,
      filesToDelete
    );

    if (!storageSuccess) {
      console.error('Failed to delete some files from storage:', storageErrors);
      // Return error if storage deletion failed
      return {
        success: false,
        error: `Failed to delete files from storage: ${storageErrors.join(', ')}`
      };
    }

    // Delete from database
    const { error: dbError } = await supabase
      .from('media_files')
      .delete()
      .eq('id', fileId);

    if (dbError) {
      console.error('Error deleting media file from database:', dbError);
      if (dbError.code === '42501') {
        return {
          success: false,
          error: 'You do not have permission to delete this file'
        };
      }
      return {
        success: false,
        error: `Failed to delete file: ${dbError.message}`
      };
    }

    console.log('✅ Successfully deleted from database');
    return { success: true };

  } catch (error) {
    console.error('Unexpected error deleting media file:', error);
    return {
      success: false,
      error: 'Unexpected error occurred while deleting file'
    };
  }
} 