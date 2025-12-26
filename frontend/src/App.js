import React from 'react';
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "./context/AuthContext";

// Pages
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import DashboardLayout from "./pages/Dashboard/Layout";
import DashboardOverview from "./pages/Dashboard/Overview";
import Recruitment from "./pages/Dashboard/Recruitment";
import EmployeeData from "./pages/Dashboard/EmployeeData";
import Payroll from "./pages/Dashboard/Payroll";
import Performance from "./pages/Dashboard/Performance";
import Attendance from "./pages/Dashboard/Attendance";
import Announcements from "./pages/Dashboard/Announcements";

function App() {
  return (
    <AuthProvider>
      <div className="App">
        <Toaster position="top-right" richColors />
        <BrowserRouter>
          <Routes>
            {/* Auth Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            
            {/* Dashboard Routes */}
            <Route path="/dashboard" element={<DashboardLayout />}>
              <Route index element={<DashboardOverview />} />
              <Route path="recruitment" element={<Recruitment />} />
              <Route path="employee-data" element={<EmployeeData />} />
              <Route path="profile" element={<EmployeeData />} />
              <Route path="payroll" element={<Payroll />} />
              <Route path="performance" element={<Performance />} />
              <Route path="attendance" element={<Attendance />} />
              <Route path="announcements" element={<Announcements />} />
            </Route>
            
            {/* Default redirect */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </div>
    </AuthProvider>
  );
}

export default App;
