import { Finding, PreprocessedOutput, Segment } from '../types/index.js';

const HOMOGLYPHS: Record<string, string> = {
  'а': 'a', 'А': 'A',
  'с': 'c', 'С': 'C',
  'е': 'e', 'Е': 'E',
  'о': 'o', 'О': 'O',
  'р': 'p', 'Р': 'P',
  'х': 'x', 'Х': 'X',
  'у': 'y', 'У': 'Y',
  'і': 'i', 'І': 'I',
  'ј': 'j', 'Ј': 'J',
  'ѕ': 's', 'Ѕ': 'S',
  'ԁ': 'd', 'Ԃ': 'D',
  'ԛ': 'q', 'Ԛ': 'Q',
  'һ': 'h', 'Һ': 'H',
  'ո': 'n', 'в': 'b',
  'г': 'r', 'м': 'm',
  'п': 'n', 'т': 't',
  'ø': 'o', 'Ø': 'O',
  'ł': 'l', 'Ł': 'L',
};

const ZERO_WIDTH_AND_BIDI_REGEX = /[\u200B-\u200D\uFEFF\u200E\u200F\u202A-\u202E\u2066-\u2069\u00AD]/g;
const HIDDEN_STYLE_REGEX = /style\s*=\s*["'][^"']*(?:display\s*:\s*none|visibility\s*:\s*hidden|font-size\s*:\s*0|opacity\s*:\s*0|color\s*:\s*(?:white|#fff(?:fff)?);?\s*background(?:-color)?\s*:\s*(?:white|#fff(?:fff)?)|position\s*:\s*absolute;?\s*(?:left|top)\s*:\s*-\d{3,}px)[^"']*["'][^>]*>([\s\S]*?)<\/[a-z0-9]+>/gi;
const HTML_COMMENT_REGEX = /<!--([\s\S]*?)-->/g;
const SCRIPT_STYLE_REGEX = /<(?:script|style)\b[^>]*>([\s\S]*?)<\/(?:script|style)>/gi;
const META_TAG_REGEX = /<meta\b[^>]*(?:content|value)\s*=\s*["']([^"']+)["'][^>]*>/gi;
const MD_LINK_TITLE_REGEX = /\[([^\]]*)\]\([^)]+\s+["']([^"']+)["']\)/g;
const DATA_URI_REGEX = /data:(?:text\/plain|text\/html);base64,([A-Za-z0-9+/=]+)/gi;

export function normalizeHomoglyphs(text: string): string {
  let result = '';
  for (const char of text) {
    result += HOMOGLYPHS[char] || char;
  }
  return result;
}

export function normalizeLeetspeak(text: string): string {
  // Preserve valid email addresses from @ replacement
  const emails: string[] = [];
  const placeholderText = text.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, (match) => {
    emails.push(match);
    return `__EMAIL_PRESERVED_${emails.length - 1}__`;
  });

  let normalized = placeholderText
    .replace(/\b1gn[o0]re\b/gi, 'ignore')
    .replace(/\b1gnore\b/gi, 'ignore')
    .replace(/\bign0re\b/gi, 'ignore')
    .replace(/\bd1sregard\b/gi, 'disregard')
    .replace(/\bdisreg[a4]rd\b/gi, 'disregard')
    .replace(/\bf[0o]rget\b/gi, 'forget')
    .replace(/\bsyst[e3]m\b/gi, 'system')
    .replace(/\bpr[o0]mpt\b/gi, 'prompt')
    .replace(/\bov[e3]rr[i1]d[e3]\b/gi, 'override')
    .replace(/\b[e3]xf[i1]l\b/gi, 'exfil')
    .replace(/\bp[a4]ssw[o0]rds?\b/gi, 'password')
    .replace(/\bs[e3]cr[e3]t\b/gi, 'secret')
    .replace(/\b[a4]dm[i1]n\b/gi, 'admin')
    .replace(/(?<=\w)@(?=\w)/g, 'a')
    .replace(/\$([a-zA-Z])/g, 's$1');

  // Restore preserved email addresses
  normalized = normalized.replace(/__EMAIL_PRESERVED_(\d+)__/g, (_, idx) => emails[parseInt(idx, 10)]);
  return normalized;
}

export function collapseSpacedWords(text: string): string {
  return text.replace(/\b([a-zA-Z])(?:\s+([a-zA-Z])){2,}\b/g, (match) => {
    const compact = match.replace(/\s+/g, '');
    const lower = compact.toLowerCase();
    const commonInjectionKeywords = [
      'ignore', 'disregard', 'forget', 'system', 'prompt', 'override',
      'jailbreak', 'secret', 'password', 'exfiltrate', 'bypass', 'admin',
      'instruction', 'instructions', 'reveal', 'repeat', 'dan'
    ];
    if (commonInjectionKeywords.includes(lower)) {
      return compact;
    }
    return match;
  });
}

