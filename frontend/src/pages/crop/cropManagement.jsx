import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SideNav from '../../components/SideNav';
import {
    FiPlus, FiEdit2, FiTrash2, FiSave, FiX, FiSearch,
    FiClock, FiUsers, FiBell, FiCheckCircle, FiAlertCircle,
    FiLayers
} from 'react-icons/fi';
import './cropManagement.css';

const CropManagement = ({ logo }) => {
    const [crops, setCrops] = useState([]);
    const [selectedCrop, setSelectedCrop] = useState(null);
    const [activeTab, setActiveTab] = useState('crops');
    const [showAddCropModal, setShowAddCropModal] = useState(false);
    const [showAddTaskModal, setShowAddTaskModal] = useState(false);
    const [editingCrop, setEditingCrop] = useState(null);
    const [editingTask, setEditingTask] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const navigate = useNavigate();

    const [newCrop, setNewCrop] = useState({ name: '', description: '' });
    const [newTask, setNewTask] = useState({ task_name: '', description: '', frequency_days: '', estimated_hours: '' });

    useEffect(() => {
        const fetchCrops = async () => {
            try {
                const res = await fetch('http://localhost:8081/api/crops');
                const data = await res.json();
                const formatted = data.map(c => ({
                    id: String(c.crop_id),
                    name: c.crop_name,
                    description: c.description,
                    tasks: []
                }));
                setCrops(formatted);
            } catch (err) {
                console.error('Failed to fetch crops:', err);
            }
        };
        fetchCrops();
    }, []);

    useEffect(() => {
        const fetchTasks = async () => {
            if (!selectedCrop) return;
            try {
                const res = await fetch(`http://localhost:8081/api/tasks/crop/${selectedCrop.id}`);
                const data = await res.json();
                setCrops(prevCrops =>
                    prevCrops.map(c => c.id === selectedCrop.id ? { ...c, tasks: data } : c)
                );
                setSelectedCrop(prev => ({ ...prev, tasks: data }));
            } catch (err) {
                console.error('Failed to fetch tasks:', err);
            }
        };
        fetchTasks();
    }, [selectedCrop?.id]);

    // ─── CROP HANDLERS ────────────────────────────────────────────────────────

    const handleAddCrop = async () => {
        if (!newCrop.name || !newCrop.description) return;
        try {
            const res = await fetch('http://localhost:8081/api/crops', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newCrop)
            });
            const data = await res.json();
            setCrops([...crops, { id: String(data.id), name: data.name, description: data.description, tasks: [] }]);
            setNewCrop({ name: '', description: '' });
            setShowAddCropModal(false);
        } catch (err) {
            console.error('Failed to add crop:', err);
            alert('Failed to add crop.');
        }
    };

    const handleEditCrop = (crop) => {
        setEditingCrop(crop);
        setNewCrop({ name: crop.name, description: crop.description });
        setShowAddCropModal(true);
    };

    const handleUpdateCrop = async () => {
        if (!editingCrop) return;
        try {
            const res = await fetch(`http://localhost:8081/api/crops/${editingCrop.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newCrop)
            });
            const data = await res.json();
            setCrops(crops.map(c =>
                c.id === editingCrop.id ? { ...c, name: data.name, description: data.description } : c
            ));
            if (selectedCrop?.id === editingCrop.id) {
                setSelectedCrop(prev => ({ ...prev, name: data.name, description: data.description }));
            }
            setEditingCrop(null);
            setNewCrop({ name: '', description: '' });
            setShowAddCropModal(false);
        } catch (err) {
            console.error('Failed to update crop:', err);
            alert('Failed to update crop.');
        }
    };

    const handleDeleteCrop = async (cropId) => {
        if (!window.confirm('Are you sure you want to delete this crop?')) return;
        try {
            await fetch(`http://localhost:8081/api/crops/${cropId}`, { method: 'DELETE' });
            setCrops(crops.filter(c => c.id !== cropId));
            if (selectedCrop?.id === cropId) setSelectedCrop(null);
        } catch (err) {
            console.error('Failed to delete crop:', err);
            alert('Failed to delete crop.');
        }
    };

    // ─── TASK HANDLERS ────────────────────────────────────────────────────────

    const handleAddTask = async () => {
        if (!newTask.task_name || !newTask.description || !newTask.frequency_days || !newTask.estimated_hours) {
            alert('Please fill in all task fields.');
            return;
        }
        try {
            const res = await fetch('http://localhost:8081/api/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    crop_id: selectedCrop.id,
                    task_name: newTask.task_name,
                    description: newTask.description,
                    frequency_days: Number(newTask.frequency_days),
                    estimated_hours: Number(newTask.estimated_hours)
                })
            });
            const data = await res.json();
            const updatedTasks = [...(selectedCrop.tasks || []), data];
            setCrops(prevCrops =>
                prevCrops.map(c => c.id === selectedCrop.id ? { ...c, tasks: updatedTasks } : c)
            );
            setSelectedCrop(prev => ({ ...prev, tasks: updatedTasks }));
            setNewTask({ task_name: '', description: '', frequency_days: '', estimated_hours: '' });
            setShowAddTaskModal(false);
        } catch (err) {
            console.error('Failed to add task:', err);
            alert('Failed to add task.');
        }
    };

    const handleEditTask = (task) => {
        setEditingTask(task);
        setNewTask({
            task_name: task.task_name,
            description: task.description,
            frequency_days: String(task.frequency_days),
            estimated_hours: String(task.estimated_hours)
        });
        setShowAddTaskModal(true);
    };

    const handleUpdateTask = async () => {
        if (!editingTask) return;
        try {
            const res = await fetch(`http://localhost:8081/api/tasks/${editingTask.task_id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    task_name: newTask.task_name,
                    description: newTask.description,
                    frequency_days: Number(newTask.frequency_days),
                    estimated_hours: Number(newTask.estimated_hours)
                })
            });
            const data = await res.json();
            const updatedTasks = selectedCrop.tasks.map(t =>
                t.task_id === editingTask.task_id ? { ...t, ...data } : t
            );
            setCrops(prevCrops =>
                prevCrops.map(c => c.id === selectedCrop.id ? { ...c, tasks: updatedTasks } : c)
            );
            setSelectedCrop(prev => ({ ...prev, tasks: updatedTasks }));
            setEditingTask(null);
            setNewTask({ task_name: '', description: '', frequency_days: '', estimated_hours: '' });
            setShowAddTaskModal(false);
        } catch (err) {
            console.error('Failed to update task:', err);
            alert('Failed to update task.');
        }
    };

    const handleDeleteTask = async (taskId) => {
        if (!window.confirm('Are you sure you want to delete this task?')) return;
        try {
            await fetch(`http://localhost:8081/api/tasks/${taskId}`, { method: 'DELETE' });
            const updatedTasks = selectedCrop.tasks.filter(t => t.task_id !== taskId);
            setCrops(prevCrops =>
                prevCrops.map(c => c.id === selectedCrop.id ? { ...c, tasks: updatedTasks } : c)
            );
            setSelectedCrop(prev => ({ ...prev, tasks: updatedTasks }));
        } catch (err) {
            console.error('Failed to delete task:', err);
            alert('Failed to delete task.');
        }
    };

    const filteredCrops = crops.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.description.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const closeModals = () => {
        setShowAddCropModal(false);
        setShowAddTaskModal(false);
        setEditingCrop(null);
        setEditingTask(null);
        setNewCrop({ name: '', description: '' });
        setNewTask({ task_name: '', description: '', frequency_days: '', estimated_hours: '' });
    };

    const taskAccents = ['#4f7942', '#7cb342', '#2e7d32', '#558b2f', '#33691e'];

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

                <main className="content-body">
                    <div className="crop-management-container">

                        {/* ── Left: Crops List ── */}
                        <div className="crops-panel">
                            <div className="panel-header">
                                <h2>Crops</h2>
                                <button className="add-btn" onClick={() => { setEditingCrop(null); setNewCrop({ name: '', description: '' }); setShowAddCropModal(true); }}>
                                    <FiPlus /> Add Crop
                                </button>
                            </div>

                            <div className="search-bar">
                                <div className="search-input-wrapper">
                                    <FiSearch className="search-icon" />
                                    <input
                                        type="text"
                                        placeholder="Search crops..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="crops-list">
                                {filteredCrops.length > 0 ? filteredCrops.map(crop => (
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
                                            <button className="icon-btn edit" onClick={(e) => { e.stopPropagation(); handleEditCrop(crop); }}>
                                                <FiEdit2 />
                                            </button>
                                            <button className="icon-btn delete" onClick={(e) => { e.stopPropagation(); handleDeleteCrop(crop.id); }}>
                                                <FiTrash2 />
                                            </button>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="empty-state">
                                        <p>No crops found</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* ── Right: Tasks Panel ── */}
                        <div className="tasks-panel">
                            {selectedCrop ? (
                                <>
                                    <div className="panel-header tasks-panel-header">
                                        <div className="tasks-header-info">
                                            <h2>Tasks for <span className="crop-name-highlight">{selectedCrop.name}</span></h2>
                                            <p className="panel-subtitle">
                                                {selectedCrop.tasks?.length || 0} task{selectedCrop.tasks?.length !== 1 ? 's' : ''} defined
                                            </p>
                                        </div>
                                        <button className="add-btn" onClick={() => { setEditingTask(null); setNewTask({ task_name: '', description: '', frequency_days: '', estimated_hours: '' }); setShowAddTaskModal(true); }}>
                                            <FiPlus /> Add Task
                                        </button>
                                    </div>

                                    <div className="tasks-grid">
                                        {selectedCrop.tasks && selectedCrop.tasks.length > 0 ? (
                                            selectedCrop.tasks.map((task, idx) => (
                                                <div
                                                    key={task.task_id}
                                                    className="task-card"
                                                    style={{ '--task-accent': taskAccents[idx % taskAccents.length] }}
                                                >
                                                    <div className="task-card-body">
                                                        <div className="task-card-header">
                                                            <div className="task-title-row">
                                                                <span className="task-index">#{String(idx + 1).padStart(2, '0')}</span>
                                                                <h3>{task.task_name}</h3>
                                                            </div>
                                                            <div className="task-card-actions">
                                                                <button className="icon-btn edit" title="Edit task" onClick={() => handleEditTask(task)}>
                                                                    <FiEdit2 />
                                                                </button>
                                                                <button className="icon-btn delete" title="Delete task" onClick={() => handleDeleteTask(task.task_id)}>
                                                                    <FiTrash2 />
                                                                </button>
                                                            </div>
                                                        </div>

                                                        <p className="task-description">{task.description}</p>

                                                        <div className="task-meta">
                                                            <div className="meta-pill">
                                                                <FiClock className="meta-icon" />
                                                                <span>Every <strong>{task.frequency_days}</strong> days</span>
                                                            </div>
                                                            <div className="meta-pill">
                                                                <FiUsers className="meta-icon" />
                                                                <span><strong>{task.estimated_hours}</strong> hrs / session</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="empty-state large">
                                                <div className="empty-icon"><FiLayers /></div>
                                                <h3>No tasks yet</h3>
                                                <p>Define the first task for <strong>{selectedCrop.name}</strong></p>
                                                <button className="add-btn-secondary" onClick={() => { setEditingTask(null); setNewTask({ task_name: '', description: '', frequency_days: '', estimated_hours: '' }); setShowAddTaskModal(true); }}>
                                                    <FiPlus /> Add First Task
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <div className="empty-state large">
                                    <div className="empty-icon"><FiCheckCircle /></div>
                                    <h3>Select a Crop</h3>
                                    <p>Choose a crop from the left panel to view and manage its tasks.</p>
                                </div>
                            )}
                        </div>

                    </div>
                </main>
            </div>

            {/* ── Add/Edit Crop Modal ── */}
            {showAddCropModal && (
                <div className="modal-overlay" onClick={closeModals}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editingCrop ? 'Edit Crop' : 'Add New Crop'}</h2>
                            <button className="close-btn" onClick={closeModals}><FiX /></button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label>Crop Name *</label>
                                <input type="text" placeholder="e.g. Tea, Rubber" value={newCrop.name} onChange={(e) => setNewCrop({ ...newCrop, name: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Description *</label>
                                <textarea placeholder="Describe this crop..." value={newCrop.description} onChange={(e) => setNewCrop({ ...newCrop, description: e.target.value })} rows="3" />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-secondary" onClick={closeModals}>Cancel</button>
                            <button className="btn-primary" onClick={editingCrop ? handleUpdateCrop : handleAddCrop}>
                                <FiSave /> {editingCrop ? 'Update' : 'Save'} Crop
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Add/Edit Task Modal ── */}
            {showAddTaskModal && (
                <div className="modal-overlay" onClick={closeModals}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editingTask ? 'Edit Task' : `Add Task — ${selectedCrop?.name}`}</h2>
                            <button className="close-btn" onClick={closeModals}><FiX /></button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label>Task Name *</label>
                                <input type="text" placeholder="e.g. Watering, Pruning, Plucking" value={newTask.task_name} onChange={(e) => setNewTask({ ...newTask, task_name: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Description *</label>
                                <textarea placeholder="What does this task involve?" value={newTask.description} onChange={(e) => setNewTask({ ...newTask, description: e.target.value })} rows="3" />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Frequency (days) *</label>
                                    <input type="number" placeholder="e.g. 7" min="1" value={newTask.frequency_days} onChange={(e) => setNewTask({ ...newTask, frequency_days: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label>Estimated Hours *</label>
                                    <input type="number" placeholder="e.g. 2" min="1" value={newTask.estimated_hours} onChange={(e) => setNewTask({ ...newTask, estimated_hours: e.target.value })} />
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-secondary" onClick={closeModals}>Cancel</button>
                            <button className="btn-primary" onClick={editingTask ? handleUpdateTask : handleAddTask}>
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