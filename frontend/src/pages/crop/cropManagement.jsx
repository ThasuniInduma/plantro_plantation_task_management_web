import React, { useState, useEffect, useRef } from 'react';
import SideNav from '../../components/SideNav';
import {
    FiPlus, FiEdit2, FiTrash2, FiSave, FiX, FiSearch,
    FiClock, FiUsers, FiBell, FiCheckCircle, FiLayers, FiList,
    FiMapPin
} from 'react-icons/fi';
import './cropManagement.css';

const BASE = 'http://localhost:8081/api';

const CropManagement = ({ logo }) => {
    const [crops, setCrops] = useState([]);
    const [selectedCrop, setSelectedCrop] = useState(null);
    const [allTasks, setAllTasks] = useState([]);
    const [cropFields, setCropFields] = useState([]);
    const [activeTab, setActiveTab] = useState('crops');
    const [showAddCropModal, setShowAddCropModal] = useState(false);
    const [showAddTaskModal, setShowAddTaskModal] = useState(false);
    const [editingCrop, setEditingCrop] = useState(null);
    const [editingCropTask, setEditingCropTask] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [newCrop, setNewCrop] = useState({ name: '', description: '' });
    const [taskForm, setTaskForm] = useState({
        task_id: null,
        task_name: '',
        description: '',
        frequency_days: '',
        estimated_man_hours: ''
    });
    const [taskSearch, setTaskSearch] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const suggestRef = useRef(null);

    // ── Load on mount ────────────────────────────────────────────────────────
    useEffect(() => {
        const load = async () => {
            try {
                const [cropRes, tasksRes] = await Promise.all([
                    fetch(`${BASE}/crops`),
                    fetch(`${BASE}/tasks/all`)
                ]);

                const cropData = await cropRes.json();
                const taskData = await tasksRes.json();

                setAllTasks(Array.isArray(taskData) ? taskData : []);

                const cropsWithTasks = await Promise.all(
                    cropData.map(async (c) => {
                        try {
                            const r = await fetch(`${BASE}/tasks/crop/${c.crop_id}`);
                            const tasks = await r.json();
                            return {
                                id: c.crop_id,
                                name: c.crop_name,
                                description: c.description,
                                tasks: Array.isArray(tasks) ? tasks : []
                            };
                        } catch {
                            return {
                                id: c.crop_id,
                                name: c.crop_name,
                                description: c.description,
                                tasks: []
                            };
                        }
                    })
                );
                setCrops(cropsWithTasks);

            } catch (err) {
                console.error('Load failed:', err);
            }
        };
        load();
    }, []);

    // ── Close suggestions on outside click ───────────────────────────────────
    useEffect(() => {
        const handler = (e) => {
            if (suggestRef.current && !suggestRef.current.contains(e.target))
                setShowSuggestions(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // ── Helpers ──────────────────────────────────────────────────────────────
    const refreshCropData = async (cropId) => {
        try {
            const [taskRes, fieldRes] = await Promise.all([
                fetch(`${BASE}/tasks/crop/${cropId}`),
                fetch(`${BASE}/crops/${cropId}/fields`)
            ]);
            const tasks = await taskRes.json();
            const fields = await fieldRes.json();
            const safeTasks = Array.isArray(tasks) ? tasks : [];
            const safeFields = Array.isArray(fields) ? fields : [];

            setCrops(prev => prev.map(c =>
                c.id === cropId ? { ...c, tasks: safeTasks } : c
            ));
            setSelectedCrop(prev =>
                prev?.id === cropId ? { ...prev, tasks: safeTasks } : prev
            );
            setCropFields(safeFields);
        } catch (err) {
            console.error('Refresh failed:', err);
        }
    };

    const handleSelectCrop = (crop) => {
        setSelectedCrop(crop);
        refreshCropData(crop.id);
    };

    const closeModals = () => {
        setShowAddCropModal(false);
        setShowAddTaskModal(false);
        setEditingCrop(null);
        setEditingCropTask(null);
        setNewCrop({ name: '', description: '' });
        setTaskForm({
            task_id: null,
            task_name: '',
            description: '',
            frequency_days: '',
            estimated_man_hours: ''
        });
        setTaskSearch('');
        setShowSuggestions(false);
    };

    // ── Suggestion filtering ─────────────────────────────────────────────────
    const alreadyAddedIds = new Set(
        (selectedCrop?.tasks || []).map(t => Number(t.task_id))
    );

    const suggestions = allTasks.filter(t =>
        !alreadyAddedIds.has(Number(t.task_id)) &&
        (t.task_name || '').toLowerCase().includes(taskSearch.toLowerCase())
    );

    const handleTaskNameInput = (val) => {
        setTaskSearch(val);
        setTaskForm(f => ({ ...f, task_name: val, task_id: null, description: '' }));
        setShowSuggestions(true);
    };

    const handlePickSuggestion = (task) => {
        setTaskForm(f => ({
            ...f,
            task_id: task.task_id,
            task_name: task.task_name,
            description: task.description
        }));
        setTaskSearch(task.task_name);
        setShowSuggestions(false);
    };

    // ── Crop handlers ────────────────────────────────────────────────────────
    // ── Validation helper ────────────────────────────────────────────────────
const validateCropName = (name) => {
  if (!name.trim()) return 'Crop name is required.';
  if (!/^[a-zA-Z\s]+$/.test(name.trim()))
    return 'Crop name can only contain letters and spaces.';
  if (name.trim().length < 2) return 'Crop name must be at least 2 characters.';
  return null;
};

const handleAddCrop = async () => {
  const nameError = validateCropName(newCrop.name);
  if (nameError) { alert(nameError); return; }
  if (!newCrop.description.trim()) { alert('Description is required.'); return; }

  try {
    const res = await fetch(`${BASE}/crops`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newCrop.name.trim(),
        description: newCrop.description.trim()
      })
    });
    const data = await res.json();
    setCrops(prev => [...prev, {
      id: data.id,
      name: data.name,
      description: data.description,
      tasks: []
    }]);
    closeModals();
  } catch { alert('Failed to add crop.'); }
};

const handleUpdateCrop = async () => {
  const nameError = validateCropName(newCrop.name);
  if (nameError) { alert(nameError); return; }
  if (!newCrop.description.trim()) { alert('Description is required.'); return; }

  try {
    const res = await fetch(`${BASE}/crops/${editingCrop.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newCrop.name.trim(),
        description: newCrop.description.trim()
      })
    });
    const data = await res.json();
    setCrops(prev => prev.map(c =>
      c.id === editingCrop.id
        ? { ...c, name: data.name, description: data.description }
        : c
    ));
    if (selectedCrop?.id === editingCrop.id)
      setSelectedCrop(p => ({ ...p, name: data.name, description: data.description }));
    closeModals();
  } catch { alert('Failed to update crop.'); }
};

    const handleDeleteCrop = async (cropId) => {
        if (!window.confirm('Delete this crop and all its tasks?')) return;
        try {
            await fetch(`${BASE}/crops/${cropId}`, { method: 'DELETE' });
            setCrops(prev => prev.filter(c => c.id !== cropId));
            if (selectedCrop?.id === cropId) {
                setSelectedCrop(null);
                setCropFields([]);
            }
        } catch { alert('Failed to delete crop.'); }
    };

    const validateTaskForm = () => {
  const { task_name, description, frequency_days, estimated_man_hours } = taskForm;

  if (!task_name.trim()) {
    alert('Task name is required.'); return false;
  }
  if (!/^[a-zA-Z\s]+$/.test(task_name.trim())) {
    alert('Task name can only contain letters and spaces.'); return false;
  }
  if (!description.trim()) {
    alert('Description is required.'); return false;
  }
  if (!frequency_days) {
    alert('Frequency is required.'); return false;
  }
  if (!/^\d+$/.test(String(frequency_days)) || Number(frequency_days) < 1) {
    alert('Frequency must be a positive whole number.'); return false;
  }
  if (!estimated_man_hours) {
    alert('Estimated man-hours is required.'); return false;
  }
  if (!/^\d+$/.test(String(estimated_man_hours)) || Number(estimated_man_hours) < 1) {
    alert('Estimated man-hours must be a positive whole number.'); return false;
  }
  return true;
};

    // ── Task handlers ────────────────────────────────────────────────────────
    const handleAddTask = async () => {
  if (!validateTaskForm()) return;

  const { task_id, task_name, description, frequency_days, estimated_man_hours } = taskForm;
  try {
    const res = await fetch(`${BASE}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        crop_id: selectedCrop.id,
        task_id: task_id || null,
        task_name,
        description,
        frequency_days:      Number(frequency_days),
        estimated_man_hours: Number(estimated_man_hours)
      })
    });
    if (!res.ok) throw new Error();
    const saved = await res.json();

    if (!task_id) {
      setAllTasks(prev => [...prev, { task_id: saved.task_id, task_name, description }]);
    }

    await refreshCropData(selectedCrop.id);
    closeModals();
  } catch { alert('Failed to add task.'); }
};

    const handleEditTask = (cropTask) => {
        setEditingCropTask(cropTask);
        setTaskForm({
            task_id: cropTask.task_id,
            task_name: cropTask.task_name,
            description: cropTask.description,
            frequency_days: String(cropTask.frequency_days),
            estimated_man_hours: String(cropTask.estimated_man_hours)
        });
        setTaskSearch(cropTask.task_name);
        setShowAddTaskModal(true);
    };

    const handleUpdateTask = async () => {
        try {
            await fetch(`${BASE}/tasks/${editingCropTask.crop_task_id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    frequency_days: Number(taskForm.frequency_days),
                    estimated_man_hours: Number(taskForm.estimated_man_hours)
                })
            });
            await refreshCropData(selectedCrop.id);
            closeModals();
        } catch { alert('Failed to update task.'); }
    };

    const handleDeleteTask = async (cropTaskId) => {
        if (!window.confirm('Remove this task from the crop?')) return;
        try {
            await fetch(`${BASE}/tasks/${cropTaskId}`, { method: 'DELETE' });
            await refreshCropData(selectedCrop.id);
        } catch { alert('Failed to delete task.'); }
    };

    const filteredCrops = (crops || []).filter(c =>
    (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.description || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const taskAccents = ['#4f7942', '#7cb342', '#2e7d32', '#558b2f', '#33691e'];
    const fieldAccents = ['#1565c0', '#0288d1', '#00838f', '#00695c', '#2e7d32'];

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
                        <p className="page-subtitle">Manage crops, define tasks, and view fields</p>
                    </div>
                    
                </header>

                <main className="content-body">
                    <div className="crop-management-container">

                        {/* ── Crops Panel ── */}
                        <div className="crops-panel">
                            <div className="panel-header">
                                <h2>Crops</h2>
                                <button className="add-btn" onClick={() => {
                                    setEditingCrop(null);
                                    setNewCrop({ name: '', description: '' });
                                    setShowAddCropModal(true);
                                }}>
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
                                        onClick={() => handleSelectCrop(crop)}
                                    >
                                        <div className="crop-item-header">
                                            <h3>{crop.name}</h3>
                                            <span className="task-count">{crop.tasks.length} tasks</span>
                                        </div>
                                        <p className="crop-description">{crop.description}</p>
                                        <div className="crop-item-actions">
                                            <button className="icon-btn edit" onClick={(e) => {
                                                e.stopPropagation();
                                                setEditingCrop(crop);
                                                setNewCrop({ name: crop.name, description: crop.description });
                                                setShowAddCropModal(true);
                                            }}>
                                                <FiEdit2 />
                                            </button>
                                            <button className="icon-btn delete" onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteCrop(crop.id);
                                            }}>
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

                        {/* ── Detail Panel ── */}
                        <div className="tasks-panel">
                            {selectedCrop ? (
                                <>
                                    <div className="panel-header tasks-panel-header">
                                        <div className="tasks-header-info">
                                            <h2>
                                                <span className="crop-name-highlight">{selectedCrop.name}</span>
                                            </h2>
                                            <p className="panel-subtitle">
                                                {selectedCrop.tasks?.length || 0} task{selectedCrop.tasks?.length !== 1 ? 's' : ''}
                                                {cropFields.length > 0 && ` · ${cropFields.length} field${cropFields.length !== 1 ? 's' : ''}`}
                                            </p>
                                        </div>
                                        <button className="add-btn" onClick={() => {
                                            setEditingCropTask(null);
                                            setTaskForm({
                                                task_id: null,
                                                task_name: '',
                                                description: '',
                                                frequency_days: '',
                                                estimated_man_hours: ''
                                            });
                                            setTaskSearch('');
                                            setShowAddTaskModal(true);
                                        }}>
                                            <FiPlus /> Add Task
                                        </button>
                                    </div>

                                    {/* ── Fields Section ── */}
                                    {cropFields.length > 0 && (
                                        <div className="fields-section">
                                            <div className="fields-section-header">
                                                <FiMapPin className="section-icon" />
                                                <span>Fields Growing {selectedCrop.name}</span>
                                                <span className="section-badge">{cropFields.length}</span>
                                            </div>
                                            <div className="fields-grid">
                                                {cropFields.map((field, idx) => (
                                                    <div
                                                        key={field.field_id}
                                                        className="field-card"
                                                        style={{ '--field-accent': fieldAccents[idx % fieldAccents.length] }}
                                                    >
                                                        <div className="field-card-top">
                                                            <h4>{field.field_name}</h4>
                                                            <span className="field-area">{field.area} ha</span>
                                                        </div>
                                                        <p className="field-location">
                                                            <FiMapPin className="pin-icon" /> {field.location}
                                                        </p>
                                                        {field.supervisor_name && (
                                                            <div className="field-supervisor">
                                                                <FiUsers className="meta-icon" />
                                                                <span>{field.supervisor_name}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* ── Tasks Section ── */}
                                    <div className="tasks-section-header">
                                        <FiLayers className="section-icon" />
                                        <span>Tasks Defined for {selectedCrop.name}</span>
                                        <span className="section-badge">{selectedCrop.tasks?.length || 0}</span>
                                    </div>

                                    <div className="tasks-grid">
                                        {selectedCrop.tasks?.length > 0 ? selectedCrop.tasks.map((task, idx) => (
                                            <div
                                                key={task.crop_task_id}
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
                                                            <button className="icon-btn edit" onClick={() => handleEditTask(task)}>
                                                                <FiEdit2 />
                                                            </button>
                                                            <button className="icon-btn delete" onClick={() => handleDeleteTask(task.crop_task_id)}>
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
                                                            <span><strong>{task.estimated_man_hours}</strong> man-hrs</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )) : (
                                            <div className="empty-state large">
                                                <div className="empty-icon"><FiLayers /></div>
                                                <h3>No tasks yet</h3>
                                                <p>Define the first task for <strong>{selectedCrop.name}</strong></p>
                                                <button className="add-btn-secondary" onClick={() => {
                                                    setEditingCropTask(null);
                                                    setTaskForm({
                                                        task_id: null,
                                                        task_name: '',
                                                        description: '',
                                                        frequency_days: '',
                                                        estimated_man_hours: ''
                                                    });
                                                    setTaskSearch('');
                                                    setShowAddTaskModal(true);
                                                }}>
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
                                    <p>Choose a crop from the left panel to view its fields and tasks.</p>
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
                                <input
                                    type="text"
                                    placeholder="e.g. Tea, Rubber"
                                    value={newCrop.name}
                                    onChange={(e) => {
                                        // ✅ Block numbers and symbols while typing
                                        const val = e.target.value;
                                        if (/^[a-zA-Z\s]*$/.test(val)) {
                                            setNewCrop({ ...newCrop, name: val });
                                        }
                                        }}
                                />
                                {newCrop.name && !/^[a-zA-Z\s]+$/.test(newCrop.name) && (
                                    <span style={{ fontSize: 11, color: '#ef4444', marginTop: 4, display: 'block' }}>
                                    Only letters and spaces allowed
                                    </span>
                                )}
                            </div>
                            <div className="form-group">
                                <label>Description *</label>
                                <textarea
                                    placeholder="Describe this crop..."
                                    value={newCrop.description}
                                    onChange={(e) => setNewCrop({ ...newCrop, description: e.target.value })}
                                    rows="3"
                                />
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
                    <div className="modal task-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editingCropTask ? 'Edit Task' : `Add Task — ${selectedCrop?.name}`}</h2>
                            <button className="close-btn" onClick={closeModals}><FiX /></button>
                        </div>
                        <div className="modal-body">

                            {/* Task name + suggestions */}
                            <div style={{ position: 'relative', marginBottom: '1.375rem' }} ref={suggestRef}>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label>Task Name *</label>
                                    <div className="task-input-wrapper">
                                        <input
                                            type="text"
                                            placeholder="Type or search existing tasks..."
                                            value={taskSearch}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                // ✅ Only letters and spaces allowed
                                                if (/^[a-zA-Z\s]*$/.test(val)) {
                                                handleTaskNameInput(val);
                                                }
                                            }}
                                            onFocus={() => setShowSuggestions(true)}
                                            disabled={!!editingCropTask}
                                            autoComplete="off"
                                            />
                                    </div>
                                </div>

                                {showSuggestions && !editingCropTask && (
                                    <div className="suggestions-dropdown">
                                        {suggestions.length > 0 ? (
                                            <>
                                                <div className="suggestions-header">
                                                    <FiList /> Existing Tasks ({suggestions.length})
                                                </div>
                                                {suggestions.map(t => (
                                                    <div
                                                        key={t.task_id}
                                                        className="suggestion-item"
                                                        onMouseDown={(e) => {
                                                            e.preventDefault();
                                                            handlePickSuggestion(t);
                                                        }}
                                                    >
                                                        <span className="suggestion-name">
                                                            {t.task_name}
                                                            <span className="reuse-tag">reusable</span>
                                                        </span>
                                                        <span className="suggestion-desc">
                                                            {t.description?.slice(0, 80)}…
                                                        </span>
                                                    </div>
                                                ))}
                                            </>
                                        ) : (
                                            taskSearch.length > 0 && (
                                                <div className="suggestions-header" style={{ color: 'var(--text-secondary)' }}>
                                                    No match — will be saved as new task
                                                </div>
                                            )
                                        )}
                                        {taskSearch.length > 0 && (
                                            <div
                                                className="suggestions-new"
                                                onMouseDown={(e) => {
                                                    e.preventDefault();
                                                    setShowSuggestions(false);
                                                }}
                                            >
                                                <span className="new-pill"><FiPlus /> New</span>
                                                Add "<strong>{taskSearch}</strong>" as a new task
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="form-group">
                                <label>Description *</label>
                                <textarea
                                    placeholder="What does this task involve?"
                                    value={taskForm.description}
                                    onChange={(e) => setTaskForm(f => ({ ...f, description: e.target.value }))}
                                    rows="3"
                                    disabled={!!(taskForm.task_id && !editingCropTask)}
                                />
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Frequency (days) *</label>
                                    <input
                                        type="number"
                                        placeholder="e.g. 7"
                                        min="1"
                                        step="1"
                                        value={taskForm.frequency_days}
                                        onChange={(e) => {
                                            // ✅ Only positive integers
                                            const val = e.target.value.replace(/[^0-9]/g, '');
                                            setTaskForm(f => ({ ...f, frequency_days: val }));
                                        }}
                                        onKeyDown={(e) => {
                                            // Block decimal point and minus
                                            if (e.key === '.' || e.key === '-' || e.key === 'e') e.preventDefault();
                                        }}
                                        />
                                </div>
                                <div className="form-group">
                                    <label>Estimated Man-Hours *</label>
                                    <input
                                        type="number"
                                        placeholder="e.g. 10"
                                        min="1"
                                        step="1"
                                        value={taskForm.estimated_man_hours}
                                        onChange={(e) => {
                                            // ✅ Only positive integers
                                            const val = e.target.value.replace(/[^0-9]/g, '');
                                            setTaskForm(f => ({ ...f, estimated_man_hours: val }));
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === '.' || e.key === '-' || e.key === 'e') e.preventDefault();
                                        }}
                                        />
                                </div>
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button className="btn-secondary" onClick={closeModals}>Cancel</button>
                            <button className="btn-primary" onClick={editingCropTask ? handleUpdateTask : handleAddTask}>
                                <FiSave /> {editingCropTask ? 'Update' : 'Save'} Task
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CropManagement;