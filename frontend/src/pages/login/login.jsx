import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { AppContext } from '../../context/AppContext';
import { assets } from '../../assets/assets';
import './Login.css';

const Login = () => {
  const navigate = useNavigate();
  const { backendUrl } = useContext(AppContext);

  const [state, setState] = useState('Log In');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');

  const onSubmitHandler = async (e) => {
    e.preventDefault();
    axios.defaults.withCredentials = true;

    try {
      if (state === 'Sign Up') {
        // --- SIGN UP FLOW ---
        if (password !== confirmPassword) {
          toast.error('Passwords do not match');
          return;
        }

        if (phone.length < 10) {
          toast.error('Invalid phone number');
          return;
        }

        const { data } = await axios.post(
          `${backendUrl}/api/auth/register`,
          { name, email, password, phone }
        );

        if (data.success) {
          toast.success(data.message); // e.g., "OTP sent to your email"
          navigate('/email-verify');
        } else {
          toast.error(data.message); // e.g., "User exists"
        }
      } else {
        // --- LOGIN FLOW ---
        const { data } = await axios.post(
          `${backendUrl}/api/auth/login`,
          { email, password }
        );

        if (data.success) {
          toast.success('Login successful');

          // --- ROLE-BASED NAVIGATION ---
          const roleName = data.user.role_name; // backend now sends role_name

          if (roleName === 'OWNER' || roleName === 'ADMIN') {
            navigate('/admin');       // OWNER/Admin
          } else if (roleName === 'SUPERVISOR') {
            navigate('/supervisor'); // Supervisor
          } else if (roleName === 'WORKER') {
            navigate('/worker');     // Worker
          } else {
            navigate('/');           // fallback
          }

        } else {
          toast.error(data.message || 'Login failed');
        }
      }
    } catch (error) {
      if (error.response && error.response.data && error.response.data.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error(error.message || 'Something went wrong');
      }
    }
  };

  return (
    <div className="login">
      <div className="login-container">
        
        <div className="image-container">
          <img src={assets.img5} alt="login" />
        </div>

        <form onSubmit={onSubmitHandler}>
          

          <h2>{state}</h2>

          {state === 'Sign Up' && (
            <input
              type="text"
              placeholder="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          )}

          <input
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          {state === 'Sign Up' && (
            <input
              type="text"
              placeholder="Phone Number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          )}

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {state === 'Sign Up' && (
            <input
              type="password"
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          )}

          <div className="options">
            {state === 'Log In' && (
              <p onClick={() => navigate('/reset-password')}>
                Forgot Password?
              </p>
            )}

            <p
              className="text-blue"
              onClick={() =>
                setState(state === 'Log In' ? 'Sign Up' : 'Log In')
              }
            >
              {state === 'Log In'
                ? 'Create Account'
                : 'Already have an account'}
            </p>
          </div>

          <button className="primary" type="submit">
            {state}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
