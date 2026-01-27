import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SideNav from '../../components/SideNav';
import {
    FiPlus, FiEdit2, FiTrash2, FiSave, FiX, FiSearch,
    FiFilter, FiDownload, FiClock, FiUsers, FiBell,
    FiCalendar, FiCheckCircle, FiAlertCircle
} from 'react-icons/fi';
import './cropManagement.css';

// Mock data for crops and their tasks
const initialCrops = [
    {
        id: 'C001',
        name: 'Tea',
        description: 'Premium Ceylon tea cultivation',
        tasks: [
            { id: 'T001', name: 'Tuning', description: 'Fine adjustment of tea bushes shape', frequency: 180, manHours: 18 },
            { id: 'T002', name: 'Plucking', description: 'Harvesting young tea leaves', frequency: 7, manHours: 20 },
            { id: 'T003', name: 'Fertilizing', description: 'Adding fertilizers to improve soil', frequency: 90, manHours: 10 },
            { id: 'T004', name: 'Pest Control', description: 'Applying pesticides or eco-control methods', frequency: 45, manHours: 12 },
            { id: 'T005', name: 'Weeding', description: 'Removal of unwanted plants', frequency: 30, manHours: 15 },
            { id: 'T006', name: 'Pruning', description: 'Cutting back tea bushes', frequency: 365, manHours: 30 }
        ]
    },
    {
        id: 'C002',
        name: 'Coconut',
        description: 'High-yield coconut plantation',
        tasks: [
            { id: 'T007', name: 'Harvesting', description: 'Collecting mature coconuts', frequency: 60, manHours: 15 },
            { id: 'T008', name: 'De-husking', description: 'Removing husks for processing', frequency: 60, manHours: 8 },
            { id: 'T009', name: 'Fertilizing', description: 'Application of fertilizer', frequency: 120, manHours: 12 },
            { id: 'T010', name: 'Weeding', description: 'Clearing weeds at base of palms', frequency: 90, manHours: 10 }
        ]
    },
    {
        id: 'C003',
        name: 'Rubber',
        description: 'Natural rubber latex production',
        tasks: [
            { id: 'T011', name: 'Tapping', description: 'Extracting latex from rubber trees', frequency: 2, manHours: 10 },
            { id: 'T012', name: 'Fertilizing', description: 'Fertilizer application', frequency: 90, manHours: 12 },
            { id: 'T013', name: 'Weeding', description: 'Clearing weeds under rubber canopy', frequency: 60, manHours: 10 }
        ]
    }
];

