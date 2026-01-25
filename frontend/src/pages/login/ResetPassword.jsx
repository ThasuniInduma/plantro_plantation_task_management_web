import React, { useContext, useState, useEffect } from 'react'
import './ResetPassword.css'
import { assets } from '../../assets/assets'
import { useNavigate } from 'react-router-dom'
import { AppContext } from '../../context/AppContext'
import axios from 'axios'
import { toast } from 'react-toastify'

const ResetPassword = () => {
  const {backendUrl} = useContext(AppContext)
  axios.defaults.withCredentials = true
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isEmailSent, setIsEmailSent] = useState(false)
  const [otp, setOtp] = useState('')
  const [isOtpSubmited, setIsOtpSubmited] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [canResend, setCanResend] = useState(false)
  const [countdown, setCountdown] = useState(60)
  const [currentStep, setCurrentStep] = useState(1)
  const inputRefs = React.useRef([])

  // Countdown timer for resend
  useEffect(() => {
    if (isEmailSent && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    } else if (countdown === 0) {
      setCanResend(true)
    }
  }, [countdown, isEmailSent])

  // Auto-focus first OTP input
  useEffect(() => {
    if (isEmailSent && !isOtpSubmited && inputRefs.current[0]) {
      inputRefs.current[0].focus()
    }
  }, [isEmailSent, isOtpSubmited])

  const handleInput = (e, index) => {
    if (e.target.value.length > 0 && index < inputRefs.current.length - 1) {
      inputRefs.current[index + 1].focus()
    }
  }

  const handleKeyDown = (e, index) => {
    if (e.key === 'Backspace' && e.target.value === '' && index > 0) {
      inputRefs.current[index - 1].focus()
    }
  }

  const handlePaste = (e) => {
    const paste = e.clipboardData.getData('text')
    const pasteArray = paste.split('')
    pasteArray.forEach((char, index) => {
      if (inputRefs.current[index] && /^\d$/.test(char)) {
        inputRefs.current[index].value = char
      }
    })
    const nextEmpty = inputRefs.current.findIndex(input => !input.value)
    if (nextEmpty !== -1) {
      inputRefs.current[nextEmpty].focus()
    } else {
      inputRefs.current[5].focus()
    }
  }

  const onSubmitEmail = async(e) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      const {data} = await axios.post(`${backendUrl}/api/auth/send-reset-otp`, {email})
      if (data.success) {
        toast.success(data.message)
        setIsEmailSent(true)
        setCurrentStep(2)
        setCountdown(60)
        setCanResend(false)
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const onSubmitOtp = async(e) => {
    e.preventDefault()
    setIsLoading(true)
    const otpArray = inputRefs.current.map(e => e.value)
    const otpValue = otpArray.join('')
    
    if (otpValue.length !== 6) {
      toast.error('Please enter the complete 6-digit code')
      setIsLoading(false)
      return
    }

    setOtp(otpValue)
    setIsOtpSubmited(true)
    setCurrentStep(3)
    setIsLoading(false)
  }

  // ResetPassword.jsx

  const onSubmitNewPassword = async (e) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      const { data } = await axios.post(
        `${backendUrl}/api/auth/reset-password`,
        {
          email,
          otp,
          password: newPassword   
        }
      );

      if (data.success) {
        toast.success(data.message);
        navigate('/login');
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setIsLoading(true)
    try {
      const {data} = await axios.post(`${backendUrl}/api/auth/send-reset-otp`, {email})
      if (data.success) {
        toast.success('Verification code resent!')
        setCountdown(60)
        setCanResend(false)
        inputRefs.current.forEach(input => input.value = '')
        inputRefs.current[0].focus()
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error('Failed to resend code')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className='reset-pwd'>
      <div className='reset-container'>
        

        {/* Progress Steps */}
        <div className='progress-steps'>
          <div className={`step ${currentStep >= 1 ? 'active' : ''} ${currentStep > 1 ? 'completed' : ''}`}>
            <div className='step-number'>1</div>
            <span>Email</span>
          </div>
          <div className='step-line'></div>
          <div className={`step ${currentStep >= 2 ? 'active' : ''} ${currentStep > 2 ? 'completed' : ''}`}>
            <div className='step-number'>2</div>
            <span>Verify</span>
          </div>
          <div className='step-line'></div>
          <div className={`step ${currentStep >= 3 ? 'active' : ''}`}>
            <div className='step-number'>3</div>
            <span>New Password</span>
          </div>
        </div>

        {/* Step 1: Email Form */}
        {!isEmailSent && 
          <form className='form-card' onSubmit={onSubmitEmail}>
            <div className='icon-wrapper'>
              <div className='form-icon'>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
              </div>
            </div>
            <h1>Reset Password</h1>
            <p className='subtitle'>Enter your registered email address and we'll send you a verification code</p>
            <div className='input-group'>
              <input 
                type="email" 
                placeholder='Enter your email' 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                required
                className='email-input'
              />
            </div>
            <button type='submit' className='submit-btn' disabled={isLoading}>
              {isLoading ? <span className='loader'></span> : 'Send Code'}
            </button>
            <p className='back-link' onClick={() => navigate('/login')}>
              Back to Login
            </p>
          </form>
        }

        {/* Step 2: OTP Form */}
        {!isOtpSubmited && isEmailSent &&
          <form className='form-card otp-form' onSubmit={onSubmitOtp}>
            <div className='icon-wrapper'>
              <div className='form-icon'>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </div>
            </div>
            <h1>Enter Verification Code</h1>
            <p className='subtitle'>We've sent a 6-digit code to</p>
            <p className='email-display'>{email}</p>
            <div className='otp-input-container' onPaste={handlePaste}>
              {Array(6).fill(0).map((_, index) => (
                <input 
                  type="text" 
                  maxLength='1' 
                  key={index} 
                  required 
                  pattern="\d*"
                  inputMode="numeric"
                  ref={e => inputRefs.current[index] = e} 
                  onInput={(e) => handleInput(e, index)} 
                  onKeyDown={(e) => handleKeyDown(e, index)}
                  className='otp-input'
                />
              ))}
            </div>
            <button type='submit' className='submit-btn' disabled={isLoading}>
              {isLoading ? <span className='loader'></span> : 'Verify Code'}
            </button>
            <div className='resend-section'>
              {canResend ? (
                <p>
                  Didn't receive the code?{' '}
                  <span className='resend-link' onClick={handleResendOTP}>
                    Resend
                  </span>
                </p>
              ) : (
                <p className='countdown-text'>
                  Resend code in {countdown}s
                </p>
              )}
            </div>
          </form>
        }

        {/* Step 3: New Password Form */}
        {isOtpSubmited && isEmailSent && 
          <form className='form-card' onSubmit={onSubmitNewPassword}>
            <div className='icon-wrapper'>
              <div className='form-icon'>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5z"/>
                  <circle cx="12" cy="15" r="1"/>
                </svg>
              </div>
            </div>
            <h1>Create New Password</h1>
            <p className='subtitle'>Enter your new password below</p>
            <div className='input-group'>
              <input 
                type="password" 
                placeholder='Enter new password' 
                value={newPassword} 
                onChange={e => setNewPassword(e.target.value)} 
                required
                minLength={6}
              />
              <input 
                type="password" 
                placeholder='Confirm new password' 
                value={confirmPassword} 
                onChange={e => setConfirmPassword(e.target.value)} 
                required
                minLength={6}
              />
            </div>
            <button type='submit' className='submit-btn' disabled={isLoading}>
              {isLoading ? <span className='loader'></span> : 'Reset Password'}
            </button>
          </form>
        }
      </div>
    </div>
  )
}

export default ResetPassword