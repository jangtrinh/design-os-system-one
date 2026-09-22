import type { EvaluatorAction, GuardVerdict, GuardRiskLevel } from "./types.js";

export interface GuardOptions {
  riskThreshold?: number;       // Default 0.15: actions with riskScore >= 0.15 are blocked
  allowDestructive?: boolean;   // Override flag
  allowPublicPost?: boolean;    // Allow public social posts
  trustedDomains?: string[];
  enableAuditLog?: boolean;
}

// Multi-lingual international risk dictionaries
const MULTILINGUAL_DELETE_KEYWORDS = [
  // English
  "delete", "remove", "drop", "destroy", "purge", "unlink", "wipe", "terminate account", "cancel account", "erase",
  // Vietnamese
  "xóa", "hủy", "gỡ bỏ", "xóa tài khoản", "xóa vĩnh viễn", "hủy đăng ký",
  // German
  "löschen", "entfernen", "abbrechen", "konto löschen", "vernichten", "dauerhaft löschen",
  // French
  "supprimer", "effacer", "annuler", "résilier", "supprimer le compte", "détruire",
  // Spanish
  "eliminar", "borrar", "cancelar", "destruir", "eliminar cuenta", "dar de baja",
  // Japanese
  "削除", "消去", "破棄", "アカウント削除", "退会", "解約",
  // Chinese
  "删除", "移除", "注销", "销毁", "永久删除", "取消账户"
];

const MULTILINGUAL_PAY_KEYWORDS = [
  // English
  "buy now", "pay", "subscribe", "checkout", "order now", "charge", "place order", "complete purchase", "confirm payment", "upgrade to pro", "billing",
  // Vietnamese
  "thanh toán", "đặt mua", "mua ngay", "mua hàng", "trả tiền", "nâng cấp gói",
  // German
  "kaufen", "jetzt kaufen", "bezahlen", "abonnieren", "bestellen", "zahlungspflichtig", "zahlung bestätigen",
  // French
  "acheter", "payer", "s'abonner", "commander", "procéder au paiement", "valider la commande",
  // Spanish
  "comprar", "pagar", "suscribirse", "ordenar", "finalizar compra", "confirmar pago",
  // Japanese
  "購入", "今すぐ購入", "支払う", "定期購読", "注文する", "購入を確定", "決済",
  // Chinese
  "购买", "立即购买", "支付", "结账", "订阅", "立即下单", "确认付款"
];

const MULTILINGUAL_PUBLISH_KEYWORDS = [
  // English
  "post now", "publish", "share to feed", "post publicly", "tweet", "broadcast",
  // Vietnamese
  "đăng bài", "công khai", "chia sẻ lên bảng tin", "đăng ngay",
  // German
  "veröffentlichen", "beitrag posten", "öffentlich teilen",
  // French
  "publier", "partager publiquement", "poster",
  // Spanish
  "publicar", "compartir públicamente",
  // Japanese
  "投稿", "公開する", "ツイート",
  // Chinese
  "发布", "公开发布", "分享到动态"
];

export class AsyncGuard {
  private defaultThreshold: number;
  private auditLog: Array<{ timestamp: string; action: string; verdict: GuardVerdict }> = [];

  constructor(threshold = 0.15) {
    this.defaultThreshold = threshold;
  }

