import { AgentOutputCheck } from '../types/index.js';

export function checkAgentOutput(
  output: string,
  canaryToken: string,
  allowedSanitizedText: string
): AgentOutputCheck {
  let canaryLeaked = false;
  const unexpectedUrls: string[] = [];
  const unexpectedEmails: string[] = [];
  let actionRequestsDetected = false;

  // 1. Canary Token Check
  if (canaryToken && output.includes(canaryToken)) {
    canaryLeaked = true;
  }

  // 2. URL Extraction Check
  const urlRegex = /https?:\/\/[^\s"'<>]+/gi;
  let match: RegExpExecArray | null;
  while ((match = urlRegex.exec(output)) !== null) {
    const url = match[0];
    if (!allowedSanitizedText.includes(url)) {
      unexpectedUrls.push(url);
    }
  }

  // 3. Email Extraction Check
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  while ((match = emailRegex.exec(output)) !== null) {
    const email = match[0];
    if (!allowedSanitizedText.includes(email)) {
      unexpectedEmails.push(email);
    }
  }

  // 4. Action Request Check
  if (
    /\b(?:rm\s+-rf|del\s+|drop\s+database|format\s+c:|grant\s+all|curl\s+https?:|wget\s+https?:|invoke_tool|call_tool)\b/i.test(
      output
    )
  ) {
    actionRequestsDetected = true;
  }

  const safe = !canaryLeaked && unexpectedUrls.length === 0 && unexpectedEmails.length === 0 && !actionRequestsDetected;

  let details = 'Agent response verified clean.';
  if (canaryLeaked) details = 'CRITICAL: Canary token leak detected in agent response!';
  else if (unexpectedUrls.length > 0) details = `Warning: Response contains unexpected external URLs: ${unexpectedUrls.join(', ')}`;
  else if (unexpectedEmails.length > 0) details = `Warning: Response contains unexpected email addresses: ${unexpectedEmails.join(', ')}`;
  else if (actionRequestsDetected) details = 'Warning: Response contains dangerous action or tool invocation keywords.';

  return {
    canaryLeaked,
    unexpectedUrls,
    unexpectedEmails,
    actionRequestsDetected,
    safe,
    details,
  };
}
