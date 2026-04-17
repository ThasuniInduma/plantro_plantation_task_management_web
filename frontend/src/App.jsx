import { Routes, Route } from 'react-router-dom';
import DashboardLayout from './layouts/dashboardLayout';

// pages...
import Home from './pages/home';
import Login from './pages/login/login';
import EmailVerify from './pages/login/EmailVerify';
import ResetPassword from './pages/login/ResetPassword';

// Worker
import WorkerDashboard from './pages/worker/workerDashboard';
import WorkerProfile from './pages/worker/workerprofile';

// Supervisor
import SupervisorDashboard from './pages/supervisor/supervisorDashboard';
import SupervisorProfile from './pages/supervisor/supervisorProfile';
import Attendance from './pages/supervisor/attendance/Attendance';
import Tasks from './pages/supervisor/tasks/Tasks';
import SmartSchedule from './pages/supervisor/smartSchedule';

// Admin
import AdminDashboard from './pages/admin/adminDashboard';
import AdminProfile from './pages/admin/adminProfile';

// Shared
import CropManagement from './pages/crop/cropManagement';
import FieldManagement from './pages/field/fieldManagement';
import ReportManagement from './pages/report/reportManagement';
import WorkforceManagement from './pages/workforce/workforceManagement';
import WorkerSetup from './pages/worker/workerSetup';

function App() {
  return (
    <div className='app'>
      <Routes>

        {/* ── Public (NO SIDEBAR) ── */}
        <Route path='/' element={<Home />} />
        <Route path='/login' element={<Login />} />
        <Route path='/email-verify' element={<EmailVerify />} />
        <Route path='/reset-password' element={<ResetPassword />} />

        {/* ── Protected (WITH SIDEBAR) ── */}
        <Route path='/*' element={
          <DashboardLayout>
            <Routes>

              {/* Worker */}
              <Route path='worker' element={<WorkerDashboard />} />
              <Route path='worker/dashboard' element={<WorkerDashboard />} />
              <Route path='worker/setup' element={<WorkerSetup />} />
              <Route path='worker-profile' element={<WorkerProfile />} />
              

              {/* Supervisor */}
              <Route path='supervisor' element={<SupervisorDashboard />} />
              <Route path='supervisor-profile' element={<SupervisorProfile />} />
              <Route path='supervisor/smart-schedule' element={<SmartSchedule />} />
              <Route path='attendance' element={<Attendance />} />
              <Route path='tasks' element={<Tasks />} />

              {/* Admin */}
              <Route path='admin' element={<AdminDashboard />} />
              <Route path='owner-profile' element={<AdminProfile />} />

              {/* Shared */}
              <Route path='crop' element={<CropManagement />} />
              <Route path='field' element={<FieldManagement />} />
              <Route path='report' element={<ReportManagement />} />
              <Route path='workforce' element={<WorkforceManagement />} />

            </Routes>
          </DashboardLayout>
        } />

      </Routes>
    </div>
  );
}

export default App;