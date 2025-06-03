/**
 * HelpTooltip Component for TASK_006_006
 * 
 * Provides accessible help text and documentation tooltips using Radix UI patterns
 * and shadcn/ui design system. Follows React Hook patterns from Context7 documentation.
 * 
 * Features:
 * - Accessible tooltip implementation
 * - Multiple tooltip types (help, info, warning)
 * - Keyboard navigation support
 * - Dynamic positioning and collision detection
 * - Mobile-friendly responsive behavior
 * - Integration with shadcn/ui design tokens
 */

import React, { useState, useRef, useId } from 'react';
import { createPortal } from 'react-dom';
import { 
  HelpCircle, 
  Info, 
  AlertTriangle, 
  ExternalLink,
  BookOpen,
  CheckCircle2,
  Lightbulb
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

// =============================================================================
// Type Definitions
// =============================================================================

export type HelpTooltipType = 'help' | 'info' | 'warning' | 'guide' | 'tip';
export type TooltipPosition = 'top' | 'bottom' | 'left' | 'right' | 'auto';

export interface HelpTooltipProps {
  children: React.ReactNode;
  content: React.ReactNode;
  type?: HelpTooltipType;
  position?: TooltipPosition;
  showIcon?: boolean;
  iconSize?: number;
  maxWidth?: number;
  delayDuration?: number;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  contentClassName?: string;
  asChild?: boolean;
}

export interface TooltipStepProps {
  title?: string;
  content: React.ReactNode;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
}

export interface DocumentationLinkProps {
  href: string;
  children: React.ReactNode;
  type?: 'internal' | 'external';
  showIcon?: boolean;
  className?: string;
}

// =============================================================================
// Tooltip Container Component (following Context7 patterns)
// =============================================================================

interface TooltipContainerProps {
  children: React.ReactNode;
  x: number;
  y: number;
  contentRef: React.RefObject<HTMLDivElement>;
  maxWidth: number;
  className?: string;
}

function TooltipContainer({ 
  children, 
  x, 
  y, 
  contentRef, 
  maxWidth,
  className 
}: TooltipContainerProps) {
  return (
    <div
      style={{
        position: 'absolute',
        pointerEvents: 'none',
        left: 0,
        top: 0,
        transform: `translate3d(${x}px, ${y}px, 0)`,
        zIndex: 50,
      }}
    >
      <div 
        ref={contentRef} 
        className={cn(
          "bg-popover text-popover-foreground rounded-md border px-3 py-2 text-sm shadow-lg",
          "animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
          className
        )}
        style={{ 
          maxWidth: `${maxWidth}px`,
          pointerEvents: 'auto'
        }}
        role="tooltip"
      >
        {children}
      </div>
    </div>
  );
}

// =============================================================================
// Main HelpTooltip Component
// =============================================================================

export function HelpTooltip({
  children,
  content,
  type = 'help',
  position = 'auto',
  showIcon = true,
  iconSize = 16,
  maxWidth = 300,
  delayDuration = 300,
  disabled = false,
  className,
  triggerClassName,
  contentClassName,
  asChild = false,
}: HelpTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [tooltipHeight, setTooltipHeight] = useState(0);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const tooltipId = useId();

  // Get appropriate icon for tooltip type
  const getTypeIcon = () => {
    const iconProps = { 
      size: iconSize, 
      className: cn(
        "flex-shrink-0",
        {
          'text-muted-foreground': type === 'help',
          'text-blue-600': type === 'info',
          'text-yellow-600': type === 'warning',
          'text-green-600': type === 'guide',
          'text-purple-600': type === 'tip',
        }
      )
    };

    switch (type) {
      case 'info':
        return <Info {...iconProps} />;
      case 'warning':
        return <AlertTriangle {...iconProps} />;
      case 'guide':
        return <BookOpen {...iconProps} />;
      case 'tip':
        return <Lightbulb {...iconProps} />;
      default:
        return <HelpCircle {...iconProps} />;
    }
  };

  // Calculate tooltip position with collision detection
  const calculatePosition = (triggerRect: DOMRect): { x: number; y: number } => {
    if (!contentRef.current) return { x: 0, y: 0 };

    const tooltipRect = contentRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    let x = triggerRect.left;
    let y = triggerRect.top - tooltipRect.height - 8; // 8px gap

    // Auto-positioning with collision detection
    if (position === 'auto' || y < 0) {
      // Try bottom if top doesn't fit
      if (triggerRect.bottom + tooltipRect.height + 8 <= viewportHeight) {
        y = triggerRect.bottom + 8;
      } else {
        // Use top if bottom doesn't fit either
        y = Math.max(8, triggerRect.top - tooltipRect.height - 8);
      }
    }

    // Horizontal positioning with collision detection
    if (x + tooltipRect.width > viewportWidth) {
      x = viewportWidth - tooltipRect.width - 8;
    }
    if (x < 8) {
      x = 8;
    }

    return { x, y };
  };

  // Handle mouse enter with delay
  const handleMouseEnter = () => {
    if (disabled) return;

    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        setTargetRect(rect);
        setIsVisible(true);
      }
    }, delayDuration);
  };

  // Handle mouse leave
  const handleMouseLeave = () => {
    clearTimeout(timeoutRef.current);
    setIsVisible(false);
    setTargetRect(null);
  };

  // Handle keyboard events for accessibility
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape' && isVisible) {
      setIsVisible(false);
      setTargetRect(null);
    }
  };

  // Update tooltip height when content changes
  React.useLayoutEffect(() => {
    if (contentRef.current && isVisible) {
      const { height } = contentRef.current.getBoundingClientRect();
      setTooltipHeight(height);
    }
  }, [isVisible, content]);

  // Calculate final position
  const tooltipPosition = targetRect ? calculatePosition(targetRect) : { x: 0, y: 0 };

  // Render trigger button or wrap children
  const trigger = asChild ? (
    React.cloneElement(children as React.ReactElement, {
      ref: triggerRef,
      onMouseEnter: handleMouseEnter,
      onMouseLeave: handleMouseLeave,
      onFocus: handleMouseEnter,
      onBlur: handleMouseLeave,
      onKeyDown: handleKeyDown,
      'aria-describedby': isVisible ? tooltipId : undefined,
      className: cn((children as React.ReactElement).props.className, triggerClassName),
    })
  ) : (
    <Button
      ref={triggerRef}
      variant="ghost"
      size="sm"
      className={cn(
        "h-auto p-1 text-muted-foreground hover:text-foreground",
        triggerClassName
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleMouseEnter}
      onBlur={handleMouseLeave}
      onKeyDown={handleKeyDown}
      aria-describedby={isVisible ? tooltipId : undefined}
      disabled={disabled}
    >
      {showIcon && getTypeIcon()}
      {!showIcon && children}
    </Button>
  );

  return (
    <>
      {trigger}
      {isVisible && targetRect && createPortal(
        <TooltipContainer
          x={tooltipPosition.x}
          y={tooltipPosition.y}
          contentRef={contentRef}
          maxWidth={maxWidth}
          className={cn(
            {
              'border-blue-200 bg-blue-50 text-blue-900': type === 'info',
              'border-yellow-200 bg-yellow-50 text-yellow-900': type === 'warning',
              'border-green-200 bg-green-50 text-green-900': type === 'guide',
              'border-purple-200 bg-purple-50 text-purple-900': type === 'tip',
            },
            contentClassName
          )}
        >
          <div id={tooltipId} className="space-y-2">
            {content}
          </div>
        </TooltipContainer>,
        document.body
      )}
    </>
  );
}

