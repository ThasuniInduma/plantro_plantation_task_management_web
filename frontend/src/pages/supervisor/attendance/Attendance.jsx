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

  // fech workers
  useEffect(() => {
    fetchWorkers();
  }, []);

  const fetchWorkers = async () => {
  try {
    const res = await axios.get(
      `${backendUrl}/api/worker/my-workers`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        }
      }
    );
    setWorkers(res.data);
  } catch (err) {
    console.error(err);
  }
};

  //  FETCH ATTENDANCE 
  useEffect(() => {
    fetchAttendance();
  }, [selectedDate]);

  const fetchAttendance = async () => {
  try {
    const res = await axios.get(
      `${backendUrl}/api/attendance/${selectedDate}`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        }
      }
    );

    const data = {};
    (res.data.data || []).forEach(r => {
      data[r.worker_id] = {
        status: r.status,
        checkInTime: r.check_in,
        checkOutTime: r.check_out
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

  //  filter workers
  const filteredWorkers = workers.filter(w =>
    w.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    w.worker_id.toString().includes(searchTerm)
  );

  // mark attendance
  const markAttendance = (workerId, status) => {
  if (!canMark) return;

  setAttendanceRecords(prev => {
    const existing = prev[selectedDate]?.[workerId] || {};

    return {
      ...prev,
      [selectedDate]: {
        ...prev[selectedDate],
        [workerId]: {
          status,

          // ✅ only set check-in once
          checkInTime:
            (status === 'present' || status === 'late')
              ? existing.checkInTime || new Date().toTimeString().slice(0, 8)
              : null,

          // ✅ NEVER remove checkout accidentally
          checkOutTime: existing.checkOutTime || null
        }
      }
    };
  });
};

  //mark all present
  const markAllPresent = () => {
  if (!canMark) return;

  setAttendanceRecords(prev => {
    const existingDay = prev[selectedDate] || {};
    const updated = {};

    filteredWorkers.forEach(w => {
      const existing = existingDay[w.worker_id] || {};

      updated[w.worker_id] = {
        status: 'present',

        // ✅ keep existing check-in
        checkInTime:
          existing.checkInTime || new Date().toTimeString().slice(0, 8),

        // ✅ KEEP checkout (THIS WAS MISSING)
        checkOutTime: existing.checkOutTime || null
      };
    });

    return {
      ...prev,
      [selectedDate]: {
        ...existingDay,
        ...updated
      }
    };
  });
};

  // reset
  const resetDay = () => {
    if (!canMark) return;

    const reset = {};

    workers.forEach(w => {
      reset[w.worker_id] = {
        status: 'pending',
        checkInTime: null,
        checkOutTime: null
      };
    });

    setAttendanceRecords(prev => ({
      ...prev,
      [selectedDate]: reset
    }));
  };

  // save
const saveAttendance = async () => {
  try {

    const cleanedRecords = Object.fromEntries(
      Object.entries(attendanceRecords[selectedDate] || {}).map(([id, r]) => [
        id,
        {
          status: r.status || 'pending',
          checkInTime: r.checkInTime || null,
          checkOutTime: r.checkOutTime || null
        }
      ])
    );

    console.log("📦 Sending:", cleanedRecords); // DEBUG

    await axios.post(
      `${backendUrl}/api/attendance`,
      {
        date: selectedDate,
        records: cleanedRecords,
        mode: 'manual'
      },
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        }
      }
    );

    alert("Attendance saved!");
  } catch (err) {
    console.error(err);
  }
};

  const markCheckout = (workerId) => {
  if (!canMark) return;

  setAttendanceRecords(prev => {
    const existing = prev[selectedDate]?.[workerId];

    //  must be present/late
    if (!existing || !['present', 'late'].includes(existing.status)) {
      alert("Worker must be present or late first");
      return prev;
    }

    //  prevent duplicate checkout
    if (existing.checkOutTime) return prev;

    return {
      ...prev,
      [selectedDate]: {
        ...prev[selectedDate],
        [workerId]: {
          ...existing,
          checkOutTime: new Date().toTimeString().slice(0, 8)
        }
      }
    };
  });
};

  // status
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
              <th>Check Out</th>
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
                  <td>{r.checkOutTime || '-'}</td>
                  <td className="actions-cell">
                    {canMark && (
                      <>
                        <button className="present" onClick={() => markAttendance(w.worker_id, 'present')}>Present</button>
                        <button className="absent" onClick={() => markAttendance(w.worker_id, 'absent')}>Absent</button>
                        <button className="late" onClick={() => markAttendance(w.worker_id, 'late')}>Late</button>
                        <button className="leave" onClick={() => markAttendance(w.worker_id, 'leave')}>Leave</button>
                        <button className="checkout" onClick={() => markCheckout(w.worker_id, 'checkout')}>Check Out</button>
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