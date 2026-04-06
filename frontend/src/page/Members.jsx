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
  useEffect(() => {
    if (!center?.id) navigate("/centers");
  }, [center, navigate]);

  // Fetch members + loans
  useEffect(() => {
    if (!center?.id) return;

    const fetchData = async () => {
      try {
        const membersRes = await axios.get(`${API_URL}/api/members/${center.id}`);
        const loansRes = await axios.get(`${API_URL}/api/loans`);

        const membersData = membersRes.data;
        const loansData = loansRes.data;

        setMembers(
          membersData.map((m) => {
            const loan = loansData.find(
              (l) => Number(l.memberid) === Number(m.id)
            );

            return {
              ...m,
              id: Number(m.id),
              loanStatus: loan ? loan.status : null,
            };
          })
        );
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
  }, [center, API_URL]);

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
    if (!member.loanStatus) navigate("/loan-application");
  };

  // UI
  if (loading) return <p className="text-center mt-10">Loading members...</p>;
  if (error) return <p className="text-center mt-10 text-red-500">{error}</p>;

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center p-4">
      <div className="w-full max-w-2xl bg-white shadow rounded-lg p-4 relative">

        {/* Back Button */}
        <button
          onClick={() => navigate("/centers")}
          className="absolute top-4 left-4 bg-gray-300 px-3 py-1 rounded"
        >
          Back
        </button><br /><br />

        <h2 className="text-2xl font-bold mb-6 text-center">
          Members – {center.name}
        </h2>

        {/* Add Member */}
        <div className="mb-3">
          <div className="flex">
            <input
              value={name}
              onChange={handleNameChange}
              placeholder="New Member Name"
              className={`flex-1 p-3 border rounded-l-lg ${nameError ? "border-red-500" : ""}`}
            />
            <button
              onClick={addMember}
              disabled={!name.trim() || !!nameError || addLoading}
              className={`px-4 rounded-r-lg text-white flex items-center justify-center gap-2
                ${nameError || addLoading ? "bg-gray-400 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700"}
              `}
            >
              {addLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                </>
              ) : (
                "Add"
              )}
            </button>
          </div>

          {nameError && <p className="text-red-500 text-sm mt-1">{nameError}</p>}
        </div>

        {/* Members List */}
        <ul className="space-y-3 mt-6">
          {members.map((member) => (
            <li
              key={member.id}
              className="flex justify-between items-center p-3 border rounded"
            >
              <div className="flex flex-col">
                <span className="font-medium text-lg text-gray-800">{capitalizeName(member.name)}</span>
                {member.member_no && (
                  <span className="text-sm font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full w-max mt-1 border border-indigo-100 shadow-sm">
                    {member.member_no}
                  </span>
                )}
              </div>

              <button
                disabled={!!member.loanStatus}
                onClick={() => handleAction(member)}
                className={`px-3 py-1 rounded text-white ${!member.loanStatus
                  ? "bg-blue-600 hover:bg-blue-700"
                  : member.loanStatus === "PENDING"
                    ? "bg-yellow-500 cursor-not-allowed"
                    : member.loanStatus === "APPROVED"
                      ? "bg-green-700 cursor-not-allowed"
                      : member.loanStatus === "CREDITED"
                        ? "bg-purple-700 cursor-not-allowed"
                        : "bg-red-600 cursor-not-allowed"
                  }`}

              >
                {!member.loanStatus ? "Apply Loan" : member.loanStatus}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
