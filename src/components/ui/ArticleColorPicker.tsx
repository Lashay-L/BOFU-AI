import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Highlighter, PaintBucket, Check } from 'lucide-react';
import { ToolbarButton } from './ToolbarButton';

interface ArticleColorPickerProps {
  onColorSelect: (color: string) => void;
  currentColor?: string;
  type?: 'text' | 'highlight';
}

export const ArticleColorPicker: React.FC<ArticleColorPickerProps> = ({ 
  onColorSelect, 
  currentColor, 
  type = 'text' 
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const textColors = [
    { name: 'Default', value: '#000000' },
    { name: 'Gray', value: '#6b7280' },
    { name: 'Red', value: '#ef4444' },
    { name: 'Orange', value: '#f97316' },
    { name: 'Amber', value: '#f59e0b' },
    { name: 'Green', value: '#10b981' },
    { name: 'Teal', value: '#14b8a6' },
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Indigo', value: '#6366f1' },
    { name: 'Purple', value: '#8b5cf6' },
    { name: 'Pink', value: '#ec4899' },
    { name: 'Rose', value: '#f43f5e' },
  ];

  const highlightColors = [
    { name: 'Yellow', value: '#fef08a' },
    { name: 'Green', value: '#bbf7d0' },
    { name: 'Blue', value: '#bfdbfe' },
    { name: 'Purple', value: '#e9d5ff' },
    { name: 'Pink', value: '#fce7f3' },
    { name: 'Orange', value: '#fed7aa' },
    { name: 'Red', value: '#fecaca' },
    { name: 'Gray', value: '#f3f4f6' },
  ];

  const colors = type === 'highlight' ? highlightColors : textColors;

  const handleColorSelect = (color: string) => {
    onColorSelect(color);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <ToolbarButton
        icon={type === 'highlight' ? Highlighter : PaintBucket}
        label={type === 'highlight' ? 'Highlight Color' : 'Text Color'}
        onClick={() => setIsOpen(!isOpen)}
        variant="ghost"
        size="sm"
      >
        <div 
          className="w-3 h-3 rounded-sm ml-1 border border-gray-300 dark:border-gray-600"
          style={{ backgroundColor: currentColor || (type === 'highlight' ? '#fef08a' : '#000000') }}
        />
      </ToolbarButton>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            className="absolute top-full left-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 z-50"
          >
            <div className="grid grid-cols-4 gap-2 min-w-[200px]">
              {colors.map((color) => (
                <button
                  key={color.value}
                  onClick={() => handleColorSelect(color.value)}
                  className="group relative w-8 h-8 rounded border-2 border-gray-200 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-400 transition-colors"
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                >
                  {currentColor === color.value && (
                    <Check className="w-4 h-4 text-gray-800 absolute inset-0 m-auto" />
                  )}
                </button>
              ))}
            </div>
            
            {/* Custom color input */}
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
              <input
                type="color"
                onChange={(e) => handleColorSelect(e.target.value)}
                className="w-full h-8 rounded border border-gray-200 dark:border-gray-700 cursor-pointer"
                title="Custom color"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};