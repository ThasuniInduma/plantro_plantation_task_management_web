import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SideNav from '../../components/SideNav';
import {
    FiDownload, FiFilter, FiCalendar, FiTrendingUp, FiBarChart2,
    FiPieChart, FiCheckCircle, FiClock, FiMapPin, FiUser, FiFileText,
    FiEye, FiSearch, FiChevronDown, FiAward
} from 'react-icons/fi';
import './reportManagement.css';

const ReportManagement = ({ logo }) => {
    const [activeTab, setActiveTab] = useState('reports');
    const [reportType, setReportType] = useState('task-completion');
    const [filterField, setFilterField] = useState('all');
    const [filterCropType, setFilterCropType] = useState('all');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [selectedReport, setSelectedReport] = useState(null);
    const navigate = useNavigate();

    // Mock data for task completion reports
    const taskCompletionReports = [
        {
            id: 'TR001',
            taskName: 'Tea Tuning',
            field: 'Field A',
            cropType: 'Tea',
            location: 'Nuwara Eliya District',
            startDate: '2024-01-15',
            endDate: '2024-01-20',
            scheduledWorkers: 5,
            completedWorkers: 4,
            completionRate: 80,
            hoursWorked: 32,
            hoursPlanned: 40,
            status: 'completed',
            supervisor: 'Kamal Jayasuriya'
        },
        {
            id: 'TR002',
            taskName: 'Coconut Harvesting',
            field: 'Field C',
            cropType: 'Coconut',
            location: 'Kandy District',
            startDate: '2024-01-18',
            endDate: '2024-01-22',
            scheduledWorkers: 8,
            completedWorkers: 7,
            completionRate: 87.5,
            hoursWorked: 52,
            hoursPlanned: 60,
            status: 'in-progress',
            supervisor: 'Kamal Jayasuriya'
        },
        {
            id: 'TR003',
            taskName: 'Rubber Tapping',
            field: 'Field B',
            cropType: 'Rubber',
            location: 'Kegalle District',
            startDate: '2024-01-20',
            endDate: '2024-01-25',
            scheduledWorkers: 6,
            completedWorkers: 5,
            completionRate: 83,
            hoursWorked: 35,
            hoursPlanned: 42,
            status: 'completed',
            supervisor: 'Kamal Jayasuriya'
        }
    ];

    // Mock data for worker performance reports
    const workerPerformanceReports = [
        {
            id: 'WR001',
            workerName: 'Kamal Jayasuriya',
            role: 'Supervisor',
            tasksAssigned: 5,
            tasksCompleted: 5,
            completionRate: 100,
            averageRating: 4.8,
            hoursWorked: 160,
            specialties: ['Tea', 'Tuning'],
            location: 'Nuwara Eliya District'
        },
        {
            id: 'WR002',
            workerName: 'Pradeep Silva',
            role: 'Worker',
            tasksAssigned: 3,
            tasksCompleted: 3,
            completionRate: 100,
            averageRating: 4.5,
            hoursWorked: 42,
            specialties: ['Coconut', 'Harvesting'],
            location: 'Kandy District'
        },
        {
            id: 'WR003',
            workerName: 'Sanjeewa Perera',
            role: 'Worker',
            tasksAssigned: 2,
            tasksCompleted: 1,
            completionRate: 50,
            averageRating: 3.8,
            hoursWorked: 28,
            specialties: ['Rubber', 'Tapping'],
            location: 'Kegalle District'
        }
    ];

    // Mock data for field reports
    const fieldReports = [
        {
            id: 'FR001',
            fieldName: 'Field A',
            cropType: 'Tea',
            area: 25,
            location: 'Nuwara Eliya District',
            lastTaskDate: '2024-01-20',
            upcomingTasks: 2,
            completionRate: 85,
            supervisor: 'Kamal Jayasuriya',
            health: 'Excellent'
        },
        {
            id: 'FR002',
            fieldName: 'Field C',
            cropType: 'Coconut',
            area: 35,
            location: 'Kandy District',
            lastTaskDate: '2024-01-22',
            upcomingTasks: 3,
            completionRate: 78,
            supervisor: 'Kamal Jayasuriya',
            health: 'Good'
        },
        {
            id: 'FR003',
            fieldName: 'Field B',
            cropType: 'Rubber',
            area: 40,
            location: 'Kegalle District',
            lastTaskDate: '2024-01-25',
            upcomingTasks: 1,
            completionRate: 90,
            supervisor: 'Kamal Jayasuriya',
            health: 'Excellent'
        }
    ];

    // Get current reports based on type
    const getCurrentReports = () => {
        switch (reportType) {
            case 'task-completion':
                return taskCompletionReports.filter(r => {
                    const fieldMatch = filterField === 'all' || r.field === filterField;
                    const cropMatch = filterCropType === 'all' || r.cropType === filterCropType;
                    return fieldMatch && cropMatch;
                });
            case 'worker-performance':
                return workerPerformanceReports;
            case 'field-report':
                return fieldReports.filter(r => {
                    const fieldMatch = filterField === 'all' || r.fieldName === filterField;
                    const cropMatch = filterCropType === 'all' || r.cropType === filterCropType;
                    return fieldMatch && cropMatch;
                });
            default:
                return [];
        }
    };

    const handleExportPDF = (report) => {
        alert(`Exporting ${reportType} report: ${report.id} to PDF`);
        // Implement PDF export logic here
    };

    const handleExportCSV = (report) => {
        alert(`Exporting ${reportType} report: ${report.id} to CSV`);
        // Implement CSV export logic here
    };

    const handleViewDetails = (report) => {
        setSelectedReport(report);
    };

    // Dashboard statistics
    const dashboardStats = {
        totalTasks: taskCompletionReports.length,
        completedTasks: taskCompletionReports.filter(t => t.status === 'completed').length,
        inProgressTasks: taskCompletionReports.filter(t => t.status === 'in-progress').length,
        averageCompletion: (taskCompletionReports.reduce((sum, t) => sum + t.completionRate, 0) / taskCompletionReports.length).toFixed(1),
        totalWorkers: workerPerformanceReports.length,
        totalFields: fieldReports.length,
        overallPerformance: 85
    };

    const currentReports = getCurrentReports();

    return (
        <div className="report-management-layout">
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
                        <h1 className="page-title">Report Management</h1>
                        <p className="page-subtitle">View and export task, worker, and field reports</p>
                    </div>
                    <div className="header-actions">
                        <button className="export-btn" onClick={() => handleExportPDF({})}>
                            <FiDownload /> Export All
                        </button>
                    </div>
                </header>

                {/* Main Content */}
                <main className="content-body">
                    {/* Dashboard Stats */}
                    <div className="dashboard-stats">
                        <div className="stat-card">
                            <div className="stat-icon">
                                <FiCheckCircle />
                            </div>
                            <div className="stat-info">
                                <span className="stat-label">Completed Tasks</span>
                                <span className="stat-value">{dashboardStats.completedTasks}/{dashboardStats.totalTasks}</span>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon">
                                <FiClock />
                            </div>
                            <div className="stat-info">
                                <span className="stat-label">In Progress</span>
                                <span className="stat-value">{dashboardStats.inProgressTasks}</span>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon">
                                <FiTrendingUp />
                            </div>
                            <div className="stat-info">
                                <span className="stat-label">Avg Completion</span>
                                <span className="stat-value">{dashboardStats.averageCompletion}%</span>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon">
                                <FiBarChart2 />
                            </div>
                            <div className="stat-info">
                                <span className="stat-label">Overall Performance</span>
                                <span className="stat-value">{dashboardStats.overallPerformance}%</span>
                            </div>
                        </div>
                    </div>

                    {/* Report Type Selector */}
                    <div className="report-selector">
                        <button
                            className={`report-type-btn ${reportType === 'task-completion' ? 'active' : ''}`}
                            onClick={() => setReportType('task-completion')}
                        >
                            <FiCheckCircle /> Task Completion Reports
                        </button>
                        <button
                            className={`report-type-btn ${reportType === 'worker-performance' ? 'active' : ''}`}
                            onClick={() => setReportType('worker-performance')}
                        >
                            <FiUser /> Worker Performance Reports
                        </button>
                        <button
                            className={`report-type-btn ${reportType === 'field-report' ? 'active' : ''}`}
                            onClick={() => setReportType('field-report')}
                        >
                            <FiMapPin /> Field Status Reports
                        </button>
                    </div>

                    {/* Filters */}
                    <div className="filters-section">
                        <div className="filter-group">
                            <label><FiFilter /> Field</label>
                            <select value={filterField} onChange={(e) => setFilterField(e.target.value)}>
                                <option value="all">All Fields</option>
                                <option value="Field A">Field A</option>
                                <option value="Field B">Field B</option>
                                <option value="Field C">Field C</option>
                            </select>
                        </div>
                        <div className="filter-group">
                            <label><FiFilter /> Crop Type</label>
                            <select value={filterCropType} onChange={(e) => setFilterCropType(e.target.value)}>
                                <option value="all">All Crops</option>
                                <option value="Tea">Tea</option>
                                <option value="Coconut">Coconut</option>
                                <option value="Rubber">Rubber</option>
                                <option value="Cinnamon">Cinnamon</option>
                            </select>
                        </div>
                        <div className="filter-group">
                            <label><FiCalendar /> Start Date</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                            />
                        </div>
                        <div className="filter-group">
                            <label><FiCalendar /> End Date</label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Reports List */}
                    <div className="reports-container">
                        {currentReports.length > 0 ? (
                            <div className="reports-grid">
                                {currentReports.map(report => (
                                    <div key={report.id} className="report-card">
                                        <div className="report-header">
                                            <div className="report-title">
                                                <h3>
                                                    {reportType === 'task-completion' && report.taskName}
                                                    {reportType === 'worker-performance' && report.workerName}
                                                    {reportType === 'field-report' && report.fieldName}
                                                </h3>
                                                <span className="report-id">{report.id}</span>
                                            </div>
                                            <div className="report-actions">
                                                <button
                                                    className="action-btn view"
                                                    onClick={() => handleViewDetails(report)}
                                                    title="View Details"
                                                >
                                                    <FiEye />
                                                </button>
                                                <button
                                                    className="action-btn download-pdf"
                                                    onClick={() => handleExportPDF(report)}
                                                    title="Export as PDF"
                                                >
                                                    <FiDownload />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="report-content">
                                            {reportType === 'task-completion' && (
                                                <>
                                                    <div className="content-row">
                                                        <span className="label">Field:</span>
                                                        <span className="value">{report.field}</span>
                                                    </div>
                                                    <div className="content-row">
                                                        <span className="label">Crop Type:</span>
                                                        <span className="value">{report.cropType}</span>
                                                    </div>
                                                    <div className="content-row">
                                                        <span className="label">Location:</span>
                                                        <span className="value">{report.location}</span>
                                                    </div>
                                                    <div className="content-row">
                                                        <span className="label">Completion Rate:</span>
                                                        <span className="value completion-rate">{report.completionRate}%</span>
                                                    </div>
                                                    <div className="progress-bar">
                                                        <div className="progress-fill" style={{ width: `${report.completionRate}%` }}></div>
                                                    </div>
                                                </>
                                            )}

                                            {reportType === 'worker-performance' && (
                                                <>
                                                    <div className="content-row">
                                                        <span className="label">Role:</span>
                                                        <span className="value">{report.role}</span>
                                                    </div>
                                                    <div className="content-row">
                                                        <span className="label">Tasks Completed:</span>
                                                        <span className="value">{report.tasksCompleted}/{report.tasksAssigned}</span>
                                                    </div>
                                                    <div className="content-row">
                                                        <span className="label">Rating:</span>
                                                        <span className="value rating">⭐ {report.averageRating}/5</span>
                                                    </div>
                                                    <div className="content-row">
                                                        <span className="label">Hours Worked:</span>
                                                        <span className="value">{report.hoursWorked}h</span>
                                                    </div>
                                                </>
                                            )}

                                            {reportType === 'field-report' && (
                                                <>
                                                    <div className="content-row">
                                                        <span className="label">Crop Type:</span>
                                                        <span className="value">{report.cropType}</span>
                                                    </div>
                                                    <div className="content-row">
                                                        <span className="label">Area:</span>
                                                        <span className="value">{report.area} acres</span>
                                                    </div>
                                                    <div className="content-row">
                                                        <span className="label">Health Status:</span>
                                                        <span className={`value health-${report.health.toLowerCase()}`}>{report.health}</span>
                                                    </div>
                                                    <div className="content-row">
                                                        <span className="label">Completion Rate:</span>
                                                        <span className="value">{report.completionRate}%</span>
                                                    </div>
                                                </>
                                            )}
                                        </div>

                                        <div className="report-footer">
                                            <span className="report-date">
                                                {reportType === 'task-completion' && `${report.startDate} to ${report.endDate}`}
                                                {reportType === 'worker-performance' && `Location: ${report.location}`}
                                                {reportType === 'field-report' && `Last Update: ${report.lastTaskDate}`}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="empty-state">
                                <FiFileText className="empty-icon" />
                                <h3>No reports found</h3>
                                <p>Try adjusting your filters to find the reports you're looking for</p>
                            </div>
                        )}
                    </div>
                </main>
            </div>

            {/* Report Details Modal */}
            {selectedReport && (
                <div className="modal-overlay" onClick={() => setSelectedReport(null)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Report Details</h2>
                            <button className="modal-close" onClick={() => setSelectedReport(null)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="details-grid">
                                {Object.entries(selectedReport).map(([key, value]) => (
                                    <div key={key} className="detail-item">
                                        <span className="detail-label">{key.replace(/([A-Z])/g, ' $1')}:</span>
                                        <span className="detail-value">
                                            {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-secondary" onClick={() => setSelectedReport(null)}>Close</button>
                            <button className="btn-primary" onClick={() => handleExportPDF(selectedReport)}>
                                <FiDownload /> Export as PDF
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReportManagement;
