import React, { useState } from 'react';
import SideNav from '../components/SideNav';
import './dashboardLayout.css';

const DashboardLayout = ({ children }) => {
  const [activeTab, setActiveTab] = useState(null);

  return (
    <div className="dashboard-layout">
      <SideNav activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="dashboard-content">
        {children}
      </main>
    </div>
  );
};

export default DashboardLayout;