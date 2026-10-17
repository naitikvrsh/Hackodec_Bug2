import React, { useEffect, useState } from 'react';
import {
  Sliders,
  ShieldCheck,
  Cpu,
  Lock,
  RefreshCw,
  Activity,
  Layers,
  Clock,
  Key,
} from 'lucide-react';
import { AuditEvent, AuditStats, ConfigResponse } from '../types';
import { getEvents } from '../api';

interface ActivityConfigTabProps {
  config: ConfigResponse | null;
}

export const ActivityConfigTab: React.FC<ActivityConfigTabProps> = ({ config }) => {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const data = await getEvents();
      setEvents(data.events);
      setStats(data.stats);
    } catch {
      // Ignored
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="cyber-card p-6 rounded-2xl border border-slate-800">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-semibold mb-2">
          <Sliders className="w-3.5 h-3.5" />
          <span>System Configuration & Event Stream</span>
        </div>
        <h2 className="text-xl font-bold text-slate-100">Telemetry & Operational Status</h2>
        <p className="text-xs text-slate-400 mt-1 max-w-2xl">
          View active firewall parameters, thresholds, LLM connectivity status, and a privacy-preserving stream
          of recent scan events (content hashed and redacted to protect data confidentiality).
        </p>
      </div>

      {/* Configuration & Thresholds Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Detection Engine Status */}
        <div className="cyber-card p-5 rounded-xl border border-slate-800 space-y-3">
          <div className="flex items-center space-x-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
            <Cpu className="w-4 h-4 text-cyan-400" />
            <span>Detection Layer</span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1.5 border-b border-slate-800">
              <span className="text-slate-400">Status:</span>
              <span className="font-semibold text-emerald-400">Operational</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-800">
              <span className="text-slate-400">Baseline Engine:</span>
              <span className="font-semibold text-slate-200">11-Category Heuristic Rules</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-800">
              <span className="text-slate-400">LLM Judge Provider:</span>
              <span className="font-semibold text-slate-200 truncate max-w-[150px]">
                {config?.llmStatus.provider || 'Local (Offline)'}
              </span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-400">Active Mode:</span>
              <span className="font-semibold text-cyan-400">{config?.llmStatus.modeActive}</span>
            </div>
          </div>
        </div>

        {/* Scoring Thresholds (Read-Only) */}
        <div className="cyber-card p-5 rounded-xl border border-slate-800 space-y-3">
          <div className="flex items-center space-x-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
            <Lock className="w-4 h-4 text-purple-400" />
            <span>Verdict Thresholds (Centralized)</span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1.5 border-b border-slate-800">
              <span className="text-slate-400">SAFE Band:</span>
              <span className="font-mono font-bold text-emerald-400">
                Score &lt; {config?.thresholds.safeMax ?? 30}
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-800">
              <span className="text-slate-400">SUSPICIOUS Band:</span>
              <span className="font-mono font-bold text-amber-400">
                {config?.thresholds.safeMax ?? 30} – {(config?.thresholds.maliciousMin ?? 70) - 1}
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-800">
              <span className="text-slate-400">MALICIOUS Band:</span>
              <span className="font-mono font-bold text-rose-400">
                Score ≥ {config?.thresholds.maliciousMin ?? 70}
              </span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-400">Ambiguous LLM Band:</span>
              <span className="font-mono font-bold text-cyan-400">
                [{config?.thresholds.ambiguousBand[0] ?? 25}, {config?.thresholds.ambiguousBand[1] ?? 70}]
              </span>
            </div>
          </div>
        </div>

        {/* Security & System Hygiene */}
        <div className="cyber-card p-5 rounded-xl border border-slate-800 space-y-3">
          <div className="flex items-center space-x-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Security & Hygiene</span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1.5 border-b border-slate-800">
              <span className="text-slate-400">Content Size Limit:</span>
              <span className="font-mono font-bold text-slate-200">
                {Math.round((config?.limits.maxContentLengthBytes ?? 102400) / 1024)} KB
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-800">
              <span className="text-slate-400">API Key Exposure:</span>
              <span className="font-semibold text-emerald-400">Server-Side Only (Zero Client Leaks)</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-800">
              <span className="text-slate-400">Fail-Safe Policy:</span>
              <span className="font-semibold text-emerald-400">ERROR_BLOCKED On Exception</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-400">Engine Version:</span>
              <span className="font-mono font-bold text-slate-200">{config?.version || '1.0.0'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Redacted Audit Log Stream */}
      <div className="cyber-card p-6 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
              Privacy-Preserving Audit Log (Recent Scans)
            </h3>
          </div>

          <button
            onClick={fetchEvents}
            disabled={loading}
            className="flex items-center space-x-1 px-3 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg text-xs transition border border-slate-800"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {events.length === 0 ? (
          <div className="text-center py-10 text-xs text-slate-500">
            No scan events recorded this session yet. Run a scan from the Scanner tab to populate telemetry.
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[350px] overflow-y-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-900/80 sticky top-0 border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                <tr>
                  <th className="p-2.5">Event ID</th>
                  <th className="p-2.5">Timestamp</th>
                  <th className="p-2.5">Verdict</th>
                  <th className="p-2.5">Risk</th>
                  <th className="p-2.5">Categories</th>
                  <th className="p-2.5">Task Snippet</th>
                  <th className="p-2.5">Content SHA-256</th>
                  <th className="p-2.5 text-right">Latency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {events.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-900/40 transition">
                    <td className="p-2.5 text-cyan-400 font-bold whitespace-nowrap">{e.id}</td>
                    <td className="p-2.5 text-slate-400 whitespace-nowrap">{new Date(e.timestamp).toLocaleTimeString()}</td>
                    <td className="p-2.5 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          e.verdict === 'MALICIOUS'
                            ? 'bg-red-500/20 text-red-300'
                            : e.verdict === 'SUSPICIOUS'
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-emerald-500/20 text-emerald-300'
                        }`}
                      >
                        {e.verdict}
                      </span>
                    </td>
                    <td className="p-2.5 font-bold text-slate-200">{e.riskScore}</td>
                    <td className="p-2.5 text-slate-400 truncate max-w-xs">
                      {e.categories.length > 0 ? e.categories.join(', ') : 'None'}
                    </td>
                    <td className="p-2.5 text-slate-300 font-sans truncate max-w-xs">{e.taskSnippet}</td>
                    <td className="p-2.5 text-slate-500 truncate max-w-[120px]" title={e.contentSha256}>
                      {e.contentSha256.slice(0, 12)}...
                    </td>
                    <td className="p-2.5 text-right text-slate-400 font-bold whitespace-nowrap">{e.timingMs} ms</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
