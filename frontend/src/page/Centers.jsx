import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

export default function Centers() {
  const [centers, setCenters] = useState([]);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(null); // ID of center being imported
  const [animatingId, setAnimatingId] = useState(null); // ID for flying animation
  const [showSuccess, setShowSuccess] = useState(false); // Success celebration overlay
  const navigate = useNavigate();

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5006";

  // Get current staff info
  // Get current staff info
  const staffInfo = JSON.parse(localStorage.getItem("staffInfo") || "{}");
  // Ensure staffId is consistently extracted and formatted
  const staffId = (staffInfo?.staff_id || staffInfo?.staffId)?.toString()?.toUpperCase();

  const capitalize = (str = "") =>
    str.charAt(0).toUpperCase() + str.slice(1);

  // Get deleted center IDs from localStorage (Temporary UI filter)
  const getDeletedCenters = () => {
    try {
      return JSON.parse(localStorage.getItem("deletedCenters") || "[]");
    } catch {
      return [];
    }
  };

  // Save deleted center IDs to localStorage
  const saveDeletedCenters = (ids) => {
    localStorage.setItem("deletedCenters", JSON.stringify(ids));
  };

  // Fetch centers – filtered by this staff only
  useEffect(() => {
    if (!staffId) return;

    // Clear stale deleted list (we use DB now for cross-device persistence)
    localStorage.removeItem('deletedCenters');
    localStorage.removeItem('localImportedCenters');
    
    setLoading(true);
    axios.get(`${API_URL}/api/centers`, { params: { staffId } })
      .then((res) => {
        setCenters(res.data || []);
        setError("");
      })
      .catch((err) => {
        console.error("Fetch Centers Error:", err);
        if (err.response?.status === 401 || err.response?.status === 403) {
          navigate("/");
        } else {
          setError("Failed to load centers. Please try again.");
        }
      })
      .finally(() => setLoading(false));
  }, [API_URL, navigate, staffId]);

  // Add Center – tag with staff_id
  const addCenter = async () => {
    if (!name.trim()) return;
    if (!staffId) return alert("Session expired. Please login again.");
    
    const formattedName = capitalize(name.trim());

    const exists = centers.some(
      (c) => c.name.toLowerCase() === formattedName.toLowerCase()
    );

    if (exists) {
      setError("Center name already exists");
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/api/centers`, { 
        name: formattedName, 
        staffId: staffId.toUpperCase() 
      });

      // When adding a new center, we ensure it's NOT in the deleted list
      const newCenter = res.data;
      const deleted = getDeletedCenters();
      if (deleted.includes(newCenter.id)) {
        // Remove from deleted list if it somehow exists there (prevents disappearing on reload)
        const updatedDeleted = deleted.filter(id => id !== newCenter.id);
        saveDeletedCenters(updatedDeleted);
      }

      setCenters((prev) => [...prev, newCenter]);
      setName("");
      setError("");
    } catch (err) {
      console.error("Add Center Error:", err);
      const msg = err.response?.data?.error || "Something went wrong";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Select center
  const selectCenter = (center) => {
    localStorage.setItem(
      "center",
      JSON.stringify({
        id: Number(center.id),
        name: center.name,
      })
    );
    navigate("/members");
  };

  const handleImport = async (centerId, centerName) => {
    if (!window.confirm(`Are you sure you want to "IMPORT" ${centerName}? This will send all approved members to the PD stage.`)) return;
    
    setImporting(centerId);
    try {
      const res = await axios.post(`${API_URL}/api/centers/${centerId}/import`);

      // Trigger Success Celebration & Fly Animation
      setShowSuccess(true);
      setAnimatingId(centerId);
      
      // Notify Global Sidebar to refresh history
      window.dispatchEvent(new Event('centersUpdated'));

      setTimeout(() => {
        setCenters(prev => prev.map(c => c.id === centerId ? { ...c, is_imported: true } : c));
        setAnimatingId(null);
      }, 800);

      setTimeout(() => {
        setShowSuccess(false);
      }, 3000);

    } catch (err) {
      console.error("Import Error:", err);
      alert("Import failed. Please try again.");
    } finally {
      setImporting(null);
    }
  };

  const activeCenters = centers.filter(c => !c.is_imported);
  const importedCenters = centers.filter(c => c.is_imported);

  // Cross-device persistence: actually update DB so it hides on other devices
  const removeCenterFromUI = async (id) => {
    if (!window.confirm("Are you sure you want to hide this center across all devices?")) return;
    try {
      await axios.post(`${API_URL}/api/centers/${id}/hide`);
      setCenters((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      console.error("Error hiding center:", err);
      alert("Failed to hide center. Please check your connection.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col p-4 md:p-8 overflow-hidden">
      <style>{`
        @keyframes fly-to-sidebar {
          0% { transform: scale(1) translateX(0) translateY(0); opacity: 1; }
          50% { transform: scale(0.6) translateX(-200px) translateY(-50px); opacity: 0.8; }
          100% { transform: scale(0.2) translateX(-400px) translateY(-100px); opacity: 0; }
        }
        .card-flying {
          animation: fly-to-sidebar 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards;
          pointer-events: none;
        }
        @keyframes success-pop {
          0% { transform: scale(0.8) translateY(20px); opacity: 0; }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
        .success-overlay {
          animation: success-pop 0.5s cubic-bezier(0.17, 0.67, 0.83, 0.67) forwards;
        }
      `}</style>

      {/* Success Celebration Overlay */}
      {showSuccess && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-emerald-600/90 backdrop-blur-md pointer-events-none">
          <div className="success-overlay flex flex-col items-center gap-6 text-white text-center p-12">
             <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center text-emerald-600 shadow-2xl">
                <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" /></svg>
             </div>
             <h3 className="text-4xl font-black tracking-tight uppercase">Center Imported!</h3>
             <p className="text-emerald-100 font-bold tracking-widest uppercase text-xs">Moved to PD Verification Queue</p>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col gap-6 transition-all duration-500">
        <div className="w-full max-w-4xl mx-auto flex flex-col gap-6">
        
        {/* Page Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 p-1">
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2 text-gray-400 text-[8px] md:text-[10px] font-black uppercase tracking-normal md:tracking-widest mb-1">
              <span>Dashboard</span>
              <span>/</span>
              <span className="text-indigo-500">Collection Centers</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight leading-tight">
              Center Management
            </h2>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            {/* Staff Badge */}
            <div className="bg-white px-4 py-3 rounded-[1.2rem] md:rounded-[2rem] shadow-sm border border-gray-100 flex items-center gap-3">
               <div className="w-8 h-8 md:w-10 md:h-10 bg-emerald-50 rounded-full hidden md:flex items-center justify-center text-emerald-500 font-black italic shadow-inner">
                  {staffInfo?.name?.charAt(0).toUpperCase() || "S"}
               </div>
               <div className="flex flex-col text-left">
                  <span className="text-[8px] font-black text-gray-400 uppercase tracking-normal md:tracking-widest leading-none mb-0.5">Officer Duty</span>
                  <span className="text-sm md:text-lg font-black text-gray-900 tracking-tight">{staffInfo?.name || "Staff"}</span>
                  <span className="text-[8px] font-bold text-indigo-500 uppercase tracking-normal md:tracking-widest mt-0.5 opacity-60">{staffId || "ID-000"}</span>
               </div>
            </div>
          </div>
        </div>





        {error && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 font-bold text-sm flex items-center gap-3 animate-pulse">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            {error}
          </div>
        )}

        {/* Add Center Box */}
        <div className="bg-white shadow-xl shadow-gray-200/50 rounded-[2rem] p-6 md:p-8 border border-gray-100 flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row bg-gray-50 p-2 rounded-2xl border border-gray-100 gap-2 shadow-inner focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
            <input
              placeholder="Type new center name here..."
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError("");
              }}
              className="flex-1 p-4 bg-transparent focus:outline-none font-bold text-gray-700 placeholder:text-gray-300"
            />
            <button
              onClick={addCenter}
              disabled={loading}
              className={`px-8 py-4 sm:py-0 rounded-xl text-white font-black text-xs uppercase tracking-widest transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2
                ${loading ? "bg-gray-200 text-gray-400 cursor-not-allowed shadow-none" : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200"}
              `}
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              ) : (
                "Add"
              )}
            </button>
          </div>

          {/* Centers List */}
          <div className="space-y-4">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
              Assigned Centers
            </p>
            
            {activeCenters.length === 0 && !loading ? (
              <div className="py-12 bg-gray-50/50 rounded-2xl border-2 border-dashed border-gray-100 text-center flex flex-col items-center gap-3">
                 <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm text-gray-300">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
                 </div>
                 <p className="text-gray-400 font-bold italic text-sm">No active centers found.</p>
              </div>
            ) : (
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeCenters.map((c) => (
                  <li
                    key={c.id}
                    className={`flex flex-col p-6 bg-white border border-gray-50 rounded-[2rem] shadow-sm hover:shadow-xl transition-all duration-300 hover:border-indigo-100 group gap-4 relative
                      ${animatingId === c.id ? 'card-flying' : ''}
                    `}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex flex-col">
                        <span className="font-black text-gray-900 text-xl tracking-tight group-hover:text-indigo-600 transition-colors uppercase truncate max-w-[150px]">{capitalize(c.name)}</span>
                        <span className="text-[10px] font-black text-gray-400 mt-1 tracking-widest uppercase flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                          ID: {staffId}
                        </span>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => removeCenterFromUI(c.id)}
                          className="p-2 text-gray-300 hover:text-rose-500 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <button
                          onClick={() => handleImport(c.id, c.name)}
                          disabled={importing === c.id}
                          className={`w-full justify-center px-4 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg transition-all active:scale-95 flex items-center gap-2
                            ${importing === c.id 
                                ? "bg-gray-100 text-gray-400 cursor-not-allowed shadow-none" 
                                : "bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-200"}
                          `}
                        >
                          {importing === c.id ? (
                            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                          ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          )}
                          IMPORT CENTER
                        </button>

                        <button
                          onClick={() => selectCenter(c)}
                          className="w-full justify-center bg-white border-2 border-indigo-50 text-indigo-600 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:border-indigo-100 hover:bg-indigo-50 transition-all active:scale-95 flex items-center gap-2"
                        >
                          Open Details
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                        </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  </div>
);
}




