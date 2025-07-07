import React, { useState, useRef, useCallback } from 'react';
import { 
  CloudArrowUpIcon, 
  PhotoIcon, 
  VideoCameraIcon,
  DocumentIcon
} from '@heroicons/react/24/outline';

interface MediaUploadZoneProps {
  onFileUpload: (files: File[]) => void;
  isUploading: boolean;
  className?: string;
  maxFiles?: number;
  maxSize?: number; // in MB
  acceptedTypes?: string[];
}

export default function MediaUploadZone({
  onFileUpload,
  isUploading,
  className = '',
  maxFiles = 10,
  maxSize = 50,
  acceptedTypes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/webm',
    'video/mov',
    'video/avi'
  ]
}: MediaUploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle drag events
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter(prev => prev + 1);
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragOver(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter(prev => {
      const newCounter = prev - 1;
      if (newCounter === 0) {
        setIsDragOver(false);
      }
      return newCounter;
    });
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    setDragCounter(0);

    const files = Array.from(e.dataTransfer.files);
    handleFileSelection(files);
  }, []);

  // Validate and process files
  const handleFileSelection = (files: File[]) => {
    if (isUploading) return;

    const validFiles: File[] = [];
    const errors: string[] = [];

    // Check file count
    if (files.length > maxFiles) {
      errors.push(`Maximum ${maxFiles} files allowed`);
      return;
    }

    files.forEach((file, index) => {
      // Check file type
      if (!acceptedTypes.includes(file.type)) {
        errors.push(`"${file.name}" is not a supported file type`);
        return;
      }

      // Check file size
      const fileSizeMB = file.size / (1024 * 1024);
      if (fileSizeMB > maxSize) {
        errors.push(`"${file.name}" exceeds ${maxSize}MB size limit`);
        return;
      }

      validFiles.push(file);
    });

    // Show errors if any
    if (errors.length > 0) {
      alert(errors.join('\n'));
    }

    // Upload valid files
    if (validFiles.length > 0) {
      onFileUpload(validFiles);
    }
  };

  // Handle file input change
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    handleFileSelection(files);
    // Reset input value to allow re-upload of same file
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle click to open file dialog
  const handleClick = () => {
    if (!isUploading && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Format accepted types for display
  const getAcceptedTypesText = () => {
    const imageTypes = acceptedTypes.filter(type => type.startsWith('image/'));
    const videoTypes = acceptedTypes.filter(type => type.startsWith('video/'));
    
    const formats: string[] = [];
    if (imageTypes.length > 0) formats.push('Images');
    if (videoTypes.length > 0) formats.push('Videos');
    
    return formats.join(', ');
  };

  // Get file type icon
  const getFileTypeIcon = (type: string) => {
    if (type.startsWith('image/')) {
      return <PhotoIcon className="h-8 w-8" />;
    } else if (type.startsWith('video/')) {
      return <VideoCameraIcon className="h-8 w-8" />;
    } else {
      return <DocumentIcon className="h-8 w-8" />;
    }
  };

  return (
    <div className={className}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={acceptedTypes.join(',')}
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* Upload Zone */}
      <div
        onClick={handleClick}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
          transition-all duration-200 ease-in-out
          ${isUploading 
            ? 'border-blue-400 bg-blue-950 cursor-not-allowed' 
            : isDragOver 
              ? 'border-blue-400 bg-blue-950 scale-[1.02]' 
              : 'border-gray-600 bg-gray-800 hover:border-gray-500 hover:bg-gray-750'
          }
        `}
      >
        {/* Upload Content */}
        <div className="flex flex-col items-center space-y-4">
          {/* Icon */}
          <div className={`p-3 rounded-full ${
            isUploading 
              ? 'bg-blue-600' 
              : isDragOver 
                ? 'bg-blue-600' 
                : 'bg-gray-700'
          }`}>
            {isUploading ? (
              <div className="h-8 w-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <CloudArrowUpIcon className={`h-8 w-8 ${
                isDragOver ? 'text-white' : 'text-gray-400'
              }`} />
            )}
          </div>

          {/* Text */}
          <div className="space-y-2">
            {isUploading ? (
              <>
                <h3 className="text-lg font-medium text-white">Uploading files...</h3>
                <p className="text-sm text-blue-300">Please wait while your files are being uploaded</p>
              </>
            ) : isDragOver ? (
              <>
                <h3 className="text-lg font-medium text-white">Drop files here</h3>
                <p className="text-sm text-blue-300">Release to upload your files</p>
              </>
            ) : (
              <>
                <h3 className="text-lg font-medium text-white">Upload media files</h3>
                <p className="text-sm text-gray-400">
                  Drag & drop files here, or <span className="text-blue-400 underline">click to browse</span>
                </p>
              </>
            )}
          </div>

          {/* File Types and Limits */}
          {!isUploading && (
            <div className="space-y-2">
              {/* Supported file types */}
              <div className="flex items-center justify-center space-x-4 text-gray-500">
                {acceptedTypes.includes('image/jpeg') && (
                  <div className="flex items-center space-x-1">
                    <PhotoIcon className="h-4 w-4" />
                    <span className="text-xs">Images</span>
                  </div>
                )}
                {acceptedTypes.some(type => type.startsWith('video/')) && (
                  <div className="flex items-center space-x-1">
                    <VideoCameraIcon className="h-4 w-4" />
                    <span className="text-xs">Videos</span>
                  </div>
                )}
              </div>

              {/* Limits */}
              <div className="text-xs text-gray-500 space-y-1">
                <div>Maximum {maxFiles} files • Up to {maxSize}MB each</div>
                <div className="flex flex-wrap justify-center gap-2">
                  {acceptedTypes.map((type, index) => {
                    const extension = type.split('/')[1].toUpperCase();
                    return (
                      <span key={index} className="px-2 py-1 bg-gray-700 rounded text-xs">
                        {extension}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Upload Overlay for Drag State */}
        {isDragOver && (
          <div className="absolute inset-0 bg-blue-600 bg-opacity-20 rounded-lg flex items-center justify-center">
            <div className="text-white text-xl font-medium">Drop to upload</div>
          </div>
        )}
      </div>

      {/* Additional Upload Options */}
      {!isUploading && (
        <div className="mt-4 flex items-center justify-between text-sm text-gray-400">
          <div className="flex items-center space-x-4">
            <span>Supported: {getAcceptedTypesText()}</span>
          </div>
          
          <div className="flex items-center space-x-2">
            <span>Quick upload:</span>
            <button
              onClick={handleClick}
              className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white 
                         rounded transition-colors text-xs"
            >
              Browse Files
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 