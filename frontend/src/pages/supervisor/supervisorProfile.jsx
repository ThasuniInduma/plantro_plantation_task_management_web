import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SideNav from '../../components/SideNav';
import './supervisorProfile.css';
import {
  FiEdit2,
  FiSave,
  FiX,
  FiMail,
  FiPhone,
  FiCalendar,
  FiUser,
  FiLogOut,
  FiCheck,
  FiAlertCircle,
} from 'react-icons/fi';

const SupervisorProfile = () => {
  const navigate = useNavigate();

  const [supervisorData, setSupervisorData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
  });

  const [saveStatus, setSaveStatus] = useState(null);


  useEffect(() => {
    const fetchSupervisorData = async () => {
      try {
        const token = localStorage.getItem('token');

        const response = await fetch(
          'http://localhost:8081/api/auth/user',
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await response.json();

        console.log("PROFILE RESPONSE:", data);

        if (!response.ok || !data.user) {
          throw new Error(data.message || "Invalid user data");
        }

        const user = data.user;

        if (!user || !user.user_id) {
          throw new Error('Invalid user data');
        }

        if (user.role_id !== 2) {
          navigate('/login');
          return;
        }

        setSupervisorData(user);

        setFormData({
          full_name: user.full_name || '',
          phone: user.phone || '',
        });
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSupervisorData();
  }, [navigate]);


  const handleEdit = () => {
    setEditing(true);
    setSaveStatus(null);
  };

  const handleCancel = () => {
    setEditing(false);

    setFormData({
      full_name: supervisorData?.full_name || '',
      phone: supervisorData?.phone || '',
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSaveProfile = async () => {
    try {
      const token = localStorage.getItem('token');

      const response = await fetch(
        'http://localhost:8081/api/auth/user/profile',
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            full_name: formData.full_name,
            phone: formData.phone,
          }),
        }
      );

      const updated = await response.json();

      if (!response.ok) throw new Error('Update failed');

      setSupervisorData(updated);

      setFormData({
        full_name: updated.full_name || '',
        phone: updated.phone || '',
      });

      setEditing(false);
      setSaveStatus('success');

      setTimeout(() => setSaveStatus(null), 3000);
    } catch (error) {
      console.error(error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };


  if (loading) {
    return (
      <div className="supervisor-profile-layout">
        <SideNav userRole="supervisor" />
        <div className="main-content">
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading profile...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="supervisor-profile-layout">
      <SideNav userRole="supervisor" />

      <div className="main-content">
        {/* HEADER */}
        <header className="profile-header">
          <div>
            <h1 className="page-title">My Profile</h1>
            <p className="page-subtitle">Manage your account information</p>
          </div>

          <button
            className={`edit-profile-btn ${editing ? 'cancel' : ''}`}
            onClick={editing ? handleCancel : handleEdit}
          >
            {editing ? (
              <>
                <FiX /> Cancel
              </>
            ) : (
              <>
                <FiEdit2 /> Edit
              </>
            )}
          </button>
        </header>

        {/* STATUS */}
        {saveStatus === 'success' && (
          <div className="status-message success">
            <FiCheck /> Profile updated successfully
          </div>
        )}

        {saveStatus === 'error' && (
          <div className="status-message error">
            <FiAlertCircle /> Update failed
          </div>
        )}

        {/* CONTENT */}
        <div className="profile-content">
          <div className="profile-card">
            <div className="profile-avatar-section">
              <div className="profile-avatar">
                {supervisorData?.full_name?.charAt(0) || 'S'}
              </div>

              <div>
                <h2>{formData.full_name}</h2>
                <span className="role-badge">Supervisor</span>
              </div>
            </div>

            {/* FULL NAME */}
            <div className="form-group">
              <label className="form-label">
                <FiUser /> Full Name
              </label>

              {editing ? (
                <input
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleInputChange}
                  className="form-input"
                />
              ) : (
                <div className="form-display">{formData.full_name}</div>
              )}
            </div>

            {/* EMAIL */}
            <div className="form-group">
              <label className="form-label">
                <FiMail /> Email
              </label>
              <div className="form-display">{supervisorData?.email}</div>
            </div>

            {/* PHONE */}
            <div className="form-group">
              <label className="form-label">
                <FiPhone /> Phone
              </label>

              {editing ? (
                <input
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="form-input"
                />
              ) : (
                <div className="form-display">{formData.phone}</div>
              )}
            </div>

            {/* CREATED DATE */}
            <div className="form-group">
              <label className="form-label">
                <FiCalendar /> Created
              </label>

              <div className="form-display">
                {supervisorData?.created_at
                  ? new Date(supervisorData.created_at).toLocaleDateString()
                  : 'N/A'}
              </div>
            </div>

            {/* ACTIONS */}
            {editing && (
              <div className="profile-actions">
                <button className="btn btn-secondary" onClick={handleCancel}>
                  <FiX /> Cancel
                </button>

                <button className="btn btn-primary" onClick={handleSaveProfile}>
                  <FiSave /> Save Changes
                </button>
              </div>
            )}
          </div>

          {/* LOGOUT */}
          <div className="security-section">
            <div className="security-card logout-card">
              <div className="security-header">
                <div className="security-info">
                  <FiLogOut />
                  <div>
                    <h4>Logout</h4>
                    <p>Sign out from this device</p>
                  </div>
                </div>

                <button className="btn btn-danger" onClick={handleLogout}>
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupervisorProfile;