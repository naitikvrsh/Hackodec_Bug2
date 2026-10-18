import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

/**
 * Resolves the path to the 'data' directory regardless of whether the process
 * was started from the workspace root (e.g. Render / Docker) or the server workspace.
 */
export function getDataDir(): string {
  const candidate1 = path.resolve(process.cwd(), 'data');
  if (fs.existsSync(candidate1)) return candidate1;
  const candidate2 = path.resolve(process.cwd(), '../data');
  if (fs.existsSync(candidate2)) return candidate2;
  return candidate1;
}

/**
 * Resolves the path to the 'models' directory regardless of execution context.
 */
export function getModelsDir(): string {
  const candidate1 = path.resolve(process.cwd(), 'models');
  if (fs.existsSync(candidate1)) return candidate1;
  const candidate2 = path.resolve(process.cwd(), '../models');
  if (fs.existsSync(candidate2)) return candidate2;
  return candidate1;
}

/**
 * Resolves the root directory of the project.
 */
export function getRootDir(): string {
  if (
    fs.existsSync(path.resolve(process.cwd(), 'package.json')) &&
    fs.existsSync(path.resolve(process.cwd(), 'server'))
  ) {
    return process.cwd();
  }
  return path.resolve(process.cwd(), '..');
}

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
