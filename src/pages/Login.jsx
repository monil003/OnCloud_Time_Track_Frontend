import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { LogIn, Mail, Lock, ArrowRight } from 'lucide-react';
import './Auth.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

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

