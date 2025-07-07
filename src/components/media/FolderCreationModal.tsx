import React, { useState } from 'react';
import { XMarkIcon, FolderIcon } from '@heroicons/react/24/outline';

interface FolderCreationModalProps {
  onClose: () => void;
  onCreateFolder: (name: string, description?: string) => Promise<void>;
}

export default function FolderCreationModal({
  onClose,
  onCreateFolder
}: FolderCreationModalProps) {
  const [folderName, setFolderName] = useState('');
  const [description, setDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!folderName.trim()) {
      setError('Folder name is required');
      return;
    }

    if (folderName.length > 100) {
      setError('Folder name must be less than 100 characters');
      return;
    }

    if (description.length > 500) {
      setError('Description must be less than 500 characters');
      return;
    }

    setIsCreating(true);
    setError('');

    try {
      await onCreateFolder(folderName.trim(), description.trim() || undefined);
      // Modal will be closed by parent component on success
    } catch (error) {
      console.error('Error creating folder:', error);
      setError('Failed to create folder. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="flex items-center justify-center min-h-screen px-4 text-center">
        <div 
          className="fixed inset-0 bg-black opacity-50 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div 
          className="relative bg-gray-800 rounded-xl shadow-xl max-w-md w-full mx-auto p-6 text-left"
          onKeyDown={handleKeyDown}
          tabIndex={-1}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <FolderIcon className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white">Create New Folder</h3>
            </div>
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-white transition-colors rounded"
              disabled={isCreating}
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Folder Name */}
            <div>
              <label htmlFor="folderName" className="block text-sm font-medium text-gray-300 mb-2">
                Folder Name *
              </label>
              <input
                id="folderName"
                type="text"
                value={folderName}
                onChange={(e) => {
                  setFolderName(e.target.value);
                  setError('');
                }}
                placeholder="Enter folder name..."
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white 
                           placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 
                           transition-colors"
                maxLength={100}
                disabled={isCreating}
                autoFocus
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>Use descriptive names for better organization</span>
                <span>{folderName.length}/100</span>
              </div>
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-2">
                Description (Optional)
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter a brief description..."
                rows={3}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white 
                           placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 
                           transition-colors resize-none"
                maxLength={500}
                disabled={isCreating}
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>Help others understand what this folder contains</span>
                <span>{description.length}/500</span>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-900 border border-red-700 rounded-lg">
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                disabled={isCreating}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!folderName.trim() || isCreating}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 
                           disabled:cursor-not-allowed text-white rounded-lg transition-colors 
                           flex items-center space-x-2"
              >
                {isCreating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Creating...</span>
                  </>
                ) : (
                  <>
                    <FolderIcon className="h-4 w-4" />
                    <span>Create Folder</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Tips */}
          <div className="mt-6 pt-4 border-t border-gray-700">
            <h4 className="text-sm font-medium text-gray-300 mb-2">Tips:</h4>
            <ul className="text-xs text-gray-400 space-y-1">
              <li>• Use clear, descriptive names for easy identification</li>
              <li>• Consider organizing by project, date, or content type</li>
              <li>• Folders help keep your media library organized and searchable</li>
              <li>• You can create nested folders by creating sub-folders later</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
} 