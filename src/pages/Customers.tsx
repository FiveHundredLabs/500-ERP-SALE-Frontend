import React from 'react';
import AppLayout from '../components/AppLayout';
import { PageHeader } from '../components/erp';
import CustomersTab from '../components/users/CustomersTab';
import { Users as UsersIcon } from 'lucide-react';

const Customers: React.FC = () => {
  return (
    <AppLayout
      headerIcon={<UsersIcon size={18} />}
      headerTitle="Customers"
      headerSubtitle="Retail and wholesale customer accounts"
    >
      <PageHeader
        title="Customers Directory"
        description="Manage business accounts, contact directories, credit limits, and trade histories."
        breadcrumbs={[
          { label: 'Dashboard', path: '/dashboard' },
          { label: 'Customers' },
        ]}
      />

      <CustomersTab />
    </AppLayout>
  );
};

export default Customers;
