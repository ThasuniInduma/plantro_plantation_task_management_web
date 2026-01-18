import React, { useState } from 'react';
import './Login.css';
import { assets } from '../../assets/assets';

const Login = () => {
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false); 
  const [role, setRole] = useState('Worker');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isRecovering) {
      console.log('Password Recovery submitted.');
    } else {
      console.log('Auth Form submitted:', { role, action: isSigningUp ? 'Sign Up' : 'Sign In' });
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
                  <input type="text" id="fullName" placeholder="Your Name" required />
                </>
              )}

              <label htmlFor="email">Email</label>
              <input type="email" id="email" placeholder="your@email.com" required />

              {isSigningUp && (
                <>
                  <label htmlFor="phone">Phone</label>
                  <input type="tel" id="phone" placeholder="+94 XX XXX XXXX" required />

                  <label htmlFor="role">Role</label>
                  <select
                    id="role"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    required
                  >
                    <option value="Worker">Worker</option>
                    <option value="Admin">Supervisor</option>
                    <option value="Owner">Owner</option>
                  </select>
                </>
              )}

              <label htmlFor="password">Password</label>
              <input type="password" id="password" placeholder="********" required />

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