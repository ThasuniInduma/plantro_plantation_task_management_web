import { useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import Home from './pages/home'
import Login from './pages/login/login'
import Workerprofile from './pages/worker/workerprofile'
import WorkerDashboard from './pages/worker/workerDashboard'
import SupervisorDashboard from './pages/supervisor/supervisorDashboard'
import SupervisorProfile from './pages/supervisor/supervisorProfile'
import AdminDashboard from './pages/admin/adminDashboard'
import AdminProfile from './pages/admin/adminProfile'
import CropManagement from './pages/crop/cropManagement'
import FieldManagement from './pages/field/fieldManagement'
import ReportManagement from './pages/report/reportManagement'
import EmailVerify from './pages/login/EmailVerify'
import ResetPassword from './pages/login/ResetPassword'
import WorkforceManagement from './pages/workforce/workforceManagement'
import Attendance from './pages/supervisor/attendance/Attendance'
import Tasks from './pages/supervisor/tasks/Tasks'


function App() {
  return (
    <>
      <div className='app'>
      <Routes>
        <Route path='/' element={<Home />} />
        <Route path='/login' element={<Login/>} />
        <Route path='/worker' element={<WorkerDashboard/>} />
        <Route path='/worker-profile' element={<Workerprofile/>} />
        <Route path='/supervisor' element={<SupervisorDashboard/>} />
        <Route path='/supervisor-profile' element={<SupervisorProfile/>} />
        <Route path='/admin' element={<AdminDashboard/>} />
        <Route path='/admin-profile' element={<AdminProfile/>} />
        <Route path='/crop' element={<CropManagement/>} />
        <Route path='/field' element={<FieldManagement/>} />
        <Route path='/report' element={<ReportManagement/>} />
        <Route path='/workforce' element={<WorkforceManagement/>} />
        <Route path="/email-verify" element={<EmailVerify />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path='/attendance' element={<Attendance/>} />
        <Route path='/tasks' element={<Tasks/>} />
      </Routes>
    </div>
    </>
  )
}

export default App
