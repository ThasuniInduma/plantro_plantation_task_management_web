import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SideNav from '../../../components/SideNav';
import {
  FiChevronLeft,
  FiChevronRight,
  FiSearch,
  FiFilter,
  FiEdit2,
  FiTrash2,
  FiCheck,
  FiDownload,
  FiCalendar,
  FiX,
  FiUser,
  FiArrowRight,
} from 'react-icons/fi';
import './Tasks.css';

const Tasks = () => {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date(2026, 0, 28));
  const [selectedDate, setSelectedDate] = useState(new Date(2026, 0, 28));

  const [activeTab, setActiveTab] = useState('tasks');

  // All available tasks
  const allTasks = [
    { id: 'TASK-001', title: 'Field Irrigation Setup', description: 'Set up irrigation system', date: '2026-01-28', priority: 'high' },
    { id: 'TASK-002', title: 'Crop Pest Control', description: 'Apply pesticide on wheat crop', date: '2026-01-28', priority: 'high' },
    { id: 'TASK-003', title: 'Soil Testing', description: 'Collect and test soil samples', date: '2026-01-29', priority: 'medium' },
    { id: 'TASK-004', title: 'Pruning & Maintenance', description: 'Prune trees and maintain equipment', date: '2026-01-30', priority: 'medium' },
    { id: 'TASK-005', title: 'Harvest Preparation', description: 'Prepare harvesting equipment', date: '2026-01-31', priority: 'low' },
    { id: 'TASK-006', title: 'Fertilizer Application', description: 'Apply fertilizer to north field', date: '2026-01-28', priority: 'high' },
    { id: 'TASK-007', title: 'Equipment Maintenance', description: 'Service farm equipment', date: '2026-02-01', priority: 'medium' },
    { id: 'TASK-008', title: 'Field Inspection', description: 'Inspect all fields for issues', date: '2026-01-29', priority: 'low' },
  ];

  // All available workers
  const allWorkers = [
    { id: 'W001', name: 'Raj Kumar', role: 'Worker', department: 'Field Operations', phone: '9876543210' },
    { id: 'W002', name: 'Kamal K.', role: 'Worker', department: 'Field Management', phone: '9876543211' },
    { id: 'W003', name: 'Nimal S.', role: 'Worker', department: 'Pruning', phone: '9876543212' },
    { id: 'W004', name: 'Pooja M.', role: 'Worker', department: 'Maintenance', phone: '9876543213' },
    { id: 'W005', name: 'Anil V.', role: 'Worker', department: 'Field Operations', phone: '9876543214' },
  ];

  const [taskAssignments, setTaskAssignments] = useState([
    { taskId: 'TASK-001', workerId: 'W001' },
    { taskId: 'TASK-002', workerId: 'W002' },
  ]);

  const [tasksForDay, setTasksForDay] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPriority, setFilterPriority] = useState('all');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [selectedWorker, setSelectedWorker] = useState('');

  // Update tasks when selected date changes
  useEffect(() => {
    const dateStr = selectedDate.toISOString().split('T')[0];
    let filtered = allTasks.filter((task) => task.date === dateStr);

    if (filterPriority !== 'all') {
      filtered = filtered.filter((task) => task.priority === filterPriority);
    }

    if (searchTerm) {
      filtered = filtered.filter(
        (task) =>
          task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          task.id.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setTasksForDay(filtered);
  }, [selectedDate, filterPriority, searchTerm]);

  // Get worker name by ID
  const getWorkerName = (workerId) => {
    return allWorkers.find((w) => w.id === workerId)?.name || 'Unassigned';
  };

  // Check if task is assigned
  const isTaskAssigned = (taskId) => {
    return taskAssignments.some((a) => a.taskId === taskId);
  };

  // Get assigned worker for task
  const getAssignedWorker = (taskId) => {
    const assignment = taskAssignments.find((a) => a.taskId === taskId);
    return assignment ? getWorkerName(assignment.workerId) : null;
  };

  // Assign worker to task
  const handleAssignWorker = (taskId, workerId) => {
    const existing = taskAssignments.find((a) => a.taskId === taskId);
    if (existing) {
      setTaskAssignments(
        taskAssignments.map((a) =>
          a.taskId === taskId ? { ...a, workerId } : a
        )
      );
    } else {
      setTaskAssignments([...taskAssignments, { taskId, workerId }]);
    }
    setShowAssignModal(false);
    setSelectedTask(null);
    setSelectedWorker('');
  };

  // Remove assignment
  const handleRemoveAssignment = (taskId) => {
    setTaskAssignments(taskAssignments.filter((a) => a.taskId !== taskId));
  };

  // Get priority color
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return '#ef4444';
      case 'medium':
        return '#f59e0b';
      case 'low':
        return '#10b981';
      default:
        return '#6b7280';
    }
  };

  // Calendar functions
  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const selectDate = (day) => {
    setSelectedDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), day));
  };

  // Generate calendar days
  const generateCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];

    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }

    return days;
  };

  const calendarDays = generateCalendarDays();
  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  const selectedDateStr = selectedDate.toISOString().split('T')[0];
  const currentDateStr = new Date(2026, 0, 28).toISOString().split('T')[0];

  const taskStats = {
    total: tasksForDay.length,
    assigned: tasksForDay.filter((t) => isTaskAssigned(t.id)).length,
    pending: tasksForDay.filter((t) => !isTaskAssigned(t.id)).length,
  };

  return (
    <div className="task-layout">
      <SideNav
                role="supervisor"
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                userName="Supervisor S001"
                userRole="Attendance Manager"
            />

      <div className="main-content">
        {/* Header */}
        <div className="content-header">
          <div className="header-left">
            <h1 className="page-title">Task Management</h1>
            <p className="page-subtitle">Assign tasks to workers by date</p>
          </div>
          
        </div>

        {/* Content Body */}
        <div className="content-body">
          <div className="task-container">
            {/* Left: Calendar Section */}
            <div className="calendar-section">
              {/* Calendar */}
              <div className="calendar-card">
                <div className="calendar-header">
                  <button className="calendar-nav-btn" onClick={previousMonth}>
                    <FiChevronLeft size={18} />
                  </button>
                  <h3 className="calendar-month">{monthName}</h3>
                  <button className="calendar-nav-btn" onClick={nextMonth}>
                    <FiChevronRight size={18} />
                  </button>
                </div>

                {/* Weekdays */}
                <div className="weekdays">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                    <div key={day} className="weekday">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Days */}
                <div className="calendar-days">
                  {calendarDays.map((day, index) => {
                    if (day === null) {
                      return <div key={`empty-${index}`} className="calendar-day empty"></div>;
                    }

                    const dateStr = new Date(
                      currentDate.getFullYear(),
                      currentDate.getMonth(),
                      day
                    )
                      .toISOString()
                      .split('T')[0];
                    
                    const tasksCount = allTasks.filter((t) => t.date === dateStr).length;
                    const isSelected = selectedDateStr === dateStr;
                    const isToday = currentDateStr === dateStr;

                    return (
                      <button
                        key={day}
                        className={`calendar-day ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''} ${tasksCount > 0 ? 'has-tasks' : ''}`}
                        onClick={() => selectDate(day)}
                      >
                        <span className="day-number">{day}</span>
                        {tasksCount > 0 && <span className="task-badge">{tasksCount}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Quick Stats */}
              <div className="stats-card">
                <div className="stat-item">
                  <span className="stat-label">Total Tasks</span>
                  <span className="stat-value">{taskStats.total}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Assigned</span>
                  <span className="stat-value assigned">{taskStats.assigned}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Pending</span>
                  <span className="stat-value pending">{taskStats.pending}</span>
                </div>
              </div>
            </div>

            {/* Right: Tasks Section */}
            <div className="tasks-section">
              {/* Date Display */}
              <div className="date-display">
                <FiCalendar size={20} />
                <h2>{selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</h2>
              </div>

              {/* Filters */}
              <div className="filters-section">
                <div className="search-box">
                  <FiSearch size={16} />
                  <input
                    type="text"
                    className="search-input"
                    placeholder="Search tasks..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                <div className="filter-group">
                  <label>
                    <FiFilter size={14} />
                    Priority
                  </label>
                  <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
                    <option value="all">All Priorities</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>

              {/* Tasks List */}
              {tasksForDay.length === 0 ? (
                <div className="no-tasks">
                  <p>No tasks for this date</p>
                </div>
              ) : (
                <div className="tasks-list">
                  {tasksForDay.map((task) => {
                    const assignedWorker = getAssignedWorker(task.id);

                    return (
                      <div key={task.id} className="task-item">
                        <div className="task-info">
                          <div className="task-header">
                            <h4 className="task-title">{task.title}</h4>
                            <span
                              className="priority-badge"
                              style={{ backgroundColor: getPriorityColor(task.priority) }}
                            >
                              {task.priority}
                            </span>
                          </div>
                          <p className="task-description">{task.description}</p>
                          <span className="task-id">{task.id}</span>
                        </div>

                        <div className="task-assignment">
                          {assignedWorker ? (
                            <div className="assigned-worker">
                              <FiUser size={16} />
                              <span>{assignedWorker}</span>
                              <button
                                className="remove-btn"
                                onClick={() => handleRemoveAssignment(task.id)}
                                title="Remove assignment"
                              >
                                <FiX size={14} />
                              </button>
                            </div>
                          ) : (
                            <div className="unassigned">
                              <span>Unassigned</span>
                            </div>
                          )}

                          <button
                            className="assign-btn"
                            onClick={() => {
                              setSelectedTask(task);
                              setSelectedWorker(assignedWorker ? allWorkers.find((w) => w.name === assignedWorker)?.id || '' : '');
                              setShowAssignModal(true);
                            }}
                          >
                            <FiArrowRight size={16} />
                            {assignedWorker ? 'Change' : 'Assign'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Assign Worker Modal */}
      {showAssignModal && selectedTask && (
        <div className="modal-overlay" onClick={() => setShowAssignModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>Assign Worker</h2>
                <p>{selectedTask.title}</p>
              </div>
              <button className="modal-close" onClick={() => setShowAssignModal(false)}>
                <FiX size={24} />
              </button>
            </div>

            <div className="modal-body">
              <p className="modal-subtitle">Select a worker to assign to this task</p>

              <div className="workers-list">
                {allWorkers.map((worker) => (
                  <div
                    key={worker.id}
                    className={`worker-option ${selectedWorker === worker.id ? 'selected' : ''}`}
                    onClick={() => setSelectedWorker(worker.id)}
                  >
                    <div className="worker-info">
                      <h4>{worker.name}</h4>
                      <p>{worker.role} • {worker.department}</p>
                    </div>
                    <div className={`checkbox ${selectedWorker === worker.id ? 'checked' : ''}`}>
                      {selectedWorker === worker.id && <FiCheck size={16} />}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowAssignModal(false)}>
                Cancel
              </button>
              <button
                className="btn-assign"
                onClick={() => handleAssignWorker(selectedTask.id, selectedWorker)}
                disabled={!selectedWorker}
              >
                <FiCheck size={16} />
                Confirm Assignment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tasks;
