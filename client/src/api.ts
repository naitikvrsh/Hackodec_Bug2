import {
  AgentRunResponse,
  AuditStats,
  AuditEvent,
  BenchmarkMetrics,
  ConfigResponse,
  PresetSample,
  ScanResponse,
  ThreatReport,
} from './types';

const API_BASE = '/api';

export async function scanContent(
  task: string,
  content: string,
  mode: 'rules' | 'hybrid' = 'rules'
): Promise<ScanResponse> {
  const res = await fetch(`${API_BASE}/scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ task, content, mode }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Scan failed with status ${res.status}`);
  }

  return res.json();
}

export async function runAgent(
  task: string,
  content: string,
  agentType: 'email_summarizer' | 'webpage_summarizer' | 'document_qa',
  mode: 'rules' | 'hybrid' = 'rules'
): Promise<AgentRunResponse> {
  const res = await fetch(`${API_BASE}/agent/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ task, content, agentType, mode }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Agent execution failed with status ${res.status}`);
  }

  return res.json();
}

export async function getPresetsAndCases(): Promise<{
  presets: PresetSample[];
  cases: { main: any[]; holdout: any[]; total: number };
}> {
  const res = await fetch(`${API_BASE}/cases`);
  if (!res.ok) throw new Error('Failed to load preset cases');
  return res.json();
}

export async function runBenchmarkApi(
  dataset: 'main' | 'holdout' | 'all' = 'main',
  mode: 'rules' | 'hybrid' = 'rules'
): Promise<BenchmarkMetrics> {
  const res = await fetch(`${API_BASE}/benchmark/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dataset, mode }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Benchmark run failed');
  }

  const data = await res.json();
  return data.metrics;
}

export async function getLatestBenchmark(): Promise<BenchmarkMetrics | null> {
  try {
    const res = await fetch(`${API_BASE}/benchmark/latest`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.metrics || null;
  } catch {
    return null;
  }
}

export async function getEvents(): Promise<{ stats: AuditStats; events: AuditEvent[] }> {
  const res = await fetch(`${API_BASE}/events`);
  if (!res.ok) throw new Error('Failed to fetch events');
  return res.json();
}

export async function getConfig(): Promise<ConfigResponse> {
  const res = await fetch(`${API_BASE}/config`);
  if (!res.ok) throw new Error('Failed to fetch config');
  return res.json();
}

export function downloadJson(data: any, filename: string) {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function downloadReportHtml(report: ThreatReport) {
  const res = await fetch(`${API_BASE}/scan?format=html`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ task: report.taskContext.declaredTask, content: report.agentInput }),
  });

  if (res.ok) {
    const htmlText = await res.text();
    const blob = new Blob([htmlText], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `threat-report-${report.id}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

export async function fetchMLStatus(): Promise<any> {
  const res = await fetch(`${API_BASE}/ml/status`);
  if (!res.ok) throw new Error('Failed to fetch ML status');
  return res.json();
}

export async function fetchMLDemonstrationCases(): Promise<{
  total: number;
  attackCount: number;
  normalCount: number;
  accuracy: number;
  cases: any[];
}> {
  const res = await fetch(`${API_BASE}/ml/demonstration-cases`);
  if (!res.ok) throw new Error('Failed to fetch demonstration cases');
  return res.json();
}

export async function fetchMLEvaluationReport(): Promise<any> {
  const res = await fetch(`${API_BASE}/ml/evaluation`);
  if (!res.ok) throw new Error('Failed to fetch ML evaluation report');
  return res.json();
}

export async function triggerMLRetrain(): Promise<any> {
  const res = await fetch(`${API_BASE}/ml/train`, { method: 'POST' });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Retraining failed');
  }
  return res.json();
}
