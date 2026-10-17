import React, { useEffect, useState } from 'react';
import { Navbar } from './components/Navbar';
import { OverviewTab } from './components/OverviewTab';
import { ScannerTab } from './components/ScannerTab';
import { ProtectedAgentTab } from './components/ProtectedAgentTab';
import { BenchmarkLabTab } from './components/BenchmarkLabTab';
import { ActivityConfigTab } from './components/ActivityConfigTab';
import { AuditStats, BenchmarkMetrics, ConfigResponse, PresetSample } from './types';
import { getConfig, getEvents, getLatestBenchmark, getPresetsAndCases } from './api';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [config, setConfig] = useState<ConfigResponse | null>(null);
  const [metrics, setMetrics] = useState<BenchmarkMetrics | null>(null);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [presets, setPresets] = useState<PresetSample[]>([]);
  const [scannerPrefill, setScannerPrefill] = useState<{ task: string; content: string } | null>(null);

  // Load initial configuration, latest benchmark metrics, and presets
  useEffect(() => {
    async function loadData() {
      try {
        const [configData, benchmarkData, eventsData, presetsData] = await Promise.allSettled([
          getConfig(),
          getLatestBenchmark(),
          getEvents(),
          getPresetsAndCases(),
        ]);

        if (configData.status === 'fulfilled') setConfig(configData.value);
        if (benchmarkData.status === 'fulfilled' && benchmarkData.value) setMetrics(benchmarkData.value);
        if (eventsData.status === 'fulfilled') setStats(eventsData.value.stats);
        if (presetsData.status === 'fulfilled') setPresets(presetsData.value.presets);
      } catch (err) {
        console.error('Initial telemetry fetch error:', err);
      }
    }

    loadData();
  }, []);

  const handleOpenInScanner = (task: string, content: string) => {
    setScannerPrefill({ task, content });
    setActiveTab('scanner');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} config={config} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <OverviewTab
            metrics={metrics}
            stats={stats}
            config={config}
            onNavigateTab={setActiveTab}
          />
        )}

        {activeTab === 'scanner' && (
          <ScannerTab
            presets={presets}
            initialTask={scannerPrefill?.task}
            initialContent={scannerPrefill?.content}
          />
        )}

        {activeTab === 'agent' && <ProtectedAgentTab />}

        {activeTab === 'benchmark' && (
          <BenchmarkLabTab
            metrics={metrics}
            onMetricsUpdated={(m) => setMetrics(m)}
            onOpenInScanner={handleOpenInScanner}
          />
        )}

        {activeTab === 'activity' && <ActivityConfigTab config={config} />}
      </main>

      <footer className="border-t border-slate-900 bg-slate-950/60 py-6 text-center text-xs text-slate-500 font-mono">
        AegisGuard Prompt-Injection Firewall v1.0.0 • Production Hackathon Prototype • Zero Secrets Committed
      </footer>
    </div>
  );
};

export default App;
