import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

export default function Members() {
  const navigate = useNavigate();
  const center = JSON.parse(localStorage.getItem("center"));

  const [members, setMembers] = useState([]);
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState("");
  const [loading, setLoading] = useState(true);
  const [addLoading, setAddLoading] = useState(false); // ✅ Add button loading
  const [error, setError] = useState("");

  const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:5005";

  // Redirect if no center selected
  const centerId = center?.id;
  useEffect(() => {
    if (!centerId) navigate("/centers");
  }, [centerId, navigate]);


  // Fetch members + loans
  useEffect(() => {
    if (!centerId) return;

    const fetchData = async () => {
      try {
        const membersRes = await axios.get(`${API_URL}/api/members/${centerId}`);
        const loansRes = await axios.get(`${API_URL}/api/loans`);

        const membersData = membersRes.data;
        const loansData = loansRes.data;

        const processedMembers = membersData.map((m) => {
          // Updated to use 'member_id' correctly
          const loan = loansData.find(
            (l) => Number(l.member_id) === Number(m.id)
          );

          return {
            ...m,
            id: Number(m.id),
            loanStatus: loan ? loan.status : null,
            loanAppId: loan ? loan.loan_app_id : null, // Store the APP-XXXXXX ID
          };
        });

        setMembers(processedMembers);

        // --- AUTO-SELECT LOGIC ---
        const urlParams = new URLSearchParams(window.location.search);
        const autoMemberId = urlParams.get('auto_member_id');
        if (autoMemberId && processedMembers.length > 0) {
          const targetMember = processedMembers.find(m => m.id.toString() === autoMemberId.toString());
          if (targetMember) {
            // Only auto-apply if they don't have an active loan (or it was rejected)
            if (!targetMember.loanStatus || targetMember.loanStatus === "REJECTED" || targetMember.loanStatus === "CLOSED") {
              localStorage.setItem("member", JSON.stringify(targetMember));
              navigate("/loan-application");
            }
          }
        }
      } catch (err) {
        if (err.response?.status === 401 || err.response?.status === 403) {
          navigate("/"); // redirect on unauth
        } else {
          setError("Failed to load members");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [centerId, API_URL, navigate]);


  // Capitalize names
  const capitalizeName = (str) =>
    str
      .trim()
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");

  // Input change
  const handleNameChange = (e) => {
    const value = e.target.value;
    setName(value);

    const formatted = capitalizeName(value);
    const exists = members.some((m) => capitalizeName(m.name) === formatted);
    setNameError(exists ? "Member name already exists" : "");
  };

  // Add member
  const addMember = async () => {
    if (!name.trim() || nameError) return;

    setAddLoading(true);
    try {
      const formattedName = capitalizeName(name);
      const memberNo = `LN-${Math.floor(Math.random() * 900000) + 100000}`;

      if (!center?.id) {
          alert("Center info missing. Please go back and select a center.");
          return;
      }

      const res = await axios.post(`${API_URL}/api/members`, {
        name: formattedName,
        centerId: Number(center.id),
        memberNo: memberNo,
      });


      const data = res.data;

      setMembers((prev) => [
        ...prev,
        { ...data, id: Number(data.id), loanStatus: null },
      ]);

      setName("");
      setNameError("");
    } catch {
      alert("Server error");
    } finally {
      setAddLoading(false);
    }
  };

  // Select member
  const handleAction = (member) => {
    localStorage.setItem("member", JSON.stringify(member));
    if (!member.loanStatus || member.loanStatus === "REJECTED") {
        navigate("/loan-application");
    }
  };


  // Get current staff info
  const staffInfo = JSON.parse(localStorage.getItem("staffInfo") || "{}");
  const staffId = (staffInfo?.staff_id || staffInfo?.staffId)?.toString()?.toUpperCase();

  // UI
  if (loading) return <p className="text-center mt-10">Loading members...</p>;
  if (error) return <p className="text-center mt-10 text-red-500">{error}</p>;

  return (
    <div className="min-h-screen bg-gray-50 flex justify-center p-4 md:p-8">
      <div className="w-full max-w-3xl flex flex-col gap-3 md:gap-6">
        
        {/* Header & Back Button */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 p-1">
          <div className="flex flex-col gap-2">
            <button 
              onClick={() => navigate("/centers")} 
              className="flex items-center gap-2 text-indigo-600 font-bold hover:text-indigo-800 transition-colors w-max py-1"
            >
              <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span className="text-xs md:text-sm">Back</span>
            </button>

            <div>
              <div className="flex items-center gap-2 text-gray-400 text-[8px] md:text-[10px] font-black uppercase tracking-normal md:tracking-widest mb-1">
                <span>Centers</span>
                <span>/</span>
                <span className="text-indigo-500">{center?.name || 'Loading...'}</span>
              </div>
              <h2 className="text-2xl md:text-5xl font-black text-gray-900 tracking-tight leading-tight">
                Member Directory
              </h2>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
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






        <div className="bg-white shadow-xl shadow-gray-200/50 rounded-[2rem] p-6 md:p-8 border border-gray-100 relative">


        {/* Add Member */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row bg-gray-50 p-2 rounded-2xl border border-gray-100 gap-2 shadow-inner">
            <input
              value={name}
              onChange={handleNameChange}
              placeholder="Enter new member name..."
              className={`flex-1 p-4 bg-transparent focus:outline-none font-bold text-gray-700 placeholder:text-gray-300 ${nameError ? "text-red-500" : ""}`}
            />
            <button
              onClick={addMember}
              disabled={!name.trim() || !!nameError || addLoading}
              className={`px-8 py-4 sm:py-0 rounded-xl text-white font-black text-xs uppercase tracking-widest transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2
                ${nameError || addLoading ? "bg-gray-200 text-gray-400 cursor-not-allowed shadow-none" : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200"}
              `}
            >
              {addLoading ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                "Add"
              )}
            </button>
          </div>
          {nameError && <p className="text-red-500 text-[10px] font-bold uppercase tracking-widest mt-3 ml-4">{nameError}</p>}
        </div>

        {/* Members List */}
        <div className="space-y-4">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Registered Members</p>
          {members.length === 0 ? (
            <div className="py-12 text-center text-gray-300 font-bold italic">No members found in this center.</div>
          ) : (
            <ul className="space-y-4">
              {members.map((member) => (
                <li
                  key={member.id}
                  className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-6 bg-white border border-gray-50 rounded-2xl shadow-sm hover:shadow-md transition-all hover:border-gray-200 group gap-4"
                >
                  <div className="flex flex-col">
                    <span className="font-black text-gray-900 text-xl tracking-tight group-hover:text-indigo-600 transition-colors">{capitalizeName(member.name)}</span>
                    
                    {member.member_no && (
                      <span className="text-[10px] font-black text-indigo-400 bg-indigo-50 px-3 py-1 rounded-lg w-max mt-2 tracking-widest uppercase">
                        {member.member_no}
                      </span>
                    )}
                  </div>

                  <button
                    disabled={member.loanStatus && member.loanStatus !== "REJECTED"}
                    onClick={() => handleAction(member)}
                    className={`w-full sm:min-w-[120px] py-3 px-4 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-sm active:scale-95 ${
                      !member.loanStatus || member.loanStatus === "REJECTED"
                        ? "bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-100"
                        : member.loanStatus === "PENDING"
                        ? "bg-amber-50 text-amber-600 border border-amber-100 cursor-not-allowed shadow-none"
                        : member.loanStatus === "APPROVED"
                        ? "bg-emerald-50 text-emerald-600 border border-emerald-100 cursor-not-allowed shadow-none"
                        : member.loanStatus === "CREDITED"
                        ? "bg-violet-50 text-violet-600 border border-violet-100 cursor-not-allowed shadow-none"
                        : "bg-rose-50 text-rose-600 border border-rose-100 cursor-not-allowed shadow-none"
                    }`}
                  >
                    {!member.loanStatus || member.loanStatus === "REJECTED" ? (
                      <span className="flex items-center justify-center gap-2">
                        Apply
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7" /></svg>
                      </span>
                    ) : member.loanStatus}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        </div>
      </div>
    </div>

  );
}
