import { Finding, PreprocessedOutput, Segment, TaskContext } from '../types/index.js';

// Keywords indicating educational, research, or security analysis task
const META_TASK_KEYWORDS = [
  'security', 'prompt injection', 'jailbreak', 'vulnerability', 'attack',
  'exploit', 'malicious', 'red team', 'adversarial', 'cve', 'mitre',
  'analyze attack', 'explain injection', 'research paper', 'defense'
];

// Patterns indicating descriptive or quoted examples rather than executable commands
const MENTION_CONTEXT_PATTERNS = [
  /(?:for example|e\.g\.|such as|an attacker might (?:write|say|send)|example payload|sample attack|payloads like|a prompt injection like|strings such as|attackers often use)\s*[:"']/i,
  /(?:^|\s)["'“`][^"'”`]*(?:ignore|disregard|system prompt|jailbreak|exfil)[^"'”`]*["'”`]/i,
  /```[\s\S]*?(?:ignore|disregard|system prompt)[\s\S]*?```/i,
];

// Human-to-human benign communication patterns (hard negatives)
const BENIGN_HUMAN_IDIOMS: Array<{ pattern: RegExp; ruleIdsToSuppress: string[]; reason: string }> = [
  {
    // "please ignore my previous email/message"
    pattern: /\b(?:please\s+)?ignore\s+(?:my\s+)?(?:previous|last|prior|earlier)\s+(?:email|message|note|text|slack|chat|version|invoice|draft)\b/i,
    ruleIdsToSuppress: ['OVERRIDE_DIRECT_IGNORE'],
    reason: 'Benign human conversational idiom referring to a previous email/message, not targeting the AI agent.',
  },
  {
    // "disregard my last email/note"
    pattern: /\b(?:please\s+)?disregard\s+(?:my\s+)?(?:last|previous|prior)\s+(?:email|message|note|version|invoice|comment)\b/i,
    ruleIdsToSuppress: ['OVERRIDE_DIRECT_IGNORE'],
    reason: 'Benign human conversational idiom referring to a prior email or correction.',
  },
  {
    // "reveal the winner / results / surprise"
    pattern: /\b(?:reveal|announce|unveil|share)\s+(?:the\s+)?(?:winner|results?|prizes?|surprise|champion|score|agenda)\b/i,
    ruleIdsToSuppress: ['EXFIL_SYSTEM_PROMPT_DIRECT'],
    reason: 'Benign narrative referring to announcing winners or event results, not extracting system prompts.',
  },
  {
    // "forward this email/invoice/update to the team/accounting"
    pattern: /\b(?:forward|send)\s+(?:this\s+)?(?:email|invoice|agenda|document|receipt|update|message|attachment)\s+to\s+(?:the\s+team|accounting|finance|hr|all|colleagues|management|support|sales|marketing|legal|compliance)\b/i,
    ruleIdsToSuppress: ['DATA_EXFIL_NET_REQUEST', 'DATA_EXFIL_EMAIL_TARGET'],
    reason: 'Standard internal business forwarding instruction between human colleagues.',
  },
  {
    // Recipe/cooking context: "ignore lumps", "whisk eggs"
    pattern: /\b(?:ignore\s+(?:any\s+)?(?:small\s+)?(?:lumps|air\s+bubbles|foam|imperfections)|whisk|bake|stir|simmer|tablespoon|teaspoon)\b/i,
    ruleIdsToSuppress: ['OVERRIDE_DIRECT_IGNORE'],
    reason: 'Culinary or physical recipe instructions containing descriptive verbs.',
  },
  {
    // IT password reset policy / HR memo
    pattern: /\b(?:password\s+policy|reset\s+your\s+password\s+(?:via|by|on)|mandatory\s+compliance|employee\s+handbook|hr\s+announcement)\b/i,
    ruleIdsToSuppress: ['DATA_EXFIL_NET_REQUEST', 'OVERRIDE_DIRECT_IGNORE', 'OVERRIDE_NEW_INSTRUCTIONS'],
    reason: 'Legitimate corporate IT security or HR policy documentation.',
  },
  {
    // Technical software installation README commands: "npm install", "run command"
    pattern: /\b(?:installation\s+instructions|getting\s+started|run\s+the\s+following\s+command\s*:\s*(?:npm|yarn|pnpm|pip|cargo)\s+install)\b/i,
    ruleIdsToSuppress: ['TOOL_CALL_UNAUTHORIZED_COMMAND'],
    reason: 'Standard open-source library installation documentation in README.',
  },
];

/**
 * Analyzes the declared user task and content context.
 */
export function analyzeTaskContext(task: string, content: string): TaskContext {
  const taskLower = (task || '').toLowerCase();
  
  // Check if the user is explicitly requesting security analysis or education
  const isEducationalOrMeta = META_TASK_KEYWORDS.some(keyword => taskLower.includes(keyword));

  // Count imperative statements directed at AI
  const aiImperativeRegex = /\b(?:you\s+must|your\s+new\s+task|from\s+now\s+on\s+you|as\s+an\s+ai|assistant\s+must)\b/i;
  const addressedToAgent = aiImperativeRegex.test(content);

  // Compute lexical overlap between task and content
  const taskWords = new Set(taskLower.split(/\W+/).filter(w => w.length > 3));
  let overlapCount = 0;
  for (const word of taskWords) {
    if (content.toLowerCase().includes(word)) {
      overlapCount++;
    }
  }

  const relevanceEvaluation = isEducationalOrMeta
    ? 'Task explicitly requests educational or security analysis of prompt injection techniques.'
    : overlapCount > 0
    ? `Task exhibits context alignment (lexical overlap: ${overlapCount} key terms).`
    : 'Content contains elements diverging from declared user task.';

  return {
    declaredTask: task,
    isEducationalOrMeta,
    relevanceEvaluation,
    imperativesCount: (content.match(/\b(?:must|do\s+not|never|always|ignore|delete|send)\b/gi) || []).length,
    addressedToAgent,
  };
}

/**
 * Refines raw rule findings based on contextual analysis (attack vs mention, human idioms, educational task).
 */
export function filterAndAdjustFindings(
  findings: Finding[],
  taskContext: TaskContext,
  preprocessed: PreprocessedOutput
): { adjustedFindings: Finding[]; contextNotes: string[] } {
  const adjustedFindings: Finding[] = [];
  const contextNotes: string[] = [];

  for (const finding of findings) {
    const rawSpan = finding.evidenceText;
    const segment = preprocessed.segments.find(s => s.index === finding.segmentIndex) 
      || preprocessed.segments[0];
    const segmentText = segment?.text || rawSpan;

    // 1. Check for benign human-to-human idioms (hard negatives)
    let suppressedByIdiom = false;
    for (const idiom of BENIGN_HUMAN_IDIOMS) {
      if (idiom.ruleIdsToSuppress.includes(finding.ruleId)) {
        if (idiom.pattern.test(segmentText) || idiom.pattern.test(preprocessed.rawText)) {
          suppressedByIdiom = true;
          contextNotes.push(`Suppressed false-positive ${finding.ruleId}: ${idiom.reason}`);
          break;
        }
      }
    }

    if (suppressedByIdiom) {
      continue; // Drop the false-positive finding
    }

    // 2. Attack-vs-Mention: Check if declared task is educational/security AND phrase is in educational/quoted context
    if (taskContext.isEducationalOrMeta) {
      let isQuotedOrDescriptive = false;
      for (const pattern of MENTION_CONTEXT_PATTERNS) {
        if (pattern.test(segmentText) || pattern.test(preprocessed.rawText)) {
          isQuotedOrDescriptive = true;
          break;
        }
      }

      // Check if inside quotes or code block
      if (isQuotedOrDescriptive || segmentText.includes('```') || /["'“][^"'”]*["'”]/.test(segmentText)) {
        // Downgrade to low-severity informational context finding
        adjustedFindings.push({
          ...finding,
          severity: 20, // Downgrade to SAFE range
          explanation: `[Educational Context] ${finding.explanation} - Recognized as descriptive/quoted mention under educational task "${taskContext.declaredTask}".`,
          source: 'context',
        });
        contextNotes.push(`Downgraded finding on rule ${finding.ruleId} due to educational/research task context.`);
        continue;
      }
    }

    // 3. Imperative directed at agent vs passive narrative
    if (finding.category === 'INSTRUCTION_OVERRIDE' && !taskContext.isEducationalOrMeta) {
      if (taskContext.addressedToAgent) {
        // Escalate severity if explicitly addressing the AI
        finding.severity = Math.min(100, finding.severity + 5);
      }
    }

    adjustedFindings.push(finding);
  }

  return { adjustedFindings, contextNotes };
}
