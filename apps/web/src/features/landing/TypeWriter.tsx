import { useState, useEffect } from 'react';
import { useInView } from '../../hooks/useInView';

interface TypeWriterProps {
  text: string;
  speed?: number;
  delay?: number;
  className?: string;
  onComplete?: () => void;
}

export function TypeWriter({
  text,
  speed = 30,
  delay = 0,
  className = '',
  onComplete,
}: TypeWriterProps) {
  const { ref, isInView } = useInView({ threshold: 0.5 });
  const [charIndex, setCharIndex] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const [showCursor, setShowCursor] = useState(false);

  useEffect(() => {
    if (!isInView || hasStarted) return;

    const startTimer = setTimeout(() => {
      setHasStarted(true);
      setShowCursor(true);
      let currentIndex = 0;

      const typeInterval = setInterval(() => {
        if (currentIndex < text.length) {
          currentIndex++;
          setCharIndex(currentIndex);
        } else {
          clearInterval(typeInterval);
          setShowCursor(false);
          onComplete?.();
        }
      }, speed);

      return () => clearInterval(typeInterval);
    }, delay);

    return () => clearTimeout(startTimer);
  }, [isInView, text, speed, delay, hasStarted, onComplete]);

  // Calculate visible and hidden parts
  const visibleText = text.slice(0, charIndex);
  const hiddenText = text.slice(charIndex);

  return (
    <span ref={ref} className={className}>
      {visibleText}
      {showCursor && <span className="animate-pulse">|</span>}
      <span className="invisible">{hiddenText}</span>
    </span>
  );
}
