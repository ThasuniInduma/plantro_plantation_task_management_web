import React, { useState } from 'react';
import './adminDashboard.css';
import { useNavigate } from 'react-router-dom';
import SideNav from '../../components/SideNav';
import { 
    FiAlertCircle, FiUsers, FiMap, FiCheckCircle, FiClock, 
    FiBell, FiActivity, FiPackage, FiBarChart2 
} from 'react-icons/fi';

const mockFields = [
    { 
        id: 'F001', 
        name: 'Tea Field Matara', 
        crop: 'Tea', 
        area: '50 Acres', 
        supervisor: 'Saman Perera (S001)',
        tasksToday: [
            { task: 'Plucking', workers: ['W001', 'W004'], status: 'In Progress' },
            { task: 'Fertilizing', workers: ['W007'], status: 'Pending' },
        ],
        nextDue: 'Pruning (Due 2026-10-18)',
        status: 'active',
        completionRate: 75
    },
    { 
        id: 'F002', 
        name: 'Coconut Field Hakmana', 
        crop: 'Coconut', 
        area: '25 Acres', 
        supervisor: 'Nimali Fernando (S002)',
        tasksToday: [
            { task: 'Harvesting', workers: ['W002', 'W003', 'W005'], status: 'Completed' },
        ],
        nextDue: 'Weeding (Due 2026-01-18)',
        status: 'active',
        completionRate: 100
    },
    { 
        id: 'F003', 
        name: 'Rubber Field Matara', 
        crop: 'Rubber', 
        area: '80 Acres', 
        supervisor: 'Kasun Bandara (S003)',
        tasksToday: [
            { task: 'Tapping', workers: ['W008', 'W009'], status: 'In Progress' },
        ],
        nextDue: 'Rain Guarding (Seasonal)',
        status: 'attention',
        completionRate: 45
    },
];

const mockOverview = {
    totalFields: mockFields.length,
    totalWorkers: 35,
    tasksCompletedToday: 7,
    tasksPending: 3,
    absentWorkers: 3,
};

const mockNotifications = [
    { id: 1, type: 'warning', message: 'Rubber Field needs attention - 2 tasks overdue', time: '10 mins ago', unread: true },
    { id: 2, type: 'success', message: 'Coconut Field harvesting completed successfully', time: '1 hour ago', unread: true },
    { id: 3, type: 'info', message: 'New worker W010 registered and awaiting approval', time: '2 hours ago', unread: false },
    { id: 4, type: 'info', message: 'Weekly performance report is ready', time: '1 day ago', unread: false },
];

