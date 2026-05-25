// WebSocket client for real-time CPA streaming
import type { CPAStreamEvent } from "./api";

const WS_BASE = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8000";

export function createCPAStream(
  datasetId: string,
  onEvent: (event: CPAStreamEvent) => void,
  onError?: (err: Event) => void,
  onDone?: () => void
): () => void {
  const ws = new WebSocket(`${WS_BASE}/api/cpa/ws/${datasetId}`);

  ws.onmessage = (e) => {
    try {
      const data: CPAStreamEvent = JSON.parse(e.data);
      onEvent(data);
      if (data.done) {
        ws.close();
        onDone?.();
      }
    } catch {
      // ignore parse errors
    }
  };

  ws.onerror = (e) => {
    onError?.(e);
  };

  ws.onclose = () => {
    onDone?.();
  };

  // Return cleanup function
  return () => {
    if (ws.readyState === WebSocket.OPEN) ws.close();
  };
}
