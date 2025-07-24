import React, { useState, useEffect, useCallback, useRef } from 'react';

interface ImageResizerProps {
  imageElement: HTMLImageElement;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  onResize: (width: number, height: number) => void;
  onClose: () => void;
  onDelete?: () => void;
  onEditCaption?: () => void;
}

type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

interface DragState {
  isDragging: boolean;
  handle: ResizeHandle | null;
  startX: number;
  startY: number;
  startWidth: number;
  startHeight: number;
  aspectRatio: number;
}

export const ImageResizer: React.FC<ImageResizerProps> = ({
  imageElement,
  position,
  onResize,
  onClose,
  onDelete,
  onEditCaption,
}) => {
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    handle: null,
    startX: 0,
    startY: 0,
    startWidth: 0,
    startHeight: 0,
    aspectRatio: 1,
  });

  const [currentSize, setCurrentSize] = useState({
    width: position.width,
    height: position.height,
  });

  const overlayRef = useRef<HTMLDivElement>(null);

  // Update position when image position changes
  useEffect(() => {
    setCurrentSize({
      width: position.width,
      height: position.height,
    });
  }, [position.width, position.height]);

  // Handle mouse move during drag
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragState.isDragging || !dragState.handle) return;

    const deltaX = e.clientX - dragState.startX;
    const deltaY = e.clientY - dragState.startY;

    let newWidth = dragState.startWidth;
    let newHeight = dragState.startHeight;

    // Calculate new dimensions based on handle
    switch (dragState.handle) {
      case 'nw':
        newWidth = Math.max(50, dragState.startWidth - deltaX);
        newHeight = Math.max(30, dragState.startHeight - deltaY);
        break;
      case 'n':
        newHeight = Math.max(30, dragState.startHeight - deltaY);
        break;
      case 'ne':
        newWidth = Math.max(50, dragState.startWidth + deltaX);
        newHeight = Math.max(30, dragState.startHeight - deltaY);
        break;
      case 'e':
        newWidth = Math.max(50, dragState.startWidth + deltaX);
        break;
      case 'se':
        newWidth = Math.max(50, dragState.startWidth + deltaX);
        newHeight = Math.max(30, dragState.startHeight + deltaY);
        break;
      case 's':
        newHeight = Math.max(30, dragState.startHeight + deltaY);
        break;
      case 'sw':
        newWidth = Math.max(50, dragState.startWidth - deltaX);
        newHeight = Math.max(30, dragState.startHeight + deltaY);
        break;
      case 'w':
        newWidth = Math.max(50, dragState.startWidth - deltaX);
        break;
    }

    // Maintain aspect ratio for corner handles (unless Shift is pressed)
    const isCornerHandle = ['nw', 'ne', 'se', 'sw'].includes(dragState.handle);
    const shouldMaintainRatio = isCornerHandle && !e.shiftKey;

    if (shouldMaintainRatio) {
      const widthRatio = newWidth / dragState.startWidth;
      const heightRatio = newHeight / dragState.startHeight;
      
      // Use the larger ratio to ensure the image doesn't get smaller than intended
      const ratio = Math.max(widthRatio, heightRatio);
      newWidth = dragState.startWidth * ratio;
      newHeight = dragState.startHeight * ratio;
    }

    setCurrentSize({ width: newWidth, height: newHeight });
  }, [dragState]);

  // Handle mouse up - end drag
  const handleMouseUp = useCallback(() => {
    if (dragState.isDragging) {
      onResize(currentSize.width, currentSize.height);
      setDragState(prev => ({
        ...prev,
        isDragging: false,
        handle: null,
      }));
    }
  }, [dragState.isDragging, currentSize, onResize]);

  // Setup global mouse event listeners
  useEffect(() => {
    if (dragState.isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = `${dragState.handle}-resize`;
      document.body.style.userSelect = 'none';

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
    }
  }, [dragState.isDragging, handleMouseMove, handleMouseUp, dragState.handle]);

  // Start drag operation
  const handleMouseDown = (handle: ResizeHandle) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const aspectRatio = position.width / position.height;

    setDragState({
      isDragging: true,
      handle,
      startX: e.clientX,
      startY: e.clientY,
      startWidth: currentSize.width,
      startHeight: currentSize.height,
      aspectRatio,
    });
  };

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        onDelete?.();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, onDelete]);

  // Render resize handle
  const renderHandle = (handle: ResizeHandle, className: string) => (
    <div
      key={handle}
      className={`resize-handle ${className}`}
      onMouseDown={handleMouseDown(handle)}
      style={{
        cursor: `${handle}-resize`,
      }}
    />
  );

  return (
    <div
      ref={overlayRef}
      className="image-resizer-overlay"
      style={{
        position: 'fixed',
        top: position.y,
        left: position.x,
        width: currentSize.width,
        height: currentSize.height,
        zIndex: 1000,
        pointerEvents: 'none',
      }}
    >
      {/* Selection border */}
      <div
        className="image-selection-border"
        style={{
          position: 'absolute',
          top: -2,
          left: -2,
          right: -2,
          bottom: -2,
          border: '2px solid #3b82f6',
          borderRadius: '4px',
          pointerEvents: 'none',
        }}
      />

      {/* Resize handles */}
      <div style={{ pointerEvents: 'auto' }}>
        {renderHandle('nw', 'resize-nw')}
        {renderHandle('n', 'resize-n')}
        {renderHandle('ne', 'resize-ne')}
        {renderHandle('e', 'resize-e')}
        {renderHandle('se', 'resize-se')}
        {renderHandle('s', 'resize-s')}
        {renderHandle('sw', 'resize-sw')}
        {renderHandle('w', 'resize-w')}
      </div>

      {/* Toolbar */}
      <div
        className="image-resizer-toolbar"
        style={{
          position: 'absolute',
          top: -40,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: '4px',
          background: 'white',
          borderRadius: '6px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
          padding: '4px',
          border: '1px solid #e5e7eb',
          pointerEvents: 'auto',
          zIndex: 1001,
        }}
      >
        {onEditCaption && (
          <button
            className="toolbar-button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onEditCaption();
            }}
            title="Edit Caption"
            style={{
              padding: '6px 8px',
              border: 'none',
              background: 'transparent',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              color: '#6b7280',
            }}
          >
            📝
          </button>
        )}
        {onDelete && (
          <button
            className="toolbar-button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDelete();
            }}
            title="Delete Image"
            style={{
              padding: '6px 8px',
              border: 'none',
              background: 'transparent',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              color: '#6b7280',
            }}
          >
            🗑️
          </button>
        )}
      </div>

      {/* Resize feedback */}
      {dragState.isDragging && (
        <div
          className="resize-feedback"
          style={{
            position: 'absolute',
            top: -60,
            right: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '12px',
            pointerEvents: 'none',
          }}
        >
          {Math.round(currentSize.width)} × {Math.round(currentSize.height)}
        </div>
      )}
    </div>
  );
};