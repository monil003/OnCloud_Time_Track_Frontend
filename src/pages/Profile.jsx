import React, { useState, useContext } from 'react';
import api from '../utils/api';
import { AuthContext } from '../context/AuthContext';
import { User, Lock, Shield, CheckCircle2, AlertCircle } from 'lucide-react';
import './Profile.css';

const Profile = () => {
  const { user } = useContext(AuthContext);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState({ type: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      return setStatus({ type: 'error', message: 'New passwords do not match' });
    }

    setIsSubmitting(true);
    setStatus({ type: '', message: '' });

    try {
      await api.put('/api/auth/reset-password', { oldPassword, newPassword });
      setStatus({ type: 'success', message: 'Password updated successfully!' });
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setStatus({ 
        type: 'error', 
        message: err.response?.data?.message || 'Failed to reset password' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="profile-container container">
      <div className="profile-header">
        <h1>Account Settings</h1>
        <p>Manage your profile and security preferences</p>
      </div>

      <div className="profile-grid">
        <div className="profile-card glass-card">
          <div className="card-header">
            <User size={20} className="header-icon" />
            <h3>Personal Information</h3>
          </div>
          <div className="user-details">
            <div className="detail-item">
              <label>Full Name</label>
              <p>{user.name}</p>
            </div>
            <div className="detail-item">
              <label>Email Address</label>
              <p>{user.email}</p>
            </div>
            <div className="detail-item">
              <label>Role</label>
              <span className={`role-badge ${user.role}`}>{user.role}</span>
            </div>
          </div>
        </div>

        <div className="profile-card glass-card">
          <div className="card-header">
            <Shield size={20} className="header-icon" />
            <h3>Security</h3>
          </div>
          <form onSubmit={handleResetPassword} className="reset-form">
            <div className="form-group">
              <label><Lock size={14} /> Current Password</label>
              <input 
                type="password" 
                value={oldPassword} 
                onChange={e => setOldPassword(e.target.value)} 
                placeholder="••••••••"
                required 
              />
            </div>
            <div className="form-group">
              <label><Lock size={14} /> New Password</label>
              <input 
                type="password" 
                value={newPassword} 
                onChange={e => setNewPassword(e.target.value)} 
                placeholder="••••••••"
                required 
              />
            </div>
            <div className="form-group">
              <label><Lock size={14} /> Confirm New Password</label>
              <input 
                type="password" 
                value={confirmPassword} 
                onChange={e => setConfirmPassword(e.target.value)} 
                placeholder="••••••••"
                required 
              />
            </div>

            {status.message && (
              <div className={`status-msg ${status.type}`}>
                {status.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                {status.message}
              </div>
            )}

            <button type="submit" className="btn btn-orange" disabled={isSubmitting}>
              {isSubmitting ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Profile;
