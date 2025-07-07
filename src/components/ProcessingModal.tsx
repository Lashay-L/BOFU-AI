import React from 'react';
import { motion } from 'framer-motion';
import { BaseModal } from './ui/BaseModal';

interface ProcessingModalProps {
  isOpen: boolean;
}

const pulseAnimation = {
  scale: [1, 1.1, 1],
  opacity: [0.8, 1, 0.8],
  transition: {
    duration: 2,
    repeat: Infinity,
    ease: "easeInOut"
  }
};

export function ProcessingModal({ isOpen }: ProcessingModalProps) {
  return (
    <BaseModal
      isOpen={isOpen}
      onClose={() => {}} // Non-closeable modal
      size="sm"
      theme="dark"
      showCloseButton={false}
      closeOnOverlayClick={false}
      closeOnEscape={false}
      animation="fade_scale"
      contentClassName="bg-secondary-900 border-2 border-primary-500/20 shadow-glow"
    >
      <div className="flex flex-col items-center justify-center gap-4 p-6">
        <motion.div
          className="w-16 h-16 rounded-full border-4 border-primary-500/20"
          animate={{
            rotate: 360,
            borderTopColor: 'rgb(var(--color-primary-400))',
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
        <h3 className="text-lg font-medium text-primary-400">
          Processing Your Request
        </h3>
        <p className="text-sm text-gray-400">
          Please wait while we analyze your data...
        </p>
      </div>
    </BaseModal>
  );
}