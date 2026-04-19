import type { GeneratedTitleResult } from "@/types/title-optimizer";

export type TitleStreamServerEvent =
  | { type: "platform_start"; platform: string }
  | { type: "platform_done"; platform: string; result: GeneratedTitleResult }
  | { type: "platform_error"; platform: string; message: string }
  | {
      type: "complete";
      success: boolean;
      results?: GeneratedTitleResult[];
      optimizationId?: string;
      error?: string;
    };

function mergeByPlatform(prev: GeneratedTitleResult[], next: GeneratedTitleResult): GeneratedTitleResult[] {
  const rest = prev.filter((r) => r.platform !== next.platform);
  return [...rest, next];
}

/** Parse SSE `data: {...}\\n\\n` chunks from a fetch Response body. */
export async function consumeTitleGenerationStream(
  body: ReadableStream<Uint8Array> | null,
  handlers: {
    onPlatformStart?: (platform: string) => void;
    onPlatformDone?: (result: GeneratedTitleResult) => void;
    onPlatformError?: (platform: string, message: string) => void;
    onResults?: (results: GeneratedTitleResult[]) => void;
    onComplete?: (payload: Extract<TitleStreamServerEvent, { type: "complete" }>) => void;
  }
): Promise<void> {
  if (!body) return;
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let acc: GeneratedTitleResult[] = [];

  const handleLine = (line: string) => {
    if (!line.startsWith("data:")) return;
    const json = line.slice(5).trim();
    if (!json) return;
    let ev: TitleStreamServerEvent;
    try {
      ev = JSON.parse(json) as TitleStreamServerEvent;
    } catch {
      return;
    }
    if (ev.type === "platform_start") handlers.onPlatformStart?.(ev.platform);
    if (ev.type === "platform_done") {
      acc = mergeByPlatform(acc, ev.result);
      handlers.onPlatformDone?.(ev.result);
      handlers.onResults?.(acc);
    }
    if (ev.type === "platform_error") handlers.onPlatformError?.(ev.platform, ev.message);
    if (ev.type === "complete") handlers.onComplete?.(ev);
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";
    for (const chunk of parts) {
      for (const line of chunk.split("\n")) {
        const t = line.trim();
        if (t) handleLine(t);
      }
    }
  }
  for (const line of buffer.split("\n")) {
    const t = line.trim();
    if (t) handleLine(t);
  }
}
