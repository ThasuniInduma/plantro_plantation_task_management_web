import React, { useState } from 'react';
import SideNav from '../components/SideNav';
import './dashboardLayout.css';

const DashboardLayout = ({ children, role = "supervisor" }) => {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="dashboard-layout">
      <SideNav 
        role={role}
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
      />

      <main className="dashboard-content">
        {children}
      </main>
    </div>
  );
};

export default DashboardLayout;