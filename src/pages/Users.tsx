import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import { PageHeader } from '../components/erp';
import CustomersTab from '../components/users/CustomersTab';
import SuppliersTab from '../components/users/SuppliersTab';
import { Users as UsersIcon, Truck, Building2 } from 'lucide-react';

const Users: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const activeTab = location.pathname.includes('/suppliers') ? 'suppliers' : 'customers';

  const handleTabChange = (tab: 'customers' | 'suppliers') => {
    navigate(`/users/${tab}`);
  };

  return (
    <AppLayout
      headerIcon={<UsersIcon size={18} />}
      headerTitle="Users Management"
      headerSubtitle="Hardware shop customers and wholesale suppliers"
    >
      <PageHeader
        title="Customers & Suppliers"
        description="Manage business accounts, contact directories, payment terms, and trade histories."
        breadcrumbs={[
          { label: 'Dashboard', path: '/dashboard' },
          { label: 'Users' },
          { label: activeTab === 'customers' ? 'Customers' : 'Suppliers' },
        ]}
      />

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 mb-6 border-b border-[#334155]">
        <button
          onClick={() => handleTabChange('customers')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-t-lg transition-colors border-b-2 -mb-px ${
            activeTab === 'customers'
              ? 'border-[#3B82F6] text-[#3B82F6] bg-[#3B82F6]/15'
              : 'border-transparent text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#243244]'
          }`}
        >
          <Building2 size={16} />
          <span>Customers</span>
          <span className="hidden sm:inline text-[#94A3B8] font-normal">(Hardware Shops)</span>
        </button>

        <button
          onClick={() => handleTabChange('suppliers')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-t-lg transition-colors border-b-2 -mb-px ${
            activeTab === 'suppliers'
              ? 'border-[#3B82F6] text-[#3B82F6] bg-[#3B82F6]/15'
              : 'border-transparent text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#243244]'
          }`}
        >
          <Truck size={16} />
          <span>Suppliers</span>
          <span className="hidden sm:inline text-[#94A3B8] font-normal">(Procurement)</span>
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'customers' ? <CustomersTab /> : <SuppliersTab />}
    </AppLayout>
  );
};

export default Users;
