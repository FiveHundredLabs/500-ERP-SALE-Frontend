import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  X,
  Upload,
  FileText,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Search,
  Trash2,
  Edit2,
  RefreshCw,
  Phone,
  MessageCircle,
  MapPin,
  Check,
  ChevronRight,
  ArrowLeft,
  FileCheck2,
  Info
} from 'lucide-react';
import { invoiceService } from '../../services/InvoiceService';

export interface ExtractedCustomer {
  tempId: string;
  customerName: string;
  address: string;
  city?: string;
  whatsapp: string | null;
  phone2: string | null;
  rawPhone: string;
  status: 'VALID' | 'DUPLICATE' | 'MISSING_PHONE' | 'MISSING_ADDRESS' | 'UNCERTAIN' | 'INVALID';
  statusMessage?: string;
  isExistingCustomer?: boolean;
  matchedExistingCode?: string;
}

interface CustomerPdfImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (count: number) => void;
}

type ImportStep = 'UPLOAD' | 'PROCESSING' | 'REVIEW' | 'COMPLETED';

export const CustomerPdfImportModal: React.FC<CustomerPdfImportModalProps> = ({
  isOpen,
  onClose,
  onImportSuccess,
}) => {
  const [step, setStep] = useState<ImportStep>('UPLOAD');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Processing stage tracking
  const [processingStage, setProcessingStage] = useState(0);
  const processingStages = [
    'Uploading PDF to server...',
    'Reading multi-page document streams...',
    'Extracting customer names, addresses, and phone tokens...',
    'Classifying Sri Lankan mobile vs landline numbers...',
    'Cleaning and deduplicating repeated address segments...',
    'Cross-referencing database for existing customer duplicates...',
    'Preparing interactive preview table...',
  ];

  // Extracted Customers Data
  const [extractedList, setExtractedList] = useState<ExtractedCustomer[]>([]);
  const [selectedTempIds, setSelectedTempIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Inline editing modal/state
  const [editingCustomer, setEditingCustomer] = useState<ExtractedCustomer | null>(null);

  // Import Results
  const [importResults, setImportResults] = useState<{
    totalRequested: number;
    successfullyImported: number;
    duplicatesSkipped: number;
    failed: number;
  } | null>(null);

  const [isSubmittingImport, setIsSubmittingImport] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Reset state on open/close
  useEffect(() => {
    if (isOpen) {
      setStep('UPLOAD');
      setSelectedFile(null);
      setErrorMessage(null);
      setExtractedList([]);
      setSelectedTempIds(new Set());
      setImportResults(null);
      setSearchQuery('');
      setStatusFilter('ALL');
    }
  }, [isOpen]);

  // File selection & drag-and-drop
  const handleFile = (file: File) => {
    setErrorMessage(null);
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      setErrorMessage('Please select a valid PDF document (.pdf).');
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      setErrorMessage('File size exceeds the 25MB limit.');
      return;
    }
    setSelectedFile(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  // Start parsing flow
  const handleStartParsing = async () => {
    if (!selectedFile) return;

    setStep('PROCESSING');
    setProcessingStage(0);
    setErrorMessage(null);

    // Stage progress animation timer
    const interval = setInterval(() => {
      setProcessingStage((prev) => (prev < processingStages.length - 1 ? prev + 1 : prev));
    }, 650);

    try {
      const result = await invoiceService.parseCustomerPdf(selectedFile);
      clearInterval(interval);
      setProcessingStage(processingStages.length - 1);

      setTimeout(() => {
        setExtractedList(result.customers);

        // Auto-select valid records by default
        const validIds = new Set<string>();
        result.customers.forEach((c) => {
          if (c.status === 'VALID' || c.status === 'MISSING_ADDRESS') {
            validIds.add(c.tempId);
          }
        });
        setSelectedTempIds(validIds);
        setStep('REVIEW');
      }, 400);
    } catch (err: any) {
      clearInterval(interval);
      setStep('UPLOAD');
      setErrorMessage(err.message || 'Failed to extract customer records from PDF.');
    }
  };

  // Filtered customers for preview table
  const filteredCustomers = useMemo(() => {
    return extractedList.filter((c) => {
      const matchesSearch =
        searchQuery === '' ||
        c.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.whatsapp && c.whatsapp.includes(searchQuery)) ||
        (c.phone2 && c.phone2.includes(searchQuery));

      if (!matchesSearch) return false;

      if (statusFilter === 'ALL') return true;
      if (statusFilter === 'VALID') return c.status === 'VALID';
      if (statusFilter === 'DUPLICATE') return c.status === 'DUPLICATE';
      if (statusFilter === 'REVIEW')
        return c.status === 'MISSING_PHONE' || c.status === 'MISSING_ADDRESS' || c.status === 'UNCERTAIN';
      if (statusFilter === 'INVALID') return c.status === 'INVALID';

      return true;
    });
  }, [extractedList, searchQuery, statusFilter]);

  // Statistics
  const stats = useMemo(() => {
    const total = extractedList.length;
    const valid = extractedList.filter((c) => c.status === 'VALID').length;
    const duplicates = extractedList.filter((c) => c.status === 'DUPLICATE').length;
    const review = extractedList.filter(
      (c) => c.status === 'MISSING_PHONE' || c.status === 'MISSING_ADDRESS' || c.status === 'UNCERTAIN'
    ).length;
    const invalid = extractedList.filter((c) => c.status === 'INVALID').length;
    return { total, valid, duplicates, review, invalid };
  }, [extractedList]);

  // Selection toggle
  const toggleSelectAll = () => {
    if (selectedTempIds.size === filteredCustomers.length) {
      setSelectedTempIds(new Set());
    } else {
      const newSelected = new Set(selectedTempIds);
      filteredCustomers.forEach((c) => newSelected.add(c.tempId));
      setSelectedTempIds(newSelected);
    }
  };

  const toggleSelectOne = (tempId: string) => {
    const newSelected = new Set(selectedTempIds);
    if (newSelected.has(tempId)) {
      newSelected.delete(tempId);
    } else {
      newSelected.add(tempId);
    }
    setSelectedTempIds(newSelected);
  };

  const selectAllValid = () => {
    const validIds = new Set<string>();
    extractedList.forEach((c) => {
      if (c.status === 'VALID') validIds.add(c.tempId);
    });
    setSelectedTempIds(validIds);
  };

  // Delete extracted record
  const handleDeleteRecord = (tempId: string) => {
    setExtractedList((prev) => prev.filter((c) => c.tempId !== tempId));
    setSelectedTempIds((prev) => {
      const next = new Set(prev);
      next.delete(tempId);
      return next;
    });
  };

  // Save edited customer
  const handleSaveEdit = (updated: ExtractedCustomer) => {
    setExtractedList((prev) =>
      prev.map((c) => {
        if (c.tempId === updated.tempId) {
          // Re-evaluate validity
          const isValid = updated.customerName.trim().length >= 2 && Boolean(updated.whatsapp || updated.phone2);
          return {
            ...updated,
            status: isValid ? (c.status === 'DUPLICATE' ? 'DUPLICATE' : 'VALID') : 'INVALID',
            statusMessage: isValid ? 'Manual edits saved' : 'Customer Name and Contact Number required',
          };
        }
        return c;
      })
    );
    setEditingCustomer(null);
  };

  // Execute database import
  const handleExecuteImport = async () => {
    const recordsToImport = extractedList
      .filter((c) => selectedTempIds.has(c.tempId))
      .map((c) => ({
        shopName: c.customerName.trim(),
        fullName: c.customerName.trim(),
        address: c.address.trim(),
        city: c.city,
        phone: c.whatsapp || c.phone2 || '',
        phone2: c.whatsapp && c.phone2 ? c.phone2 : undefined,
        creditLimit: 1000000,
        status: 'Active',
      }));

    if (recordsToImport.length === 0) {
      setErrorMessage('Please select at least 1 customer record to import.');
      return;
    }

    setIsSubmittingImport(true);
    setErrorMessage(null);

    try {
      const res = await invoiceService.confirmCustomerPdfImport(recordsToImport);
      setImportResults(res);
      setStep('COMPLETED');
      onImportSuccess(res.successfullyImported);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to complete customer database import.');
    } finally {
      setIsSubmittingImport(false);
    }
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(2) + ' MB';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-6xl max-h-[92vh] flex flex-col bg-[#0b1120] border border-[#2e265c] rounded-2xl shadow-2xl shadow-purple-950/40 text-slate-200 overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#2e265c]/80 flex items-center justify-between bg-gradient-to-r from-[#111836] to-[#0f172a]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30">
              <Upload size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide">
                Import Customers from PDF
              </h2>
              <p className="text-xs text-purple-300/70">
                Automated document extraction, Sri Lankan phone classification & address deduplication
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
          {errorMessage && (
            <div className="mb-4 p-3 rounded-xl bg-red-950/60 border border-red-800/80 text-red-200 text-xs flex items-center gap-2.5">
              <AlertCircle size={16} className="text-red-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* ================= STEP 1: UPLOAD ================= */}
          {step === 'UPLOAD' && (
            <div className="space-y-6 max-w-2xl mx-auto py-6">
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-10 text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                  dragActive
                    ? 'border-purple-500 bg-purple-950/20 scale-[1.01]'
                    : selectedFile
                    ? 'border-emerald-500/60 bg-emerald-950/10'
                    : 'border-[#2e265c] hover:border-purple-500/50 bg-[#0f172a]/60'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFile(e.target.files[0]);
                    }
                  }}
                />

                {selectedFile ? (
                  <div className="space-y-3">
                    <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-950/50">
                      <FileCheck2 size={32} />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-white">{selectedFile.name}</h4>
                      <p className="text-xs text-slate-400">{formatFileSize(selectedFile.size)}</p>
                    </div>
                    <span className="inline-block px-3 py-1 bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 rounded-full text-xs font-medium">
                      PDF Document Verified
                    </span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="w-16 h-16 rounded-2xl bg-purple-600/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mx-auto">
                      <Upload size={30} />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-white">
                        Drag and drop your Customer PDF here
                      </h4>
                      <p className="text-xs text-slate-400 mt-1">
                        or click to browse files from your computer (Max 25MB)
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Extraction Rules Highlights */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs bg-[#0f172a]/70 border border-[#2e265c] p-4 rounded-xl">
                <div className="flex items-start gap-2.5">
                  <Phone size={15} className="text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-200">Smart Phone Classification</strong>
                    <p className="text-slate-400 text-[11px] mt-0.5">
                      Extracts combined numbers; mobile (07X) maps to WhatsApp, landline (011X) maps to Phone 2.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <MapPin size={15} className="text-purple-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-200">Address Deduplication</strong>
                    <p className="text-slate-400 text-[11px] mt-0.5">
                      Detects and trims repeating address phrases automatically.
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl border border-slate-700 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!selectedFile}
                  onClick={handleStartParsing}
                  className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:pointer-events-none text-white text-xs font-bold transition shadow-lg shadow-purple-900/40 flex items-center gap-2"
                >
                  <span>Extract & Preview Customers</span>
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          )}

          {/* ================= STEP 2: PROCESSING ================= */}
          {step === 'PROCESSING' && (
            <div className="max-w-md mx-auto py-12 text-center space-y-6">
              <div className="relative w-20 h-20 mx-auto">
                <div className="absolute inset-0 rounded-full border-4 border-purple-500/20 animate-ping" />
                <div className="w-20 h-20 rounded-full border-4 border-purple-500 border-t-transparent animate-spin flex items-center justify-center bg-[#0f172a]">
                  <RefreshCw size={24} className="text-purple-400 animate-pulse" />
                </div>
              </div>

              <div>
                <h3 className="text-base font-bold text-white">Analyzing Customer Document</h3>
                <p className="text-xs text-purple-300/80 mt-1 font-mono">
                  {processingStages[processingStage]}
                </p>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-[#1e293b] h-2 rounded-full overflow-hidden border border-slate-700">
                <div
                  className="bg-gradient-to-r from-purple-600 via-indigo-500 to-blue-500 h-full transition-all duration-500 ease-out"
                  style={{
                    width: `${((processingStage + 1) / processingStages.length) * 100}%`,
                  }}
                />
              </div>

              <p className="text-[11px] text-slate-500">
                Please wait while we parse table columns, classify numbers, and check existing records.
              </p>
            </div>
          )}

          {/* ================= STEP 3: REVIEW & CLEAN ================= */}
          {step === 'REVIEW' && (
            <div className="space-y-4">
              {/* Summary KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="p-3 bg-[#0f172a] border border-[#2e265c] rounded-xl flex items-center justify-between">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-400">Total Found</p>
                    <p className="text-lg font-bold text-white">{stats.total}</p>
                  </div>
                  <FileText className="text-slate-400" size={18} />
                </div>

                <div
                  onClick={() => setStatusFilter('VALID')}
                  className={`p-3 bg-[#0f172a] border rounded-xl flex items-center justify-between cursor-pointer transition ${
                    statusFilter === 'VALID'
                      ? 'border-emerald-500 ring-2 ring-emerald-500/30'
                      : 'border-[#2e265c] hover:border-emerald-500/40'
                  }`}
                >
                  <div>
                    <p className="text-[10px] uppercase font-bold text-emerald-400">Valid</p>
                    <p className="text-lg font-bold text-emerald-300">{stats.valid}</p>
                  </div>
                  <CheckCircle2 className="text-emerald-400" size={18} />
                </div>

                <div
                  onClick={() => setStatusFilter('DUPLICATE')}
                  className={`p-3 bg-[#0f172a] border rounded-xl flex items-center justify-between cursor-pointer transition ${
                    statusFilter === 'DUPLICATE'
                      ? 'border-amber-500 ring-2 ring-amber-500/30'
                      : 'border-[#2e265c] hover:border-amber-500/40'
                  }`}
                >
                  <div>
                    <p className="text-[10px] uppercase font-bold text-amber-400">Duplicates</p>
                    <p className="text-lg font-bold text-amber-300">{stats.duplicates}</p>
                  </div>
                  <AlertTriangle className="text-amber-400" size={18} />
                </div>

                <div
                  onClick={() => setStatusFilter('REVIEW')}
                  className={`p-3 bg-[#0f172a] border rounded-xl flex items-center justify-between cursor-pointer transition ${
                    statusFilter === 'REVIEW'
                      ? 'border-yellow-500 ring-2 ring-yellow-500/30'
                      : 'border-[#2e265c] hover:border-yellow-500/40'
                  }`}
                >
                  <div>
                    <p className="text-[10px] uppercase font-bold text-yellow-400">Needs Review</p>
                    <p className="text-lg font-bold text-yellow-300">{stats.review}</p>
                  </div>
                  <Info className="text-yellow-400" size={18} />
                </div>

                <div
                  onClick={() => setStatusFilter('INVALID')}
                  className={`p-3 bg-[#0f172a] border rounded-xl flex items-center justify-between cursor-pointer transition ${
                    statusFilter === 'INVALID'
                      ? 'border-rose-500 ring-2 ring-rose-500/30'
                      : 'border-[#2e265c] hover:border-rose-500/40'
                  }`}
                >
                  <div>
                    <p className="text-[10px] uppercase font-bold text-rose-400">Invalid</p>
                    <p className="text-lg font-bold text-rose-300">{stats.invalid}</p>
                  </div>
                  <AlertCircle className="text-rose-400" size={18} />
                </div>
              </div>

              {/* Filter Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0f172a]/70 border border-[#2e265c] p-3 rounded-xl">
                <div className="flex items-center gap-2 flex-1 min-w-[240px]">
                  <div className="relative flex-1">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search extracted customers..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-[#0b1120] border border-[#2e265c] rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>

                  {statusFilter !== 'ALL' && (
                    <button
                      onClick={() => setStatusFilter('ALL')}
                      className="px-2.5 py-1 text-[11px] rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                    >
                      Clear Filter ({statusFilter})
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={selectAllValid}
                    className="px-3 py-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 text-xs font-semibold transition"
                  >
                    Select All Valid ({stats.valid})
                  </button>

                  <span className="text-xs font-semibold text-purple-300 bg-purple-950/60 px-3 py-1.5 rounded-lg border border-purple-800/60">
                    {selectedTempIds.size} Selected
                  </span>
                </div>
              </div>

              {/* Table Container */}
              <div className="border border-[#2e265c] rounded-xl overflow-x-auto max-h-[46vh] custom-scrollbar bg-[#0f172a]">
                <table className="min-w-full divide-y divide-[#2e265c] text-xs">
                  <thead className="bg-[#111836] sticky top-0 z-10 text-slate-300 font-semibold uppercase text-[11px]">
                    <tr>
                      <th className="p-3 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={
                            filteredCustomers.length > 0 &&
                            selectedTempIds.size === filteredCustomers.length
                          }
                          onChange={toggleSelectAll}
                          className="rounded border-slate-700 text-purple-600 focus:ring-purple-500 cursor-pointer"
                        />
                      </th>
                      <th className="p-3 text-left">Customer / Shop Name</th>
                      <th className="p-3 text-left">Address</th>
                      <th className="p-3 text-left">WhatsApp (Mobile)</th>
                      <th className="p-3 text-left">Phone 2 (Landline)</th>
                      <th className="p-3 text-left">Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2e265c]/60">
                    {filteredCustomers.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-500">
                          No customer records found matching your filter.
                        </td>
                      </tr>
                    ) : (
                      filteredCustomers.map((cust) => {
                        const isSelected = selectedTempIds.has(cust.tempId);

                        return (
                          <tr
                            key={cust.tempId}
                            className={`transition hover:bg-purple-950/15 ${
                              isSelected ? 'bg-purple-950/20' : ''
                            }`}
                          >
                            <td className="p-3 text-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSelectOne(cust.tempId)}
                                className="rounded border-slate-700 text-purple-600 focus:ring-purple-500 cursor-pointer"
                              />
                            </td>

                            <td className="p-3 font-semibold text-white">
                              <div className="flex items-center gap-2">
                                <span>{cust.customerName}</span>
                              </div>
                            </td>

                            <td className="p-3 text-slate-300 max-w-xs truncate" title={cust.address}>
                              <div className="flex items-center gap-1.5">
                                <span className="truncate">{cust.address || <em className="text-slate-500">None</em>}</span>
                                {cust.city && (
                                  <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-400 shrink-0">
                                    {cust.city}
                                  </span>
                                )}
                              </div>
                            </td>

                            <td className="p-3 font-mono text-emerald-400">
                              {cust.whatsapp ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                                  <MessageCircle size={11} /> {cust.whatsapp}
                                </span>
                              ) : (
                                <span className="text-slate-600">—</span>
                              )}
                            </td>

                            <td className="p-3 font-mono text-blue-400">
                              {cust.phone2 ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20">
                                  <Phone size={11} /> {cust.phone2}
                                </span>
                              ) : (
                                <span className="text-slate-600">—</span>
                              )}
                            </td>

                            <td className="p-3">
                              {cust.status === 'VALID' && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                                  <Check size={12} /> Valid
                                </span>
                              )}
                              {cust.status === 'DUPLICATE' && (
                                <span
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium"
                                  title={cust.statusMessage}
                                >
                                  <AlertTriangle size={12} /> Duplicate ({cust.matchedExistingCode || 'Exists'})
                                </span>
                              )}
                              {cust.status === 'MISSING_PHONE' && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 font-medium">
                                  <Info size={12} /> Missing Phone
                                </span>
                              )}
                              {cust.status === 'MISSING_ADDRESS' && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 font-medium">
                                  <Info size={12} /> Missing Address
                                </span>
                              )}
                              {cust.status === 'INVALID' && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 font-medium">
                                  <AlertCircle size={12} /> Invalid
                                </span>
                              )}
                            </td>

                            <td className="p-3 text-right space-x-1">
                              <button
                                onClick={() => setEditingCustomer(cust)}
                                className="p-1 rounded text-slate-400 hover:text-purple-300 hover:bg-purple-900/30 transition"
                                title="Edit Customer"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                onClick={() => handleDeleteRecord(cust.tempId)}
                                className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 transition"
                                title="Remove Record"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Step 3 Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-[#2e265c]">
                <button
                  type="button"
                  onClick={() => setStep('UPLOAD')}
                  className="px-4 py-2 rounded-xl border border-slate-700 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition flex items-center gap-2"
                >
                  <ArrowLeft size={14} /> Choose Different PDF
                </button>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-xl border border-slate-700 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    disabled={selectedTempIds.size === 0 || isSubmittingImport}
                    onClick={handleExecuteImport}
                    className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:pointer-events-none text-white text-xs font-bold transition shadow-lg shadow-purple-900/40 flex items-center gap-2"
                  >
                    {isSubmittingImport ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        <span>Importing to Database...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={15} />
                        <span>Import {selectedTempIds.size} Customers</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ================= STEP 4: COMPLETED ================= */}
          {step === 'COMPLETED' && importResults && (
            <div className="max-w-lg mx-auto py-8 text-center space-y-6">
              <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-500 text-emerald-400 flex items-center justify-center mx-auto shadow-xl shadow-emerald-950/60">
                <CheckCircle2 size={40} />
              </div>

              <div>
                <h3 className="text-lg font-bold text-white">Customer Import Completed</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Customer records have been successfully saved into your ERP system database.
                </p>
              </div>

              {/* Results Breakdown */}
              <div className="grid grid-cols-2 gap-3 bg-[#0f172a] border border-[#2e265c] p-4 rounded-xl text-left text-xs">
                <div>
                  <p className="text-slate-400 text-[11px]">Total Processed</p>
                  <p className="text-sm font-bold text-white">{importResults.totalRequested}</p>
                </div>

                <div>
                  <p className="text-emerald-400 text-[11px] font-semibold">Successfully Imported</p>
                  <p className="text-sm font-bold text-emerald-300">{importResults.successfullyImported}</p>
                </div>

                <div>
                  <p className="text-amber-400 text-[11px] font-semibold">Duplicates Skipped</p>
                  <p className="text-sm font-bold text-amber-300">{importResults.duplicatesSkipped}</p>
                </div>

                <div>
                  <p className="text-rose-400 text-[11px] font-semibold">Failed / Invalid</p>
                  <p className="text-sm font-bold text-rose-300">{importResults.failed}</p>
                </div>
              </div>

              <div className="flex justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-8 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition shadow-lg shadow-purple-900/40"
                >
                  View Customers Directory
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ================= EDIT MODAL OVERLAY ================= */}
        {editingCustomer && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 p-4">
            <div className="w-full max-w-md bg-[#0f172a] border border-[#2e265c] rounded-2xl shadow-2xl p-5 space-y-4 text-xs">
              <div className="flex items-center justify-between border-b border-slate-700/80 pb-3">
                <h4 className="font-bold text-sm text-white">Edit Extracted Customer</h4>
                <button
                  onClick={() => setEditingCustomer(null)}
                  className="text-slate-400 hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-purple-200 font-semibold mb-1 text-[11px]">
                    Customer / Shop Name *
                  </label>
                  <input
                    type="text"
                    value={editingCustomer.customerName}
                    onChange={(e) =>
                      setEditingCustomer({ ...editingCustomer, customerName: e.target.value })
                    }
                    className="w-full bg-[#0a1024] border border-[#2e265c] rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  />
                </div>

                <div>
                  <label className="block text-purple-200 font-semibold mb-1 text-[11px]">
                    Address
                  </label>
                  <input
                    type="text"
                    value={editingCustomer.address}
                    onChange={(e) =>
                      setEditingCustomer({ ...editingCustomer, address: e.target.value })
                    }
                    className="w-full bg-[#0a1024] border border-[#2e265c] rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-emerald-300 font-semibold mb-1 text-[11px]">
                      WhatsApp (Mobile)
                    </label>
                    <input
                      type="text"
                      value={editingCustomer.whatsapp || ''}
                      onChange={(e) =>
                        setEditingCustomer({
                          ...editingCustomer,
                          whatsapp: e.target.value || null,
                        })
                      }
                      className="w-full bg-[#0a1024] border border-[#2e265c] rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                  </div>

                  <div>
                    <label className="block text-blue-300 font-semibold mb-1 text-[11px]">
                      Phone 2 (Landline)
                    </label>
                    <input
                      type="text"
                      value={editingCustomer.phone2 || ''}
                      onChange={(e) =>
                        setEditingCustomer({
                          ...editingCustomer,
                          phone2: e.target.value || null,
                        })
                      }
                      className="w-full bg-[#0a1024] border border-[#2e265c] rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingCustomer(null)}
                  className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveEdit(editingCustomer)}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerPdfImportModal;
