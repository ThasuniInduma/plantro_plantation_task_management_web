import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SideNav from '../../../components/SideNav';
import {
    FiCheck, FiX, FiClock, FiDownload, FiFilter, FiSearch, FiSave,
    FiRefreshCw, FiCalendar, FiUsers, FiTrendingUp, FiBarChart2
} from 'react-icons/fi';
import './Attendance.css';

const Attendance = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('attendance');
    
    // Mock workers data
    const [workers, setWorkers] = useState([
        { id: 'W001', name: 'Thasuni I.', role: 'Worker', department: 'Tea Plucking', phone: '+94711234567', status: 'pending' },
        { id: 'W002', name: 'Kamal R.', role: 'Supervisor', department: 'Field Management', phone: '+94712345678', status: 'pending' },
        { id: 'W003', name: 'Nimal S.', role: 'Worker', department: 'Pruning', phone: '+94713456789', status: 'pending' },
        { id: 'W004', name: 'Geetha P.', role: 'Worker', department: 'Fertilizing', phone: '+94714567890', status: 'pending' },
        { id: 'W005', name: 'Anura M.', role: 'Worker', department: 'Tea Plucking', phone: '+94715678901', status: 'pending' },
        { id: 'W006', name: 'Ramesh K.', role: 'Worker', department: 'Maintenance', phone: '+94716789012', status: 'pending' },
    ]);

    const [attendanceRecords, setAttendanceRecords] = useState({});
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [filterDepartment, setFilterDepartment] = useState('all');
    const [filterRole, setFilterRole] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [showSummary, setShowSummary] = useState(false);

    // Initialize attendance records for the day
    useEffect(() => {
        const dateKey = selectedDate;
        if (!attendanceRecords[dateKey]) {
            const newRecords = {};
            workers.forEach(worker => {
                newRecords[worker.id] = {
                    status: 'pending', // 'marked', 'absent', 'late', 'leave'
                    checkInTime: null,
                    checkOutTime: null,
                    notes: ''
                };
            });
            setAttendanceRecords(prev => ({
                ...prev,
                [dateKey]: newRecords
            }));
        }
    }, [selectedDate]);

    // Get attendance for selected date
    const currentDayAttendance = attendanceRecords[selectedDate] || {};

    // Filter workers based on search and filters
    const filteredWorkers = workers.filter(worker => {
        const matchesSearch = worker.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            worker.id.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesDepartment = filterDepartment === 'all' || worker.department === filterDepartment;
        const matchesRole = filterRole === 'all' || worker.role === filterRole;
        return matchesSearch && matchesDepartment && matchesRole;
    });

    // Mark attendance
    const markAttendance = (workerId, status) => {
        const dateKey = selectedDate;
        setAttendanceRecords(prev => ({
            ...prev,
            [dateKey]: {
                ...prev[dateKey],
                [workerId]: {
                    ...prev[dateKey][workerId],
                    status,
                    checkInTime: status === 'marked' ? new Date().toLocaleTimeString() : prev[dateKey][workerId].checkInTime,
                }
            }
        }));
    };

    // Mark all as present
    const markAllPresent = () => {
        const dateKey = selectedDate;
        const updatedRecords = {};
        filteredWorkers.forEach(worker => {
            updatedRecords[worker.id] = {
                ...currentDayAttendance[worker.id],
                status: 'marked',
                checkInTime: new Date().toLocaleTimeString()
            };
        });
        setAttendanceRecords(prev => ({
            ...prev,
            [dateKey]: {
                ...prev[dateKey],
                ...updatedRecords
            }
        }));
    };

    // Reset all for the day
    const resetDay = () => {
        const dateKey = selectedDate;
        const resetRecords = {};
        workers.forEach(worker => {
            resetRecords[worker.id] = {
                status: 'pending',
                checkInTime: null,
                checkOutTime: null,
                notes: ''
            };
        });
        setAttendanceRecords(prev => ({
            ...prev,
            [dateKey]: resetRecords
        }));
    };

    // Calculate statistics
    const stats = {
        total: workers.length,
        marked: Object.values(currentDayAttendance).filter(r => r.status === 'marked').length,
        absent: Object.values(currentDayAttendance).filter(r => r.status === 'absent').length,
        late: Object.values(currentDayAttendance).filter(r => r.status === 'late').length,
        leave: Object.values(currentDayAttendance).filter(r => r.status === 'leave').length,
        pending: Object.values(currentDayAttendance).filter(r => r.status === 'pending').length,
    };

    const attendancePercentage = stats.total > 0 ? Math.round((stats.marked / stats.total) * 100) : 0;

    // Export attendance
    const exportAttendance = () => {
        const csv = [
            ['Date', selectedDate],
            [''],
            ['Worker ID', 'Name', 'Role', 'Department', 'Status', 'Check-in Time', 'Notes'],
            ...filteredWorkers.map(worker => [
                worker.id,
                worker.name,
                worker.role,
                worker.department,
                currentDayAttendance[worker.id]?.status || 'pending',
                currentDayAttendance[worker.id]?.checkInTime || '-',
                currentDayAttendance[worker.id]?.notes || ''
            ])
        ].map(row => row.join(',')).join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `attendance_${selectedDate}.csv`;
        a.click();
    };

    // Get unique departments for filter
    const departments = ['all', ...new Set(workers.map(w => w.department))];
    const roles = ['all', ...new Set(workers.map(w => w.role))];

    return (
        <div className="attendance-layout">
            <SideNav
                role="supervisor"
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                userName="Supervisor S001"
                userRole="Attendance Manager"
            />

            <div className="main-content">
                {/* Header */}
                <header className="content-header">
                    <div className="header-left">
                        <h1 className="page-title">Attendance Management</h1>
                        <p className="page-subtitle">Mark and manage worker attendance records</p>
                    </div>
                    <div className="header-actions">
                        <button className="action-btn export-btn" onClick={exportAttendance}>
                            <FiDownload /> Export
                        </button>
                        <button className="action-btn reset-btn" onClick={resetDay}>
                            <FiRefreshCw /> Reset Day
                        </button>
                    </div>
                </header>

                {/* Scrollable Content */}
                <div className="content-body">

                    {/* Date & Quick Actions */}
                    <div className="date-section">
                        <div className="date-picker">
                            <label><FiCalendar /> Select Date:</label>
                            <input 
                                type="date" 
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="date-input"
                            />
                        </div>
                        <button className="mark-all-btn" onClick={markAllPresent}>
                            <FiCheck /> Mark All Present
                        </button>
                        <button 
                            className="summary-toggle-btn"
                            onClick={() => setShowSummary(!showSummary)}
                        >
                            <FiBarChart2 /> {showSummary ? 'Hide Summary' : 'Show Summary'}
                        </button>
                    </div>

                    {/* Statistics Summary */}
                    {showSummary && (
                        <div className="stats-grid">
                            <div className="stat-card total">
                                <div className="stat-icon"><FiUsers /></div>
                                <div className="stat-info">
                                    <span className="stat-label">Total Workers</span>
                                    <span className="stat-value">{stats.total}</span>
                                </div>
                            </div>
                            <div className="stat-card marked">
                                <div className="stat-icon"><FiCheck /></div>
                                <div className="stat-info">
                                    <span className="stat-label">Marked Present</span>
                                    <span className="stat-value">{stats.marked}</span>
                                </div>
                            </div>
                            <div className="stat-card absent">
                                <div className="stat-icon"><FiX /></div>
                                <div className="stat-info">
                                    <span className="stat-label">Absent</span>
                                    <span className="stat-value">{stats.absent}</span>
                                </div>
                            </div>
                            <div className="stat-card late">
                                <div className="stat-icon"><FiClock /></div>
                                <div className="stat-info">
                                    <span className="stat-label">Late</span>
                                    <span className="stat-value">{stats.late}</span>
                                </div>
                            </div>
                            <div className="stat-card leave">
                                <div className="stat-icon"><FiTrendingUp /></div>
                                <div className="stat-info">
                                    <span className="stat-label">On Leave</span>
                                    <span className="stat-value">{stats.leave}</span>
                                </div>
                            </div>
                            <div className="stat-card percentage">
                                <div className="stat-icon"><FiBarChart2 /></div>
                                <div className="stat-info">
                                    <span className="stat-label">Attendance %</span>
                                    <span className="stat-value">{attendancePercentage}%</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Filters */}
                    <div className="filters-section">
                        <div className="search-box">
                            <FiSearch className="search-icon" />
                            <input
                                type="text"
                                placeholder="Search by name or ID..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="search-input"
                            />
                        </div>
                        <div className="filter-group">
                            <label><FiFilter /> Department:</label>
                            <select value={filterDepartment} onChange={(e) => setFilterDepartment(e.target.value)}>
                                {departments.map(dept => (
                                    <option key={dept} value={dept}>
                                        {dept === 'all' ? 'All Departments' : dept}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="filter-group">
                            <label><FiFilter /> Role:</label>
                            <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)}>
                                {roles.map(role => (
                                    <option key={role} value={role}>
                                        {role === 'all' ? 'All Roles' : role}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Attendance Table */}
                    <div className="attendance-table-container">
                        <table className="attendance-table">
                            <thead>
                                <tr>
                                    <th>Worker ID</th>
                                    <th>Name</th>
                                    <th>Role</th>
                                    <th>Department</th>
                                    <th>Status</th>
                                    <th>Check-in Time</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredWorkers.length > 0 ? (
                                    filteredWorkers.map(worker => {
                                        const record = currentDayAttendance[worker.id] || {};
                                        return (
                                            <tr key={worker.id} className={`attendance-row status-${record.status || 'pending'}`}>
                                                <td className="worker-id">{worker.id}</td>
                                                <td className="worker-name">{worker.name}</td>
                                                <td className="worker-role">{worker.role}</td>
                                                <td className="worker-department">{worker.department}</td>
                                                <td className="status-cell">
                                                    <span className={`status-badge ${record.status || 'pending'}`}>
                                                        {record.status === 'marked' ? 'Present' : 
                                                         record.status === 'absent' ? 'Absent' :
                                                         record.status === 'late' ? 'Late' :
                                                         record.status === 'leave' ? 'Leave' : 'Pending'}
                                                    </span>
                                                </td>
                                                <td className="checkin-time">{record.checkInTime || '-'}</td>
                                                <td className="action-buttons">
                                                    <button
                                                        className={`action-btn-small ${record.status === 'marked' ? 'active' : ''}`}
                                                        onClick={() => markAttendance(worker.id, 'marked')}
                                                        title="Mark Present"
                                                    >
                                                        <FiCheck />
                                                    </button>
                                                    <button
                                                        className={`action-btn-small ${record.status === 'absent' ? 'active' : ''}`}
                                                        onClick={() => markAttendance(worker.id, 'absent')}
                                                        title="Mark Absent"
                                                    >
                                                        <FiX />
                                                    </button>
                                                    <button
                                                        className={`action-btn-small ${record.status === 'late' ? 'active' : ''}`}
                                                        onClick={() => markAttendance(worker.id, 'late')}
                                                        title="Mark Late"
                                                    >
                                                        <FiClock />
                                                    </button>
                                                    <button
                                                        className={`action-btn-small ${record.status === 'leave' ? 'active' : ''}`}
                                                        onClick={() => markAttendance(worker.id, 'leave')}
                                                        title="Mark Leave"
                                                    >
                                                        Leave
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan="7" className="no-results">No workers found matching the filters</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Save Section */}
                    <div className="save-section">
                        <button className="save-btn" onClick={() => alert('Attendance saved successfully!')}>
                            <FiSave /> Save Attendance Record
                        </button>
                        <p className="save-info">Attendance records for <strong>{selectedDate}</strong> will be saved to the system.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Attendance;
