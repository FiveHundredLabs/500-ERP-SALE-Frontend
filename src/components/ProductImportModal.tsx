import React, { useState, useRef, useEffect, useCallback } from "react";
import * as XLSX from "xlsx";
import {
  X,
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Search,
  Check,
  RotateCcw,
  Info,
  Loader2,
  SlidersHorizontal,
} from "lucide-react";
import type { CreateInventoryItemData, ExcelProductRow, BulkImportResponse } from "../types/inventory";
import { inventoryService } from "../services/InventoryService";

interface ProductImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ProductImportModal: React.FC<ProductImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Raw sheet data for dynamic column mapping
  const [rawData, setRawData] = useState<Record<string, any>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [existingDbCodes, setExistingDbCodes] = useState<Set<string>>(new Set());

  // Column mappings
  const [codeCol, setCodeCol] = useState<string>("");
  const [descCol, setDescCol] = useState<string>("");
  const [costCol, setCostCol] = useState<string>("");
  const [rateCol, setRateCol] = useState<string>("");

  const [previewRows, setPreviewRows] = useState<ExcelProductRow[]>([]);
  const [filterStatus, setFilterStatus] = useState<"all" | "valid" | "errors">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 20;

  // Import summary state
  const [importSummary, setImportSummary] = useState<BulkImportResponse | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [importProgress, setImportProgress] = useState<{ processed: number; total: number } | null>(null);

  // Helper to safely parse numeric price/cost strings
  const parseNumericValue = (val: any): { num: number; isValid: boolean; rawDisplay: string } => {
    if (val === null || val === undefined || String(val).trim() === "") {
      return { num: 0, isValid: false, rawDisplay: "empty" };
    }
    if (typeof val === "number") {
      return { num: val, isValid: !isNaN(val) && val >= 0, rawDisplay: String(val) };
    }
    const str = String(val).trim();
    // Strip common currency prefixes and commas e.g. "LKR 1,500.00", "Rs. 250", "$ 100", "1,850.50"
    const cleaned = str.replace(/,/g, "").replace(/LKR|\$|Rs\.?|INR/gi, "").trim();
    const num = Number(cleaned);
    const isValid = !isNaN(num) && cleaned !== "" && num >= 0;
    return { num: isValid ? num : 0, isValid, rawDisplay: str };
  };

  // Recompute rows whenever column mappings change or raw data changes
  const evaluateRows = useCallback(
    (
      data: Record<string, any>[],
      cCol: string,
      dCol: string,
      coCol: string,
      rCol: string,
      dbCodes: Set<string>
    ) => {
      if (!data || data.length === 0) {
        setPreviewRows([]);
        return;
      }

      const seenCodesInFile = new Map<string, number>(); // normCode -> firstRowNumber
      const parsed: ExcelProductRow[] = [];

      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        const rowNumber = i + 2; // Row 1 is header in Excel

        const rawCode = String(row[cCol] ?? "").trim();
        const rawName = String(row[dCol] ?? "").trim();
        const costRes = parseNumericValue(row[coCol]);
        const rateRes = parseNumericValue(row[rCol]);

        const normCode = rawCode.toUpperCase();
        let isValid = true;
        let errorMsg = "";
        let isDupInFile = false;
        let isDupInDb = false;

        // Validation 1: Required Code
        if (!rawCode) {
          isValid = false;
          errorMsg = "Product Code is required";
        }
        // Validation 2: Required Name
        else if (!rawName) {
          isValid = false;
          errorMsg = "Product Description / Name is required";
        }
        // Validation 3: Cost Price valid number
        else if (!costRes.isValid) {
          isValid = false;
          errorMsg = `Invalid Cost Price "${costRes.rawDisplay}". Must be a valid number`;
        }
        // Validation 4: Selling Rate valid number
        else if (!rateRes.isValid) {
          isValid = false;
          errorMsg = `Invalid Selling Rate "${rateRes.rawDisplay}". Must be a valid number`;
        }
        // Validation 5: Duplicate in Excel file
        else if (seenCodesInFile.has(normCode)) {
          isValid = false;
          isDupInFile = true;
          const firstRow = seenCodesInFile.get(normCode);
          errorMsg = `Duplicate Code in file (matches Row #${firstRow})`;
        }
        // Validation 6: Duplicate against Database
        else if (dbCodes.has(normCode)) {
          isValid = false;
          isDupInDb = true;
          errorMsg = `Product Code "${rawCode}" already exists in the database`;
        }

        if (rawCode && !seenCodesInFile.has(normCode)) {
          seenCodesInFile.set(normCode, rowNumber);
        }

        parsed.push({
          rowNumber,
          productCode: rawCode,
          productName: rawName,
          purchasePrice: costRes.num,
          sellPrice: rateRes.num,
          isValid,
          error: errorMsg,
          isDuplicateInFile: isDupInFile,
          isDuplicateInDb: isDupInDb,
        });
      }

      setPreviewRows(parsed);
    },
    []
  );

  // Update evaluation when dropdown columns change
  useEffect(() => {
    if (rawData.length > 0 && codeCol && descCol && costCol && rateCol) {
      evaluateRows(rawData, codeCol, descCol, costCol, rateCol, existingDbCodes);
    }
  }, [rawData, codeCol, descCol, costCol, rateCol, existingDbCodes, evaluateRows]);

  if (!isOpen) return null;

  const handleReset = () => {
    setFile(null);
    setRawData([]);
    setHeaders([]);
    setCodeCol("");
    setDescCol("");
    setCostCol("");
    setRateCol("");
    setPreviewRows([]);
    setFilterStatus("all");
    setSearchQuery("");
    setCurrentPage(1);
    setShowSummary(false);
    setImportSummary(null);
    setImportProgress(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const parseExcel = async (selectedFile: File) => {
    setIsParsing(true);
    setFile(selectedFile);
    setImportProgress(null);
    try {
      // 1. Fetch current DB products to check DB duplicates
      const existingDbItems = await inventoryService.getAll().catch(() => []);
      const dbCodes = new Set(
        existingDbItems
          .map((item) => item.productCode?.trim().toUpperCase())
          .filter(Boolean) as string[]
      );
      setExistingDbCodes(dbCodes);

      // 2. Read file as ArrayBuffer
      const data = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      // Convert sheet to json with raw row objects
      const rows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, {
        defval: "",
        raw: false,
      });

      if (!rows || rows.length === 0) {
        throw new Error("The selected Excel file contains no data rows.");
      }

      const fileHeaders = Object.keys(rows[0]);
      setHeaders(fileHeaders);
      setRawData(rows);

      // 3. Intelligent Header Detection
      const cleanStr = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9]/g, "");

      // Match Rate first
      let matchedRate = fileHeaders.find((h) => {
        const c = cleanStr(h);
        return [
          "rate", "ratelkr", "rates", "sellprice", "sellpricelkr", "sellingprice",
          "sellingpricelkr", "price", "pricelkr", "unitprice", "unitpricelkr", "salesrate"
        ].includes(c);
      });
      if (!matchedRate) {
        matchedRate = fileHeaders.find((h) => {
          const l = h.toLowerCase();
          return l.includes("rate") || (l.includes("sell") && l.includes("price")) || (l.includes("unit") && l.includes("price"));
        });
      }

      const rateIndex = matchedRate ? fileHeaders.indexOf(matchedRate) : -1;

      // Match Cost
      // Check specifically if the column right before Rate is Cost / Cost (LKR)
      let matchedCost: string | undefined;
      if (rateIndex > 0) {
        const prevCol = fileHeaders[rateIndex - 1];
        if (
          prevCol.toLowerCase().includes("cost") ||
          prevCol.toLowerCase().includes("purchase") ||
          prevCol.toLowerCase().includes("lkr")
        ) {
          matchedCost = prevCol;
        }
      }

      if (!matchedCost) {
        // Look for Cost (LKR), Cost, Purchase Price, etc.
        matchedCost = fileHeaders.find((h) => {
          const c = cleanStr(h);
          return [
            "costlkr", "cost(lkr)", "cost", "costprice", "costpricelkr", "purchaseprice",
            "purchasepricelkr", "buyprice", "buypricelkr", "unitcost", "unitcostlkr",
            "purchase_price", "cost_price", "purchasecost", "costrate"
          ].includes(c);
        });
      }

      if (!matchedCost) {
        matchedCost = fileHeaders.find((h) => {
          const l = h.toLowerCase();
          const isNotTypeOrCategory =
            !l.includes("type") && !l.includes("category") && !l.includes("center") && !l.includes("account");
          return l.includes("cost") && isNotTypeOrCategory;
        });
      }

      // Match Code
      let matchedCode = fileHeaders.find((h) => {
        const c = cleanStr(h);
        return ["code", "itemcode", "productcode", "sku", "itemno", "itemnumber", "prodcode", "product_code", "item_code"].includes(c);
      });
      if (!matchedCode) {
        matchedCode = fileHeaders.find((h) => h.toLowerCase().includes("code") || h.toLowerCase().includes("sku"));
      }

      // Match Description / Product Name
      let matchedDesc = fileHeaders.find((h) => {
        const c = cleanStr(h);
        return [
          "description", "desc", "productname", "itemname", "name", "itemdescription",
          "productdescription", "itemdesc", "proddesc", "details", "title", "product_name", "item_name"
        ].includes(c);
      });
      if (!matchedDesc) {
        matchedDesc = fileHeaders.find((h) => {
          const l = h.toLowerCase();
          return l.includes("desc") || (l.includes("product") && l.includes("name")) || (l.includes("item") && l.includes("name")) || l === "name";
        });
      }

      // Final fallback defaults
      const finalCode = matchedCode || fileHeaders[0] || "";
      const finalDesc = matchedDesc || (fileHeaders[1] !== finalCode ? fileHeaders[1] : fileHeaders[0]) || "";
      const finalRate = matchedRate || (fileHeaders.length > 3 ? fileHeaders[3] : fileHeaders[fileHeaders.length - 1]) || "";
      const finalCost =
        matchedCost ||
        (rateIndex > 0 ? fileHeaders[rateIndex - 1] : fileHeaders.length > 2 ? fileHeaders[2] : fileHeaders[0]) ||
        "";

      setCodeCol(finalCode);
      setDescCol(finalDesc);
      setCostCol(finalCost);
      setRateCol(finalRate);

      // Evaluate rows immediately
      evaluateRows(rows, finalCode, finalDesc, finalCost, finalRate, dbCodes);
      setCurrentPage(1);
    } catch (err: any) {
      alert(`Failed to parse Excel file: ${err.message}`);
      handleReset();
    } finally {
      setIsParsing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      parseExcel(files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (
        droppedFile.name.endsWith(".xlsx") ||
        droppedFile.name.endsWith(".xls")
      ) {
        parseExcel(droppedFile);
      } else {
        alert("Please upload a valid Excel file (.xlsx or .xls)");
      }
    }
  };

  // Metrics
  const totalCount = previewRows.length;
  const validCount = previewRows.filter((r) => r.isValid).length;
  const fileDupCount = previewRows.filter((r) => r.isDuplicateInFile).length;
  const dbDupCount = previewRows.filter((r) => r.isDuplicateInDb).length;
  const errorCount = previewRows.filter((r) => !r.isValid && !r.isDuplicateInFile && !r.isDuplicateInDb).length;

  // Filtered rows for preview table
  const filteredRows = previewRows.filter((row) => {
    if (filterStatus === "valid" && !row.isValid) return false;
    if (filterStatus === "errors" && row.isValid) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return (
        row.productCode.toLowerCase().includes(q) ||
        row.productName.toLowerCase().includes(q) ||
        (row.error && row.error.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / rowsPerPage));
  const paginatedRows = filteredRows.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  const handleConfirmImport = async () => {
    const validRows = previewRows.filter((r) => r.isValid);
    if (validRows.length === 0) {
      alert("No valid products to import.");
      return;
    }

    setIsImporting(true);
    setImportProgress({ processed: 0, total: validRows.length });
    try {
      const payload: CreateInventoryItemData[] = validRows.map((r) => ({
        productCode: r.productCode.trim(),
        productName: r.productName.trim(),
        inventoryCode: r.productCode.trim(),
        purchasePrice: Number(r.purchasePrice),
        sellPrice: Number(r.sellPrice),
        quantity: 0,
        soldCount: 0,
        status: "in_stock",
      }));

      const res = await inventoryService.createBulk(payload, (processed, total) => {
        setImportProgress({ processed, total });
      });

      setImportSummary({
        total: totalCount,
        created: res.created,
        failed: totalCount - res.created,
        duplicates: fileDupCount + dbDupCount,
        errors: res.errors || [],
      });
      setShowSummary(true);
      onSuccess();
    } catch (err: any) {
      alert(`Import failed: ${err.message}`);
    } finally {
      setIsImporting(false);
      setImportProgress(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center z-50 p-4 sm:p-6 animate-fadeIn">
      <div className="bg-[#1e293b] border border-[#334155] rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#334155] bg-[#0f172a]/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <FileSpreadsheet size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide">
                Excel Product Import
              </h2>
              <p className="text-xs text-gray-400">
                Upload your product spreadsheet (.xlsx / .xls) to bulk import products
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isImporting || isParsing}
            className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-[#334155] transition-colors disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 flex-1 overflow-y-auto space-y-5">
          {/* Summary View (After import) */}
          {showSummary && importSummary ? (
            <div className="space-y-6 py-4 animate-fadeIn">
              <div className="text-center space-y-2">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 size={36} />
                </div>
                <h3 className="text-xl font-bold text-white">Import Completed Successfully</h3>
                <p className="text-xs text-gray-400 max-w-md mx-auto">
                  Your products have been processed and added to the database.
                </p>
              </div>

              {/* Summary Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl mx-auto">
                <div className="bg-[#0f172a] border border-[#334155] p-4 rounded-xl text-center">
                  <p className="text-xs text-gray-400 mb-1">Total Rows</p>
                  <p className="text-xl font-bold font-mono text-white">{importSummary.total}</p>
                </div>
                <div className="bg-[#0f172a] border border-emerald-500/30 p-4 rounded-xl text-center">
                  <p className="text-xs text-emerald-400 font-medium mb-1">Created Products</p>
                  <p className="text-xl font-bold font-mono text-emerald-400">{importSummary.created}</p>
                </div>
                <div className="bg-[#0f172a] border border-amber-500/30 p-4 rounded-xl text-center">
                  <p className="text-xs text-amber-400 font-medium mb-1">Duplicates Skipped</p>
                  <p className="text-xl font-bold font-mono text-amber-400">{importSummary.duplicates}</p>
                </div>
                <div className="bg-[#0f172a] border border-rose-500/30 p-4 rounded-xl text-center">
                  <p className="text-xs text-rose-400 font-medium mb-1">Failed / Invalid</p>
                  <p className="text-xl font-bold font-mono text-rose-400">{importSummary.failed}</p>
                </div>
              </div>

              <div className="flex justify-center gap-3 pt-4">
                <button
                  onClick={handleReset}
                  className="px-5 py-2.5 bg-[#334155] hover:bg-[#475569] text-gray-200 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors"
                >
                  <RotateCcw size={14} /> Import Another File
                </button>
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors shadow-lg shadow-blue-600/20"
                >
                  <Check size={14} /> Done
                </button>
              </div>
            </div>
          ) : previewRows.length === 0 ? (
            /* Upload Zone View */
            <div className="space-y-4">
              {/* Drag & Drop Box */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`
                  border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-200
                  flex flex-col items-center justify-center gap-3 min-h-[260px]
                  ${
                    dragOver
                      ? "border-blue-400 bg-blue-500/10 scale-[0.99]"
                      : "border-[#334155] bg-[#0f172a]/60 hover:border-blue-500/50 hover:bg-[#0f172a]"
                  }
                `}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".xlsx, .xls"
                  className="hidden"
                />

                <div className="w-16 h-16 rounded-2xl bg-blue-600/10 border border-blue-500/30 text-blue-400 flex items-center justify-center shadow-inner">
                  {isParsing ? (
                    <Loader2 size={30} className="animate-spin text-blue-400" />
                  ) : (
                    <UploadCloud size={32} />
                  )}
                </div>

                <div>
                  <p className="text-sm font-semibold text-white">
                    {isParsing ? "Reading & Validating Excel..." : "Click or drag Excel file here"}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Supports <span className="text-blue-400 font-mono">.xlsx</span> and{" "}
                    <span className="text-blue-400 font-mono">.xls</span> spreadsheets
                  </p>
                </div>

                <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-[11px] text-gray-300">
                  <Info size={13} className="text-blue-400" />
                  Mapped fields: <b>Code</b>, <b>Description</b>, <b>Cost (LKR)</b>, <b>Rate</b>
                </div>
              </div>

              {/* Requirements Banner */}
              <div className="bg-[#0f172a]/80 border border-[#334155] rounded-xl p-4 space-y-2">
                <p className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                  <HelpCircle size={14} className="text-blue-400" /> Excel Column Format Guidelines:
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-gray-400">
                  <div className="bg-[#1e293b] p-2 rounded-lg border border-[#334155]">
                    <span className="text-blue-300 font-mono font-bold block">Code</span>
                    <span>Product SKU / Code</span>
                  </div>
                  <div className="bg-[#1e293b] p-2 rounded-lg border border-[#334155]">
                    <span className="text-blue-300 font-mono font-bold block">Description</span>
                    <span>Product Name</span>
                  </div>
                  <div className="bg-[#1e293b] p-2 rounded-lg border border-[#334155]">
                    <span className="text-blue-300 font-mono font-bold block">Cost (LKR)</span>
                    <span>Purchase Cost Price</span>
                  </div>
                  <div className="bg-[#1e293b] p-2 rounded-lg border border-[#334155]">
                    <span className="text-blue-300 font-mono font-bold block">Rate</span>
                    <span>Selling Price</span>
                  </div>
                </div>
                <p className="text-[11px] text-gray-500">
                  * All other columns in the file will be safely ignored. No stock quantity is required.
                </p>
              </div>
            </div>
          ) : (
            /* Preview Table & Validation View */
            <div className="space-y-4 animate-fadeIn">
              {/* Summary Stats Row */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                <div className="bg-[#0f172a] border border-[#334155] p-3 rounded-xl">
                  <span className="text-[11px] text-gray-400 block font-medium">Total Rows</span>
                  <span className="text-lg font-bold font-mono text-white">{totalCount}</span>
                </div>
                <div className="bg-[#0f172a] border border-emerald-500/30 p-3 rounded-xl">
                  <span className="text-[11px] text-emerald-400 block font-medium">Ready to Import</span>
                  <span className="text-lg font-bold font-mono text-emerald-400">{validCount}</span>
                </div>
                <div className="bg-[#0f172a] border border-amber-500/30 p-3 rounded-xl">
                  <span className="text-[11px] text-amber-400 block font-medium">File Duplicates</span>
                  <span className="text-lg font-bold font-mono text-amber-400">{fileDupCount}</span>
                </div>
                <div className="bg-[#0f172a] border border-orange-500/30 p-3 rounded-xl">
                  <span className="text-[11px] text-orange-400 block font-medium">Existing in DB</span>
                  <span className="text-lg font-bold font-mono text-orange-400">{dbDupCount}</span>
                </div>
                <div className="bg-[#0f172a] border border-rose-500/30 p-3 rounded-xl">
                  <span className="text-[11px] text-rose-400 block font-medium">Invalid Rows</span>
                  <span className="text-lg font-bold font-mono text-rose-400">{errorCount}</span>
                </div>
              </div>

              {/* Batch Processing Progress Bar */}
              {isImporting && importProgress && (
                <div className="bg-[#0f172a] border border-blue-500/40 rounded-xl p-4 space-y-2 animate-pulse shadow-lg">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-blue-400 font-bold flex items-center gap-2">
                      <Loader2 size={14} className="animate-spin text-blue-400" />
                      Importing Batch-wise into Database...
                    </span>
                    <span className="text-gray-200 font-mono font-semibold">
                      {importProgress.processed} / {importProgress.total} products (
                      {Math.round((importProgress.processed / importProgress.total) * 100)}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500 h-2.5 rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.max(5, (importProgress.processed / importProgress.total) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Column Mapping Selector Bar */}
              {headers.length > 0 && (
                <div className="bg-[#0f172a] border border-blue-500/30 rounded-xl p-3.5 space-y-2 shadow-inner">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-blue-400 flex items-center gap-1.5">
                      <SlidersHorizontal size={14} /> Mapped Excel Columns
                    </span>
                    <span className="text-[11px] text-gray-400">
                      Auto-detected from file header. You can adjust if needed:
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                    {/* Code Column Selector */}
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-300 mb-1">
                        1. Product Code
                      </label>
                      <select
                        value={codeCol}
                        onChange={(e) => setCodeCol(e.target.value)}
                        className="w-full bg-[#1e293b] border border-[#334155] rounded-lg px-2.5 py-1.5 text-xs text-blue-300 font-mono focus:outline-none focus:border-blue-500"
                      >
                        {headers.map((h) => (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Description Column Selector */}
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-300 mb-1">
                        2. Description / Name
                      </label>
                      <select
                        value={descCol}
                        onChange={(e) => setDescCol(e.target.value)}
                        className="w-full bg-[#1e293b] border border-[#334155] rounded-lg px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-blue-500"
                      >
                        {headers.map((h) => (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Cost Column Selector */}
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-300 mb-1">
                        3. Cost Price (LKR)
                      </label>
                      <select
                        value={costCol}
                        onChange={(e) => setCostCol(e.target.value)}
                        className="w-full bg-[#1e293b] border border-[#334155] rounded-lg px-2.5 py-1.5 text-xs text-amber-300 font-mono focus:outline-none focus:border-blue-500"
                      >
                        {headers.map((h) => (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Rate Column Selector */}
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-300 mb-1">
                        4. Selling Rate (LKR)
                      </label>
                      <select
                        value={rateCol}
                        onChange={(e) => setRateCol(e.target.value)}
                        className="w-full bg-[#1e293b] border border-[#334155] rounded-lg px-2.5 py-1.5 text-xs text-emerald-300 font-mono focus:outline-none focus:border-blue-500"
                      >
                        {headers.map((h) => (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Filters & Search Toolbar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#0f172a]/60 p-3 rounded-xl border border-[#334155]">
                {/* Search */}
                <div className="relative w-full sm:w-72">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Search code, name, error..."
                    className="w-full bg-[#1e293b] border border-[#334155] rounded-lg pl-9 pr-3 py-1.5 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Status Tabs */}
                <div className="flex items-center gap-1.5 w-full sm:w-auto">
                  <button
                    onClick={() => {
                      setFilterStatus("all");
                      setCurrentPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      filterStatus === "all"
                        ? "bg-blue-600 text-white"
                        : "bg-[#1e293b] text-gray-400 hover:text-white border border-[#334155]"
                    }`}
                  >
                    All ({totalCount})
                  </button>
                  <button
                    onClick={() => {
                      setFilterStatus("valid");
                      setCurrentPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      filterStatus === "valid"
                        ? "bg-emerald-600 text-white"
                        : "bg-[#1e293b] text-gray-400 hover:text-white border border-[#334155]"
                    }`}
                  >
                    Valid Only ({validCount})
                  </button>
                  <button
                    onClick={() => {
                      setFilterStatus("errors");
                      setCurrentPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      filterStatus === "errors"
                        ? "bg-rose-600 text-white"
                        : "bg-[#1e293b] text-gray-400 hover:text-white border border-[#334155]"
                    }`}
                  >
                    Errors & Duplicates ({totalCount - validCount})
                  </button>
                </div>
              </div>

              {/* Preview Table */}
              <div className="border border-[#334155] rounded-xl overflow-hidden bg-[#0f172a]">
                <div className="overflow-x-auto max-h-[380px]">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#1e293b] border-b border-[#334155] sticky top-0 z-10 text-gray-400 font-semibold uppercase tracking-wider">
                      <tr>
                        <th className="py-2.5 px-3 w-14">Row</th>
                        <th className="py-2.5 px-3">Product Code</th>
                        <th className="py-2.5 px-3">Product Name</th>
                        <th className="py-2.5 px-3">Cost (LKR)</th>
                        <th className="py-2.5 px-3">Selling Price (LKR)</th>
                        <th className="py-2.5 px-3">Status / Message</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#334155]/60 text-gray-300">
                      {paginatedRows.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center py-8 text-gray-500">
                            No records match the current filter/search.
                          </td>
                        </tr>
                      ) : (
                        paginatedRows.map((r) => (
                          <tr
                            key={r.rowNumber}
                            className={`hover:bg-[#1e293b]/50 transition-colors ${
                              !r.isValid ? "bg-red-500/5" : ""
                            }`}
                          >
                            <td className="py-2.5 px-3 font-mono text-gray-500 font-semibold">
                              #{r.rowNumber}
                            </td>
                            <td className="py-2.5 px-3 font-mono font-bold text-blue-400">
                              {r.productCode || <span className="text-red-400 italic">Missing</span>}
                            </td>
                            <td className="py-2.5 px-3 font-medium text-gray-200">
                              {r.productName || <span className="text-red-400 italic">Missing</span>}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-amber-300">
                              LKR {Number(r.purchasePrice || 0).toLocaleString()}
                            </td>
                            <td className="py-2.5 px-3 font-mono font-semibold text-emerald-400">
                              LKR {Number(r.sellPrice || 0).toLocaleString()}
                            </td>
                            <td className="py-2.5 px-3">
                              {r.isValid ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[11px] font-medium">
                                  <CheckCircle2 size={12} /> Valid
                                </span>
                              ) : r.isDuplicateInFile ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-medium" title={r.error}>
                                  <AlertTriangle size={12} /> File Duplicate
                                </span>
                              ) : r.isDuplicateInDb ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-orange-500/20 text-orange-300 border border-orange-500/30 text-[11px] font-medium" title={r.error}>
                                  <AlertTriangle size={12} /> Already In DB
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[11px] font-medium" title={r.error}>
                                  <XCircle size={12} /> {r.error}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-2.5 border-t border-[#334155] bg-[#1e293b] text-xs text-gray-400">
                    <div>
                      Showing {(currentPage - 1) * rowsPerPage + 1} to{" "}
                      {Math.min(currentPage * rowsPerPage, filteredRows.length)} of{" "}
                      {filteredRows.length} entries
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-2.5 py-1 rounded bg-[#0f172a] border border-[#334155] text-gray-300 hover:text-white disabled:opacity-40"
                      >
                        Prev
                      </button>
                      <span className="font-mono text-white">
                        {currentPage} / {totalPages}
                      </span>
                      <button
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="px-2.5 py-1 rounded bg-[#0f172a] border border-[#334155] text-gray-300 hover:text-white disabled:opacity-40"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#334155] bg-[#0f172a]/80">
          <div>
            {file && !showSummary && (
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <FileSpreadsheet size={15} className="text-blue-400" />
                <span className="font-medium text-gray-200">{file.name}</span>
                <span className="text-gray-500">
                  ({(file.size / 1024).toFixed(1)} KB)
                </span>
                <button
                  onClick={handleReset}
                  disabled={isImporting}
                  className="ml-2 text-blue-400 hover:text-blue-300 underline text-[11px]"
                >
                  Change File
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            {!showSummary && (
              <button
                type="button"
                onClick={onClose}
                disabled={isImporting}
                className="px-4 py-2 border border-[#334155] bg-[#1e293b] hover:bg-[#334155] text-gray-300 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            )}

            {!showSummary && previewRows.length > 0 && (
              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={isImporting || validCount === 0}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors shadow-lg shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isImporting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    {importProgress
                      ? `Importing ${importProgress.processed} / ${importProgress.total} (${Math.round(
                          (importProgress.processed / importProgress.total) * 100
                        )}%)...`
                      : `Importing ${validCount} Products...`}
                  </>
                ) : (
                  <>
                    <Check size={14} /> Confirm & Import {validCount} Products
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductImportModal;
