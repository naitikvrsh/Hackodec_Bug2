import React from 'react';
import {
  Shield,
  Search,
  Bot,
  BarChart3,
  Sliders,
  Info,
  Cpu,
  CheckCircle2,
} from 'lucide-react';
import { ConfigResponse } from '../types';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  config: ConfigResponse | null;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, config }) => {
  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'scanner', label: 'Scanner', icon: Search },
    { id: 'agent', label: 'Protected Agent', icon: Bot },
    { id: 'benchmark', label: 'Benchmark Lab', icon: Shield },
    { id: 'activity', label: 'Activity & Config', icon: Sliders },
    { id: 'about', label: 'About & Limitations', icon: Info },
  ];

  const detectionModeText = config?.llmStatus.available ? 'Rules + LLM' : 'Rules Only';
  const agentModeText = config?.llmStatus.available ? 'Gemini 1.5 Flash' : 'Local Extractive';

  return (
    <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('overview')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Shield className="w-6 h-6 text-slate-950 font-bold" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-lg tracking-wider text-slate-100 font-mono">AEGIS<span className="text-cyan-400">GUARD</span></span>
                <span className="px-2 py-0.5 text-xs font-semibold uppercase tracking-wider bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 rounded-full">v1.0</span>
              </div>
              <div className="text-[11px] text-slate-400">Production Prompt-Injection Firewall</div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex space-x-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Operational Status Badges */}
          <div className="hidden lg:flex items-center space-x-3">
            <div className="flex items-center space-x-2 px-3 py-1 bg-slate-900 border border-slate-800 rounded-lg text-xs">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-slate-400">Detection:</span>
              <span className="font-semibold text-slate-200">{detectionModeText}</span>
            </div>

            <div className="flex items-center space-x-2 px-3 py-1 bg-slate-900 border border-slate-800 rounded-lg text-xs">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-slate-400">Agent:</span>
              <span className="font-semibold text-slate-200">{agentModeText}</span>
            </div>
          </div>
        </div>

        {/* Mobile Nav row */}
        <div className="md:hidden flex overflow-x-auto py-2 space-x-1 border-t border-slate-800/60">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${
                  isActive
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                    : 'text-slate-400 hover:bg-slate-900'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
