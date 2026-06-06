"use client";

import { useState, useRef } from "react";
import { HelpCircle } from "lucide-react";

interface TooltipProps {
  text: string;
  children?: React.ReactNode;
  position?: "top" | "bottom" | "left" | "right";
  showIcon?: boolean;
  iconSize?: number;
}

export default function Tooltip({ text, children, position = "top", showIcon = false, iconSize = 14 }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  function handleEnter() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setVisible(true);
  }

  function handleLeave() {
    timeoutRef.current = setTimeout(() => setVisible(false), 150);
  }

  const positionClasses: Record<string, string> = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  return (
    <span
      className="relative inline-flex items-center"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onFocus={handleEnter}
      onBlur={handleLeave}
      tabIndex={0}
      role="button"
      aria-label={text}
    >
      {children || (showIcon && <HelpCircle className="text-text-muted/60 hover:text-text-muted cursor-help transition-colors" style={{ width: iconSize, height: iconSize }} />)}
      {visible && (
        <span
          className={`absolute z-50 px-3 py-2 text-xs font-medium text-white bg-gray-900 rounded-lg shadow-lg whitespace-nowrap pointer-events-none animate-in fade-in duration-150 ${positionClasses[position]}`}
          role="tooltip"
        >
          {text}
          <span className={`absolute w-2 h-2 bg-gray-900 rotate-45 ${
            position === "top" ? "top-full left-1/2 -translate-x-1/2 -mt-1" :
            position === "bottom" ? "bottom-full left-1/2 -translate-x-1/2 -mb-1" :
            position === "left" ? "left-full top-1/2 -translate-y-1/2 -ml-1" :
            "right-full top-1/2 -translate-y-1/2 -mr-1"
          }`} />
        </span>
      )}
    </span>
  );
}
