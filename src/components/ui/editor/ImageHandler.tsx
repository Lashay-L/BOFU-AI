import React from 'react';
import { ImageResizer } from '../ImageResizer';

export interface SelectedImage {
  element: HTMLImageElement;
  node: any;
  pos: number;
  position: { 
    x: number; 
    y: number; 
    width: number; 
    height: number; 
  };
}

export interface ImageHandlerProps {
  selectedImage: SelectedImage | null;
  onResize: (width: number, height: number) => void;
  onDelete: () => void;
  onEditCaption: () => void;
  onClose: () => void;
}

export const ImageHandler: React.FC<ImageHandlerProps> = ({
  selectedImage,
  onResize,
  onDelete,
  onEditCaption,
  onClose,
}) => {
  if (!selectedImage) return null;

  return (
    <ImageResizer
      imageElement={selectedImage.element}
      position={selectedImage.position}
      onResize={onResize}
      onClose={onClose}
      onDelete={onDelete}
      onEditCaption={onEditCaption}
    />
  );
};