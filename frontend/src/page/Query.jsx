import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const DOCUMENT_MAP = {
  member_aadhaar_front_url: 'Member Aadhaar Front',
  member_aadhaar_back_url: 'Member Aadhaar Back',
  nominee_aadhaar_front_url: 'Nominee Aadhaar Front',
  nominee_aadhaar_back_url: 'Nominee Aadhaar Back',
  pan_card_url: 'PAN Card',
  form_image_url: 'Field Verification Form',
  signature_url: 'Applicant Signature',
  member_photo_url: 'Member Photo',
  passbook_image_url: 'Bank Passbook'
};

function Query() {
  const { user } = useAuth();
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [activeLoan, setActiveLoan] = useState(null);

  // Use production URL as primary fallback for mobile builds
  const API_URL = import.meta.env.VITE_API_URL || 'https://loan-application-tnvs.onrender.com';

  useEffect(() => {
    if (user?.staff_id) {
      fetchQueriedLoans();
    }
  }, [user]);

  const fetchQueriedLoans = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/api/loans/query/${user.staff_id}`);
      setLoans(res.data);
    } catch (err) {
      console.error('Failed to fetch queries:', err);
    } finally {
      setLoading(false);
    }
  };

  const parseQueries = (remarks) => {
    const matches = [...(remarks?.matchAll(/\[QUERY:(.*?)\]/g) || [])];
    if (matches.length > 0) {
      return matches.map(match => ({
        field: match[1],
        label: DOCUMENT_MAP[match[1]] || 'Document',
        fullTag: match[0]
      }));
    }
    // Default fallback if no tag is found
    return [{ field: 'form_image_url', label: 'Field Verification Form', fullTag: '' }];
  };

  const handleCaptureClick = (loanId, field) => {
    document.getElementById(`camera-input-${loanId}-${field}`).click();
  };

  const onFileChange = async (e, loan, field) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    setActiveLoan(loan);

    try {
      const formData = new FormData();
      formData.append('loanId', loan.id);
      formData.append('fieldName', field); // e.g. member_aadhaar_front_url
      formData.append('replacementFile', file);

      await axios.post(`${API_URL}/api/loans/replace-document`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setActiveLoan(null);
        fetchQueriedLoans();
      }, 2500);
    } catch (err) {
      console.error('Upload failed:', err);
      alert('Upload failed. Please try again.');
      setUploading(false);
      setActiveLoan(null);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto min-h-screen pb-20">
      <header className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Pending Queries</h1>
          <p className="text-gray-500 font-medium mt-1">Replace requested documents using your camera.</p>
        </div>
        <button 
          onClick={fetchQueriedLoans}
          className="px-5 py-3 bg-indigo-600 text-white hover:bg-indigo-700 rounded-2xl shadow-lg shadow-indigo-200 transition-all font-black text-[10px] uppercase tracking-[0.2em] flex items-center gap-3 active:scale-95"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          Refresh Queries
        </button>
      </header>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="font-bold text-indigo-400 animate-pulse uppercase tracking-[0.2em] text-[10px]">Syncing with backend</p>
        </div>
      ) : loans.length === 0 ? (
        <div className="bg-white rounded-[2rem] p-16 text-center shadow-sm border border-gray-100">
          <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6 transform transition-transform hover:scale-110">
            <svg className="w-12 h-12 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-2xl font-black text-gray-900 mb-2">You're All Caught Up!</h3>
          <p className="text-gray-400 font-medium">No pending document queries for your applications.</p>
        </div>
      ) : (
        <div className="grid gap-8">
          {loans.map((loan) => {
            const queries = parseQueries(loan.verification_remarks);
            const isThisUploading = uploading && activeLoan?.id === loan.id;
            const isThisSuccess = success && activeLoan?.id === loan.id;

            // Remove tags from remarks to show clean message
            let cleanRemarks = loan.verification_remarks || '';
            queries.forEach(q => {
               if (q.fullTag) cleanRemarks = cleanRemarks.replace(q.fullTag, '');
            });

            return (
              <div key={loan.id} className="bg-white rounded-[2rem] p-8 shadow-sm border border-gray-100 hover:shadow-xl transition-all duration-300 relative overflow-hidden flex flex-col md:flex-row gap-10 items-start md:items-center group">
                
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-3 mb-5">
                    {queries.map((q, idx) => (
                      <span key={idx} className="bg-rose-50 text-rose-600 px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest border border-rose-100 shadow-sm">
                        Requested: {q.label}
                      </span>
                    ))}
                  </div>
                  
                  <h3 className="text-3xl font-black text-gray-900 mb-2 group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{loan.person_name}</h3>
                  <div className="flex items-center gap-3 mb-8">
                    <span className="text-indigo-400 text-xs font-bold bg-indigo-50 px-3 py-1 rounded-lg uppercase tracking-widest">{loan.center_name}</span>
                    <span className="text-gray-300">/</span>
                    <span className="text-gray-400 text-xs font-medium">Member #{loan.member_id}</span>
                  </div>

                  <div className="bg-slate-50 rounded-[1.5rem] p-6 border border-slate-100 relative">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                      <svg className="w-12 h-12 text-slate-400" fill="currentColor" viewBox="0 0 24 24"><path d="M11.19 2.04c-4.47.22-8.11 3.86-8.33 8.33L2 19h7v3l3-3 3 3v-3h7l-.86-8.63c-.22-4.47-3.86-8.11-8.33-8.33h-.62z" /></svg>
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 italic">Verifier Instructions</p>
                    <p className="text-slate-700 font-bold italic text-sm leading-relaxed">
                      "{cleanRemarks.trim() || 'Please replace the documents requested above.'}"
                    </p>
                  </div>
                </div>

                <div className="w-full md:w-auto flex flex-col items-center gap-5">
                  <div className="grid grid-cols-1 gap-4 w-full md:w-56">
                    {queries.map((q, idx) => (
                      <div key={idx} className="flex flex-col gap-2">
                        <input 
                          type="file" 
                          id={`camera-input-${loan.id}-${q.field}`}
                          className="hidden" 
                          accept="image/*" 
                          capture="environment"
                          onChange={(e) => onFileChange(e, loan, q.field)}
                        />
                        <button
                          onClick={() => handleCaptureClick(loan.id, q.field)}
                          disabled={uploading}
                          className={`w-full py-5 rounded-[1.2rem] font-black text-[10px] uppercase tracking-[0.15em] transition-all duration-300 shadow-lg active:scale-95 flex items-center justify-center gap-2 relative overflow-hidden
                            ${isThisSuccess ? 'bg-emerald-500 text-white' : 
                              isThisUploading ? 'bg-indigo-300 text-white cursor-not-allowed' : 
                              'bg-indigo-600 text-white hover:bg-indigo-700'}
                          `}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          {q.label}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default Query;
