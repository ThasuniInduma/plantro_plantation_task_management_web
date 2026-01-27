import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SideNav from '../../components/SideNav';
import {
    FiPlus, FiEdit2, FiTrash2, FiSave, FiX, FiSearch,
    FiFilter, FiDownload, FiClock, FiUsers, FiBell,
    FiCalendar, FiCheckCircle, FiAlertCircle, FiMapPin,
    FiPhone, FiMail, FiUser, FiAward, FiTrendingUp, FiClipboard
} from 'react-icons/fi';
import './workforceManagement.css';

// Mock data for workers
const initialWorkers = [
    {
        id: 'W001',
        name: 'Kamal Jayasuriya',
        email: 'kamal@plantation.com',
        phone: '+94701234567',
        role: 'Supervisor',
        status: 'active',
        location: 'Nuwara Eliya District',
        specialty: ['Tea', 'Tuning'],
        joinDate: '2024-01-15',
        manHoursPerDay: 8,
        assignedTasks: 5,
        completionRate: 95,
        availability: 'Available'
    },
    {
        id: 'W002',
        name: 'Pradeep Silva',
        email: 'pradeep@plantation.com',
        phone: '+94712345678',
        role: 'Worker',
        status: 'active',
        location: 'Kandy District',
        specialty: ['Coconut', 'Harvesting'],
        joinDate: '2024-02-20',
        manHoursPerDay: 6,
        assignedTasks: 3,
        completionRate: 88,
        availability: 'Available'
    },
    {
        id: 'W003',
        name: 'Sanjeewa Perera',
        email: 'sanjeewa@plantation.com',
        phone: '+94723456789',
        role: 'Worker',
        status: 'inactive',
        location: 'Kegalle District',
        specialty: ['Rubber', 'Tapping'],
        joinDate: '2024-03-10',
        manHoursPerDay: 7,
        assignedTasks: 2,
        completionRate: 85,
        availability: 'Not Available'
    }
];

