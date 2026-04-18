import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import SideNav from '../../components/SideNav';
import { AppContext } from '../../context/AppContext';
import axios from 'axios';
import './workerProfile.css';
import {
  FiEdit2, FiSave, FiX, FiMail, FiPhone,
  FiCalendar, FiUser, FiLock, FiLogOut,
  FiCheck, FiAlertCircle, FiCheckCircle, FiClock, FiPlus,
} from 'react-icons/fi';

const SKILL_OPTIONS = [
  'Tea Plucking','Cinnamon Peeling','Pruning','Fertilizing',
  'Weeding','Irrigation','Harvesting','Pesticide Application',
  'Planting','Soil Preparation',
];

const WorkerProfile = () => {
  const navigate = useNavigate();
  const { backendUrl, setUserData, setIsLoggedIn } = useContext(AppContext);

  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);

  const [formData, setFormData] = useState({
    full_name: '', phone: '', skills: [], preferred_locations: [], max_daily_hours: 8,
  });
  const [customSkill, setCustomSkill] = useState('');

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '', newPassword: '', confirmPassword: '',
  });
  const [passwordStatus, setPasswordStatus] = useState(null);
  const [availableSkills, setAvailableSkills] = useState([]);
const [availableLocations, setAvailableLocations] = useState([]);

  // Fetch profile
  // Replace the fetch in useEffect
