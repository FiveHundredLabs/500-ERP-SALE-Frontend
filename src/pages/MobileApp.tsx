import React from "react";
import AppLayout from "../components/AppLayout";
import {
  Smartphone,
  Clock,
  QrCode,
  Download,
  WifiOff,
  Printer,
  MapPin,
  Sparkles,
  Zap,
  Layers,
  Cpu,
  CheckCircle2,
} from "lucide-react";
import { useToast } from "../components/erp/Toast";

interface MilestoneItem {
  title: string;
  status: "pending" | "upcoming";
  details: string;
  icon: React.ElementType;
}

const MILESTONES: MilestoneItem[] = [
  {
    title: "1. Core Offline SQLite Database & Sync Engine",
    status: "pending",
    details: "Full bi-directional synchronization with master ERP database when internet connectivity is re-established.",
    icon: WifiOff,
  },
  {
    title: "2. Sales Officer Van Inventory & Order Taker UI",
    status: "pending",
    details: "Intuitive touch interface for rapid order generation, customer catalogue lookup, and price discount policies.",
    icon: Zap,
  },
  {
    title: "3. Bluetooth ESC/POS Thermal Receipt Printing",
    status: "upcoming",
    details: "Direct Bluetooth 5.0 wireless printing of 58mm and 80mm tax invoices, delivery notes, and payment receipts.",
    icon: Printer,
  },
  {
    title: "4. GPS Route Visit Tracking & Geofencing",
    status: "upcoming",
    details: "Real-time breadcrumb tracking for sales officers, scheduled route visit validation, and customer geo-tagging.",
    icon: MapPin,
  },
  {
    title: "5. Production Deployment (Android APK Release)",
    status: "upcoming",
    details: "Internal release for warehouse delivery drivers, field salesmen, and store managers (Android OS).",
    icon: Smartphone,
  },
];

const FEATURES = [
  {
    title: "Van Sales & Field Invoicing",
    desc: "Generate and print immediate tax invoices from your mobile phone inside customer stores without laptop or internet.",
    badge: "Field Sales",
  },
  {
    title: "Barcode / QR Stock Scanner",
    desc: "Instant camera-based barcode scanning for rapid stock audits, dispatch verification, and physical stock-takes.",
    badge: "Warehouse",
  },
  {
    title: "Live GPS & Customer Geo-Tagging",
    desc: "Verify on-site merchant visits with GPS location validation and automatic route distance logging.",
    badge: "Operations",
  },
  {
    title: "Instant Credit & Payment Collection",
    desc: "Record cash collections, cheque images, bank slip uploads, and update customer ledgers on the spot.",
    badge: "Finance",
  },
];

