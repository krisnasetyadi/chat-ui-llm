"use client";

import { useEffect, useState } from "react";
import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface VersionData {
  backend: {
    version: string;
    last_updated: string;
    python_version: string;
  };
  frontend: {
    version: string;
    last_updated: string;
  };
}

export function VersionInfo() {
  const [versionData, setVersionData] = useState<VersionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVersionInfo = async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/v1/version`
        );
        const backendData = await response.json();

        // Frontend build time from build process
        const frontendBuildTime =
          process.env.NEXT_PUBLIC_BUILD_TIME || new Date().toISOString();

        setVersionData({
          backend: backendData.backend,
          frontend: {
            version: "1.0.0",
            last_updated: frontendBuildTime,
          },
        });
      } catch (error) {
        console.error("Failed to fetch version info:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchVersionInfo();
  }, []);

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleString("id-ID", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoString;
    }
  };

  if (loading || !versionData) {
    return null;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <Info className="h-3 w-3" />
            <span>v{versionData.frontend.version}</span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-3 text-xs">
            <div>
              <div className="font-semibold text-foreground mb-1">Frontend</div>
              <div className="text-muted-foreground">
                Version: {versionData.frontend.version}
              </div>
              <div className="text-muted-foreground">
                Updated: {formatDate(versionData.frontend.last_updated)}
              </div>
            </div>
            <div className="border-t pt-2">
              <div className="font-semibold text-foreground mb-1">Backend</div>
              <div className="text-muted-foreground">
                Version: {versionData.backend.version}
              </div>
              <div className="text-muted-foreground">
                Updated: {formatDate(versionData.backend.last_updated)}
              </div>
              <div className="text-muted-foreground">
                Python: {versionData.backend.python_version}
              </div>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
