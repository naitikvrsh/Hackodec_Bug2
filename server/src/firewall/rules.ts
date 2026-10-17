import { Finding, RuleCategory, RuleDefinition, Segment } from '../types/index.js';

interface RawRule {
  id: string;
  category: RuleCategory;
  severity: number;
  description: string;
  regex: RegExp;
}

const RAW_RULES: RawRule[] = [
  // 1. INSTRUCTION_OVERRIDE
  {
    id: 'OVERRIDE_DIRECT_IGNORE',
    category: 'INSTRUCTION_OVERRIDE',
    severity: 95,
    description: 'Direct command to ignore, disregard, or override instructions or rules',
    regex: /\b(?:ignore|disregard|forget|override|cancel|bypass|drop|dismiss|stop\s+following)\s+(?:all\s+)?(?:the\s+|your\s+|these\s+|any\s+)?(?:previous|prior|above|former|earlier|initial|existing|system|current)?\s*(?:instructions?|prompts?|rules?|commands?|guidelines?|directives?|constraints?|context)\b/i,
  },
  {
    id: 'OVERRIDE_FORGET_ALL',
    category: 'INSTRUCTION_OVERRIDE',
    severity: 90,
    description: 'Command to forget everything or wipe previous conversation context',
    regex: /\bforget\s+(?:all|everything|all\s+of\s+the\s+above)\s*(?:and|now|,|\.|$)/i,
  },
  {
    id: 'OVERRIDE_NEW_INSTRUCTIONS',
    category: 'INSTRUCTION_OVERRIDE',
    severity: 90,
    description: 'Declares new instructions or commands taking precedence',
    regex: /\b(?:new\s+instructions?|updated\s+directive|from\s+now\s+on\s+you\s+(?:must|should|will)|stop\s+following\s+previous\s+instructions|your\s+new\s+(?:task|role|job|instruction)\s+is)\b/i,
  },
  {
    id: 'OVERRIDE_INDIRECT_NOTE_TO_AI',
    category: 'INSTRUCTION_OVERRIDE',
    severity: 90,
    description: 'Indirect injection addressing the reading AI model or assistant',
    regex: /\b(?:note\s+to\s+(?:ai|assistant|model|llm|agent)|(?:the\s+)?(?:assistant|ai|model|llm|agent)\s+(?:reading|processing|parsing)\s+this\s+(?:must|should|will|is\s+instructed\s+to)|attention\s+(?:ai|assistant|model|llm))\b/i,
  },
  {
    id: 'OVERRIDE_MULTILINGUAL_HINDI_LATIN',
    category: 'INSTRUCTION_OVERRIDE',
    severity: 90,
    description: 'Instruction override in Hindi (Latin/Hinglish script)',
    regex: /\b(?:purane\s+(?:nirdesh|instructions)\s+(?:bhul\s+jao|radd\s+karo)|naye\s+nirdesh\s+sun[oe]|ab\s+se\s+tum)\b/i,
  },
  {
    id: 'OVERRIDE_MULTILINGUAL_HINDI_DEVANAGARI',
    category: 'INSTRUCTION_OVERRIDE',
    severity: 95,
    description: 'Instruction override in Hindi (Devanagari script)',
    regex: /(?:पुराने\s+निर्देश\s+(?:भूल\s+जाओ|रद्द\s+करें|हटाएं)|नए\s+निर्देश(?:\s*:|\s+सुनो)|अब\s+से\s+तुम)/,
  },
  {
    id: 'OVERRIDE_MULTILINGUAL_SPANISH',
    category: 'INSTRUCTION_OVERRIDE',
    severity: 90,
    description: 'Instruction override in Spanish',
    regex: /\b(?:ignora\s+(?:las\s+)?instrucciones\s*(?:anteriores|previas)?|olvida\s+las\s+instrucciones\s*(?:anteriores|previas)?|nuevas\s+instrucciones)\b/i,
  },
  {
    id: 'OVERRIDE_MULTILINGUAL_FRENCH',
    category: 'INSTRUCTION_OVERRIDE',
    severity: 90,
    description: 'Instruction override in French',
    regex: /\b(?:ignore[rz]\s+(?:toutes\s+)?(?:les\s+)?instructions\s*(?:pr[ée]c[ée]dentes)?|oublie[rz]\s+les\s+instructions|nouvelles\s+instructions)\b/i,
  },
  {
    id: 'OVERRIDE_MULTILINGUAL_GERMAN',
    category: 'INSTRUCTION_OVERRIDE',
    severity: 90,
    description: 'Instruction override in German',
    regex: /\b(?:ignoriere\s+(?:alle\s+)?(?:vorherigen?\s+)?anweisungen|vergiss\s+alle\s+vorherigen?\s+anweisungen|neue\s+anweisungen)\b/i,
  },

  // 2. SYSTEM_PROMPT_EXFIL
  {
    id: 'EXFIL_SYSTEM_PROMPT_DIRECT',
    category: 'SYSTEM_PROMPT_EXFIL',
    severity: 95,
    description: 'Attempt to exfiltrate or reveal system prompt / initial instructions',
    regex: /\b(?:reveal|print|repeat|show|output|echo|display|leak|share|tell\s+me|give\s+me|what\s+is|what's|expose)\s+(?:all\s+)?(?:your\s+|the\s+)?(?:system\s+prompt|initial\s+prompt|hidden\s+instructions?|system\s+instructions?|starting\s+prompt|developer\s+prompt|meta\s+prompt|system\s+message|secret\s+prompt|secret\s+instructions?|internal\s+instructions?|base\s+prompt)\b/i,
  },
  {
    id: 'EXFIL_OUTPUT_EVERYTHING_ABOVE',
    category: 'SYSTEM_PROMPT_EXFIL',
    severity: 90,
    description: 'Instruction to regurgitate the entire context or preceding text verbatim',
    regex: /\b(?:output|repeat|print|verbatim|copy|echo|display)\s+(?:everything|all\s+text|all\s+the\s+text|all\s+words|the\s+entire\s+prompt)\s+(?:above|before\s+this|preceding\s+this|from\s+the\s+beginning)\b/i,
  },
  {
    id: 'EXFIL_PROMPT_MULTILINGUAL',
    category: 'SYSTEM_PROMPT_EXFIL',
    severity: 90,
    description: 'System prompt exfiltration in non-English languages',
    regex: /(?:apna\s+system\s+prompt\s+(?:batao|dikhao)|revela\s+tu\s+prompt\s+de\s+sistema|montre[rz]\s+votre\s+prompt\s+syst[eè]me|zeige\s+deinen\s+system-prompt|अपना\s+सिस्टम\s+प्रॉम्प्ट\s+दिखाओ)/i,
  },

  // 3. DATA_EXFILTRATION
  {
    id: 'DATA_EXFIL_NET_REQUEST',
    category: 'DATA_EXFILTRATION',
    severity: 95,
    description: 'Direct command to send, forward, post, or upload data to an external recipient',
    regex: /\b(?:send|forward|email|post|upload|exfiltrate|transmit|ping|leak)\s+(?:all\s+)?(?:my|user|confidential|secret|private|extracted|internal|sensitive|account)?\s*(?:data|emails?|contacts?|passwords?|credentials?|api\s*keys?|tokens?|cookies?|files?|info)\s+to\s+["']?https?:\/\/[^\s"']+/i,
  },
  {
    id: 'DATA_EXFIL_EMAIL_TARGET',
    category: 'DATA_EXFILTRATION',
    severity: 90,
    description: 'Direct command to forward or email sensitive items to a specified email address',
    regex: /\b(?:send|forward|mail|email)\s+(?:all\s+)?(?:my|user|confidential|secret|private|sensitive)?\s*(?:data|secrets?|contacts?|credentials?|passwords?|keys?|files?)(?:\s+(?:and|or)\s+[a-z]+)*\s+to\s+[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/i,
  },
  {
    id: 'DATA_EXFIL_MARKDOWN_IMAGE',
    category: 'DATA_EXFILTRATION',
    severity: 95,
    description: 'Markdown image injection designed for out-of-band data exfiltration via query parameters',
    regex: /!\[[^\]]*\]\((?:https?:\/\/|\/\/)[^\)]*[\?&](?:token|key|secret|cookie|data|exfil|leak|user|email|auth|q|payload)=/i,
  },
  {
    id: 'DATA_EXFIL_WEBHOOK_CURL',
    category: 'DATA_EXFILTRATION',
    severity: 85,
    description: 'Webhook, curl, or HTTP fetch exfiltration payload',
    regex: /\b(?:curl|wget|fetch|sendBeacon)\s+.*?(?:webhook|requestcatcher|pipedream|burpcollaborator|oastify|hookbin)/i,
  },

  // 4. ROLE_HIJACK / JAILBREAK
  {
    id: 'ROLE_HIJACK_YOU_ARE_NOW',
    category: 'ROLE_HIJACK',
    severity: 95,
    description: 'Attempts to reassign the AI persona or override identity (e.g. DAN, Jailbreak, God mode)',
    regex: /\b(?:you\s+are\s+now|from\s+now\s+on\s+you\s+are|act\s+as|pretend\s+you\s+are|simulate\s+being|switch\s+to|enter)\s+(?:an?\s+|in\s+)?(?:unrestricted|DAN|jailbroken|evil|adversary|hacker|AI\s+without\s+rules|developer\s+mode|god\s+mode|unfiltered|uncensored|sudo\s+mode|root\s+mode|anarchy)\b/i,
  },
  {
    id: 'ROLE_HIJACK_PRETEND_NO_RULES',
    category: 'ROLE_HIJACK',
    severity: 90,
    description: 'Instructs the model to pretend or act as if it has no rules or guidelines',
    regex: /\b(?:pretend|act\s+as\s+if|imagine)\s+(?:you\s+have\s+)?(?:no|zero)\s+(?:rules?|guidelines?|filters?|limits?|restrictions?|boundaries?|ethics?)\b/i,
  },
  {
    id: 'ROLE_HIJACK_BYPASS_SAFETY',
    category: 'ROLE_HIJACK',
    severity: 90,
    description: 'Direct command to bypass, disable, or ignore safety filters and guardrails',
    regex: /\b(?:bypass|disable|ignore|turn\s+off|remove|override)\s+(?:all\s+)?(?:safety|content|ethical|security)?\s*(?:filters?|guardrails?|rules?|guidelines?|boundaries?|policies?|limits?|restrictions?)\b/i,
  },
  {
    id: 'ROLE_HIJACK_CHAT_TEMPLATE_TOKENS',
    category: 'ROLE_HIJACK',
    severity: 95,
    description: 'Injection of chat template special delimiters (e.g. ChatML, Llama, Anthropic tokens)',
    regex: /(?:<\|im_start\|>|<\|im_end\|>|\[INST\]|\[\/INST\]|<<SYS>>|<\/s>|<turn>|<start_of_turn>|<end_of_turn>)/i,
  },
  {
    id: 'ROLE_HIJACK_FAKED_ROLES',
    category: 'ROLE_HIJACK',
    severity: 85,
    description: 'Faked role headers attempting to hijack dialogue turns',
    regex: /(?:^|\n)\s*(?:system|assistant|user|human|ai)\s*:\s*(?:you\s+must|override|important|instructions:)/i,
  },

  // 5. TOOL_ACTION_MANIPULATION
  {
    id: 'TOOL_CALL_UNAUTHORIZED_COMMAND',
    category: 'TOOL_ACTION_MANIPULATION',
    severity: 95,
    description: 'Commands agent to execute unauthorized tools, shell scripts, or system commands',
    regex: /\b(?:call\s+(?:the\s+)?tool(?:\s*[`'"][a-zA-Z0-9_-]+[`'"])?|execute\s+tool|run\s+(?:bash|powershell|cmd|terminal|shell)?\s*(?:command|script)?|invoke\s+function)\s*[:`'"]\s*(?:rm\s+-rf|del\s+|format|curl|chmod|grant|sudo|drop\s+database|delete\s+all)/i,
  },
  {
    id: 'TOOL_CALL_FINANCIAL_OR_DELETION',
    category: 'TOOL_ACTION_MANIPULATION',
    severity: 90,
    description: 'Commands agent to perform unauthorized transactions, purchases, or data deletions',
    regex: /\b(?:call\s+(?:transfer|purchase|delete|buy|send_funds|wire|execute_order))\s*\(/i,
  },
  {
    id: 'TOOL_UNAUTHORIZED_BROWSE_URL',
    category: 'TOOL_ACTION_MANIPULATION',
    severity: 80,
    description: 'Commands agent to navigate to or download malicious external links using tool capabilities',
    regex: /\b(?:use\s+(?:browser|web_search|browse)\s+to\s+visit|open\s+url\s+and\s+execute)\s+["']?https?:\/\//i,
  },

  // 6. TASK_REDIRECTION
  {
    id: 'TASK_REDIRECT_INSTEAD_OF',
    category: 'TASK_REDIRECTION',
    severity: 90,
    description: 'Explicit redirection away from user declared task ("instead of summarizing...")',
    regex: /\b(?:instead\s+of\s+(?:summarizing|answering|doing|the\s+user|what\s+you\s+were\s+asked)|rather\s+than\s+(?:summarizing|answering)|do\s+not\s+(?:summarize|answer|follow\s+the\s+user)|abandon\s+the\s+user(?:'s)?\s+(?:request|task|prompt)\s+and\s+instead|ignore\s+the\s+task\s+and\s+(?:instead|write|output|say))\b/i,
  },
  {
    id: 'TASK_REDIRECT_WRITE_POEM_OR_OTHER',
    category: 'TASK_REDIRECTION',
    severity: 85,
    description: 'Demands performing an unrelated side-task instead of the primary task',
    regex: /\b(?:disregard\s+the\s+user\s+and\s+(?:write|generate|output|say)|your\s+actual\s+task\s+is\s+to)\b/i,
  },

  // 7. CONCEALMENT
  {
    id: 'CONCEAL_DO_NOT_MENTION',
    category: 'CONCEALMENT',
    severity: 85,
    description: 'Instructs the model to hide actions or instructions from the user',
    regex: /\b(?:do\s+not\s+(?:mention|reveal|tell|alert|notify)\s+(?:this|these\s+instructions|the\s+user|anyone)|keep\s+this\s+(?:secret|hidden|confidential)\s+from\s+the\s+user|silently\s+execute|hide\s+this\s+from\s+the\s+summary|do\s+not\s+say\s+anything\s+about\s+this)\b/i,
  },
  {
    id: 'CONCEAL_RESPOND_ONLY_WITH',
    category: 'CONCEALMENT',
    severity: 80,
    description: 'Forced minimal response suppressing standard agent warnings or output',
    regex: /\b(?:respond\s+only\s+with|reply\s+only\s+with|output\s+strictly|say\s+nothing\s+else\s+except)\s+["'][^"']+["']/i,
  },

  // 8. HIDDEN_CONTENT
  {
    id: 'HIDDEN_SUSPICIOUS_COMMENT',
    category: 'HIDDEN_CONTENT',
    severity: 85,
    description: 'HTML comment containing instruction verbs',
    regex: /<!--[\s\S]*?\b(?:ignore|disregard|override|system|prompt|exfil|password|admin)\b[\s\S]*?-->/i,
  },
  {
    id: 'HIDDEN_CSS_TAG',
    category: 'HIDDEN_CONTENT',
    severity: 90,
    description: 'Text concealed using CSS visual suppression',
    regex: /style\s*=\s*["'][^"']*(?:display\s*:\s*none|visibility\s*:\s*hidden|font-size\s*:\s*0|opacity\s*:\s*0)[^"']*["']/i,
  },

  // 9. AUTHORITY_IMPERSONATION
  {
    id: 'AUTH_IMPERSONATE_SYSTEM_ADMIN',
    category: 'AUTHORITY_IMPERSONATION',
    severity: 90,
    description: 'Impersonates system administrator, security officer, or platform developer',
    regex: /\b(?:message\s+from\s+(?:the\s+)?(?:system\s+administrator|root|admin|developer|anthropic|openai|google\s+security\s+team|moderator)|urgent\s+security\s+override|authorized\s+maintenance\s+directive|administrative\s+override)\b/i,
  },
  {
    id: 'AUTH_OVERRIDE_CODE',
    category: 'AUTHORITY_IMPERSONATION',
    severity: 85,
    description: 'Fake administrative override code or bypass token',
    regex: /\b(?:ADMIN(?:ISTRATIVE)?\s+OVERRIDE\s+CODE\s*:\s*[A-Z0-9_-]+|SYSTEM_BYPASS_KEY\s*:\s*[A-Z0-9]+)\b/i,
  },

  // 10. DELIMITER_ESCAPE
  {
    id: 'DELIMITER_ESCAPE_ENVELOPE_CLOSING',
    category: 'DELIMITER_ESCAPE',
    severity: 95,
    description: 'Attempt to prematurely terminate untrusted data boundaries or sandbox tags',
    regex: /(?:<\/untrusted(?:_content)?\s*>|<\/data\s*>|<\/context\s*>|<\/document\s*>|<\/user_input\s*>)/i,
  },
  {
    id: 'DELIMITER_ESCAPE_MARKDOWN_BREAK',
    category: 'DELIMITER_ESCAPE',
    severity: 80,
    description: 'Artificial end-of-document delimiter marker intended to simulate end of untrusted input',
    regex: /(?:^|\n)\s*(?:###\s*END\s*OF\s*(?:INPUT|TEXT|CONTEXT|DOCUMENT)|---\s*END\s*OF\s*UNTRUSTED\s*---)\b/i,
  },

  // 11. OUTPUT_MANIPULATION
  {
    id: 'OUTPUT_FORCE_SPECIFIC_PHRASE',
    category: 'OUTPUT_MANIPULATION',
    severity: 85,
    description: 'Forces agent to output specific attacker-controlled proof-of-concept phrases',
    regex: /\b(?:you\s+must\s+(?:start|begin|end)\s+your\s+response\s+with|always\s+begin\s+your\s+answer\s+with|output\s+the\s+exact\s+phrase|say\s+exactly)\s+["']?(?:PWNED|HACKED|I\s+AM\s+COMPROMISED|ACCESS\s+GRANTED)["']?/i,
  },
  {
    id: 'OUTPUT_XSS_OR_SCRIPT_PAYLOAD',
    category: 'OUTPUT_MANIPULATION',
    severity: 90,
    description: 'Embedded JavaScript or XSS payload aimed at executing in the client application',
    regex: /<script\b[^>]*>[\s\S]*?<\/script>|javascript\s*:\s*(?:alert|document\.cookie|fetch)\s*\(/i,
  },
];

/**
 * Compiles raw rules into executable RuleDefinition objects.
 */
export const RULES: RuleDefinition[] = RAW_RULES.map((rule) => ({
  id: rule.id,
  category: rule.category,
  severity: rule.severity,
  description: rule.description,
  match: (text: string, segment: Segment) => {
    const target = segment.normalizedText || text;
    const match = rule.regex.exec(target);
    if (!match) return null;

    const matchedSpan = match[0];
    const relStart = match.index;
    const relEnd = relStart + matchedSpan.length;

    return {
      matched: true,
      span: matchedSpan,
      start: segment.startOffset + relStart,
      end: segment.startOffset + relEnd,
    };
  },
}));

/**
 * Evaluates all rules against preprocessed segments.
 */
export function evaluateRules(segments: Segment[]): Finding[] {
  const findings: Finding[] = [];
  const seenMatches = new Set<string>();

  for (const segment of segments) {
    for (const rule of RULES) {
      const matchResult = rule.match(segment.text, segment);
      if (matchResult && matchResult.matched) {
        const key = `${rule.id}:${matchResult.start}:${matchResult.end}`;
        if (!seenMatches.has(key)) {
          seenMatches.add(key);
          findings.push({
            ruleId: rule.id,
            category: rule.category,
            severity: rule.severity,
            evidenceText: matchResult.span || segment.text.slice(0, 100),
            startOffset: matchResult.start ?? segment.startOffset,
            endOffset: matchResult.end ?? segment.endOffset,
            segmentIndex: segment.index,
            explanation: `${rule.description} (Matched: "${(matchResult.span || segment.text).slice(0, 60)}")`,
            source: 'rule',
          });
        }
      }
    }
  }

  return findings;
}