const MobileApp: React.FC = () => {
  const { info } = useToast();

  return (
    <AppLayout
      headerIcon={<Smartphone size={19} />}
      headerTitle="500Core Mobile App"
      headerSubtitle="Enterprise Android mobility client for Van Sales & Warehousing"
      showBell
    >
      <div className="max-w-6xl mx-auto space-y-7 animate-fadeIn pb-12">
        {/* ================= HERO UNDER DEVELOPMENT BANNER ================= */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1e293b] via-[#0f172a] to-blue-950/40 border border-[#334155] shadow-2xl p-6 sm:p-8">
          {/* Subtle glowing orb backgrounds */}
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 -mb-8 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Col: Info */}
            <div className="lg:col-span-7 space-y-5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold">
                <Clock size={13} className="animate-pulse" />
                <span>UNDER DEVELOPMENT • ANDROID OS EXCLUSIVE</span>
              </div>

              <div className="space-y-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
                  500Core Field Mobility <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-teal-300">
                    Android App for Mobile Sales
                  </span>
                </h1>
                <p className="text-sm text-slate-300 leading-relaxed max-w-xl">
                  We are developing a dedicated Android application optimized for Sales Officers, Van Delivery Drivers, and Warehouse Handheld Terminals. Direct thermal invoice printing, real-time vehicle stock management, and full offline-first synchronization.
                </p>
              </div>

              {/* Progress Summary Cards */}
              <div className="grid grid-cols-3 gap-3 pt-1">
                <div className="bg-[#0f172a]/80 border border-[#334155] rounded-xl p-3">
                  <div className="text-xs text-slate-400 font-medium">Sprint Stage</div>
                  <div className="text-base font-bold text-amber-400 mt-0.5">Alpha Development</div>
                </div>
                <div className="bg-[#0f172a]/80 border border-[#334155] rounded-xl p-3">
                  <div className="text-xs text-slate-400 font-medium">Platform</div>
                  <div className="text-base font-bold text-emerald-400 mt-0.5">Android Only</div>
                </div>
                <div className="bg-[#0f172a]/80 border border-[#334155] rounded-xl p-3">
                  <div className="text-xs text-slate-400 font-medium">Release Format</div>
                  <div className="text-base font-bold text-blue-400 mt-0.5">Standalone APK</div>
                </div>
              </div>
            </div>

            {/* Right Col: Interactive Phone Mockup Card */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="w-[280px] bg-[#020617] border-4 border-slate-700/80 rounded-[36px] shadow-2xl p-3.5 relative overflow-hidden ring-1 ring-slate-600/50">
                {/* Speaker Notch */}
                <div className="w-24 h-4 bg-slate-800 rounded-full mx-auto mb-3 flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full bg-slate-900 border border-slate-700 mr-1.5" />
                  <div className="w-8 h-1.5 rounded-full bg-slate-900" />
                </div>

                {/* Mockup Screen Content */}
                <div className="bg-[#0f172a] rounded-[24px] p-3.5 space-y-3 text-slate-200 border border-slate-800/80 text-xs">
                  {/* Top app status */}
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                      <span className="font-bold text-[0.7rem] text-white">500Core Android Van</span>
                    </div>
                    <span className="text-[0.65rem] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono">
                      Offline Mode
                    </span>
                  </div>

                  {/* Route card */}
                  <div className="bg-[#1e293b] rounded-xl p-2.5 space-y-1.5 border border-slate-700/50">
                    <div className="flex justify-between items-center text-[0.68rem] text-slate-400">
                      <span>Today's Route</span>
                      <span className="text-emerald-400 font-bold">14/18 Visited</span>
                    </div>
                    <div className="text-[0.8rem] font-bold text-white">Colombo North & Pettah</div>
                    <div className="w-full bg-[#0f172a] rounded-full h-1.5 overflow-hidden">
                      <div className="bg-emerald-500 h-full w-3/4 rounded-full" />
                    </div>
                  </div>

                  {/* Quick Action buttons */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-blue-600/20 border border-blue-500/30 rounded-lg p-2 text-center">
                      <Zap size={14} className="text-blue-400 mx-auto mb-1" />
                      <span className="text-[0.65rem] font-semibold text-blue-200">New Invoice</span>
                    </div>
                    <div className="bg-purple-600/20 border border-purple-500/30 rounded-lg p-2 text-center">
                      <Printer size={14} className="text-purple-400 mx-auto mb-1" />
                      <span className="text-[0.65rem] font-semibold text-purple-200">Print Receipt</span>
                    </div>
                  </div>

                  {/* Recent Activity */}
                  <div className="space-y-1.5 pt-1">
                    <div className="text-[0.68rem] font-bold text-slate-400 uppercase tracking-wider">
                      Recent Orders
                    </div>
                    <div className="bg-[#1e293b]/60 rounded-lg p-2 flex justify-between items-center text-[0.7rem]">
                      <div>
                        <div className="font-semibold text-white truncate max-w-[110px]">Apex Motors</div>
                        <div className="text-[0.62rem] text-slate-400">INV-2026-0891</div>
                      </div>
                      <span className="font-bold text-emerald-400">Rs. 42,500</span>
                    </div>
                    <div className="bg-[#1e293b]/60 rounded-lg p-2 flex justify-between items-center text-[0.7rem]">
                      <div>
                        <div className="font-semibold text-white truncate max-w-[110px]">Metro Fleet</div>
                        <div className="text-[0.62rem] text-slate-400">INV-2026-0892</div>
                      </div>
                      <span className="font-bold text-emerald-400">Rs. 18,200</span>
                    </div>
                  </div>
                </div>

                {/* Home Indicator */}
                <div className="w-20 h-1 bg-slate-700 rounded-full mx-auto mt-3" />
              </div>
            </div>
          </div>
        </div>

        {/* ================= DEVELOPMENT ROADMAP & MILESTONES ================= */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Milestone Timeline List (2 Cols) */}
          <div className="lg:col-span-2 bg-[#1e293b] border border-[#334155] rounded-xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-[#334155] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-blue-500/15 text-blue-400">
                  <Layers size={17} />
                </div>
                <h2 className="text-sm font-bold text-white">Android Mobile Development Milestones</h2>
              </div>
              <span className="text-xs text-slate-400">v1.0.0-alpha</span>
            </div>

            <div className="space-y-4">
              {MILESTONES.map((item, idx) => {
                const isPending = item.status === "pending";

                return (
                  <div
                    key={idx}
                    className={`p-4 rounded-xl border transition-all ${
                      isPending
                        ? "bg-[#0f172a] border-amber-500/40 shadow-sm"
                        : "bg-[#0f172a]/40 border-[#334155]/60 opacity-80"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div
                          className={`p-2 rounded-lg flex-shrink-0 mt-0.5 ${
                            isPending
                              ? "bg-amber-500/20 text-amber-400"
                              : "bg-slate-700/30 text-slate-500"
                          }`}
                        >
                          <item.icon size={16} />
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-xs font-bold text-white">{item.title}</h4>
                          <p className="text-xs text-slate-400 leading-relaxed">{item.details}</p>
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0">
                        {isPending ? (
                          <span className="inline-flex items-center gap-1.5 text-[0.72rem] font-bold text-amber-400 bg-amber-500/15 px-2.5 py-1 rounded-full border border-amber-500/30">
                            <Clock size={12} className="animate-spin" />
                            <span>Pending</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-[0.72rem] font-medium text-slate-400 bg-slate-800/80 px-2.5 py-1 rounded-full border border-slate-700/50">
                            Upcoming
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* QR Code & Internal Testing Card (1 Col) */}
          <div className="space-y-6">
            <div className="bg-[#1e293b] border border-[#334155] rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-2">
                <QrCode size={18} className="text-blue-400" />
                <h3 className="text-sm font-bold text-white">Dev Channel QR Code</h3>
              </div>

              <div className="bg-[#0f172a] rounded-xl p-4 border border-[#334155] flex flex-col items-center justify-center text-center space-y-3">
                {/* Simulated QR Code Box */}
                <div className="w-36 h-36 bg-white p-2.5 rounded-xl shadow-lg flex items-center justify-center">
                  <div className="w-full h-full border-2 border-slate-900 border-dashed rounded flex flex-col items-center justify-center text-slate-900 text-[0.65rem] font-mono font-bold leading-tight">
                    <QrCode size={48} className="text-slate-900 mb-1" />
                    <span>ANDROID-DEV</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-xs font-bold text-slate-200">Scan via Android Device</div>
                  <p className="text-[0.72rem] text-slate-400 max-w-[200px]">
                    Internal QA team can scan this to load the staging bundle on Android test devices.
                  </p>
                </div>
              </div>

              <button
                onClick={() => info("Dev Build Alert", "Direct APK download will be available once current build pipeline completes.")}
                className="w-full py-2 px-3 rounded-lg bg-[#334155] hover:bg-[#475569] text-xs font-semibold text-slate-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Download size={14} />
                <span>Download Android APK (.apk)</span>
              </button>
            </div>

            {/* Hardware Support Spec */}
            <div className="bg-[#1e293b] border border-[#334155] rounded-xl p-5 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
                <Cpu size={15} className="text-amber-400" />
                <span>Supported Android Devices</span>
              </div>
              <ul className="text-xs text-slate-400 space-y-2">
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={13} className="text-emerald-400 flex-shrink-0" />
                  <span>Sunmi V2 & V2 Pro Handheld POS (Android)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={13} className="text-emerald-400 flex-shrink-0" />
                  <span>Zebra TC21 / TC26 Touch Computers (Android)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={13} className="text-emerald-400 flex-shrink-0" />
                  <span>All Android Smartphones (Android 10.0+)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={13} className="text-emerald-400 flex-shrink-0" />
                  <span>Android Rugged Field Tablets</span>
                </li>
              </ul>
              <div className="text-[0.7rem] text-slate-500 pt-1 border-t border-[#334155]/60 italic">
                * Note: Apple iOS (iPhone/iPad) is not supported.
              </div>
            </div>
          </div>
        </div>

        {/* ================= PLANNED CORE FEATURES GRID ================= */}
        <div className="space-y-3.5">
          <div className="flex items-center gap-2">
            <Sparkles size={17} className="text-blue-400" />
            <h3 className="text-sm font-bold text-white">Upcoming Android App Capabilities</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {FEATURES.map((feat, idx) => (
              <div
                key={idx}
                className="bg-[#1e293b] border border-[#334155] rounded-xl p-4 space-y-2 flex flex-col justify-between"
              >
                <div className="space-y-1.5">
                  <span className="text-[0.68rem] px-2 py-0.5 rounded bg-blue-500/15 text-blue-400 font-semibold border border-blue-500/25">
                    {feat.badge}
                  </span>
                  <h4 className="text-xs font-bold text-white pt-1">{feat.title}</h4>
                  <p className="text-[0.75rem] text-slate-400 leading-relaxed">{feat.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default MobileApp;
