import React, { useState, useEffect, useContext } from 'react';
import {
  FiCheck, FiX, FiClock, FiDownload,
  FiSave, FiRefreshCw, FiBarChart2
} from 'react-icons/fi';
import axios from 'axios';
import './Attendance.css';
import { AppContext } from '../../../context/AppContext';

const Attendance = () => {
  const { backendUrl, userData } = useContext(AppContext);

  const [workers, setWorkers] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState({});
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  );

  const [searchTerm, setSearchTerm] = useState('');
  const [showSummary, setShowSummary] = useState(false);

  const canMark = userData?.role_id === 1 || userData?.role_id === 2;

  // ---------------- FETCH WORKERS ----------------
  useEffect(() => {
    fetchWorkers();
  }, []);

  const fetchWorkers = async () => {
    try {
      const res = await axios.get(`${backendUrl}/api/worker/workers`);
      setWorkers(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  // ---------------- FETCH ATTENDANCE ----------------
  useEffect(() => {
    fetchAttendance();
  }, [selectedDate]);

  const fetchAttendance = async () => {
    try {
      const res = await axios.get(`${backendUrl}/api/attendance/${selectedDate}`);

      const data = {};
      (res.data.data || []).forEach(r => {
        data[r.worker_id] = {
          status: r.status,
          checkInTime: r.check_in
        };
      });

      setAttendanceRecords(prev => ({
        ...prev,
        [selectedDate]: data
      }));

    } catch (err) {
      console.error(err);
    }
  };

  const currentDayAttendance = attendanceRecords[selectedDate] || {};

  // ---------------- FILTER ----------------
  const filteredWorkers = workers.filter(w =>
    w.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    w.worker_id.toString().includes(searchTerm)
  );

  // ---------------- MARK ATTENDANCE ----------------
  const markAttendance = (workerId, status) => {
    if (!canMark) return;

    setAttendanceRecords(prev => ({
      ...prev,
      [selectedDate]: {
        ...prev[selectedDate],
        [workerId]: {
          status,
          checkInTime:
            status === 'present'
              ? new Date().toTimeString().slice(0, 8)
              : prev[selectedDate]?.[workerId]?.checkInTime || null
        }
      }
    }));
  };

  // ---------------- MARK ALL PRESENT ----------------
  const markAllPresent = () => {
    if (!canMark) return;

    const updated = {};

    filteredWorkers.forEach(w => {
      updated[w.worker_id] = {
        status: 'present',
        checkInTime: new Date().toTimeString().slice(0, 8)
      };
    });

    setAttendanceRecords(prev => ({
      ...prev,
      [selectedDate]: {
        ...prev[selectedDate],
        ...updated
      }
    }));
  };

  // ---------------- RESET ----------------
  const resetDay = () => {
    if (!canMark) return;

    const reset = {};

    workers.forEach(w => {
      reset[w.worker_id] = {
        status: 'pending',
        checkInTime: null
      };
    });

    setAttendanceRecords(prev => ({
      ...prev,
      [selectedDate]: reset
    }));
  };

  // ---------------- SAVE ----------------
  const saveAttendance = async () => {
    try {
      await axios.post(`${backendUrl}/api/attendance`, {
        date: selectedDate,
        records: attendanceRecords[selectedDate],
        mode: 'manual'
      });

      alert("Attendance saved!");
    } catch (err) {
      console.error(err);
    }
  };

  // ---------------- STATS ----------------
  const stats = {
    total: workers.length,
    present: Object.values(currentDayAttendance).filter(r => r?.status === 'present').length,
    absent: Object.values(currentDayAttendance).filter(r => r?.status === 'absent').length,
    late: Object.values(currentDayAttendance).filter(r => r?.status === 'late').length,
    leave: Object.values(currentDayAttendance).filter(r => r?.status === 'leave').length
  };

  const percentage =
    stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0;

  // ---------------- EXPORT ----------------
  const exportCSV = () => {
    const csv = [
      ['ID', 'Name', 'Status', 'Check In'],
      ...filteredWorkers.map(w => [
        w.worker_id,
        w.full_name,
        currentDayAttendance[w.worker_id]?.status || 'pending',
        currentDayAttendance[w.worker_id]?.checkInTime || '-'
      ])
    ].map(r => r.join(',')).join('\n');

    const blob = new Blob([csv]);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `attendance_${selectedDate}.csv`;
    a.click();
  };

  return (
    <div className="main-content">

      {/* HEADER */}
      <div className="content-header">
        <h2>Attendance Management</h2>

        <div>
          <button onClick={exportCSV}><FiDownload /> Export</button>
          {canMark && <button onClick={resetDay}><FiRefreshCw /> Reset</button>}
        </div>
      </div>

      <div className="content-body">

        {/* DATE + ACTIONS */}
        <div className="date-section">

          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
          />

          {canMark && (
            <button onClick={markAllPresent}>
              <FiCheck /> Mark All Present
            </button>
          )}

          <button onClick={() => setShowSummary(!showSummary)}>
            <FiBarChart2 /> Summary
          </button>
        </div>

        {/* SUMMARY */}
        {showSummary && (
          <div className="stats-grid">
            <div>Total: {stats.total}</div>
            <div>Present: {stats.present}</div>
            <div>Absent: {stats.absent}</div>
            <div>Late: {stats.late}</div>
            <div>Leave: {stats.leave}</div>
            <div>%: {percentage}</div>
          </div>
        )}

        {/* SEARCH */}
        <input
          placeholder="Search workers..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />

        {/* TABLE */}
        <div className="table-container">
        <table className="attendance-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Status</th>
              <th>Check In</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {filteredWorkers.map(w => {
              const r = currentDayAttendance[w.worker_id] || {};

              return (
                <tr key={w.worker_id}>
                  <td>{w.worker_id}</td>
                  <td className="name-cell">{w.full_name}</td>

                  <td>
                    <span className={`status-badge ${r.status || 'pending'}`}>
                      {r.status || 'pending'}
                    </span>
                  </td>

                  <td>{r.checkInTime || '-'}</td>

                  <td className="actions-cell">
                    {canMark && (
                      <>
                        <button className="present" onClick={() => markAttendance(w.worker_id, 'present')}>Present</button>
                        <button className="absent" onClick={() => markAttendance(w.worker_id, 'absent')}>Absent</button>
                        <button className="late" onClick={() => markAttendance(w.worker_id, 'late')}>Late</button>
                        <button className="leave" onClick={() => markAttendance(w.worker_id, 'leave')}>Leave</button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table></div>

        {/* SAVE */}
        {canMark && (
          <button className="save-btn" onClick={saveAttendance}>
            <FiSave /> Save Attendance
          </button>
        )}

      </div>
    </div>
  );
};

export default Attendance;