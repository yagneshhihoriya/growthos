"use client";

import * as React from "react";
import { Camera } from "lucide-react";
import { GeneratePanel } from "@/components/photo-studio/GeneratePanel";
import { ImageGrid } from "@/components/photo-studio/ImageGrid";

export function PhotoStudioClient() {
  const [libraryRefresh, setLibraryRefresh] = React.useState(0);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-500/10 ring-1 ring-purple-500/20">
          <Camera className="h-5 w-5 text-purple-400" />
        </div>
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-text-primary md:text-2xl">Photo Studio</h1>
          <p className="mt-0.5 text-sm text-text-tertiary">
            Edit an uploaded photo with AI, or create a brand-new image from a prompt — powered by Nano Banana 2.
          </p>
        </div>
      </div>

      <GeneratePanel onGenerationComplete={() => setLibraryRefresh((n) => n + 1)} />

      <div id="photo-library" className="scroll-mt-24">
        <ImageGrid refreshKey={libraryRefresh} />
      </div>
    </div>
  );
}
