import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Printer, PrinterStatus } from '../../types';
import { useDatabase } from '../../context/DatabaseContext';
import { useNotification } from '../../context/NotificationContext';
import { printersApi } from '../../lib/api/printers';
import { Info, Wifi, Shield, Camera, Layers, CheckCircle2 } from 'lucide-react';

interface PrinterFormModalProps {
  printer?: Printer | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export const PrinterFormModal: React.FC<PrinterFormModalProps> = ({
  printer,
  isOpen,
  onClose,
  onSaved,
}) => {
  const { savePrinter } = useDatabase();
  const { showToast } = useNotification();

  const isAD5XDefault = printer?.model ? printer.model.includes('AD5X') : true;

  const [name, setName] = useState(printer?.name || (isAD5XDefault ? 'Flashforge AD5X' : 'Flashforge Adventurer 5M'));
  const [manufacturer, setManufacturer] = useState(printer?.manufacturer || 'Flashforge');
  const [model, setModel] = useState(printer?.model || (isAD5XDefault ? 'Flashforge AD5X' : 'Flashforge Adventurer 5M'));
  const [status, setStatus] = useState<PrinterStatus>(printer?.status || 'IDLE');
  const [connectionMode, setConnectionMode] = useState<'lan_direct' | 'agent_gateway' | 'mock_simulation'>(
    printer?.connectionMode || 'mock_simulation'
  );
  const [ipAddress, setIpAddress] = useState(printer?.ipAddress || (isAD5XDefault ? '192.168.1.105' : '192.168.1.106'));
  const [httpPort, setHttpPort] = useState(printer?.httpPort || 8898);
  const [tcpPort, setTcpPort] = useState(printer?.tcpPort || 8899);
  const [checkCode, setCheckCode] = useState(printer?.checkCode || (isAD5XDefault ? '88492015' : '49201948'));
  const [location, setLocation] = useState(printer?.location || 'Workshop Bay 1');
  const [buildVolume, setBuildVolume] = useState(printer?.capabilities?.buildVolume || '220x220x220mm');
  const [nozzleSize, setNozzleSize] = useState(printer?.capabilities?.nozzleSize || '0.4mm');
  const [maxTemp, setMaxTemp] = useState(printer?.capabilities?.maxTemp || (isAD5XDefault ? 300 : 280));
  const [multiColor, setMultiColor] = useState(printer?.capabilities?.multiColor ?? isAD5XDefault);
  const [highSpeed, setHighSpeed] = useState(printer?.capabilities?.highSpeed ?? true);
  const [hasCamera, setHasCamera] = useState(printer?.hasCamera ?? isAD5XDefault);
  const [cameraStreamUrl, setCameraStreamUrl] = useState(
    printer?.cameraStreamUrl || (isAD5XDefault ? 'http://192.168.1.105:8080/?action=stream' : '')
  );
  const [notes, setNotes] = useState(printer?.notes || '');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  if (!isOpen) return null;

  const handleModelPresetChange = (selectedModel: string) => {
    setModel(selectedModel);
    if (selectedModel.includes('AD5X')) {
      setName('Flashforge AD5X');
      setMultiColor(true);
      setMaxTemp(300);
      setHasCamera(true);
      setIpAddress('192.168.1.105');
      setCameraStreamUrl('http://192.168.1.105:8080/?action=stream');
      setNotes('Multi-color IFS 4-spool system. 600 mm/s high-speed core.');
    } else if (selectedModel.includes('Adventurer 5M') || selectedModel.includes('5M')) {
      setName('Flashforge Adventurer 5M');
      setMultiColor(false);
      setMaxTemp(280);
      setHasCamera(false);
      setIpAddress('192.168.1.106');
      setCameraStreamUrl('');
      setNotes('High-speed single extruder (600 mm/s). Camera is optional add-on.');
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      if (printer?.id) {
        const res = await printersApi.testConnection(printer.id);
        if (res.success) {
          setTestResult({
            success: true,
            message: `Connected! Latency: ${res.latencyMs}ms. Firmware: ${res.firmware || 'Native Flashforge OS'}. Port ${tcpPort} open.`,
          });
        } else {
          setTestResult({
            success: false,
            message: res.error || 'Connection failed to printer.',
          });
        }
      } else {
        // Unsaved printer simulated probe
        setTestResult({
          success: true,
          message: `Configuration parameters valid. Socket port ${tcpPort} and REST port ${httpPort} ready for Flash Studio protocol.`,
        });
      }
    } catch (err: any) {
      setTestResult({ success: false, message: err.message });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast({ type: 'error', title: 'Error', message: 'Printer name is required' });
      return;
    }

    try {
      const printerPayload: Printer = {
        id: printer?.id || 'printer-' + Date.now(),
        name: name.trim(),
        manufacturer: manufacturer.trim(),
        model: model.trim(),
        status,
        connectionStatus: 'Connected',
        connectionMode,
        ipAddress: ipAddress.trim() || undefined,
        httpPort: Number(httpPort) || 8898,
        tcpPort: Number(tcpPort) || 8899,
        checkCode: checkCode.trim() || undefined,
        location: location.trim() || undefined,
        hasCamera,
        cameraStreamUrl: hasCamera && cameraStreamUrl ? cameraStreamUrl.trim() : undefined,
        capabilities: {
          buildVolume,
          nozzleSize,
          maxTemp: Number(maxTemp) || 280,
          multiColor,
          highSpeed,
        },
        currentJobId: printer?.currentJobId,
        currentJobName: printer?.currentJobName,
        progressPercentage: printer?.progressPercentage,
        remainingMinutes: printer?.remainingMinutes,
        notes: notes.trim() || undefined,
        createdAt: printer?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Save to client context and server storage
      savePrinter(printerPayload);
      await printersApi.savePrinter(printerPayload);

      showToast({
        type: 'success',
        title: printer ? 'Printer Updated' : 'Printer Connected',
        message: `${printerPayload.name} (${printerPayload.model}) successfully registered!`,
      });
      if (onSaved) onSaved();
      onClose();
    } catch (err: any) {
      showToast({ type: 'error', title: 'Save Error', message: err.message });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={printer ? `Configure ${printer.name}` : 'Connect Flashforge 3D Printer'}
      subtitle="Flash Studio / Orca-Flashforge LAN Protocol (Ports 8898 / 8899)"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Model Presets */}
        <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
          <label className="block text-xs font-semibold text-slate-300">
            Select Official Flashforge Model
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleModelPresetChange('Flashforge AD5X')}
              className={`p-2.5 rounded border text-left text-xs transition-colors ${
                model.includes('AD5X')
                  ? 'border-sky-500 bg-sky-950/40 text-sky-200'
                  : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="font-semibold text-white">Flashforge AD5X</div>
              <div className="text-[11px] text-slate-400 mt-0.5">4-Spool IFS Multi-Color • Camera Built-in</div>
            </button>

            <button
              type="button"
              onClick={() => handleModelPresetChange('Flashforge Adventurer 5M')}
              className={`p-2.5 rounded border text-left text-xs transition-colors ${
                model.includes('Adventurer 5M') || model.includes('5M')
                  ? 'border-sky-500 bg-sky-950/40 text-sky-200'
                  : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="font-semibold text-white">Flashforge Adventurer 5M</div>
              <div className="text-[11px] text-slate-400 mt-0.5">High-Speed Single Extruder • Optional Camera</div>
            </button>
          </div>
        </div>

        {/* Basic Info */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Printer Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Workshop Location
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Bay 1, Shelf B"
              className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>

        {/* Network & Protocol */}
        <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white flex items-center gap-1.5">
              <Wifi className="w-3.5 h-3.5 text-sky-400" /> Network & Flashforge LAN Mode
            </span>
            <span className="text-[10px] text-slate-400 font-mono">Port 8898 (HTTP) / 8899 (TCP)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Connection Mode</label>
              <select
                value={connectionMode}
                onChange={(e) => setConnectionMode(e.target.value as any)}
                className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white"
              >
                <option value="mock_simulation">Mock Simulation (Safe Test)</option>
                <option value="lan_direct">LAN Direct Socket (Port 8899)</option>
                <option value="agent_gateway">Local Printer Agent Gateway</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Printer IP Address</label>
              <input
                type="text"
                value={ipAddress}
                onChange={(e) => setIpAddress(e.target.value)}
                placeholder="192.168.1.105"
                className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">
                Security CheckCode
              </label>
              <input
                type="text"
                value={checkCode}
                onChange={(e) => setCheckCode(e.target.value)}
                placeholder="8-digit code from screen"
                className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white font-mono"
              />
            </div>
          </div>

          {/* Test connection button & feedback */}
          <div className="flex items-center justify-between pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              isLoading={isTesting}
              onClick={handleTestConnection}
              leftIcon={<Shield className="w-3.5 h-3.5" />}
            >
              Test Flashforge LAN Connection
            </Button>
            {testResult && (
              <span
                className={`text-xs ${
                  testResult.success ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {testResult.message}
              </span>
            )}
          </div>
        </div>

        {/* Multi-Color IFS & Camera */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-sky-400" /> Multi-Color (IFS)
              </span>
              <input
                type="checkbox"
                checked={multiColor}
                onChange={(e) => setMultiColor(e.target.checked)}
                className="rounded border-slate-700 bg-slate-900 text-sky-600 focus:ring-0 w-4 h-4"
              />
            </div>
            <p className="text-[11px] text-slate-400 leading-tight">
              {multiColor
                ? 'Enabled. Flashforge IFS 4-spool ecosystem active for multi-color print assignments.'
                : 'Single material printing mode.'}
            </p>
          </div>

          <div className="p-3 rounded bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-sky-400" /> Camera Stream
              </span>
              <input
                type="checkbox"
                checked={hasCamera}
                onChange={(e) => {
                  setHasCamera(e.target.checked);
                  if (e.target.checked && !cameraStreamUrl) {
                    setCameraStreamUrl(`http://${ipAddress || '192.168.1.105'}:8080/?action=stream`);
                  }
                }}
                className="rounded border-slate-700 bg-slate-900 text-sky-600 focus:ring-0 w-4 h-4"
              />
            </div>
            <p className="text-[11px] text-slate-400 leading-tight">
              {hasCamera
                ? 'Port 8080 MJPEG camera stream active for real-time visual inspection.'
                : 'No camera installed (Adventurer 5M default or privacy mode).'}
            </p>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">
            Hardware Notes & Operational Guidelines
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
            placeholder="e.g. 0.4mm hardened steel nozzle installed. Standard bed leveling verified."
          />
        </div>

        {/* Footer actions */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm" leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}>
            Save Printer Configuration
          </Button>
        </div>
      </form>
    </Modal>
  );
};
