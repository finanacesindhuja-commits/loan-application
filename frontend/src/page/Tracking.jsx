import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

export default function Tracking() {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const navigate = useNavigate();

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5006";
  const staffInfo = JSON.parse(localStorage.getItem("staffInfo") || "{}");
  const staffId = (staffInfo?.staff_id || staffInfo?.staffId)?.toString()?.toUpperCase();

  useEffect(() => {
    if (!staffId) {
      navigate("/");
      return;
    }

    const fetchLoans = async () => {
      try {
        setLoading(true);
        // Fetch all loans - we'll filter by staffId in the frontend for now
        const res = await axios.get(`${API_URL}/api/loans`);
        const staffLoans = res.data.filter(l => l.staff_id?.toUpperCase() === staffId);
        setLoans(staffLoans);
        setError("");
      } catch (err) {
        console.error("Fetch Loans Error:", err);
        setError("Failed to load tracking data.");
      } finally {
        setLoading(false);
      }
    };

    fetchLoans();
  }, [API_URL, staffId, navigate]);

  const filteredLoans = loans.filter(l => {
    const matchesSearch = l.person_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          l.loan_app_id?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || l.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'APPROVED': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'PENDING': return 'bg-amber-50 text-amber-600 border-amber-100';
      case 'QUERY': return 'bg-rose-50 text-rose-600 border-rose-100';
      case 'REJECTED': return 'bg-gray-100 text-gray-500 border-gray-200';
      case 'RESUBMITTED': return 'bg-indigo-50 text-indigo-600 border-indigo-100';
      case 'CREDITED': return 'bg-violet-50 text-violet-600 border-violet-100';
      default: return 'bg-slate-50 text-slate-500 border-slate-100';
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col p-4 md:p-8">
      <div className="w-full max-w-5xl mx-auto flex flex-col gap-6">
        
        {/* Header */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-gray-400 text-[10px] font-black uppercase tracking-widest mb-1">
            <span>Staff Portal</span>
            <span>/</span>
            <span className="text-indigo-500">My Applications</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-black text-gray-900 tracking-tight leading-tight">
            Loan Tracking
          </h2>
          <p className="text-gray-400 font-medium">Monitor the real-time progress of all your submitted applications.</p>
        </div>

        {/* Filters & Search */}
        <div className="bg-white p-4 rounded-[1.5rem] shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <input 
              type="text" 
              placeholder="Search by Name or APP ID..."
              className="w-full pl-10 pr-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500/20 font-bold"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <svg className="w-5 h-5 absolute left-3 top-3.5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          
          <select 
            className="px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500/20 font-black text-[10px] uppercase tracking-widest"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="QUERY">Query</option>
            <option value="RESUBMITTED">Resubmitted</option>
            <option value="CREDITED">Credited</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>

        {/* Loan List */}
        <div className="space-y-4">
          {loading ? (
             <div className="py-20 text-center flex flex-col items-center gap-4">
               <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
               <p className="text-gray-400 font-bold tracking-widest uppercase text-[10px]">Syncing tracking data...</p>
             </div>
          ) : error ? (
             <div className="py-20 text-center text-rose-500 font-bold italic">{error}</div>
          ) : filteredLoans.length === 0 ? (
             <div className="py-20 text-center bg-white rounded-[2rem] border-2 border-dashed border-gray-100 flex flex-col items-center gap-4">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-200">
                   <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                </div>
                <p className="text-gray-400 font-bold italic">No loans found matching your criteria.</p>
             </div>
          ) : (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredLoans.map(loan => (
                  <div key={loan.id} className="bg-white p-6 rounded-[2.5rem] border border-gray-50 shadow-sm hover:shadow-xl transition-all duration-500 group relative overflow-hidden">
                     {/* Decorative Dot */}
                     <div className={`absolute top-6 right-6 w-3 h-3 rounded-full animate-pulse ${loan.status === 'APPROVED' ? 'bg-emerald-500' : loan.status === 'QUERY' ? 'bg-rose-500' : 'bg-amber-500'}`} />
                     
                     <div className="flex flex-col gap-4">
                        <div className="flex flex-col">
                           <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">{loan.loan_app_id || "APP-PENDING"}</span>
                           <h3 className="text-2xl font-black text-gray-900 tracking-tight group-hover:text-indigo-600 transition-colors uppercase truncate pr-8">{loan.person_name}</h3>
                           <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" /></svg>
                              {loan.center_name}
                           </div>
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                           <div className={`px-4 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest ${getStatusColor(loan.status)}`}>
                              {loan.status || "PENDING"}
                           </div>
                           <div className="text-[9px] font-medium text-gray-300">
                              {new Date(loan.created_at).toLocaleDateString()}
                           </div>
                        </div>
                     </div>
                  </div>
                ))}
             </div>
          )}
        </div>

      </div>
    </div>
  );
}
