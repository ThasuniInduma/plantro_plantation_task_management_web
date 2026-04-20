import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { AppContext } from '../../context/AppContext';
import { assets } from '../../assets/assets';
import './Login.css';

const Login = () => {
  const navigate = useNavigate();
  const { backendUrl, setUserData, setIsLoggedIn } = useContext(AppContext);

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
        // Registration
        //  Email validation 
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          toast.error('Please enter a valid email address');
          return;
        }

        //  Phone validation (10 digits only) 
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{6,}$/;

        if (!passwordRegex.test(password)) {
          toast.error(
            'Password must have 1 uppercase, 1 lowercase, 1 number, and 1 special character'
          );
          return;
        }

        //  Password validation 
        if (password.length < 6) {
          toast.error('Password must be at least 6 characters');
          return;
        }

        //  Confirm password match 
        if (password !== confirmPassword) {
          toast.error('Passwords do not match');
          return;
        }

        //  API call 
        const { data } = await axios.post(
          `${backendUrl}/api/auth/register`,
          { name, email, password, phone }
        );

        if (data.success) {
          toast.success(data.message);
          navigate('/email-verify');
        } else {
          toast.error(data.message);
        }

      } else {
        //  Login 
        const response = await axios.post(
          `${backendUrl}/api/auth/login`,
          { email, password }
        );

        const data = response.data;

        console.log("FULL RESPONSE:", response);
        console.log("RESPONSE DATA:", data);

        if (data.success) {
          const role = (data.user.role_name || "").toLowerCase();

          const user = {
            ...data.user,
            role_name: role
          };

          // Clear old session
          localStorage.removeItem("token");
          localStorage.removeItem("user");

          // Save new session
          localStorage.setItem("token", data.token);
          localStorage.setItem("user", JSON.stringify(user));

          setUserData(user);
          setIsLoggedIn(true);

          toast.success('Login successful');

          console.log("LOGIN ROLE:", role);

            if (role === 'owner' || role === 'admin') {
            navigate('/admin');
            } else if (role === 'supervisor') {
              navigate('/supervisor');
            } else if (role === 'worker') {
              try {
                  const { data: profileData } = await axios.get(
                    `${backendUrl}/api/worker/profile-status`,
                    { headers: { Authorization: `Bearer ${data.token}` }, withCredentials: true }
                  );
                  if (profileData.profileComplete) {
                    navigate('/worker/dashboard');
                  } else {
                    navigate('/worker/setup');   // first time → setup page
                  }
                } catch {
                  navigate('/worker/setup');     // fallback to setup on error
                }
            }
        } else {
          toast.error(data.message || 'Login failed');
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || 'Something went wrong');
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
              type="text" placeholder="Full Name"
              value={name} onChange={e => setName(e.target.value)} required
            />
          )}

          <input
            type="email" placeholder="Email Address"
            value={email} onChange={e => setEmail(e.target.value)} required
          />

          {state === 'Sign Up' && (
            <input
              type="text" placeholder="Phone Number"
              value={phone} onChange={e => setPhone(e.target.value)} required
            />
          )}

          <input
            type="password" placeholder="Password"
            value={password} onChange={e => setPassword(e.target.value)} required
          />

          {state === 'Sign Up' && (
            <input
              type="password" placeholder="Confirm Password"
              value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required
            />
          )}

          <div className="options">
            {state === 'Log In' && (
              <p onClick={() => navigate('/reset-password')}>Forgot Password?</p>
            )}
            <p
              className="text-blue"
              onClick={() => setState(state === 'Log In' ? 'Sign Up' : 'Log In')}
            >
              {state === 'Log In' ? 'Create Account' : 'Already have an account'}
            </p>
          </div>

          <button className="primary" type="submit">{state}</button>
        </form>
      </div>
    </div>
  );
};

export default Login;