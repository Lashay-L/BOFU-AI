import { useCallback } from 'react';
import type { Editor } from '@tiptap/react';

interface UseEditorCommandsProps {
  editor: Editor | null;
  onContentChange?: (content: string) => void;
}

export const useEditorCommands = ({ editor, onContentChange }: UseEditorCommandsProps) => {
  // Enhanced command execution with focus management and error handling
  const executeCommand = useCallback((commandFn: () => any, commandName: string) => {
    if (!editor || editor.isDestroyed) {
      console.error('❌ Editor not available for command:', commandName);
      return false;
    }

    try {
      console.log('🎯 Executing command:', commandName, {
        hasSelection: !editor.state.selection.empty,
        selectionFrom: editor.state.selection.from,
        selectionTo: editor.state.selection.to,
        isFocused: editor.isFocused,
        isEditable: editor.isEditable
      });

      // Store the current selection
      const { from, to } = editor.state.selection;
      const selectedText = editor.state.doc.textBetween(from, to);
      
      console.log('📝 Selected text:', selectedText);

      // Execute the command
      const result = commandFn();
      
      console.log('✅ Command executed:', commandName, result);
      
      // Force editor focus and UI update
      if (!editor.isFocused) {
        editor.commands.focus();
      }
      
      // Force editor to update its internal state and trigger re-render
      setTimeout(() => {
        editor.commands.focus();
        // Trigger a content update to force re-render
        const currentContent = editor.getHTML();
        onContentChange?.(currentContent);
        console.log('🔄 Forced UI update after command:', commandName);
      }, 10);
      
      return result;
    } catch (error) {
      console.error('❌ Error executing command:', commandName, error);
      return false;
    }
  }, [editor, onContentChange]);

  // Text formatting commands
  const toggleBold = useCallback(() => {
    return executeCommand(() => editor?.chain().focus().toggleBold().run(), 'toggleBold');
  }, [editor, executeCommand]);

  const toggleItalic = useCallback(() => {
    return executeCommand(() => editor?.chain().focus().toggleItalic().run(), 'toggleItalic');
  }, [editor, executeCommand]);

  const toggleUnderline = useCallback(() => {
    return executeCommand(() => editor?.chain().focus().toggleUnderline().run(), 'toggleUnderline');
  }, [editor, executeCommand]);

  const toggleStrike = useCallback(() => {
    return executeCommand(() => editor?.chain().focus().toggleStrike().run(), 'toggleStrike');
  }, [editor, executeCommand]);

  // Color commands
  const setTextColor = useCallback((color: string) => {
    return executeCommand(() => editor?.chain().focus().setColor(color).run(), `setColor(${color})`);
  }, [editor, executeCommand]);

  const setHighlight = useCallback((color: string) => {
    return executeCommand(() => editor?.chain().focus().toggleHighlight({ color }).run(), `setHighlight(${color})`);
  }, [editor, executeCommand]);

  // Heading commands
  const toggleHeading = useCallback((level: 1 | 2 | 3 | 4 | 5 | 6) => {
    return executeCommand(() => editor?.chain().focus().toggleHeading({ level }).run(), `toggleHeading(${level})`);
  }, [editor, executeCommand]);

  // List commands
  const toggleBulletList = useCallback(() => {
    return executeCommand(() => editor?.chain().focus().toggleBulletList().run(), 'toggleBulletList');
  }, [editor, executeCommand]);

  const toggleOrderedList = useCallback(() => {
    return executeCommand(() => editor?.chain().focus().toggleOrderedList().run(), 'toggleOrderedList');
  }, [editor, executeCommand]);

  // Alignment commands
  const setTextAlign = useCallback((alignment: 'left' | 'center' | 'right' | 'justify') => {
    return executeCommand(() => editor?.chain().focus().setTextAlign(alignment).run(), `setTextAlign(${alignment})`);
  }, [editor, executeCommand]);

  // Block commands
  const toggleBlockquote = useCallback(() => {
    return executeCommand(() => editor?.chain().focus().toggleBlockquote().run(), 'toggleBlockquote');
  }, [editor, executeCommand]);

  const toggleCodeBlock = useCallback(() => {
    return executeCommand(() => editor?.chain().focus().toggleCodeBlock().run(), 'toggleCodeBlock');
  }, [editor, executeCommand]);

  // History commands
  const undo = useCallback(() => {
    return executeCommand(() => editor?.chain().focus().undo().run(), 'undo');
  }, [editor, executeCommand]);

  const redo = useCallback(() => {
    return executeCommand(() => editor?.chain().focus().redo().run(), 'redo');
  }, [editor, executeCommand]);

  // Utility functions
  const canUndo = useCallback(() => {
    return editor?.can().undo() ?? false;
  }, [editor]);

  const canRedo = useCallback(() => {
    return editor?.can().redo() ?? false;
  }, [editor]);

  const isActive = useCallback((command: string, attributes?: Record<string, any>) => {
    return editor?.isActive(command, attributes) ?? false;
  }, [editor]);

  const insertContent = useCallback((content: string) => {
    return executeCommand(() => editor?.chain().focus().insertContent(content).run(), `insertContent(${content.slice(0, 20)}...)`);
  }, [editor, executeCommand]);

  const setLink = useCallback((href: string) => {
    return executeCommand(() => editor?.chain().focus().setLink({ href }).run(), `setLink(${href})`);
  }, [editor, executeCommand]);

  const unsetLink = useCallback(() => {
    return executeCommand(() => editor?.chain().focus().unsetLink().run(), 'unsetLink');
  }, [editor, executeCommand]);

  return {
    // Core execution
    executeCommand,
    
    // Text formatting
    toggleBold,
    toggleItalic,
    toggleUnderline,
    toggleStrike,
    
    // Colors
    setTextColor,
    setHighlight,
    
    // Headings
    toggleHeading,
    
    // Lists
    toggleBulletList,
    toggleOrderedList,
    
    // Alignment
    setTextAlign,
    
    // Blocks
    toggleBlockquote,
    toggleCodeBlock,
    
    // History
    undo,
    redo,
    canUndo,
    canRedo,
    
    // Utilities
    isActive,
    insertContent,
    setLink,
    unsetLink,
    
    // Editor state
    editor
  };
};