import React from 'react';
import AppLayout from '../components/AppLayout';
import { PageHeader } from '../components/erp';
import SuppliersTab from '../components/users/SuppliersTab';
import { Truck } from 'lucide-react';

const Suppliers: React.FC = () => {
  return (
    <AppLayout
      headerIcon={<Truck size={18} />}
      headerTitle="Suppliers"
      headerSubtitle="Procurement and vendor management"
    >
      <PageHeader
        title="Suppliers Directory"
        description="Manage procurement suppliers, vendor contacts, payment terms, and purchase histories."
        breadcrumbs={[
          { label: 'Dashboard', path: '/dashboard' },
          { label: 'Suppliers' },
        ]}
      />

      <SuppliersTab />
    </AppLayout>
  );
};

export default Suppliers;
