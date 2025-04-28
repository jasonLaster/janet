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

// Define specific config types using a discriminated union based on usePulse
type SpinnerConfig = { usePulse: false };
type PulseConfig = {
  usePulse: true;
  pulseCount: number;
  pulseHeight: string;
  pulseWidth: string;
  showHeader: boolean;
  pulseGap: string;
};
type LoaderConfig = SpinnerConfig | PulseConfig;

export function DocumentLoader({
  height = "full",
  width = "full",
  mode = "spinner",
  className,
}: DocumentLoaderProps) {
  // Predefined configs for each mode with explicit typing
  const configs: Record<"spinner" | "small" | "large", LoaderConfig> = {
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
        "flex items-center flex-col justify-center",
        `w-${width}`,
        `h-${height}`,
        "",
        className
      )}
    >
      <div className="text-center">
        {config.usePulse ? (
          // Now TypeScript knows these properties exist if usePulse is true
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
