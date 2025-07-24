import React, { useState, useEffect } from 'react';
import { XMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { getContentBriefClearingPreview } from '../../lib/contentBriefApi';
import { format } from 'date-fns';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  briefId: string;
  briefTitle?: string;
  isDeleting?: boolean;
}

export function DeleteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  briefId,
  briefTitle,
  isDeleting = false
}: DeleteConfirmationModalProps) {
  const [preview, setPreview] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && briefId) {
      loadPreview();
    }
  }, [isOpen, briefId]);

  const loadPreview = async () => {
    setLoading(true);
    try {
      const result = await getContentBriefClearingPreview(briefId);
      if (result.success) {
        setPreview(result.preview);
      }
    } catch (error) {
      console.error('Error loading clearing preview:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <ExclamationTriangleIcon className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Clear Content Brief Data
            </h3>
          </div>
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
          >
            <XMarkIcon className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <p className="text-gray-700 dark:text-gray-300 mb-4">
                  Are you sure you want to clear the content brief data? This will remove the brief content but preserve any generated article.
                </p>

                {preview && (
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-3">
                    <div className="border-b border-gray-200 dark:border-gray-600 pb-3">
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {preview.title}
                      </h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Created {format(new Date(preview.createdAt), 'MMM d, yyyy')}
                      </p>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Brief content:</span>
                        <span className={`font-medium ${preview.hasBriefContent 
                          ? 'text-orange-600 dark:text-orange-400' 
                          : 'text-gray-500 dark:text-gray-500'
                        }`}>
                          {preview.hasBriefContent ? 'Will be cleared' : 'Already empty'}
                        </span>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Generated article:</span>
                        <span className={`font-medium ${preview.hasArticleContent 
                          ? 'text-green-600 dark:text-green-400' 
                          : 'text-gray-500 dark:text-gray-500'
                        }`}>
                          {preview.hasArticleContent ? 'Will be preserved' : 'No article'}
                        </span>
                      </div>

                      {preview.briefOnlyImageCount > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Brief-only images:</span>
                          <span className="font-medium text-orange-600 dark:text-orange-400">
                            {preview.briefOnlyImageCount} will be deleted
                          </span>
                        </div>
                      )}

                      {preview.articleImageCount > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Article images:</span>
                          <span className="font-medium text-green-600 dark:text-green-400">
                            {preview.articleImageCount} will be preserved
                          </span>
                        </div>
                      )}

                      {preview.commentCount > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Comments:</span>
                          <span className="font-medium text-green-600 dark:text-green-400">
                            {preview.commentCount} will be preserved
                          </span>
                        </div>
                      )}

                      {preview.versionCount > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Version history:</span>
                          <span className="font-medium text-green-600 dark:text-green-400">
                            {preview.versionCount} versions will be preserved
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    <strong>Note:</strong> This will only clear the content brief data (brief_content, internal_links, etc.) while preserving the generated article content, comments, version history, and collaboration records.
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 justify-end">
                <button
                  onClick={onClose}
                  disabled={isDeleting}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={onConfirm}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isDeleting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Clearing...
                    </>
                  ) : (
                    'Clear Content Brief Data'
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}