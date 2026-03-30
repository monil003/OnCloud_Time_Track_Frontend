import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../utils/api';
import { Mail, ShieldCheck, Lock, ArrowRight, ArrowLeft, CheckCircle2, RefreshCw } from 'lucide-react';
import './Auth.css';

const STEPS = {
  EMAIL: 1,
  OTP: 2,
  NEW_PASSWORD: 3,
  SUCCESS: 4,
};

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(STEPS.EMAIL);

  // Form values
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  // ── STEP 1: Request OTP ──────────────────────
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/api/auth/forgot-password', { email });
      setStep(STEPS.OTP);
      startResendCooldown();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const startResendCooldown = () => {
    setResendCooldown(60);
    const interval = setInterval(() => {
      setResendCooldown(prev => {
        if (prev <= 1) { clearInterval(interval); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  // ── STEP 2: Verify OTP ───────────────────────
  const otpValue = otp.join('');

  const handleOtpChange = (value, index) => {
    if (!/^\d*$/.test(value)) return; // digits only
    const next = [...otp];
    next[index] = value.slice(-1);
    setOtp(next);
    // Auto-advance
    if (value && index < 5) {
      document.getElementById(`otp-${index + 1}`)?.focus();
    }
  };

  const handleOtpKeyDown = (e, index) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      document.getElementById(`otp-${index - 1}`)?.focus();
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (otpValue.length < 6) return setError('Enter all 6 digits.');
    setError('');
    setLoading(true);
    try {
      await api.post('/api/auth/verify-otp', { email, otp: otpValue });
      setStep(STEPS.NEW_PASSWORD);
    } catch (err) {
      setError(err.response?.data?.message || 'OTP verification failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setError('');
    setLoading(true);
    try {
      await api.post('/api/auth/forgot-password', { email });
      setOtp(['', '', '', '', '', '']);
      startResendCooldown();
    } catch (err) {
      setError('Failed to resend OTP.');
    } finally {
      setLoading(false);
    }
  };

  // ── STEP 3: Set New Password ─────────────────
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) return setError('Password must be at least 6 characters.');
    if (newPassword !== confirmPassword) return setError('Passwords do not match.');
    setError('');
    setLoading(true);
    try {
      await api.post('/api/auth/reset-password-otp', { email, newPassword });
      setStep(STEPS.SUCCESS);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  // ── Progress indicator ───────────────────────
  const stepLabels = ['Email', 'Verify OTP', 'New Password'];

  return (
    <div className="auth-container">
      <div className="auth-box glass-card fp-box">

        {/* Step progress */}
        {step !== STEPS.SUCCESS && (
          <div className="fp-steps">
            {stepLabels.map((label, i) => {
              const stepNum = i + 1;
              const isActive = step === stepNum;
              const isDone = step > stepNum;
              return (
                <div key={label} className={`fp-step ${isActive ? 'fp-step--active' : ''} ${isDone ? 'fp-step--done' : ''}`}>
                  <div className="fp-step-circle">
                    {isDone ? <CheckCircle2 size={14} /> : stepNum}
                  </div>
                  <span className="fp-step-label">{label}</span>
                  {i < stepLabels.length - 1 && <div className="fp-step-line" />}
                </div>
              );
            })}
          </div>
        )}

        {/* ── STEP 1 ── */}
        {step === STEPS.EMAIL && (
          <>
            <div className="auth-header">
              <div className="logo-icon"><Mail size={28} /></div>
              <h1>Forgot Password</h1>
              <p>Enter your work email to receive a 6-digit OTP</p>
            </div>
            {error && <div className="error-msg">{error}</div>}
            <form onSubmit={handleRequestOtp} className="auth-form">
              <div className="form-group">
                <label><Mail size={14} /> Work Email</label>
                <input
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <button type="submit" className="btn btn-orange auth-btn" disabled={loading}>
                {loading ? 'Sending OTP...' : 'Send OTP'} <ArrowRight size={18} />
              </button>
            </form>
            <div className="auth-footer">
              <Link to="/login"><ArrowLeft size={14} /> Back to Sign In</Link>
            </div>
          </>
        )}

        {/* ── STEP 2 ── */}
        {step === STEPS.OTP && (
          <>
            <div className="auth-header">
              <div className="logo-icon fp-icon-verify"><ShieldCheck size={28} /></div>
              <h1>Enter OTP</h1>
              <p>We sent a 6-digit code to <strong>{email}</strong></p>
            </div>
            {error && <div className="error-msg">{error}</div>}
            <form onSubmit={handleVerifyOtp} className="auth-form">
              <div className="fp-otp-row">
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    id={`otp-${i}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={e => handleOtpChange(e.target.value, i)}
                    onKeyDown={e => handleOtpKeyDown(e, i)}
                    className="fp-otp-input"
                    autoFocus={i === 0}
                  />
                ))}
              </div>
              <button type="submit" className="btn btn-orange auth-btn" disabled={loading || otpValue.length < 6}>
                {loading ? 'Verifying...' : 'Verify OTP'} <ArrowRight size={18} />
              </button>
            </form>
            <div className="fp-resend">
              <button
                className={`fp-resend-btn ${resendCooldown > 0 ? 'fp-resend-btn--disabled' : ''}`}
                onClick={handleResend}
                disabled={resendCooldown > 0 || loading}
              >
                <RefreshCw size={14} />
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}
              </button>
              <button className="fp-back-btn" onClick={() => { setStep(STEPS.EMAIL); setError(''); }}>
                <ArrowLeft size={14} /> Change email
              </button>
            </div>
          </>
        )}

        {/* ── STEP 3 ── */}
        {step === STEPS.NEW_PASSWORD && (
          <>
            <div className="auth-header">
              <div className="logo-icon fp-icon-lock"><Lock size={28} /></div>
              <h1>New Password</h1>
              <p>Choose a strong new password for your account</p>
            </div>
            {error && <div className="error-msg">{error}</div>}
            <form onSubmit={handleResetPassword} className="auth-form">
              <div className="form-group">
                <label><Lock size={14} /> New Password</label>
                <input
                  type="password"
                  placeholder="Minimum 6 characters"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label><Lock size={14} /> Confirm Password</label>
                <input
                  type="password"
                  placeholder="Repeat new password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="btn btn-orange auth-btn" disabled={loading}>
                {loading ? 'Resetting...' : 'Reset Password'} <ArrowRight size={18} />
              </button>
            </form>
          </>
        )}

        {/* ── STEP 4: Success ── */}
        {step === STEPS.SUCCESS && (
          <div className="fp-success">
            <div className="fp-success-icon"><CheckCircle2 size={48} /></div>
            <h1>Password Reset!</h1>
            <p>Your password has been updated successfully. You can now sign in with your new password.</p>
            <button className="btn btn-orange auth-btn" onClick={() => navigate('/login')}>
              Go to Sign In <ArrowRight size={18} />
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

export default ForgotPassword;
