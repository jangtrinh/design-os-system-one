/**
 * Adaptive Multilingual Token Estimator
 *
 * Provides accurate token count estimations for BPE tokenizers (cl100k_base,
 * o200k_base, Anthropic Claude, Llama 3) across English, Vietnamese, CJK, and Code.
 * Replaces naive `length / 4` to prevent 30%-50% token undercounting on non-ASCII text.
 */

const VIETNAMESE_REGEX = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
const CJK_REGEX = /[\u4e00-\u9fa5\u3040-\u30ff\uac00-\ud7af]/;
const PUNCT_OR_CODE_REGEX = /[{}\[\]().,;:+\-*\/\\|&^%#@!~?><="']/g;

export interface TokenEstimationDetail {
  totalTokens: number;
  wordCount: number;
  cjkCharCount: number;
  vietnameseWordCount: number;
  codeSymbolCount: number;
  hasMultilingual: boolean;
}

/**
 * Calculates adaptive token count for any text.
 */
export function estimateTokens(text: string): number {
  if (!text || text.length === 0) {
    return 0;
  }

  // Fast path for short ASCII strings
  if (text.length <= 4 && /^[\x00-\x7F]+$/.test(text)) {
    return 1;
  }

  let cjkCount = 0;
  let nonCjkBuffer = "";

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (CJK_REGEX.test(char)) {
      cjkCount++;
    } else {
      nonCjkBuffer += char;
    }
  }

  // CJK characters average ~1.7 tokens per char in modern BPE
  const cjkTokens = Math.ceil(cjkCount * 1.7);

  if (nonCjkBuffer.trim().length === 0) {
    return Math.max(1, cjkTokens);
  }

  // Count code symbols/punctuation which often map to individual tokens
  const punctMatches = nonCjkBuffer.match(PUNCT_OR_CODE_REGEX);
  const punctTokens = punctMatches ? Math.ceil(punctMatches.length * 0.7) : 0;

  // Split into words
  const words = nonCjkBuffer.trim().split(/\s+/);
  let wordTokens = 0;

  for (const word of words) {
    if (VIETNAMESE_REGEX.test(word)) {
      // Vietnamese words with diacritics split into ~1.4 subword tokens on BPE
      wordTokens += 1.4;
    } else if (word.length > 8) {
      // Long compound or technical words split into multiple subwords
      wordTokens += Math.max(1.5, Math.ceil(word.length / 4.2));
    } else {
      // Standard English/Latin word
      wordTokens += 1.2;
    }
  }

  const estimated = Math.ceil(wordTokens + punctTokens + cjkTokens);
  return Math.max(1, estimated);
}

/**
 * Provides breakdown details for inspection and auditing.
 */
export function analyzeTokens(text: string): TokenEstimationDetail {
  if (!text || text.length === 0) {
    return {
      totalTokens: 0,
      wordCount: 0,
      cjkCharCount: 0,
      vietnameseWordCount: 0,
      codeSymbolCount: 0,
      hasMultilingual: false,
    };
  }

  let cjkCharCount = 0;
  for (let i = 0; i < text.length; i++) {
    if (CJK_REGEX.test(text[i])) cjkCharCount++;
  }

  const punctMatches = text.match(PUNCT_OR_CODE_REGEX);
  const codeSymbolCount = punctMatches ? punctMatches.length : 0;

  const words = text.trim().split(/\s+/).filter(Boolean);
  let vietnameseWordCount = 0;
  for (const w of words) {
    if (VIETNAMESE_REGEX.test(w)) vietnameseWordCount++;
  }

  return {
    totalTokens: estimateTokens(text),
    wordCount: words.length,
    cjkCharCount,
    vietnameseWordCount,
    codeSymbolCount,
    hasMultilingual: cjkCharCount > 0 || vietnameseWordCount > 0,
  };
}
