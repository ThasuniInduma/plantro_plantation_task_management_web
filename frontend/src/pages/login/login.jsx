import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css';
import { assets } from '../../assets/assets';
import axios from 'axios'


const Login = () => {
  const navigate = useNavigate();
  const [values, setValues] = useState({
    name: '',
    email: '',
    phone: '',
    password: ''
  })
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false); 

  const handleSubmit = (e) => {
    e.preventDefault();

    axios.post('http://localhost:8081/register', values)
    .then(res => {
      console.log(res.data);

      if (res.data.status === "Worker registered successfully") {
        setValues({ name: '', email: '', phone: '', password: '' });

        navigate('/worker'); 
      }
    })
    .catch(err => {
      console.error(err.response?.data || err.message);
      alert(err.response?.data?.error || "Registration failed");
    });


    if (isRecovering) {
      console.log('Password Recovery submitted.');
    } else {
      console.log('Auth Form submitted:', {
        action: isSigningUp ? 'Sign Up' : 'Sign In'
      });
    }
  };


  const handleTabChange = (signUp) => {
    setIsSigningUp(signUp);
    setIsRecovering(false);
  };

  const handleForgotPasswordClick = () => {
    setIsRecovering(true);
    setIsSigningUp(false); 
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="logo-section">
          <img src={assets.plantro} alt="" className='logo' />
        </div>

        {!isRecovering && (
          <div className="tab-buttons">
            <button
              className={!isSigningUp ? 'active' : ''}
              onClick={() => handleTabChange(false)}
            >
              Sign In
            </button>
            <button
              className={isSigningUp ? 'active' : ''}
              onClick={() => handleTabChange(true)}
            >
              Sign Up
            </button>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="auth-form">
          
          <h2 className='form-title'>
            {isRecovering ? 'Password Recovery' : isSigningUp ? 'Create Your Account' : 'Welcome Back'}
          </h2>

          {/* Password Recovery View */}
          {isRecovering ? (
            <>
              <p className="recovery-instruction">
                Enter your email address to receive a password reset link.
              </p>
              <label htmlFor="email">Email</label>
              <input type="email" id="email" placeholder="your@email.com" required />
            </>
          ) : (
            // Sign In / Sign Up View
            <>
              {isSigningUp && (
                <>
                  <label htmlFor="fullName">Full Name</label>
                  <input type="text" id="fullName" placeholder="Your Name" required onChange={e => setValues({...values, name: e.target.value})}/>
                </>
              )}

              <label htmlFor="email">Email</label>
              <input type="email" id="email" placeholder="your@email.com" required onChange={e => setValues({...values, email: e.target.value})}/>

              {isSigningUp && (
                <>
                  <label htmlFor="phone">Phone</label>
                  <input type="tel" id="phone" placeholder="+94 XX XXX XXXX" required onChange={e => setValues({...values, phone: e.target.value})}/>

                  
                </>
              )}

              <label htmlFor="password">Password</label>
              <input type="password" id="password" placeholder="********" required onChange={e => setValues({...values, password: e.target.value})}/>

              {/* Forgot Password Link*/}
              {!isSigningUp && (
                <p className="forgot-password">
                  <span onClick={handleForgotPasswordClick}>Forgot Password?</span>
                </p>
              )}
            </>
          )}

          <button
            type="submit"
            className={isRecovering || isSigningUp ? "auth-submit-button sign-up-button" : "auth-submit-button sign-in-button"}
          >
            {isRecovering ? "Send Reset Link" : isSigningUp ? "Create Account" : "Sign In"}
          </button>
          
          {/* Back to Login/SignUp*/}
          {isRecovering && (
            <p className="back-to-login">
              <span onClick={() => setIsRecovering(false)}>← Back to Login</span>
            </p>
          )}
        </form>
      </div>
    </div>
  );
};

export default Login;