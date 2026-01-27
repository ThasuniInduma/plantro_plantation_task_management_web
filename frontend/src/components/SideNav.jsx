import React, { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiGrid, FiPackage, FiMap, FiUsers, FiBarChart2,
  FiCheckSquare, FiClock, FiUser, FiLogOut, FiCalendar
} from 'react-icons/fi';
import './SideNav.css';
import { assets } from '../assets/assets';
import { AppContext } from '../context/AppContext';
import axios from 'axios';

const SideNav = ({ activeTab, setActiveTab }) => {
  const navigate = useNavigate();
  const { userData, setIsLoggedIn, backendUrl } = useContext(AppContext);
  const [role, setRole] = useState(null);
  const [displayName, setDisplayName] = useState('User');

  // Map API role names to menuConfigs keys
  const roleMap = {
    owner: 'admin',      // OWNER in DB → admin
    admin: 'admin',
    supervisor: 'supervisor',
    worker: 'worker'
  };

  useEffect(() => {
  if (userData) {
    setDisplayName(userData.full_name || 'User');

    // Make sure role_id is a number
    const roleId = Number(userData.role_id);

    let mappedRole = 'worker'; // default

    if (roleId === 1) mappedRole = 'admin';       // OWNER/Admin
    else if (roleId === 2) mappedRole = 'supervisor';
    else if (roleId === 3) mappedRole = 'worker';

    setRole(mappedRole);
  }
}, [userData]);



  if (!role) {
    return <aside className="sidebar">Loading...</aside>;
  }

  const displayRole =
    role === 'admin'
      ? 'Plantation Owner'
      : role === 'supervisor'
        ? 'Field Supervisor'
        : 'Field Worker';

  const avatarLetter = displayName.charAt(0).toUpperCase();

  // Logout function
  const handleLogout = async () => {
  try {
    await axios.post(`${backendUrl}/api/auth/logout`);
  } catch (err) {
    console.error('Logout error:', err);
  }

  // Clear context states
  setIsLoggedIn(false);
  setRole(null);       // <-- reset role
  setDisplayName('User'); // optional
  navigate('/login');
};


  const handleNavigation = (tab, path) => {
    setActiveTab(tab);
    navigate(path);
  };

  const menuConfigs = {
    admin: {
      sections: [
        {
          title: 'Main',
          items: [{ id: 'dashboard', label: 'Dashboard', icon: <FiGrid />, path: '/admin' }]
        },
        {
          title: 'Management',
          items: [
            { id: 'crops', label: 'Crop Management', icon: <FiPackage />, path: '/crop' },
            { id: 'fields', label: 'Field Management', icon: <FiMap />, path: '/field' },
            { id: 'workforce', label: 'Workforce Management', icon: <FiUsers />, path: '/workforce' }
          ]
        },
        {
          title: 'Analytics',
          items: [{ id: 'reports', label: 'Reports & Analytics', icon: <FiBarChart2 />, path: '/report' }]
        }
      ],
      profilePath: '/owner-profile'
    },
    supervisor: {
      sections: [
        {
          title: 'Main',
          items: [{ id: 'dashboard', label: 'Field Status', icon: <FiGrid />, path: '/supervisor' }]
        },
        {
          title: 'Management',
          items: [
            { id: 'attendance', label: 'Attendance', icon: <FiCalendar />, path: '/attendance' },
            { id: 'tasks', label: 'Assign Tasks', icon: <FiCheckSquare />, path: '/tasks' }
          ]
        }
      ],
      profilePath: '/supervisor-profile'
    },
    worker: {
      sections: [
        {
          title: 'Main',
          items: [
            { id: 'worker', label: 'My Tasks', icon: <FiCheckSquare />, path: '/worker' },
          ]
        }
      ],
      profilePath: '/worker-profile'
    }
  };

  const currentConfig = menuConfigs[role] || menuConfigs.worker;

  return (
    <aside className="sidebar">
      {/* Sidebar Header */}
      <div className="sidebar-header">
        <div className="brand-logo">
          <img src={assets.plantro} alt="Plantro Logo" className="brand-logo-img" />
          <span className="role-badge">{role.toUpperCase()}</span>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="sidebar-nav">
        {currentConfig.sections.map((section, idx) => (
          <div key={idx} className="nav-section">
            <div className="nav-section-title">{section.title}</div>
            {section.items.map((item) => (
              <button
                key={item.id}
                className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
                onClick={() => handleNavigation(item.id, item.path)}
              >
                <span className="nav-icon">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        ))}
      </nav>

      {/* Sidebar Footer */}
      <div className="sidebar-footer">
        <div
          className="user-profile"
          onClick={() => handleNavigation('profile', currentConfig.profilePath)}
        >
          <div className="user-avatar">{avatarLetter}</div>
          <div className="user-info">
            <div className="user-name">{displayName}</div>
            <div className="user-role">{displayRole}</div>
          </div>
        </div>

        <div className="sidebar-actions">
          <button
            className="action-btn"
            onClick={() => handleNavigation('profile', currentConfig.profilePath)}
            title="My Profile"
          >
            <FiUser />
          </button>
          <button
            className="action-btn logout-btn"
            onClick={handleLogout}
            title="Logout"
          >
            <FiLogOut />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default SideNav;
