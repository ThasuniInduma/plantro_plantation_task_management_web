import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SideNav from '../../components/SideNav';
import {
    FiPlus, FiEdit2, FiTrash2, FiSave, FiX, FiSearch,
    FiMap, FiMapPin, FiUser, FiLayers, FiTrendingUp
} from 'react-icons/fi';
import './fieldManagement.css';

// Mock data for fields
const initialFields = [
    {
        id: 'F001',
        name: 'Tea Field Matara',
        location: 'Matara District, Southern Province',
        coordinates: '5.9549° N, 80.5550° E',
        crop: 'Tea',
        area: '50 Acres',
        supervisor: 'Saman Perera',
        supervisorId: 'S001',
        status: 'active',
        soilType: 'Red Clay',
        irrigation: 'Rainfed',
        lastHarvest: '2026-01-20',
        productivity: 85
    },
    {
        id: 'F002',
        name: 'Coconut Field Hakmana',
        location: 'Hakmana, Matara District',
        coordinates: '6.0819° N, 80.6509° E',
        crop: 'Coconut',
        area: '25 Acres',
        supervisor: 'Nimali Fernando',
        supervisorId: 'S002',
        status: 'active',
        soilType: 'Sandy Loam',
        irrigation: 'Drip System',
        lastHarvest: '2026-01-15',
        productivity: 92
    },
    {
        id: 'F003',
        name: 'Rubber Field Matara',
        location: 'Matara Central Region',
        coordinates: '5.9456° N, 80.5353° E',
        crop: 'Rubber',
        area: '80 Acres',
        supervisor: 'Kasun Bandara',
        supervisorId: 'S003',
        status: 'attention',
        soilType: 'Laterite',
        irrigation: 'Natural',
        lastHarvest: '2026-01-18',
        productivity: 68
    },
    {
        id: 'F004',
        name: 'Cinnamon Field Hakmana',
        location: 'Hakmana Coastal Area',
        coordinates: '6.0879° N, 80.6419° E',
        crop: 'Cinnamon',
        area: '35 Acres',
        supervisor: 'Saman Perera',
        supervisorId: 'S001',
        status: 'active',
        soilType: 'Sandy Clay',
        irrigation: 'Sprinkler',
        lastHarvest: '2026-01-10',
        productivity: 78
    }
];

// Mock supervisors data
const mockSupervisors = [
    { id: 'S001', name: 'Saman Perera' },
    { id: 'S002', name: 'Nimali Fernando' },
    { id: 'S003', name: 'Kasun Bandara' },
    { id: 'S004', name: 'Dilshan Silva' },
    { id: 'S005', name: 'Tharaka Jayasinghe' }
];

