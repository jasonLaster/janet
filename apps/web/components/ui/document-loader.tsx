"use client";

import { cn } from "@/lib/utils";

export interface DocumentLoaderProps {
  /**
   * The message to display below the loading indicator
   */
  message?: string;

  /**
   * Mode to use for the loader
   * @default "spinner"
   */
  mode?: "spinner" | "small" | "large";

  /**
   * Height of the loading container
   * @default "full"
   */
  height?: string;

  /**
   * Width of the loading container
   * @default "full"
   */
  width?: string;

  /**
   * Background color class
   * @default "bg-gray-50"
   */
  bgColor?: string;

  /**
   * Additional className for the container
   */
  className?: string;
}

export function DocumentLoader({
  height = "full",
  width = "full",
  mode = "spinner",
  className,
}: DocumentLoaderProps) {
  // Predefined configs for each mode
  const configs = {
    spinner: {
      usePulse: false,
    },
    small: {
      usePulse: true,
      pulseCount: 1,
      pulseHeight: "h-40",
      pulseWidth: "w-64",
      showHeader: false,
      pulseGap: "gap-4",
    },
    large: {
      usePulse: true,
      pulseCount: 3,
      pulseHeight: "h-40",
      pulseWidth: "w-72",
      showHeader: true,
      pulseGap: "gap-8",
    },
  };

  const config = configs[mode];

  return (
    <div
      className={cn(
        "flex items-center justify-center",
        `w-${width}`,
        `h-${height}`,
        "bg-white",
        className
      )}
    >
      <div className="text-center">
        {config.usePulse ? (
          <div
            className={cn(
              "flex flex-col items-center mb-4",
              config.pulseCount > 1 && config.pulseGap
            )}
          >
            {Array.from({ length: config.pulseCount }).map((_, i) => (
              <div key={i} className="w-full">
                <div
                  className={cn(
                    "bg-gray-100 rounded-md animate-pulse",
                    config.pulseWidth,
                    config.pulseHeight
                  )}
                ></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-2"></div>
        )}
      </div>
    </div>
  );
}
