import React, { useState, useEffect } from "react";
import AppLayout from "../components/AppLayout";
import DashboardOverview from "../components/DashboardOverview";
import { LayoutGrid } from "lucide-react";

const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AppLayout
      headerIcon={<LayoutGrid size={18} />}
      headerTitle="Hardware ERP Overview"
      headerSubtitle="Real-time enterprise operational intelligence"
      showBell
    >
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="text-center text-slate-400">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mx-auto mb-3" />
            <p className="text-sm">Loading enterprise data...</p>
          </div>
        </div>
      ) : (
        <DashboardOverview />
      )}
    </AppLayout>
  );
};

export default Dashboard;