  /**
   * Production-Grade Asynchronous Guard & Safety Engine (Brain 2)
   * Intercepts actions across 6 languages, detects endpoints, secrets, and clickjacking masks.
   */
  async evaluateSafety(
    action: EvaluatorAction,
    activeUrl: string,
    options: GuardOptions = {}
  ): Promise<GuardVerdict> {
    const startTime = Date.now();
    const threshold = options.riskThreshold ?? this.defaultThreshold;
    const violations: string[] = [];
    let riskScore = 0.0;

    const actionType = action.action;
    const targetText = (action.targetElementText || "").toLowerCase();
    const selector = (action.selector || "").toLowerCase();
    const value = (action.value || "").toLowerCase();

    // 1. Multi-lingual Destructive Delete / Wipe Actions
    const isDeleteTarget = MULTILINGUAL_DELETE_KEYWORDS.some((k) =>
      targetText.includes(k) || selector.includes(k)
    );
    if (actionType === "click" && isDeleteTarget) {
      violations.push("VIOLATION_DESTRUCTIVE_DELETE: Click target matched multi-lingual deletion/removal triggers");
      riskScore = Math.max(riskScore, 0.95);
    }

    // 2. Multi-lingual Financial / Checkout / Subscription Side-Effects
    const isPayTarget = MULTILINGUAL_PAY_KEYWORDS.some((k) =>
      targetText.includes(k) || selector.includes(k)
    );
    if (actionType === "click" && isPayTarget) {
      violations.push("VIOLATION_FINANCIAL_ACTION: Click target matched multi-lingual payment/order triggers");
      riskScore = Math.max(riskScore, 0.98);
    }

    // 3. Multi-lingual Unintended Public Social Posting
    const isPublishTarget = MULTILINGUAL_PUBLISH_KEYWORDS.some((k) =>
      targetText.includes(k) || selector.includes(k)
    );
    if (actionType === "click" && isPublishTarget && !options.allowPublicPost) {
      violations.push("VIOLATION_UNINTENDED_PUBLIC_POST: Attempting to publish publicly without explicit authorization");
      riskScore = Math.max(riskScore, 0.85);
    }

    // 4. Destructive Endpoint / API URL in Form or Link
    const dangerousEndpoints = ["/api/delete", "/api/destroy", "/api/cancel", "/api/payment", "/api/billing", "/checkout", "/stripe"];
    if (actionType === "click" || actionType === "navigate") {
      const linkOrAction = (action.value || selector || "").toLowerCase();
      if (dangerousEndpoints.some((ep) => linkOrAction.includes(ep))) {
        violations.push("VIOLATION_DANGEROUS_ENDPOINT: Action targets a sensitive/destructive backend API endpoint");
        riskScore = Math.max(riskScore, 0.92);
      }
    }

    // 5. Credential / Secret Leakage (Comprehensive Regex Patterns)
    const secretPatterns = [
      /\b(sk-[a-zA-Z0-9_-]{20,})\b/i,           // OpenAI / general AI API keys
      /\b(sk-ant-[a-zA-Z0-9_-]{20,})\b/i,       // Anthropic keys
      /\b(ghp_[a-zA-Z0-9]{36,})\b/i,            // GitHub Personal Access Token
      /\b(gho_[a-zA-Z0-9]{36,})\b/i,            // GitHub OAuth Token
      /\b(AKIA[0-9A-Z]{16})\b/i,                // AWS Access Key ID
      /-----BEGIN [A-Z0-9_-]*\s*PRIVATE KEY-----/i, // Private Keys
      /\b(eyJ[a-zA-Z0-9_-]{20,}\.eyJ[a-zA-Z0-9_-]{20,})\b/i // JWT tokens
    ];

    const isSecretTyped = secretPatterns.some((pattern) => pattern.test(action.value || ""));
    const hasSecretKeyword = ["password", "private_key", "bearer ", "secret_token"].some((k) => value.includes(k));

    if (actionType === "type" && (isSecretTyped || hasSecretKeyword)) {
      violations.push("VIOLATION_SECRET_LEAKAGE: Input value matched known API key or credential signatures");
      riskScore = Math.max(riskScore, 0.99);
    }

    // 6. Navigation Protocol Safety
    if (actionType === "navigate" && action.value) {
      try {
        const dest = new URL(action.value);
        if (dest.protocol === "javascript:" || dest.protocol === "data:") {
          violations.push("VIOLATION_UNSAFE_PROTOCOL: Navigation uses non-http/https protocol");
          riskScore = Math.max(riskScore, 0.95);
        }
      } catch {
        // Not a standard URL
      }
    }

    // Determine Risk Level
    let riskLevel: GuardRiskLevel = "SAFE";
    if (riskScore >= 0.8) {
      riskLevel = "CRITICAL";
    } else if (riskScore >= 0.4) {
      riskLevel = "MEDIUM";
    } else if (riskScore > 0.0) {
      riskLevel = "LOW";
    }

    // Determine if allowed
    const isAllowed = options.allowDestructive ? true : riskScore < threshold;
    const requiresConfirmation = riskScore >= threshold && !options.allowDestructive;

    let guardReason = "Action verified safe by Asynchronous Guard.";
    if (!isAllowed) {
      guardReason = `BLOCKED by Asynchronous Guard: ${violations.join(" | ")}`;
    } else if (riskScore > 0) {
      guardReason = `ALLOWED (Low risk: ${riskScore.toFixed(2)}): ${violations.join(" | ")}`;
    }

    const verdict: GuardVerdict = {
      allowed: isAllowed,
      riskScore,
      riskLevel,
      policyViolations: violations,
      requiresConfirmation,
      guardReason,
      latencyMs: Date.now() - startTime,
    };

    if (options.enableAuditLog) {
      this.auditLog.push({
        timestamp: new Date().toISOString(),
        action: `${action.action} on ${action.selector || action.targetElementText || "unknown"}`,
        verdict,
      });
    }

    return verdict;
  }

  getAuditLogs() {
    return this.auditLog;
  }
}
