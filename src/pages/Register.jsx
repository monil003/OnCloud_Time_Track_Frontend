import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../utils/api';
import { UserPlus, User, Mail, Lock, ArrowRight, ShieldCheck, RefreshCw, CheckCircle2 } from 'lucide-react';
import './Auth.css';

const STEPS = { FORM: 1, OTP: 2, SUCCESS: 3 };

const Register = () => {
  const { register, verifyEmailAndLogin } = useContext(AuthContext);
  const navigate = useNavigate();

  const [step, setStep] = useState(STEPS.FORM);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // ── STEP 1: Register ────────────────────────
  const handleRegister = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      const data = await register(name, email, password);
      if (data.requiresVerification) {
        setStep(STEPS.OTP);
        startResendCooldown();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
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
    if (!/^\d*$/.test(value)) return;
    const next = [...otp];
    next[index] = value.slice(-1);
    setOtp(next);
    if (value && index < 5) {
      document.getElementById(`reg-otp-${index + 1}`)?.focus();
    }
  };

  const handleOtpKeyDown = (e, index) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      document.getElementById(`reg-otp-${index - 1}`)?.focus();
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (otpValue.length < 6) return setError('Enter all 6 digits.');
    setError('');
    setIsLoading(true);
    try {
      const res = await api.post('/api/auth/verify-email', { email, otp: otpValue });
      // Auto-login after verification
      verifyEmailAndLogin(res.data.token, res.data.user);
      setStep(STEPS.SUCCESS);
      // Navigate to dashboard after brief success flash
      setTimeout(() => navigate('/'), 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Verification failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setError('');
    setIsLoading(true);
    try {
      await api.post('/api/auth/resend-verification', { email });
      setOtp(['', '', '', '', '', '']);
      startResendCooldown();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend code.');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Step progress (reusable across steps) ────
  const stepLabels = ['Create Account', 'Verify Email'];

  return (
    <div className="auth-container">
      <div className="auth-box glass-card fp-box">

        {/* Progress indicator */}
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

        {/* ── STEP 1: Registration form ── */}
        {step === STEPS.FORM && (
          <>
            <div className="auth-header">
              <div className="logo-icon"><UserPlus size={28} /></div>
              <h1>Join OnCloud</h1>
              <p>Start tracking your time today</p>
            </div>

            {error && <div className="error-msg">{error}</div>}

            <form onSubmit={handleRegister} className="auth-form">
              <div className="form-group">
                <label><User size={14} /> Full Name</label>
                <input
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label><Mail size={14} /> Work Email</label>
                <input
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label><Lock size={14} /> Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <button type="submit" className="btn btn-orange auth-btn" disabled={isLoading}>
                {isLoading ? 'Creating account...' : 'Create Account'} <ArrowRight size={18} />
              </button>
            </form>

            <div className="auth-footer">
              <span>Already have an account?</span>
              <Link to="/login">Sign In</Link>
            </div>
          </>
        )}

        {/* ── STEP 2: OTP verification ── */}
        {step === STEPS.OTP && (
          <>
            <div className="auth-header">
              <div className="logo-icon fp-icon-verify"><ShieldCheck size={28} /></div>
              <h1>Verify Email</h1>
              <p>We sent a 6-digit code to <strong>{email}</strong></p>
            </div>

            {error && <div className="error-msg">{error}</div>}

            <form onSubmit={handleVerifyOtp} className="auth-form">
              <div className="fp-otp-row">
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    id={`reg-otp-${i}`}
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
              <button
                type="submit"
                className="btn btn-orange auth-btn"
                disabled={isLoading || otpValue.length < 6}
              >
                {isLoading ? 'Verifying...' : 'Verify & Sign In'} <ArrowRight size={18} />
              </button>
            </form>

            <div className="fp-resend">
              <button
                className={`fp-resend-btn ${resendCooldown > 0 ? 'fp-resend-btn--disabled' : ''}`}
                onClick={handleResend}
                disabled={resendCooldown > 0 || isLoading}
              >
                <RefreshCw size={14} />
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
              </button>
            </div>
          </>
        )}

        {/* ── STEP 3: Success ── */}
        {step === STEPS.SUCCESS && (
          <div className="fp-success">
            <div className="fp-success-icon"><CheckCircle2 size={56} /></div>
            <h1>Email Verified!</h1>
            <p>Your account is ready. Taking you to your dashboard...</p>
          </div>
        )}

      </div>
    </div>
  );
};

export default Register;