const WorkforceManagement = ({ logo }) => {
    const [workers, setWorkers] = useState(initialWorkers);
    const [selectedWorker, setSelectedWorker] = useState(null);
    const [activeTab, setActiveTab] = useState('workforce');
    const [showAddWorkerModal, setShowAddWorkerModal] = useState(false);
    const [showAssignTaskModal, setShowAssignTaskModal] = useState(false);
    const [editingWorker, setEditingWorker] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterRole, setFilterRole] = useState('all');
    const navigate = useNavigate();

    // Form states
    const [newWorker, setNewWorker] = useState({
        name: '',
        email: '',
        phone: '',
        role: 'Worker',
        location: '',
        specialty: [],
        manHoursPerDay: ''
    });

    const [taskAssignment, setTaskAssignment] = useState({
        taskName: '',
        fieldName: '',
        hoursRequired: '',
        dueDate: '',
        priority: 'medium'
    });

    const specialtyOptions = ['Tea', 'Coconut', 'Rubber', 'Cinnamon', 'Tuning', 'Plucking', 'Harvesting', 'Tapping', 'Weeding', 'Pest Control'];

    // Handle Add Worker
    const handleAddWorker = () => {
        if (newWorker.name && newWorker.email && newWorker.phone && newWorker.location && newWorker.specialty.length > 0 && newWorker.manHoursPerDay) {
            const worker = {
                id: `W${String(workers.length + 1).padStart(3, '0')}`,
                name: newWorker.name,
                email: newWorker.email,
                phone: newWorker.phone,
                role: newWorker.role,
                location: newWorker.location,
                specialty: newWorker.specialty,
                joinDate: new Date().toISOString().split('T')[0],
                manHoursPerDay: parseInt(newWorker.manHoursPerDay),
                assignedTasks: 0,
                completionRate: 0,
                status: 'active',
                availability: 'Available'
            };
            setWorkers([...workers, worker]);
            setNewWorker({
                name: '',
                email: '',
                phone: '',
                role: 'Worker',
                location: '',
                specialty: [],
                manHoursPerDay: ''
            });
            setShowAddWorkerModal(false);
        } else {
            alert('Please fill all required fields');
        }
    };

    // Handle Edit Worker
    const handleEditWorker = (worker) => {
        setEditingWorker(worker);
        setNewWorker({
            name: worker.name,
            email: worker.email,
            phone: worker.phone,
            role: worker.role,
            location: worker.location,
            specialty: worker.specialty,
            manHoursPerDay: worker.manHoursPerDay.toString()
        });
        setShowAddWorkerModal(true);
    };

    // Handle Update Worker
    const handleUpdateWorker = () => {
        if (editingWorker) {
            setWorkers(workers.map(w =>
                w.id === editingWorker.id
                    ? {
                        ...w,
                        name: newWorker.name,
                        email: newWorker.email,
                        phone: newWorker.phone,
                        role: newWorker.role,
                        location: newWorker.location,
                        specialty: newWorker.specialty,
                        manHoursPerDay: parseInt(newWorker.manHoursPerDay)
                    }
                    : w
            ));
            setEditingWorker(null);
            setNewWorker({
                name: '',
                email: '',
                phone: '',
                role: 'Worker',
                location: '',
                specialty: [],
                manHoursPerDay: ''
            });
            setShowAddWorkerModal(false);
        }
    };

    // Handle Delete Worker
    const handleDeleteWorker = (workerId) => {
        if (window.confirm('Are you sure you want to remove this worker?')) {
            setWorkers(workers.filter(w => w.id !== workerId));
            if (selectedWorker?.id === workerId) {
                setSelectedWorker(null);
            }
        }
    };

    // Handle Assign Task
    const handleAssignTask = () => {
        if (selectedWorker && taskAssignment.taskName && taskAssignment.fieldName && taskAssignment.hoursRequired && taskAssignment.dueDate) {
            setSelectedWorker({
                ...selectedWorker,
                assignedTasks: selectedWorker.assignedTasks + 1
            });
            setTaskAssignment({
                taskName: '',
                fieldName: '',
                hoursRequired: '',
                dueDate: '',
                priority: 'medium'
            });
            setShowAssignTaskModal(false);
            alert('Task assigned successfully!');
        } else {
            alert('Please fill all required fields');
        }
    };

    // Handle Change Availability
    const handleChangeAvailability = (workerId) => {
        setWorkers(workers.map(w =>
            w.id === workerId
                ? {
                    ...w,
                    availability: w.availability === 'Available' ? 'Not Available' : 'Available'
                }
                : w
        ));
    };

    // Handle Change Status
    const handleChangeStatus = (workerId) => {
        setWorkers(workers.map(w =>
            w.id === workerId
                ? {
                    ...w,
                    status: w.status === 'active' ? 'inactive' : 'active'
                }
                : w
        ));
    };

    // Toggle specialty selection
    const toggleSpecialty = (specialty) => {
        setNewWorker(prev => ({
            ...prev,
            specialty: prev.specialty.includes(specialty)
                ? prev.specialty.filter(s => s !== specialty)
                : [...prev.specialty, specialty]
        }));
    };

    // Filter workers
    const filteredWorkers = workers.filter(worker => {
        const matchesSearch = worker.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            worker.location.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = filterStatus === 'all' || worker.status === filterStatus;
        const matchesRole = filterRole === 'all' || worker.role === filterRole;
        return matchesSearch && matchesStatus && matchesRole;
    });

    // Close modals
    const closeModals = () => {
        setShowAddWorkerModal(false);
        setShowAssignTaskModal(false);
        setEditingWorker(null);
        setNewWorker({
            name: '',
            email: '',
            phone: '',
            role: 'Worker',
            location: '',
            specialty: [],
            manHoursPerDay: ''
        });
        setTaskAssignment({
            taskName: '',
            fieldName: '',
            hoursRequired: '',
            dueDate: '',
            priority: 'medium'
        });
    };

    return (
        <div className="workforce-management-layout">
            <SideNav
                role="admin"
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                userName="Admin User"
                userRole="Plantation Owner"
                logo={logo}
            />

            <div className="main-content">
                {/* Header */}
                <header className="content-header">
                    <div className="header-left">
                        <h1 className="page-title">Workforce Management</h1>
                        <p className="page-subtitle">Register, manage, and assign workers to tasks</p>
                    </div>
                    <div className="header-actions">
                        <button className="notification-btn">
                            <FiBell />
                            <span className="notification-badge">5</span>
                        </button>
                    </div>
                </header>

                {/* Main Content */}
                <main className="content-body">
                    <div className="workforce-management-container">
                        {/* Left Panel - Workers List */}
                        <div className="workers-panel">
                            <div className="panel-header">
                                <h2>Workforce</h2>
                                <button className="add-btn" onClick={() => setShowAddWorkerModal(true)}>
                                    <FiPlus /> Add Worker
                                </button>
                            </div>

                            {/* Search and Filter */}
                            <div className="search-and-filters">
                                <div className="search-bar">
                                    <FiSearch className="search-icon" />
                                    <input
                                        type="text"
                                        placeholder="Search workers or location..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>

                                <div className="filter-row">
                                    <div className="filter-group">
                                        <label>Status</label>
                                        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                                            <option value="all">All</option>
                                            <option value="active">Active</option>
                                            <option value="inactive">Inactive</option>
                                        </select>
                                    </div>
                                    <div className="filter-group">
                                        <label>Role</label>
                                        <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)}>
                                            <option value="all">All</option>
                                            <option value="Supervisor">Supervisor</option>
                                            <option value="Worker">Worker</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Workers List */}
                            <div className="workers-list">
                                {filteredWorkers.map(worker => (
                                    <div
                                        key={worker.id}
                                        className={`worker-item ${selectedWorker?.id === worker.id ? 'active' : ''}`}
                                        onClick={() => setSelectedWorker(worker)}
                                    >
                                        <div className="worker-item-header">
                                            <div className="worker-info">
                                                <h3>{worker.name}</h3>
                                                <span className={`role-badge ${worker.role.toLowerCase()}`}>{worker.role}</span>
                                            </div>
                                            <span className={`status-badge ${worker.status}`}>{worker.status}</span>
                                        </div>
                                        <div className="worker-details">
                                            <p><FiMapPin className="icon" /> {worker.location}</p>
                                            <p><FiClock className="icon" /> {worker.manHoursPerDay} hrs/day</p>
                                        </div>
                                        <div className="worker-stats">
                                            <div className="stat">
                                                <span className="label">Tasks</span>
                                                <span className="value">{worker.assignedTasks}</span>
                                            </div>
                                            <div className="stat">
                                                <span className="label">Completion</span>
                                                <span className="value">{worker.completionRate}%</span>
                                            </div>
                                        </div>
                                        <div className="worker-item-actions">
                                            <button
                                                className="icon-btn edit"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleEditWorker(worker);
                                                }}
                                            >
                                                <FiEdit2 />
                                            </button>
                                            <button
                                                className="icon-btn delete"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteWorker(worker.id);
                                                }}
                                            >
                                                <FiTrash2 />
                                            </button>
                                        </div>
                                    </div>
                                ))}

                                {filteredWorkers.length === 0 && (
                                    <div className="empty-state">
                                        <p>No workers found</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Right Panel - Worker Details */}
                        <div className="details-panel">
                            {selectedWorker ? (
                                <>
                                    <div className="panel-header">
                                        <div>
                                            <h2>{selectedWorker.name}</h2>
                                            <p className="panel-subtitle">{selectedWorker.role} • {selectedWorker.location}</p>
                                        </div>
                                        <button
                                            className="add-btn"
                                            onClick={() => setShowAssignTaskModal(true)}
                                        >
                                            <FiClipboard /> Assign Task
                                        </button>
                                    </div>

                                    {/* Worker Info Tabs */}
                                    <div className="details-tabs">
                                        {/* Overview Tab */}
                                        <div className="tab-content active">
                                            <div className="info-grid">
                                                <div className="info-card">
                                                    <span className="info-label">Email</span>
                                                    <span className="info-value">
                                                        <FiMail className="icon" /> {selectedWorker.email}
                                                    </span>
                                                </div>
                                                <div className="info-card">
                                                    <span className="info-label">Phone</span>
                                                    <span className="info-value">
                                                        <FiPhone className="icon" /> {selectedWorker.phone}
                                                    </span>
                                                </div>
                                                <div className="info-card">
                                                    <span className="info-label">Join Date</span>
                                                    <span className="info-value">
                                                        <FiCalendar className="icon" /> {selectedWorker.joinDate}
                                                    </span>
                                                </div>
                                                <div className="info-card">
                                                    <span className="info-label">Availability</span>
                                                    <span className={`info-value availability-${selectedWorker.availability.toLowerCase()}`}>
                                                        {selectedWorker.availability}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Specialties */}
                                            <div className="specialties-section">
                                                <h3>Specialties</h3>
                                                <div className="specialty-tags">
                                                    {selectedWorker.specialty.map((spec, idx) => (
                                                        <span key={idx} className="specialty-tag">
                                                            <FiAward className="icon" /> {spec}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Performance */}
                                            <div className="performance-section">
                                                <h3>Performance</h3>
                                                <div className="performance-grid">
                                                    <div className="performance-card">
                                                        <div className="perf-icon">
                                                            <FiClipboard />
                                                        </div>
                                                        <div className="perf-info">
                                                            <span className="perf-label">Assigned Tasks</span>
                                                            <span className="perf-value">{selectedWorker.assignedTasks}</span>
                                                        </div>
                                                    </div>
                                                    <div className="performance-card">
                                                        <div className="perf-icon">
                                                            <FiCheckCircle />
                                                        </div>
                                                        <div className="perf-info">
                                                            <span className="perf-label">Completion Rate</span>
                                                            <span className="perf-value">{selectedWorker.completionRate}%</span>
                                                        </div>
                                                    </div>
                                                    <div className="performance-card">
                                                        <div className="perf-icon">
                                                            <FiClock />
                                                        </div>
                                                        <div className="perf-info">
                                                            <span className="perf-label">Hours/Day</span>
                                                            <span className="perf-value">{selectedWorker.manHoursPerDay}h</span>
                                                        </div>
                                                    </div>
                                                    <div className="performance-card">
                                                        <div className="perf-icon">
                                                            <FiTrendingUp />
                                                        </div>
                                                        <div className="perf-info">
                                                            <span className="perf-label">Status</span>
                                                            <span className="perf-value">{selectedWorker.status}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="action-buttons">
                                                <button
                                                    className="btn-action primary"
                                                    onClick={() => handleChangeAvailability(selectedWorker.id)}
                                                >
                                                    {selectedWorker.availability === 'Available' ? 'Mark Unavailable' : 'Mark Available'}
                                                </button>
                                                <button
                                                    className="btn-action secondary"
                                                    onClick={() => handleChangeStatus(selectedWorker.id)}
                                                >
                                                    {selectedWorker.status === 'active' ? 'Deactivate' : 'Activate'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="empty-state large">
                                    <FiUser className="empty-icon" />
                                    <h3>Select a worker to view details</h3>
                                    <p>Choose a worker from the left panel to manage their profile and assignments</p>
                                </div>
                            )}
                        </div>
                    </div>
                </main>
            </div>

            {/* Add/Edit Worker Modal */}
            {showAddWorkerModal && (
                <div className="modal-overlay" onClick={closeModals}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editingWorker ? 'Edit Worker' : 'Register New Worker'}</h2>
                            <button className="close-btn" onClick={closeModals}>
                                <FiX />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Full Name *</label>
                                    <input
                                        type="text"
                                        placeholder="Enter worker's full name"
                                        value={newWorker.name}
                                        onChange={(e) => setNewWorker({ ...newWorker, name: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Role *</label>
                                    <select
                                        value={newWorker.role}
                                        onChange={(e) => setNewWorker({ ...newWorker, role: e.target.value })}
                                    >
                                        <option value="Worker">Worker</option>
                                        <option value="Supervisor">Supervisor</option>
                                    </select>
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Email *</label>
                                    <input
                                        type="email"
                                        placeholder="worker@plantation.com"
                                        value={newWorker.email}
                                        onChange={(e) => setNewWorker({ ...newWorker, email: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Phone *</label>
                                    <input
                                        type="tel"
                                        placeholder="+94701234567"
                                        value={newWorker.phone}
                                        onChange={(e) => setNewWorker({ ...newWorker, phone: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Location *</label>
                                    <select
                                        value={newWorker.location}
                                        onChange={(e) => setNewWorker({ ...newWorker, location: e.target.value })}
                                    >
                                        <option value="">Select location...</option>
                                        <option value="Nuwara Eliya District">Nuwara Eliya District</option>
                                        <option value="Kandy District">Kandy District</option>
                                        <option value="Kegalle District">Kegalle District</option>
                                        <option value="Matara District">Matara District</option>
                                        <option value="Galle District">Galle District</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Man-Hours Per Day *</label>
                                    <input
                                        type="number"
                                        placeholder="e.g., 6, 8"
                                        value={newWorker.manHoursPerDay}
                                        onChange={(e) => setNewWorker({ ...newWorker, manHoursPerDay: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Specialties *</label>
                                <div className="specialty-checkboxes">
                                    {specialtyOptions.map(specialty => (
                                        <label key={specialty} className="checkbox-label">
                                            <input
                                                type="checkbox"
                                                checked={newWorker.specialty.includes(specialty)}
                                                onChange={() => toggleSpecialty(specialty)}
                                            />
                                            <span>{specialty}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-secondary" onClick={closeModals}>
                                Cancel
                            </button>
                            <button
                                className="btn-primary"
                                onClick={editingWorker ? handleUpdateWorker : handleAddWorker}
                            >
                                <FiSave /> {editingWorker ? 'Update' : 'Register'} Worker
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Assign Task Modal */}
            {showAssignTaskModal && selectedWorker && (
                <div className="modal-overlay" onClick={closeModals}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Assign Task to {selectedWorker.name}</h2>
                            <button className="close-btn" onClick={closeModals}>
                                <FiX />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Task Name *</label>
                                    <input
                                        type="text"
                                        placeholder="e.g., Tuning, Plucking"
                                        value={taskAssignment.taskName}
                                        onChange={(e) => setTaskAssignment({ ...taskAssignment, taskName: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Field Name *</label>
                                    <input
                                        type="text"
                                        placeholder="e.g., Field A, Field B"
                                        value={taskAssignment.fieldName}
                                        onChange={(e) => setTaskAssignment({ ...taskAssignment, fieldName: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Hours Required *</label>
                                    <input
                                        type="number"
                                        placeholder="e.g., 4, 6"
                                        value={taskAssignment.hoursRequired}
                                        onChange={(e) => setTaskAssignment({ ...taskAssignment, hoursRequired: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Due Date *</label>
                                    <input
                                        type="date"
                                        value={taskAssignment.dueDate}
                                        onChange={(e) => setTaskAssignment({ ...taskAssignment, dueDate: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Priority</label>
                                <select
                                    value={taskAssignment.priority}
                                    onChange={(e) => setTaskAssignment({ ...taskAssignment, priority: e.target.value })}
                                >
                                    <option value="low">Low</option>
                                    <option value="medium">Medium</option>
                                    <option value="high">High</option>
                                </select>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-secondary" onClick={closeModals}>
                                Cancel
                            </button>
                            <button
                                className="btn-primary"
                                onClick={handleAssignTask}
                            >
                                <FiSave /> Assign Task
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WorkforceManagement;
