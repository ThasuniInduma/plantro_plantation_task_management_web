import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    FiAlertCircle, FiUsers, FiMap, FiCheckCircle, FiClock,
    FiBell, FiActivity, FiPackage, FiBarChart2, FiRefreshCw,
    FiWifiOff, FiTrendingUp, FiXCircle, FiChevronRight
} from 'react-icons/fi';
import './adminDashboard.css';

const API_BASE = 'http://localhost:8081/api/admin/dashboard';

/* ─── API helper ──────────────────────────────────────── */
const apiFetch = async (url, options = {}) => {
    const res = await fetch(url, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...options.headers },
        ...options,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || `Request failed (${res.status})`);
    return data;
};

/* ─── Skeleton loader ─────────────────────────────────── */
const Skeleton = ({ width = '100%', height = '1rem', radius = '6px', style = {} }) => (
    <div className="skeleton" style={{ width, height, borderRadius: radius, ...style }} />
);

/* ─── Stat Card ───────────────────────────────────────── */
const StatCard = ({ variant, icon, value, label, meta, loading }) => (
    <div className={`stat-card ${variant}`}>
        <div className="stat-icon">{icon}</div>
        <div className="stat-content">
            {loading ? (
                <>
                    <Skeleton width="60px" height="2rem" style={{ marginBottom: '0.4rem' }} />
                    <Skeleton width="80px" height="0.75rem" />
                </>
            ) : (
                <>
                    <div className="stat-value">{value ?? '—'}</div>
                    <div className="stat-label">{label}</div>
                    {meta && <div className="stat-meta">{meta}</div>}
                </>
            )}
        </div>
    </div>
);

/* ─── Notification icon ───────────────────────────────── */
const NotifIcon = ({ type }) => {
    if (type === 'warning') return <FiAlertCircle />;
    if (type === 'success') return <FiCheckCircle />;
    if (type === 'harvest') return <FiTrendingUp />;
    return <FiActivity />;
};

