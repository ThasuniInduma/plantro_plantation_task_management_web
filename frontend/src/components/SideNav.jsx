import React, { useContext, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  FiGrid, FiPackage, FiMap, FiUsers, FiBarChart2,
  FiCheckSquare, FiUser, FiLogOut, FiCalendar,
  FiChevronLeft, FiChevronRight,
} from 'react-icons/fi';
import './SideNav.css';
import { assets } from '../assets/assets';
import { AppContext } from '../context/AppContext';
import axios from 'axios';

const SideNav = ({ activeTab, setActiveTab }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { userData, setIsLoggedIn, setUserData, backendUrl } = useContext(AppContext);

  const [collapsed, setCollapsed] = useState(false);

  const role = useMemo(() => {
  if (!userData) return null;

  const roleId = Number(userData.role_id);
  if (roleId === 1) return 'admin';
  if (roleId === 2) return 'supervisor';
  if (roleId === 3) return 'worker';

  const roleName = (userData.role_name || '').toLowerCase();
  if (roleName === 'admin' || roleName === 'owner') return 'admin';
  if (roleName === 'supervisor') return 'supervisor';
  if (roleName === 'worker') return 'worker';

  return 'worker';
}, [userData]);

console.log("userData:", userData);
console.log("role_id:", userData?.role_id);
console.log("role_name:", userData?.role_name);
console.log("computed role:", role);

  const displayName = userData?.full_name || 'User';

  if (!role) return <aside className="sidebar">Loading...</aside>;

  const displayRole =
    role === 'admin' ? 'Plantation Owner'
    : role === 'supervisor' ? 'Field Supervisor'
    : 'Field Worker';

  const avatarLetter = displayName.charAt(0).toUpperCase();

  const handleLogout = async () => {
  try { await axios.post(`${backendUrl}/api/auth/logout`); }
  catch (err) { console.error(err); }
  
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  setIsLoggedIn(false);
  setUserData(null);
  navigate('/login');
};

  const handleNavigation = (tab, path) => {
    if (setActiveTab) setActiveTab(tab);
    navigate(path);
  };

  // detect active item
  const isActive = (itemId, itemPath) => {
    if (activeTab) return activeTab === itemId;
    return location.pathname === itemPath
      || (itemPath !== '/' && location.pathname.startsWith(itemPath));
  };

  const menuConfigs = {
    admin: {
      sections: [
        { title: 'Main', items: [
          { id: 'dashboard', label: 'Dashboard', icon: <FiGrid />, path: '/admin' },
        ]},
        { title: 'Management', items: [
          { id: 'crops',     label: 'Crop Management',      icon: <FiPackage />, path: '/crop' },
          { id: 'fields',    label: 'Field Management',     icon: <FiMap />,     path: '/field' },
          { id: 'workforce', label: 'Workforce Management', icon: <FiUsers />,   path: '/workforce' },
        ]},
        { title: 'Analytics', items: [
          { id: 'reports', label: 'Reports & Analytics', icon: <FiBarChart2 />, path: '/report' },
        ]},
      ],
      profilePath: '/owner-profile',
    },
    supervisor: {
      sections: [
        { title: 'Main', items: [
          { id: 'dashboard', label: 'Dashboard', icon: <FiGrid />, path: '/supervisor' },
        ]},
        { title: 'Management', items: [
          { id: 'attendance', label: 'Attendance',   icon: <FiCalendar />,    path: '/attendance' },
          { id: 'tasks',      label: 'Assign Tasks', icon: <FiCheckSquare />, path: '/tasks' },
          { id: 'incident',      label: 'Report Incidents', icon: <FiBarChart2 />, path: '/incidents' },
        ]},
      ],
      profilePath: '/supervisor-profile',
    },
    worker: {
      sections: [
        { title: 'Main', items: [
          { id: 'worker', label: 'My Tasks', icon: <FiCheckSquare />, path: '/worker' },
        ]},
      ],
      profilePath: '/worker-profile',
    },
  };

  const currentConfig = menuConfigs[role] || menuConfigs.worker;

  return (
    <>
      {/*  Floating re-open tab */}
      {collapsed && (
        <button className="sidebar-open-btn" onClick={() => setCollapsed(false)} title="Show sidebar">
          <FiChevronRight size={20} />
        </button>
      )}

      <aside className={`sidebar${collapsed ? ' sidebar-hidden' : ''}`}>

        {/*  Hide button */}
        <button className="sidebar-hide-btn" onClick={() => setCollapsed(true)} title="Hide sidebar">
          <FiChevronLeft size={15} />
          <span>Hide</span>
        </button>

        <div className="sidebar-header">
          <div className="brand-logo">
            <img src={assets.plantro} alt="Plantro Logo" className="brand-logo-img" />
            <span className="role-badge">{role.toUpperCase()}</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {currentConfig.sections.map((section, idx) => (
            <div key={idx} className="nav-section">
              <div className="nav-section-title">{section.title}</div>
              {section.items.map((item) => (
                <button
                  key={item.id}
                  className={`nav-item ${isActive(item.id, item.path) ? 'active' : ''}`}
                  onClick={() => handleNavigation(item.id, item.path)}
                >
                  <span className="nav-icon">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-profile" onClick={() => handleNavigation('profile', currentConfig.profilePath)}>
            <div className="user-avatar">{avatarLetter}</div>
            <div className="user-info">
              <div className="user-name">{displayName}</div>
              <div className="user-role">{displayRole}</div>
            </div>
          </div>

          <div className="sidebar-actions">
            <button className="action-btn" onClick={() => handleNavigation('profile', currentConfig.profilePath)} title="My Profile">
              <FiUser />
            </button>
            <button className="action-btn logout-btn" onClick={handleLogout} title="Logout">
              <FiLogOut />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default SideNav;