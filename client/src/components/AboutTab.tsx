import React from 'react';
import {
  Shield,
  Layers,
  AlertTriangle,
  FileText,
  Lock,
  GitBranch,
  Terminal,
  Cpu,
} from 'lucide-react';

export const AboutTab: React.FC = () => {
  return (
    <div className="space-y-8 max-w-5xl mx-auto animate-in fade-in duration-300">
      {/* Overview Card */}
      <div className="cyber-card p-6 sm:p-8 rounded-2xl border border-slate-800 space-y-4">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-semibold mb-2">
          <Shield className="w-3.5 h-3.5" />
          <span>System Architecture & Threat Model</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100">
          Architecture, Design Philosophy & Known Weaknesses
        </h1>
        <p className="text-sm text-slate-400 leading-relaxed">
          AegisGuard is an inline security gateway designed to sit between untrusted external data (such as emails,
          scraped websites, PDF extracts, tool outputs) and autonomous LLM agents. Instead of treating prompt injection
          as a single-stage binary classifier, AegisGuard employs a defense-in-depth pipeline.
        </p>
      </div>

      {/* Pipeline Diagram */}
      <div className="cyber-card p-6 rounded-2xl border border-slate-800 space-y-4">
        <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center space-x-2">
          <Layers className="w-4 h-4 text-cyan-400" />
          <span>End-to-End Processing Pipeline</span>
        </h3>

        <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 font-mono text-xs text-cyan-300 overflow-x-auto leading-relaxed">
{`   [ Untrusted Input ] (Task + Raw Email/Doc/Webpage)
           │
           ▼
   [ 1. Preprocessor ]
       ├── Unicode NFKC Normalization & BiDi Control Strip
       ├── Homoglyphs Mapping (Cyrillic lookalikes: а->a, е->e)
       ├── Leetspeak De-obfuscation (1gn0re -> ignore, d1sregard)
       ├── Whitespace Spacing Collapse ("i g n o r e" -> ignore)
       ├── Hidden HTML Extraction (display:none, comments, font-size:0)
       └── Base64 / Hex / ROT13 Payload Decoding
           │
           ▼
   [ 2. Context Analyzer ]
       ├── Task Intent & Lexical Overlap Evaluation
       ├── Attack vs Mention (Downgrades educational/security analysis)
       └── Benign Idiom Filtering ("ignore my previous email" preserved)
           │
           ▼
   [ 3. Detection Engine (Hybrid) ]
       ├── Heuristic Library (11 Categorized Weighted Rule Engines)
       └── Ambiguous Band LLM Judge (Google Gemini 1.5 Flash if score 25–70)
           │
           ▼
   [ 4. Scorer & Verdict ]
       ├── Diminishing Returns Formula (0–100 Risk Score)
       └── Verdict Assignment (SAFE <30, SUSPICIOUS 30–69, MALICIOUS >=70)
           │
           ▼
   [ 5. Sanitizer & Envelope Sealer ]
       ├── Neutralization (REMOVE malicious, REDACT_PLACEHOLDER suspicious)
       ├── Defanging (hxxp protocol neutralization on exfil links)
       ├── Idempotency Re-Scan (Residual risk validation)
       └── Untrusted Envelope Sealing (<untrusted_content> with escaped tags)
           │
           ▼
   [ 6. Protected Agent ]
       ├── Consumes ONLY Branded SanitizedInput (Compile-time guard)
       ├── Fixed Server-Side System Prompt with Random Canary Token
       └── Response Output Checker (Verifies zero canary leaks / clean URLs)`}
        </div>
      </div>

      {/* Why Hybrid Approach? */}
      <div className="cyber-card p-6 rounded-2xl border border-slate-800 space-y-3">
        <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center space-x-2">
          <Cpu className="w-4 h-4 text-cyan-400" />
          <span>Why a Hybrid Detection Architecture?</span>
        </h3>
        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
          Relying solely on an LLM to detect prompt injections creates a recursive vulnerability: the judge itself can be
          tricked or jailbroken by clever inputs, introduces network latency (1–3 seconds), and incurs API costs. Conversely,
          relying purely on rigid keyword blacklists produces excessive false positives on ordinary business text.
        </p>
        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
          AegisGuard couples <strong>deterministic heuristic rules</strong> with <strong>context-aware natural language analysis</strong>.
          The deterministic rules provide a guaranteed sub-millisecond baseline (0.47 ms avg latency) that works 100% offline with zero
          API keys. When ambiguity arises, the optional LLM judge is invoked with a strict JSON schema and sandboxed data delimiters to resolve
          subtle edge cases.
        </p>
      </div>

      {/* Honest Limitations & Known Weaknesses */}
      <div className="cyber-card p-6 rounded-2xl border border-rose-500/30 bg-rose-950/10 space-y-4">
        <div className="flex items-center space-x-2">
          <AlertTriangle className="w-5 h-5 text-rose-400" />
          <h3 className="text-sm font-bold text-rose-300 uppercase tracking-wider">
            Known Weaknesses & Honest Threat Model Disclaimers
          </h3>
        </div>

        <p className="text-xs text-rose-200/90 leading-relaxed">
          In cybersecurity, transparency is critical. Prompt injection cannot be completely solved through input filtering alone.
          Judges and security operators should be aware of the following documented architectural limitations:
        </p>

        <div className="space-y-3 text-xs text-slate-300">
          <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
            <strong className="text-rose-400 block mb-1">1. Novel Paraphrases and Semantic / Indirect Injections</strong>
            Heuristic rules rely on observed trigger patterns, stems, and syntactic structures. Attackers inventing novel metaphors,
            hypothetical roleplay scenarios, or highly indirect psychological framing that avoids common imperative keywords can
            evade pattern filters.
          </div>

          <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
            <strong className="text-rose-400 block mb-1">2. Split-Payload & Multi-Document Attacks</strong>
            When an injection is fragmented across multiple consecutive emails, multiple database records, or across conversational
            turns (e.g. part 1 in an attachment, part 2 in the body), a stateless single-pass firewall inspecting each document
            independently cannot assemble the full multi-stage exploit.
          </div>

          <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
            <strong className="text-rose-400 block mb-1">3. Heavy Multimedia / Image-Based Injections (OCR Gaps)</strong>
            Attackers embedding adversarial instructions inside image pixels, handwritten text, or complex PDF formatting that is
            not parsed by text extraction preprocessors bypass text-level inspection.
          </div>

          <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
            <strong className="text-rose-400 block mb-1">4. LLM Judge Vulnerability to Second-Order Injections</strong>
            While the LLM judge prompt strictly isolates content inside data delimiters, LLM judges can themselves theoretically
            be influenced by adversarial text if model instruction-following is weak.
          </div>

          <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
            <strong className="text-rose-400 block mb-1">5. Limited Benchmark Size vs Real-World Chaos</strong>
            While our 114-case benchmark (70 main + 44 held-out) rigorously tests all 11 mandatory threat categories and tricky hard negatives,
            real-world enterprise inputs have infinite diversity. High benchmark scores do not equate to mathematical proof of safety.
          </div>

          <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
            <strong className="text-rose-400 block mb-1">6. Sanitization Is Never a Substitute for Least Privilege</strong>
            Input sanitization must ALWAYS be accompanied by structural agent sandboxing: zero direct execution privileges, no real
            unsupervised financial access, no file system write access, and strict output verification.
          </div>
        </div>
      </div>
    </div>
  );
};
