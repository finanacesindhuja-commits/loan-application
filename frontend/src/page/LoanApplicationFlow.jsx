import React, { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import ImageCrop from "./ImageCrop";
import { useNavigate } from "react-router-dom";

export default function LoanApplicationFlow() {
  const center = JSON.parse(localStorage.getItem("center"));
  const member = JSON.parse(localStorage.getItem("member"));
  const { user } = useAuth();
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState(1);
  
  // Guard: Block if member already has a non-rejected loan
  useEffect(() => {
    if (member?.loanStatus && member.loanStatus !== "REJECTED") {
        alert(`This member already has a ${member.loanStatus} loan application.`);
        navigate("/members");
    }
  }, [member, navigate]);

  const [showCrop, setShowCrop] = useState(false);

  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedField, setSelectedField] = useState("");
  const [showPopup, setShowPopup] = useState(false);
  const [popupLoading, setPopupLoading] = useState(false);
  const [popupSuccess, setPopupSuccess] = useState(false);
  const [errors, setErrors] = useState({});
  const [popupError, setPopupError] = useState(false);
  const [nomineeAge, setNomineeAge] = useState("");
const [nomineeAgeValid, setNomineeAgeValid] = useState(null);





  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5006";

  const calculateAge = (dob) => {
    if (!dob) return "";

    const birthDate = new Date(dob);
    const today = new Date();

    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();

    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age;
  };




  const initialForm = {
    memberCibil: member?.memberCibil || "",
    personName: member?.name || "",
    dateofbirth: member?.dateofbirth || "",
    gender: member?.gender || "",
    religion: "",
    maritalStatus: "",
    aadharNo: "",
    memberwork: "",
    annualIncome: "",
    nomineeName: "",
    nomineeDob: "",
    nomineeGender: "",
    nomineeReligion: "",
    nomineeMaritalStatus: "",
    nomineeRelationship: "",
    nomineeBusiness: "",
    mobileNo: "",
    nomineeMobile: "",
    memberEmail: "",
    address: "",
    pincode: "",
    memberAadhaarFront: null,
    memberAadhaarBack: null,
    nomineeAadhaarFront: null,
    nomineeAadhaarBack: null,
    panCard: null,
    formImage: null,
    signature: null,
    memberPhoto: null,
    passbookImage: null,
    firstCycleRgNumber: "",
  };

  const [loanForm, setLoanForm] = useState(initialForm);

  if (!center || !member) {
    return (
      <p className="text-red-500 text-center mt-10">
        Please select a center and member first.
      </p>
    );
  }

  // ---------------- Validation ----------------
  const validateStep1 = () => {
    const e = {};
    if (!loanForm.memberCibil || loanForm.memberCibil.length !== 3) e.memberCibil = "CIBIL required (3 digits)";
    if (!loanForm.personName) e.personName = "Name required";
    if (!loanForm.dateofbirth) e.dateofbirth = "DOB required";
    if (!loanForm.gender) e.gender = "Gender required";
    if (!loanForm.religion) e.religion = "Religion required";
    if (!loanForm.maritalStatus) e.maritalStatus = "Marital status required";
    if (!loanForm.aadharNo || loanForm.aadharNo.length !== 12) e.aadharNo = "Valid Aadhaar required";
    if (!loanForm.memberwork) e.memberwork = "Work required";
    if (!loanForm.annualIncome) e.annualIncome = "Income required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep2 = () => {
    const e = {};
    if (!loanForm.nomineeName) e.nomineeName = "Nominee name required";
    if (!loanForm.nomineeDob) e.nomineeDob = "Nominee DOB required";
    if (!loanForm.nomineeGender) e.nomineeGender = "Nominee gender required";
    if (!loanForm.nomineeReligion) e.nomineeReligion = "Nominee religion required";
    if (!loanForm.nomineeMaritalStatus) e.nomineeMaritalStatus = "Nominee marital status required";
    if (!loanForm.nomineeRelationship) e.nomineeRelationship = "Nominee relationship required";
    if (!loanForm.nomineeBusiness) e.nomineeBusiness = "Nominee business required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep3 = () => {
    const e = {};
    if (loanForm.mobileNo.length !== 10) e.mobileNo = "Valid mobile required";
    if (loanForm.nomineeMobile.length !== 10) e.nomineeMobile = "Valid nominee mobile required";
    else if (loanForm.nomineeMobile === loanForm.mobileNo) e.nomineeMobile = "Nominee mobile cannot be same as member mobile";
    if (!loanForm.address) e.address = "Address required";
    if (loanForm.pincode.length !== 6) e.pincode = "Valid pincode required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep4 = () => {
    const requiredFiles = [
      "memberAadhaarFront", "memberAadhaarBack",
      "nomineeAadhaarFront", "nomineeAadhaarBack",
      "panCard", "formImage", "signature",
      "memberPhoto", "passbookImage"
    ];
    const e = {};
    requiredFiles.forEach(f => {
      if (!loanForm[f]) e[f] = "Required";
    });
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ---------------- Handlers ----------------
  const handleChange = (e) => {
    const { name, value, type } = e.target;

    // 🔹 Nominee DOB → age calculate & validate
    if (name === "nomineeDob") {
      const age = calculateAge(value);
      setNomineeAge(age);

      if (age < 18) {
        setNomineeAgeValid(false);
      } else {
        setNomineeAgeValid(true);
      }
    }

    setLoanForm((prev) => ({
      ...prev,
      [name]:
        type === "text" && value
          ? value.charAt(0).toUpperCase() + value.slice(1)
          : value,
    }));
  };


  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSelectedFile(file);
    setSelectedField(e.target.name);
    setShowCrop(true);
  };

  const handleCroppedImage = (blob) => {
    if (!blob) return;
    const croppedFile = new File([blob], "cropped.jpg", { type: "image/jpeg" });
    setLoanForm(prev => ({ ...prev, [selectedField]: croppedFile }));
    setShowCrop(false);
    setSelectedFile(null);
    setSelectedField("");
  };

  const nextStep = () => {
    let valid = false;
    if (currentStep === 1) valid = validateStep1();
    if (currentStep === 2) valid = validateStep2();
    if (currentStep === 3) valid = validateStep3();
    if (!valid) return;
    setCurrentStep(s => s + 1);
  };

  const prevStep = () => setCurrentStep(s => Math.max(s - 1, 1));

  const handleSubmit = async () => {
    if (!validateStep4()) return;
    if (!user) return alert("Login required");

    setShowPopup(true);
    setPopupLoading(true);
    setPopupSuccess(false);

    try {
      const FD = new FormData();
      Object.entries(loanForm).forEach(([key, value]) => value && FD.append(key, value));
      FD.append("staffId", user.staff_id);
      FD.append("staffName", user.name);
      FD.append("centerName", center.name);
      FD.append("memberName", member.name);
      FD.append("centerId", center.id || center._id);
      FD.append("memberId", member.id || member._id);


      const res = await axios.post(`${API_URL}/api/loans`, FD, { headers: { "Content-Type": "multipart/form-data" } });

      setPopupLoading(false);
      setPopupSuccess(true);

      setTimeout(() => {
        setShowPopup(false);
        setPopupSuccess(false);
        setLoanForm(initialForm);
        setCurrentStep(1);
        navigate("/members", { replace: true });
        // The success message is already in the popup, so alert is redundant but I'll leave it for now
        // if the user prefers confirm feedback.
      }, 3000);
    } catch (err) {
      const errorMsg = err?.response?.data?.message || err.message;
      console.error("Loan submit error:", err?.response?.data || err.message);

      setPopupLoading(false);
      
      if (err?.response?.status === 409) {
        alert(`❌ Duplicate Application: ${errorMsg}`);
        setShowPopup(false);
        return;
      }

      setPopupError(true);

      setTimeout(() => {
        setPopupError(false);
        setShowPopup(false);
      }, 3000);
    }

  };

  // --- CUSTOM STYLES ---
  const labelStyle = `block text-[9px] md:text-[10px] font-black uppercase tracking-normal md:tracking-widest text-gray-400 mb-1.5 ml-0.5`;
  const inputStyle = `w-full p-4 bg-gray-50/70 border border-transparent rounded-[1.2rem] md:rounded-[1.5rem] focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none transition-all font-bold text-gray-700 placeholder:text-gray-300 placeholder:font-medium shadow-inner`;

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex justify-center p-1 md:p-8">
      <div className="w-full max-w-4xl flex flex-col gap-3 md:gap-6">
        
        {/* Page Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 p-1">
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2 text-gray-400 text-[8px] md:text-[10px] font-black uppercase tracking-normal md:tracking-widest mb-1">
              <span>Member Directory</span>
              <span>/</span>
              <span className="text-indigo-500">Loan Application</span>
            </div>
            <h2 className="text-xl md:text-5xl font-black text-gray-900 tracking-tight leading-tight">
              Application Portal
            </h2>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            {/* Member Badge */}
            <div className="bg-white px-4 py-3 rounded-[1.2rem] md:rounded-[1.8rem] shadow-sm border border-gray-100 flex items-center gap-3">
               <div className="w-8 h-8 md:w-10 md:h-10 bg-indigo-50 rounded-full hidden md:flex items-center justify-center text-indigo-500 font-black italic shadow-inner">
                  {member.name.charAt(0).toUpperCase()}
               </div>
               <div className="flex flex-col">
                  <span className="text-[8px] font-black text-gray-400 uppercase tracking-normal md:tracking-widest leading-none mb-0.5">Applying For</span>
                  <span className="text-sm md:text-base font-black text-gray-900 tracking-tight">{member.name}</span>
               </div>
            </div>

            {/* Staff Badge */}
            <div className="bg-white px-4 py-3 rounded-[1.2rem] md:rounded-[1.8rem] shadow-sm border border-gray-100 flex items-center gap-3">
               <div className="w-8 h-8 md:w-10 md:h-10 bg-emerald-50 rounded-full hidden md:flex items-center justify-center text-emerald-500 font-black italic shadow-inner">
                  {user?.name?.charAt(0).toUpperCase() || "S"}
               </div>
               <div className="flex flex-col">
                  <span className="text-[8px] font-black text-gray-400 uppercase tracking-normal md:tracking-widest leading-none mb-0.5">Officer Duty</span>
                  <span className="text-sm md:text-base font-black text-gray-900 tracking-tight">{user?.name || "Staff"}</span>
                  <span className="text-[8px] font-bold text-indigo-500 uppercase tracking-normal md:tracking-widest mt-0.5 opacity-60">{user?.staff_id || "ID-000"}</span>
               </div>
            </div>
          </div>
        </div>



        {/* STEP INDICATOR */}
        <div className="bg-white rounded-[1.2rem] md:rounded-[2.4rem] p-3 md:p-4 shadow-sm border border-gray-100 flex justify-between items-center px-4 md:px-12 relative overflow-hidden">
           {/* Step Track Line */}
           <div className="absolute top-1/2 left-0 right-0 h-1 bg-gray-50 -translate-y-1/2 mx-8 md:mx-16 z-0" />
           
           {[
             { id: 1, name: 'Member' },
             { id: 2, name: 'Nominee' },
             { id: 3, name: 'Contact' },
             { id: 4, name: 'Review' }
           ].map((s) => (
             <div key={s.id} className="relative z-10 flex flex-col items-center gap-1">
                <div className={`w-7 h-7 md:w-10 md:h-10 rounded-full flex items-center justify-center font-black text-[10px] md:text-sm transition-all duration-500
                  ${currentStep >= s.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100 scale-105 md:scale-110' : 'bg-white text-gray-300 border-2 border-gray-50'}
                `}>
                  {currentStep > s.id ? '✓' : s.id}
                </div>
                <span className={`text-[7px] md:text-[9px] font-black uppercase tracking-normal md:tracking-widest transition-colors duration-500 hidden sm:block
                  ${currentStep >= s.id ? 'text-indigo-600' : 'text-gray-300'}
                `}>{s.name}</span>
             </div>
           ))}
        </div>

        <div className="bg-white shadow-2xl shadow-indigo-100/40 rounded-[1.5rem] md:rounded-[3.5rem] p-4 md:p-12 border border-gray-50 relative overflow-hidden">

           {/* Decorative Background Element */}
           <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50/50 rounded-full blur-[100px] -mr-32 -mt-32 pointer-events-none" />



        {/* STEP 1: Member Info */}
        {currentStep === 1 && (
          <div className="space-y-8 animate-fade-in relative z-10">
            <div className="flex flex-col gap-1">
              <h3 className="text-2xl font-black text-gray-900 tracking-tight">Member Details</h3>
              <p className="text-gray-400 text-sm font-medium">Verify the primary applicant's personal and financial information.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Full Name */}
              <div className="md:col-span-2">
                <label className={`${labelStyle} text-indigo-600 font-black`}>Full Name (As per Aadhaar)</label>
                <input
                  type="text"
                  name="personName"
                  placeholder="Enter full name..."
                  value={loanForm.personName}
                  onChange={handleChange}
                  readOnly
                  className={`${inputStyle} bg-indigo-50/10 border-indigo-50 text-indigo-500 cursor-not-allowed ${errors.personName ? "border-rose-400" : ""}`}
                />
                {errors.personName && (
                  <p className="text-rose-500 text-[10px] font-bold uppercase tracking-widest mt-2 ml-1">{errors.personName}</p>
                )}
              </div>

              {/* Member CIBIL */}
              <div>
                <label className={labelStyle}>CIBIL Score</label>
                <input
                  type="text"
                  placeholder="e.g. 750"
                  value={loanForm.memberCibil}
                  onChange={(e) =>
                    /^\d{0,3}$/.test(e.target.value) &&
                    setLoanForm(p => ({ ...p, memberCibil: e.target.value }))
                  }
                  className={`${inputStyle} ${errors.memberCibil ? "border-rose-400" : ""}`}
                />
                {errors.memberCibil && (
                  <p className="text-rose-500 text-[10px] font-bold uppercase tracking-widest mt-2 ml-1">{errors.memberCibil}</p>
                )}
              </div>

              {/* RG Number */}
              <div>
                <label className={labelStyle}>RG Number (First Cycle)</label>
                <input
                  type="text"
                  name="firstCycleRgNumber"
                  placeholder="e.g. RG-9988"
                  value={loanForm.firstCycleRgNumber}
                  onChange={handleChange}
                  className={inputStyle}
                />
              </div>

              {/* DOB */}
              <div>
                <label className={labelStyle}>Date of Birth</label>
                <input
                  type="date"
                  name="dateofbirth"
                  value={loanForm.dateofbirth}
                  onChange={handleChange}
                  className={`${inputStyle} ${errors.dateofbirth ? "border-rose-400" : ""}`}
                />
                {errors.dateofbirth && (
                  <p className="text-rose-500 text-[10px] font-bold uppercase tracking-widest mt-2 ml-1">{errors.dateofbirth}</p>
                )}
              </div>

              {/* Gender */}
              <div>
                <label className={labelStyle}>Gender</label>
                <select
                  name="gender"
                  value={loanForm.gender}
                  onChange={handleChange}
                  className={`${inputStyle} ${errors.gender ? "border-rose-400" : ""}`}
                >
                  <option value="">Select Gender</option>
                  <option value="Female">Female</option>
                </select>
                {errors.gender && (
                  <p className="text-rose-500 text-[10px] font-bold uppercase tracking-widest mt-2 ml-1">{errors.gender}</p>
                )}
              </div>

              {/* Religion */}
              <div>
                <label className={labelStyle}>Religion</label>
                <select
                  name="religion"
                  value={loanForm.religion}
                  onChange={handleChange}
                  className={`${inputStyle} ${errors.religion ? "border-rose-400" : ""}`}
                >
                  <option value="">Select Religion</option>
                  <option value="Hindu">Hindu</option>
                  <option value="Muslim">Muslim</option>
                  <option value="Christian">Christian</option>
                  <option value="Other">Other</option>
                </select>
                {errors.religion && (
                  <p className="text-rose-500 text-[10px] font-bold uppercase tracking-widest mt-2 ml-1">{errors.religion}</p>
                )}
              </div>

              {/* Marital Status */}
              <div>
                <label className={labelStyle}>Marital Status</label>
                <select
                  name="maritalStatus"
                  value={loanForm.maritalStatus}
                  onChange={handleChange}
                  className={`${inputStyle} ${errors.maritalStatus ? "border-rose-400" : ""}`}
                >
                  <option value="">Select Status</option>
                  <option value="Married">Married</option>
                  <option value="Divorced">Divorced</option>
                  <option value="Widowed">Widowed</option>
                </select>
                {errors.maritalStatus && (
                  <p className="text-rose-500 text-[10px] font-bold uppercase tracking-widest mt-2 ml-1">{errors.maritalStatus}</p>
                )}
              </div>

              {/* Aadhaar */}
              <div>
                <label className={labelStyle}>Aadhaar Number</label>
                <input
                  type="text"
                  placeholder="0000 0000 0000"
                  value={
                    loanForm.aadharNo
                      ? loanForm.aadharNo.replace(/(\d{4})(?=\d)/g, "$1 ")
                      : ""
                  }
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\s/g, "");
                    if (/^\d{0,12}$/.test(raw)) {
                      setLoanForm(p => ({ ...p, aadharNo: raw }));
                    }
                  }}
                  className={`${inputStyle} ${errors.aadharNo ? "border-rose-400" : ""}`}
                />
                {errors.aadharNo && (
                  <p className="text-rose-500 text-[10px] font-bold uppercase tracking-widest mt-2 ml-1">{errors.aadharNo}</p>
                )}
              </div>

              {/* Work */}
              <div>
                <label className={labelStyle}>Work / Business</label>
                <input
                  type="text"
                  name="memberwork"
                  placeholder="e.g. Tailoring"
                  value={loanForm.memberwork}
                  onChange={handleChange}
                  className={`${inputStyle} ${errors.memberwork ? "border-rose-400" : ""}`}
                />
                {errors.memberwork && (
                  <p className="text-rose-500 text-[10px] font-bold uppercase tracking-widest mt-2 ml-1">{errors.memberwork}</p>
                )}
              </div>

              {/* Annual Income */}
              <div className="md:col-span-2">
                <label className={labelStyle}>Annual Income</label>
                <input
                  type="number"
                  name="annualIncome"
                  placeholder="e.g. 50000"
                  value={loanForm.annualIncome}
                  onChange={(e) =>
                    setLoanForm(p => ({ ...p, annualIncome: e.target.value }))
                  }
                  className={`${inputStyle} ${errors.annualIncome ? "border-rose-400" : ""}`}
                />
                {errors.annualIncome && (
                  <p className="text-rose-500 text-[10px] font-bold uppercase tracking-widest mt-2 ml-1">{errors.annualIncome}</p>
                )}
              </div>
            </div>
          </div>
        )}



        {/* STEP 2: Nominee Info */}
        {currentStep === 2 && (
          <div className="space-y-8 animate-fade-in relative z-10">
            <div className="flex flex-col gap-1">
              <h3 className="text-2xl font-black text-gray-900 tracking-tight">Nominee Details</h3>
              <p className="text-gray-400 text-sm font-medium">Specify the person who will be the nominee for this loan account.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Nominee Name */}
              <div className="md:col-span-2">
                <label className={labelStyle}>Nominee Name</label>
                <input
                  type="text"
                  name="nomineeName"
                  placeholder="Enter nominee name..."
                  value={loanForm.nomineeName}
                  onChange={handleChange}
                  className={`${inputStyle} ${errors.nomineeName ? "border-rose-400" : ""}`}
                />
                {errors.nomineeName && (
                  <p className="text-rose-500 text-[10px] font-bold uppercase tracking-widest mt-2 ml-1">{errors.nomineeName}</p>
                )}
              </div>

              {/* Nominee DOB */}
              <div>
                <label className={labelStyle}>Nominee DOB</label>
                <div className="relative">
                  <input
                    type="date"
                    name="nomineeDob"
                    value={loanForm.nomineeDob}
                    onChange={handleChange}
                    max={new Date().toISOString().split("T")[0]}
                    className={`${inputStyle} ${nomineeAgeValid === false ? "border-rose-400" : nomineeAgeValid === true ? "border-emerald-400" : ""}`}
                  />
                  {loanForm.nomineeDob && (
                    <div className={`mt-2 p-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${nomineeAgeValid ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}>
                      <span>Age: {nomineeAge} years</span>
                      {nomineeAgeValid === false && <span>(Must be 18+)</span>}
                    </div>
                  )}
                </div>
              </div>

              {/* Nominee Gender */}
              <div>
                <label className={labelStyle}>Nominee Gender</label>
                <select
                  name="nomineeGender"
                  value={loanForm.nomineeGender}
                  onChange={handleChange}
                  className={`${inputStyle} ${errors.nomineeGender ? "border-rose-400" : ""}`}
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
                {errors.nomineeGender && (
                  <p className="text-rose-500 text-[10px] font-bold uppercase tracking-widest mt-2 ml-1">{errors.nomineeGender}</p>
                )}
              </div>

              {/* Nominee Religion */}
              <div>
                <label className={labelStyle}>Nominee Religion</label>
                <select
                  name="nomineeReligion"
                  value={loanForm.nomineeReligion}
                  onChange={handleChange}
                  className={`${inputStyle} ${errors.nomineeReligion ? "border-rose-400" : ""}`}
                >
                  <option value="">Select Religion</option>
                  <option value="Hindu">Hindu</option>
                  <option value="Muslim">Muslim</option>
                  <option value="Christian">Christian</option>
                  <option value="Other">Other</option>
                </select>
                {errors.nomineeReligion && (
                  <p className="text-rose-500 text-[10px] font-bold uppercase tracking-widest mt-2 ml-1">{errors.nomineeReligion}</p>
                )}
              </div>

              {/* Nominee Marital Status */}
              <div>
                <label className={labelStyle}>Nominee Marital Status</label>
                <select
                  name="nomineeMaritalStatus"
                  value={loanForm.nomineeMaritalStatus}
                  onChange={handleChange}
                  className={`${inputStyle} ${errors.nomineeMaritalStatus ? "border-rose-400" : ""}`}
                >
                  <option value="">Select Status</option>
                  <option value="Married">Married</option>
                  <option value="Unmarried">Unmarried</option>
                  <option value="Divorced">Divorced</option>
                  <option value="Widowed">Widowed</option>
                </select>
                {errors.nomineeMaritalStatus && (
                   <p className="text-rose-500 text-[10px] font-bold uppercase tracking-widest mt-2 ml-1">{errors.nomineeMaritalStatus}</p>
                )}
              </div>

              {/* Nominee Relationship */}
              <div>
                <label className={labelStyle}>Relationship</label>
                <select
                  name="nomineeRelationship"
                  value={loanForm.nomineeRelationship}
                  onChange={handleChange}
                  className={`${inputStyle} ${errors.nomineeRelationship ? "border-rose-400" : ""}`}
                >
                  <option value="">Select Relationship</option>
                  <option value="Spouse">Spouse</option>
                  <option value="Son">Son</option>
                  <option value="Daughter">Daughter</option>
                </select>
                {errors.nomineeRelationship && (
                  <p className="text-rose-500 text-[10px] font-bold uppercase tracking-widest mt-2 ml-1">{errors.nomineeRelationship}</p>
                )}
              </div>

              {/* Nominee Business */}
              <div className="md:col-span-2">
                <label className={labelStyle}>Nominee Work / Business</label>
                <input
                  type="text"
                  name="nomineeBusiness"
                  placeholder="e.g. Agriculture"
                  value={loanForm.nomineeBusiness}
                  onChange={handleChange}
                  className={`${inputStyle} ${errors.nomineeBusiness ? "border-rose-400" : ""}`}
                />
                {errors.nomineeBusiness && (
                  <p className="text-rose-500 text-[10px] font-bold uppercase tracking-widest mt-2 ml-1">{errors.nomineeBusiness}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Contact Info */}
        {currentStep === 3 && (
          <div className="space-y-8 animate-fade-in relative z-10">
            <div className="flex flex-col gap-1">
              <h3 className="text-2xl font-black text-gray-900 tracking-tight">Contact Information</h3>
              <p className="text-gray-400 text-sm font-medium">Provide communication details for both the member and nominee.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Member Mobile */}
              <div>
                <label className={labelStyle}>Member Mobile Number</label>
                <input
                  type="text"
                  placeholder="10-digit mobile"
                  value={loanForm.mobileNo}
                  onChange={(e) => /^\d{0,10}$/.test(e.target.value) && setLoanForm(prev => ({ ...prev, mobileNo: e.target.value }))}
                  className={`${inputStyle} ${errors.mobileNo ? "border-rose-400" : ""}`}
                />
                {errors.mobileNo && (
                   <p className="text-rose-500 text-[10px] font-bold uppercase tracking-widest mt-2 ml-1">{errors.mobileNo}</p>
                )}
              </div>

              {/* Nominee Mobile */}
              <div>
                <label className={labelStyle}>Nominee Mobile Number</label>
                <input
                  type="text"
                  placeholder="10-digit mobile"
                  value={loanForm.nomineeMobile}
                  onChange={(e) => /^\d{0,10}$/.test(e.target.value) && setLoanForm(prev => ({ ...prev, nomineeMobile: e.target.value }))}
                  className={`${inputStyle} ${errors.nomineeMobile ? "border-rose-400" : ""}`}
                />
                {errors.nomineeMobile && (
                   <p className="text-rose-500 text-[10px] font-bold uppercase tracking-widest mt-2 ml-1">{errors.nomineeMobile}</p>
                )}
              </div>

              {/* Email */}
              <div className="md:col-span-2">
                <label className={labelStyle}>Email Address (Optional)</label>
                <input
                  type="email"
                  name="memberEmail"
                  placeholder="email@example.com"
                  value={loanForm.memberEmail}
                  onChange={handleChange}
                  className={inputStyle}
                />
              </div>

              {/* Address */}
              <div className="md:col-span-2">
                <label className={labelStyle}>Full Residential Address</label>
                <textarea
                  name="address"
                  placeholder="Enter full address details..."
                  value={loanForm.address}
                  onChange={handleChange}
                  className={`${inputStyle} h-32 resize-none`}
                />
                {errors.address && (
                   <p className="text-rose-500 text-[10px] font-bold uppercase tracking-widest mt-2 ml-1">{errors.address}</p>
                )}
              </div>

              {/* Pincode */}
              <div>
                <label className={labelStyle}>Pincode</label>
                <input
                  type="text"
                  placeholder="6-digit pincode"
                  value={loanForm.pincode}
                  onChange={(e) => /^\d{0,6}$/.test(e.target.value) && setLoanForm(prev => ({ ...prev, pincode: e.target.value }))}
                  className={`${inputStyle} ${errors.pincode ? "border-rose-400" : ""}`}
                />
                {errors.pincode && (
                   <p className="text-rose-500 text-[10px] font-bold uppercase tracking-widest mt-2 ml-1">{errors.pincode}</p>
                )}
              </div>
            </div>
          </div>
        )}




        {/* STEP 4: Upload Files */}
        {currentStep === 4 && (
          <div className="space-y-8 animate-fade-in relative z-10">
            <div className="flex flex-col gap-1">
              <h3 className="text-2xl font-black text-gray-900 tracking-tight">Capture Documents</h3>
              <p className="text-gray-400 text-sm font-medium">Use your camera to capture clear images of the required documents.</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
              {[
                ["memberAadhaarFront", "Member Aadhar Front", "M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"],
                ["memberAadhaarBack", "Member Aadhar Back", "M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"],
                ["nomineeAadhaarFront", "Nominee Aadhar Front", "M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"],
                ["nomineeAadhaarBack", "Nominee Aadhar Back", "M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"],
                ["panCard", "PAN Card", "M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"],
                ["formImage", "Field App Form", "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"],
                ["signature", "Member Signature", "M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"],
                ["passbookImage", "Member Passbook", "M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"],
                ["memberPhoto", "Member Photo", "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"],
              ].map(([field, label, iconPath]) => (
                <div key={field} className="relative group">
                   <label className={`flex flex-col items-center justify-center p-3 md:p-4 rounded-3xl border-2 border-dashed transition-all cursor-pointer min-h-[8rem] h-auto text-center py-6
                     ${loanForm[field] ? "bg-emerald-50 border-emerald-200 text-emerald-600 shadow-inner" : "bg-gray-50 border-gray-100 text-gray-400 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-500"}
                     ${errors[field] ? "border-rose-300 bg-rose-50" : ""}
                   `}>
                      <input type="file" name={field} accept="image/*" capture="environment" onChange={handleFileChange} className="hidden" />
                      
                      {loanForm[field] ? (
                        <>
                          <div className="w-8 h-8 md:w-9 md:h-9 bg-emerald-500 text-white rounded-full flex items-center justify-center mb-2 shadow-lg shadow-emerald-200">
                             <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" /></svg>
                          </div>
                          <span className="text-[8px] md:text-[9px] font-black uppercase tracking-widest leading-tight block px-1">{label}</span>
                          <span className="text-[7px] md:text-[8px] mt-1.5 opacity-50 font-bold">RE-CAPTURE</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-6 h-6 md:w-7 md:h-7 mb-2.5 opacity-40 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d={iconPath} /></svg>
                          <span className="text-[8px] md:text-[9px] font-black uppercase tracking-widest leading-tight block px-1">{label}</span>
                        </>
                      )}
                   </label>
                   {errors[field] && (
                      <div className="absolute top-3 right-3 w-2.5 h-2.5 bg-rose-500 rounded-full shadow-lg shadow-rose-200 animate-pulse border-2 border-white" />
                   )}
                </div>
              ))}
            </div>

            {Object.keys(errors).length > 0 && currentStep === 4 && (
              <p className="text-rose-500 text-center text-[10px] font-black uppercase tracking-[0.2em] bg-rose-50 py-3 rounded-2xl border border-rose-100">
                Please upload all required 9 documents to proceed.
              </p>
            )}
          </div>
        )}

        {/* CROP MODAL */}
        {showCrop && selectedFile && (
          <ImageCrop
            file={selectedFile}
            onCropComplete={handleCroppedImage}
            onCancel={() => {
              setShowCrop(false);
              setSelectedFile(null);
              setSelectedField("");
            }}
          />
        )}


        {popupSuccess && (
          <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-md flex items-center justify-center z-[100] p-6">
            <div className="bg-white rounded-[3rem] p-10 max-w-sm w-full text-center shadow-2xl relative overflow-hidden border border-gray-100 animate-[scaleIn_0.5s_ease-out]">
                <div className="w-24 h-24 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-200">
                   <svg className="w-12 h-12 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" /></svg>
                </div>
                <h3 className="text-3xl font-black text-gray-900 tracking-tight leading-tight mb-2">Application Successful!</h3>
                <p className="text-gray-500 font-medium mb-8">The loan application has been submitted for approval.</p>
                <div className="bg-emerald-50 text-emerald-600 font-black text-[10px] uppercase tracking-[0.2em] py-3 rounded-2xl mb-2">Redirecting in 15 seconds...</div>
            </div>
          </div>
        )}

        {showPopup && popupLoading && (
          <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-[100] p-6">
            <div className="bg-white rounded-[2.5rem] p-10 text-center shadow-2xl flex flex-col items-center gap-6">
               <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
               <div className="flex flex-col gap-1">
                  <span className="text-xl font-black text-gray-900 tracking-tight">Syncing Data</span>
                  <p className="text-gray-400 text-xs font-medium uppercase tracking-widest">Encrypting and uploading assets...</p>
               </div>
            </div>
          </div>
        )}

        {popupError && (
          <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-rose-600 text-white px-8 py-4 rounded-2xl shadow-2xl shadow-rose-200 z-[100] flex items-center gap-3 animate-bounce">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span className="font-black text-xs uppercase tracking-widest">Submission Failed!</span>
          </div>
        )}

        </div> {/* End of White Content Box */}

        {/* Navigation Buttons */}
        <div className="flex justify-between gap-4 mt-2">
          {currentStep > 1 && (
            <button 
              onClick={prevStep} 
              className="flex-1 py-5 bg-white text-gray-400 font-black text-xs uppercase tracking-[0.3em] rounded-[2rem] shadow-sm border border-gray-100 hover:bg-gray-50 transition-all hover:text-gray-600"
            >
              Previous Step
            </button>
          )}
          
          <button
            onClick={currentStep < 4 ? nextStep : handleSubmit}
            className={`flex-[2] py-5 rounded-[2rem] font-black text-xs uppercase tracking-[0.3em] transition-all shadow-xl active:scale-95 flex items-center justify-center gap-3
              ${currentStep < 4 ? "bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-100" : "bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-100"}
            `}
          >
            {currentStep < 4 ? (
              <>
                Next Module
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
              </>
            ) : (
              <>
                Final Submission
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
