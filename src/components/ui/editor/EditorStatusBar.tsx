import React from 'react';
import { MessageCircle } from 'lucide-react';

export interface EditorStatusBarProps {
  wordCount: number;
  charCount: number;
  readingTime: number;
  commentCount?: number;
  showComments?: boolean;
}

export const EditorStatusBar: React.FC<EditorStatusBarProps> = ({
  wordCount,
  charCount,
  readingTime,
  commentCount = 0,
  showComments = false,
}) => {
  return (
    <div className="text-sm text-gray-700 bg-gray-200/80 px-3 py-2 rounded-lg backdrop-blur-sm">
      <div className="flex items-center gap-4">
        <span className="font-medium">{wordCount} words</span>
        <span>{charCount} chars</span>
        <span>{readingTime} min read</span>
        {showComments && commentCount > 0 && (
          <span className="flex items-center gap-1">
            <MessageCircle className="w-3 h-3" />
            <span>{commentCount}</span>
          </span>
        )}
      </div>
    </div>
  );
};