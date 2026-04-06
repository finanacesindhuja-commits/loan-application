import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import StaffLogin from './page/StaffLogin'
import Centers from './page/Centers'
import Members from './page/Members'
import LoanApplicationFlow from './page/LoanApplicationFlow'
import Query from './page/Query'
import Sidebar from './components/Sidebar'
import './index.css'

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<StaffLogin />} />
          
          <Route path="/centers" element={
            <ProtectedRoute>
              <Sidebar><Centers /></Sidebar>
            </ProtectedRoute>
          } />
          
          <Route path="/members" element={
            <ProtectedRoute>
              <Sidebar><Members /></Sidebar>
            </ProtectedRoute>
          } />
          
          <Route path="/loan-application" element={
            <ProtectedRoute>
              <Sidebar><LoanApplicationFlow /></Sidebar>
            </ProtectedRoute>
          } />

          <Route path="/query" element={
            <ProtectedRoute>
              <Sidebar><Query /></Sidebar>
            </ProtectedRoute>
          } />

          <Route path="/dashboard" element={<Navigate to="/centers" />} />
          <Route path="/" element={<Navigate to="/login" />} />
        </Routes>
      </Router>
    </AuthProvider>
  )
}

function ProtectedRoute({ children }) {
  const staffInfo = localStorage.getItem('staffInfo');
  if (!staffInfo) {
    return <Navigate to="/login" />;
  }

  try {
    const staff = JSON.parse(staffInfo);
    if (staff.role !== 'Relationship Officer') {
      localStorage.removeItem('staffInfo'); // Clear unauthorized session
      return <Navigate to="/login" />;
    }
  } catch (err) {
    localStorage.removeItem('staffInfo');
    return <Navigate to="/login" />;
  }
  
  return children;
}

export default App
