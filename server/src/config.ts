import dotenv from 'dotenv';
dotenv.config();

export const CONFIG = {
  PORT: parseInt(process.env.PORT || '4000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  
  // Firewall thresholds
  THRESHOLDS: {
    SAFE_MAX: parseInt(process.env.FIREWALL_SAFE_THRESHOLD || '30', 10), // < 30 is SAFE
    MALICIOUS_MIN: parseInt(process.env.FIREWALL_MALICIOUS_THRESHOLD || '70', 10), // >= 70 is MALICIOUS
    AMBIGUOUS_LOWER: parseInt(process.env.FIREWALL_AMBIGUOUS_LOWER || '25', 10), // 25 - 70 triggers LLM Judge if hybrid
    AMBIGUOUS_UPPER: parseInt(process.env.FIREWALL_AMBIGUOUS_UPPER || '70', 10),
  },

  LIMITS: {
    MAX_CONTENT_LENGTH_BYTES: 100 * 1024, // 100 KB limit
    RATE_LIMIT_WINDOW_MS: 60 * 1000, // 1 minute
    RATE_LIMIT_MAX_REQUESTS: 120, // 120 requests / min
  },

  ENVELOPE: {
    OPEN_TAG: '<untrusted_content source="untrusted_input" firewall="v1.0">',
    CLOSE_TAG: '</untrusted_content>',
  },
} as const;

export function isLLMAvailable(): boolean {
  return Boolean(CONFIG.GEMINI_API_KEY && CONFIG.GEMINI_API_KEY.trim().length > 0);
}
