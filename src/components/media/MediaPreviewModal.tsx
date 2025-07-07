import React, { useState, useEffect } from 'react';
import { MediaFile } from '../../lib/storage';
import { 
  XMarkIcon, 
  ArrowDownTrayIcon,
  TrashIcon,
  PencilIcon,
  CheckIcon,
  PlayIcon,
  PauseIcon,
  TagIcon,
  PhotoIcon,
  VideoCameraIcon,
  ClockIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import { formatDistanceToNow } from 'date-fns';

interface MediaPreviewModalProps {
  file: MediaFile;
  onClose: () => void;
  onMetadataUpdate: (fileId: string, metadata: any) => Promise<void>;
  onDelete: (fileId: string) => Promise<void>;
  onSelect?: () => void; // For article editor integration
}

export default function MediaPreviewModal({
  file,
  onClose,
  onMetadataUpdate,
  onDelete,
  onSelect
}: MediaPreviewModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [editData, setEditData] = useState({
    title: file.title || '',
    caption: file.caption || '',
    alt_text: file.alt_text || '',
    tags: file.tags.join(', ')
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Format file size
  const formatFileSize = (bytes: number): string => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  // Get file URL
  const getFileUrl = () => {
    if (file.file_path.startsWith('http')) {
      return file.file_path;
    }
    
    // Encode the file path for URL safety
    const encodedPath = file.file_path.split('/').map(segment => encodeURIComponent(segment)).join('/');
    return `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/media-library/${encodedPath}`;
  };

  // Handle metadata save
  const handleSave = async () => {
    setIsSaving(true);
    
    try {
      const metadata = {
        title: editData.title.trim() || undefined,
        caption: editData.caption.trim() || undefined,
        alt_text: editData.alt_text.trim() || undefined,
        tags: editData.tags.trim() 
          ? editData.tags.split(',').map(tag => tag.trim()).filter(Boolean)
          : []
      };

      await onMetadataUpdate(file.id, metadata);
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving metadata:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this file? This action cannot be undone.')) {
      return;
    }

    setIsDeleting(true);
    
    try {
      await onDelete(file.id);
      onClose(); // Close modal after successful deletion
    } catch (error) {
      console.error('Error deleting file:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle download
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = getFileUrl();
    link.download = file.original_filename;
    link.click();
  };

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Enter' && e.metaKey && isEditing) {
        handleSave();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isEditing, onClose]);

  // Cancel editing
  const handleCancelEdit = () => {
    setEditData({
      title: file.title || '',
      caption: file.caption || '',
      alt_text: file.alt_text || '',
      tags: file.tags.join(', ')
    });
    setIsEditing(false);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="flex items-center justify-center min-h-screen px-4">
        <div 
          className="fixed inset-0 bg-black opacity-75 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative bg-gray-800 rounded-xl shadow-xl max-w-4xl w-full mx-auto overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-700">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gray-700 rounded-lg">
                {file.file_type === 'video' ? (
                  <VideoCameraIcon className="h-6 w-6 text-gray-300" />
                ) : (
                  <PhotoIcon className="h-6 w-6 text-gray-300" />
                )}
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white truncate max-w-md">
                  {file.title || file.original_filename}
                </h3>
                <p className="text-sm text-gray-400">
                  {file.file_type.toUpperCase()} • {formatFileSize(file.file_size)}
                  {file.width && file.height && ` • ${file.width}×${file.height}`}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {onSelect && (
                <button
                  onClick={onSelect}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg 
                             transition-colors flex items-center space-x-2"
                >
                  <CheckIcon className="h-4 w-4" />
                  <span>Select</span>
                </button>
              )}
              
              <button
                onClick={handleDownload}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                title="Download"
              >
                <ArrowDownTrayIcon className="h-5 w-5" />
              </button>

              <button
                onClick={() => setIsEditing(!isEditing)}
                className={`p-2 rounded-lg transition-colors ${
                  isEditing 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
                title="Edit Metadata"
              >
                <PencilIcon className="h-5 w-5" />
              </button>

              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-700 
                           disabled:opacity-50 rounded-lg transition-colors"
                title="Delete"
              >
                {isDeleting ? (
                  <div className="h-5 w-5 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <TrashIcon className="h-5 w-5" />
                )}
              </button>

              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                title="Close"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row">
            {/* Media Preview */}
            <div className="lg:flex-1 bg-gray-900 flex items-center justify-center min-h-[400px] lg:min-h-[600px]">
              {file.file_type === 'image' || file.file_type === 'gif' ? (
                <img
                  src={getFileUrl()}
                  alt={file.alt_text || file.original_filename}
                  className="max-w-full max-h-full object-contain"
                />
              ) : file.file_type === 'video' ? (
                <div className="relative w-full h-full flex items-center justify-center">
                  <video
                    src={getFileUrl()}
                    controls
                    className="max-w-full max-h-full"
                    poster={file.thumbnail_path ? `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/media-thumbnails/${file.thumbnail_path}` : undefined}
                  >
                    Your browser does not support the video tag.
                  </video>
                </div>
              ) : (
                <div className="text-center text-gray-400">
                  <VideoCameraIcon className="h-16 w-16 mx-auto mb-4" />
                  <p>Preview not available</p>
                  <button
                    onClick={handleDownload}
                    className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                  >
                    Download to View
                  </button>
                </div>
              )}
            </div>

            {/* Metadata Panel */}
            <div className="lg:w-96 bg-gray-800 p-6 border-l border-gray-700">
              {isEditing ? (
                /* Edit Mode */
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-white mb-4">Edit Metadata</h4>
                  
                  {/* Title */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Title
                    </label>
                    <input
                      type="text"
                      value={editData.title}
                      onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                      placeholder="Enter title..."
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg 
                                 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-1 
                                 focus:ring-blue-500 transition-colors"
                    />
                  </div>

                  {/* Caption */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Caption
                    </label>
                    <textarea
                      value={editData.caption}
                      onChange={(e) => setEditData({ ...editData, caption: e.target.value })}
                      placeholder="Enter caption..."
                      rows={3}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg 
                                 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-1 
                                 focus:ring-blue-500 transition-colors resize-none"
                    />
                  </div>

                  {/* Alt Text */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Alt Text
                    </label>
                    <input
                      type="text"
                      value={editData.alt_text}
                      onChange={(e) => setEditData({ ...editData, alt_text: e.target.value })}
                      placeholder="Enter alt text for accessibility..."
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg 
                                 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-1 
                                 focus:ring-blue-500 transition-colors"
                    />
                  </div>

                  {/* Tags */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Tags
                    </label>
                    <input
                      type="text"
                      value={editData.tags}
                      onChange={(e) => setEditData({ ...editData, tags: e.target.value })}
                      placeholder="tag1, tag2, tag3..."
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg 
                                 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-1 
                                 focus:ring-blue-500 transition-colors"
                    />
                    <p className="text-xs text-gray-400 mt-1">Separate tags with commas</p>
                  </div>

                  {/* Save/Cancel Buttons */}
                  <div className="flex items-center space-x-3 pt-4">
                    <button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 
                                 text-white rounded-lg transition-colors flex items-center justify-center space-x-2"
                    >
                      {isSaving ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <CheckIcon className="h-4 w-4" />
                          <span>Save</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                /* View Mode */
                <div className="space-y-6">
                  <h4 className="text-lg font-semibold text-white">File Details</h4>

                  {/* Basic Info */}
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-400">Filename</label>
                      <p className="text-white">{file.original_filename}</p>
                    </div>

                    {file.title && (
                      <div>
                        <label className="text-sm font-medium text-gray-400">Title</label>
                        <p className="text-white">{file.title}</p>
                      </div>
                    )}

                    {file.caption && (
                      <div>
                        <label className="text-sm font-medium text-gray-400">Caption</label>
                        <p className="text-white">{file.caption}</p>
                      </div>
                    )}

                    {file.alt_text && (
                      <div>
                        <label className="text-sm font-medium text-gray-400">Alt Text</label>
                        <p className="text-white">{file.alt_text}</p>
                      </div>
                    )}
                  </div>

                  {/* Tags */}
                  {file.tags.length > 0 && (
                    <div>
                      <label className="text-sm font-medium text-gray-400 mb-2 block">Tags</label>
                      <div className="flex flex-wrap gap-2">
                        {file.tags.map((tag, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded-full flex items-center space-x-1"
                          >
                            <TagIcon className="h-3 w-3" />
                            <span>{tag}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Technical Info */}
                  <div className="space-y-3 pt-4 border-t border-gray-700">
                    <h5 className="text-sm font-medium text-gray-400">Technical Details</h5>
                    
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <label className="text-gray-400">Type</label>
                        <p className="text-white">{file.file_type.toUpperCase()}</p>
                      </div>
                      
                      <div>
                        <label className="text-gray-400">Size</label>
                        <p className="text-white">{formatFileSize(file.file_size)}</p>
                      </div>

                      {file.width && file.height && (
                        <div>
                          <label className="text-gray-400">Dimensions</label>
                          <p className="text-white">{file.width}×{file.height}</p>
                        </div>
                      )}

                      {file.duration && (
                        <div>
                          <label className="text-gray-400">Duration</label>
                          <p className="text-white">{Math.round(file.duration)}s</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Upload Info */}
                  <div className="space-y-3 pt-4 border-t border-gray-700">
                    <h5 className="text-sm font-medium text-gray-400">Upload Information</h5>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center space-x-2">
                        <ClockIcon className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-400">Uploaded</span>
                        <span className="text-white">{formatDistanceToNow(new Date(file.upload_date))} ago</span>
                      </div>

                      <div className="flex items-center space-x-2">
                        <EyeIcon className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-400">Downloads</span>
                        <span className="text-white">{file.download_count}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 