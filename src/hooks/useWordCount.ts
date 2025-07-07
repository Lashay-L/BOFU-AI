import { useState, useCallback, useEffect } from 'react';

interface WordCountStats {
  wordCount: number;
  charCount: number;
  readingTime: number;
}

export const useWordCount = (content: string): WordCountStats => {
  const [stats, setStats] = useState<WordCountStats>({
    wordCount: 0,
    charCount: 0,
    readingTime: 0
  });

  const updateWordCount = useCallback((htmlContent: string) => {
    const text = htmlContent.replace(/<[^>]*>/g, '').trim();
    const words = text ? text.split(/\s+/).length : 0;
    const chars = text.length;
    const reading = Math.ceil(words / 200); // 200 words per minute
    
    setStats({
      wordCount: words,
      charCount: chars,
      readingTime: reading
    });
  }, []);

  useEffect(() => {
    updateWordCount(content);
  }, [content, updateWordCount]);

  return stats;
};