const CropManagement = ({ logo }) => {
    const [crops, setCrops] = useState(initialCrops);
    const [selectedCrop, setSelectedCrop] = useState(null);
    const [activeTab, setActiveTab] = useState('crops');
    const [showAddCropModal, setShowAddCropModal] = useState(false);
    const [showAddTaskModal, setShowAddTaskModal] = useState(false);
    const [editingCrop, setEditingCrop] = useState(null);
    const [editingTask, setEditingTask] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const navigate = useNavigate();

    // Form states
    const [newCrop, setNewCrop] = useState({ name: '', description: '' });
    const [newTask, setNewTask] = useState({ name: '', description: '', frequency: '', manHours: '' });

    // Handle Add Crop
    const handleAddCrop = () => {
        if (newCrop.name && newCrop.description) {
            const crop = {
                id: `C${String(crops.length + 1).padStart(3, '0')}`,
                name: newCrop.name,
                description: newCrop.description,
                tasks: []
            };
            setCrops([...crops, crop]);
            setNewCrop({ name: '', description: '' });
            setShowAddCropModal(false);
        }
    };

    // Handle Edit Crop
    const handleEditCrop = (crop) => {
        setEditingCrop(crop);
        setNewCrop({ name: crop.name, description: crop.description });
        setShowAddCropModal(true);
    };

    // Handle Update Crop
    const handleUpdateCrop = () => {
        if (editingCrop) {
            setCrops(crops.map(c => 
                c.id === editingCrop.id 
                    ? { ...c, name: newCrop.name, description: newCrop.description }
                    : c
            ));
            setEditingCrop(null);
            setNewCrop({ name: '', description: '' });
            setShowAddCropModal(false);
        }
    };

    // Handle Delete Crop
    const handleDeleteCrop = (cropId) => {
        if (window.confirm('Are you sure you want to delete this crop? All associated tasks will be removed.')) {
            setCrops(crops.filter(c => c.id !== cropId));
            if (selectedCrop?.id === cropId) {
                setSelectedCrop(null);
            }
        }
    };

    // Handle Add Task
    const handleAddTask = () => {
        if (selectedCrop && newTask.name && newTask.description && newTask.frequency && newTask.manHours) {
            const task = {
                id: `T${String(Date.now()).slice(-3)}`,
                name: newTask.name,
                description: newTask.description,
                frequency: parseInt(newTask.frequency),
                manHours: parseInt(newTask.manHours)
            };
            
            setCrops(crops.map(c => 
                c.id === selectedCrop.id 
                    ? { ...c, tasks: [...c.tasks, task] }
                    : c
            ));
            
            setSelectedCrop({ ...selectedCrop, tasks: [...selectedCrop.tasks, task] });
            setNewTask({ name: '', description: '', frequency: '', manHours: '' });
            setShowAddTaskModal(false);
        }
    };

    // Handle Edit Task
    const handleEditTask = (task) => {
        setEditingTask(task);
        setNewTask({
            name: task.name,
            description: task.description,
            frequency: task.frequency.toString(),
            manHours: task.manHours.toString()
        });
        setShowAddTaskModal(true);
    };

    // Handle Update Task
    const handleUpdateTask = () => {
        if (editingTask && selectedCrop) {
            const updatedTasks = selectedCrop.tasks.map(t =>
                t.id === editingTask.id
                    ? {
                        ...t,
                        name: newTask.name,
                        description: newTask.description,
                        frequency: parseInt(newTask.frequency),
                        manHours: parseInt(newTask.manHours)
                    }
                    : t
            );

            setCrops(crops.map(c =>
                c.id === selectedCrop.id
                    ? { ...c, tasks: updatedTasks }
                    : c
            ));

            setSelectedCrop({ ...selectedCrop, tasks: updatedTasks });
            setEditingTask(null);
            setNewTask({ name: '', description: '', frequency: '', manHours: '' });
            setShowAddTaskModal(false);
        }
    };

    // Handle Delete Task
    const handleDeleteTask = (taskId) => {
        if (window.confirm('Are you sure you want to delete this task?')) {
            const updatedTasks = selectedCrop.tasks.filter(t => t.id !== taskId);
            
            setCrops(crops.map(c =>
                c.id === selectedCrop.id
                    ? { ...c, tasks: updatedTasks }
                    : c
            ));
            
            setSelectedCrop({ ...selectedCrop, tasks: updatedTasks });
        }
    };

    // Filter crops by search
    const filteredCrops = crops.filter(crop =>
        crop.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        crop.description.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Close modals
    const closeModals = () => {
        setShowAddCropModal(false);
        setShowAddTaskModal(false);
        setEditingCrop(null);
        setEditingTask(null);
        setNewCrop({ name: '', description: '' });
        setNewTask({ name: '', description: '', frequency: '', manHours: '' });
    };

    return (
        <div className="crop-management-layout">
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
                        <h1 className="page-title">Crop Management</h1>
                        <p className="page-subtitle">Manage crops, define tasks, and set frequencies</p>
                    </div>
                    <div className="header-actions">
                        <button className="notification-btn">
                            <FiBell />
                            <span className="notification-badge">3</span>
                        </button>
                    </div>
                </header>

                {/* Main Content */}
                <main className="content-body">
                    <div className="crop-management-container">
                        {/* Left Panel - Crops List */}
                        <div className="crops-panel">
                            <div className="panel-header">
                                <h2>Crops</h2>
                                <button className="add-btn" onClick={() => setShowAddCropModal(true)}>
                                    <FiPlus /> Add Crop
                                </button>
                            </div>

                            {/* Search Bar */}
                            <div className="search-bar">
                                <FiSearch className="search-icon" />
                                <input
                                    type="text"
                                    placeholder="Search crops..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>

                            {/* Crops List */}
                            <div className="crops-list">
                                {filteredCrops.map(crop => (
                                    <div
                                        key={crop.id}
                                        className={`crop-item ${selectedCrop?.id === crop.id ? 'active' : ''}`}
                                        onClick={() => setSelectedCrop(crop)}
                                    >
                                        <div className="crop-item-header">
                                            <h3>{crop.name}</h3>
                                            <span className="task-count">{crop.tasks.length} tasks</span>
                                        </div>
                                        <p className="crop-description">{crop.description}</p>
                                        <div className="crop-item-actions">
                                            <button
                                                className="icon-btn edit"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleEditCrop(crop);
                                                }}
                                            >
                                                <FiEdit2 />
                                            </button>
                                            <button
                                                className="icon-btn delete"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteCrop(crop.id);
                                                }}
                                            >
                                                <FiTrash2 />
                                            </button>
                                        </div>
                                    </div>
                                ))}

                                {filteredCrops.length === 0 && (
                                    <div className="empty-state">
                                        <p>No crops found</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Right Panel - Tasks Details */}
                        <div className="tasks-panel">
                            {selectedCrop ? (
                                <>
                                    <div className="panel-header">
                                        <div>
                                            <h2>{selectedCrop.name} Tasks</h2>
                                            <p className="panel-subtitle">Manage tasks and frequencies</p>
                                        </div>
                                        <button
                                            className="add-btn"
                                            onClick={() => setShowAddTaskModal(true)}
                                        >
                                            <FiPlus /> Add Task
                                        </button>
                                    </div>

                                    {/* Tasks Grid */}
                                    <div className="tasks-grid">
                                        {selectedCrop.tasks.map(task => (
                                            <div key={task.id} className="task-card">
                                                <div className="task-card-header">
                                                    <h3>{task.name}</h3>
                                                    <div className="task-card-actions">
                                                        <button
                                                            className="icon-btn edit"
                                                            onClick={() => handleEditTask(task)}
                                                        >
                                                            <FiEdit2 />
                                                        </button>
                                                        <button
                                                            className="icon-btn delete"
                                                            onClick={() => handleDeleteTask(task.id)}
                                                        >
                                                            <FiTrash2 />
                                                        </button>
                                                    </div>
                                                </div>
                                                <p className="task-description">{task.description}</p>
                                                <div className="task-meta">
                                                    <div className="meta-item">
                                                        <FiClock className="meta-icon" />
                                                        <span>Every {task.frequency} days</span>
                                                    </div>
                                                    <div className="meta-item">
                                                        <FiUsers className="meta-icon" />
                                                        <span>{task.manHours} man-hours</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}

                                        {selectedCrop.tasks.length === 0 && (
                                            <div className="empty-state">
                                                <FiAlertCircle className="empty-icon" />
                                                <p>No tasks defined for this crop</p>
                                                <button
                                                    className="add-btn-secondary"
                                                    onClick={() => setShowAddTaskModal(true)}
                                                >
                                                    <FiPlus /> Add First Task
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <div className="empty-state large">
                                    <FiCheckCircle className="empty-icon" />
                                    <h3>Select a crop to view tasks</h3>
                                    <p>Choose a crop from the left panel to manage its tasks</p>
                                </div>
                            )}
                        </div>
                    </div>
                </main>
            </div>

            {/* Add/Edit Crop Modal */}
            {showAddCropModal && (
                <div className="modal-overlay" onClick={closeModals}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editingCrop ? 'Edit Crop' : 'Add New Crop'}</h2>
                            <button className="close-btn" onClick={closeModals}>
                                <FiX />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label>Crop Name *</label>
                                <input
                                    type="text"
                                    placeholder="e.g., Tea, Coconut, Rubber"
                                    value={newCrop.name}
                                    onChange={(e) => setNewCrop({ ...newCrop, name: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label>Description *</label>
                                <textarea
                                    placeholder="Brief description of the crop"
                                    value={newCrop.description}
                                    onChange={(e) => setNewCrop({ ...newCrop, description: e.target.value })}
                                    rows="3"
                                />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-secondary" onClick={closeModals}>
                                Cancel
                            </button>
                            <button
                                className="btn-primary"
                                onClick={editingCrop ? handleUpdateCrop : handleAddCrop}
                            >
                                <FiSave /> {editingCrop ? 'Update' : 'Save'} Crop
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add/Edit Task Modal */}
            {showAddTaskModal && (
                <div className="modal-overlay" onClick={closeModals}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editingTask ? 'Edit Task' : 'Add New Task'}</h2>
                            <button className="close-btn" onClick={closeModals}>
                                <FiX />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label>Task Name *</label>
                                <input
                                    type="text"
                                    placeholder="e.g., Plucking, Harvesting"
                                    value={newTask.name}
                                    onChange={(e) => setNewTask({ ...newTask, name: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label>Description *</label>
                                <textarea
                                    placeholder="Brief description of the task"
                                    value={newTask.description}
                                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                                    rows="3"
                                />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Frequency (Days) *</label>
                                    <input
                                        type="number"
                                        placeholder="e.g., 7, 30, 90"
                                        value={newTask.frequency}
                                        onChange={(e) => setNewTask({ ...newTask, frequency: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Man-Hours *</label>
                                    <input
                                        type="number"
                                        placeholder="e.g., 10, 20"
                                        value={newTask.manHours}
                                        onChange={(e) => setNewTask({ ...newTask, manHours: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-secondary" onClick={closeModals}>
                                Cancel
                            </button>
                            <button
                                className="btn-primary"
                                onClick={editingTask ? handleUpdateTask : handleAddTask}
                            >
                                <FiSave /> {editingTask ? 'Update' : 'Save'} Task
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CropManagement;