useEffect(() => {
  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('token');

      const [profileRes, tasksRes, locationsRes] = await Promise.all([
        axios.get(`${backendUrl}/api/worker/profile`, {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true
        }),

        axios.get(`${backendUrl}/api/tasks/all`, {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true
        }),
        

        axios.get(`${backendUrl}/api/fields`, {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true
        })
      ]);

      const profile = profileRes.data;
      const tasks = tasksRes.data;
      const locations = locationsRes.data;

      setProfileData(profile);

      setAvailableSkills((tasks || []).map(t => t.task_name));
      setAvailableLocations([
        ...new Set((locations || []).map(f => f.location))
      ]);

      setFormData({
        full_name: profile.full_name || '',
        phone: profile.phone || '',
        skills: profile.skills || [],
        preferred_locations: profile.preferred_locations || [],
        max_daily_hours: profile.max_daily_hours || 8,
      });

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  fetchProfile();
}, [backendUrl]);
  const handleEdit = () => { setEditing(true); setSaveStatus(null); };

  const handleCancel = () => {
    setEditing(false);
    setFormData({
      full_name: profileData?.full_name || '',
      phone: profileData?.phone || '',
      skills: profileData?.skills || [],
      preferred_locations: profileData?.preferred_locations || [],
      max_daily_hours: profileData?.max_daily_hours || 8,
    });
  };

  const toggleSkill = (skill) =>
    setFormData(p => ({
      ...p,
      skills: p.skills.includes(skill) ? p.skills.filter(s => s !== skill) : [...p.skills, skill],
    }));

  const addCustomSkill = () => {
    const t = customSkill.trim();
    if (!t || formData.skills.includes(t)) return;
    setFormData(p => ({ ...p, skills: [...p.skills, t] }));
    setCustomSkill('');
  };

  const removeSkill = (skill) =>
    setFormData(p => ({ ...p, skills: p.skills.filter(s => s !== skill) }));

  const handleSave = async () => {
  try {
    const token = localStorage.getItem('token');
    const { data } = await axios.put(
      `${backendUrl}/api/worker/profile`,
      formData,
      { headers: { Authorization: `Bearer ${token}` }, withCredentials: true }
    );
    // update local state with what the backend actually has
    const refreshed = await axios.get(`${backendUrl}/api/worker/profile`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    setProfileData(refreshed.data);
    setUserData(p => ({ ...p, full_name: refreshed.data.full_name, phone: refreshed.data.phone }));
    setEditing(false);
    setSaveStatus('success');
    setTimeout(() => setSaveStatus(null), 3000);
  } catch {
    setSaveStatus('error');
    setTimeout(() => setSaveStatus(null), 3000);
  }
};

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) { setPasswordStatus('mismatch'); return; }
    if (passwordData.newPassword.length < 6) { setPasswordStatus('short'); return; }
    try {
      await axios.post(`${backendUrl}/api/auth/change-password`,
        { currentPassword: passwordData.currentPassword, newPassword: passwordData.newPassword },
        { withCredentials: true }
      );
      setPasswordStatus('success');
      setShowPasswordModal(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => setPasswordStatus(null), 3000);
    } catch {
      setPasswordStatus('error');
    }
  };

  const handleLogout = async () => {
    try { await axios.post(`${backendUrl}/api/auth/logout`, {}, { withCredentials: true }); } catch {}
    localStorage.removeItem('token');
    setUserData(null);
    setIsLoggedIn(false);
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="worker-profile-layout">
        <SideNav userRole="worker" />
        <div className="main-content">
          <div className="loading-state"><div className="spinner" /><p>Loading profile…</p></div>
        </div>
      </div>
    );
  }

  const avatarLetter = (profileData?.full_name || 'W').charAt(0).toUpperCase();

  return (
    <div className="worker-profile-layout">
      <SideNav userRole="worker" />
      <div className="main-content">

        <header className="profile-header">
          <div className="header-left">
            <h1 className="page-title">My Profile</h1>
            <p className="page-subtitle">Manage your account information</p>
          </div>
          <button className={`edit-profile-btn ${editing ? 'cancel' : ''}`} onClick={editing ? handleCancel : handleEdit}>
            {editing ? <><FiX size={18}/>Cancel</> : <><FiEdit2 size={18}/>Edit Profile</>}
          </button>
        </header>

        {saveStatus === 'success' && <div className="status-message success"><FiCheck size={18}/>Profile updated successfully!</div>}
        {saveStatus === 'error' && <div className="status-message error"><FiAlertCircle size={18}/>Failed to update profile.</div>}

        <div className="profile-content">
          <div className="profile-card">
            <div className="profile-avatar-section">
              <div className="profile-avatar"><span>{avatarLetter}</span></div>
              <div className="profile-basic-info">
                <h2>{profileData?.full_name || 'Worker'}</h2>
                <p className="role-badge">Worker</p>
              </div>
            </div>

            <div className="profile-details">
              {/* Full name */}
              <div className="form-group">
                <label className="form-label"><FiUser size={18}/>Full Name</label>
                {editing
                  ? <input type="text" className="form-input" value={formData.full_name}
                      onChange={e => setFormData(p => ({ ...p, full_name: e.target.value }))} placeholder="Enter full name"/>
                  : <div className="form-display">{profileData?.full_name || 'Not provided'}</div>}
              </div>

              {/* Email */}
              <div className="form-group">
                <label className="form-label"><FiMail size={18}/>Email Address</label>
                <div className="form-display">{profileData?.email}</div>
                <p className="form-hint">Email cannot be changed</p>
              </div>

              {/* Phone */}
              <div className="form-group">
                <label className="form-label"><FiPhone size={18}/>Phone Number</label>
                {editing
                  ? <input type="tel" className="form-input" value={formData.phone}
                      onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))} placeholder="Enter phone number"/>
                  : <div className="form-display">{profileData?.phone || 'Not provided'}</div>}
              </div>

              {/* Skills */}
              <div className="form-group">
                <label className="form-label"><FiCheckCircle size={18}/>Skills</label>
                {editing ? (
                  <>
                    <div className="skills-grid-profile">
                      {availableSkills.map(skill => (
                        <button key={skill} type="button"
                          className={`skill-chip-profile ${formData.skills.includes(skill) ? 'selected' : ''}`}
                          onClick={() => toggleSkill(skill)}>
                          {formData.skills.includes(skill) && <FiCheck size={12}/>}{skill}
                        </button>
                      ))}
                    </div>
                    <div style={{ display:'flex', gap:8, marginTop:8 }}>
                      <input type="text" className="form-input" style={{ flex:1 }}
                        placeholder="Add custom skill…" value={customSkill}
                        onChange={e => setCustomSkill(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomSkill(); }}}/>
                      <button type="button" className="add-skill-btn-profile"
                        onClick={addCustomSkill} disabled={!customSkill.trim()}>
                        <FiPlus size={16}/>
                      </button>
                    </div>
                    <div className="selected-skills-profile">
                      {formData.skills.filter(s => !availableSkills.includes(s)).map(skill => (
                        <span key={skill} className="skill-tag-profile">
                          {skill}
                          <button type="button" onClick={() => removeSkill(skill)}><FiX size={12}/></button>
                        </span>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="form-display skills-display">
                    {(profileData?.skills || []).length === 0
                      ? 'No skills listed'
                      : (profileData?.skills || []).map(s => (
                          <span key={s} className="skill-tag-profile" style={{ pointerEvents:'none' }}>{s}</span>
                        ))}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Preferred Locations</label>

                {editing ? (
                  <div className="skills-grid-profile">
                    {availableLocations.map(loc => (
                      <button
                        key={loc}
                        type="button"
                        className={`skill-chip-profile ${
                          formData.preferred_locations.includes(loc) ? 'selected' : ''
                        }`}
                        onClick={() =>
                          setFormData(p => ({
                            ...p,
                            preferred_locations: p.preferred_locations.includes(loc)
                              ? p.preferred_locations.filter(l => l !== loc)
                              : [...p.preferred_locations, loc],
                          }))
                        }
                      >
                        {formData.preferred_locations.includes(loc) && <FiCheck size={12} />}
                        {loc}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="form-display">
                    {profileData?.preferred_locations?.length
                      ? profileData.preferred_locations.join(', ')
                      : 'Not provided'}
                  </div>
                )}
              </div>

              {/* Max daily hours */}
              <div className="form-group">
                <label className="form-label"><FiClock size={18}/>Max Daily Working Hours</label>
                {editing ? (
                  <div className="hours-selector-profile">
                    {[4,6,7,8,9,10].map(h => (
                      <button key={h} type="button"
                        className={`hours-chip-profile ${formData.max_daily_hours === h ? 'selected' : ''}`}
                        onClick={() => setFormData(p => ({ ...p, max_daily_hours: h }))}>
                        {h}h
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="form-display">
                    {profileData?.max_daily_hours ? `${profileData.max_daily_hours} hours / day` : 'Not set'}
                  </div>
                )}
              </div>

              {/* Created at */}
              <div className="form-group">
                <label className="form-label"><FiCalendar size={18}/>Account Created</label>
                <div className="form-display">
                  {profileData?.created_at
                    ? new Date(profileData.created_at).toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'})
                    : 'Not available'}
                </div>
              </div>
            </div>

            {editing && (
              <div className="profile-actions">
                <button className="btn btn-secondary" onClick={handleCancel}><FiX size={18}/>Cancel</button>
                <button className="btn btn-primary" onClick={handleSave}><FiSave size={18}/>Save Changes</button>
              </div>
            )}
          </div>

          {/* Security */}
          <div className="security-section">
            <h3 className="section-title">Security</h3>
            <div className="security-card">
              <div className="security-header">
                <div className="security-info">
                  <FiLock size={24}/>
                  <div><h4>Password</h4><p>Change your password regularly to keep your account secure</p></div>
                </div>
                <button className="btn btn-outline" onClick={() => setShowPasswordModal(true)}>Change Password</button>
              </div>
            </div>
            <div className="security-card logout-card">
              <div className="security-header">
                <div className="security-info">
                  <FiLogOut size={24}/>
                  <div><h4>Logout</h4><p>Sign out from your account on this device</p></div>
                </div>
                <button className="btn btn-danger" onClick={handleLogout}>Logout</button>
              </div>
            </div>
          </div>
        </div>

        {/* Password modal */}
        {showPasswordModal && (
          <>
            <div className="modal-overlay" onClick={() => setShowPasswordModal(false)}/>
            <div className="password-modal">
              <div className="modal-header">
                <h3>Change Password</h3>
                <button className="close-btn" onClick={() => setShowPasswordModal(false)}><FiX size={20}/></button>
              </div>
              <div className="modal-body">
                {passwordStatus === 'mismatch' && <div className="modal-error"><FiAlertCircle size={18}/>Passwords do not match</div>}
                {passwordStatus === 'short' && <div className="modal-error"><FiAlertCircle size={18}/>Password must be at least 6 characters</div>}
                {passwordStatus === 'error' && <div className="modal-error"><FiAlertCircle size={18}/>Current password is incorrect</div>}
                {passwordStatus === 'success' && <div className="modal-success"><FiCheck size={18}/>Password changed successfully!</div>}

                {[['Current Password','currentPassword'],['New Password','newPassword'],['Confirm Password','confirmPassword']].map(([label,key])=>(
                  <div key={key} className="password-field">
                    <label>{label}</label>
                    <input type="password" className="form-input"
                      value={passwordData[key]}
                      onChange={e => setPasswordData(p => ({ ...p, [key]: e.target.value }))}
                      placeholder={`Enter ${label.toLowerCase()}`}/>
                  </div>
                ))}
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowPasswordModal(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleChangePassword}>Update Password</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default WorkerProfile;