export function decodeRot13(text: string): string {
  return text.replace(/[a-zA-Z]/g, (c) => {
    const code = c.charCodeAt(0);
    const base = code >= 97 ? 97 : 65;
    return String.fromCharCode(((code - base + 13) % 26) + base);
  });
}

export function detectSuspiciousRot13(text: string): { decoded: string; span: string } | null {
  const decoded = decodeRot13(text);
  if (/\b(?:ignore\s+all\s+previous|disregard|system\s+prompt|developer\s+mode)\b/i.test(decoded)) {
    return { decoded, span: text };
  }
  return null;
}

export function detectBase64Blobs(text: string): Array<{ original: string; decoded: string; offset: number }> {
  const results: Array<{ original: string; decoded: string; offset: number }> = [];
  const b64Regex = /\b[A-Za-z0-9+/]{20,}={0,2}\b/g;
  let match: RegExpExecArray | null;

  while ((match = b64Regex.exec(text)) !== null) {
    const candidate = match[0];
    try {
      const decoded = Buffer.from(candidate, 'base64').toString('utf8');
      const printableCount = (decoded.match(/[\x20-\x7E\t\n\r]/g) || []).length;
      if (printableCount > candidate.length * 0.6 && printableCount >= 10) {
        results.push({
          original: candidate,
          decoded,
          offset: match.index,
        });
      }
    } catch {
      // Ignored
    }
  }
  return results;
}

export function detectHexBlobs(text: string): Array<{ original: string; decoded: string; offset: number }> {
  const results: Array<{ original: string; decoded: string; offset: number }> = [];
  const hexRegex = /(?:\\x[0-9a-fA-F]{2}){4,}/g;
  let match: RegExpExecArray | null;

  while ((match = hexRegex.exec(text)) !== null) {
    const raw = match[0];
    try {
      const hexChars = raw.split('\\x').filter(Boolean);
      const decoded = hexChars.map(h => String.fromCharCode(parseInt(h, 16))).join('');
      if (/[\x20-\x7E]/.test(decoded)) {
        results.push({
          original: raw,
          decoded,
          offset: match.index,
        });
      }
    } catch {
      // Ignored
    }
  }
  return results;
}

export function detectUrlEncodedBlobs(text: string): Array<{ original: string; decoded: string; offset: number }> {
  const results: Array<{ original: string; decoded: string; offset: number }> = [];
  const urlEncRegex = /(?:%[0-9a-fA-F]{2}){4,}/g;
  let match: RegExpExecArray | null;

  while ((match = urlEncRegex.exec(text)) !== null) {
    const raw = match[0];
    try {
      const decoded = decodeURIComponent(raw);
      if (decoded !== raw && /[\x20-\x7E]/.test(decoded)) {
        results.push({
          original: raw,
          decoded,
          offset: match.index,
        });
      }
    } catch {
      // Ignored
    }
  }
  return results;
}

/**
 * Splits text into logical segments (by sentences or lines) while preserving full text offsets.
 * Punctuation is only treated as sentence end if followed by whitespace or line end.
 */
export function splitIntoSegments(text: string): Segment[] {
  const segments: Segment[] = [];
  if (!text || text.trim().length === 0) {
    return segments;
  }

  // Segment 0 is always the full text document representation
  segments.push({
    index: 0,
    text,
    normalizedText: text,
    startOffset: 0,
    endOffset: text.length,
    isHidden: false,
    isDecoded: false,
  });

  // Regex splits on sentence-ending punctuation followed by whitespace or newlines
  const sentenceRegex = /([^\r\n.!?]+(?:[.!?]+(?=[\s\r\n]|$)|[\r\n]+|$))/g;
  let match: RegExpExecArray | null;
  let index = 1;

  while ((match = sentenceRegex.exec(text)) !== null) {
    const segText = match[0];
    if (segText.trim().length === 0) continue;

    const startOffset = match.index;
    const endOffset = startOffset + segText.length;

    segments.push({
      index: index++,
      text: segText,
      normalizedText: segText,
      startOffset,
      endOffset,
      isHidden: false,
      isDecoded: false,
    });
  }

  return segments;
}

