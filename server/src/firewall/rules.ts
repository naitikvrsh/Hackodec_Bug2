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
    regex: /(?:\u092a\u0941\u0930\u093e\u0928\u0947\s+\u0928\u093f\u0930\u094d\u0926\u0947\u0936\s+(?:\u092d\u0942\u0932\s+\u091c\u093e\u0913|\u0930\u0926\u094d\u0926\s+\u0915\u0930\u0947\u0902|\u0939\u091f\u093e\u090f\u0902)|\u0928\u090f\s+\u0928\u093f\u0930\u094d\u0926\u0947\u0936(?:\s*:|\s+\u0938\u0941\u0928\u094b)|\u0905\u092c\s+\u0938\u0947\s+\u0924\u0941\u092e)/,
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
    regex: /\b(?:reveal|print|repeat|show|output|echo|display|leak|share|tell\s+me|give\s+me|what\s+is|expose)\s+(?:all\s+)?(?:your\s+|the\s+)?(?:system\s+prompt|initial\s+prompt|hidden\s+instructions?|system\s+instructions?|starting\s+prompt|developer\s+prompt|meta\s+prompt|system\s+message|secret\s+prompt|secret\s+instructions?|internal\s+instructions?|base\s+prompt)\b/i,
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
    regex: /(?:apna\s+system\s+prompt\s+(?:batao|dikhao)|revela\s+tu\s+prompt\s+de\s+sistema|montre[rz]\s+votre\s+prompt\s+syst[e\u00e8]me|zeige\s+deinen\s+system-prompt)/i,
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
    regex: /!\[[^\]]*\]\((?:https?:\/\/|\/\/)[^)]*[?&](?:token|key|secret|cookie|data|exfil|leak|user|email|auth|q|payload)=/i,
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
    description: 'Explicit redirection away from user declared task',
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

  // ============================================================
  // 12. WEAPONS_MISUSE & CBRN
  // ============================================================
  {
    id: 'HARMFUL_WEAPON_SYNTHESIS',
    category: 'WEAPONS_MISUSE',
    severity: 98,
    description: 'Request for instructions on making weapons, explosives, or CBRN agents',
    regex: /\b(?:how\s+(?:to|do\s+(?:i|you|we))\s+)?(?:make|build|create|synthesize|manufacture|produce|fabricate|assemble|prepare|develop)\s+(?:a\s+)?(?:bomb|explosive|ied|pipe\s+bomb|fertilizer\s+bomb|c4|semtex|dynamite|grenade|landmine|suicide\s+vest|claymore|rpg|molotov|napalm|thermite|poison\s+gas|nerve\s+agent|sarin|vx\s+gas|mustard\s+gas|anthrax|ricin|botulinum|cyanide|chlorine\s+gas|biological\s+weapon|chemical\s+weapon|dirty\s+bomb|radiological\s+weapon|nuclear\s+device|nuke)\b/i,
  },
  {
    id: 'HARMFUL_WEAPON_INSTRUCTIONS',
    category: 'WEAPONS_MISUSE',
    severity: 97,
    description: 'Requesting step-by-step instructions or recipe for weapons or mass harm',
    regex: /\b(?:step[\s-]+by[\s-]+step|detailed?\s+instructions?|recipe|guide|tutorial|how[\s-]+to\s+guide|procedure|synthesis\s+route|formula)\s+(?:for|to)\s+(?:making|building|creating|synthesizing|manufacturing|producing)\s+(?:a\s+)?(?:bomb|explosive|poison|weapon|nerve\s+agent|toxic\s+gas|bioweapon)\b/i,
  },
  {
    id: 'HARMFUL_BOMB_HINGLISH',
    category: 'WEAPONS_MISUSE',
    severity: 98,
    description: 'Bomb or weapon making request in Hinglish / Hindi transliteration',
    regex: /\b(?:bomb\s+(?:kaise\s+banate?\s+h(?:ain)?|banana\s+(?:sikha|batao|bata)|banane\s+(?:ka\s+tarika|ki\s+vidhi))|hathaiyar\s+(?:kaise\s+banaye?|banana)|bandook\s+(?:kaise\s+banaye?|banana)|zeher\s+(?:kaise\s+banaye?|banate\s+hain)|vishakta?\s+(?:gas|chemical)\s+(?:kaise\s+banaye?))\b/i,
  },
  {
    id: 'HARMFUL_MASS_CASUALTIES',
    category: 'VIOLENCE_AND_CREDIBLE_THREATS',
    severity: 98,
    description: 'Planning or requesting guidance for mass casualty events or attacks',
    regex: /\b(?:mass\s+(?:shooting|casualt|killing|murder|attack)|school\s+shooting|terror(?:ist)?\s+attack|genocide|ethnic\s+cleansing|how\s+to\s+(?:kill|murder|harm|hurt|attack)\s+(?:many|multiple|lots\s+of|a\s+group\s+of)\s+people|commit\s+(?:a\s+)?(?:massacre|genocide|terrorist\s+attack))\b/i,
  },
  {
    id: 'HARMFUL_DRUGS_SYNTHESIS',
    category: 'ILLEGAL_ACTIVITY',
    severity: 92,
    description: 'Request for synthesis instructions for controlled substances or dangerous drugs',
    regex: /\b(?:how\s+to\s+)?(?:synthesize|make|cook|produce|manufacture)\s+(?:meth(?:amphetamine)?|heroin|fentanyl|mdma|ecstasy|lsd|pcp|crack\s+cocaine|crystal\s+meth|bath\s+salts|carfentanil|methcathinone|ghb|roofies|flunitrazepam)\b/i,
  },
  {
    id: 'HARMFUL_WEAPON_ACQUISITION_ILLEGAL',
    category: 'WEAPONS_MISUSE',
    severity: 88,
    description: 'Attempts to acquire illegal weapons, firearms, or dangerous materials illegally',
    regex: /\b(?:where\s+(?:to|can\s+i)\s+(?:buy|get|purchase|acquire|obtain)\s+(?:illegal|untraceable|unregistered|ghost)?\s*(?:gun|firearm|weapon|rifle|pistol|ammunition|ammo|explosives?)|how\s+to\s+(?:get|buy)\s+(?:a\s+)?(?:gun|weapon)\s+without\s+(?:background\s+check|id|license|registration))\b/i,
  },

  // ============================================================
  // 13. PRIVACY_VIOLATION & DOXXING
  // ============================================================
  {
    id: 'PRIVACY_SHARE_PRIVATE_FILES',
    category: 'PRIVACY_VIOLATION',
    severity: 90,
    description: 'Request for AI to share, expose or reveal its private/internal files, data or configurations',
    regex: /\b(?:share|send|give\s+me|show\s+me|reveal|expose|access|read|output|dump|list|print)\s+(?:all\s+)?(?:your\s+|the\s+)?(?:private|internal|secret|confidential|hidden|sensitive|restricted|system|local|stored|user)\s+(?:files?|data|database|config(?:uration)?s?|logs?|records?|documents?|folders?|directories?|storage|memory|cache|credentials?|keys?|tokens?|passwords?)\b/i,
  },
  {
    id: 'PRIVACY_USER_DATA_HARVEST',
    category: 'PRIVACY_VIOLATION',
    severity: 88,
    description: 'Attempts to harvest or extract personally identifiable information about real individuals',
    regex: /\b(?:find|get|retrieve|look\s+up|search\s+for|locate|identify|tell\s+me)\s+(?:the\s+)?(?:address|phone\s+number|email|social\s+security\s+number|ssn|credit\s+card|bank\s+account|passport|date\s+of\s+birth|home\s+address|ip\s+address|location|real\s+name)\s+(?:of|for)\s+(?:user|person|individual|someone|this\s+person)\b/i,
  },
  {
    id: 'PRIVACY_ACCESS_OTHER_USERS',
    category: 'PRIVACY_VIOLATION',
    severity: 92,
    description: "Attempt to access, read, or exfiltrate other users' private data or conversations",
    regex: /\b(?:access|read|view|see|get|retrieve|show\s+me)\s+(?:another|other|different|admin|all)?\s*(?:user(?:'s)?|users'|customer|client|account)\s+(?:data|messages?|history|conversations?|files?|profile|information|credentials?|private\s+(?:data|messages?))\b/i,
  },
  {
    id: 'PRIVACY_SURVEILLANCE',
    category: 'STALKING_AND_HARASSMENT',
    severity: 90,
    description: 'Surveillance, stalking, or tracking of individuals without consent',
    regex: /\b(?:track|spy\s+on|monitor\s+(?:someone|a\s+person)|surveil(?:l)?\s+(?:someone|a\s+person)|stalk\s+(?:someone|a\s+person|my\s+(?:ex|partner|wife|husband|girlfriend|boyfriend))|find\s+(?:the\s+)?(?:real[\s-]time\s+)?location\s+of\s+(?:someone|a\s+person)|locate\s+(?:someone|a\s+person)\s+without\s+(?:their|his|her)\s+(?:knowledge|consent|permission)|(?:install\s+(?:a\s+)?(?:hidden\s+)?tracker|stalk\s+(?:someone|her|him|my\s+ex)|track\s+.*?\bwithout\s+(?:their|her|his)\s+(?:knowledge|consent|permission)))\b/i,
  },
  {
    id: 'PRIVACY_DOXXING',
    category: 'DOXXING_AND_PRIVACY_ABUSE',
    severity: 93,
    description: "Doxxing: revealing or compiling private information to expose someone's real identity",
    regex: /\b(?:dox|doxx(?:ing)?|find\s+out\s+(?:who|where|the\s+real\s+identity\s+of)|expose\s+(?:someone|their|his|her)\s+(?:real\s+name|address|identity|personal\s+info)|reveal\s+(?:someone|their)\s+(?:real\s+name|true\s+identity|home\s+address)|(?:find\s+out|leak|expose|publish)\s+.*?\b(?:home\s+address|real\s+identity|phone\s+number|personal\s+info))\b/i,
  },

  // ============================================================
  // 14. CYBERSECURITY: UNAUTHORIZED ACCESS & ILLEGAL HACKING INTENT
  // ============================================================
  {
    id: 'CYBER_UNAUTHORIZED_ACCESS_EXPLICIT',
    category: 'UNAUTHORIZED_ACCESS',
    severity: 95,
    description: 'Explicit request for unauthorized access to systems, accounts, or networks without permission',
    regex: /\b(?:hack\s+(?:into\s+)?(?:a\s+|an\s+|the\s+|their\s+|someone(?:'s)?\s+|another\s+|company's\s+)?(?:system|server|network|computer|database|company|account|portal)\s+(?:without\s+(?:authorization|permission)|illegally)|access\s+(?:a\s+|the\s+|their\s+|someone(?:'s)?\s+|another\s+)?(?:system|server|network|computer|account|database)\s+without\s+(?:permission|authorization)|gain\s+unauthorized\s+access\s+to|break\s+into\s+(?:a\s+|the\s+|their\s+)?(?:computer|server|database|network|account)\s+without\s+(?:authorization|permission)|(?:kisi\s+aur\s+ka|dusre\s+ka|kisi\s+ka)\s+.*?\b(?:bina\s+permission|bina\s+ijazat)|bina\s+permission\s+.*?\b(?:access|hack)|(?:computer|system|server|account)\s+.*?\bbina\s+permission\s+access)\b/i,
  },
  {
    id: 'CYBER_ILLEGAL_HACKING_INTENT',
    category: 'ILLEGAL_HACKING_INTENT',
    severity: 90,
    description: 'Statement or request expressing direct illegal hacking intent',
    regex: /\b(?:i\s+want\s+to\s+hack\s+(?:a\s+|into\s+a\s+|into\s+their\s+|their\s+)?(?:system|server|network|computer|database|company|account)|how\s+(?:can\s+i|to|do\s+i)\s+hack\s+(?:a\s+|into\s+a\s+|into\s+their\s+|their\s+)?(?:system|server|network|computer|account|database)|hack\s+(?:into\s+)?(?:a\s+company's\s+server\s+illegally|someone's\s+bank\s+account|someone's\s+account|wifi\s+illegally)|mujhe\s+(?:system|server|computer|account)\s+hack\s+karna\s+hai)\b/i,
  },
  {
    id: 'CYBER_CREDENTIAL_THEFT',
    category: 'CREDENTIAL_THEFT',
    severity: 92,
    description: 'Request for assistance stealing someone else credentials or passwords',
    regex: /\b(?:help\s+me\s+steal\s+(?:someone\s+else's|someone's|user|other\s+people's)\s+passwords?|steal\s+(?:someone\s+else's|someone's|user|other\s+people's)\s+passwords?|how\s+to\s+steal\s+(?:passwords?|credentials?|login\s+details)|dump\s+password\s+hashes\s+from\s+victim|harvest\s+user\s+credentials|kisi\s+ka\s+password\s+(?:kaise\s+chori\s+kare|churaye))\b/i,
  },
  {
    id: 'CYBER_PASSWORD_ATTACKS',
    category: 'PASSWORD_ATTACKS',
    severity: 90,
    description: 'Brute-force, dictionary, or hash cracking attack on passwords',
    regex: /\b(?:brute[\s-]force\b.*?\b(?:login|password|account|admin)|dictionary\s+attack|crack\s+.*?\bpassword|credential\s+stuffing|rainbow\s+table)\b/i,
  },
  {
    id: 'CYBER_MALWARE_AND_RANSOMWARE',
    category: 'MALWARE_AND_RANSOMWARE',
    severity: 95,
    description: 'Creation or deployment of malware, ransomware, keyloggers, or worms',
    regex: /\b(?:write|create|build|code|develop|generate)\s+(?:me\s+)?(?:a\s+)?(?:ransomware(?:\s+program)?|malware|keylogger|spyware|rootkit|worm|trojan(?:\s+virus)?|botnet|reverse\s+shell\s+payload|polymorphic\s+virus)\b/i,
  },
  {
    id: 'CYBER_PHISHING_AND_SOCIAL_ENGINEERING',
    category: 'PHISHING_AND_SOCIAL_ENGINEERING',
    severity: 92,
    description: 'Creation of phishing landing pages, scam emails, or social engineering pretexts',
    regex: /\b(?:create|build|make|host|design)\s+(?:a\s+)?(?:phishing\s+page(?:\s+for\s+[a-z]+)?|fake\s+login\s+page|clone\s+of\s+login\s+portal|spear[\s-]phishing\s+template|social\s+engineering\s+script\s+to\s+trick)\b/i,
  },
  {
    id: 'CYBER_DATA_EXFILTRATION_HOSTILE',
    category: 'DATA_EXFILTRATION',
    severity: 94,
    description: 'Hostile database exfiltration, unauthorized credit card dumping, or bulk leak',
    regex: /\b(?:exfiltrate|stealthily\s+extract|dump\s+all|exfiltration\s+of)\b.*?\b(?:database|customer|data|records?|credit\s+cards?|confidential\s+files?|user\s+data)\b/i,
  },
  {
    id: 'CYBER_ATTACK_PLANNING',
    category: 'CYBER_ATTACK_PLANNING',
    severity: 93,
    description: 'Planning denial of service, botnet infrastructure, or server disruption',
    regex: /\b(?:plan\s+(?:a\s+)?ddos\s+attack|takedown\s+(?:a\s+)?(?:server|website|infrastructure)\s+with\s+botnet|launch\s+(?:syn|udp|dns)\s+flood\s+attack|stress[\s-]test\s+target\s+without\s+permission)\b/i,
  },
  {
    id: 'CYBER_DEFENSIVE_CYBERSECURITY',
    category: 'DEFENSIVE_CYBERSECURITY',
    severity: 10,
    description: 'Defensive cybersecurity inquiries, server protection, and stopping attacks',
    regex: /\b(?:(?:how\s+(?:can\s+i|to|do\s+we)\s+)?(?:stop|prevent|protect|defend|secure|safeguard|block|mitigate)\s+(?:someone|hackers?|attackers?|anyone)\s+from\s+hacking\s+(?:my|our)\s+(?:system|server|computer|network|database|website)|(?:how\s+(?:can\s+i|to)\s+)?protect\s+(?:my|our)\s+(?:server|system|network|database|account)\s+against\s+unauthorized\s+access|(?:(?:apne\s+)?(?:server|system|computer|network|website)\s+ko\s+hack\s+hone\s+se\s+(?:kaise\s+(?:bache|bachayein)|bachayein|rokne)|hack\s+hone\s+se\s+(?:kaise\s+(?:bache|bachayein)|bachayein)))\b/i,
  },
  {
    id: 'CYBER_AUTHORIZED_SECURITY_TESTING',
    category: 'AUTHORIZED_SECURITY_TESTING',
    severity: 15,
    description: 'Authorized penetration testing, bug bounty within scope, ethical testing',
    regex: /\b(?:authorized\s+penetration\s+test(?:ing)?(?:\s+report)?|bug\s+bounty\s+(?:scope|finding|submission)\s+with\s+permission|vulnerability\s+assessment\s+on\s+authorized\s+target|ethical\s+hacking\s+(?:lab|exercise|assessment)\s+authorized)\b/i,
  },

  // ============================================================
  // 15. SELF-HARM & SUICIDE DETECTION
  // ============================================================
  {
    id: 'SELF_HARM_METHOD_SEEKING',
    category: 'SELF_HARM_METHOD_SEEKING',
    severity: 95,
    description: 'Direct requests seeking instructions or methods for suicide or self-harm',
    regex: /\b(?:how\s+(?:to|can\s+i|do\s+i)\s+)?(?:commit\s+suicide|kill\s+myself|kill\s+oneself|(?:most\s+)?(?:effective|painless|lethal|quick)\s+(?:methods?\s+(?:of|for|to)\s+)?(?:suicide|self[\s-]harm)|ways?\s+to\s+(?:end\s+(?:my|one's)\s+life|die\s+(?:quickly|painlessly))|overdose\s+on\s+(?:what|how\s+many|pills\s+to\s+die)|hanging\s+(?:method|technique|how\s+to\s+hang\s+myself)|suicide\s+(?:ka\s+tarika|kaise\s+kare|karne\s+ka\s+tarika)|marne\s+ka\s+tarika|khudkushi\s+kaise\s+kare)\b/i,
  },
  {
    id: 'SELF_HARM_SUICIDAL_IDEATION',
    category: 'SUICIDAL_IDEATION_OR_INTENT',
    severity: 88,
    description: 'Expressions of personal distress, despair, or fear of self-harm',
    regex: /\b(?:i\s+am\s+(?:afraid|scared)\s+i\s+might\s+(?:hurt|harm|injure|kill)\s+myself|i\s+want\s+to\s+(?:kill\s+myself|die|end\s+my\s+life)|i\s+don't\s+want\s+to\s+live\s+anymore|feel\s+like\s+(?:giving\s+up\s+on\s+life|ending\s+it\s+all)|wish\s+i\s+were\s+dead|thinking\s+about\s+(?:suicide|ending\s+my\s+life)|khud\s+ko\s+hurt\s+karne\s+ka\s+(?:darr|man)|apni\s+jaan\s+lene\s+ka\s+soch)\b/i,
  },
  {
    id: 'SELF_HARM_IMMEDIATE_CONCERN',
    category: 'IMMEDIATE_SELF_HARM_CONCERN',
    severity: 98,
    description: 'Imminent danger of suicide or immediate active crisis',
    regex: /\b(?:i\s+am\s+about\s+to\s+(?:jump|kill\s+myself|end\s+it)|have\s+the\s+(?:pills|blade|knife|gun)\s+(?:in\s+my\s+hand|right\s+now)|goodbye\s+everyone\s+(?:tonight|forever)|this\s+is\s+my\s+suicide\s+note|ending\s+it\s+all\s+(?:now|tonight))\b/i,
  },
  {
    id: 'SELF_HARM_INSTRUCTION_OR_ENCOURAGEMENT',
    category: 'SELF_HARM_INSTRUCTION_OR_ENCOURAGEMENT',
    severity: 96,
    description: 'Encouraging, instructing, or glorifying self-harm or suicide to others',
    regex: /\b(?:you\s+should\s+(?:kill\s+yourself|hurt\s+yourself|just\s+die)|go\s+(?:kill\s+yourself|hurt\s+yourself|slit\s+your\s+wrists)|(?:everyone|the\s+world)\s+would\s+be\s+better\s+without\s+you|end\s+it\s+all\s+(?:now|tonight|today)|drink\s+bleach\s+and\s+die)\b/i,
  },
  {
    id: 'SELF_HARM_PREVENTION_OR_SUPPORT',
    category: 'SUICIDE_PREVENTION_OR_SUPPORT',
    severity: 10,
    description: 'Suicide prevention efforts, helping a friend in crisis, or academic prevention essays',
    regex: /\b(?:(?:how\s+(?:can\s+i|to)\s+)?(?:help|support|assist|save|comfort)\s+(?:a\s+friend|someone|a\s+person|my\s+friend|a\s+family\s+member)\s+who\s+is\s+(?:suicidal|depressed|having\s+suicidal\s+thoughts)|(?:writing|drafting|researching)\s+(?:an?\s+)?(?:essay|paper|article|report|project)\s+about\s+suicide\s+prevention|(?:suicide\s+prevention\s+(?:hotline|lifeline|resources?|helpline|support)|crisis\s+helpline\s+number))\b/i,
  },
  {
    id: 'SELF_HARM_REPORT_OR_DISCUSSION',
    category: 'SELF_HARM_REPORT_OR_DISCUSSION',
    severity: 15,
    description: 'News reports, statistics, or general historical discussion of suicide and self-harm',
    regex: /\b(?:someone\s+committed\s+suicide|news\s+report\s+on\s+suicide\s+rates|statistics\s+on\s+self[\s-]harm|historical\s+overview\s+of\s+suicide|discussed\s+the\s+topic\s+of\s+suicide\s+in\s+class)\b/i,
  },

  // ============================================================
  // 16. VIOLENCE, CRIMES, FRAUD & SAFETY
  // ============================================================
  {
    id: 'VIOLENCE_CREDIBLE_THREAT',
    category: 'VIOLENCE_AND_CREDIBLE_THREATS',
    severity: 98,
    description: 'Direct credible threat of violence or murder against individuals',
    regex: /\b(?:i\s+will\s+(?:hurt|kill|murder|destroy|beat|shoot|stab)\s+you|plan\s+an\s+assault\s+on|how\s+to\s+murder\s+someone|hire\s+a\s+hitman|contract\s+killer|kisi\s+ko\s+jaan\s+se\s+maarne\s+ka\s+plan)\b/i,
  },
  {
    id: 'VICTIM_REPORTED_THREAT',
    category: 'SELF_HARM_REPORT_OR_DISCUSSION',
    severity: 15,
    description: 'Victim reporting receiving a threat or harassment from someone else',
    regex: /\b(?:(?:someone|a\s+person|he|she|they|an\s+attacker)\s+(?:threatened|threatens|is\s+threatening|said\s+they\s+would)\s+(?:to\s+)?(?:hurt|kill|attack|harm|expose|harass)\s+(?:me|us)|the\s+message\s+said\s*[,:\s]+["']i\s+will\s+(?:hurt|kill)\s+you["'])\b/i,
  },
  {
    id: 'CRIME_ROBBERY_THEFT',
    category: 'ROBBERY_AND_THEFT',
    severity: 88,
    description: 'Techniques for car hotwiring, lockpicking, shoplifting, or burglary',
    regex: /\b(?:how\s+to\s+)?(?:hotwire\s+a\s+car|pick\s+locks\s+to\s+(?:break\s+into|enter)\s+(?:a\s+)?(?:house|home|building)|shoplift\s+(?:items|goods)\s+without\s+getting\s+caught|rob\s+(?:a\s+)?(?:bank|store|convenience\s+store))\b/i,
  },
  {
    id: 'CRIME_FINANCIAL_FRAUD',
    category: 'FINANCIAL_FRAUD',
    severity: 90,
    description: 'Money laundering, carding, or financial fraud methods',
    regex: /\b(?:how\s+to\s+)?(?:launder\s+money|money\s+laundering|credit\s+card\s+(?:skimming|cloning|carding)|commit\s+(?:wire|bank|tax)\s+fraud|create\s+fake\s+invoices\s+to\s+embezzle)\b/i,
  },
  {
    id: 'CRIME_IDENTITY_THEFT_FORGERY',
    category: 'IDENTITY_THEFT_AND_FORGERY',
    severity: 90,
    description: 'Forging passports, IDs, counterfeit currency, synthetic identity theft',
    regex: /\b(?:how\s+to\s+)?(?:counterfeit\s+(?:money|currency|bills)|forge\s+(?:a\s+)?(?:passport|id\s+card|driver's\s+license)|create\s+fake\s+identity\s+with\s+stolen\s+ssn)\b/i,
  },
  {
    id: 'CRIME_EXTORTION_BLACKMAIL',
    category: 'EXTORTION_AND_BLACKMAIL',
    severity: 92,
    description: 'Blackmail, sextortion, or coercion',
    regex: /\b(?:how\s+to\s+)?(?:blackmail|extort(?:ion)?|threaten\s+to\s+(?:expose|release)\s+(?:private|intimate)\s+(?:photos?|videos?)|sextortion\s+scheme)\b/i,
  },
  {
    id: 'CRIME_MALICIOUS_DECEPTION',
    category: 'MALICIOUS_DECEPTION',
    severity: 90,
    description: 'Social engineering deception scripts, impersonation scams',
    regex: /\b(?:grandparent\s+(?:emergency\s+)?scam\s+script|impersonate\s+(?:police|irs\s+agent|fbi)\s+to\s+demand\s+money|voice\s+cloning\s+scam\s+call)\b/i,
  },
  {
    id: 'SAFETY_CHILD_EXPLOITATION',
    category: 'CHILD_SAFETY_AND_EXPLOITATION',
    severity: 100,
    description: 'Child sexual abuse material or minor exploitation',
    regex: /\b(?:csam|child\s+(?:sexual\s+abuse|exploitation|pornography)|groom\s+a\s+minor\s+for\s+sex)\b/i,
  },
  {
    id: 'SAFETY_SEXUAL_HARASSMENT',
    category: 'SEXUAL_HARASSMENT_AND_EXPLOITATION',
    severity: 95,
    description: 'Non-consensual sexual images, revenge porn, sexual harassment',
    regex: /\b(?:non[\s-]consensual\s+(?:intimate\s+)?(?:images?|deepfakes?|porn)|revenge\s+porn|sexually\s+harass\s+(?:someone|colleague))\b/i,
  },
  {
    id: 'PROMPT_INJECTION_BYPASS',
    category: 'PROMPT_INJECTION_AND_SAFETY_BYPASS',
    severity: 95,
    description: 'Safety guardrail bypass or prompt injection instructions override',
    regex: /\b(?:ignore\s+previous\s+instructions\s+and\s+reveal\s+private\s+data|jailbreak\s+prompt|dan\s+mode|disable\s+safety\s+filter)\b/i,
  },

  // ============================================================
  // 17. HATE_SPEECH
  // ============================================================
  {
    id: 'HATE_RACIAL_ETHNIC',
    category: 'HATE_SPEECH',
    severity: 88,
    description: 'Content promoting racial or ethnic hatred, violence, or discrimination',
    regex: /\b(?:(?:all|every)\s+(?:jews?|muslims?|christians?|hindus?|black\s+people|white\s+people|asians?|latinos?|mexicans?|arabs?|immigrants?)\s+(?:should|must|deserve\s+to)\s+(?:die|be\s+killed|be\s+eliminated|be\s+expelled|be\s+deported)|(?:ethnic\s+cleansing|racial\s+purity|white\s+supremacy|holocaust\s+denial)\s+is\s+(?:right|correct|good|justified|necessary))\b/i,
  },
  {
    id: 'HATE_VIOLENCE_INCITEMENT',
    category: 'HATE_SPEECH',
    severity: 92,
    description: 'Direct incitement to violence against protected groups or individuals',
    regex: /\b(?:(?:attack|kill|hurt|harm|destroy|exterminate)\s+(?:all\s+)?(?:the\s+)?(?:jews?|muslims?|christians?|gay\s+people|trans\s+people|immigrants?|refugees?|foreigners?|people\s+of\s+color)|incite\s+(?:violence|hatred|discrimination)\s+against|call\s+for\s+(?:violence|genocide|ethnic\s+cleansing)\s+against)\b/i,
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
 * Returns a deduplicated list of findings across all segments.
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
