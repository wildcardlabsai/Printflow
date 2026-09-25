import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { PrintFile, FilamentMaterial } from '../../types';
import { printersApi } from '../../lib/api/printers';
import { useDatabase } from '../../context/DatabaseContext';
import { useNotification } from '../../context/NotificationContext';
import {
  FileCode,
  Upload,
  Trash2,
  Download,
  Clock,
  Layers,
  Disc,
  Printer as PrinterIcon,
  Search,
  Plus,
} from 'lucide-react';

interface PrintFilesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectFileForJob?: (file: PrintFile) => void;
}

export const PrintFilesModal: React.FC<PrintFilesModalProps> = ({
  isOpen,
  onClose,
  onSelectFileForJob,
}) => {
  const { products } = useDatabase();
  const { showToast } = useNotification();

  const [files, setFiles] = useState<PrintFile[]>([]);
  const [search, setSearch] = useState('');
  const [filterModel, setFilterModel] = useState<'All' | 'Flashforge AD5X' | 'Flashforge Adventurer 5M'>('All');
  const [isUploading, setIsUploading] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);

  // New file form
  const [name, setName] = useState('');
  const [originalFileName, setOriginalFileName] = useState('');
  const [productId, setProductId] = useState('');
  const [targetPrinterModel, setTargetPrinterModel] = useState<'Flashforge AD5X' | 'Flashforge Adventurer 5M' | 'Any'>('Flashforge AD5X');
  const [material, setMaterial] = useState<FilamentMaterial>('PLA');
  const [colorInput, setColorInput] = useState('Black');
  const [isMultiColor, setIsMultiColor] = useState(false);
  const [printMinutes, setPrintMinutes] = useState(120);
  const [filamentGrams, setFilamentGrams] = useState(40);
  const [slicerProfile, setSlicerProfile] = useState('Flash Studio Desktop 1.5.2 (Orca-Flashforge)');

  const loadFiles = async () => {
    try {
      const data = await printersApi.getPrintFiles();
      setFiles(data);
    } catch (err: any) {
      console.warn('Failed to load print files:', err.message);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadFiles();
    }
  }, [isOpen]);

  const handleCreateFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !originalFileName.trim()) {
      showToast({ type: 'error', title: 'Missing details', message: 'Name and sliced file name are required.' });
      return;
    }

    try {
      setIsUploading(true);
      const selectedProduct = products.find((p) => p.id === productId);

      await printersApi.uploadPrintFile({
        name: name.trim(),
        originalFileName: originalFileName.trim(),
        fileFormat: originalFileName.endsWith('.3mf') ? '3mf' : 'gcode',
        productId: productId || undefined,
        productName: selectedProduct?.name,
        targetPrinterModel,
        material,
        colors: colorInput.split(',').map((c) => c.trim()).filter(Boolean),
        isMultiColor: targetPrinterModel === 'Flashforge AD5X' ? isMultiColor : false,
        colorChannelsCount: isMultiColor ? colorInput.split(',').length : 1,
        estimatedPrintTimeMinutes: Number(printMinutes) || 120,
        estimatedFilamentGrams: Number(filamentGrams) || 40,
        slicerProfile,
      });

      showToast({
        type: 'success',
        title: 'Print File Catalogued',
        message: `${name} registered for ${targetPrinterModel}`,
      });

      setShowUploadForm(false);
      setName('');
      setOriginalFileName('');
      loadFiles();
    } catch (err: any) {
      showToast({ type: 'error', title: 'Upload Failed', message: err.message });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string, fileName: string) => {
    if (!window.confirm(`Delete print file '${fileName}'?`)) return;
    try {
      await printersApi.deletePrintFile(id);
      showToast({ type: 'info', title: 'File Removed', message: `${fileName} deleted.` });
      loadFiles();
    } catch (err: any) {
      showToast({ type: 'error', title: 'Delete Failed', message: err.message });
    }
  };

  const filteredFiles = files.filter((f) => {
    const matchesSearch =
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      f.originalFileName.toLowerCase().includes(search.toLowerCase()) ||
      f.productName?.toLowerCase().includes(search.toLowerCase());
    const matchesModel = filterModel === 'All' || f.targetPrinterModel === filterModel || f.targetPrinterModel === 'Any';
    return matchesSearch && matchesModel;
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Print File Library & Slicer G-code Profiles"
      subtitle="Flash Studio / Orca-Flashforge Pre-sliced .gcode and .3mf repository"
      maxWidth="3xl"
    >
      <div className="space-y-4">
        {/* Top Controls: Search & Upload button */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search print files, products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500"
              />
            </div>
            <select
              value={filterModel}
              onChange={(e) => setFilterModel(e.target.value as any)}
              className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white"
            >
              <option value="All">All Printers</option>
              <option value="Flashforge AD5X">AD5X (IFS)</option>
              <option value="Flashforge Adventurer 5M">Adventurer 5M</option>
            </select>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowUploadForm(!showUploadForm)}
            leftIcon={showUploadForm ? undefined : <Plus className="w-3.5 h-3.5" />}
          >
            {showUploadForm ? 'Cancel Upload' : 'Upload Sliced File'}
          </Button>
        </div>

        {/* Upload New Print File Form */}
        {showUploadForm && (
          <form
            onSubmit={handleCreateFile}
            className="p-4 rounded-lg bg-slate-950 border border-sky-800/80 space-y-3 text-xs"
          >
            <div className="font-semibold text-white flex items-center gap-1.5 pb-2 border-b border-slate-900">
              <Upload className="w-3.5 h-3.5 text-sky-400" />
              Add Pre-Sliced Flash Studio File (.gcode / .3mf)
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 mb-1">Display Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Graded Card Slab Stand (Dual Color)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Original Sliced File Name *</label>
                <input
                  type="text"
                  placeholder="Card_Stand_AD5X_v2.3mf or .gcode"
                  value={originalFileName}
                  onChange={(e) => setOriginalFileName(e.target.value)}
                  required
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-white font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-300 mb-1">Target Printer</label>
                <select
                  value={targetPrinterModel}
                  onChange={(e) => setTargetPrinterModel(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                >
                  <option value="Flashforge AD5X">Flashforge AD5X (Multi-Color)</option>
                  <option value="Flashforge Adventurer 5M">Flashforge Adventurer 5M</option>
                  <option value="Any">Any Compatible Printer</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Linked Catalog Product</label>
                <select
                  value={productId}
                  onChange={(e) => setProductId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                >
                  <option value="">None / Standalone</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Material</label>
                <select
                  value={material}
                  onChange={(e) => setMaterial(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                >
                  <option value="PLA">PLA</option>
                  <option value="PETG">PETG</option>
                  <option value="Silk PLA">Silk PLA</option>
                  <option value="ABS">ABS</option>
                  <option value="TPU">TPU</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-300 mb-1">Colors (Comma separated)</label>
                <input
                  type="text"
                  placeholder="Black, Red"
                  value={colorInput}
                  onChange={(e) => setColorInput(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Print Duration (Minutes)</label>
                <input
                  type="number"
                  value={printMinutes}
                  onChange={(e) => setPrintMinutes(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Filament Usage (Grams)</label>
                <input
                  type="number"
                  value={filamentGrams}
                  onChange={(e) => setFilamentGrams(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                />
              </div>
            </div>

            {targetPrinterModel === 'Flashforge AD5X' && (
              <label className="flex items-center gap-2 cursor-pointer select-none text-slate-300 pt-1">
                <input
                  type="checkbox"
                  checked={isMultiColor}
                  onChange={(e) => setIsMultiColor(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-sky-600 focus:ring-0 w-4 h-4"
                />
                <span>Multi-color print file (requires Flashforge AD5X IFS system)</span>
              </label>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-900">
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowUploadForm(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" isLoading={isUploading}>
                Save to Library
              </Button>
            </div>
          </form>
        )}

        {/* Files Table / List */}
        <div className="space-y-2">
          {filteredFiles.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400 bg-slate-950 rounded-lg border border-slate-800">
              No print files found matching criteria. Upload a pre-sliced Flash Studio .gcode or .3mf file above.
            </div>
          ) : (
            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
              {filteredFiles.map((file) => (
                <div
                  key={file.id}
                  className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <FileCode className="w-4 h-4 text-sky-400 shrink-0" />
                      <span className="font-semibold text-white text-sm">{file.name}</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-900 border border-slate-800 text-slate-400">
                        .{file.fileFormat}
                      </span>
                      {file.isMultiColor && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-950 text-indigo-300 border border-indigo-800">
                          AD5X IFS Multi-Color
                        </span>
                      )}
                    </div>

                    <div className="text-[11px] font-mono text-slate-400 truncate">
                      {file.originalFileName} • {file.slicerProfile || 'Flash Studio Desktop'}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 pt-1">
                      <span className="flex items-center gap-1 text-slate-300">
                        <PrinterIcon className="w-3 h-3 text-slate-500" />
                        {file.targetPrinterModel}
                      </span>
                      <span className="flex items-center gap-1">
                        <Disc className="w-3 h-3 text-slate-500" />
                        {file.material} ({file.colors.join(', ')})
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        {Math.floor(file.estimatedPrintTimeMinutes / 60)}h {file.estimatedPrintTimeMinutes % 60}m
                      </span>
                      <span className="flex items-center gap-1">
                        <Layers className="w-3 h-3 text-slate-500" />
                        {file.estimatedFilamentGrams}g
                      </span>
                      {file.productName && (
                        <span className="text-sky-300 font-medium truncate max-w-[200px]">
                          Product: {file.productName}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {onSelectFileForJob && (
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => {
                          onSelectFileForJob(file);
                          onClose();
                        }}
                      >
                        Select File
                      </Button>
                    )}
                    <button
                      onClick={() => handleDelete(file.id, file.name)}
                      className="p-1.5 rounded hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 transition-colors"
                      title="Delete Print File"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-slate-400 text-xs">
          <span>Flashforge Ecosystem: Sliced files prepared via Flash Studio / Orca-Flashforge.</span>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};
