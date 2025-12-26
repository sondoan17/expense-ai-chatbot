import { ReactNode } from 'react';
import { useInView } from '../../hooks/useInView';

interface AnimatedSectionProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  animation?:
    | 'fadeInUp'
    | 'fadeIn'
    | 'fadeInLeft'
    | 'fadeInRight'
    | 'zoomIn'
    | 'bounceIn'
    | 'bounceInLeft'
    | 'bounceInDown'
    | 'slideInUp'
    | 'slideInLeft'
    | 'slideInRight';
  duration?: 'faster' | 'fast' | 'slow' | 'slower';
}

// Map to Animate.css class names
const animationMap: Record<string, string> = {
  fadeInUp: 'animate__fadeInUp',
  fadeIn: 'animate__fadeIn',
  fadeInLeft: 'animate__fadeInLeft',
  fadeInRight: 'animate__fadeInRight',
  zoomIn: 'animate__zoomIn',
  bounceIn: 'animate__bounceIn',
  bounceInLeft: 'animate__bounceInLeft',
  bounceInDown: 'animate__bounceInDown',
  slideInUp: 'animate__slideInUp',
  slideInLeft: 'animate__slideInLeft',
  slideInRight: 'animate__slideInRight',
};

const durationMap: Record<string, string> = {
  faster: 'animate__faster',
  fast: 'animate__fast',
  slow: 'animate__slow',
  slower: 'animate__slower',
};

export function AnimatedSection({
  children,
  className = '',
  delay = 0,
  animation = 'fadeInUp',
  duration,
}: AnimatedSectionProps) {
  const { ref, isInView } = useInView({ threshold: 0.1 });
  const animateClass = animationMap[animation] || 'animate__fadeInUp';
  const durationClass = duration ? durationMap[duration] : '';

  // Use CSS custom property for animation delay (works better with Animate.css)
  const style = {
    '--animate-delay': `${delay}ms`,
    willChange: isInView ? 'auto' : 'transform, opacity',
    visibility: isInView ? 'visible' : 'hidden',
  } as React.CSSProperties;

  return (
    <div
      ref={ref}
      className={`${
        isInView ? `animate__animated ${animateClass} ${durationClass} animate__delay-custom` : ''
      } ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}
