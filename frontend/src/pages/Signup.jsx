import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signup } from '../services/api';

export default function Signup() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    const { name, email, password } = form;
    if (!name || !email || !password) {
      setError('All fields are required.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      await signup({ name, email, password, role: 'ROLE_MEMBER' });
      setSuccess('Account created! Redirecting to login…');
      setTimeout(() => navigate('/login'), 1600);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.response?.data ||
          'Signup failed. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        {/* Logo */}
        <div className="auth-logo">
          <div className="auth-logo-icon">🗂</div>
          <span className="auth-logo-text">TaskFlow</span>
        </div>

        <h1 className="auth-title">Signup Disabled</h1>
        <p className="auth-subtitle">Contact your administrator to create an account.</p>

        <div className="alert alert-info" style={{ marginBottom: '2rem' }}>
          <span>ℹ</span> Public signup has been disabled for security. 
          Please ask your admin to create your account.
        </div>

        <div style={{ textAlign: 'center', opacity: 0.6 }}>
          <Link to="/login" className="btn btn-primary btn-block">
            ← Go to Login
          </Link>
        </div>

        <p className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
