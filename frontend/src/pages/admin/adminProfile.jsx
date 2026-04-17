import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SideNav from '../../components/SideNav';
import './adminProfile.css';
import {
  FiEdit2,
  FiSave,
  FiX,
  FiMail,
  FiPhone,
  FiCalendar,
  FiMapPin,
  FiUser,
  FiLock,
  FiLogOut,
  FiCheck,
  FiAlertCircle,
} from 'react-icons/fi';


const AdminProfile = () => {
  const navigate = useNavigate();
  const [adminData, setAdminData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
  });
  const [saveStatus, setSaveStatus] = useState(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordStatus, setPasswordStatus] = useState(null);

  // Fetch admin data
  useEffect(() => {
  const fetchAdminData = async () => {
    try {
      const token = localStorage.getItem("token");

      const res = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/auth/user/profile`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (res.status === 401) {
        localStorage.removeItem("token");
        navigate("/login");
        return;
      }

      const data = await res.json();

      const user = data.user;

      setAdminData(user);

      setFormData({
        full_name: user.full_name,
        email: user.email,
        phone: user.phone
      });

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  fetchAdminData();
}, []);

  const handleEdit = () => {
    setEditing(true);
    setSaveStatus(null);
  };

  const handleCancel = () => {
    setEditing(false);
    setFormData({
      full_name: adminData?.full_name || '',
      email: adminData?.email || '',
      phone: adminData?.phone || '',
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSaveProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/auth/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          full_name: formData.full_name,
          phone: formData.phone,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setAdminData(data);
        setEditing(false);
        setSaveStatus('success');
        setTimeout(() => setSaveStatus(null), 3000);
      } else {
        setSaveStatus('error');
        setTimeout(() => setSaveStatus(null), 3000);
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordStatus('mismatch');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setPasswordStatus('short');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      });

      if (response.ok) {
        setPasswordStatus('success');
        setShowPasswordModal(false);
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
        setTimeout(() => setPasswordStatus(null), 3000);
      } else {
        setPasswordStatus('error');
      }
    } catch (error) {
      console.error('Error changing password:', error);
      setPasswordStatus('error');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="admin-profile-layout">
        <SideNav userRole="admin" />
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
    <div className="admin-profile-layout">
      <SideNav userRole="admin" />

      <div className="main-content">
        {/* Header */}
        <header className="profile-header">
          <div className="header-left">
            <h1 className="page-title">My Profile</h1>
            <p className="page-subtitle">Manage your account information</p>
          </div>
          <button 
            className={`edit-profile-btn ${editing ? 'cancel' : ''}`}
            onClick={editing ? handleCancel : handleEdit}
          >
            {editing ? (
              <>
                <FiX size={18} />
                Cancel
              </>
            ) : (
              <>
                <FiEdit2 size={18} />
                Edit Profile
              </>
            )}
          </button>
        </header>

        {/* Status Messages */}
        {saveStatus === 'success' && (
          <div className="status-message success">
            <FiCheck size={18} />
            Profile updated successfully!
          </div>
        )}
        {saveStatus === 'error' && (
          <div className="status-message error">
            <FiAlertCircle size={18} />
            Failed to update profile. Please try again.
          </div>
        )}

        {/* Main Content */}
        <div className="profile-content">
          {/* Profile Card */}
          <div className="profile-card">
            <div className="profile-avatar-section">
              <div className="profile-avatar">
                <span>{adminData?.avatar || 'A'}</span>
              </div>
              <div className="profile-basic-info">
                <h2>{adminData?.full_name || 'Admin User'}</h2>
                <p className="role-badge">Administrator</p>
              </div>
            </div>

            {/* Profile Details */}
            <div className="profile-details">
              {/* Name Field */}
              <div className="form-group">
                <label className="form-label">
                  <FiUser size={18} />
                  Full Name
                </label>
                {editing ? (
                  <input
                    type="text"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleInputChange}
                    className="form-input"
                    placeholder="Enter full name"
                  />
                ) : (
                  <div className="form-display">{formData.full_name || 'Not provided'}</div>
                )}
              </div>

              {/* Email Field (Read-only) */}
              <div className="form-group">
                <label className="form-label">
                  <FiMail size={18} />
                  Email Address
                </label>
                <div className="form-display">{adminData?.email}</div>
                <p className="form-hint">Email cannot be changed</p>
              </div>

              {/* Phone Field */}
              <div className="form-group">
                <label className="form-label">
                  <FiPhone size={18} />
                  Phone Number
                </label>
                {editing ? (
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="form-input"
                    placeholder="Enter phone number"
                  />
                ) : (
                  <div className="form-display">{formData.phone || 'Not provided'}</div>
                )}
              </div>

              {/* Account Created Date */}
              <div className="form-group">
                <label className="form-label">
                  <FiCalendar size={18} />
                  Account Created
                </label>
                <div className="form-display">
                  {adminData?.created_at
                    ? new Date(adminData.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })
                    : 'Not available'}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            {editing && (
              <div className="profile-actions">
                <button className="btn btn-secondary" onClick={handleCancel}>
                  <FiX size={18} />
                  Cancel
                </button>
                <button className="btn btn-primary" onClick={handleSaveProfile}>
                  <FiSave size={18} />
                  Save Changes
                </button>
              </div>
            )}
          </div>

          {/* Security Section */}
          <div className="security-section">
            <h3 className="section-title">Security</h3>

            {/* Change Password Card */}
            <div className="security-card">
              <div className="security-header">
                <div className="security-info">
                  <FiLock size={24} />
                  <div>
                    <h4>Password</h4>
                    <p>Change your password regularly to keep your account secure</p>
                  </div>
                </div>
                <button 
                  className="btn btn-outline"
                  onClick={() => setShowPasswordModal(true)}
                >
                  Change Password
                </button>
              </div>
            </div>

            {/* Logout Card */}
            <div className="security-card logout-card">
              <div className="security-header">
                <div className="security-info">
                  <FiLogOut size={24} />
                  <div>
                    <h4>Logout</h4>
                    <p>Sign out from your account on this device</p>
                  </div>
                </div>
                <button 
                  className="btn btn-danger"
                  onClick={handleLogout}
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Password Modal */}
        {showPasswordModal && (
          <>
            <div className="modal-overlay" onClick={() => setShowPasswordModal(false)}></div>
            <div className="password-modal">
              <div className="modal-header">
                <h3>Change Password</h3>
                <button 
                  className="close-btn"
                  onClick={() => setShowPasswordModal(false)}
                >
                  <FiX size={20} />
                </button>
              </div>

              <div className="modal-body">
                {passwordStatus === 'mismatch' && (
                  <div className="modal-error">
                    <FiAlertCircle size={18} />
                    Passwords do not match
                  </div>
                )}
                {passwordStatus === 'short' && (
                  <div className="modal-error">
                    <FiAlertCircle size={18} />
                    Password must be at least 6 characters
                  </div>
                )}
                {passwordStatus === 'error' && (
                  <div className="modal-error">
                    <FiAlertCircle size={18} />
                    Current password is incorrect
                  </div>
                )}
                {passwordStatus === 'success' && (
                  <div className="modal-success">
                    <FiCheck size={18} />
                    Password changed successfully!
                  </div>
                )}

                <div className="password-field">
                  <label>Current Password</label>
                  <input
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(e) =>
                      setPasswordData({ ...passwordData, currentPassword: e.target.value })
                    }
                    placeholder="Enter current password"
                    className="form-input"
                  />
                </div>

                <div className="password-field">
                  <label>New Password</label>
                  <input
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) =>
                      setPasswordData({ ...passwordData, newPassword: e.target.value })
                    }
                    placeholder="Enter new password"
                    className="form-input"
                  />
                </div>

                <div className="password-field">
                  <label>Confirm Password</label>
                  <input
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) =>
                      setPasswordData({ ...passwordData, confirmPassword: e.target.value })
                    }
                    placeholder="Confirm new password"
                    className="form-input"
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button 
                  className="btn btn-secondary"
                  onClick={() => setShowPasswordModal(false)}
                >
                  Cancel
                </button>
                <button 
                  className="btn btn-primary"
                  onClick={handleChangePassword}
                >
                  Update Password
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AdminProfile;
