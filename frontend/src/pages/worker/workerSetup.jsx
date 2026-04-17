import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { AppContext } from '../../context/AppContext';
import {
  FiUser,
  FiPhone,
  FiCheckCircle,
  FiClock,
  FiMapPin,
  FiChevronRight,
  FiPlus,
  FiX,
} from 'react-icons/fi';
import './workerSetup.css';

// Available skill options
const SKILL_OPTIONS = [
  'Tea Plucking',
  'Cinnamon Peeling',
  'Pruning',
  'Fertilizing',
  'Weeding',
  'Irrigation',
  'Harvesting',
  'Pesticide Application',
  'Planting',
  'Soil Preparation',
];

const WorkerSetup = () => {
  const navigate = useNavigate();
  const { backendUrl, userData, setUserData } = useContext(AppContext);

  const [step, setStep] = useState(1); // 1 = personal info, 2 = work info
  const [loading, setLoading] = useState(false);

  // Step 1 fields (pre-fill from userData if available)
  const [fullName, setFullName] = useState(userData?.full_name || '');
  const [phone, setPhone] = useState(userData?.phone || '');

  // Step 2 fields
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [customSkill, setCustomSkill] = useState('');
  const [maxDailyHours, setMaxDailyHours] = useState(8);

  // ── Helpers ─────────────────────────────────

  const toggleSkill = (skill) => {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  };

  const addCustomSkill = () => {
    const trimmed = customSkill.trim();
    if (!trimmed || selectedSkills.includes(trimmed)) return;
    setSelectedSkills((prev) => [...prev, trimmed]);
    setCustomSkill('');
  };

  const removeSkill = (skill) => {
    setSelectedSkills((prev) => prev.filter((s) => s !== skill));
  };

  // ── Step 1 submit ────────────────────────────

  const handleStep1 = async (e) => {
    e.preventDefault();
    if (!fullName.trim()) {
      toast.error('Please enter your full name.');
      return;
    }
    if (phone.length < 10) {
      toast.error('Please enter a valid phone number.');
      return;
    }

    try {
      setLoading(true);
      // Update user info in backend
      await axios.put(
        `${backendUrl}/api/auth/user/profile`,
        { full_name: fullName, phone },
        { withCredentials: true }
      );
      setStep(2);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save info.');
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2 submit ────────────────────────────

  const handleStep2 = async (e) => {
    e.preventDefault();
    if (selectedSkills.length === 0) {
      toast.error('Please select at least one skill.');
      return;
    }

    try {
      setLoading(true);
      const { data } = await axios.post(
        `${backendUrl}/api/worker/profile`,
        {
          skills: selectedSkills,
          preferred_locations: [],
          max_daily_hours: Number(maxDailyHours),
        },
        { withCredentials: true }
      );

      if (data.success) {
        toast.success('Profile setup complete! Welcome 🌿');
        // Refresh userData so dashboard has latest name
        setUserData((prev) => ({ ...prev, full_name: fullName, phone }));
        navigate('/worker/dashboard');
      } else {
        toast.error(data.message || 'Setup failed.');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Setup failed.');
    } finally {
      setLoading(false);
    }
  };

  // ── Render ───────────────────────────────────

  return (
    <div className="setup-page">
      {/* Left decorative panel */}
      <div className="setup-panel">
        <div className="setup-panel-content">
          <div className="setup-logo">🌿 Plantro</div>
          <h1>Welcome aboard!</h1>
          <p>
            Let's set up your worker profile. This takes less than a minute and
            helps your supervisor assign the right tasks to you.
          </p>

          {/* Step indicators */}
          <div className="step-indicators">
            <div className={`step-dot ${step >= 1 ? 'active' : ''}`}>
              <span>1</span>
              <p>Personal Info</p>
            </div>
            <div className="step-line" />
            <div className={`step-dot ${step >= 2 ? 'active' : ''}`}>
              <span>2</span>
              <p>Work Details</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="setup-form-area">
        <div className="setup-card">
          {step === 1 ? (
            <>
              <div className="setup-card-header">
                <div className="setup-step-badge">Step 1 of 2</div>
                <h2>Personal Information</h2>
                <p>Confirm your name and contact details.</p>
              </div>

              <form onSubmit={handleStep1} className="setup-form">
                <div className="form-field">
                  <label>
                    <FiUser size={16} />
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Kamal Perera"
                    required
                  />
                </div>

                <div className="form-field">
                  <label>
                    <FiPhone size={16} />
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. 0771234567"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="setup-btn-primary"
                  disabled={loading}
                >
                  {loading ? 'Saving…' : 'Next'}
                  <FiChevronRight size={18} />
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="setup-card-header">
                <div className="setup-step-badge">Step 2 of 2</div>
                <h2>Work Details</h2>
                <p>Tell us about your skills and working capacity.</p>
              </div>

              <form onSubmit={handleStep2} className="setup-form">
                {/* Skills picker */}
                <div className="form-field">
                  <label>
                    <FiCheckCircle size={16} />
                    Your Skills
                    <span className="label-hint">
                      (select all that apply)
                    </span>
                  </label>

                  <div className="skills-grid">
                    {SKILL_OPTIONS.map((skill) => (
                      <button
                        key={skill}
                        type="button"
                        className={`skill-chip ${
                          selectedSkills.includes(skill) ? 'selected' : ''
                        }`}
                        onClick={() => toggleSkill(skill)}
                      >
                        {selectedSkills.includes(skill) && (
                          <FiCheckCircle size={13} />
                        )}
                        {skill}
                      </button>
                    ))}
                  </div>

                  {/* Custom skill input */}
                  <div className="custom-skill-row">
                    <input
                      type="text"
                      value={customSkill}
                      onChange={(e) => setCustomSkill(e.target.value)}
                      placeholder="Add a custom skill…"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addCustomSkill();
                        }
                      }}
                    />
                    <button
                      type="button"
                      className="add-skill-btn"
                      onClick={addCustomSkill}
                      disabled={!customSkill.trim()}
                    >
                      <FiPlus size={16} />
                    </button>
                  </div>

                  {/* Selected skills tags */}
                  {selectedSkills.length > 0 && (
                    <div className="selected-skills">
                      {selectedSkills.map((skill) => (
                        <span key={skill} className="skill-tag">
                          {skill}
                          <button
                            type="button"
                            onClick={() => removeSkill(skill)}
                          >
                            <FiX size={12} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Max daily hours */}
                <div className="form-field">
                  <label>
                    <FiClock size={16} />
                    Max Daily Working Hours
                  </label>
                  <div className="hours-selector">
                    {[4, 6, 7, 8, 9, 10].map((h) => (
                      <button
                        key={h}
                        type="button"
                        className={`hours-chip ${
                          maxDailyHours === h ? 'selected' : ''
                        }`}
                        onClick={() => setMaxDailyHours(h)}
                      >
                        {h}h
                      </button>
                    ))}
                  </div>
                </div>

                <div className="setup-form-actions">
                  <button
                    type="button"
                    className="setup-btn-secondary"
                    onClick={() => setStep(1)}
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    className="setup-btn-primary"
                    disabled={loading}
                  >
                    {loading ? 'Saving…' : 'Complete Setup'}
                    <FiCheckCircle size={18} />
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default WorkerSetup;