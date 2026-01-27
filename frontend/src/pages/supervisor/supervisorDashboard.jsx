import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SideNav from '../../components/SideNav';
import './supervisorDashboard.css'; 
import { FiPlus } from 'react-icons/fi';

// --- Mock Data ---
const mockWorkers = [
  { id: 'W001', name: 'Thasuni I.', available: true, skills: ['Tea Plucking', 'Fertilizing'] },
  { id: 'W002', name: 'Kamal R.', available: true, skills: ['Pruning', 'Fertilizing'] },
  { id: 'W003', name: 'Nimal S.', available: false, skills: ['Tea Plucking', 'Pruning'] },
  { id: 'W004', name: 'Geetha P.', available: true, skills: ['Pruning'] },
];

const mockTasks = [
  { id: 101, day: 'Today', name: 'Tea Plucking (Daily Quota)', crop: 'Tea', field: 'Tea Field Matara', requiredWorkers: 3, assignedWorkers: ['W001', 'W003'], lastCompletionDate: '2025-10-18', workerStatus: 'In Progress (W001)' },
  { id: 102, day: 'Today', name: 'Rubber Tapping Maintenance', crop: 'Rubber', field: 'Rubber Field Matara', requiredWorkers: 1, assignedWorkers: ['W002'], lastCompletionDate: '2025-10-15', workerStatus: 'Completed (W002)' },
  { id: 201, day: 'Tomorrow', name: 'Cinnamon Shoot Pruning', crop: 'Cinnamon', field: 'Cinnamon Field Hakmana', requiredWorkers: 2, assignedWorkers: [], lastCompletionDate: '2025-09-01', workerStatus: 'Pending Assignment' },
];

// --- Attendance Data ---
const mockAttendance = [
  { id: 'W001', name: 'Thasuni I.', status: 'Marked' },
  { id: 'W002', name: 'Kamal R.', status: 'Marked' },
  { id: 'W003', name: 'Nimal S.', status: 'Absent' },
  { id: 'W004', name: 'Geetha P.', status: 'Marked' }, 
];

const mockFields = ['Tea Field Matara', 'Rubber Field Matara', 'Cinnamon Field Hakmana', 'Any Available Field'];

