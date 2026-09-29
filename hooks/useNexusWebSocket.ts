"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type WsStatus = "connecting" | "connected" | "disconnected" | "error";

interface WsConfig {
  maxRetries: number;
  initialBackoffMs: number;
  maxBackoffMs: number;
  heartbeatIntervalMs: number;
}

const WS_CONFIG: WsConfig = {
  maxRetries: 8,
  initialBackoffMs: 1000,
  maxBackoffMs: 30_000,
  heartbeatIntervalMs: 25_000,
};

function calcBackoff(attempt: number): number {
  const exp = WS_CONFIG.initialBackoffMs * Math.pow(2, attempt);
  const jitter = exp * (0.05 + Math.random() * 0.1);
  return Math.min(exp + jitter, WS_CONFIG.maxBackoffMs);
}

/**
 * useNexusWebSocket
 *
 * Production-grade WebSocket hook for NEXUS Mission Control.
 * Features:
 *  - Exponential backoff with jitter (up to maxRetries)
 *  - Heartbeat / keepalive (prevents proxy-level dead-connection drops)
 *  - Strict cleanup on unmount (no setState-after-unmount leaks)
 *  - Connection status exposed for UI indicator
 *  - Sends CLIENT_IDENTIFY on open
 */
export function useNexusWebSocket(
  onMessage: (type: string, data: unknown) => void
): { status: WsStatus; send: (msg: object) => void } {
  const [status, setStatus] = useState<WsStatus>("disconnected");

  const wsRef = useRef<WebSocket | null>(null);
  const retryRef = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage; // Always fresh reference

  // ── Cleanup on unmount ───────────────────────────────────────────────────
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.close(1000, "Component unmounted");
      }
    };
  }, []);

  // ── Connect ──────────────────────────────────────────────────────────────
  const connect = useCallback(() => {
    if (!mountedRef.current) return;

    if (retryRef.current >= WS_CONFIG.maxRetries) {
      if (mountedRef.current) setStatus("error");
      console.error(`[NEXUS WS] Max retries (${WS_CONFIG.maxRetries}) exceeded.`);
      return;
    }

    if (mountedRef.current) setStatus("connecting");

    try {
      const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host =
        process.env.NEXT_PUBLIC_BACKEND_URL || `${window.location.hostname}:8000`;
      const url = `${proto}//${host}/ws/nexus`;

      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!mountedRef.current) return;
        retryRef.current = 0;
        setStatus("connected");

        // Heartbeat
        if (heartbeatRef.current) clearInterval(heartbeatRef.current);
        heartbeatRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            try {
              ws.send(JSON.stringify({ action: "HEARTBEAT", ts: Date.now() }));
            } catch {
              // ignore
            }
          }
        }, WS_CONFIG.heartbeatIntervalMs);

        // Identify
        try {
          ws.send(JSON.stringify({ action: "CLIENT_IDENTIFY", version: "2.1" }));
        } catch {
          // ignore
        }
      };

      ws.onmessage = (event) => {
        if (!mountedRef.current) return;
        try {
          const msg = JSON.parse(event.data as string);
          if (msg.type === "HEARTBEAT_ACK") return;
          onMessageRef.current(msg.type, msg.data);
        } catch (err) {
          console.error("[NEXUS WS] Parse error:", err);
        }
      };

      ws.onerror = () => {
        if (!mountedRef.current) return;
        setStatus("error");
      };

      ws.onclose = (ev) => {
        if (!mountedRef.current) return;
        if (heartbeatRef.current) clearInterval(heartbeatRef.current);

        // Normal close — don't retry
        if (ev.code === 1000) {
          setStatus("disconnected");
          return;
        }

        const delay = calcBackoff(retryRef.current);
        retryRef.current += 1;
        console.log(
          `[NEXUS WS] Closed (${ev.code}). Retry #${retryRef.current} in ${Math.round(delay / 1000)}s`
        );
        setStatus("disconnected");
        timeoutRef.current = setTimeout(connect, delay);
      };
    } catch (err) {
      if (!mountedRef.current) return;
      setStatus("error");
      const delay = calcBackoff(retryRef.current);
      retryRef.current += 1;
      timeoutRef.current = setTimeout(connect, delay);
    }
  }, []); // stable — uses refs internally

  // ── Initial connect ──────────────────────────────────────────────────────
  useEffect(() => {
    connect();
  }, [connect]);

  // ── Send helper ──────────────────────────────────────────────────────────
  const send = useCallback((msg: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify(msg));
      } catch (err) {
        console.warn("[NEXUS WS] Send failed:", err);
      }
    }
  }, []);

  return { status, send };
}
