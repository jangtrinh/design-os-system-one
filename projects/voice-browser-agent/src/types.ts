export type BrowserIntent =
  | "navigate"
  | "click"
  | "type"
  | "scroll_down"
  | "scroll_up"
  | "go_back"
  | "refresh"
  | "extract"
  | "unsupported";

export interface InteractiveElement {
  id: string;             // Synthetic ID: "1", "2", "3"...
  tag: string;            // 'a', 'button', 'input', etc.
  text: string;           // Visible text content
  role?: string;          // ARIA role if any
  placeholder?: string;   // Input placeholder
  selector: string;       // Precise CSS or xpath selector
  href?: string;
  isInput: boolean;
}

export interface JevDecision {
  intent: BrowserIntent;
  confidence: number;
  probabilities: Record<string, number>;
  targetUrl?: string;
  targetElementId?: string;
  targetElementText?: string;
  inputText?: string;
  reasoningNote?: string;
  isDestructive?: boolean;
}

export interface BrowserStatus {
  url: string;
  title: string;
  canGoBack: boolean;
  elementCount: number;
  screenshotBase64?: string;
}

export type WSClientMessage =
  | { type: "voice_command"; text: string; language: string }
  | { type: "manual_command"; text: string }
  | { type: "toggle_headful"; headful: boolean }
  | { type: "request_status" }
  | { type: "set_api_key"; apiKey: string }
  | { type: "client_console"; level: string; text: string }
  | { type: "speech_event"; event: string; details?: any };

export type WSServerMessage =
  | { type: "status"; status: BrowserStatus }
  | { type: "jev_evaluating"; text: string }
  | { type: "jev_result"; decision: JevDecision; executionTimeMs: number }
  | { type: "action_started"; action: string; details: string }
  | { type: "action_completed"; action: string; message: string }
  | { type: "action_failed"; action: string; error: string }
  | { type: "log"; level: "info" | "warn" | "error"; message: string };
