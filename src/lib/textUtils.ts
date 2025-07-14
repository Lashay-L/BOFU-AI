/**
 * Text manipulation utilities for editor functionality
 */

/**
 * Helper function for text node positioning - finds a text node at a specific offset
 */
export const getTextNodeAtOffset = (container: HTMLElement, offset: number): { node: Text; offset: number } | null => {
  const walker = document.createTreeWalker(
    container,
    NodeFilter.SHOW_TEXT,
    null
  );

  let currentOffset = 0;
  let currentNode = walker.nextNode() as Text;
  
  while (currentNode) {
    const nodeLength = currentNode.textContent?.length || 0;
    if (currentOffset + nodeLength >= offset) {
      return { node: currentNode, offset: offset - currentOffset };
    }
    currentOffset += nodeLength;
    currentNode = walker.nextNode() as Text;
  }
  return null;
};

/**
 * Enhanced helper function to get text offset within container
 * Handles both text nodes and element nodes with proper validation
 */
export const getTextOffset = (container: HTMLElement, targetNode: Node, targetOffset: number): number => {
  if (!container || !targetNode) {
    console.error('❌ Invalid parameters for getTextOffset:', { container, targetNode });
    return 0;
  }
  
  // If target node is not a text node, try to find the nearest text node
  let actualTargetNode = targetNode;
  let actualTargetOffset = targetOffset;
  
  if (targetNode.nodeType !== Node.TEXT_NODE) {
    // If it's an element node, find the text node at the given offset
    const childNodes = Array.from(targetNode.childNodes);
    let cumulativeOffset = 0;
    
    for (const child of childNodes) {
      if (child.nodeType === Node.TEXT_NODE) {
        const textLength = child.textContent?.length || 0;
        if (cumulativeOffset + textLength >= targetOffset) {
          actualTargetNode = child;
          actualTargetOffset = targetOffset - cumulativeOffset;
          break;
        }
        cumulativeOffset += textLength;
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        const elementTextLength = child.textContent?.length || 0;
        if (cumulativeOffset + elementTextLength >= targetOffset) {
          // Recursively find the text node within this element
          return getTextOffset(container, child, targetOffset - cumulativeOffset);
        }
        cumulativeOffset += elementTextLength;
      }
    }
  }

  const walker = document.createTreeWalker(
    container,
    NodeFilter.SHOW_TEXT,
    null
  );

  let currentOffset = 0;
  let currentNode = walker.nextNode();
  
  while (currentNode) {
    if (currentNode === actualTargetNode) {
      const nodeLength = currentNode.textContent?.length || 0;
      const clampedOffset = Math.min(actualTargetOffset, nodeLength);
      return currentOffset + clampedOffset;
    }
    currentOffset += currentNode.textContent?.length || 0;
    currentNode = walker.nextNode();
  }
  
  // FALLBACK: If we didn't find the target node, try to estimate position
  const containerText = container.textContent || '';
  const estimatedOffset = Math.min(targetOffset, containerText.length);
  
  console.warn('⚠️ Target node not found in container, using estimated offset:', {
    targetNodeType: targetNode.nodeType,
    originalOffset: targetOffset,
    estimatedOffset,
    containerLength: containerText.length
  });
  
  return estimatedOffset;
};

/**
 * Enhanced HTML to Markdown conversion with comprehensive pattern matching
 */
export const htmlToMarkdown = (html: string): string => {
  return html
    // Headers
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '\n# $1\n')
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '\n## $1\n')
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '\n### $1\n')
    .replace(/<h4[^>]*>(.*?)<\/h4>/gi, '\n#### $1\n')
    .replace(/<h5[^>]*>(.*?)<\/h5>/gi, '\n##### $1\n')
    .replace(/<h6[^>]*>(.*?)<\/h6>/gi, '\n###### $1\n')
    
    // Text formatting
    .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
    .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
    .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
    .replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
    .replace(/<u[^>]*>(.*?)<\/u>/gi, '<u>$1</u>')
    .replace(/<s[^>]*>(.*?)<\/s>/gi, '~~$1~~')
    .replace(/<del[^>]*>(.*?)<\/del>/gi, '~~$1~~')
    
    // Links and images
    .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
    .replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*>/gi, '![$2]($1)')
    .replace(/<img[^>]*src="([^"]*)"[^>]*>/gi, '![]($1)')
    
    // Lists
    .replace(/<ul[^>]*>/gi, '\n')
    .replace(/<\/ul>/gi, '\n')
    .replace(/<ol[^>]*>/gi, '\n')
    .replace(/<\/ol>/gi, '\n')
    .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
    
    // Blockquotes and code
    .replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gi, '\n> $1\n')
    .replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`')
    .replace(/<pre[^>]*><code[^>]*>(.*?)<\/code><\/pre>/gi, '\n```\n$1\n```\n')
    .replace(/<pre[^>]*>(.*?)<\/pre>/gi, '\n```\n$1\n```\n')
    
    // Paragraphs and breaks
    .replace(/<p[^>]*>(.*?)<\/p>/gi, '\n$1\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<hr\s*\/?>/gi, '\n---\n')
    
    // Clean up remaining HTML tags
    .replace(/<[^>]*>/g, '')
    
    // Clean up extra whitespace
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .replace(/^\s+|\s+$/g, '')
    .trim();
};

/**
 * Calculate word count, character count, and reading time from HTML content
 */
export const getTextStats = (htmlContent: string) => {
  const text = htmlContent.replace(/<[^>]*>/g, '').trim();
  const words = text ? text.split(/\s+/).length : 0;
  const chars = text.length;
  const readingTime = Math.ceil(words / 200); // 200 words per minute

  return {
    wordCount: words,
    charCount: chars,
    readingTime
  };
};

/**
 * Strip HTML tags and return plain text
 */
export const stripHtml = (html: string): string => {
  return html.replace(/<[^>]*>/g, '').trim();
};

/**
 * Truncate text to a specific length with ellipsis
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '...';
};

/**
 * Convert text to title case
 */
export const toTitleCase = (text: string): string => {
  return text.replace(/\w\S*/g, (txt) => 
    txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
};

/**
 * Extract text content between specific positions
 */
export const extractTextBetween = (
  container: HTMLElement, 
  startOffset: number, 
  endOffset: number
): string => {
  const startNode = getTextNodeAtOffset(container, startOffset);
  const endNode = getTextNodeAtOffset(container, endOffset);
  
  if (!startNode || !endNode) return '';
  
  try {
    const range = document.createRange();
    range.setStart(startNode.node, startNode.offset);
    range.setEnd(endNode.node, endNode.offset);
    return range.toString();
  } catch (error) {
    console.warn('Failed to extract text between positions:', error);
    return '';
  }
};