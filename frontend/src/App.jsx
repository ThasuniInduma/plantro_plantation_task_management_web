import { Routes, Route } from 'react-router-dom';
import DashboardLayout from './layouts/dashboardLayout';
import ProtectedRoute from './utils/protectedRoutes';

// Public pages
import Home from './pages/home';
import Login from './pages/login/login';
import EmailVerify from './pages/login/EmailVerify';
import ResetPassword from './pages/login/ResetPassword';

// Worker
import WorkerDashboard from './pages/worker/workerDashboard';
import WorkerProfile from './pages/worker/workerprofile';
import WorkerSetup from './pages/worker/workerSetup';

// Supervisor
import SupervisorDashboard from './pages/supervisor/supervisorDashboard';
import SupervisorProfile from './pages/supervisor/supervisorProfile';
import Attendance from './pages/supervisor/attendance/Attendance';
import Tasks from './pages/supervisor/tasks/Tasks';
import SmartSchedule from './pages/supervisor/smartSchedule';
import Incidents from './pages/Incidents/incidents';

// Admin
import AdminDashboard from './pages/admin/adminDashboard';
import AdminProfile from './pages/admin/adminProfile';

// Shared
import CropManagement from './pages/crop/cropManagement';
import FieldManagement from './pages/field/fieldManagement';
import ReportManagement from './pages/report/reportManagement';
import WorkforceManagement from './pages/workforce/workforceManagement';

function App() {
  return (
    <div className='app'>
      <Routes>

        {/* PUBLIC */}
        <Route path='/' element={<Home />} />
        <Route path='/login' element={<Login />} />
        <Route path='/email-verify' element={<EmailVerify />} />
        <Route path='/reset-password' element={<ResetPassword />} />

        {/* WORKER */}
        <Route path='/worker' element={
          <ProtectedRoute allowedRoles={["worker"]}>
            <DashboardLayout><WorkerDashboard /></DashboardLayout>
          </ProtectedRoute>
        } />

        <Route path='/worker/dashboard' element={
          <ProtectedRoute allowedRoles={["worker"]}>
            <DashboardLayout><WorkerDashboard /></DashboardLayout>
          </ProtectedRoute>
        } />

        <Route path='/worker/setup' element={
          <ProtectedRoute allowedRoles={["worker"]}>
            <WorkerSetup />
          </ProtectedRoute>
        } />

        <Route path='/worker-profile' element={
          <ProtectedRoute allowedRoles={["worker"]}>
            <DashboardLayout><WorkerProfile /></DashboardLayout>
          </ProtectedRoute>
        } />

        {/* SUPERVISOR */}
        <Route path='/supervisor' element={
          <ProtectedRoute allowedRoles={["supervisor"]}>
            <DashboardLayout><SupervisorDashboard /></DashboardLayout>
          </ProtectedRoute>
        } />

        <Route path='/supervisor/smart-schedule' element={
          <ProtectedRoute allowedRoles={["supervisor"]}>
            <DashboardLayout><SmartSchedule /></DashboardLayout>
          </ProtectedRoute>
        } />

        <Route path='/supervisor-profile' element={
          <ProtectedRoute allowedRoles={["supervisor"]}>
            <DashboardLayout><SupervisorProfile /></DashboardLayout>
          </ProtectedRoute>
        } />

        {/* ADMIN */}
        <Route path='/admin' element={
          <ProtectedRoute allowedRoles={["owner"]}>
            <DashboardLayout><AdminDashboard /></DashboardLayout>
          </ProtectedRoute>
        } />

        <Route path='/owner-profile' element={
          <ProtectedRoute allowedRoles={["owner"]}>
            <DashboardLayout><AdminProfile /></DashboardLayout>
          </ProtectedRoute>
        } />

        {/* SHARED (MULTI ROLE) */}
        <Route path='/attendance' element={
          <ProtectedRoute allowedRoles={["owner", "supervisor"]}>
            <DashboardLayout><Attendance /></DashboardLayout>
          </ProtectedRoute>
        } />

        <Route path='/tasks' element={
          <ProtectedRoute allowedRoles={["owner", "supervisor"]}>
            <DashboardLayout><Tasks /></DashboardLayout>
          </ProtectedRoute>
        } />

        <Route path='/incidents' element={
          <ProtectedRoute allowedRoles={["owner", "supervisor"]}>
            <DashboardLayout><Incidents /></DashboardLayout>
          </ProtectedRoute>
        } />

        <Route path='/crop' element={
          <ProtectedRoute allowedRoles={["owner", "supervisor", "worker"]}>
            <DashboardLayout><CropManagement /></DashboardLayout>
          </ProtectedRoute>
        } />

        <Route path='/field' element={
          <ProtectedRoute allowedRoles={["owner", "supervisor"]}>
            <DashboardLayout><FieldManagement /></DashboardLayout>
          </ProtectedRoute>
        } />

        <Route path='/report' element={
          <ProtectedRoute allowedRoles={["owner"]}>
            <DashboardLayout><ReportManagement /></DashboardLayout>
          </ProtectedRoute>
        } />

        <Route path='/workforce' element={
          <ProtectedRoute allowedRoles={["owner"]}>
            <DashboardLayout><WorkforceManagement /></DashboardLayout>
          </ProtectedRoute>
        } />

      </Routes>
    </div>
  );
}

export default App;