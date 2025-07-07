import React, { useState } from 'react';
import { HelpCircle, X, Keyboard } from 'lucide-react';
import { getMarkdownSyntaxHelp } from '../../utils/markdownShortcuts';
import { BaseModal } from './BaseModal';

interface MarkdownHelpHelpProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

export function MarkdownHelp({
  isOpen,
  onClose,
  className = ''
}: MarkdownHelpHelpProps) {
  const syntaxHelp = getMarkdownSyntaxHelp();

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Markdown Syntax Guide"
      size="xl"
      contentClassName="max-h-[80vh] overflow-hidden"
      titleIcon={<Keyboard size={20} className="text-gray-600" />}
    >
      {/* Content */}
      <div className="overflow-y-auto max-h-[calc(80vh-120px)] p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {syntaxHelp.map((item, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-sm text-blue-600 bg-blue-50 px-2 py-1 rounded">
                  {item.syntax}
                </span>
              </div>
              <div className="text-sm text-gray-700 mb-2">{item.description}</div>
              <div className="font-mono text-xs text-gray-600 bg-gray-50 p-2 rounded">
                {item.example}
              </div>
            </div>
          ))}
        </div>

        {/* Advanced Tips */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-medium text-blue-900 mb-3">Advanced Features:</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-blue-800">
            <div>
              <strong>Keyboard Shortcuts:</strong>
              <ul className="mt-1 space-y-1">
                <li>• Ctrl+B - Bold</li>
                <li>• Ctrl+I - Italic</li>
                <li>• Ctrl+U - Underline</li>
                <li>• Ctrl+K - Link</li>
              </ul>
            </div>
            <div>
              <strong>Auto-formatting:</strong>
              <ul className="mt-1 space-y-1">
                <li>• Type # + space for headings</li>
                <li>• Type - + space for lists</li>
                <li>• Type {'>'} + space for quotes</li>
                <li>• Type ``` + space for code</li>
              </ul>
            </div>
            <div>
              <strong>View Modes:</strong>
              <ul className="mt-1 space-y-1">
                <li>• Editor - Rich text editing</li>
                <li>• Preview - Markdown rendering</li>
                <li>• Split - Side-by-side view</li>
              </ul>
            </div>
            <div>
              <strong>File Operations:</strong>
              <ul className="mt-1 space-y-1">
                <li>• Import .md files</li>
                <li>• Export as markdown</li>
                <li>• Drag & drop support</li>
                <li>• Auto-save functionality</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </BaseModal>
  );
}

interface MarkdownHelpHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MarkdownHelpModal({ isOpen, onClose }: MarkdownHelpModalProps) {
  const syntaxHelp = getMarkdownSyntaxHelp();

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Markdown Syntax Guide"
      size="xl"
      contentClassName="max-h-[80vh] overflow-hidden"
      titleIcon={<Keyboard size={20} className="text-gray-600" />}
    >
      {/* Content */}
      <div className="overflow-y-auto max-h-[calc(80vh-120px)] p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {syntaxHelp.map((item, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-sm text-blue-600 bg-blue-50 px-2 py-1 rounded">
                  {item.syntax}
                </span>
              </div>
              <div className="text-sm text-gray-700 mb-2">{item.description}</div>
              <div className="font-mono text-xs text-gray-600 bg-gray-50 p-2 rounded">
                {item.example}
              </div>
            </div>
          ))}
        </div>

        {/* Advanced Tips */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-medium text-blue-900 mb-3">Advanced Features:</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-blue-800">
            <div>
              <strong>Keyboard Shortcuts:</strong>
              <ul className="mt-1 space-y-1">
                <li>• Ctrl+B - Bold</li>
                <li>• Ctrl+I - Italic</li>
                <li>• Ctrl+U - Underline</li>
                <li>• Ctrl+K - Link</li>
              </ul>
            </div>
            <div>
              <strong>Auto-formatting:</strong>
              <ul className="mt-1 space-y-1">
                <li>• Type # + space for headings</li>
                <li>• Type - + space for lists</li>
                <li>• Type {'>'} + space for quotes</li>
                <li>• Type ``` + space for code</li>
              </ul>
            </div>
            <div>
              <strong>View Modes:</strong>
              <ul className="mt-1 space-y-1">
                <li>• Editor - Rich text editing</li>
                <li>• Preview - Markdown rendering</li>
                <li>• Split - Side-by-side view</li>
              </ul>
            </div>
            <div>
              <strong>File Operations:</strong>
              <ul className="mt-1 space-y-1">
                <li>• Import .md files</li>
                <li>• Export as markdown</li>
                <li>• Drag & drop support</li>
                <li>• Auto-save functionality</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </BaseModal>
  );
}
