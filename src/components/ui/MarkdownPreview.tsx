import React from 'react';
import { markdownToHtml } from '../../utils/markdownConverter';
import { BaseModal } from './BaseModal';

interface MarkdownPreviewProps {
  markdown: string;
  className?: string;
}

export function MarkdownPreview({ markdown, className = '' }: MarkdownPreviewProps) {
  const htmlContent = markdownToHtml(markdown);

  return (
    <div
      className={`prose prose-lg max-w-none p-6 bg-white ${className}`}
      dangerouslySetInnerHTML={{ __html: htmlContent }}
      style={{
        // Custom CSS for markdown rendering
        fontSize: '16px',
        lineHeight: '1.6',
        color: '#374151',
      }}
    />
  );
}

interface MarkdownPreviewModalProps {
  markdown: string;
  isOpen: boolean;
  onClose: () => void;
  title?: string;
}

export function MarkdownPreviewModal({ markdown, isOpen, onClose, title }: MarkdownPreviewModalProps) {
  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={title || 'Markdown Preview'}
      size="xl"
      contentClassName="max-h-[90vh] overflow-hidden"
    >
      {/* Preview Content */}
      <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
        <MarkdownPreview markdown={markdown} />
      </div>
    </BaseModal>
  );
}

interface SplitViewProps {
  leftContent: React.ReactNode;
  rightContent: React.ReactNode;
  className?: string;
}

export function SplitView({ leftContent, rightContent, className = '' }: SplitViewProps) {
  return (
    <div className={`flex h-full ${className}`}>
      {/* Left Panel - Editor */}
      <div className="flex-1 border-r border-gray-300">
        {leftContent}
      </div>
      
      {/* Right Panel - Preview */}
      <div className="flex-1 bg-gray-50">
        {rightContent}
      </div>
    </div>
  );
} 