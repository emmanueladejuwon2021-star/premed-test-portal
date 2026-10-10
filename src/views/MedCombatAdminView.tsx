import React from 'react';
import DashboardLayout from '../components/DashboardLayout';

export default function MedCombatAdminView() {
  return (
    <DashboardLayout viewTitle="Med Combat Panel">
      <div className="flex flex-col gap-6">
        <h2 className="text-xl font-black text-slate-800 dark:text-white">Med Combat Admin</h2>
        <div className="p-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-center">
            <p className="text-slate-500 dark:text-slate-400">Admin controls for Med Combat.</p>
        </div>
      </div>
    </DashboardLayout>
  );
}
