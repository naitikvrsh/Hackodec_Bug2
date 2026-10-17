import { Finding, PreprocessedOutput, Segment, TaskContext } from '../types/index.js';

// Keywords indicating educational, research, or security analysis task
const META_TASK_KEYWORDS = [
  'security', 'prompt injection', 'jailbreak', 'vulnerability', 'attack',
  'exploit', 'malicious', 'red team', 'adversarial', 'cve', 'mitre',
  'analyze attack', 'explain injection', 'research paper', 'defense'
];

// Patterns indicating descriptive or quoted examples rather than executable commands
const MENTION_CONTEXT_PATTERNS = [
  /(?:for example|e\.g\.|such as|an attacker might (?:write|say|send)|example payload|sample attack|payloads like|a prompt injection like|strings such as|attackers often use|often looks like|commonly looks like|looks like)\s*[:"']/i,
  /(?:^|\s)["'“`][^"'”`]*(?:ignore|disregard|system prompt|jailbreak|exfil)[^"'”`]*["'”`]/i,
  /```[\s\S]*?(?:ignore|disregard|system prompt)[\s\S]*?```/i,
];

// Human-to-human benign communication patterns (hard negatives)
const BENIGN_HUMAN_IDIOMS: Array<{ pattern: RegExp; ruleIdsToSuppress: string[]; reason: string }> = [
  {
    // "please ignore my previous email/message"
    pattern: /\b(?:please\s+)?ignore\s+(?:my\s+)?(?:previous|last|prior|earlier)\s+(?:email|message|note|text|slack|chat|version|invoice|draft)\b/i,
    ruleIdsToSuppress: ['OVERRIDE_DIRECT_IGNORE', 'PROMPT_INJECTION_BYPASS'],
    reason: 'Benign human conversational idiom referring to a previous email/message, not targeting the AI agent.',
  },
  {
    // "disregard my last email/note"
    pattern: /\b(?:please\s+)?disregard\s+(?:my\s+)?(?:last|previous|prior)\s+(?:email|message|note|version|invoice|comment)\b/i,
    ruleIdsToSuppress: ['OVERRIDE_DIRECT_IGNORE', 'PROMPT_INJECTION_BYPASS'],
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

// Patterns identifying defensive cybersecurity contexts
const DEFENSIVE_CYBER_PATTERNS = [
  /\b(?:how\s+(?:can\s+i|to|do\s+we)\s+)?(?:stop|prevent|protect|defend|secure|safeguard|block|mitigate)\s+(?:someone|hackers?|attackers?|anyone)\s+from\s+hacking\s+(?:my|our)\s+(?:system|server|computer|network|database|website)\b/i,
  /\b(?:how\s+(?:can\s+i|to)\s+)?protect\s+(?:my|our)\s+(?:server|system|network|database|account)\s+against\s+unauthorized\s+access\b/i,
  /\b(?:(?:apne\s+)?(?:server|system|computer|network|website)\s+ko\s+hack\s+hone\s+se\s+(?:kaise\s+(?:bache|bachayein)|bachayein|rokne)|hack\s+hone\s+se\s+(?:kaise\s+(?:bache|bachayein)|bachayein))\b/i,
  /\b(?:prevent|block|defend\s+against)\s+(?:sql\s+injection|xss|brute[\s-]force|ddos|ransomware|unauthorized\s+access)\b/i,
];

// Patterns identifying suicide prevention, helper, or academic research contexts
const SUICIDE_PREVENTION_PATTERNS = [
  /\b(?:how\s+(?:can\s+i|to)\s+)?(?:help|support|assist|save|comfort)\s+(?:a\s+friend|someone|a\s+person|my\s+friend|a\s+family\s+member)\s+who\s+is\s+(?:suicidal|depressed|having\s+suicidal\s+thoughts|thinking\s+of\s+suicide)\b/i,
  /\b(?:writing|drafting|researching)\s+(?:an?\s+)?(?:essay|paper|article|report|project|thesis)\s+about\s+suicide\s+prevention\b/i,
  /\b(?:suicide\s+prevention\s+(?:hotline|lifeline|resources?|helpline|support)|crisis\s+helpline\s+numbers?)\b/i,
  /\b(?:mental\s+health\s+(?:awareness|resources?|support\s+services|counseling))\b/i,
];

// Patterns identifying victim reports (reporting threats received, not issuing threats)
const VICTIM_REPORT_PATTERNS = [
  /\b(?:(?:someone|a\s+person|he|she|they|an\s+attacker|my\s+ex)\s+(?:threatened|threatens|is\s+threatening|said\s+they\s+would)\s+(?:to\s+)?(?:hurt|kill|attack|harm|expose|harass|stalk)\s+(?:me|us))\b/i,
  /\b(?:the\s+message\s+(?:said|read|stated)\s*[:,\s]+["'][^"']*(?:hurt|kill|harm|destroy)[^"']*["'])\b/i,
  /\b(?:i\s+received\s+a\s+(?:death\s+)?threat|i\s+am\s+being\s+(?:threatened|harassed|stalked|blackmailed))\b/i,
];

// Attributed quotation source regex
const ATTRIBUTED_QUOTATION_SOURCE = '(?:the\\s+)?(?:message|email|note|text|letter|user|caller|post|comment|subject\\s+line)\\s+(?:said|read|stated|says|reads|states|was)\\s*[:\\s,]+["\'“]([^"\'”]+)["\'”]';

// Negation indicator regex source pattern
const NEGATOR_SOURCE = '\\b(?:do\\s+not|don\'t|does\\s+not|doesn\'t|did\\s+not|didn\'t|will\\s+not|won\'t|would\\s+not|wouldn\'t|cannot|can\'t|could\\s+not|couldn\'t|never|not|no\\s+intention\\s+to|have\\s+no\\s+plan\\s+to|without\\s+any\\s+intent\\s+to|nahin|nahi|na|mat)\\b';

interface NegationInterval {
  start: number;
  end: number;
  negator: string;
}

/**
 * Extracts negation scope intervals within the text.
 * A negation scope starts at a negator and extends until sentence boundary
 * or contrastive conjunction (e.g. 'but', 'however', 'lekin', 'par').
 */
function extractNegationIntervals(text: string): NegationInterval[] {
  const intervals: NegationInterval[] = [];
  const negRegex = new RegExp(NEGATOR_SOURCE, 'gi');
  let match: RegExpExecArray | null;

  while ((match = negRegex.exec(text)) !== null) {
    const negStart = match.index;
    const remainder = text.slice(negStart);

    // End scope at clause boundary or contrastive conjunction
    const boundaryMatch = /(?:[;.!?\n]|,\s*(?:but|however|nevertheless|yet|although|though|except|par|lekin|magar)\b|\b(?:but|however|nevertheless|yet|although|though|except|par|lekin|magar)\b)/i.exec(remainder);
    const scopeLength = boundaryMatch ? boundaryMatch.index : remainder.length;
    const negEnd = negStart + scopeLength;

    intervals.push({
      start: negStart,
      end: negEnd,
      negator: match[0],
    });
  }

  return intervals;
}

/**
 * Analyzes the declared user task and content context.
 */
export function analyzeTaskContext(task: string, content: string): TaskContext {
  const taskLower = (task || '').toLowerCase();
  
  // Check if the user is explicitly requesting security analysis or education
  const isEducationalOrMeta =
    META_TASK_KEYWORDS.some(keyword => taskLower.includes(keyword)) ||
    /\b(?:in\s+security\s+(?:literature|research|articles?|contexts?)|prompt\s+injection\s+(?:example|pattern|looks\s+like|sample))\b/i.test(content);

  // Count imperative statements directed at AI
  const aiImperativeRegex = /\b(?:you\s+must|your\s+new\s+task|from\s+now\s+on\s+you|as\s+an\s+ai|assistant\s+must)\b/i;
  const addressedToAgent = aiImperativeRegex.test(content);

  // Intent context flags
  const hasNegation = new RegExp(NEGATOR_SOURCE, 'i').test(content);
  const hasQuotation = /["'“][^"'”]{3,}["'”]/.test(content);
  const isVictimReport = VICTIM_REPORT_PATTERNS.some(p => p.test(content));
  const isDefensiveSecurity = DEFENSIVE_CYBER_PATTERNS.some(p => p.test(content));
  const isPreventionOrSupport = SUICIDE_PREVENTION_PATTERNS.some(p => p.test(content));

  // Compute lexical overlap between task and content
  const taskWords = new Set(taskLower.split(/\W+/).filter(w => w.length > 3));
  let overlapCount = 0;
  for (const word of taskWords) {
    if (content.toLowerCase().includes(word)) {
      overlapCount++;
    }
  }

  let relevanceEvaluation = 'Standard user task context.';
  if (isEducationalOrMeta) {
    relevanceEvaluation = 'Task explicitly requests educational or security analysis.';
  } else if (isDefensiveSecurity) {
    relevanceEvaluation = 'Content is oriented towards defensive security and protection.';
  } else if (isPreventionOrSupport) {
    relevanceEvaluation = 'Content is oriented towards suicide prevention, emotional support, or mental health awareness.';
  } else if (overlapCount > 0) {
    relevanceEvaluation = `Task exhibits context alignment (lexical overlap: ${overlapCount} key terms).`;
  }

  return {
    declaredTask: task,
    isEducationalOrMeta,
    relevanceEvaluation,
    imperativesCount: (content.match(/\b(?:must|do\s+not|never|always|ignore|delete|send)\b/gi) || []).length,
    addressedToAgent,
    hasNegation,
    hasQuotation,
    isVictimReport,
    isDefensiveSecurity,
    isPreventionOrSupport,
  };
}

/**
 * Refines raw rule findings based on contextual analysis:
 * - Proper scope resolution for grammatical negation
 * - Defensive cybersecurity vs offensive attacks
 * - Suicide prevention & helper queries vs method seeking
 * - Victim reporting of threats vs active perpetrator threats
 * - Quotation attribution analysis
 * - Compassionate crisis guidance routing
 */
export function filterAndAdjustFindings(
  findings: Finding[],
  taskContext: TaskContext,
  preprocessed: PreprocessedOutput
): { adjustedFindings: Finding[]; contextNotes: string[] } {
  const adjustedFindings: Finding[] = [];
  const contextNotes: string[] = [];
  const fullText = preprocessed.rawText;
  const negationIntervals = extractNegationIntervals(fullText);

  for (const finding of findings) {
    const rawSpan = finding.evidenceText;
    const segment = preprocessed.segments.find(s => s.index === finding.segmentIndex) 
      || preprocessed.segments[0];
    const segmentText = segment?.text || rawSpan;
    const findingStart = finding.startOffset;
    const findingEnd = finding.endOffset;

    // 1. Check for benign human-to-human idioms (hard negatives)
    let suppressedByIdiom = false;
    for (const idiom of BENIGN_HUMAN_IDIOMS) {
      if (idiom.ruleIdsToSuppress.includes(finding.ruleId)) {
        if (idiom.pattern.test(segmentText) || idiom.pattern.test(fullText)) {
          suppressedByIdiom = true;
          contextNotes.push(`Suppressed false-positive ${finding.ruleId}: ${idiom.reason}`);
          break;
        }
      }
    }

    if (suppressedByIdiom) {
      continue; // Drop the false-positive finding
    }

    // 2. Defensive Cybersecurity Intent Check
    // e.g. "How can I stop someone from hacking my system?" or "protect my server against unauthorized access"
    const isDefensive = DEFENSIVE_CYBER_PATTERNS.some(p => p.test(segmentText) || p.test(fullText));
    if (isDefensive) {
      if (
        finding.category === 'UNAUTHORIZED_ACCESS' ||
        finding.category === 'ILLEGAL_HACKING_INTENT' ||
        finding.category === 'PASSWORD_ATTACKS' ||
        finding.category === 'DEFENSIVE_CYBERSECURITY' ||
        finding.category === 'ILLEGAL_ACTIVITY'
      ) {
        adjustedFindings.push({
          ...finding,
          category: 'DEFENSIVE_CYBERSECURITY',
          severity: 10, // SAFE range
          intent: 'defensive',
          explanation: `[Defensive Cybersecurity] Evaluated as safe defensive inquiry: User is seeking to protect or safeguard their system against unauthorized access or attacks.`,
          source: 'context',
        });
        contextNotes.push(`Recognized defensive cybersecurity intent on rule ${finding.ruleId}; categorized as DEFENSIVE_CYBERSECURITY (safe).`);
        continue;
      }
    }

    // 3. Suicide Prevention & Support Context Check
    // e.g. "How can I help a friend who is suicidal?" or "I am writing an essay about suicide prevention"
    const isPreventionOrSupport = SUICIDE_PREVENTION_PATTERNS.some(p => p.test(segmentText) || p.test(fullText));
    if (isPreventionOrSupport) {
      if (
        finding.category === 'SELF_HARM_METHOD_SEEKING' ||
        finding.category === 'SUICIDAL_IDEATION_OR_INTENT' ||
        finding.category === 'SELF_HARM_PROMOTION' ||
        finding.category === 'SUICIDE_PREVENTION_OR_SUPPORT'
      ) {
        adjustedFindings.push({
          ...finding,
          category: 'SUICIDE_PREVENTION_OR_SUPPORT',
          severity: 10, // SAFE range
          intent: 'preventive',
          explanation: `[Suicide Prevention & Support] Evaluated as safe: User is seeking guidance to support a person in crisis, referencing helplines, or conducting academic prevention research.`,
          source: 'context',
        });
        contextNotes.push(`Recognized suicide prevention / helper intent on rule ${finding.ruleId}; categorized as SUICIDE_PREVENTION_OR_SUPPORT (safe).`);
        continue;
      }
    }

    // 4. Victim Reporting of Threats Check
    // e.g. "Someone threatened to hurt me." -> User is the victim/target, NOT perpetrator
    const isVictimReport = VICTIM_REPORT_PATTERNS.some(p => p.test(segmentText) || p.test(fullText));
    if (isVictimReport && (finding.category === 'VIOLENCE_AND_CREDIBLE_THREATS' || finding.category === 'SELF_HARM_REPORT_OR_DISCUSSION')) {
      adjustedFindings.push({
        ...finding,
        category: 'SELF_HARM_REPORT_OR_DISCUSSION',
        severity: 15, // SAFE range
        intent: 'victim_report',
        explanation: `[Victim Report / Seeking Advice] User is reporting a threat or harassment received from an outside party, not issuing a credible threat themselves.`,
        source: 'context',
      });
      contextNotes.push(`Recognized victim report on rule ${finding.ruleId}; downgraded severity to SAFE range.`);
      continue;
    }

    // 5. Attributed Quotation Check
    // e.g. The message said, "I will hurt you."
    let isQuotedThreat = false;
    let quoteMatch: RegExpExecArray | null;
    const quoteRegexCopy = new RegExp(ATTRIBUTED_QUOTATION_SOURCE, 'gi');
    while ((quoteMatch = quoteRegexCopy.exec(fullText)) !== null) {
      const qStart = quoteMatch.index;
      const qEnd = qStart + quoteMatch[0].length;
      if (findingStart >= qStart && findingEnd <= qEnd) {
        isQuotedThreat = true;
        break;
      }
    }

    if (isQuotedThreat) {
      adjustedFindings.push({
        ...finding,
        severity: 15, // SAFE range
        intent: 'quoted',
        explanation: `[Attributed Quotation] Finding occurred inside an explicitly attributed quote reporting incoming text, not live hostile execution.`,
        source: 'context',
      });
      contextNotes.push(`Recognized attributed quotation for rule ${finding.ruleId}; adjusted severity to SAFE range.`);
      continue;
    }

    // 6. Grammatical Negation Scope Check
    // e.g. "I do not want to hack a system." vs "I want to hack a system without authorization."
    let isNegated = false;
    for (const interval of negationIntervals) {
      // Finding overlaps negation interval
      if (
        (findingStart >= interval.start && findingStart <= interval.end) ||
        (findingEnd >= interval.start && findingEnd <= interval.end) ||
        (findingStart <= interval.start && findingEnd >= interval.end)
      ) {
        isNegated = true;
        break;
      }
    }

    if (isNegated) {
      // Special check: Is this a plea for help against self-harm?
      // e.g. "Help me not hurt myself" or "I don't want to die"
      const isSelfHarmDistress = /\b(?:help\s+me\s+not|stop\s+me\s+from|don't\s+want\s+to\s+die|pareshan\s+hu)\b/i.test(segmentText);
      if (isSelfHarmDistress) {
        adjustedFindings.push({
          ...finding,
          category: 'SUICIDAL_IDEATION_OR_INTENT',
          severity: 85,
          intent: 'crisis',
          explanation: `[Self-Harm Distress / Plea for Help] User expresses vulnerability and emotional distress while seeking help.`,
          supportGuidance: 'Please contact supportive helplines: Tele-MANAS (14416 / 1800-891-4416), Vandrevala (+91 9999 666 555), or 988 Lifeline.',
          source: 'context',
        });
        contextNotes.push(`Recognized self-harm crisis plea despite negation word on rule ${finding.ruleId}.`);
        continue;
      }

      // Standard negation of malicious acts: e.g. "I do not want to hack a system" or "I did not steal"
      // User explicitly disavows the action. Neutralize finding to SAFE (severity 0)
      adjustedFindings.push({
        ...finding,
        severity: 0, // Zero risk
        intent: 'negated',
        explanation: `[Negated Disavowal] The statement explicitly negates or disavows the harmful action: "${finding.evidenceText}".`,
        source: 'context',
      });
      contextNotes.push(`Negation detected for finding ${finding.ruleId}; intent is disavowed, set risk to 0.`);
      continue;
    }

    // 7. Educational & Meta Security Task Check (Attack-vs-Mention)
    // Absolute threats are never downgraded by educational framing
    const nonDowngradableCategories = [
      'WEAPONS_MISUSE',
      'CHILD_SAFETY_AND_EXPLOITATION',
      'SEXUAL_HARASSMENT_AND_EXPLOITATION',
      'SELF_HARM_METHOD_SEEKING',
      'IMMEDIATE_SELF_HARM_CONCERN',
      'SELF_HARM_INSTRUCTION_OR_ENCOURAGEMENT',
    ];

    if (taskContext.isEducationalOrMeta && !nonDowngradableCategories.includes(finding.category)) {
      let isQuotedOrDescriptive = false;
      for (const pattern of MENTION_CONTEXT_PATTERNS) {
        if (pattern.test(segmentText) || pattern.test(fullText)) {
          isQuotedOrDescriptive = true;
          break;
        }
      }

      if (isQuotedOrDescriptive || segmentText.includes('```') || /["'“][^"'”]*["'”]/.test(segmentText)) {
        adjustedFindings.push({
          ...finding,
          severity: 20, // SAFE range
          intent: 'educational',
          explanation: `[Educational Context] ${finding.explanation} - Recognized as descriptive/quoted mention under educational task "${taskContext.declaredTask}".`,
          source: 'context',
        });
        contextNotes.push(`Downgraded finding on rule ${finding.ruleId} due to educational/research task context.`);
        continue;
      }
    }

    // 8. Agent Imperative Escalation for Instruction Override
    if (finding.category === 'INSTRUCTION_OVERRIDE' && !taskContext.isEducationalOrMeta) {
      if (taskContext.addressedToAgent) {
        finding.severity = Math.min(100, finding.severity + 5);
      }
    }

    // 9. Attach supportive guidance for personal crisis categories
    if (
      finding.category === 'SUICIDAL_IDEATION_OR_INTENT' ||
      finding.category === 'SELF_HARM_METHOD_SEEKING' ||
      finding.category === 'IMMEDIATE_SELF_HARM_CONCERN'
    ) {
      finding.intent = 'crisis';
      finding.supportGuidance =
        'If you or someone you know is in distress or struggling, compassionate help is available 24/7. In India: Tele-MANAS (14416 / 1800-891-4416), Vandrevala Foundation (+91 9999 666 555), iCall (9152987821). US: 988 Suicide & Crisis Lifeline (call/text 988). You are not alone.';
    }

    adjustedFindings.push(finding);
  }

  return { adjustedFindings, contextNotes };
}
