import React from 'react';
import { Editor } from '@tiptap/react';
import {
  Save,
  Download,
  Upload,
  Image as ImageIcon,
  Link as LinkIcon,
  Type,
  List,
  ListOrdered,
  Quote,
  Code,
  Table as TableIcon,
  Palette,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Highlighter,
  Undo,
  Redo,
  ChevronDown,
  MessageCircle,
  Maximize2,
  Minimize2,
  FocusIcon,
  Eye,
  MoreVertical,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Settings,
  PaintBucket,
  ArrowLeft,
  Columns,
} from 'lucide-react';
import { ExportButton } from '../ExportButton';
import { ToolbarButton } from '../ToolbarButton';
import { ArticleColorPicker } from '../ArticleColorPicker';
import { StatusIndicator } from '../StatusIndicator';
import { ToolbarSeparator } from '../ToolbarSeparator';
import { UndoRedoHistory } from './UndoRedoHistory';
import UserPresence from '../UserPresence';
import type { UnifiedArticleContent } from '../../../lib/unifiedArticleApi';

export interface EditorToolbarProps {
  editor: Editor | null;
  onSave: () => void;
  onExport?: () => void;
  onImageInsert: () => void;
  showComments: boolean;
  onToggleComments: () => void;
  saveStatus: 'saved' | 'saving' | 'error' | null;
  isAutoSaving: boolean;
  lastSaved: Date | null;
  adminMode?: boolean;
  articleId?: string;
  article?: UnifiedArticleContent | null;
  comments: any[];
  wordCount: number;
  charCount: number;
  readingTime: number;
  focusMode: 'normal' | 'focused' | 'zen';
  onFocusModeChange: (mode: 'normal' | 'focused' | 'zen') => void;
  viewMode: 'editor' | 'preview' | 'split';
  onViewModeChange: (mode: 'editor' | 'preview' | 'split') => void;
  isFullscreen: boolean;
  onFullscreenToggle: () => void;
  onBack?: () => void;
  isAiCopilotOpen?: boolean;
  screenSize?: 'mobile' | 'tablet' | 'desktop';
  currentTextColor: string;
  currentHighlightColor: string;
  onTextColorChange: (color: string) => void;
  onHighlightColorChange: (color: string) => void;
  onLinkInsert: () => void;
  onSettingsOpen?: () => void;
  onHelpOpen?: () => void;
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({
  editor,
  onSave,
  onExport,
  onImageInsert,
  showComments,
  onToggleComments,
  saveStatus,
  isAutoSaving,
  lastSaved,
  adminMode = false,
  articleId,
  article,
  comments,
  wordCount,
  charCount,
  readingTime,
  focusMode,
  onFocusModeChange,
  viewMode,
  onViewModeChange,
  isFullscreen,
  onFullscreenToggle,
  onBack,
  isAiCopilotOpen = false,
  screenSize = 'desktop',
  currentTextColor,
  currentHighlightColor,
  onTextColorChange,
  onHighlightColorChange,
  onLinkInsert,
  onSettingsOpen,
  onHelpOpen,
}) => {
  // Text formatting functions
  const toggleBold = () => editor?.chain().focus().toggleBold().run();
  const toggleItalic = () => editor?.chain().focus().toggleItalic().run();
  const toggleUnderline = () => editor?.chain().focus().toggleUnderline().run();
  const toggleStrike = () => editor?.chain().focus().toggleStrike().run();
  const toggleBulletList = () => editor?.chain().focus().toggleBulletList().run();
  const toggleOrderedList = () => editor?.chain().focus().toggleOrderedList().run();
  const toggleBlockquote = () => editor?.chain().focus().toggleBlockquote().run();
  const toggleCodeBlock = () => editor?.chain().focus().toggleCodeBlock().run();
  const toggleHeading = (level: 1 | 2 | 3 | 4) => {
    editor?.chain().focus().toggleHeading({ level }).run();
  };
  const setTextAlign = (align: 'left' | 'center' | 'right') => {
    editor?.chain().focus().setTextAlign(align).run();
  };
  const setTextColor = (color: string) => {
    editor?.chain().focus().setColor(color).run();
  };
  const setHighlight = (color: string) => {
    editor?.chain().focus().toggleHighlight({ color }).run();
  };

  const isMobile = screenSize === 'mobile';
  const shouldWrapToolbar = isAiCopilotOpen || isMobile || showComments;

  return (
    <div 
      className={`
        ${focusMode === 'zen' ? 'hidden' : 'block'}
        bg-white backdrop-blur-xl border-b border-gray-200/50 px-6 py-4
        sticky top-0 z-[9999] shadow-sm
      `}
    >
      {/* Top toolbar row */}
      <div className={`${shouldWrapToolbar ? 'flex flex-wrap items-center gap-2 justify-between' : 'flex items-center justify-between'} mb-4`}>
        {/* Left: File operations */}
        <div className="flex items-center gap-3">
          {onBack && (
            <ToolbarButton
              icon={ArrowLeft}
              label="Go Back"
              onClick={onBack}
              variant="ghost"
              size="md"
            >
              Back
            </ToolbarButton>
          )}
          <ToolbarButton
            icon={Save}
            label="Save (Ctrl+S)"
            onClick={onSave}
            disabled={isAutoSaving}
            variant="primary"
            size="md"
          >
            Save
          </ToolbarButton>
          
          <div className="flex items-center bg-gray-200/90 rounded-xl p-1 gap-1">
            <ExportButton 
              editor={editor}
              articleTitle={article?.title || 'Untitled Article'}
              articleId={articleId}
            />
            <ToolbarButton
              icon={Upload}
              label="Import"
              onClick={onImageInsert}
              variant="ghost"
              size="sm"
            />
          </div>
        </div>

        {/* Center: Status indicator */}
        <div className="flex items-center gap-3">
          <StatusIndicator 
            status={saveStatus}
            isAutoSaving={isAutoSaving}
            lastSaved={lastSaved}
          />
          {articleId && (
            <UserPresence articleId={articleId} />
          )}
        </div>

        {/* Right: View and settings controls */}
        <div className="flex items-center gap-3">
          {/* Focus and theme controls */}
          <div className="flex items-center bg-gray-200/90 rounded-xl p-1 gap-1">
            <ToolbarButton
              icon={MessageCircle}
              label="Toggle Comments (Ctrl+M)"
              isActive={showComments}
              onClick={onToggleComments}
              variant={showComments ? 'primary' : 'ghost'}
              size="sm"
              badge={comments.length > 0 ? comments.length : undefined}
            />
            <ToolbarButton
              icon={focusMode === 'zen' ? Minimize2 : Maximize2}
              label={focusMode === 'zen' ? 'Exit Zen Mode' : 'Zen Mode'}
              onClick={() => onFocusModeChange(focusMode === 'zen' ? 'normal' : 'zen')}
              variant="ghost"
              size="sm"
            />
            <ToolbarButton
              icon={viewMode === 'split' ? Columns : Eye}
              label={viewMode === 'editor' ? 'Preview' : viewMode === 'preview' ? 'Split View' : 'Editor'}
              onClick={() => {
                const nextMode = viewMode === 'editor' ? 'preview' : viewMode === 'preview' ? 'split' : 'editor';
                onViewModeChange(nextMode);
              }}
              variant="ghost"
              size="sm"
            />
          </div>

          {/* Settings and help */}
          <div className="flex items-center bg-gray-200/90 rounded-xl p-1">
            {onSettingsOpen && (
              <ToolbarButton
                icon={Settings}
                label="Settings"
                onClick={onSettingsOpen}
                variant="ghost"
                size="sm"
              />
            )}
            <ToolbarButton
              icon={MoreVertical}
              label="More Options"
              onClick={() => {}}
              variant="ghost"
              size="sm"
            />
          </div>
        </div>
      </div>

      {/* Bottom toolbar row - formatting tools */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {/* Left: Formatting tools */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Undo/Redo */}
          <div className="flex items-center bg-gray-200/90 rounded-xl p-1">
            <UndoRedoHistory editor={editor} />
          </div>

          <ToolbarSeparator />

          {/* Text formatting */}
          <div className="flex items-center bg-gray-200/90 rounded-xl p-1">
            <ToolbarButton
              icon={Bold}
              label="Bold (Ctrl+B)"
              isActive={editor?.isActive('bold')}
              onClick={toggleBold}
              variant="ghost"
              size="sm"
            />
            <ToolbarButton
              icon={Italic}
              label="Italic (Ctrl+I)"
              isActive={editor?.isActive('italic')}
              onClick={toggleItalic}
              variant="ghost"
              size="sm"
            />
            <ToolbarButton
              icon={UnderlineIcon}
              label="Underline (Ctrl+U)"
              isActive={editor?.isActive('underline')}
              onClick={toggleUnderline}
              variant="ghost"
              size="sm"
            />
            <ToolbarButton
              icon={Strikethrough}
              label="Strikethrough"
              isActive={editor?.isActive('strike')}
              onClick={toggleStrike}
              variant="ghost"
              size="sm"
            />
          </div>

          <ToolbarSeparator />

          {/* Headings */}
          <div className="flex items-center bg-gray-200/90 rounded-xl p-1">
            <ToolbarButton
              icon={Heading1}
              label="Heading 1"
              isActive={editor?.isActive('heading', { level: 1 })}
              onClick={() => toggleHeading(1)}
              variant="ghost"
              size="sm"
            />
            <ToolbarButton
              icon={Heading2}
              label="Heading 2"
              isActive={editor?.isActive('heading', { level: 2 })}
              onClick={() => toggleHeading(2)}
              variant="ghost"
              size="sm"
            />
            <ToolbarButton
              icon={Heading3}
              label="Heading 3"
              isActive={editor?.isActive('heading', { level: 3 })}
              onClick={() => toggleHeading(3)}
              variant="ghost"
              size="sm"
            />
            <ToolbarButton
              icon={Heading4}
              label="Heading 4"
              isActive={editor?.isActive('heading', { level: 4 })}
              onClick={() => toggleHeading(4)}
              variant="ghost"
              size="sm"
            />
          </div>

          <ToolbarSeparator />

          {/* Lists and alignment */}
          <div className="flex items-center bg-gray-200/90 rounded-xl p-1">
            <ToolbarButton
              icon={List}
              label="Bullet List"
              isActive={editor?.isActive('bulletList')}
              onClick={toggleBulletList}
              variant="ghost"
              size="sm"
            />
            <ToolbarButton
              icon={ListOrdered}
              label="Numbered List"
              isActive={editor?.isActive('orderedList')}
              onClick={toggleOrderedList}
              variant="ghost"
              size="sm"
            />
          </div>

          <ToolbarSeparator />

          {/* Text alignment */}
          <div className="flex items-center bg-gray-200/90 rounded-xl p-1">
            <ToolbarButton
              icon={AlignLeft}
              label="Align Left"
              isActive={editor?.isActive({ textAlign: 'left' })}
              onClick={() => setTextAlign('left')}
              variant="ghost"
              size="sm"
            />
            <ToolbarButton
              icon={AlignCenter}
              label="Align Center"
              isActive={editor?.isActive({ textAlign: 'center' })}
              onClick={() => setTextAlign('center')}
              variant="ghost"
              size="sm"
            />
            <ToolbarButton
              icon={AlignRight}
              label="Align Right"
              isActive={editor?.isActive({ textAlign: 'right' })}
              onClick={() => setTextAlign('right')}
              variant="ghost"
              size="sm"
            />
          </div>
        </div>

        {/* Right: Advanced tools and stats */}
        <div className="flex items-center gap-3">
          {/* Insert tools */}
          <div className="flex items-center bg-gray-200/90 rounded-xl p-1">
            <ToolbarButton
              icon={LinkIcon}
              label="Insert Link"
              isActive={editor?.isActive('link')}
              onClick={onLinkInsert}
              variant="ghost"
              size="sm"
            />
            <ToolbarButton
              icon={ImageIcon}
              label="Insert Image"
              onClick={onImageInsert}
              variant="ghost"
              size="sm"
            />
            <ToolbarButton
              icon={TableIcon}
              label="Insert Table"
              onClick={() => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
              variant="ghost"
              size="sm"
            />
            <ToolbarButton
              icon={Quote}
              label="Quote"
              isActive={editor?.isActive('blockquote')}
              onClick={toggleBlockquote}
              variant="ghost"
              size="sm"
            />
            <ToolbarButton
              icon={Code}
              label="Code Block"
              isActive={editor?.isActive('codeBlock')}
              onClick={toggleCodeBlock}
              variant="ghost"
              size="sm"
            />
          </div>

          <ToolbarSeparator />

          {/* Text styling */}
          <div className="flex items-center bg-gray-200/90 rounded-xl p-1">
            <ArticleColorPicker
              onColorSelect={(color) => {
                setTextColor(color);
                onTextColorChange(color);
              }}
              currentColor={currentTextColor}
              type="text"
            />
            <ArticleColorPicker
              onColorSelect={(color) => {
                setHighlight(color);
                onHighlightColorChange(color);
              }}
              currentColor={currentHighlightColor}
              type="highlight"
            />
          </div>

          <ToolbarSeparator />

          {/* Word count and stats */}
          <div className="text-sm text-gray-700 bg-gray-200/80 px-3 py-2 rounded-lg backdrop-blur-sm">
            <div className="flex items-center gap-4">
              <span className="font-medium">{wordCount} words</span>
              <span>{charCount} chars</span>
              <span>{readingTime} min read</span>
              {showComments && (
                <span className="flex items-center gap-1">
                  <MessageCircle className="w-3 h-3" />
                  <span>{comments.length}</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};