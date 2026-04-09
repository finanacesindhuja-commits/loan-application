import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

// Use production URL as primary fallback for mobile builds
const API_URL = import.meta.env.VITE_API_URL || 'https://loan-application-tnvs.onrender.com';

function StaffLogin() {
  const [staffId, setStaffId] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const normalizedStaffId = staffId.trim(); // Removed toUpperCase() to match exact server data
      const normalizedPassword = password.trim();

      console.log('Attempting login for:', normalizedStaffId);

      const response = await axios.post(`${API_URL}/staff/login`, {
        staff_id: normalizedStaffId,
        password: normalizedPassword
      });

      console.log('Login response:', response.data);

      const { staff } = response.data;
      if (staff.role !== 'Relationship Officer') {
        setError(`Access denied. Your role is ${staff.role || 'unknown'}. Only Relationship Officers are allowed.`);
        setIsLoading(false);
        return;
      }

      // Explicitly matching App.jsx and AuthContext.jsx expectation
      localStorage.setItem('staffInfo', JSON.stringify(staff));

      // Call context login
      login(staff);

      // Direct navigation to centers to avoid extra redirects
      navigate('/centers');
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.response?.data?.message || 'Invalid Staff ID or password';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans">
      
      {/* Premium Background Accents */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-50/50 rounded-full blur-[120px] -mr-64 -mt-64 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-emerald-50/40 rounded-full blur-[120px] -ml-64 -mb-64 pointer-events-none" />

      {/* Login Card Container */}
      <div className="w-full max-w-md animate-fade-in relative z-10">
        
        {/* Logo Section */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-3xl shadow-2xl shadow-indigo-100/50 mb-6 group transition-all duration-500 hover:scale-110">
            <svg className="w-10 h-10 text-indigo-600 group-hover:rotate-12 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-1.17-1.528A9.018 9.018 0 0111.947 13m4.927 3.245C10.18 19.454 3.583 12.47 6.91 4.601c.823-1.941 2.897-3.1 4.939-3.1s4.116 1.159 4.939 3.1c1.24 2.923 1.017 6.009-.512 8.591M19 18h2m-2-4h2m-2-4h2M5 18h2m-2-4h2m-2-4h2" />
            </svg>
          </div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight leading-tight">Staff Portal</h1>
          <p className="text-gray-400 font-bold text-[10px] uppercase tracking-[0.3em] mt-2">Sindhuja Micro Finance</p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-[2.5rem] p-8 md:p-10 shadow-2xl shadow-indigo-200/40 border border-gray-50 relative overflow-hidden group">
          {/* Subtle line across the card */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-emerald-500 transition-transform duration-700 origin-left" />

          {error && (
            <div className="mb-8 p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 animate-shake">
              <div className="w-8 h-8 bg-rose-500 text-white rounded-full flex items-center justify-center flex-shrink-0 animate-pulse">!</div>
              <p className="text-rose-600 font-black text-[10px] uppercase tracking-widest">{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Staff ID</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg className="w-5 h-5 text-gray-300 group-focus-within:text-indigo-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="e.g. SF-101"
                  className="w-full pl-12 pr-4 py-4 bg-gray-50/70 border border-transparent rounded-2xl focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none transition-all font-black text-gray-700 placeholder:text-gray-300 placeholder:font-medium shadow-inner"
                  value={staffId}
                  onChange={(e) => setStaffId(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Secure Password</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg className="w-5 h-5 text-gray-300 group-focus-within:text-indigo-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="w-full pl-12 pr-12 py-4 bg-gray-50/70 border border-transparent rounded-2xl focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none transition-all font-black text-gray-700 placeholder:text-gray-300 placeholder:font-bold shadow-inner"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-300 hover:text-indigo-600 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {showPassword ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    )}
                    {!showPassword && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />}
                  </svg>
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.3em] flex items-center justify-center gap-3 shadow-xl shadow-indigo-100 hover:bg-indigo-700 hover:-translate-y-1 transition-all active:scale-95 disabled:opacity-50 disabled:translate-y-0 mt-8 group"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  Connect Sync
                  <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Support Section */}
        <div className="mt-10 text-center">
          <p className="text-gray-400 font-medium text-xs tracking-wide">
            Access strictly monitored for <span className="text-indigo-700 font-black">Sindhuja Officers</span>
          </p>
          <div className="mt-4 flex items-center justify-center gap-4 text-[10px] font-black uppercase tracking-widest text-indigo-300">
             <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> Live Server</span>
             <span className="opacity-30">•</span>
             <span>Secured SSL</span>
          </div>
        </div>

      </div>
    </div>
  );
}

export default StaffLogin;
