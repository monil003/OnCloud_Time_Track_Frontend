import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../utils/api';
import { LogIn, Mail, Lock, ArrowRight, ShieldCheck, RefreshCw, CheckCircle2 } from 'lucide-react';
import './Auth.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Email verification flow (if login blocked due to unverified)
  const [showVerify, setShowVerify] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [verifySuccess, setVerifySuccess] = useState(false);

  const { login, verifyEmailAndLogin } = useContext(AuthContext);
  const navigate = useNavigate();

  // ── Normal Login ─────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      const data = err.response?.data;
      if (data?.requiresVerification) {
        // Redirect to inline OTP verification
        setUnverifiedEmail(data.email || email);
        setShowVerify(true);
        handleResend(data.email || email);
      } else {
        setError(data?.message || 'Login failed. Please check your credentials.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ── OTP verification (for blocked accounts) ──
  const otpValue = otp.join('');

  const handleOtpChange = (value, index) => {
    if (!/^\d*$/.test(value)) return;
    const next = [...otp];
    next[index] = value.slice(-1);
    setOtp(next);
    if (value && index < 5) {
      document.getElementById(`login-otp-${index + 1}`)?.focus();
    }
  };

  const handleOtpKeyDown = (e, index) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      document.getElementById(`login-otp-${index - 1}`)?.focus();
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (otpValue.length < 6) return setError('Enter all 6 digits.');
    setError('');
    setIsLoading(true);
    try {
      const res = await api.post('/api/auth/verify-email', { email: unverifiedEmail, otp: otpValue });
      verifyEmailAndLogin(res.data.token, res.data.user);
      setVerifySuccess(true);
      setTimeout(() => navigate('/'), 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Verification failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const startCooldown = () => {
    setResendCooldown(60);
    const interval = setInterval(() => {
      setResendCooldown(prev => {
        if (prev <= 1) { clearInterval(interval); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const handleResend = async (emailOverride) => {
    const target = emailOverride || unverifiedEmail;
    try {
      await api.post('/api/auth/resend-verification', { email: target });
      startCooldown();
    } catch (err) {
      // Silently fail resend — user can try again
    }
  };

  // ── Verify success screen ────────────────────
  if (verifySuccess) {
    return (
      <div className="auth-container">
        <div className="auth-box glass-card fp-box">
          <div className="fp-success">
            <div className="fp-success-icon"><CheckCircle2 size={56} /></div>
            <h1>Email Verified!</h1>
            <p>Your account is ready. Signing you in...</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Inline email verification step ───────────
  if (showVerify) {
    return (
      <div className="auth-container">
        <div className="auth-box glass-card fp-box">
          <div className="auth-header">
            <div className="logo-icon fp-icon-verify"><ShieldCheck size={28} /></div>
            <h1>Verify Your Email</h1>
            <p>Enter the 6-digit code sent to <strong>{unverifiedEmail}</strong></p>
          </div>

          {error && <div className="error-msg">{error}</div>}

          <form onSubmit={handleVerifyOtp} className="auth-form">
            <div className="fp-otp-row">
              {otp.map((digit, i) => (
                <input
                  key={i}
                  id={`login-otp-${i}`}
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
              onClick={() => handleResend()}
              disabled={resendCooldown > 0 || isLoading}
            >
              <RefreshCw size={14} />
              {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
            </button>
            <button className="fp-back-btn" onClick={() => { setShowVerify(false); setError(''); setOtp(['','','','','','']); }}>
              ← Back to Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Normal Login form ────────────────────────
  return (
    <div className="auth-container">
      <div className="auth-box glass-card">
        <div className="auth-header">
          <div className="logo-icon">
            <LogIn size={32} />
          </div>
          <h1>OnCloud Time</h1>
          <p>Precision tracking for modern teams</p>
        </div>

        {error && <div className="error-msg">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
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
            />
            <Link to="/forgot-password" className="forgot-password-link">Forgot password?</Link>
          </div>
          <button type="submit" className="btn btn-orange auth-btn" disabled={isLoading}>
            {isLoading ? 'Signing in...' : 'Sign In'} <ArrowRight size={18} />
          </button>
        </form>

        <div className="auth-footer">
          <span>New to OnCloud Time?</span>
          <Link to="/register">Create an account</Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
