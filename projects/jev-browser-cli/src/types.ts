export type BrowserIntent =
  | "navigate"
  | "click"
  | "type"
  | "scroll_down"
  | "scroll_up"
  | "go_back"
  | "refresh"
  | "eval"
  | "extract"
  | "unsupported";

export interface InteractiveElement {
  id: string;             // Synthetic ID: "1", "2", "3"...
  tag: string;            // 'a', 'button', 'input', etc.
  text: string;           // Visible text content
  role?: string;          // ARIA role
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
}

export interface BrowserStatus {
  connected: boolean;
  port: number;
  browserType?: string;
  url: string;
  title: string;
  elementCount: number;
  tabCount: number;
}

export interface CLIResult<T = any> {
  success: boolean;
  action: string;
  message: string;
  data?: T;
  error?: string;
  executionTimeMs?: number;
}

export interface ArchitecturalZone {
  name: string;
  selector?: string;
  role?: string;
  elementCount: number;
  description: string;
  sampleElements: Array<{ id: string; tag: string; text: string }>;
}

export interface PageArchitecture {
  url: string;
  title: string;
  category: string;
  interactionModel: string;
  isAuthenticated: boolean;
  authProbability: number;
  complexityScore: number;
  primaryInteractionZone: string;
  hasBlockingOverlay: boolean;
  confidence: number;
  zones: ArchitecturalZone[];
  anchors: {
    primarySearch?: { id: string; selector: string; placeholder?: string };
    primaryInput?: { id: string; selector: string; placeholder?: string };
    primaryAction?: { id: string; selector: string; text?: string };
  };
  agentPlaybook: string[];
}

export interface EvaluatorAction {
  action: "click" | "type" | "navigate" | "scroll_down" | "scroll_up" | "wait" | "done" | "blocked";
  targetElementId?: string;
  targetElementText?: string;
  selector?: string;
  value?: string;
  confidence: number;
  rationale: string;
  latencyMs: number;
}

export type GuardRiskLevel = "SAFE" | "LOW" | "MEDIUM" | "CRITICAL";

export interface GuardVerdict {
  allowed: boolean;
  riskScore: number; // 0 to 1.0
  riskLevel: GuardRiskLevel;
  policyViolations: string[];
  requiresConfirmation: boolean;
  guardReason: string;
  latencyMs: number;
}

export interface DualBrainStepResult {
  step: number;
  action: EvaluatorAction;
  guard: GuardVerdict;
  executed: boolean;
  executionError?: string;
  durationMs: number;
}

export interface DualBrainAutoRunResult {
  goal: string;
  completed: boolean;
  totalSteps: number;
  totalDurationMs: number;
  steps: DualBrainStepResult[];
  stoppedReason: string;
}

export interface SocialPostCandidate {
  id: string;
  author: string;
  text: string;
  likes?: number;
  replies?: number;
  reposts?: number;
  timestamp?: string;
  url?: string;
  archetype?: string;
  viralScore: number;
  slopScore: number;
  verdict: "HIGH_PRIORITY_ENGAGE" | "NEUTRAL" | "AI_SLOP_SKIP";
  reasons: string[];
  suggestedEngagement?: string;
}

export interface SocialCuratorReport {
  platform: string;
  totalScanned: number;
  highPriorityCount: number;
  slopCount: number;
  posts: SocialPostCandidate[];
}

export interface EngagementTarget {
  postId?: string;
  author: string;
  postPreview: string;
  archetype?: string;
  viralScore: number;
  slopScore: number;
  comment: string;
  status: "submitted" | "draft_ready" | "blocked_by_guard" | "failed";
  screenshotPath?: string;
  verified?: boolean;
  error?: string;
}

export interface SocialEngagementReport {
  platform: string;
  query?: string;
  totalScanned: number;
  selectedTargets: EngagementTarget[];
  dryRun: boolean;
  autoSubmit: boolean;
  durationMs: number;
}

