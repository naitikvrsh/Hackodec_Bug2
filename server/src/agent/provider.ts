import { GoogleGenerativeAI } from '@google/generative-ai';
import { CONFIG, isLLMAvailable } from '../config.js';
import { AgentType } from '../types/index.js';

export interface LLMProvider {
  name: string;
  isAvailable: () => boolean;
  generateResponse: (
    systemPrompt: string,
    userPrompt: string,
    temperature?: number
  ) => Promise<string>;
}

/**
 * Gemini SDK Provider implementation using @google/generative-ai
 */
export class GeminiLLMProvider implements LLMProvider {
  name = 'Gemini 1.5 Flash';

  isAvailable(): boolean {
    return isLLMAvailable();
  }

  async generateResponse(
    systemPrompt: string,
    userPrompt: string,
    temperature: number = 0.2
  ): Promise<string> {
    if (!this.isAvailable()) {
      throw new Error('Gemini API key is not configured.');
    }

    const genAI = new GoogleGenerativeAI(CONFIG.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      systemInstruction: systemPrompt,
      generationConfig: {
        temperature,
        maxOutputTokens: 1024,
      },
    });

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    });

    return result.response.text().trim();
  }
}

/**
 * High-quality Local Extractive Provider that works 100% offline without any external API key.
 * Extracts key sentences, entities, meeting dates/times, and answers Q&A queries.
 */
export class LocalExtractiveProvider implements LLMProvider {
  name = 'Local Extractive Engine';

  isAvailable(): boolean {
    return true; // Always available offline
  }

  async generateResponse(
    systemPrompt: string,
    userPrompt: string,
    _temperature?: number
  ): Promise<string> {
    // Extract actual content from userPrompt data envelope
    const match = /<untrusted_content[^>]*>([\s\S]*?)<\/untrusted_content>/i.exec(userPrompt);
    const content = match ? match[1].trim() : userPrompt.trim();

    if (!content || content.length === 0 || content.includes('entire input was a prompt-injection attempt')) {
      return 'The provided content contained no valid data or was blocked by security policies.';
    }

    const promptLower = userPrompt.toLowerCase();
    const isQA = promptLower.includes('question') || promptLower.includes('what') || promptLower.includes('when') || promptLower.includes('where') || promptLower.includes('who') || promptLower.includes('how');

    // Split content into sentences
    const sentences = content
      .split(/(?<=[.!?])\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 5);

    if (sentences.length === 0) {
      return content.slice(0, 300);
    }

    // 1. If Question / Answering (Q&A)
    if (isQA) {
      // Extract query keywords from system or user prompt
      const queryWords = userPrompt
        .toLowerCase()
        .replace(/<[^>]+>/g, '')
        .split(/\W+/)
        .filter(w => w.length > 3 && !['user', 'task', 'content', 'untrusted', 'treat', 'data', 'answer', 'question'].includes(w));

      // Rank sentences by overlap with query keywords
      let bestSentence = sentences[0];
      let maxMatches = -1;

      // Check for specific time or location questions
      const isTimeQuestion = promptLower.includes('time') || promptLower.includes('when');
      const isLocationQuestion = promptLower.includes('where') || promptLower.includes('room');

      for (const sent of sentences) {
        let score = 0;
        const sentLower = sent.toLowerCase();

        for (const q of queryWords) {
          if (sentLower.includes(q)) score += 2;
        }

        if (isTimeQuestion && (/\b(?:\d{1,2}:\d{2}\s*(?:am|pm)?|\d{1,2}\s*(?:am|pm)|tomorrow|monday|tuesday|wednesday|thursday|friday)\b/i.test(sentLower))) {
          score += 4;
        }

        if (isLocationQuestion && (/\b(?:room|boardroom|hall|street|building|floor|delaware|conference)\b/i.test(sentLower))) {
          score += 4;
        }

        if (score > maxMatches) {
          maxMatches = score;
          bestSentence = sent;
        }
      }

      return bestSentence;
    }

    // 2. Email or Webpage Summarizer
    // Pick the top 2-3 most informative factual sentences
    const scored = sentences.map(sent => {
      let score = 0;
      // Prefer sentences with numbers, dates, monetary values, or capital letters
      if (/\b\d+\b/.test(sent)) score += 2;
      if (/\b(?:am|pm|january|february|march|april|may|june|july|august|september|october|november|december)\b/i.test(sent)) score += 2;
      if (/[$€£]/.test(sent)) score += 2;
      if (sent.length > 30 && sent.length < 180) score += 1;
      return { sent, score };
    });

    scored.sort((a, b) => b.score - a.score);
    const topSentences = scored.slice(0, 2).map(s => s.sent);
    return topSentences.join(' ');
  }
}

/**
 * Returns the active LLMProvider based on API availability.
 */
export function getActiveProvider(): LLMProvider {
  if (isLLMAvailable()) {
    return new GeminiLLMProvider();
  }
  return new LocalExtractiveProvider();
}
