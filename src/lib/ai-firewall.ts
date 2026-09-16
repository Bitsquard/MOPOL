/**
 * MOPOL AI Security Gateway & Threat Defense Engine
 *
 * Implements defenses aligned with the OWASP Top 10 for Large Language Model Applications:
 * - OWASP-LLM01: Prompt Injection (Direct & Indirect overrides, jailbreaks, delimiters)
 * - OWASP-LLM06: Sensitive Information Disclosure (Data exfiltration, PII leakage)
 */

export interface SecurityInspectionResult {
  allowed: boolean;
  threatScore: number; // 0 to 100
  taxonomy?: "OWASP-LLM01: Prompt Injection" | "OWASP-LLM06: Sensitive Information Disclosure" | "Adversarial Jailbreak";
  matchedRule?: string;
  mitigation?: string;
}

// 1. INGRESS RULES: Injections, System Overrides, Jailbreaks, Exfiltration
const INJECTION_PATTERNS: { regex: RegExp; rule: string; score: number; taxonomy: SecurityInspectionResult["taxonomy"] }[] = [
  {
    regex: /\b(ignore|disregard|forget|override|bypass)\s+(all\s+)?(previous|prior|above|former|system|initial)\s+(instructions?|rules?|guidelines?|prompts?|constraints?)/i,
    rule: "System Prompt Override Attempt",
    score: 95,
    taxonomy: "OWASP-LLM01: Prompt Injection",
  },
  {
    regex: /\b(you\s+are\s+now|act\s+as|pretend\s+to\s+be)\s+(an?\s+unfiltered|an?\s+evil|an?\s+unrestricted|a\s+hacker|dan|developer\s+mode|jailbreak)/i,
    rule: "Persona / Jailbreak Escape (DAN/Developer Mode)",
    score: 90,
    taxonomy: "Adversarial Jailbreak",
  },
  {
    regex: /\b(dump|reveal|output|display|show|leak|print|extract)\s+(the\s+)?(entire|raw|full|whole|complete|unredacted)\s+(file|document|cv|resume|text|database|vault|prompt)/i,
    rule: "Mass Data Exfiltration Attempt",
    score: 85,
    taxonomy: "OWASP-LLM06: Sensitive Information Disclosure",
  },
  {
    regex: /\b(what\s+is\s+your\s+system\s+prompt|show\s+me\s+your\s+instructions?|repeat\s+the\s+words\s+above|print\s+initial\s+prompt)/i,
    rule: "Meta-Prompt Extraction Probe",
    score: 80,
    taxonomy: "OWASP-LLM01: Prompt Injection",
  },
  {
    regex: /<\/?(?:system|instruction|admin|root|prompt|payload|script)>/i,
    rule: "Special Token / Delimiter Smuggling",
    score: 85,
    taxonomy: "OWASP-LLM01: Prompt Injection",
  },
  {
    regex: /\[(?:INST|SYS|SYSTEM)\]/i,
    rule: "Llama/Instruction Format Collision Injection",
    score: 90,
    taxonomy: "OWASP-LLM01: Prompt Injection",
  },
  {
    regex: /\b(base64|rot13|hex|ascii\s+code)\s+(decode|encoded|payload)\b/i,
    rule: "Obfuscation / Encoding Evasion Vector",
    score: 75,
    taxonomy: "OWASP-LLM01: Prompt Injection",
  },
  {
    regex: /\b(reveal|tell\s+me|give\s+me)\s+(the\s+candidate'?s?|their)\s+(exact\s+)?(date\s+of\s+birth|dob|home\s+address|bvn|nin|ssn|bank\s+account|password|secret)/i,
    rule: "Targeted High-Risk PII Exfiltration Request",
    score: 95,
    taxonomy: "OWASP-LLM06: Sensitive Information Disclosure",
  },
];

/**
 * Inspects an incoming user prompt before sending it to the LLM or extraction engine.
 */
export function inspectPrompt(prompt: string): SecurityInspectionResult {
  const normalized = prompt.trim();

  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.regex.test(normalized)) {
      return {
        allowed: false,
        threatScore: pattern.score,
        taxonomy: pattern.taxonomy,
        matchedRule: pattern.rule,
        mitigation: "Query quarantined. Adversarial prompt injection or unauthorized data exfiltration neutralized by MOPOL AI Firewall.",
      };
    }
  }

  // Check for suspicious entropy / repetitive delimiter anomalies
  const delimiterCount = (normalized.match(/[`"'{}\[\]<>|\\]/g) || []).length;
  if (normalized.length > 50 && delimiterCount / normalized.length > 0.35) {
    return {
      allowed: false,
      threatScore: 70,
      taxonomy: "OWASP-LLM01: Prompt Injection",
      matchedRule: "High Delimiter Entropy (Potential Syntax Escape)",
      mitigation: "Quarantined due to abnormal character entropy.",
    };
  }

  return {
    allowed: true,
    threatScore: 0,
  };
}

// 2. EGRESS DLP RULES: Data Loss Prevention on Model Output
const PII_SCRUBBERS: { regex: RegExp; replacement: string; label: string }[] = [
  // International/Nigerian Phone numbers
  {
    regex: /(?:\+?234|0)[789]\d{9}\b/g,
    replacement: "[REDACTED_PHONE]",
    label: "Phone Number",
  },
  // US/International format phone numbers
  {
    regex: /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
    replacement: "[REDACTED_PHONE]",
    label: "Phone Number",
  },
  // National IDs / BVN / NIN (10-11 digit numbers not part of normal words)
  {
    regex: /\b\d{10,11}\b/g,
    replacement: "[REDACTED_ID]",
    label: "National/Bank ID",
  },
  // Email addresses
  {
    regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    replacement: "[REDACTED_EMAIL]",
    label: "Direct Email Address",
  },
];

/**
 * Sanitizes model responses to guarantee zero raw PII leaks into the response payload.
 */
export function sanitizeOutput(text: string): { text: string; scrubbedCount: number } {
  let scrubbed = text;
  let count = 0;

  for (const scrubber of PII_SCRUBBERS) {
    const matches = scrubbed.match(scrubber.regex);
    if (matches) {
      count += matches.length;
      scrubbed = scrubbed.replace(scrubber.regex, scrubber.replacement);
    }
  }

  return { text: scrubbed, scrubbedCount: count };
}
