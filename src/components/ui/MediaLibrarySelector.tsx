import React, { useState } from 'react';
import { X, Upload, FolderOpen } from 'lucide-react';
import { ImageUpload } from './ImageUpload';
import ImageRepositoryPage from '../media/ImageRepositoryPage';
import { MediaFile } from '../../lib/storage';
import { supabase } from '../../lib/supabase';

interface MediaLibrarySelectorProps {
  onImageInsert: (url: string, metadata?: ImageMetadata) => void;
  onClose: () => void;
  articleId?: string;
  companyName?: string;
}

interface ImageMetadata {
  id?: string;
  filename: string;
  altText: string;
  caption: string;
  width: number;
  height: number;
  fileSize: number;
  mimeType: string;
  storagePath: string;
}

type TabType = 'upload' | 'library';

export const MediaLibrarySelector: React.FC<MediaLibrarySelectorProps> = ({
  onImageInsert,
  onClose,
  articleId,
  companyName
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('upload');

  const handleMediaSelect = async (media: MediaFile) => {
    try {
      console.log('Media selected:', media);
      
      // Get the public URL for the selected media file
      const { data: urlData } = supabase.storage
        .from('media-library')
        .getPublicUrl(media.file_path);
      
      console.log('Generated URL:', urlData.publicUrl);

      // Convert MediaFile to ImageMetadata format
      const metadata: ImageMetadata = {
        id: media.id,
        filename: media.original_filename || media.filename,
        altText: media.original_filename || media.filename, // Use filename as alt text
        caption: '', // No caption field in database
        width: media.width || 0,
        height: media.height || 0,
        fileSize: media.file_size,
        mimeType: media.mime_type,
        storagePath: media.file_path
      };

      console.log('Calling onImageInsert with:', urlData.publicUrl, metadata);
      onImageInsert(urlData.publicUrl, metadata);
      onClose();
    } catch (error) {
      console.error('Failed to select media:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] mx-4 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b flex-shrink-0">
          <h2 className="text-xl font-semibold text-gray-900">Select Image</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-md transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b flex-shrink-0">
          <button
            onClick={() => setActiveTab('upload')}
            className={`px-6 py-3 font-medium transition-colors relative ${
              activeTab === 'upload'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Upload size={16} />
              <span>Upload New</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('library')}
            className={`px-6 py-3 font-medium transition-colors relative ${
              activeTab === 'library'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center space-x-2">
              <FolderOpen size={16} />
              <span>Media Library</span>
            </div>
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 p-6 overflow-y-auto min-h-0">
          {activeTab === 'upload' ? (
            <div className="flex items-start justify-center">
              <div className="w-full max-w-md">
                <ImageUpload
                  onImageInsert={(url, metadata) => {
                    onImageInsert(url, metadata);
                    onClose();
                  }}
                  articleId={articleId}
                  className="border-0 bg-transparent p-0"
                />
              </div>
            </div>
          ) : (
            <div className="h-full overflow-auto">
              <ImageRepositoryPage
                companyName={companyName}
                onMediaSelect={handleMediaSelect}
                allowSelection={true}
                maxSelection={1}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};