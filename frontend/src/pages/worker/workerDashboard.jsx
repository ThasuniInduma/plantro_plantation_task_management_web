import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import SideNav from '../../components/SideNav';
import { AppContext } from '../../context/AppContext';
import axios from 'axios';
import './workerDashboard.css';
import {
  FiArrowRight,
  FiBell,
  FiCheckCircle,
  FiClock,
  FiAlertCircle,
  FiTrendingUp,
  FiX,
  FiCalendar,
  FiMap,
  FiUsers,
} from 'react-icons/fi';

const mockInitialTasks = [
  {
    id: 201,
    date: '2026-01-28',
    name: 'Fertilizing (NPK Mixture)',
    field: 'Plot C-003 (Lower Field)',
    crop: 'Cinnamon',
    location: 'Grid 3N, Row 10-50',
    estimatedTime: 5,
    team: ['W002 - Kamal', 'W005 - Nimal'],
    status: 'Assigned',
    description: 'Apply NPK fertilizer mixture evenly across designated rows',
    supervisor: 'S001 - Mr. Silva',
    dueTime: '08:00 AM',
  },
  {
    id: 202,
    date: '2026-01-28',
    name: 'Young Shoot Pruning',
    field: 'Block F-001 (Hillside)',
    crop: 'Tea',
    location: 'Entrance Gate Section',
    estimatedTime: 3,
    team: ['None (Solo Task)'],
    status: 'Assigned',
    description: 'Prune young tea shoots to encourage proper growth',
    supervisor: 'S001 - Mr. Silva',
    dueTime: '02:00 PM',
  },
];

const mockTomorrowTasks = [
  {
    id: 203,
    date: '2026-01-29',
    name: 'Tea Leaf Plucking',
    field: 'Block F-001 (Hillside)',
    crop: 'Tea',
    location: 'Section A-B',
    estimatedTime: 6,
    team: ['W001 - You', 'W003 - Perera', 'W007 - Fernando'],
    status: 'Scheduled',
    description: 'Harvest tender tea leaves following standard plucking guidelines',
    supervisor: 'S001 - Mr. Silva',
    dueTime: '06:00 AM',
  }
];