const AdminDashboard = () => { 
    const [selectedField, setSelectedField] = useState(null);
    const [activeTab, setActiveTab] = useState('dashboard');
    const [showNotifications, setShowNotifications] = useState(false);
    const [notifications, setNotifications] = useState(mockNotifications);
    const navigate = useNavigate();

    const unreadCount = notifications.filter(n => n.unread).length;

    const handleFieldClick = (field) => {
        setSelectedField(field);
    };

    const handleBackToOverview = () => {
        setSelectedField(null);
    };

    const markAllAsRead = () => {
        setNotifications(notifications.map(n => ({ ...n, unread: false })));
    };

    const FieldDetailsView = ({ field }) => (
        <div className="field-detail-container">
            <button className="back-btn" onClick={handleBackToOverview}>
                Back to Overview
            </button>
            
            <div className="field-detail-header">
                <div>
                    <h1 className="field-name">{field.name}</h1>
                    <p className="field-id">Field ID: {field.id}</p>
                </div>
                <div className={`status-indicator ${field.status}`}>
                    {field.status === 'active' ? 'On Track' : 'Needs Attention'}
                </div>
            </div>

            <div className="field-info-grid">
                <div className="info-card">
                    <div className="info-label">Crop Type</div>
                    <div className="info-value">{field.crop}</div>
                </div>
                <div className="info-card">
                    <div className="info-label">Area</div>
                    <div className="info-value">{field.area}</div>
                </div>
                <div className="info-card">
                    <div className="info-label">Supervisor</div>
                    <div className="info-value">{field.supervisor}</div>
                </div>
                <div className="info-card">
                    <div className="info-label">Completion Rate</div>
                    <div className="info-value">{field.completionRate}%</div>
                </div>
            </div>

            <div className="tasks-section">
                <h2 className="section-title">Today's Tasks & Workforce</h2>
                <div className="tasks-list">
                    {field.tasksToday.length > 0 ? (
                        field.tasksToday.map((task, index) => (
                            <div key={index} className="task-card">
                                <div className="task-header">
                                    <h3>{task.task}</h3>
                                    <span className={`task-status ${task.status.toLowerCase().replace(' ', '-')}`}>
                                        {task.status}
                                    </span>
                                </div>
                                <div className="task-workers">
                                    <FiUsers className="icon" />
                                    <span>Workers: {task.workers.join(', ')}</span>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="no-tasks">No tasks scheduled for today.</p>
                    )}
                </div>
            </div>

            <div className="next-task-card">
                <FiClock className="next-icon" />
                <div>
                    <h3>Next Major Task</h3>
                    <p>{field.nextDue}</p>
                </div>
                <button className="manage-btn" onClick={() => navigate('/crop')}>
                    Manage Tasks
                </button>
            </div>
        </div>
    );

    const OverviewDashboard = () => (
        <div className="overview-container">
            {/* Stats Overview */}
            <div className="stats-grid">
                <div className="stat-card first">
                    <div className="stat-icon">
                        <FiMap />
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">{mockOverview.totalFields}</div>
                        <div className="stat-label">Total Fields</div>
                    </div>
                </div>

                <div className="stat-card success">
                    <div className="stat-icon">
                        <FiCheckCircle />
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">{mockOverview.tasksCompletedToday}</div>
                        <div className="stat-label">Completed Today</div>
                    </div>
                </div>

                <div className="stat-card warning">
                    <div className="stat-icon">
                        <FiAlertCircle />
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">{mockOverview.tasksPending}</div>
                        <div className="stat-label">Pending Tasks</div>
                    </div>
                </div>

                <div className="stat-card info">
                    <div className="stat-icon">
                        <FiUsers />
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">{mockOverview.totalWorkers}</div>
                        <div className="stat-label">Total Workforce</div>
                        <div className="stat-meta">{mockOverview.absentWorkers} absent today</div>
                    </div>
                </div>
            </div>

            {/* Management Modules */}
            <div className="modules-section">
                <h2 className="section-title">Quick Access</h2>
                <div className="modules-grid">
                    <div className="module-card crop" onClick={() => navigate('/crop')}>
                        <div className="module-icon">
                            <FiPackage />
                        </div>
                        <h3>Crop Management</h3>
                        <p>Define tasks, frequencies, and update crop cycles</p>
                    </div>

                    <div className="module-card field" onClick={() => navigate('/field')}>
                        <div className="module-icon">
                            <FiMap />
                        </div>
                        <h3>Field Management</h3>
                        <p>Add/edit fields, locations, and assign supervisors</p>
                    </div>

                    <div className="module-card workforce" onClick={() => navigate('/workforce')}>
                        <div className="module-icon">
                            <FiUsers />
                        </div>
                        <h3>Workforce Management</h3>
                        <p>Manage worker/supervisor accounts and assignments</p>
                    </div>

                    <div className="module-card reports" onClick={() => navigate('/report')}>
                        <div className="module-icon">
                            <FiBarChart2 />
                        </div>
                        <h3>Reports & Analytics</h3>
                        <p>Generate performance and harvest reports</p>
                    </div>
                </div>
            </div>

            {/* Field Activity Summary */}
            <div className="fields-section">
                <h2 className="section-title">Field Activity Summary</h2>
                <div className="fields-grid">
                    {mockFields.map(field => (
                        <div 
                            key={field.id} 
                            className={`field-card ${field.status}`}
                            onClick={() => handleFieldClick(field)}
                        >
                            <div className="field-card-header">
                                <h3>{field.name}</h3>
                                <div className={`field-status-badge ${field.status}`}>
                                    {field.status === 'active' ? 'Active' : 'Attention'}
                                </div>
                            </div>
                            
                            <div className="field-card-body">
                                <div className="field-info-row">
                                    <span className="label">Crop:</span>
                                    <span className="value">{field.crop}</span>
                                </div>
                                <div className="field-info-row">
                                    <span className="label">Supervisor:</span>
                                    <span className="value">{field.supervisor.split(' ')[0]}</span>
                                </div>
                                <div className="field-info-row">
                                    <span className="label">Tasks Today:</span>
                                    <span className="value">{field.tasksToday.length}</span>
                                </div>
                            </div>

                            <div className="completion-bar">
                                <div className="completion-fill" style={{width: `${field.completionRate}%`}}></div>
                            </div>
                            <div className="completion-text">{field.completionRate}% Complete</div>

                            <div className="view-details">View Details </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    return (
        <div className="admin-dashboard-layout">
            {/* Reusable SideNav Component */}
            <SideNav 
                role="admin"
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                userName="Admin User"
                userRole="Plantation Owner"
            />

            {/* Main Content */}
            <div className="main-content">
                <header className="content-header">
                    <div className="header-left">
                        <h1 className="page-title">
                            {activeTab === 'dashboard' ? 'Dashboard Overview' : 
                             activeTab === 'crops' ? 'Crop Management' :
                             activeTab === 'fields' ? 'Field Management' :
                             activeTab === 'workforce' ? 'Workforce Management' :
                             activeTab === 'reports' ? 'Reports & Analytics' : 'Dashboard'}
                        </h1>
                        <p className="page-subtitle">Manage your plantation operations efficiently</p>
                    </div>
                    
                    <div className="header-actions">
                        <div className="notification-wrapper">
                            <button 
                                className="notification-btn"
                                onClick={() => setShowNotifications(!showNotifications)}
                            >
                                <FiBell />
                                {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
                            </button>
                            
                            {showNotifications && (
                                <div className="notification-dropdown">
                                    <div className="notification-header">
                                        <h3>Notifications</h3>
                                        {unreadCount > 0 && (
                                            <button className="mark-read-btn" onClick={markAllAsRead}>
                                                Mark all as read
                                            </button>
                                        )}
                                    </div>
                                    <div className="notification-list">
                                        {notifications.map(notif => (
                                            <div 
                                                key={notif.id} 
                                                className={`notification-item ${notif.unread ? 'unread' : ''} ${notif.type}`}
                                            >
                                                <div className="notification-icon">
                                                    {notif.type === 'warning' && <FiAlertCircle />}
                                                    {notif.type === 'success' && <FiCheckCircle />}
                                                    {notif.type === 'info' && <FiActivity />}
                                                </div>
                                                <div className="notification-content">
                                                    <p className="notification-message">{notif.message}</p>
                                                    <span className="notification-time">{notif.time}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="notification-footer">
                                        <button className="view-all-btn">View All Notifications</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </header>
                
                <main className="content-body">
                    {selectedField ? (
                        <FieldDetailsView field={selectedField} />
                    ) : (
                        <OverviewDashboard />
                    )}
                </main>
            </div>
        </div>
    );
};

export default AdminDashboard;