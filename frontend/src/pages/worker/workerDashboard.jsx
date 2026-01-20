import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './WorkerDashboard.css';
import { assets } from '../../assets/assets';

const mockInitialTasks = [
  {
    id: 201,
    date: '2025-10-22',
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
    date: '2025-10-22',
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
    date: '2025-10-23',
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

  const [tasks, setTasks] = useState(mockInitialTasks);
  const [tomorrowTasks, setTomorrowTasks] = useState(mockTomorrowTasks);
  const [attendanceStatus, setAttendanceStatus] = useState('Pending');
  const [activeTab, setActiveTab] = useState('today');
  const [showHarvestModal, setShowHarvestModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [notifications, setNotifications] = useState([
    { id: 1, message: 'New task assigned for tomorrow', time: '10 mins ago', read: false, type: 'info' },
    { id: 2, message: 'Task completion confirmed by supervisor', time: '1 hour ago', read: false, type: 'success' },
    { id: 3, message: 'Weather alert: Rain expected in afternoon', time: '2 hours ago', read: false, type: 'warning' },
  ]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // States for Unable Today feature
  const [taskReasons, setTaskReasons] = useState({}); // { taskId: reason }
  const [showReasonInput, setShowReasonInput] = useState({}); // { taskId: true/false }

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

  const openHarvestModal = (task) => {
    setSelectedTask(task);
    setShowHarvestModal(true);
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
    if (!reason) return alert('Please enter a reason.');

    const newTask = {
      ...task,
      status: 'Assigned',
      description: `${task.description} (Postponed Reason: ${reason})`,
    };

    setTomorrowTasks(prev => [...prev, newTask]);
    setTasks(prev => prev.filter(t => t.id !== task.id));

    setTaskReasons(prev => ({ ...prev, [task.id]: '' }));
    setShowReasonInput(prev => ({ ...prev, [task.id]: false }));

    addNotification(`Task "${task.name}" postponed to tomorrow`, 'info');
  };

  return (
    <div className="worker-dashboard-layout">
      <header className="worker-header-modern">
        <div className="header-left-content">
          <div className="logo-section-modern">
            <div className="logo-circle">
              <img src={assets.plantro} alt="Plantro" className="logo-img" />
            </div>
          </div>
        </div>

        <div className="header-center-content">
          <div className="date-time-display">
            <div className="current-date">
              {currentTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </div>
            <div className="current-time">
              {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>

        <div className="header-right-content">
          <button className="icon-button" onClick={() => setShowNotifications(!showNotifications)}>
            <span className="icon-bell">🔔</span>
            {unreadCount > 0 && <span className="badge-count">{unreadCount}</span>}
          </button>
          
          <div className="user-profile-section">
            <div className="user-avatar" onClick={() => navigate('/worker-profile')}>
              <span className="avatar-text">RK</span>
            </div>
            <div className="user-details">
              <span className="user-name">Rajitha Kumara</span>
              <span className="user-role">Worker • W001</span>
            </div>
          </div>
        </div>
      </header>

      {showNotifications && (
        <>
          <div className="notification-overlay" onClick={() => setShowNotifications(false)}></div>
          <div className="notifications-panel">
            <div className="panel-header">
              <h3>Notifications</h3>
              <button className="mark-all-read" onClick={() => setNotifications(prev => prev.map(n => ({ ...n, read: true })))}>
                Mark all as read
              </button>
            </div>
            <div className="notifications-body">
              {notifications.length === 0 ? (
                <div className="no-notifications">
                  <span className="empty-icon">📭</span>
                  <p>No notifications yet</p>
                </div>
              ) : (
                notifications.map(notif => (
                  <div
                    key={notif.id}
                    className={`notification-card ${notif.read ? 'read' : 'unread'} ${notif.type}`}
                    onClick={() => markNotificationRead(notif.id)}
                  >
                    <div className="notif-icon">
                      {notif.type === 'success' && '✅'}
                      {notif.type === 'warning' && '⚠️'}
                      {notif.type === 'info' && 'ℹ️'}
                      {notif.type === 'error' && '❌'}
                    </div>
                    <div className="notif-content">
                      <p>{notif.message}</p>
                      <span className="notif-time">{notif.time}</span>
                    </div>
                    {!notif.read && <div className="unread-indicator"></div>}
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      <div className="dashboard-container">
        <div className="welcome-banner">
          <div className="welcome-content">
            <div className="welcome-text">
              <h1 className="welcome-title">Good {currentTime.getHours() < 12 ? 'Morning' : currentTime.getHours() < 18 ? 'Afternoon' : 'Evening'}, Rajitha!</h1>
              <p className="welcome-subtitle">Here's your work overview for today</p>
            </div>
            <div className="quick-actions-banner">
              <button className="quick-action-btn primary" onClick={() => openHarvestModal(tasks[0])}>
                Report Harvest
              </button>
            </div>
          </div>
        </div>

        <div className="metrics-grid">
          <div className="metric-card completed">
            <div className="metric-icon-wrapper">
              <span className="metric-icon">✓</span>
            </div>
            <div className="metric-details">
              <h3 className="metric-value">{completedToday}</h3>
              <p className="metric-label">Completed</p>
              <div className="metric-change positive">+2 from yesterday</div>
            </div>
          </div>

          <div className="metric-card progress">
            <div className="metric-icon-wrapper">
              <span className="metric-icon">⚡</span>
            </div>
            <div className="metric-details">
              <h3 className="metric-value">{inProgress}</h3>
              <p className="metric-label">In Progress</p>
              <div className="metric-change neutral">Active now</div>
            </div>
          </div>

          <div className="metric-card pending">
            <div className="metric-icon-wrapper">
              <span className="metric-icon">⏱</span>
            </div>
            <div className="metric-details">
              <h3 className="metric-value">{pending}</h3>
              <p className="metric-label">Pending</p>
              <div className="metric-change neutral">Awaiting start</div>
            </div>
          </div>

          <div className="metric-card rate">
            <div className="metric-icon-wrapper">
              <span className="metric-icon">📈</span>
            </div>
            <div className="metric-details">
              <h3 className="metric-value">{completionRate}%</h3>
              <p className="metric-label">Completion Rate</p>
              <div className="progress-bar-mini">
                <div className="progress-fill-mini" style={{ width: `${completionRate}%` }}></div>
              </div>
            </div>
          </div>
        </div>

        <div className="attendance-card-modern">
          <div className="card-header-modern">
            <div className="header-icon-text">
              <span className="card-icon">📅</span>
              <div>
                <h3>Tomorrow's Attendance</h3>
                <p>Confirm your availability for October 23, 2025</p>
              </div>
            </div>
            <button 
              className={`attendance-toggle ${attendanceStatus.toLowerCase()}`}
              onClick={handleMarkAttendance}
            >
              <span className="toggle-icon">{attendanceStatus === 'Pending' ? '⏳' : '✓'}</span>
              <span>{attendanceStatus === 'Pending' ? 'Mark Present' : 'Confirmed'}</span>
            </button>
          </div>
        </div>

        <div className="tasks-section">
          <div className="section-header">
            <h2 className="section-title">Your Tasks</h2>
            <div className="tab-switcher">
              <button 
                className={`tab-btn ${activeTab === 'today' ? 'active' : ''}`}
                onClick={() => setActiveTab('today')}
              >
                Today ({tasks.length})
              </button>
              <button 
                className={`tab-btn ${activeTab === 'tomorrow' ? 'active' : ''}`}
                onClick={() => setActiveTab('tomorrow')}
              >
                Tomorrow ({tomorrowTasks.length})
              </button>
            </div>
          </div>

          <div className="tasks-grid">
            {(activeTab === 'today' ? tasks : tomorrowTasks).map(task => (
              <div key={task.id} className={`task-card-modern ${task.status.toLowerCase().replace(' ', '-')} priority-${task.priority}`}>
                <div className="task-header-modern">
                  <div className="task-badges">
                    <span className={`status-badge-modern ${task.status.toLowerCase().replace(' ', '-')}`}>
                      {task.status}
                    </span>
                  </div>
                  <div className="task-time-badge">
                    <span className="time-icon">🕐</span>
                    {task.dueTime}
                  </div>
                </div>

                <h3 className="task-title-modern">{task.name}</h3>
                <p className="task-description-modern">{task.description}</p>

                <div className="task-meta-grid">
                  <div className="meta-item">
                    <span className="meta-icon">🌾</span>
                    <div className="meta-content">
                      <label>Crop</label>
                      <p>{task.crop}</p>
                    </div>
                  </div>
                  <div className="meta-item">
                    <span className="meta-icon">📍</span>
                    <div className="meta-content">
                      <label>Location</label>
                      <p>{task.field}</p>
                    </div>
                  </div>
                  <div className="meta-item">
                    <span className="meta-icon">⏱</span>
                    <div className="meta-content">
                      <label>Duration</label>
                      <p>{task.estimatedTime}h</p>
                    </div>
                  </div>
                  <div className="meta-item">
                    <span className="meta-icon">👥</span>
                    <div className="meta-content">
                      <label>Team</label>
                      {task.team.map(member => <p key={member}>{member}</p>)}
                    </div>
                  </div>
                </div>

                {activeTab === 'today' && (
                  <div className="task-actions-modern">
                    {task.status === 'Assigned' && (
                      <button 
                        className="task-btn start-btn"
                        onClick={() => handleUpdateStatus(task.id, 'In Progress')}
                      >
                        Start Task
                      </button>
                    )}
                    {task.status === 'In Progress' && (
                      <>
                        <button 
                          className="task-btn complete-btn"
                          onClick={() => handleUpdateStatus(task.id, 'Completed')}
                        >
                          <span className="btn-icon">✓</span>
                          Complete
                        </button>

                        <button
                          className="task-btn unable-btn"
                          onClick={() => handleUnableToday(task)}
                        >
                          Unable Today
                        </button>

                        {showReasonInput[task.id] && (
                          <div className="reason-popup-overlay">
                            <div className="reason-popup">
                              <h4>Enter Reason</h4>
                              <input
                                type="text"
                                placeholder="Enter reason for postponing"
                                value={taskReasons[task.id] || ''}
                                onChange={(e) =>
                                  setTaskReasons(prev => ({ ...prev, [task.id]: e.target.value }))
                                }
                                className="task-reason-input"
                              />
                              <div className="popup-btns">
                                <button
                                  className="submit-reason-btn"
                                  onClick={() => submitReason(task)}
                                >
                                  Submit
                                </button>
                                <button
                                  className="cancel-reason-btn"
                                  onClick={() =>
                                    setShowReasonInput(prev => ({ ...prev, [task.id]: false }))
                                  }
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          </div>
                        )}

                      </>
                    )}
                    {task.status === 'Completed' && (
                      <div className="completed-indicator">
                        <span className="check-icon">✓</span>
                        Task Completed
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {showHarvestModal && (
        <div className="modal-overlay-fullscreen" onClick={() => setShowHarvestModal(false)}>
          <div className="modal-content-fullscreen" onClick={(e) => e.stopPropagation()}>
            <button className="close-modal-btn" onClick={() => setShowHarvestModal(false)}>
              ✕
            </button>
            
            <div className="modal-layout">
              <div className="modal-sidebar">
                <div className="modal-branding">
                  <h1>Report Harvest</h1>
                  <p>Submit your daily productivity data</p>
                </div>
                
                <div className="task-info-panel">
                  <h3>Task Information</h3>
                  <div className="info-item">
                    <span className="info-label">Task Name</span>
                    <p>{selectedTask?.name}</p>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Field</span>
                    <p>{selectedTask?.field}</p>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Crop</span>
                    <p>{selectedTask?.crop}</p>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Supervisor</span>
                    <p>{selectedTask?.supervisor}</p>
                  </div>
                </div>
              </div>
              
              <div className="modal-main">
                <form className="harvest-form">
                  <div className="form-group">
                    <label>Quantity Harvested (kg)</label>
                    <input type="number" placeholder="Enter harvested quantity" />
                  </div>
                  <div className="form-group">
                    <label>Notes / Observations</label>
                    <textarea placeholder="Add any remarks"></textarea>
                  </div>
                  <button type="submit" className="submit-harvest-btn">Submit</button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkerDashboard;