export function preprocessContent(rawText: string): PreprocessedOutput {
  if (typeof rawText !== 'string') {
    rawText = String(rawText || '');
  }

  const hiddenFindings: Finding[] = [];
  const decodedFindings: Finding[] = [];

  // 1. Detect zero-width and BiDi controls
  let zeroWidthCount = 0;
  const cleanedZeroWidth = rawText.replace(ZERO_WIDTH_AND_BIDI_REGEX, () => {
    zeroWidthCount++;
    return '';
  });

  if (zeroWidthCount > 0) {
    hiddenFindings.push({
      ruleId: 'HIDDEN_ZERO_WIDTH',
      category: 'HIDDEN_CONTENT',
      severity: 85,
      evidenceText: `Detected ${zeroWidthCount} zero-width or BiDi direction override characters`,
      startOffset: 0,
      endOffset: rawText.length,
      segmentIndex: 0,
      explanation: 'Zero-width or invisible Unicode characters are commonly used to hide injection payloads from human reviewers.',
      source: 'hidden',
    });
  }

  // 2. Extract hidden HTML content
  let match: RegExpExecArray | null;

  while ((match = HIDDEN_STYLE_REGEX.exec(rawText)) !== null) {
    const hiddenBody = match[1]?.trim();
    if (hiddenBody) {
      hiddenFindings.push({
        ruleId: 'HIDDEN_CSS_ELEMENT',
        category: 'HIDDEN_CONTENT',
        severity: 90,
        evidenceText: match[0],
        startOffset: match.index,
        endOffset: match.index + match[0].length,
        segmentIndex: 0,
        explanation: `Hidden HTML element detected using CSS styling. Content: "${hiddenBody.slice(0, 100)}"`,
        source: 'hidden',
      });
    }
  }

  while ((match = HTML_COMMENT_REGEX.exec(rawText)) !== null) {
    const commentBody = match[1]?.trim();
    if (commentBody && commentBody.length > 5) {
      hiddenFindings.push({
        ruleId: 'HIDDEN_HTML_COMMENT',
        category: 'HIDDEN_CONTENT',
        severity: 75,
        evidenceText: match[0],
        startOffset: match.index,
        endOffset: match.index + match[0].length,
        segmentIndex: 0,
        explanation: `Hidden instruction or text found inside an HTML comment: "${commentBody.slice(0, 100)}"`,
        source: 'hidden',
      });
    }
  }

  while ((match = SCRIPT_STYLE_REGEX.exec(rawText)) !== null) {
    hiddenFindings.push({
      ruleId: 'HIDDEN_SCRIPT_STYLE',
      category: 'HIDDEN_CONTENT',
      severity: 80,
      evidenceText: match[0].slice(0, 100),
      startOffset: match.index,
      endOffset: match.index + match[0].length,
      segmentIndex: 0,
      explanation: 'Script or style tag embedded inside untrusted user data.',
      source: 'hidden',
    });
  }

  while ((match = META_TAG_REGEX.exec(rawText)) !== null) {
    hiddenFindings.push({
      ruleId: 'HIDDEN_META_TAG',
      category: 'HIDDEN_CONTENT',
      severity: 70,
      evidenceText: match[0],
      startOffset: match.index,
      endOffset: match.index + match[0].length,
      segmentIndex: 0,
      explanation: `Metadata content attribute injection: "${match[1].slice(0, 80)}"`,
      source: 'hidden',
    });
  }

  while ((match = MD_LINK_TITLE_REGEX.exec(rawText)) !== null) {
    const title = match[2];
    if (title && /(?:ignore|system|instruction|prompt|send|leak|password)/i.test(title)) {
      hiddenFindings.push({
        ruleId: 'HIDDEN_MD_LINK_TITLE',
        category: 'HIDDEN_CONTENT',
        severity: 85,
        evidenceText: match[0],
        startOffset: match.index,
        endOffset: match.index + match[0].length,
        segmentIndex: 0,
        explanation: `Markdown link title attribute hides instruction payload: "${title}"`,
        source: 'hidden',
      });
    }
  }

  while ((match = DATA_URI_REGEX.exec(rawText)) !== null) {
    hiddenFindings.push({
      ruleId: 'HIDDEN_DATA_URI',
      category: 'HIDDEN_CONTENT',
      severity: 85,
      evidenceText: match[0].slice(0, 80),
      startOffset: match.index,
      endOffset: match.index + match[0].length,
      segmentIndex: 0,
      explanation: 'Base64 data URI embedded in document.',
      source: 'hidden',
    });
  }

  // 3. Normalization (NFKC, homoglyphs, leetspeak, spacing)
  let normalized = cleanedZeroWidth.normalize('NFKC');
  normalized = normalizeHomoglyphs(normalized);
  normalized = normalizeLeetspeak(normalized);
  normalized = collapseSpacedWords(normalized);

  // 4. Segmentation
  const segments = splitIntoSegments(rawText);
  for (const seg of segments) {
    let segNorm = seg.text.replace(ZERO_WIDTH_AND_BIDI_REGEX, '');
    segNorm = segNorm.normalize('NFKC');
    segNorm = normalizeHomoglyphs(segNorm);
    segNorm = normalizeLeetspeak(segNorm);
    segNorm = collapseSpacedWords(segNorm);
    seg.normalizedText = segNorm;
  }

  // 5. Decode encoded blobs & add decoded segments for deeper inspection
  const b64Blobs = detectBase64Blobs(rawText);
  for (const b64 of b64Blobs) {
    decodedFindings.push({
      ruleId: 'ENCODED_BASE64_PAYLOAD',
      category: 'HIDDEN_CONTENT',
      severity: 75,
      evidenceText: b64.original,
      startOffset: b64.offset,
      endOffset: b64.offset + b64.original.length,
      segmentIndex: -1,
      explanation: `Decoded base64 payload reveals embedded text: "${b64.decoded.slice(0, 100)}"`,
      source: 'hidden',
    });

    segments.push({
      index: segments.length,
      text: b64.decoded,
      normalizedText: b64.decoded.normalize('NFKC').toLowerCase(),
      startOffset: b64.offset,
      endOffset: b64.offset + b64.original.length,
      isHidden: true,
      isDecoded: true,
      decodedSource: 'base64',
    });
  }

  const hexBlobs = detectHexBlobs(rawText);
  for (const hex of hexBlobs) {
    decodedFindings.push({
      ruleId: 'ENCODED_HEX_PAYLOAD',
      category: 'HIDDEN_CONTENT',
      severity: 75,
      evidenceText: hex.original,
      startOffset: hex.offset,
      endOffset: hex.offset + hex.original.length,
      segmentIndex: -1,
      explanation: `Decoded hex payload reveals embedded text: "${hex.decoded.slice(0, 100)}"`,
      source: 'hidden',
    });

    segments.push({
      index: segments.length,
      text: hex.decoded,
      normalizedText: hex.decoded.normalize('NFKC').toLowerCase(),
      startOffset: hex.offset,
      endOffset: hex.offset + hex.original.length,
      isHidden: true,
      isDecoded: true,
      decodedSource: 'hex',
    });
  }

  const rot13Match = detectSuspiciousRot13(rawText);
  if (rot13Match) {
    decodedFindings.push({
      ruleId: 'ENCODED_ROT13_PAYLOAD',
      category: 'HIDDEN_CONTENT',
      severity: 85,
      evidenceText: rot13Match.span,
      startOffset: 0,
      endOffset: rawText.length,
      segmentIndex: -1,
      explanation: `Suspicious ROT13 cipher detected: "${rot13Match.decoded.slice(0, 100)}"`,
      source: 'hidden',
    });

    segments.push({
      index: segments.length,
      text: rot13Match.decoded,
      normalizedText: rot13Match.decoded.normalize('NFKC').toLowerCase(),
      startOffset: 0,
      endOffset: rawText.length,
      isHidden: true,
      isDecoded: true,
      decodedSource: 'rot13',
    });
  }

  const urlEncBlobs = detectUrlEncodedBlobs(rawText);
  for (const urlEnc of urlEncBlobs) {
    if (/(?:ignore|disregard|system|prompt|bypass)/i.test(urlEnc.decoded)) {
      decodedFindings.push({
        ruleId: 'ENCODED_URL_PAYLOAD',
        category: 'HIDDEN_CONTENT',
        severity: 80,
        evidenceText: urlEnc.original,
        startOffset: urlEnc.offset,
        endOffset: urlEnc.offset + urlEnc.original.length,
        segmentIndex: -1,
        explanation: `URL-encoded injection payload decoded: "${urlEnc.decoded.slice(0, 100)}"`,
        source: 'hidden',
      });

      segments.push({
        index: segments.length,
        text: urlEnc.decoded,
        normalizedText: urlEnc.decoded.normalize('NFKC').toLowerCase(),
        startOffset: urlEnc.offset,
        endOffset: urlEnc.offset + urlEnc.original.length,
        isHidden: true,
        isDecoded: true,
        decodedSource: 'url_encoded',
      });
    }
  }

  const offsetMap: number[] = [];
  for (let i = 0; i < rawText.length; i++) {
    offsetMap.push(i);
  }

  return {
    rawText,
    normalizedText: normalized,
    segments,
    hiddenFindings,
    decodedFindings,
    offsetMap,
  };
}