const WorkerDashboard = () => {
  const navigate = useNavigate();
  const { userData, backendUrl } = useContext(AppContext);
  
  const [tasks, setTasks] = useState(mockInitialTasks);
  const [tomorrowTasks, setTomorrowTasks] = useState(mockTomorrowTasks);
  const [attendanceStatus, setAttendanceStatus] = useState('Pending');
  const [activeTab, setActiveTab] = useState('worker');
  const [activedTab, setActivedTab] = useState('today');
  const [selectedTask, setSelectedTask] = useState(null);
  const [notifications, setNotifications] = useState([
    { id: 1, message: 'New task assigned for tomorrow', time: '10 mins ago', read: false, type: 'info' },
    { id: 2, message: 'Task completion confirmed by supervisor', time: '1 hour ago', read: false, type: 'success' },
    { id: 3, message: 'Weather alert: Rain expected in afternoon', time: '2 hours ago', read: false, type: 'warning' },
  ]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // States for Unable Today feature
  const [taskReasons, setTaskReasons] = useState({});
  const [showReasonInput, setShowReasonInput] = useState({});

  // User display name
  const displayName = userData?.full_name || userData?.name || 'Worker';
  const avatarLetter = displayName.charAt(0).toUpperCase();

  

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleUpdateStatus = (taskId, newStatus) => {
    setTasks(prevTasks =>
      prevTasks.map(task =>
        task.id === taskId ? { ...task, status: newStatus } : task
      )
    );
    
    const task = tasks.find(t => t.id === taskId);
    addNotification(`Task "${task.name}" status updated to ${newStatus}`, 'success');
  };

  const handleMarkAttendance = () => {
    if (attendanceStatus === 'Pending') {
      setAttendanceStatus('Marked');
      addNotification('Attendance marked successfully for tomorrow', 'success');
    } else {
      setAttendanceStatus('Pending');
      addNotification('Attendance unmarked', 'info');
    }
  };

  const addNotification = (message, type = 'info') => {
    const newNotification = {
      id: Date.now(),
      message,
      time: 'Just now',
      read: false,
      type
    };
    setNotifications(prev => [newNotification, ...prev]);
  };

  const markNotificationRead = (id) => {
    setNotifications(prev =>
      prev.map(notif => notif.id === id ? { ...notif, read: true } : notif)
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const completedToday = tasks.filter(t => t.status === 'Completed').length;
  const inProgress = tasks.filter(t => t.status === 'In Progress').length;
  const pending = tasks.filter(t => t.status === 'Assigned').length;
  const totalTasks = tasks.length;
  const completionRate = totalTasks > 0 ? Math.round((completedToday / totalTasks) * 100) : 0;

  // Unable Today feature handlers
  const handleUnableToday = (task) => {
    setShowReasonInput(prev => ({ ...prev, [task.id]: true }));
  };

  const submitReason = (task) => {
    const reason = taskReasons[task.id];
    if (!reason || reason.trim() === '') {
      alert('Please enter a reason.');
      return;
    }

    const newTask = {
      ...task,
      status: 'Assigned',
      description: `${task.description} (Postponed: ${reason})`,
    };

    setTomorrowTasks(prev => [...prev, newTask]);
    setTasks(prev => prev.filter(t => t.id !== task.id));

    setTaskReasons(prev => ({ ...prev, [task.id]: '' }));
    setShowReasonInput(prev => ({ ...prev, [task.id]: false }));

    addNotification(`Task "${task.name}" postponed to tomorrow`, 'info');
  };

  const cancelReasonInput = (taskId) => {
    setShowReasonInput(prev => ({ ...prev, [taskId]: false }));
    setTaskReasons(prev => ({ ...prev, [taskId]: '' }));
  };

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <div className="worker-dashboard-layout">
      <SideNav
                role="worker"
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                userName="worker"
                userRole="worker"
            />
      
      <div className="main-content">
        {/* Header */}
        <header className="content-header">
          <div className="header-left">
            <h1 className="page-title">My Dashboard</h1>
            <p className="page-subtitle">Track your daily tasks and progress</p>
          </div>

          <div className="header-actions">
            <button 
              className="notification-btn"
              onClick={() => setShowNotifications(!showNotifications)}
            >
              <FiBell />
              {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
            </button>
          </div>
        </header>

        {/* Notifications Dropdown */}
        {showNotifications && (
          <>
            <div className="notification-overlay" onClick={() => setShowNotifications(false)}></div>
            <div className="notifications-dropdown">
              <div className="notifications-header">
                <h3>Notifications</h3>
                {unreadCount > 0 && (
                  <button className="mark-all-btn" onClick={markAllAsRead}>
                    Mark all as read
                  </button>
                )}
              </div>
              <div className="notifications-list">
                {notifications.length === 0 ? (
                  <div className="empty-notifications">
                    <span className="empty-icon">📭</span>
                    <p>No notifications</p>
                  </div>
                ) : (
                  notifications.map(notif => (
                    <div 
                      key={notif.id} 
                      className={`notification-item ${notif.read ? '' : 'unread'} ${notif.type}`}
                      onClick={() => markNotificationRead(notif.id)}
                    >
                      <div className="notif-icon">
                        {notif.type === 'success' && <FiCheckCircle />}
                        {notif.type === 'warning' && <FiAlertCircle />}
                        {notif.type === 'info' && <FiBell />}
                      </div>
                      <div className="notif-content">
                        <p className="notif-message">{notif.message}</p>
                        <span className="notif-time">{notif.time}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}

        {/* Main Content */}
        <main className="content-body">
          {/* Welcome Section */}
          <div className="welcome-section">
            <div className="welcome-card">
              <div className="welcome-text">
                <h2>{getGreeting()}, {displayName}! 👋</h2>
                <p>Here's your work overview for today</p>
              </div>
              <div className="date-time-display">
                <div className="date-info">
                  <span className="date">
                    {currentTime.toLocaleDateString('en-US', { 
                      weekday: 'short', 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </span>
                  <span className="time">
                    {currentTime.toLocaleTimeString('en-US', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="metrics-section">
            <div className="metric-card completed">
              <div className="metric-icon">
                <FiCheckCircle size={28} />
              </div>
              <div className="metric-content">
                <h4>Completed</h4>
                <p className="metric-value">{completedToday}</p>
                <span className="metric-change positive">
                  +{Math.max(0, completedToday - 2)} from yesterday
                </span>
              </div>
            </div>

            <div className="metric-card progress">
              <div className="metric-icon">
                <FiClock size={28} />
              </div>
              <div className="metric-content">
                <h4>In Progress</h4>
                <p className="metric-value">{inProgress}</p>
                <span className="metric-change neutral">Active now</span>
              </div>
            </div>

            <div className="metric-card pending">
              <div className="metric-icon">
                <FiAlertCircle size={28} />
              </div>
              <div className="metric-content">
                <h4>Pending</h4>
                <p className="metric-value">{pending}</p>
                <span className="metric-change neutral">Awaiting start</span>
              </div>
            </div>

            <div className="metric-card rate">
              <div className="metric-icon">
                <FiTrendingUp size={28} />
              </div>
              <div className="metric-content">
                <h4>Completion Rate</h4>
                <p className="metric-value">{completionRate}%</p>
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${completionRate}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Attendance Card */}
          <div className="attendance-section">
            <div className="attendance-card">
              <div className="attendance-header">
                <div className="attendance-info">
                  <h3>Tomorrow's Attendance</h3>
                  <p>
                    Confirm your availability for {new Date(currentTime.getTime() + 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                </div>
                <button 
                  className={`attendance-btn ${attendanceStatus.toLowerCase()}`}
                  onClick={handleMarkAttendance}
                >
                  <span className="btn-icon">
                    {attendanceStatus === 'Pending' ? <FiClock /> : <FiCheckCircle />}
                  </span>
                  {attendanceStatus === 'Pending' ? 'Mark Present' : 'Confirmed'}
                </button>
              </div>
            </div>
          </div>

          {/* Tasks Section */}
          <div className="tasks-section">
            <div className="section-header">
              <h2>Your Tasks</h2>
              <div className="tab-buttons">
                <button 
                  className={`tab-btn ${activedTab === 'today' ? 'active' : ''}`}
                  onClick={() => setActivedTab('today')}
                >
                  <FiCalendar />
                  Today ({tasks.length})
                </button>
                <button 
                  className={`tab-btn ${activedTab === 'tomorrow' ? 'active' : ''}`}
                  onClick={() => setActivedTab('tomorrow')}
                >
                  <FiCalendar />
                  Tomorrow ({tomorrowTasks.length})
                </button>
              </div>
            </div>

            <div className="tasks-container">
              {(activedTab === 'today' ? tasks : tomorrowTasks).length === 0 ? (
                <div className="no-tasks">
                  <span className="no-tasks-icon">
                    <FiCheckCircle size={64} />
                  </span>
                  <h3>No tasks for {activedTab === 'today' ? 'today' : 'tomorrow'}</h3>
                  <p>Enjoy your free time or check back later!</p>
                </div>
              ) : (
                <div className="tasks-grid">
                  {(activedTab === 'today' ? tasks : tomorrowTasks).map(task => (
                    <div key={task.id} className={`task-card ${task.status.toLowerCase().replace(' ', '-')}`}>
                      <div className="task-card-header">
                        <div className="task-status-badge">{task.status}</div>
                        <div className="task-time">
                          <FiClock size={14} />
                          {task.dueTime}
                        </div>
                      </div>

                      <h3 className="task-title">{task.name}</h3>
                      <p className="task-description">{task.description}</p>

                      <div className="task-details-grid">
                        <div className="detail-item">
                          <span className="detail-label">
                            <FiMap size={12} /> Field
                          </span>
                          <p>{task.field}</p>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">
                            <FiClock size={12} /> Duration
                          </span>
                          <p>{task.estimatedTime}h</p>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Crop</span>
                          <p>{task.crop}</p>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">
                            <FiUsers size={12} /> Team
                          </span>
                          <p>
                            {task.team[0].includes('None') 
                              ? 'Solo Task' 
                              : `${task.team.length} members`}
                          </p>
                        </div>
                      </div>

                      {activedTab === 'today' && (
                        <div className="task-actions">
                          {task.status === 'Assigned' && (
                            <>
                              <button 
                                className="task-action-btn start-btn"
                                onClick={() => handleUpdateStatus(task.id, 'In Progress')}
                              >
                                <FiArrowRight size={16} />
                                Start Task
                              </button>
                              <button
                                className="task-action-btn unable-btn"
                                onClick={() => handleUnableToday(task)}
                              >
                                Unable Today
                              </button>
                            </>
                          )}
                          {task.status === 'In Progress' && (
                            <>
                              <button 
                                className="task-action-btn complete-btn"
                                onClick={() => handleUpdateStatus(task.id, 'Completed')}
                              >
                                <FiCheckCircle size={16} />
                                Complete
                              </button>
                              <button
                                className="task-action-btn unable-btn"
                                onClick={() => handleUnableToday(task)}
                              >
                                Unable Today
                              </button>
                            </>
                          )}
                          {task.status === 'Completed' && (
                            <div className="task-completed-badge">
                              <FiCheckCircle size={16} />
                              Completed Successfully
                            </div>
                          )}
                        </div>
                      )}

                      {/* Reason Modal */}
                      {showReasonInput[task.id] && (
                        <div className="reason-modal-overlay" onClick={() => cancelReasonInput(task.id)}>
                          <div className="reason-modal" onClick={(e) => e.stopPropagation()}>
                            <div className="reason-modal-header">
                              <h4>Unable to Complete Task</h4>
                              <button 
                                className="close-btn"
                                onClick={() => cancelReasonInput(task.id)}
                              >
                                <FiX size={20} />
                              </button>
                            </div>
                            <div className="reason-modal-body">
                              <label>Please provide a reason for postponing this task:</label>
                              <textarea
                                placeholder="E.g., Equipment unavailable, weather conditions, health issues..."
                                value={taskReasons[task.id] || ''}
                                onChange={(e) =>
                                  setTaskReasons(prev => ({ ...prev, [task.id]: e.target.value }))
                                }
                                className="reason-input"
                                rows="4"
                                autoFocus
                              />
                            </div>
                            <div className="reason-modal-footer">
                              <button
                                className="reason-cancel-btn"
                                onClick={() => cancelReasonInput(task.id)}
                              >
                                Cancel
                              </button>
                              <button
                                className="reason-submit-btn"
                                onClick={() => submitReason(task)}
                                disabled={!taskReasons[task.id] || taskReasons[task.id].trim() === ''}
                              >
                                Postpone to Tomorrow
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default WorkerDashboard;