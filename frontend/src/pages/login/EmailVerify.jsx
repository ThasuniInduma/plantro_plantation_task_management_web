import React, { useContext, useEffect, useState } from 'react'
import './EmailVerify.css'
import { assets } from '../../assets/assets'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { AppContext } from '../../context/AppContext'
import { toast } from 'react-toastify'

const EmailVerify = () => {
  const navigate = useNavigate()
  axios.defaults.withCredentials = true;
  const {backendUrl, isLoggedIn, userData, getUserData} = useContext(AppContext)
  const inputRefs = React.useRef([])
  const [isLoading, setIsLoading] = useState(false)
  const [canResend, setCanResend] = useState(false)
  const [countdown, setCountdown] = useState(60)

  // Countdown timer for resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    } else {
      setCanResend(true)
    }
  }, [countdown])

  const handleInput = (e, index) => {
    const value = e.target.value
    if (value.length > 0 && index < inputRefs.current.length - 1) {
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
    // Focus on the next empty input or last input
    const nextEmpty = inputRefs.current.findIndex(input => !input.value)
    if (nextEmpty !== -1) {
      inputRefs.current[nextEmpty].focus()
    } else {
      inputRefs.current[5].focus()
    }
  }

  const onSubmitHandler = async (e) => {
    try {
      e.preventDefault()
      setIsLoading(true)
      const otpArray = inputRefs.current.map(e => e.value)
      const otp = otpArray.join('')
      
      if (otp.length !== 6) {
        toast.error('Please enter the complete 6-digit code')
        setIsLoading(false)
        return
      }

      const {data} = await axios.post(`${backendUrl}/api/auth/verify-account`, {otp})
      
      if (data.success) {
        toast.success(data.message);
        navigate('/login'); // ✅ user must login after verification
      } else {
        toast.error(data.message)
        // Clear inputs on error
        inputRefs.current.forEach(input => input.value = '')
        inputRefs.current[0].focus()
      }
    } catch (error) {
      toast.error(error.message)
      inputRefs.current.forEach(input => input.value = '')
      inputRefs.current[0].focus()
    } finally {
      setIsLoading(false)
    }
  }

  // EmailVerify.jsx

  const handleResendOTP = async () => {
    try {
      const { data } = await axios.post(
        `${backendUrl}/api/auth/resend-otp`,
        {
          email: userData.email   // ✅ REQUIRED
        }
      );

      if (data.success) {
        toast.success('Verification code resent!');
        setCountdown(60);
        setCanResend(false);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error('Failed to resend code');
    }
  };

  useEffect(() => {
    isLoggedIn && userData && userData.isAccountVerified && navigate('/')
  }, [isLoggedIn, userData])

  // Auto-focus first input on mount
  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus()
    }
  }, [])

  return (
    <div className='email-verify'>
      <div className='verify-container'>
        <div className='logo-section'>
          <img src={assets.logo2} onClick={() => navigate('/')} alt="Logo" />
        </div>
        
        <form onSubmit={onSubmitHandler}>
          <div className='icon-wrapper'>
            <div className='email-icon'>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
            </div>
          </div>

          <h1>Verify Your Email</h1>
          <p className='subtitle'>Enter the 6-digit code sent to</p>
          <p className='email-display'>{userData?.email || 'your email'}</p>

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

          <button type="submit" className='verify-button' disabled={isLoading}>
            {isLoading ? (
              <span className='loader'></span>
            ) : (
              'Verify Email'
            )}
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
      </div>
    </div>
  )
}

export default EmailVerify