const SupervisorDashboard = ({ logo }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [tasks, setTasks] = useState(mockTasks);
  const [workers, setWorkers] = useState(mockWorkers);
  const [activeTaskAssignment, setActiveTaskAssignment] = useState(null); 
  const [showReasonPopup, setShowReasonPopup] = useState(false);
  const [reasonText, setReasonText] = useState('');
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [swapSections, setSwapSections] = useState(false); 
  const [isAddWorkerPopupOpen, setIsAddWorkerPopupOpen] = useState(false);
  const [pendingWorkers, setPendingWorkers] = useState([]);

  const todayTasks = tasks.filter(t => t.day === 'Today');
  const tomorrowTasks = tasks.filter(t => t.day === 'Tomorrow');

  const generateWorkerId = (allWorkers) => {
    const allIds = allWorkers.map(w => w.id);
    let newIdNum = allIds.reduce((max, id) => {
      if (id.startsWith('W')) return Math.max(max, parseInt(id.slice(1)) || 0);
      return max;
    }, 0) + 1;
    return 'W' + newIdNum.toString().padStart(3, '0'); 
  };
    
  const handleAddWorker = (name, phoneNumber, address, skills, medicalDisabilities, preferredLocation, maxHours) => {
    const allKnownWorkers = [...workers, ...pendingWorkers];
    const newWorkerId = generateWorkerId(allKnownWorkers);

    const newWorker = {
        id: newWorkerId,
        name,
        phoneNumber,
        address,
        skills,
        medicalDisabilities,
        preferredLocation,
        maxHours,
        status: 'Pending Owner Confirmation'
    };

    setPendingWorkers(prev => [...prev, newWorker]);
    setIsAddWorkerPopupOpen(false);
    alert(`Worker ${newWorker.name} (${newWorker.id}) added and is awaiting Owner confirmation.`);
  };

  const handleStartAssignment = (taskId) => setActiveTaskAssignment(taskId);

  const handleAssignWorker = (taskId, workerId) => {
    const worker = workers.find(w => w.id === workerId);
    if (!worker.available) return;
    
    setTasks(prev => prev.map(task => 
      task.id === taskId && !task.assignedWorkers.includes(workerId) && task.assignedWorkers.length < task.requiredWorkers
        ? { ...task, assignedWorkers: [...task.assignedWorkers, workerId], workerStatus: 'Assignment In Progress' }
        : task
    ));
  };

  const handleFinishAssignment = () => {
    setTasks(prev => prev.map(task => 
        task.id === activeTaskAssignment 
            ? { ...task, workerStatus: 'Assigned, Awaiting Start' }
            : task
    ));
    setActiveTaskAssignment(null);
    alert('Workers assigned successfully!');
  };

  const handleVerifyCompletion = (taskId, status) => {
    setTasks(prev => prev.map(task => task.id === taskId
      ? { ...task, workerStatus: `Verified: ${status}`, lastCompletionDate: new Date().toISOString().slice(0,10) }
      : task
    ));
    alert(`Task ${taskId} status verified as ${status}.`);
  };

  const handleOpenReasonPopup = (taskId, workerId) => {
    setSelectedWorker({ taskId, workerId });
    setReasonText('');
    setShowReasonPopup(true);
  };

  const handleSubmitReason = () => {
    if (!reasonText.trim()) return alert('Please enter a reason.');
    setTasks(prev => prev.map(task => 
        task.id === selectedWorker.taskId 
            ? { ...task, workerStatus: `Rejected: Re-assign needed. Reason: ${reasonText.slice(0, 20)}...` }
            : task
    ));
    alert(`Task status updated for Re-assignment. Reason: ${reasonText}`);
    setShowReasonPopup(false);
    setSelectedWorker(null);
  };

  const getFilteredWorkers = (task) => {
    const availableWorkers = workers.filter(w => w.available);
    return availableWorkers.filter(w => w.skills.some(skill => 
        task.name.toLowerCase().includes(skill.toLowerCase()) || 
        task.crop.toLowerCase().includes(skill.toLowerCase())
    ));
  };

  const SectionOrderToggle = () => (
    <div className="section-order-toggle-container">
      <div className="segmented-control">
        <button 
          className={`toggle-option ${!swapSections ? 'active' : ''}`}
          onClick={() => setSwapSections(false)}
        >
          Today's Tasks
        </button>
        <button 
          className={`toggle-option ${swapSections ? 'active' : ''}`}
          onClick={() => setSwapSections(true)}
        >
          Tomorrow's Tasks
        </button>
      </div>
    </div>
  );

  const TaskCard = ({ task }) => {
    const isToday = task.day === 'Today';
    const showAssignmentButton = task.day === 'Tomorrow' && activeTaskAssignment !== task.id;
    const showAssignmentPanel = task.day === 'Tomorrow' && activeTaskAssignment === task.id;
    const isActionRequired = isToday && (task.workerStatus.includes('In Progress') || task.workerStatus.includes('Completed'));

    let statusClass = 'pending';
    if (task.workerStatus.includes('Verified')) statusClass = 'verified';
    else if (task.workerStatus.includes('Submitted') || task.workerStatus.includes('Completed')) statusClass = 'submitted';
    else if (task.workerStatus.includes('In Progress') || task.workerStatus.includes('Assignment In Progress')) statusClass = 'progress';

    return (
      <div className={`task-card ${statusClass}`}>
        <div className="task-header-details">
          <div className="task-primary-info">
            <strong>{task.name}</strong>
            <span className="crop-field">{task.crop} in {task.field}</span>
          </div>
          <div className={`task-status-tag ${statusClass}`}>{task.workerStatus}</div>
        </div>

        <div className="task-meta-grid">
          <div><label>Timeframe:</label><p>{task.day}</p></div>
          <div><label>Workers Required:</label><p className="required-workers-count">{task.requiredWorkers}</p></div>
          <div><label>Last Completion:</label><p>{task.lastCompletionDate}</p></div>
          <div className="assigned-workers-row">
            <label>Assigned Team ({task.assignedWorkers.length} / {task.requiredWorkers}):</label>
            <p className="assigned-list">
              {task.assignedWorkers.length > 0 
                ? task.assignedWorkers.map(id => workers.find(w => w.id===id)?.name || id).join(', ')
                : 'No workers assigned yet.'}
            </p>
          </div>
        </div>

        <div className="task-actions-section">
          {isActionRequired && (
            <div className="verification-actions">
              <button className="action-button verify-confirm" onClick={() => handleVerifyCompletion(task.id, 'Confirmed')} disabled={task.workerStatus.includes('Verified')}>Verify Completion</button>
              <button className="action-button verify-reject" onClick={() => handleOpenReasonPopup(task.id, task.assignedWorkers[0])} disabled={task.workerStatus.includes('Verified')}>Reject & Re-assign</button>
            </div>
          )}
          {showAssignmentButton && (
            <button className="action-button assign" onClick={() => handleStartAssignment(task.id)} disabled={task.assignedWorkers.length === task.requiredWorkers}>
              {task.assignedWorkers.length === task.requiredWorkers ? 'Assignment Complete' : '+ Assign Workers'}
            </button>
          )}
        </div>

        {showAssignmentPanel && <AssignmentPanel task={task} workers={getFilteredWorkers(task)} onAssign={handleAssignWorker} onFinish={handleFinishAssignment} />}
      </div>
    );
  };

  const AssignmentPanel = ({ task, workers, onAssign, onFinish }) => (
    <div className="assignment-panel">
      <p className="assignment-title">Assign Workers for: <strong>{task.name}</strong></p>
      <div className="worker-assignment-list">
        {workers.length ? workers.map(worker => (
          <div key={worker.id} className="worker-assignment-item">
            <span>{worker.name} ({worker.id}) - Skills: {worker.skills.join(', ')}</span>
            <button className={`assign-worker-button ${task.assignedWorkers.includes(worker.id) ? 'assigned' : ''}`} 
                    onClick={() => onAssign(task.id, worker.id)} 
                    disabled={task.assignedWorkers.includes(worker.id) || task.assignedWorkers.length === task.requiredWorkers}>
              {task.assignedWorkers.includes(worker.id) ? 'Assigned' : 'Assign'}
            </button>
          </div>
        )) : <p>No suitable workers available or with matching skills.</p>}
      </div>
      <button className="finish-assignment-button" onClick={onFinish} disabled={task.assignedWorkers.length === 0}>Done with Assignment</button>
    </div>
  );

  const ReasonPopup = () => (
    <div className="reason-popup-overlay">
      <div className="reason-popup">
        <h4>Reason for Rejection/Reassignment</h4>
        <textarea rows="3" placeholder="Enter reason..." value={reasonText} onChange={e => setReasonText(e.target.value)} />
        <div className="popup-buttons">
          <button onClick={handleSubmitReason}>Submit Reason</button>
          <button onClick={() => setShowReasonPopup(false)}>Cancel</button>
        </div>
      </div>
    </div>
  );

  const AddWorkerPopup = ({ onClose, onAdd }) => {
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');
    const [skillsInput, setSkillsInput] = useState('');
    const [medical, setMedical] = useState('None');
    const [location, setLocation] = useState(mockFields[0] || '');
    const [maxHours, setMaxHours] = useState('8');

    const handleSubmit = () => {
      if (!name.trim()) return alert('Enter worker name.');
      if (!skillsInput.trim()) return alert('Enter at least one skill.');
      const skills = skillsInput.split(',').map(s => s.trim()).filter(Boolean);
      onAdd(name, phone, address, skills, medical, location, maxHours);
    };

    return (
      <div className="reason-popup-overlay">
        <div className="reason-popup add-worker-popup">
          <h4>Add New Worker</h4>
          <label>Name</label>
          <input value={name} onChange={e => setName(e.target.value)} />
          <label>Phone</label>
          <input value={phone} onChange={e => setPhone(e.target.value)} />
          <label>Address</label>
          <input value={address} onChange={e => setAddress(e.target.value)} />
          <label>Skills (comma-separated)</label>
          <input value={skillsInput} onChange={e => setSkillsInput(e.target.value)} />
          <label>Medical Disabilities</label>
          <input value={medical} onChange={e => setMedical(e.target.value)} />
          <label>Preferred Location</label>
          <select value={location} onChange={e => setLocation(e.target.value)}>
            {mockFields.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
          <label>Max Hours per Day</label>
          <input type="number" value={maxHours} onChange={e => setMaxHours(e.target.value)} />
          <div className="popup-buttons">
            <button onClick={handleSubmit}>Add Worker</button>
            <button onClick={onClose}>Cancel</button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="supervisor-dashboard-layout">
      <SideNav role="supervisor" activeTab={activeTab} setActiveTab={setActiveTab} userName="Supervisor" logo={logo} />
      <div className="main-content">
        <div className="content-header">
          <div className="header-left">
            <h1 className="page-title">Supervisor Dashboard</h1>
            <p className="page-subtitle">Manage tasks and workforce efficiently</p>
          </div>
          <div className="header-actions">
            <button className="add-worker-header-btn" onClick={() => setIsAddWorkerPopupOpen(true)}>
              <FiPlus /> Add Worker
            </button>
          </div>
        </div>

        <div className="content-body">
          <SectionOrderToggle />
          {(swapSections ? tomorrowTasks : todayTasks).map(task => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
      </div>

      {showReasonPopup && <ReasonPopup />}
      {isAddWorkerPopupOpen && <AddWorkerPopup onClose={() => setIsAddWorkerPopupOpen(false)} onAdd={handleAddWorker} />}
    </div>
  );
};

export default SupervisorDashboard;