/* ══════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════ */
const AdminDashboard = () => {
    const navigate = useNavigate();

    /* ── State ── */
    const [selectedField, setSelectedField]         = useState(null);
    const [showNotifications, setShowNotifications] = useState(false);

    const [stats, setStats]               = useState(null);
    const [fields, setFields]             = useState([]);
    const [notifications, setNotifications] = useState([]);

    const [loadingStats, setLoadingStats]           = useState(true);
    const [loadingFields, setLoadingFields]         = useState(true);
    const [loadingNotifs, setLoadingNotifs]         = useState(false);
    const [loadingFieldDetail, setLoadingFieldDetail] = useState(false);
    const [error, setError]               = useState(null);

    const notifRef   = useRef(null);
    const pollingRef = useRef(null);

    const unreadCount = notifications.filter(n => n.unread).length;

    /* ── Close dropdown on outside click ── */
    useEffect(() => {
        const handle = (e) => {
            if (notifRef.current && !notifRef.current.contains(e.target)) {
                setShowNotifications(false);
            }
        };
        document.addEventListener('mousedown', handle);
        return () => document.removeEventListener('mousedown', handle);
    }, []);

    /* ─── Fetch helpers ─────────────────────────────── */
    const fetchStats = useCallback(async () => {
        setLoadingStats(true);
        try {
            const data = await apiFetch(`${API_BASE}/stats`);
            setStats(data.stats);
            setError(null);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoadingStats(false);
        }
    }, []);

    const fetchFields = useCallback(async () => {
        setLoadingFields(true);
        try {
            const data = await apiFetch(`${API_BASE}/fields`);
            setFields(data.fields || []);
            setError(null);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoadingFields(false);
        }
    }, []);

    const fetchNotifications = useCallback(async () => {
        setLoadingNotifs(true);
        try {
            const data = await apiFetch(`${API_BASE}/notifications`);
            setNotifications(data.notifications || []);
        } catch (err) {
            console.error('Notification fetch error:', err.message);
        } finally {
            setLoadingNotifs(false);
        }
    }, []);

    /* ── Initial load ── */
    useEffect(() => {
        fetchStats();
        fetchFields();
        fetchNotifications();
    }, [fetchStats, fetchFields, fetchNotifications]);

    /* ── Poll notifications every 30s ── */
    useEffect(() => {
        pollingRef.current = setInterval(() => {
            fetchNotifications();
        }, 30_000);
        return () => clearInterval(pollingRef.current);
    }, [fetchNotifications]);

    /* ─── Field detail ──────────────────────────────── */
    const handleFieldClick = async (field) => {
        setLoadingFieldDetail(true);
        setSelectedField({ ...field, _loading: true });
        try {
            const data = await apiFetch(`${API_BASE}/fields/${field.field_id}`);
            setSelectedField(data.field);
        } catch (err) {
            console.error('Field detail error:', err.message);
            setSelectedField({ ...field, _loading: false });
        } finally {
            setLoadingFieldDetail(false);
        }
    };

    /* ─── Mark all notifications read ──────────────── */
    const markAllAsRead = async () => {
        // Optimistic update
        setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
        try {
            await apiFetch(`${API_BASE}/notifications/read`, { method: 'PUT' });
        } catch (err) {
            console.error('Mark read error:', err.message);
        }
    };

    /* ─── Mark single notification read ────────────── */
    const markOneRead = async (notifId) => {
        setNotifications(prev =>
            prev.map(n => n.id === notifId ? { ...n, unread: false } : n)
        );
        try {
            await apiFetch(`${API_BASE}/notifications/${notifId}/read`, { method: 'PUT' });
        } catch (err) {
            console.error('Mark single read error:', err.message);
        }
    };

    /* ─── Dismiss notification ──────────────────────── */
    const dismissNotification = async (notifId) => {
        setNotifications(prev => prev.filter(n => n.id !== notifId));
        try {
            await apiFetch(`${API_BASE}/notifications/${notifId}`, { method: 'DELETE' });
        } catch (err) {
            console.error('Dismiss error:', err.message);
            // Re-fetch to restore if delete failed
            fetchNotifications();
        }
    };

    const handleRefresh = () => {
        setError(null);
        fetchStats();
        fetchFields();
        fetchNotifications();
    };

    /* ════════════════════════════════════════════════
       FIELD DETAIL VIEW
    ════════════════════════════════════════════════ */
    const FieldDetailsView = ({ field }) => (
        <div className="field-detail-container">
            <button className="back-btn" onClick={() => setSelectedField(null)}>
                ← Back to Overview
            </button>

            {field._loading ? (
                <div className="detail-skeleton">
                    <Skeleton height="2.5rem" width="50%" style={{ marginBottom: '1rem' }} />
                    <Skeleton height="1rem" width="30%" style={{ marginBottom: '2rem' }} />
                    <div className="info-grid-skeleton">
                        {[...Array(4)].map((_, i) => <Skeleton key={i} height="80px" radius="10px" />)}
                    </div>
                    <Skeleton height="200px" radius="14px" style={{ marginTop: '1rem' }} />
                </div>
            ) : (
                <>
                    <div className="field-detail-header">
                        <div>
                            <h1 className="field-name">{field.name}</h1>
                            <p className="field-id">Field ID: {field.id ?? field.field_id}</p>
                            {field.location && (
                                <p className="field-id" style={{ marginTop: '0.25rem' }}>
                                    📍 {field.location}
                                </p>
                            )}
                        </div>
                        <div className={`status-indicator ${field.status}`}>
                            {field.status === 'active' ? '✓ On Track' : '⚠ Needs Attention'}
                        </div>
                    </div>

                    <div className="field-info-grid">
                        <div className="info-card">
                            <div className="info-label">Crop Type</div>
                            <div className="info-value">{field.crop ?? '—'}</div>
                        </div>
                        <div className="info-card">
                            <div className="info-label">Area</div>
                            <div className="info-value">{field.area ?? '—'}</div>
                        </div>
                        <div className="info-card">
                            <div className="info-label">Supervisor</div>
                            <div className="info-value" style={{ fontSize: '1rem' }}>
                                {field.supervisor ?? 'Unassigned'}
                            </div>
                        </div>
                        <div className="info-card">
                            <div className="info-label">Today's Completion</div>
                            <div className="info-value">{field.completionRate ?? 0}%</div>
                        </div>
                    </div>

                    <div className="tasks-section">
                        <h2 className="section-title">Today's Tasks &amp; Workforce</h2>
                        <div className="tasks-list">
                            {field.tasksToday?.length > 0 ? (
                                field.tasksToday.map((task, idx) => (
                                    <div key={task.task_id ?? idx} className="task-card">
                                        <div className="task-header">
                                            <h3>{task.task ?? task.taskName}</h3>
                                            <span className={`task-status ${(task.status ?? '').toLowerCase().replace(/\s+/g, '-')}`}>
                                                {task.status}
                                            </span>
                                        </div>
                                        <div className="task-workers">
                                            <FiUsers className="icon" />
                                            <span>
                                                {task.workers?.length > 0
                                                    ? task.workers.join(', ')
                                                    : 'No workers assigned'}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="no-tasks-state">
                                    <FiCheckCircle style={{ fontSize: '2rem', color: '#10b981', marginBottom: '0.5rem' }} />
                                    <p>No tasks scheduled for today</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {field.nextDue && (
                        <div className="next-task-card">
                            <FiClock className="next-icon" />
                            <div>
                                <h3>Next Major Task</h3>
                                <p>{field.nextDue}</p>
                            </div>
                            <button className="manage-btn" onClick={() => navigate('/crop')}>
                                Manage Tasks
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );

    /* ════════════════════════════════════════════════
       OVERVIEW DASHBOARD
    ════════════════════════════════════════════════ */
    const OverviewDashboard = () => (
        <div className="overview-container">

            {/* Error banner */}
            {error && (
                <div className="error-banner">
                    <FiWifiOff />
                    <span>{error}</span>
                    <button onClick={handleRefresh}>
                        <FiRefreshCw /> Retry
                    </button>
                </div>
            )}

            {/* Stats row */}
            <div className="stats-grid">
                <StatCard variant="first"   icon={<FiMap />}         value={stats?.totalFields}          label="Total Fields"      loading={loadingStats} />
                <StatCard variant="success" icon={<FiCheckCircle />} value={stats?.tasksCompletedToday}  label="Completed Today"   loading={loadingStats} />
                <StatCard variant="warning" icon={<FiAlertCircle />} value={stats?.tasksPending}         label="Pending Tasks"     loading={loadingStats} />
                <StatCard variant="info"    icon={<FiUsers />}       value={stats?.totalWorkers}         label="Total Workforce"
                    meta={stats ? `${stats.absentWorkers} absent today` : null}
                    loading={loadingStats}
                />
            </div>

            {/* Quick Access Modules */}
            <div className="modules-section">
                <h2 className="section-title">Quick Access</h2>
                <div className="modules-grid">
                    <div className="module-card crop" onClick={() => navigate('/crop')}>
                        <div className="module-icon"><FiPackage /></div>
                        <h3>Crop Management</h3>
                        <p>Define tasks, frequencies, and update crop cycles</p>
                        <span className="module-arrow"><FiChevronRight /></span>
                    </div>
                    <div className="module-card field" onClick={() => navigate('/field')}>
                        <div className="module-icon"><FiMap /></div>
                        <h3>Field Management</h3>
                        <p>Add/edit fields, locations, and assign supervisors</p>
                        <span className="module-arrow"><FiChevronRight /></span>
                    </div>
                    <div className="module-card workforce" onClick={() => navigate('/workforce')}>
                        <div className="module-icon"><FiUsers /></div>
                        <h3>Workforce Management</h3>
                        <p>Manage worker/supervisor accounts and assignments</p>
                        <span className="module-arrow"><FiChevronRight /></span>
                    </div>
                    <div className="module-card reports" onClick={() => navigate('/report')}>
                        <div className="module-icon"><FiBarChart2 /></div>
                        <h3>Reports &amp; Analytics</h3>
                        <p>Generate performance and harvest reports</p>
                        <span className="module-arrow"><FiChevronRight /></span>
                    </div>
                </div>
            </div>

            {/* Field Activity Summary */}
            <div className="fields-section">
                <div className="section-header-row">
                    <h2 className="section-title" style={{ marginBottom: 0 }}>Field Activity Summary</h2>
                    <button className="refresh-btn" onClick={fetchFields} disabled={loadingFields}>
                        <FiRefreshCw className={loadingFields ? 'spin' : ''} />
                        {loadingFields ? 'Loading…' : 'Refresh'}
                    </button>
                </div>

                <div className="fields-grid" style={{ marginTop: '1.5rem' }}>
                    {loadingFields ? (
                        [...Array(3)].map((_, i) => (
                            <div key={i} className="field-card skeleton-card">
                                <Skeleton height="1.25rem" width="60%" style={{ marginBottom: '0.75rem' }} />
                                <Skeleton height="0.85rem" width="40%" style={{ marginBottom: '0.5rem' }} />
                                <Skeleton height="0.85rem" width="50%" style={{ marginBottom: '0.5rem' }} />
                                <Skeleton height="0.85rem" width="35%" style={{ marginBottom: '1rem' }} />
                                <Skeleton height="6px"    radius="999px" />
                            </div>
                        ))
                    ) : fields.length === 0 ? (
                        <div className="empty-fields-state">
                            <FiMap style={{ fontSize: '2.5rem', color: '#cbd5e1' }} />
                            <p>No fields found.{' '}
                                <span onClick={() => navigate('/field')} className="link-action">
                                    Add a field →
                                </span>
                            </p>
                        </div>
                    ) : (
                        fields.map(field => (
                            <div
                                key={field.field_id}
                                className={`field-card ${field.status}`}
                                onClick={() => handleFieldClick(field)}
                                role="button"
                                tabIndex={0}
                                onKeyDown={e => e.key === 'Enter' && handleFieldClick(field)}
                            >
                                <div className="field-card-header">
                                    <h3>{field.name}</h3>
                                    <div className={`field-status-badge ${field.status}`}>
                                        {field.status === 'active' ? 'Active' : 'Attention'}
                                    </div>
                                </div>

                                <div className="field-card-body">
                                    <div className="field-info-row">
                                        <span className="label">Crop</span>
                                        <span className="value">{field.crop ?? '—'}</span>
                                    </div>
                                    <div className="field-info-row">
                                        <span className="label">Supervisor</span>
                                        <span className="value">
                                            {!field.supervisor || field.supervisor === 'Unassigned'
                                                ? 'Unassigned'
                                                : field.supervisor.split(' (')[0]}
                                        </span>
                                    </div>
                                    <div className="field-info-row">
                                        <span className="label">Tasks Today</span>
                                        <span className="value">
                                            {Array.isArray(field.tasksToday)
                                                ? field.tasksToday.length
                                                : field.tasksTodayCount ?? 0}
                                        </span>
                                    </div>
                                </div>

                                <div className="completion-bar">
                                    <div
                                        className="completion-fill"
                                        style={{ width: `${field.completionRate ?? 0}%` }}
                                    />
                                </div>
                                <div className="completion-text">{field.completionRate ?? 0}% Complete</div>
                                <div className="view-details">View Details →</div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );

    /* ════════════════════════════════════════════════
       ROOT RENDER
    ════════════════════════════════════════════════ */
    return (
        <div className="admin-dashboard-layout">
            <div className="main-content">

                {/* ── Header ── */}
                <header className="content-header">
                    <div className="header-left">
                        <h1 className="page-title">
                            {selectedField ? selectedField.name : 'Dashboard Overview'}
                        </h1>
                        <p className="page-subtitle">
                            {selectedField
                                ? `Field ID: ${selectedField.id ?? selectedField.field_id ?? '…'}`
                                : 'Manage your plantation operations efficiently'}
                        </p>
                    </div>

                    <div className="header-actions">
                        {/* Notification bell */}
                        <div className="notification-wrapper" ref={notifRef}>
                            <button
                                className="notification-btn"
                                aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
                                onClick={() => {
                                    const opening = !showNotifications;
                                    setShowNotifications(opening);
                                    if (opening) fetchNotifications();
                                }}
                            >
                                <FiBell />
                                {unreadCount > 0 && (
                                    <span className="notification-badge">
                                        {unreadCount > 99 ? '99+' : unreadCount}
                                    </span>
                                )}
                            </button>

                            {/* Dropdown */}
                            {showNotifications && (
                                <div className="notification-dropdown" role="dialog" aria-label="Notifications">
                                    <div className="notification-header">
                                        <h3>Notifications</h3>
                                        <div className="notif-header-actions">
                                            {unreadCount > 0 && (
                                                <button className="mark-read-btn" onClick={markAllAsRead}>
                                                    Mark all read
                                                </button>
                                            )}
                                            <button
                                                className="icon-close-btn"
                                                onClick={() => setShowNotifications(false)}
                                                aria-label="Close"
                                            >
                                                <FiXCircle />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="notification-list">
                                        {loadingNotifs ? (
                                            <div style={{ padding: '1rem 1.5rem' }}>
                                                {[...Array(3)].map((_, i) => (
                                                    <Skeleton key={i} height="3rem" radius="8px" style={{ marginBottom: '0.5rem' }} />
                                                ))}
                                            </div>
                                        ) : notifications.length === 0 ? (
                                            <div className="notif-empty">
                                                <FiBell style={{ fontSize: '2rem', color: '#cbd5e1', marginBottom: '0.5rem' }} />
                                                <p>You're all caught up!</p>
                                            </div>
                                        ) : (
                                            notifications.map(notif => (
                                                <div
                                                    key={notif.id}
                                                    className={`notification-item ${notif.unread ? 'unread' : ''} ${notif.type}`}
                                                    onClick={() => notif.unread && markOneRead(notif.id)}
                                                >
                                                    <div className="notification-icon">
                                                        <NotifIcon type={notif.type} />
                                                    </div>
                                                    <div className="notification-content">
                                                        <p className="notification-message">{notif.message}</p>
                                                        <span className="notification-time">{notif.time}</span>
                                                    </div>
                                                    <div className="notif-item-actions">
                                                        {notif.unread && <span className="unread-dot" />}
                                                        <button
                                                            className="dismiss-btn"
                                                            aria-label="Dismiss"
                                                            onClick={e => {
                                                                e.stopPropagation();
                                                                dismissNotification(notif.id);
                                                            }}
                                                        >
                                                            <FiXCircle />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>

                                    <div className="notification-footer">
                                        <button
                                            className="view-all-btn"
                                            onClick={() => setShowNotifications(false)}
                                        >
                                            Close
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Global refresh */}
                        <button className="refresh-icon-btn" onClick={handleRefresh} aria-label="Refresh dashboard">
                            <FiRefreshCw className={(loadingStats || loadingFields) ? 'spin' : ''} />
                        </button>
                    </div>
                </header>

                {/* ── Body ── */}
                <main className="content-body">
                    {selectedField
                        ? <FieldDetailsView field={selectedField} />
                        : <OverviewDashboard />
                    }
                </main>
            </div>
        </div>
    );
};

export default AdminDashboard;