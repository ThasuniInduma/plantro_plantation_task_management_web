import React, { useState, useEffect } from 'react';
import SideNav from '../../components/SideNav';
import {
    FiPlus, FiEdit2, FiTrash2, FiSave, FiX,
    FiSearch, FiMap, FiMapPin, FiUser, FiLayers, FiBell
} from 'react-icons/fi';
import './fieldManagement.css';

const API = 'http://localhost:8081/api';

const emptyForm = {
    field_name:    '',
    crop_id:       '',
    location:      '',
    area:          '',
    supervisor_id: ''
};

const FieldManagement = ({ logo }) => {
    const [fields,        setFields]        = useState([]);
    const [crops,         setCrops]         = useState([]);
    const [supervisors,   setSupervisors]   = useState([]);
    const [selectedField, setSelectedField] = useState(null);
    const [activeTab,     setActiveTab]     = useState('fields');
    const [showModal,     setShowModal]     = useState(false);
    const [editingField,  setEditingField]  = useState(null);
    const [formData,      setFormData]      = useState(emptyForm);
    const [searchTerm,    setSearchTerm]    = useState('');
    const [filterCrop,    setFilterCrop]    = useState('all');
    const [loading,       setLoading]       = useState(false);

    useEffect(() => {
        fetchFields();
        fetchCrops();
        fetchSupervisors();
    }, []);

    const fetchFields = async () => {
        try {
            const res  = await fetch(`${API}/fields`);
            const data = await res.json();
            setFields(Array.isArray(data) ? data : []);
        } catch (err) { console.error('Failed to fetch fields:', err); }
    };

    const fetchCrops = async () => {
        try {
            const res  = await fetch(`${API}/crops`);
            const data = await res.json();
            setCrops(Array.isArray(data) ? data : []);
        } catch (err) { console.error('Failed to fetch crops:', err); }
    };

    const fetchSupervisors = async () => {
        try {
            const res  = await fetch(`${API}/fields/supervisors`);
            const data = await res.json();
            setSupervisors(Array.isArray(data) ? data : []);
        } catch (err) { console.error('Failed to fetch supervisors:', err); }
    };

    const openAddModal = () => {
        setEditingField(null);
        setFormData(emptyForm);
        setShowModal(true);
    };

    const openEditModal = (f) => {
        setEditingField(f);
        setFormData({
            field_name:    f.field_name,
            crop_id:       String(f.crop_id),
            location:      f.location || '',
            area:          String(f.area),
            supervisor_id: String(f.supervisor_id)
        });
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingField(null);
        setFormData(emptyForm);
    };

    const handleSave = async () => {
        const { field_name, crop_id, location, area, supervisor_id } = formData;
        if (!field_name || !crop_id || !location || !area || !supervisor_id) {
            alert('Please fill in all required fields (*).');
            return;
        }
        setLoading(true);
        try {
            const payload = {
                field_name,
                crop_id:       Number(crop_id),
                location,
                area:          parseFloat(area),
                supervisor_id: Number(supervisor_id)
            };
            const url    = editingField ? `${API}/fields/${editingField.field_id}` : `${API}/fields`;
            const method = editingField ? 'PUT' : 'POST';
            const res    = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Save failed');

            if (editingField) {
                setFields(prev => prev.map(f => f.field_id === editingField.field_id ? data : f));
                if (selectedField?.field_id === editingField.field_id) setSelectedField(data);
            } else {
                setFields(prev => [...prev, data]);
            }
            closeModal();
        } catch (err) {
            alert(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (fieldId) => {
        if (!window.confirm('Delete this field? This cannot be undone.')) return;
        try {
            const res = await fetch(`${API}/fields/${fieldId}`, { method: 'DELETE' });
            if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
            setFields(prev => prev.filter(f => f.field_id !== fieldId));
            if (selectedField?.field_id === fieldId) setSelectedField(null);
        } catch (err) {
            alert('Delete failed: ' + err.message);
        }
    };

    const filteredFields = fields.filter(f => {
        const matchSearch =
            f.field_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (f.location  || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (f.crop_name || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchCrop = filterCrop === 'all' || String(f.crop_id) === filterCrop;
        return matchSearch && matchCrop;
    });

    const setField = (key) => (e) => setFormData(prev => ({ ...prev, [key]: e.target.value }));

    return (
        <div className="fm-layout">
            <SideNav
                role="admin"
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                userName="Admin User"
                userRole="Plantation Owner"
                logo={logo}
            />

            <div className="fm-main">
                {/* ── Header ── */}
                <header className="fm-header">
                    <div>
                        <h1 className="fm-title">Field Management</h1>
                        <p className="fm-subtitle">Manage plantation fields, locations and supervisors</p>
                    </div>
                    <div className="fm-header-actions">
                        <button className="fm-notif-btn">
                            <FiBell />
                            <span className="fm-notif-badge">3</span>
                        </button>
                        <button className="fm-add-btn" onClick={openAddModal}>
                            <FiPlus /> Add New Field
                        </button>
                    </div>
                </header>

                {/* ── Body ── */}
                <div className="fm-body">
                    <div className="fm-grid">

                        {/* ── Left panel ── */}
                        <div className="fm-left">
                            <div className="fm-panel-head">
                                <h2>All Fields ({filteredFields.length})</h2>
                            </div>

                            {/* Search + filter in one row */}
                            <div className="fm-controls">
                                <div className="fm-search">
                                    <FiSearch className="fm-search-icon" />
                                    <input
                                        type="text"
                                        className="fm-search-input"
                                        placeholder="Search by name, location or crop..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                                <select
                                    className="fm-filter"
                                    value={filterCrop}
                                    onChange={(e) => setFilterCrop(e.target.value)}
                                >
                                    <option value="all">All Crops</option>
                                    {crops.map(c => (
                                        <option key={c.crop_id} value={String(c.crop_id)}>
                                            {c.crop_name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* List */}
                            <div className="fm-list">
                                {filteredFields.length > 0 ? filteredFields.map(f => (
                                    <div
                                        key={f.field_id}
                                        className={`fm-card ${selectedField?.field_id === f.field_id ? 'active' : ''}`}
                                        onClick={() => setSelectedField(f)}
                                    >
                                        {/* Card header row */}
                                        <div className="fm-card-top">
                                            <div className="fm-card-title-group">
                                                <h3 className="fm-card-name">{f.field_name}</h3>
                                                <span className="fm-card-id">F{String(f.field_id).padStart(3,'0')}</span>
                                            </div>
                                            <span className="fm-crop-tag">{f.crop_name}</span>
                                        </div>

                                        {/* Info rows */}
                                        <div className="fm-card-info">
                                            <div className="fm-info-row">
                                                <FiMapPin className="fm-info-icon" />
                                                <span>{f.location}</span>
                                            </div>
                                            <div className="fm-info-row">
                                                <FiLayers className="fm-info-icon" />
                                                <span>{f.area} Acres</span>
                                            </div>
                                            <div className="fm-info-row">
                                                <FiUser className="fm-info-icon" />
                                                <span>{f.supervisor_name}</span>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="fm-card-actions">
                                            <button className="fm-btn-edit"
                                                onClick={(e) => { e.stopPropagation(); openEditModal(f); }}>
                                                <FiEdit2 /> Edit
                                            </button>
                                            <button className="fm-btn-delete"
                                                onClick={(e) => { e.stopPropagation(); handleDelete(f.field_id); }}>
                                                <FiTrash2 /> Delete
                                            </button>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="fm-empty">
                                        <div className="fm-empty-icon"><FiMap /></div>
                                        <p>No fields found</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* ── Right panel ── */}
                        <div className="fm-right">
                            {selectedField ? (
                                <>
                                    {/* Detail header */}
                                    <div className="fm-panel-head">
                                        <div>
                                            <h2>{selectedField.field_name}</h2>
                                            <p className="fm-detail-id">
                                                Field ID: F{String(selectedField.field_id).padStart(3,'0')}
                                            </p>
                                        </div>
                                    </div>

                                    {/* 3 stat cards */}
                                    <div className="fm-stat-grid">
                                        <div className="fm-stat">
                                            <div className="fm-stat-icon crop"><FiLayers /></div>
                                            <div>
                                                <p className="fm-stat-label">Crop Type</p>
                                                <p className="fm-stat-value">{selectedField.crop_name}</p>
                                            </div>
                                        </div>
                                        <div className="fm-stat">
                                            <div className="fm-stat-icon area"><FiMap /></div>
                                            <div>
                                                <p className="fm-stat-label">Field Area</p>
                                                <p className="fm-stat-value">{selectedField.area} Acres</p>
                                            </div>
                                        </div>
                                        <div className="fm-stat">
                                            <div className="fm-stat-icon sup"><FiUser /></div>
                                            <div>
                                                <p className="fm-stat-label">Supervisor</p>
                                                <p className="fm-stat-value">{selectedField.supervisor_name}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Detail rows */}
                                    <div className="fm-detail-body">
                                        <div className="fm-detail-section">
                                            <h4>Location</h4>
                                            <div className="fm-detail-row">
                                                <span>Address</span>
                                                <span>{selectedField.location || '—'}</span>
                                            </div>
                                        </div>

                                        <div className="fm-detail-section">
                                            <h4>Supervisor</h4>
                                            <div className="fm-detail-row">
                                                <span>Name</span>
                                                <span>{selectedField.supervisor_name}</span>
                                            </div>
                                            <div className="fm-detail-row">
                                                <span>User ID</span>
                                                <span>#{selectedField.supervisor_id}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Detail actions */}
                                    <div className="fm-detail-actions">
                                        <button className="fm-action-edit"
                                            onClick={() => openEditModal(selectedField)}>
                                            <FiEdit2 /> Edit Field
                                        </button>
                                        <button className="fm-action-delete"
                                            onClick={() => handleDelete(selectedField.field_id)}>
                                            <FiTrash2 /> Delete Field
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <div className="fm-empty large">
                                    <div className="fm-empty-icon"><FiMap /></div>
                                    <h3>Select a Field</h3>
                                    <p>Choose a field from the left panel to see its details</p>
                                </div>
                            )}
                        </div>

                    </div>
                </div>
            </div>

            {/* ── Modal ── */}
            {showModal && (
                <div className="fm-overlay" onClick={closeModal}>
                    <div className="fm-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="fm-modal-head">
                            <h2>{editingField ? 'Edit Field' : 'Add New Field'}</h2>
                            <button className="fm-modal-close" onClick={closeModal}><FiX /></button>
                        </div>

                        <div className="fm-modal-body">
                            <div className="fm-form-section">
                                <h3>Basic Information</h3>
                                <div className="fm-form-row">
                                    <div className="fm-form-group">
                                        <label>Field Name *</label>
                                        <input type="text" placeholder="e.g. North Hill Field"
                                            value={formData.field_name} onChange={setField('field_name')} />
                                    </div>
                                    <div className="fm-form-group">
                                        <label>Crop Type *</label>
                                        <select value={formData.crop_id} onChange={setField('crop_id')}>
                                            <option value="">Select Crop</option>
                                            {crops.map(c => (
                                                <option key={c.crop_id} value={c.crop_id}>{c.crop_name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div className="fm-form-row">
                                    <div className="fm-form-group">
                                        <label>Location / Address *</label>
                                        <input type="text" placeholder="e.g. Matara District"
                                            value={formData.location} onChange={setField('location')} />
                                    </div>
                                    <div className="fm-form-group">
                                        <label>Area (Acres) *</label>
                                        <input type="number" step="0.01" min="0" placeholder="e.g. 5.50"
                                            value={formData.area} onChange={setField('area')} />
                                    </div>
                                </div>
                            </div>

                            <div className="fm-form-section">
                                <h3>Supervisor Assignment</h3>
                                <div className="fm-form-group">
                                    <label>Assign Supervisor *</label>
                                    <select value={formData.supervisor_id} onChange={setField('supervisor_id')}>
                                        <option value="">Select Supervisor</option>
                                        {supervisors.map(s => (
                                            <option key={s.user_id} value={s.user_id}>
                                                {s.full_name} — {s.email}
                                            </option>
                                        ))}
                                    </select>
                                    {supervisors.length === 0 && (
                                        <p className="fm-hint">⚠ No active supervisors found.</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="fm-modal-foot">
                            <button className="fm-btn-cancel" onClick={closeModal}>Cancel</button>
                            <button className="fm-btn-save" onClick={handleSave} disabled={loading}>
                                {loading ? 'Saving…' : <><FiSave /> {editingField ? 'Update' : 'Save'} Field</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FieldManagement;