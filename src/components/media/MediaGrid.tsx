import React from 'react';
import { MediaFile, MediaFolder } from '../../lib/storage';
import { 
  FolderIcon,
  PhotoIcon,
  VideoCameraIcon,
  PlayIcon,
  TrashIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  CheckIcon
} from '@heroicons/react/24/outline';
import { formatDistanceToNow } from 'date-fns';

interface MediaGridProps {
  files: MediaFile[];
  folders: MediaFolder[];
  viewMode: 'grid' | 'list';
  allowSelection?: boolean;
  selectedFiles: Set<string>;
  onFileSelection: (fileId: string, selected: boolean) => void;
  onFilePreview: (file: MediaFile) => void;
  onFileDelete: (fileId: string) => void;
  onFolderClick: (folderId: string) => void;
  onMediaSelect?: (file: MediaFile) => void;
}

export default function MediaGrid({
  files,
  folders,
  viewMode,
  allowSelection = false,
  selectedFiles,
  onFileSelection,
  onFilePreview,
  onFileDelete,
  onFolderClick,
  onMediaSelect
}: MediaGridProps) {
  
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

  // Get file type icon
  const getFileTypeIcon = (file: MediaFile, className: string = "h-6 w-6") => {
    switch (file.file_type) {
      case 'video':
        return <VideoCameraIcon className={className} />;
      case 'gif':
        return <PlayIcon className={className} />;
      default:
        return <PhotoIcon className={className} />;
    }
  };

  // Handle file click
  const handleFileClick = (file: MediaFile) => {
    if (onMediaSelect) {
      onMediaSelect(file);
    } else {
      onFilePreview(file);
    }
  };

  // Grid View Component
  const GridView = () => (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {/* Folders */}
      {folders.map((folder) => (
        <div
          key={folder.id}
          onClick={() => onFolderClick(folder.id)}
          className="group relative bg-gray-800 rounded-lg border border-gray-700 hover:border-gray-600 
                     cursor-pointer transition-all duration-200 hover:bg-gray-750 p-4"
        >
          <div className="flex flex-col items-center text-center">
            <FolderIcon className="h-12 w-12 text-blue-400 mb-2" />
            <div className="text-sm font-medium text-white truncate w-full" title={folder.name}>
              {folder.name}
            </div>
            {folder.description && (
              <div className="text-xs text-gray-400 truncate w-full mt-1" title={folder.description}>
                {folder.description}
              </div>
            )}
          </div>
        </div>
      ))}

      {/* Files */}
      {files.map((file) => (
        <div
          key={file.id}
          className="group relative bg-gray-800 rounded-lg border border-gray-700 hover:border-gray-600 
                     transition-all duration-200 overflow-hidden"
        >
          {/* Selection Checkbox */}
          {allowSelection && (
            <div className="absolute top-2 left-2 z-10">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onFileSelection(file.id, !selectedFiles.has(file.id));
                }}
                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                  selectedFiles.has(file.id)
                    ? 'bg-blue-600 border-blue-600'
                    : 'border-gray-400 hover:border-gray-300 bg-gray-800 bg-opacity-75'
                }`}
              >
                {selectedFiles.has(file.id) && (
                  <CheckIcon className="h-3 w-3 text-white" />
                )}
              </button>
            </div>
          )}

          {/* File Preview */}
          <div 
            className="aspect-square bg-gray-700 flex items-center justify-center cursor-pointer"
            onClick={() => handleFileClick(file)}
          >
            {file.file_type === 'image' || file.file_type === 'gif' ? (
              <img
                src={file.file_path.startsWith('http') ? file.file_path : `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/media-library/${file.file_path.split('/').map(segment => encodeURIComponent(segment)).join('/')}`}
                alt={file.alt_text || file.original_filename}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="flex flex-col items-center text-gray-400">
                {getFileTypeIcon(file, "h-8 w-8")}
                <span className="text-xs mt-1">{file.file_type.toUpperCase()}</span>
              </div>
            )}
          </div>

          {/* File Info */}
          <div className="p-3">
            <div className="text-sm font-medium text-white truncate" title={file.title || file.original_filename}>
              {file.title || file.original_filename}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {formatFileSize(file.file_size)}
            </div>
            {file.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {file.tags.slice(0, 2).map((tag, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded"
                  >
                    {tag}
                  </span>
                ))}
                {file.tags.length > 2 && (
                  <span className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded">
                    +{file.tags.length - 2}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 
                          transition-opacity duration-200 flex items-center justify-center space-x-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onFilePreview(file);
              }}
              className="p-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
              title="Preview"
            >
              <EyeIcon className="h-4 w-4" />
            </button>
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                const link = document.createElement('a');
                link.href = file.file_path.startsWith('http') ? file.file_path : `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/media-library/${file.file_path.split('/').map(segment => encodeURIComponent(segment)).join('/')}`;
                link.download = file.original_filename;
                link.click();
              }}
              className="p-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
              title="Download"
            >
              <ArrowDownTrayIcon className="h-4 w-4" />
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm(`Are you sure you want to delete "${file.title || file.original_filename}"?\n\nThis will permanently remove the file from the media library.`)) {
                  onFileDelete(file.id);
                }
              }}
              className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors shadow-md hover:shadow-lg"
              title="Delete permanently"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );

  // List View Component
  const ListView = () => (
    <div className="space-y-2">
      {/* Folders */}
      {folders.map((folder) => (
        <div
          key={folder.id}
          onClick={() => onFolderClick(folder.id)}
          className="flex items-center space-x-4 p-4 bg-gray-800 rounded-lg border border-gray-700 
                     hover:border-gray-600 cursor-pointer transition-colors group"
        >
          <FolderIcon className="h-8 w-8 text-blue-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-white truncate">
              {folder.name}
            </div>
            {folder.description && (
              <div className="text-xs text-gray-400 truncate">
                {folder.description}
              </div>
            )}
          </div>
          <div className="text-xs text-gray-500">
            {formatDistanceToNow(new Date(folder.created_at))} ago
          </div>
        </div>
      ))}

      {/* Files */}
      {files.map((file) => (
        <div
          key={file.id}
          className="flex items-center space-x-4 p-4 bg-gray-800 rounded-lg border border-gray-700 
                     hover:border-gray-600 transition-colors group"
        >
          {/* Selection Checkbox */}
          {allowSelection && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onFileSelection(file.id, !selectedFiles.has(file.id));
              }}
              className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                selectedFiles.has(file.id)
                  ? 'bg-blue-600 border-blue-600'
                  : 'border-gray-400 hover:border-gray-300'
              }`}
            >
              {selectedFiles.has(file.id) && (
                <CheckIcon className="h-3 w-3 text-white" />
              )}
            </button>
          )}

          {/* File Thumbnail */}
          <div 
            className="w-12 h-12 bg-gray-700 rounded flex items-center justify-center flex-shrink-0 cursor-pointer"
            onClick={() => handleFileClick(file)}
          >
            {file.file_type === 'image' || file.file_type === 'gif' ? (
              <img
                src={file.file_path.startsWith('http') ? file.file_path : `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/media-library/${file.file_path.split('/').map(segment => encodeURIComponent(segment)).join('/')}`}
                alt={file.alt_text || file.original_filename}
                className="w-full h-full object-cover rounded"
                loading="lazy"
              />
            ) : (
              getFileTypeIcon(file, "h-6 w-6 text-gray-400")
            )}
          </div>

          {/* File Info */}
          <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handleFileClick(file)}>
            <div className="text-sm font-medium text-white truncate">
              {file.title || file.original_filename}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {formatFileSize(file.file_size)} • {file.file_type.toUpperCase()}
              {file.width && file.height && (
                <span> • {file.width}×{file.height}</span>
              )}
            </div>
            {file.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {file.tags.slice(0, 3).map((tag, index) => (
                  <span
                    key={index}
                    className="px-1 py-0.5 bg-gray-700 text-gray-300 text-xs rounded"
                  >
                    {tag}
                  </span>
                ))}
                {file.tags.length > 3 && (
                  <span className="px-1 py-0.5 bg-gray-700 text-gray-300 text-xs rounded">
                    +{file.tags.length - 3}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Upload Date */}
          <div className="text-xs text-gray-500 flex-shrink-0">
            {formatDistanceToNow(new Date(file.upload_date))} ago
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onFilePreview(file);
              }}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
              title="Preview"
            >
              <EyeIcon className="h-4 w-4" />
            </button>
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                const link = document.createElement('a');
                link.href = file.file_path.startsWith('http') ? file.file_path : `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/media-library/${file.file_path.split('/').map(segment => encodeURIComponent(segment)).join('/')}`;
                link.download = file.original_filename;
                link.click();
              }}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
              title="Download"
            >
              <ArrowDownTrayIcon className="h-4 w-4" />
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm(`Are you sure you want to delete "${file.title || file.original_filename}"?\n\nThis will permanently remove the file from the media library.`)) {
                  onFileDelete(file.id);
                }
              }}
              className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-700/20 rounded transition-colors"
              title="Delete permanently"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );

  // Empty State
  if (folders.length === 0 && files.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <PhotoIcon className="h-12 w-12 mx-auto mb-4 text-gray-600" />
        <h3 className="text-lg font-medium text-gray-300 mb-2">No media files</h3>
        <p className="text-sm">Upload your first image, video, or GIF to get started</p>
      </div>
    );
  }

  return viewMode === 'grid' ? <GridView /> : <ListView />;
} 