const FieldManagement = ({ logo }) => {
    const [fields, setFields] = useState(initialFields);
    const [selectedField, setSelectedField] = useState(null);
    const [activeTab, setActiveTab] = useState('fields');
    const [showAddFieldModal, setShowAddFieldModal] = useState(false);
    const [editingField, setEditingField] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCrop, setFilterCrop] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');
    const navigate = useNavigate();

    // Form state
    const [newField, setNewField] = useState({
        name: '',
        location: '',
        coordinates: '',
        crop: '',
        area: '',
        supervisor: '',
        supervisorId: '',
        soilType: '',
        irrigation: '',
        status: 'active'
    });

    // Handle Add Field
    const handleAddField = () => {
        if (newField.name && newField.location && newField.crop && newField.area && newField.supervisorId) {
            const field = {
                id: `F${String(fields.length + 1).padStart(3, '0')}`,
                ...newField,
                lastHarvest: new Date().toISOString().split('T')[0],
                productivity: 0
            };
            setFields([...fields, field]);
            resetForm();
            setShowAddFieldModal(false);
        }
    };

    // Handle Edit Field
    const handleEditField = (field) => {
        setEditingField(field);
        setNewField({
            name: field.name,
            location: field.location,
            coordinates: field.coordinates || '',
            crop: field.crop,
            area: field.area,
            supervisor: field.supervisor,
            supervisorId: field.supervisorId,
            soilType: field.soilType || '',
            irrigation: field.irrigation || '',
            status: field.status
        });
        setShowAddFieldModal(true);
    };

    // Handle Update Field
    const handleUpdateField = () => {
        if (editingField) {
            setFields(fields.map(f => 
                f.id === editingField.id 
                    ? { ...f, ...newField }
                    : f
            ));
            resetForm();
            setEditingField(null);
            setShowAddFieldModal(false);
            if (selectedField?.id === editingField.id) {
                setSelectedField({ ...selectedField, ...newField });
            }
        }
    };

    // Handle Delete Field
    const handleDeleteField = (fieldId) => {
        if (window.confirm('Are you sure you want to delete this field? All associated data will be removed.')) {
            setFields(fields.filter(f => f.id !== fieldId));
            if (selectedField?.id === fieldId) {
                setSelectedField(null);
            }
        }
    };

    // Reset Form
    const resetForm = () => {
        setNewField({
            name: '',
            location: '',
            coordinates: '',
            crop: '',
            area: '',
            supervisor: '',
            supervisorId: '',
            soilType: '',
            irrigation: '',
            status: 'active'
        });
    };

    // Close Modal
    const closeModal = () => {
        setShowAddFieldModal(false);
        setEditingField(null);
        resetForm();
    };

    // Handle Supervisor Selection
    const handleSupervisorSelect = (supervisorId) => {
        const supervisor = mockSupervisors.find(s => s.id === supervisorId);
        if (supervisor) {
            setNewField({
                ...newField,
                supervisorId: supervisor.id,
                supervisor: supervisor.name
            });
        }
    };

    // Filter fields
    const filteredFields = fields.filter(field => {
        const matchesSearch = field.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            field.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            field.crop.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCrop = filterCrop === 'all' || field.crop === filterCrop;
        const matchesStatus = filterStatus === 'all' || field.status === filterStatus;
        return matchesSearch && matchesCrop && matchesStatus;
    });

    // Get unique crops for filter
    const uniqueCrops = [...new Set(fields.map(f => f.crop))];

    return (
        <div className="field-management-layout">
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
                        <h1 className="page-title">Field Management</h1>
                        <p className="page-subtitle">Manage plantation fields, locations, and supervisors</p>
                    </div>
                    <div className="header-actions">
                        <button className="add-field-btn" onClick={() => setShowAddFieldModal(true)}>
                            <FiPlus /> Add New Field
                        </button>
                    </div>
                </header>

                {/* Main Content */}
                <main className="content-body">
                    <div className="field-management-container">
                        {/* Left Panel - Fields List */}
                        <div className="fields-panel">
                            <div className="panel-header">
                                <h2>All Fields ({filteredFields.length})</h2>
                            </div>

                            {/* Search and Filters */}
                            <div className="search-filter-section">
                                <div className="search-bar">
                                    <FiSearch className="search-icon" />
                                    <input
                                        type="text"
                                        placeholder="Search fields..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>

                                <div className="filters">
                                    <select 
                                        className="filter-select"
                                        value={filterCrop}
                                        onChange={(e) => setFilterCrop(e.target.value)}
                                    >
                                        <option value="all">All Crops</option>
                                        {uniqueCrops.map(crop => (
                                            <option key={crop} value={crop}>{crop}</option>
                                        ))}
                                    </select>

                                    <select 
                                        className="filter-select"
                                        value={filterStatus}
                                        onChange={(e) => setFilterStatus(e.target.value)}
                                    >
                                        <option value="all">All Status</option>
                                        <option value="active">Active</option>
                                        <option value="attention">Needs Attention</option>
                                    </select>
                                </div>
                            </div>

                            {/* Fields List */}
                            <div className="fields-list">
                                {filteredFields.map(field => (
                                    <div
                                        key={field.id}
                                        className={`field-item ${selectedField?.id === field.id ? 'active' : ''} ${field.status}`}
                                        onClick={() => setSelectedField(field)}
                                    >
                                        <div className="field-item-header">
                                            <div className="field-title-section">
                                                <h3>{field.name}</h3>
                                                <span className={`status-badge ${field.status}`}>
                                                    {field.status === 'active' ? 'Active' : 'Attention'}
                                                </span>
                                            </div>
                                            <span className="crop-badge">{field.crop}</span>
                                        </div>
                                        
                                        <div className="field-item-body">
                                            <div className="field-info-row">
                                                <FiMapPin className="info-icon" />
                                                <span>{field.location}</span>
                                            </div>
                                            <div className="field-info-row">
                                                <FiLayers className="info-icon" />
                                                <span>{field.area}</span>
                                            </div>
                                            <div className="field-info-row">
                                                <FiUser className="info-icon" />
                                                <span>{field.supervisor}</span>
                                            </div>
                                        </div>

                                        <div className="productivity-bar">
                                            <div className="productivity-label">
                                                <span>Productivity</span>
                                                <span className="productivity-value">{field.productivity}%</span>
                                            </div>
                                            <div className="progress-bar">
                                                <div 
                                                    className="progress-fill" 
                                                    style={{width: `${field.productivity}%`}}
                                                ></div>
                                            </div>
                                        </div>

                                        <div className="field-item-actions">
                                            <button
                                                className="icon-btn edit"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleEditField(field);
                                                }}
                                            >
                                                <FiEdit2 />
                                            </button>
                                            <button
                                                className="icon-btn delete"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteField(field.id);
                                                }}
                                            >
                                                <FiTrash2 />
                                            </button>
                                        </div>
                                    </div>
                                ))}

                                {filteredFields.length === 0 && (
                                    <div className="empty-state">
                                        <FiMap className="empty-icon" />
                                        <p>No fields found</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Right Panel - Field Details */}
                        <div className="field-details-panel">
                            {selectedField ? (
                                <>
                                    <div className="panel-header">
                                        <div>
                                            <h2>{selectedField.name}</h2>
                                            <p className="panel-subtitle">Field ID: {selectedField.id}</p>
                                        </div>
                                        <div className="header-badges">
                                            <span className={`status-indicator ${selectedField.status}`}>
                                                {selectedField.status === 'active' ? 'Active Field' : 'Needs Attention'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Field Information Grid */}
                                    <div className="field-info-grid">
                                        <div className="info-card">
                                            <div className="info-card-icon crop">
                                                <FiLayers />
                                            </div>
                                            <div className="info-card-content">
                                                <div className="info-label">Crop Type</div>
                                                <div className="info-value">{selectedField.crop}</div>
                                            </div>
                                        </div>

                                        <div className="info-card">
                                            <div className="info-card-icon area">
                                                <FiMap />
                                            </div>
                                            <div className="info-card-content">
                                                <div className="info-label">Field Area</div>
                                                <div className="info-value">{selectedField.area}</div>
                                            </div>
                                        </div>

                                        <div className="info-card">
                                            <div className="info-card-icon supervisor">
                                                <FiUser />
                                            </div>
                                            <div className="info-card-content">
                                                <div className="info-label">Supervisor</div>
                                                <div className="info-value">{selectedField.supervisor}</div>
                                            </div>
                                        </div>

                                        <div className="info-card">
                                            <div className="info-card-icon productivity">
                                                <FiTrendingUp />
                                            </div>
                                            <div className="info-card-content">
                                                <div className="info-label">Productivity</div>
                                                <div className="info-value">{selectedField.productivity}%</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Detailed Information */}
                                    <div className="detail-sections">
                                        <div className="detail-section">
                                            <h3>Location Details</h3>
                                            <div className="detail-content">
                                                <div className="detail-row">
                                                    <span className="detail-label">Address:</span>
                                                    <span className="detail-value">{selectedField.location}</span>
                                                </div>
                                                {selectedField.coordinates && (
                                                    <div className="detail-row">
                                                        <span className="detail-label">Coordinates:</span>
                                                        <span className="detail-value">{selectedField.coordinates}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="detail-section">
                                            <h3>Field Characteristics</h3>
                                            <div className="detail-content">
                                                {selectedField.soilType && (
                                                    <div className="detail-row">
                                                        <span className="detail-label">Soil Type:</span>
                                                        <span className="detail-value">{selectedField.soilType}</span>
                                                    </div>
                                                )}
                                                {selectedField.irrigation && (
                                                    <div className="detail-row">
                                                        <span className="detail-label">Irrigation:</span>
                                                        <span className="detail-value">{selectedField.irrigation}</span>
                                                    </div>
                                                )}
                                                <div className="detail-row">
                                                    <span className="detail-label">Last Harvest:</span>
                                                    <span className="detail-value">{selectedField.lastHarvest}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="detail-section">
                                            <h3>Supervisor Information</h3>
                                            <div className="detail-content">
                                                <div className="detail-row">
                                                    <span className="detail-label">Name:</span>
                                                    <span className="detail-value">{selectedField.supervisor}</span>
                                                </div>
                                                <div className="detail-row">
                                                    <span className="detail-label">Supervisor ID:</span>
                                                    <span className="detail-value">{selectedField.supervisorId}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="detail-actions">
                                        <button 
                                            className="action-btn primary"
                                            onClick={() => handleEditField(selectedField)}
                                        >
                                            <FiEdit2 /> Edit Field
                                        </button>
                                        <button 
                                            className="action-btn danger"
                                            onClick={() => handleDeleteField(selectedField.id)}
                                        >
                                            <FiTrash2 /> Delete Field
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <div className="empty-state large">
                                    <FiMap className="empty-icon" />
                                    <h3>Select a field to view details</h3>
                                    <p>Choose a field from the left panel to see detailed information</p>
                                </div>
                            )}
                        </div>
                    </div>
                </main>
            </div>

            {/* Add/Edit Field Modal */}
            {showAddFieldModal && (
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="modal large" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editingField ? 'Edit Field' : 'Add New Field'}</h2>
                            <button className="close-btn" onClick={closeModal}>
                                <FiX />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="form-section">
                                <h3>Basic Information</h3>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Field Name *</label>
                                        <input
                                            type="text"
                                            placeholder="e.g., Tea Field Matara"
                                            value={newField.name}
                                            onChange={(e) => setNewField({ ...newField, name: e.target.value })}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Crop Type *</label>
                                        <select
                                            value={newField.crop}
                                            onChange={(e) => setNewField({ ...newField, crop: e.target.value })}
                                        >
                                            <option value="">Select Crop</option>
                                            <option value="Tea">Tea</option>
                                            <option value="Coconut">Coconut</option>
                                            <option value="Rubber">Rubber</option>
                                            <option value="Cinnamon">Cinnamon</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Field Area *</label>
                                        <input
                                            type="text"
                                            placeholder="e.g., 50 Acres"
                                            value={newField.area}
                                            onChange={(e) => setNewField({ ...newField, area: e.target.value })}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Status</label>
                                        <select
                                            value={newField.status}
                                            onChange={(e) => setNewField({ ...newField, status: e.target.value })}
                                        >
                                            <option value="active">Active</option>
                                            <option value="attention">Needs Attention</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="form-section">
                                <h3>Location Details</h3>
                                <div className="form-group">
                                    <label>Location/Address *</label>
                                    <input
                                        type="text"
                                        placeholder="e.g., Matara District, Southern Province"
                                        value={newField.location}
                                        onChange={(e) => setNewField({ ...newField, location: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>GPS Coordinates (Optional)</label>
                                    <input
                                        type="text"
                                        placeholder="e.g., 5.9549° N, 80.5550° E"
                                        value={newField.coordinates}
                                        onChange={(e) => setNewField({ ...newField, coordinates: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="form-section">
                                <h3>Field Characteristics</h3>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Soil Type</label>
                                        <input
                                            type="text"
                                            placeholder="e.g., Red Clay"
                                            value={newField.soilType}
                                            onChange={(e) => setNewField({ ...newField, soilType: e.target.value })}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Irrigation System</label>
                                        <input
                                            type="text"
                                            placeholder="e.g., Drip System"
                                            value={newField.irrigation}
                                            onChange={(e) => setNewField({ ...newField, irrigation: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="form-section">
                                <h3>Supervisor Assignment</h3>
                                <div className="form-group">
                                    <label>Assign Supervisor *</label>
                                    <select
                                        value={newField.supervisorId}
                                        onChange={(e) => handleSupervisorSelect(e.target.value)}
                                    >
                                        <option value="">Select Supervisor</option>
                                        {mockSupervisors.map(supervisor => (
                                            <option key={supervisor.id} value={supervisor.id}>
                                                {supervisor.name} ({supervisor.id})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-secondary" onClick={closeModal}>
                                Cancel
                            </button>
                            <button
                                className="btn-primary"
                                onClick={editingField ? handleUpdateField : handleAddField}
                            >
                                <FiSave /> {editingField ? 'Update' : 'Save'} Field
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FieldManagement;