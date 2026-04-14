import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
function Sidebar({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [staffName, setStaffName] = useState('Staff Member');
  const [staffId, setStaffId] = useState('');
  const [importedCenters, setImportedCenters] = useState([]);
  const navigate = useNavigate();
  const location = useLocation();

  const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:5005";

  useEffect(() => {
    const staffInfo = localStorage.getItem('staffInfo');
    if (staffInfo) {
      try {
        const staff = JSON.parse(staffInfo);
        if (staff.name) setStaffName(staff.name);
        const sid = (staff.staff_id || staff.staffId)?.toString()?.toUpperCase();
        if (sid) {
          setStaffId(sid);
          fetchImportedCenters(sid);
        }
      } catch (e) {
        console.error("Error parsing staffInfo", e);
      }
    }

    // Listen for updates from other components
    const handleUpdate = () => {
      const info = localStorage.getItem('staffInfo');
      if (info) {
        const staff = JSON.parse(info);
        const sid = (staff.staff_id || staff.staffId)?.toString()?.toUpperCase();
        if (sid) fetchImportedCenters(sid);
      }
    };

    window.addEventListener('centersUpdated', handleUpdate);
    return () => window.removeEventListener('centersUpdated', handleUpdate);
  }, []);

  const fetchImportedCenters = async (sid) => {
    try {
      const res = await axios.get(`${API_URL}/api/centers`, { params: { staffId: sid } });
      const data = res.data;
      
      const deleted = JSON.parse(localStorage.getItem("deletedCenters") || "[]");
      const localImported = JSON.parse(localStorage.getItem('localImportedCenters') || '[]');
      
      const imported = data.filter(c => 
        (c.is_imported || localImported.includes(c.id)) && !deleted.includes(c.id)
      );
      setImportedCenters(imported);
    } catch (err) {
      console.error("Failed to fetch imported centers in sidebar", err);
    }
  };

  const removeFromHistory = (id) => {
    const deleted = JSON.parse(localStorage.getItem("deletedCenters") || "[]");
    if (!deleted.includes(id)) {
      localStorage.setItem("deletedCenters", JSON.stringify([...deleted, id]));
    }
    setImportedCenters(prev => prev.filter(c => c.id !== id));
  };

  const handleLogout = () => {
    localStorage.removeItem('staffInfo');
    navigate('/login');
  };

  const navLinks = [
    { name: 'Centers', path: '/centers', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
    { name: 'Members', path: '/members', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
    { name: 'My Applications', path: '/tracking', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
    { name: 'Query', path: '/query', icon: 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' }
  ];


  if (location.pathname === '/login') {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
      {/* Mobile Header & Hamburger */}
      <div className="md:hidden fixed top-0 w-[100vw] bg-indigo-900 border-b border-indigo-800 z-50 px-4 py-3 flex justify-between items-center shadow-lg">
        <h2 className="text-xl font-black text-white px-2 tracking-tight">Sindhuja Fin</h2>
        <button 
          onClick={() => setIsOpen(!isOpen)} 
          className="text-indigo-200 hover:text-white focus:outline-none p-2 rounded-lg bg-indigo-800/50 hover:bg-indigo-700 transition"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {isOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Sidebar Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-indigo-950/60 backdrop-blur-sm z-40 md:hidden transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Content */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-50
        w-72 md:w-64 bg-indigo-900 text-white flex flex-col
        transition-transform duration-300 ease-in-out shadow-2xl md:shadow-none
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-6 border-b border-indigo-800 hidden md:block">
          <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
            <svg className="w-6 h-6 text-indigo-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
            Sindhuja Fin
          </h2>
          <p className="text-indigo-300 text-[10px] font-bold tracking-widest uppercase mt-2 ml-8">Staff Dashboard</p>
        </div>
        
        {/* Mobile-only spacer */}
        <div className="h-[60px] md:hidden border-b border-indigo-800 bg-indigo-950 flex items-center px-6 shadow-inner">
           <p className="text-indigo-300 text-[11px] font-bold tracking-widest uppercase flex items-center gap-2">
             <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h7" />
             </svg>
             Navigation Menu
           </p>
        </div>

        <div className="flex-1 overflow-y-auto py-6 styled-scrollbar">
          <nav className="space-y-2 px-4">
            {navLinks.map((link) => (
              <NavLink
                key={link.name}
                to={link.path}
                onClick={() => setIsOpen(false)}
                className={({ isActive }) =>
                  `flex items-center px-4 py-3.5 rounded-xl font-bold transition-all duration-200 group ${
                    isActive
                       ? 'bg-indigo-600 shadow-lg shadow-indigo-900/20 ring-1 ring-indigo-500/50 text-white'
                       : 'text-indigo-200 hover:bg-indigo-800/60 hover:text-white hover:pl-6'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <svg className={`w-5 h-5 mr-3 transition-colors duration-200 ${isActive ? 'text-white' : 'text-indigo-400 group-hover:text-indigo-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={link.icon} />
                    </svg>
                    {link.name}
                  </>
                )}
              </NavLink>
            ))}

            {/* Imported Centers Section */}
            {importedCenters.length > 0 && (
              <div className="mt-10 pt-6 border-t border-indigo-800/50">
                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] px-4 mb-4 flex items-center justify-between">
                  <span>Import History</span>
                  <span className="bg-indigo-800 px-2 py-0.5 rounded-full text-[8px]">{importedCenters.length}</span>
                </p>
                <div className="space-y-2 px-2 max-h-[250px] overflow-y-auto styled-scrollbar">
                   {importedCenters.map(c => (
                     <div key={c.id} className="group relative bg-indigo-950/40 border border-indigo-700/30 p-4 rounded-xl hover:bg-indigo-800/40 transition-all">
                        <div className="flex justify-between items-start mb-1">
                          <p className="text-xs font-black text-indigo-100 uppercase truncate pr-4">{c.name}</p>
                          <button 
                            onClick={(e) => { e.stopPropagation(); removeFromHistory(c.id); }}
                            className="p-1 text-indigo-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                           <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                           <span className="text-[8px] font-bold text-indigo-400 uppercase tracking-widest">Sent to PD Stage</span>
                        </div>
                     </div>
                   ))}
                </div>
              </div>
            )}
          </nav>
        </div>

        <div className="p-4 border-t border-indigo-800 bg-indigo-950/30">
          <div className="bg-indigo-900/80 rounded-xl p-4 mb-4 border border-indigo-700/50 shadow-inner">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-md border border-indigo-500">
                {staffName.charAt(0).toUpperCase()}
              </div>
              <div className="overflow-hidden">
                <p className="text-[10px] text-indigo-300 font-bold uppercase tracking-wider mb-0.5">Logged in as</p>
                <p className="text-white font-bold truncate text-sm">{staffName}</p>
                <p className="text-indigo-400 font-bold text-[9px] uppercase tracking-widest mt-0.5">{staffId}</p>
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center px-4 py-3.5 bg-rose-500/10 text-rose-300 rounded-xl hover:bg-rose-500 hover:text-white transition-all duration-300 font-bold text-sm border border-rose-500/20 hover:border-rose-500 hover:shadow-lg hover:shadow-rose-500/25 group overflow-hidden relative"
          >
            <span className="absolute inset-0 w-full h-full bg-rose-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
            <span className="relative flex items-center justify-center w-full">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign Out
            </span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-gray-50/80 relative pt-[60px] md:pt-0 pb-16 md:pb-0">
        <div className="flex-1 overflow-y-auto w-full h-full scroll-smooth">
          {children}
        </div>
      </main>
    </div>
  );
}

export default Sidebar;
