import React, { useState, useEffect } from 'react';
import { Editor } from '@tiptap/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Undo, Redo, History } from 'lucide-react';
import { ToolbarButton } from '../ToolbarButton';

interface UndoRedoHistoryProps {
  editor: Editor | null;
}

export const UndoRedoHistory: React.FC<UndoRedoHistoryProps> = ({ editor }) => {
  const [showHistory, setShowHistory] = useState(false);
  const [undoCount, setUndoCount] = useState(0);
  const [redoCount, setRedoCount] = useState(0);

  useEffect(() => {
    if (!editor) return;

    const updateCounts = () => {
      // Access history from editor if available
      const history = editor.extensionManager.extensions.find((ext: any) => ext.name === 'history');
      if (history) {
        // Mock counts for demonstration
        setUndoCount(Math.min(editor.can().undo() ? 5 : 0, 5));
        setRedoCount(Math.min(editor.can().redo() ? 3 : 0, 3));
      }
    };

    updateCounts();
    editor.on('transaction', updateCounts);

    return () => {
      editor.off('transaction', updateCounts);
    };
  }, [editor]);

  const handleBulkUndo = (steps: number) => {
    for (let i = 0; i < steps && editor?.can().undo(); i++) {
      editor.chain().undo().run();
    }
    setShowHistory(false);
  };

  const handleBulkRedo = (steps: number) => {
    for (let i = 0; i < steps && editor?.can().redo(); i++) {
      editor.chain().redo().run();
    }
    setShowHistory(false);
  };

  return (
    <div className="relative flex items-center space-x-1">
      <ToolbarButton
        icon={Undo}
        label={`Undo${undoCount > 0 ? ` (${undoCount})` : ''}`}
        onClick={() => editor?.chain().focus().undo().run()}
        disabled={!editor?.can().undo()}
        variant="ghost"
        badge={undoCount > 0 ? undoCount : undefined}
      />
      <ToolbarButton
        icon={Redo}
        label={`Redo${redoCount > 0 ? ` (${redoCount})` : ''}`}
        onClick={() => editor?.chain().focus().redo().run()}
        disabled={!editor?.can().redo()}
        variant="ghost"
        badge={redoCount > 0 ? redoCount : undefined}
      />
      <ToolbarButton
        icon={History}
        label="History Options"
        onClick={() => setShowHistory(!showHistory)}
        variant="ghost"
        size="sm"
      />
      
      {/* History Dropdown */}
      <AnimatePresence>
        {showHistory && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg p-2 z-50 min-w-[200px]"
          >
            <div className="space-y-1">
              <div className="text-xs font-medium text-gray-500 px-2 py-1">
                Bulk Operations
              </div>
              {[1, 5, 10, 20].map((steps) => (
                <div key={`undo-${steps}`} className="flex space-x-1">
                  <button
                    onClick={() => handleBulkUndo(steps)}
                    disabled={!editor?.can().undo()}
                    className="flex-1 text-left px-2 py-1 text-xs hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Undo {steps} steps
                  </button>
                  <button
                    onClick={() => handleBulkRedo(steps)}
                    disabled={!editor?.can().redo()}
                    className="flex-1 text-left px-2 py-1 text-xs hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Redo {steps} steps
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};