import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

export default function Centers() {
  const [centers, setCenters] = useState([]);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:5005";

  // Get current staff info
  const staffInfo = JSON.parse(localStorage.getItem("staffInfo") || "{}");
  const staffId = staffInfo?.staff_id || staffInfo?.staffId;

  const capitalize = (str = "") =>
    str.charAt(0).toUpperCase() + str.slice(1);

  // Get deleted center IDs from localStorage
  const getDeletedCenters = () => {
    return JSON.parse(localStorage.getItem("deletedCenters") || "[]");
  };

  // Save deleted center IDs to localStorage
  const saveDeletedCenters = (ids) => {
    localStorage.setItem("deletedCenters", JSON.stringify(ids));
  };

  // Fetch centers – filtered by this staff only
  useEffect(() => {
    if (!staffId) return;
    axios.get(`${API_URL}/api/centers`, { params: { staffId } })
      .then((res) => {
        const deleted = getDeletedCenters();
        setCenters(res.data.filter((c) => !deleted.includes(c.id)));
      })
      .catch((err) => {
        if (err.response?.status === 401 || err.response?.status === 403) {
          navigate("/"); // redirect on unauth
        } else {
          setError("Failed to load centers")
        }
      });
  }, [API_URL, navigate, staffId]);

  // Add Center – tag with staff_id
  const addCenter = async () => {
    if (!name.trim()) return;
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
      const res = await axios.post(`${API_URL}/api/centers`, { name: formattedName, staffId });

      setCenters((prev) => [...prev, res.data]);
      setName("");
      setError("");
    } catch (err) {
      if (err.response?.status === 409) {
        setError("Center name already exists");
      } else {
        setError("Something went wrong");
      }
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

  // UI delete with persistence
  const removeCenterFromUI = (id) => {
    setCenters((prev) => prev.filter((c) => c.id !== id));
    const deleted = getDeletedCenters();
    saveDeletedCenters([...deleted, id]);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center p-4">
      <div className="w-full max-w-2xl bg-white shadow-lg rounded-lg p-4">
        <h2 className="text-2xl font-bold mb-4 text-center">Centers</h2>

        {error && (
          <div className="mb-4 p-3 text-center rounded bg-red-100 text-red-700">
            {error}
          </div>
        )}

        <div className="flex mb-6">
          <input
            placeholder="New Center"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError("");
            }}
            className="flex-1 p-3 border rounded-l-lg"
          />
          <button
            onClick={addCenter}
            disabled={loading}
            className={`px-4 rounded-r-lg text-white flex items-center justify-center gap-2
              ${loading ? "bg-indigo-400 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700"}
            `}
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              "Add"
            )}
          </button>
        </div>

        <ul className="space-y-3">
          {centers.map((c) => (
            <li
              key={c.id}
              className="flex justify-between items-center p-3 border rounded"
            >
              <span className="font-medium">{capitalize(c.name)}</span>

              <div className="flex gap-2">
                <button
                  onClick={() => selectCenter(c)}
                  className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
                >
                  Open
                </button>

                <button
                  onClick={() => removeCenterFromUI(c.id)}
                  className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}