// =============================================================================
// Specialized Tooltip Components
// =============================================================================

/**
 * Multi-step tooltip for onboarding and guides
 */
export function TooltipStep({ title, content, action }: TooltipStepProps) {
  return (
    <div className="space-y-3">
      {title && (
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <h4 className="font-medium text-sm">{title}</h4>
        </div>
      )}
      <div className="text-sm">{content}</div>
      {action && (
        <div className="pt-1">
          {action.href ? (
            <DocumentationLink href={action.href} type="external" showIcon>
              {action.label}
            </DocumentationLink>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={action.onClick}
              className="h-7 px-2 text-xs"
            >
              {action.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Documentation link component with external link indicator
 */
export function DocumentationLink({
  href,
  children,
  type = 'external',
  showIcon = true,
  className,
}: DocumentationLinkProps) {
  const isExternal = type === 'external' || href.startsWith('http');

  return (
    <a
      href={href}
      target={isExternal ? '_blank' : undefined}
      rel={isExternal ? 'noopener noreferrer' : undefined}
      className={cn(
        "inline-flex items-center gap-1 text-primary hover:underline font-medium text-sm",
        className
      )}
    >
      {children}
      {showIcon && isExternal && <ExternalLink className="h-3 w-3" />}
    </a>
  );
}

// =============================================================================
// Utility Hooks for Complex Help Systems
// =============================================================================

/**
 * Hook for managing multi-step onboarding tooltips
 */
export function useOnboardingTooltips(steps: TooltipStepProps[]) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isActive, setIsActive] = useState(false);

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      setIsActive(false);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const startOnboarding = () => {
    setCurrentStep(0);
    setIsActive(true);
  };

  const stopOnboarding = () => {
    setIsActive(false);
  };

  return {
    currentStep: steps[currentStep],
    stepNumber: currentStep + 1,
    totalSteps: steps.length,
    isActive,
    nextStep,
    prevStep,
    startOnboarding,
    stopOnboarding,
    isFirstStep: currentStep === 0,
    isLastStep: currentStep === steps.length - 1,
  };
}

/**
 * Context for managing help system state across components
 */
export interface HelpContextValue {
  isHelpMode: boolean;
  toggleHelpMode: () => void;
  showAllTooltips: boolean;
  setShowAllTooltips: (show: boolean) => void;
}

export const HelpContext = React.createContext<HelpContextValue | undefined>(undefined);

export function useHelpContext() {
  const context = React.useContext(HelpContext);
  if (!context) {
    throw new Error('useHelpContext must be used within a HelpProvider');
  }
  return context;
}

export function HelpProvider({ children }: { children: React.ReactNode }) {
  const [isHelpMode, setIsHelpMode] = useState(false);
  const [showAllTooltips, setShowAllTooltips] = useState(false);

  const toggleHelpMode = () => {
    setIsHelpMode(!isHelpMode);
    setShowAllTooltips(!isHelpMode);
  };

  return (
    <HelpContext.Provider
      value={{
        isHelpMode,
        toggleHelpMode,
        showAllTooltips,
        setShowAllTooltips,
      }}
    >
      {children}
    </HelpContext.Provider>
  );
}

// =============================================================================
// Export Default and Components
// =============================================================================

export default HelpTooltip; 