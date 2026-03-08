import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SideNav from '../../components/SideNav';
import {
    FiPlus, FiEdit2, FiTrash2, FiSave, FiX, FiSearch,
    FiClock, FiUsers, FiBell, FiCheckCircle, FiAlertCircle
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

    // Form states
    const [newCrop, setNewCrop] = useState({ name: '', description: '' });
    const [newTask, setNewTask] = useState({ name: '', description: '', frequency: '', manHours: '' });

    // Fetch crops from backend
    useEffect(() => {
        const fetchCrops = async () => {
            try {
                const res = await fetch('http://localhost:8081/api/crops');
                const data = await res.json();

                // Map backend structure to frontend
                const formatted = data.map(c => ({
                    id: String(c.crop_id),
                    name: c.crop_name,
                    description: c.description,
                    tasks: [] // Fetch tasks separately if needed
                }));

                setCrops(formatted);
            } catch (err) {
                console.error('Failed to fetch crops:', err);
            }
        };

        fetchCrops();
    }, []);

    // Add Crop
    const handleAddCrop = async () => {
        if (!newCrop.name || !newCrop.description) return;

        try {
            const res = await fetch('http://localhost:8081/api/crops', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newCrop)
            });
            const data = await res.json();

            // Update UI
            setCrops([...crops, { id: String(data.id), name: data.name, description: data.description, tasks: [] }]);
            setNewCrop({ name: '', description: '' });
            setShowAddCropModal(false);
        } catch (err) {
            console.error('Failed to add crop:', err);
            alert('Failed to add crop.');
        }
    };

    // Edit Crop (open modal)
    const handleEditCrop = (crop) => {
        setEditingCrop(crop);
        setNewCrop({ name: crop.name, description: crop.description });
        setShowAddCropModal(true);
    };

    // Update Crop
    const handleUpdateCrop = async () => {
        if (!editingCrop) return;

        try {
            const res = await fetch(`http://localhost:8081/api/crops/${editingCrop.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newCrop)
            });
            const data = await res.json();

            // Update UI
            setCrops(crops.map(c =>
                c.id === editingCrop.id ? { ...c, name: data.name, description: data.description } : c
            ));

            setEditingCrop(null);
            setNewCrop({ name: '', description: '' });
            setShowAddCropModal(false);
        } catch (err) {
            console.error('Failed to update crop:', err);
            alert('Failed to update crop.');
        }
    };

    // Delete Crop
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

    // Filter crops
    const filteredCrops = crops.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.description.toLowerCase().includes(searchTerm.toLowerCase())
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

                        {/* Right Panel - Tasks */}
                        <div className="tasks-panel">
                            {selectedCrop ? (
                                <div className="empty-state large">
                                    <FiCheckCircle className="empty-icon" />
                                    <h3>Select a crop to view tasks</h3>
                                    <p>Tasks integration can be implemented via /tasks endpoint</p>
                                </div>
                            ) : (
                                <div className="empty-state large">
                                    <FiCheckCircle className="empty-icon" />
                                    <h3>Select a crop to view tasks</h3>
                                    <p>Choose a crop from the left panel</p>
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
                            <button className="close-btn" onClick={closeModals}><FiX /></button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label>Crop Name *</label>
                                <input type="text" placeholder="Crop name" value={newCrop.name} onChange={(e) => setNewCrop({ ...newCrop, name: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Description *</label>
                                <textarea placeholder="Crop description" value={newCrop.description} onChange={(e) => setNewCrop({ ...newCrop, description: e.target.value })} rows="3" />
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
        </div>
    );
};

export default CropManagement;