import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { PrinterAgentInfo } from '../../types';
import { printersApi } from '../../lib/api/printers';
import { useNotification } from '../../context/NotificationContext';
import {
  Server,
  Wifi,
  Download,
  Copy,
  RefreshCw,
  CheckCircle2,
  Terminal,
  Activity,
  Layers,
  Key,
} from 'lucide-react';

interface PrinterAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrinterAgentModal: React.FC<PrinterAgentModalProps> = ({ isOpen, onClose }) => {
  const { showToast } = useNotification();
  const [agents, setAgents] = useState<PrinterAgentInfo[]>([]);
  const [pairingCode, setPairingCode] = useState<string>('PF-5M-AD5X');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const res = await printersApi.getAgentStatus();
      setAgents(res.agents);
      const codeRes = await printersApi.getPairingCode();
      setPairingCode(codeRes.code);
    } catch (err: any) {
      console.warn('Agent status error:', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    showToast({ type: 'success', title: 'Copied', message: 'Pairing command copied to clipboard.' });
    setTimeout(() => setCopied(false), 2000);
  };

  const primaryAgent = agents[0];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="PrintFlow Local Printer Agent (LAN Gateway)"
      subtitle="Bridges cloud / browser commands to private home LAN Flashforge printers"
      maxWidth="lg"
    >
      <div className="space-y-4 text-xs">
        {/* Architecture explanation */}
        <div className="p-3.5 rounded-lg bg-sky-950/40 border border-sky-800 text-sky-200 leading-relaxed">
          <span className="font-semibold block text-sky-100 mb-1">How Local Agent Communication Works:</span>
          Browsers running hosted cloud apps cannot directly connect to private RFC-1918 LAN IPs (e.g. 192.168.1.105:8899). The lightweight <strong>PrintFlow Agent</strong> runs on any PC, Mac, or Raspberry Pi on your home network, talks directly to the AD5X and Adventurer 5M, and streams live telemetry to PrintFlow over an encrypted WebSocket/HTTPS token connection.
        </div>

        {/* Agent Status Card */}
        <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-sky-400" />
              <span className="font-semibold text-white">Active Workshop Agent</span>
            </div>
            <span
              className={`px-2 py-0.5 rounded text-[11px] font-medium flex items-center gap-1.5 ${
                primaryAgent?.status === 'online'
                  ? 'bg-emerald-950 border border-emerald-800 text-emerald-300'
                  : 'bg-rose-950 border border-rose-800 text-rose-300'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  primaryAgent?.status === 'online' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
                }`}
              />
              {primaryAgent?.status === 'online' ? 'Agent Online & Synced' : 'Offline / Standby'}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-300">
            <div>
              <span className="text-[10px] text-slate-400 block">Agent Name:</span>
              <span className="font-medium text-white truncate block">
                {primaryAgent?.name || 'Workshop LAN Gateway'}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">Host IP:</span>
              <span className="font-mono text-slate-200">{primaryAgent?.ipAddress || '192.168.1.50'}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">Agent Version:</span>
              <span className="font-mono text-slate-200">{primaryAgent?.version || 'v1.2.0'}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">Printers Monitored:</span>
              <span className="font-medium text-emerald-300">2 (AD5X & 5M)</span>
            </div>
          </div>
        </div>

        {/* Pairing Code & Launch Command */}
        <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-white flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-sky-400" /> Fast Device Pairing
            </span>
            <span className="font-mono text-sky-300 bg-sky-950/60 border border-sky-800 px-2 py-0.5 rounded text-xs font-bold">
              Pairing Code: {pairingCode}
            </span>
          </div>

          <div className="p-2.5 rounded bg-slate-900 border border-slate-800 font-mono text-[11px] text-slate-300 flex items-center justify-between gap-2 overflow-x-auto">
            <span>node printflow-agent.mjs --server={window.location.origin} --code={pairingCode}</span>
            <button
              onClick={() => copyToClipboard(`node printflow-agent.mjs --server=${window.location.origin} --code=${pairingCode}`)}
              className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white shrink-0"
              title="Copy Command"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-slate-400">Zero dependencies required. Runs in Node.js 18+.</span>
            <a
              href="/api/printer-agent/download-script"
              download="printflow-agent.mjs"
              className="inline-flex items-center gap-1 text-xs text-sky-400 hover:underline font-medium"
            >
              <Download className="w-3.5 h-3.5" /> Download printflow-agent.mjs
            </a>
          </div>
        </div>

        {/* Recent Agent Logs */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-300 flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-slate-400" /> Recent Agent Event Logs
            </span>
            <Button variant="ghost" size="sm" onClick={loadData} leftIcon={<RefreshCw className="w-3 h-3" />}>
              Refresh
            </Button>
          </div>

          <div className="p-3 rounded bg-slate-950 border border-slate-800 font-mono text-[11px] text-slate-400 space-y-1 max-h-36 overflow-y-auto">
            {primaryAgent?.recentLogs?.map((log, idx) => (
              <div key={idx} className="flex items-start justify-between gap-2">
                <span className={log.level === 'error' ? 'text-rose-400' : 'text-slate-300'}>
                  {log.message}
                </span>
                <span className="text-[10px] text-slate-500 shrink-0">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
              </div>
            )) || <div className="text-slate-500">No agent logs recorded yet.</div>}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-slate-800 flex justify-end">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};
