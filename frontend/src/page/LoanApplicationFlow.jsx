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





  const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:5005";

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
        alert(`Loan Submitted ✔ ID: ${res.data.loanId}`);
      }, 15000);
    } catch (err) {
      console.error("Loan submit error:", err?.response?.data || err.message);

      setPopupLoading(false);
      setPopupError(true);

      setTimeout(() => {
        setPopupError(false);
        setShowPopup(false);
      }, 2000);
    }

  };

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center p-6">
      <div className="w-full max-w-3xl bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-2xl font-bold text-center text-indigo-600 mb-4">
          Loan Application
        </h2>

        <p className="text-center mb-6 text-sm md:text-base">
          <b>Center:</b> {center.name} <span className="mx-2 text-gray-300">|</span> 
          <b>Member:</b> {member.name} 
          {member.member_no && <span className="text-indigo-600 font-bold ml-1">({member.member_no})</span>} 
          <span className="mx-2 text-gray-300">|</span> 
          <b>Staff:</b> {user.name}
        </p>

        {/* STEP 1: Member Info */}
        {currentStep === 1 && (
          <div className="space-y-4">

            {/* Member CIBIL */}
            <div>
              <input
                type="text"
                placeholder="Member CIBIL (3 digits)"
                value={loanForm.memberCibil}
                onChange={(e) =>
                  /^\d{0,3}$/.test(e.target.value) &&
                  setLoanForm(p => ({ ...p, memberCibil: e.target.value }))
                }
                className={`w-full p-3 border rounded-lg 
          ${errors.memberCibil ? "border-red-500" : "border-gray-300"}`}
              />
              {errors.memberCibil && (
                <p className="text-red-500 text-sm">{errors.memberCibil}</p>
              )}
            </div>

            {/* First Cycle RG Number */}
            <div>
              <input
                type="text"
                name="firstCycleRgNumber"
                placeholder="First Cycle RG Number"
                value={loanForm.firstCycleRgNumber}
                onChange={handleChange}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 transition"
              />
            </div>

            {/* Full Name */}
            <div>
              <input
                type="text"
                name="personName"
                placeholder="Full Name"
                value={loanForm.personName}
                onChange={handleChange}
                className={`w-full p-3 border rounded-lg 
          ${errors.personName ? "border-red-500" : "border-gray-300"}`}
              />
              {errors.personName && (
                <p className="text-red-500 text-sm">{errors.personName}</p>
              )}
            </div>

            {/* Date of Birth */}
            <div className="relative">
              {!loanForm.dateofbirth && (
                <span className="absolute left-3 top-3 text-gray-400 pointer-events-none">
                  Date of Birth
                </span>
              )}

              <input
                type="date"
                name="dateofbirth"
                value={loanForm.dateofbirth}
                onChange={handleChange}
                className={`w-full p-3 border rounded-lg bg-transparent 
      ${errors.dateofbirth ? "border-red-500" : "border-gray-300"}`}
              />

              {errors.dateofbirth && (
                <p className="text-red-500 text-sm">{errors.dateofbirth}</p>
              )}
            </div>


            {/* Gender */}
            <div>
              <select
                name="gender"
                value={loanForm.gender}
                onChange={handleChange}
                className={`w-full p-3 border rounded-lg 
          ${errors.gender ? "border-red-500" : "border-gray-300"}`}
              >
                <option value="">Select Gender</option>
                <option value="Female">Female</option>

              </select>
              {errors.gender && (
                <p className="text-red-500 text-sm">{errors.gender}</p>
              )}
            </div>

            {/* Religion */}
            <div>
              <select
                name="religion"
                value={loanForm.religion}
                onChange={handleChange}
                className={`w-full p-3 border rounded-lg 
          ${errors.religion ? "border-red-500" : "border-gray-300"}`}
              >
                <option value="">Select Religion</option>
                <option value="Hindu">Hindu</option>
                <option value="Muslim">Muslim</option>
                <option value="Christian">Christian</option>
                <option value="Other">Other</option>
              </select>
              {errors.religion && (
                <p className="text-red-500 text-sm">{errors.religion}</p>
              )}
            </div>

            {/* Marital Status */}
            <div>
              <select
                name="maritalStatus"
                value={loanForm.maritalStatus}
                onChange={handleChange}
                className={`w-full p-3 border rounded-lg 
          ${errors.maritalStatus ? "border-red-500" : "border-gray-300"}`}
              >
                <option value="">Select Marital Status</option>
                <option value="Married">Married</option>
                <option value="Divorced">Divorced</option>
                <option value="Widowed">Widowed</option>
              </select>
              {errors.maritalStatus && (
                <p className="text-red-500 text-sm">{errors.maritalStatus}</p>
              )}
            </div>

            {/* Aadhaar */}
            <div>
              <input
                type="text"
                placeholder="Aadhaar XXXX XXXX XXXX"
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
                className={`w-full p-3 border rounded-lg 
          ${errors.aadharNo ? "border-red-500" : "border-gray-300"}`}
              />
              {errors.aadharNo && (
                <p className="text-red-500 text-sm">{errors.aadharNo}</p>
              )}
            </div>

            {/* Work */}
            <div>
              <input
                type="text"
                name="memberwork"
                placeholder="Work / Business"
                value={loanForm.memberwork}
                onChange={handleChange}
                className={`w-full p-3 border rounded-lg 
          ${errors.memberwork ? "border-red-500" : "border-gray-300"}`}
              />
              {errors.memberwork && (
                <p className="text-red-500 text-sm">{errors.memberwork}</p>
              )}
            </div>

            {/* Annual Income */}
            <div>
              <input
                type="number"
                name="annualIncome"
                placeholder="Annual Income"
                value={loanForm.annualIncome}
                onChange={(e) =>
                  setLoanForm(p => ({ ...p, annualIncome: e.target.value }))
                }
                className={`w-full p-3 border rounded-lg 
          ${errors.annualIncome ? "border-red-500" : "border-gray-300"}`}
              />
              {errors.annualIncome && (
                <p className="text-red-500 text-sm">{errors.annualIncome}</p>
              )}
            </div>

          </div>
        )}


        {/* STEP 2: Nominee Info */}

        {currentStep === 2 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Nominee Information</h3>

            {/* Nominee Name */}
            <div>
              <input
                type="text"
                name="nomineeName"
                placeholder="Nominee Name"
                value={loanForm.nomineeName}
                onChange={handleChange}
                className={`w-full p-3 border rounded-lg ${errors.nomineeName ? "border-red-500" : "border-gray-300"
                  }`}
              />
              {errors.nomineeName && (
                <p className="text-red-500 text-sm">{errors.nomineeName}</p>
              )}
            </div>

            {/* Nominee DOB */}
            <div className="relative">
              {!loanForm.nomineeDob && (
                <span className="absolute left-3 top-3 text-gray-400 pointer-events-none">
                  Nominee Date of Birth
                </span>
              )}

              <input
                type="date"
                name="nomineeDob"
                value={loanForm.nomineeDob}
                onChange={handleChange}
                max={new Date().toISOString().split("T")[0]}
                className={`w-full p-3 border rounded-lg bg-transparent
                ${nomineeAgeValid === false
                    ? "border-red-500"
                    : nomineeAgeValid === true
                      ? "border-green-500"
                      : "border-gray-300"
                  }`}
              />

              {loanForm.nomineeDob && (
                <p
                  className={`mt-1 text-sm ${nomineeAgeValid ? "text-green-600" : "text-red-500"
                    }`}
                >
                  Nominee Age:{" "}
                  <span className="font-semibold">{nomineeAge}</span> years
                  {nomineeAgeValid === false && " (Must be 18+)"}
                </p>
              )}
            </div>


            {/* Nominee Gender */}
            <select
              name="nomineeGender"
              value={loanForm.nomineeGender}
              onChange={handleChange}
              className={`w-full p-3 border rounded-lg ${errors.nomineeGender ? "border-red-500" : "border-gray-300"
                }`}
            >
              <option value="">Select Gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
            {errors.nomineeGender && (
              <p className="text-red-500 text-sm">{errors.nomineeGender}</p>
            )}

            {/* Nominee Religion */}
            <select
              name="nomineeReligion"
              value={loanForm.nomineeReligion}
              onChange={handleChange}
              className={`w-full p-3 border rounded-lg ${errors.nomineeReligion ? "border-red-500" : "border-gray-300"
                }`}
            >
              <option value="">Select Religion</option>
              <option value="Hindu">Hindu</option>
              <option value="Muslim">Muslim</option>
              <option value="Christian">Christian</option>
              <option value="Other">Other</option>
            </select>
            {errors.nomineeReligion && (
              <p className="text-red-500 text-sm">{errors.nomineeReligion}</p>
            )}

            {/* Nominee Marital Status */}
            <select
              name="nomineeMaritalStatus"
              value={loanForm.nomineeMaritalStatus}
              onChange={handleChange}
              className={`w-full p-3 border rounded-lg ${errors.nomineeMaritalStatus ? "border-red-500" : "border-gray-300"
                }`}
            >
              <option value="">Select Marital Status</option>
              <option value="Single">Single</option>
              <option value="Married">Married</option>
              <option value="Divorced">Divorced</option>
              <option value="Widowed">Widowed</option>
            </select>
            {errors.nomineeMaritalStatus && (
              <p className="text-red-500 text-sm">{errors.nomineeMaritalStatus}</p>
            )}

            {/* Nominee Relationship */}
            <select
              name="nomineeRelationship"
              value={loanForm.nomineeRelationship}
              onChange={handleChange}
              className={`w-full p-3 border rounded-lg ${errors.nomineeRelationship ? "border-red-500" : "border-gray-300"
                }`}
            >
              <option value="">Select Relationship</option>
              <option value="Spouse">Spouse</option>
              <option value="Son">Son</option>
              <option value="Daughter">Daughter</option>

            </select>
            {errors.nomineeRelationship && (
              <p className="text-red-500 text-sm">{errors.nomineeRelationship}</p>
            )}

            {/* Nominee Business */}
            <input
              type="text"
              name="nomineeBusiness"
              placeholder="Nominee Business / Work"
              value={loanForm.nomineeBusiness}
              onChange={handleChange}
              className={`w-full p-3 border rounded-lg ${errors.nomineeBusiness ? "border-red-500" : "border-gray-300"
                }`}
            />
            {errors.nomineeBusiness && (
              <p className="text-red-500 text-sm">{errors.nomineeBusiness}</p>
            )}
          </div>
        )}


        {/* STEP 3: Contact Info */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Contact Information</h3>

            {["mobileNo", "nomineeMobile", "memberEmail", "address", "pincode"].map(
              (field) => (
                <div key={field}>
                  <input
                    type={field.includes("Email") ? "email" : "text"}
                    name={field}
                    placeholder={field
                      .replace(/([A-Z])/g, " $1")
                      .replace(/^./, (str) => str.toUpperCase())}
                    value={loanForm[field]}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (field === "mobileNo" || field === "nomineeMobile") {
                        if (/^\d{0,10}$/.test(val))
                          setLoanForm((prev) => ({ ...prev, [field]: val }));
                      } else if (field === "pincode") {
                        if (/^\d{0,6}$/.test(val))
                          setLoanForm((prev) => ({ ...prev, [field]: val }));
                      } else {
                        setLoanForm((prev) => ({ ...prev, [field]: val }));
                      }
                    }}
                    className={`w-full p-3 border rounded-lg ${errors[field] ? "border-red-500" : "border-gray-300"
                      }`}
                  />
                  {errors[field] && field !== "memberEmail" && (
                    <p className="text-red-500 text-sm">{errors[field]}</p>
                  )}
                </div>
              )
            )}
          </div>
        )}



        {/* STEP 4: Upload Files */}
        {currentStep === 4 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Upload Documents</h3>

            {[
              ["memberAadhaarFront", "Member Aadhaar Front"],
              ["memberAadhaarBack", "Member Aadhaar Back"],
              ["nomineeAadhaarFront", "Nominee Aadhaar Front"],
              ["nomineeAadhaarBack", "Nominee Aadhaar Back"],
              ["panCard", "PAN Card"],
              ["formImage", "Form Image"],
              ["signature", "Signature"],
              ["passbookImage", "Passbook Image"],
              ["memberPhoto", "Member Photo"],
            ].map(([field, label]) => (
              <div key={field} className="space-y-1">
                <label className="block font-medium">{label}</label>

                <input
                  type="file"
                  name={field}
                  accept="image/*"
                  capture="environment" // ✅ this makes camera open directly
                  onChange={handleFileChange}
                  className={`w-full p-2 border rounded-lg ${errors[field] ? "border-red-500" : "border-gray-300"
                    }`}
                />

                {loanForm[field] && (
                  <p className="text-green-600 text-sm font-semibold">Uploaded ✔</p>
                )}

                {errors[field] && (
                  <p className="text-red-500 text-sm">{errors[field]}</p>
                )}
              </div>
            ))}


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
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className={`bg-white rounded-2xl p-8 w-80 text-center relative overflow-hidden
                    animate-[scaleIn_0.4s_ease-out]`}>
              
              {/* Simple CSS Confetti Implementation */}
              {[...Array(20)].map((_, i) => (
                <div
                  key={i}
                  className="confetti"
                  style={{
                    left: `${Math.random() * 100}%`,
                    backgroundColor: ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'][Math.floor(Math.random() * 6)],
                    animation: `fall ${2 + Math.random() * 3}s linear infinite, sideSway ${1 + Math.random() * 2}s ease-in-out infinite`,
                    animationDelay: `${Math.random() * 2}s`,
                    borderRadius: Math.random() > 0.5 ? '50%' : '0%'
                  }}
                />
              ))}

              {/* Tick animation */}
              <div className="mx-auto w-16 h-16 flex items-center justify-center
                      rounded-full bg-green-500 text-white text-4xl
                      animate-bounce">
                ✓
              </div>

              <h2 className="text-xl font-bold text-green-600 mt-4">
                Loan Submitted Successfully!
              </h2>

              <button
                onClick={() => setPopupSuccess(false)}
                className="mt-6 w-full bg-indigo-600 text-white py-2 rounded-xl
                   hover:bg-indigo-700 transition">
                OK
              </button>
            </div>
          </div>
        )}

        {showPopup && popupLoading && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-64 text-center animate-pulse">
              <div className="mx-auto w-10 h-10 border-4 border-indigo-600
                      border-t-transparent rounded-full animate-spin" />
              <p className="mt-4 font-semibold text-gray-700">
                Submitting Loan...
              </p>
            </div>
          </div>
        )}


        {popupError && (
          <div className="fixed bottom-5 right-5 bg-red-600 text-white px-6 py-3
                  rounded-xl shadow-lg animate-shake z-50">
            ❌ Loan submit failed
          </div>
        )}



        {/* Navigation Buttons */}
        <div className="flex justify-between mt-6">
          {currentStep > 1 ? (
            <button onClick={prevStep} className="bg-gray-300 px-4 py-2 rounded">
              Previous
            </button>
          ) : (
            <div />
          )}
          {currentStep < 4 ? (
            <button
              onClick={nextStep}
              className="bg-indigo-600 text-white px-4 py-2 rounded"
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={popupLoading}
              className={`px-4 py-2 rounded text-white
              ${popupLoading ? "bg-gray-400" : "bg-green-600 hover:bg-green-700"}`}
            >
              {popupLoading ? "Submitting..." : "Submit Loan"}
            </button>


          )}
        </div>
      </div>
    </div>
  );
}
