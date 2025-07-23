/**
 * Utility functions for handling and sanitizing notification data
 */

/**
 * Checks if a string appears to be a file path
 */
export function isFilePath(text: string): boolean {
  if (!text || typeof text !== 'string') return false;
  
  return (
    text.startsWith('/') ||                          // Unix paths
    text.includes('/var/folders/') ||                // macOS temp folders
    text.includes('TemporaryItems') ||               // macOS temp items
    text.includes('Screenshot') ||                   // Screenshot files
    /\.(png|jpg|jpeg|gif|pdf|doc|docx)$/i.test(text) || // Common file extensions
    text.length > 200                                // Unusually long (likely path)
  );
}

/**
 * Sanitizes a notification title by removing file paths and providing fallbacks
 */
export function sanitizeNotificationTitle(title: string, fallback?: string): string {
  if (!title || typeof title !== 'string') {
    return fallback || 'Content Brief Generated';
  }
  
  // If it's a file path, use fallback
  if (isFilePath(title)) {
    console.warn('🚨 File path detected in notification title, using fallback:', {
      originalTitle: title,
      fallback: fallback || 'Content Brief Generated'
    });
    return fallback || 'Content Brief Generated';
  }
  
  // Clean up the title
  const cleaned = title.trim();
  
  // If empty after cleaning, use fallback
  if (!cleaned) {
    return fallback || 'Content Brief Generated';
  }
  
  return cleaned;
}

/**
 * Sanitizes notification message content
 */
export function sanitizeNotificationMessage(message: string, fallback?: string): string {
  if (!message || typeof message !== 'string') {
    return fallback || 'Your content has been generated and is ready for review.';
  }
  
  const cleaned = message.trim();
  
  if (!cleaned) {
    return fallback || 'Your content has been generated and is ready for review.';
  }
  
  return cleaned;
}

/**
 * Creates a proper notification title with format validation
 */
export function createNotificationTitle(
  baseTitle: string, 
  prefix: string = 'Content Brief Generated:'
): string {
  const sanitizedTitle = sanitizeNotificationTitle(baseTitle);
  
  // If title already includes the prefix, don't duplicate it
  if (sanitizedTitle.toLowerCase().includes(prefix.toLowerCase())) {
    return sanitizedTitle;
  }
  
  return `${prefix} ${sanitizedTitle}`;
}

/**
 * Validates and sanitizes an entire notification object
 */
export interface NotificationData {
  id: string;
  title: string;
  message: string;
  [key: string]: any;
}

export function sanitizeNotification(notification: NotificationData): NotificationData {
  return {
    ...notification,
    title: sanitizeNotificationTitle(
      notification.title, 
      'Content Brief Generated'
    ),
    message: sanitizeNotificationMessage(
      notification.message,
      'Your content brief has been generated and is ready for review.'
    )
  };
}