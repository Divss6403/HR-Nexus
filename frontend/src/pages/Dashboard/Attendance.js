import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../utils/translations';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Calendar } from '../../components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import { toast } from 'sonner';
import { 
  Clock, LogIn, LogOut as LogOutIcon, Calendar as CalendarIcon, 
  CheckCircle2, XCircle, Timer, Plus, FileText
} from 'lucide-react';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Attendance = () => {
  const { user, language } = useAuth();
  const { t } = useTranslation(language);
  const [records, setRecords] = useState([]);
  const [todayRecord, setTodayRecord] = useState(null);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [newLeave, setNewLeave] = useState({
    start_date: '',
    end_date: '',
    reason: '',
    leave_type: 'casual'
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [recordsRes, todayRes, leavesRes] = await Promise.all([
        axios.get(`${API_URL}/attendance/my-records`),
        axios.get(`${API_URL}/attendance/today`),
        axios.get(`${API_URL}/leave/my-requests`)
      ]);
      setRecords(recordsRes.data);
      setTodayRecord(todayRes.data);
      setLeaveRequests(leavesRes.data);
    } catch (error) {
      console.error('Error fetching attendance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async () => {
    setCheckingIn(true);
    try {
      await axios.post(`${API_URL}/attendance/check-in`);
      toast.success(t('checkInSuccess'));
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || t('errorOccurred'));
    } finally {
      setCheckingIn(false);
    }
  };

  const handleCheckOut = async () => {
    setCheckingOut(true);
    try {
      await axios.post(`${API_URL}/attendance/check-out`);
      toast.success(t('checkOutSuccess'));
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || t('errorOccurred'));
    } finally {
      setCheckingOut(false);
    }
  };

  const handleApplyLeave = async () => {
    try {
      await axios.post(`${API_URL}/leave/apply`, newLeave);
      toast.success(t('leaveApplied'));
      setLeaveDialogOpen(false);
      setNewLeave({ start_date: '', end_date: '', reason: '', leave_type: 'casual' });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || t('errorOccurred'));
    }
  };

  const formatTime = (isoString) => {
    if (!isoString) return '--:--';
    return new Date(isoString).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const getWorkingHours = (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return '--';
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const diff = (end - start) / (1000 * 60 * 60);
    return `${diff.toFixed(1)} hrs`;
  };

  const presentDays = records.filter(r => r.status === 'present').length;
  const absentDays = records.filter(r => r.status === 'absent').length;
  const leaveDays = records.filter(r => r.status === 'leave').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="attendance-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 font-['Manrope']">
            {t('attendance')}
          </h2>
          <p className="text-slate-500 mt-1">
            Track your daily attendance and manage leave requests
          </p>
        </div>
        <Dialog open={leaveDialogOpen} onOpenChange={setLeaveDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-700 hover:bg-blue-800 gap-2" data-testid="apply-leave-btn">
              <Plus className="w-4 h-4" />
              {t('applyLeave')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Apply for Leave</DialogTitle>
              <DialogDescription>
                Submit your leave request for approval
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>{t('leaveType')}</Label>
                <Select 
                  value={newLeave.leave_type} 
                  onValueChange={(v) => setNewLeave({ ...newLeave, leave_type: v })}
                >
                  <SelectTrigger data-testid="leave-type-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="casual">{t('casualLeave')}</SelectItem>
                    <SelectItem value="sick">{t('sickLeave')}</SelectItem>
                    <SelectItem value="paid">{t('paidLeave')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('startDate')}</Label>
                  <Input
                    type="date"
                    value={newLeave.start_date}
                    onChange={(e) => setNewLeave({ ...newLeave, start_date: e.target.value })}
                    data-testid="leave-start-date"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('endDate')}</Label>
                  <Input
                    type="date"
                    value={newLeave.end_date}
                    onChange={(e) => setNewLeave({ ...newLeave, end_date: e.target.value })}
                    data-testid="leave-end-date"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t('reason')}</Label>
                <Textarea
                  placeholder="Enter reason for leave..."
                  value={newLeave.reason}
                  onChange={(e) => setNewLeave({ ...newLeave, reason: e.target.value })}
                  data-testid="leave-reason"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setLeaveDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleApplyLeave}
                className="bg-blue-700 hover:bg-blue-800"
                data-testid="submit-leave-btn"
              >
                Submit Request
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Today's Attendance */}
      <Card className="dashboard-card" data-testid="today-attendance-card">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-900 font-['Manrope'] flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" />
            Today's Attendance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Check In/Out Buttons */}
            <div className="flex flex-col items-center justify-center p-6 bg-slate-50 rounded-xl">
              <p className="text-sm text-slate-500 mb-4">
                {new Date().toLocaleDateString('en-US', { 
                  weekday: 'long', month: 'long', day: 'numeric' 
                })}
              </p>
              {!todayRecord?.check_in ? (
                <Button
                  onClick={handleCheckIn}
                  disabled={checkingIn}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 gap-2 h-12"
                  data-testid="check-in-btn"
                >
                  <LogIn className="w-5 h-5" />
                  {checkingIn ? 'Checking in...' : t('checkIn')}
                </Button>
              ) : !todayRecord?.check_out ? (
                <Button
                  onClick={handleCheckOut}
                  disabled={checkingOut}
                  className="w-full bg-rose-600 hover:bg-rose-700 gap-2 h-12"
                  data-testid="check-out-btn"
                >
                  <LogOutIcon className="w-5 h-5" />
                  {checkingOut ? 'Checking out...' : t('checkOut')}
                </Button>
              ) : (
                <div className="flex items-center gap-2 text-emerald-600">
                  <CheckCircle2 className="w-6 h-6" />
                  <span className="font-medium">Day Complete</span>
                </div>
              )}
            </div>

            {/* Check In Time */}
            <div className="flex flex-col items-center justify-center p-6 bg-emerald-50 rounded-xl">
              <LogIn className="w-8 h-8 text-emerald-600 mb-2" />
              <p className="text-sm text-emerald-600 mb-1">Check In</p>
              <p className="text-2xl font-bold text-emerald-700">
                {formatTime(todayRecord?.check_in)}
              </p>
            </div>

            {/* Check Out Time */}
            <div className="flex flex-col items-center justify-center p-6 bg-rose-50 rounded-xl">
              <LogOutIcon className="w-8 h-8 text-rose-600 mb-2" />
              <p className="text-sm text-rose-600 mb-1">Check Out</p>
              <p className="text-2xl font-bold text-rose-700">
                {formatTime(todayRecord?.check_out)}
              </p>
            </div>
          </div>

          {todayRecord?.check_in && !todayRecord?.check_out && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg flex items-center justify-center gap-2">
              <Timer className="w-5 h-5 text-blue-600 animate-pulse" />
              <span className="text-blue-700 font-medium">Currently working...</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="dashboard-card card-hover">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="stats-icon-bg bg-blue-100">
                <CalendarIcon className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{records.length}</p>
                <p className="text-sm text-slate-500">Total Days</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="dashboard-card card-hover">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="stats-icon-bg bg-emerald-100">
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{presentDays}</p>
                <p className="text-sm text-slate-500">{t('present')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="dashboard-card card-hover">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="stats-icon-bg bg-rose-100">
                <XCircle className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{absentDays}</p>
                <p className="text-sm text-slate-500">{t('absent')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="dashboard-card card-hover">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="stats-icon-bg bg-amber-100">
                <FileText className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{leaveDays}</p>
                <p className="text-sm text-slate-500">{t('leave')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance History */}
        <Card className="dashboard-card" data-testid="attendance-history">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-slate-900 font-['Manrope']">
              {t('attendanceHistory')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {records.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('date')}</TableHead>
                      <TableHead>{t('checkInTime')}</TableHead>
                      <TableHead>{t('checkOutTime')}</TableHead>
                      <TableHead>Hours</TableHead>
                      <TableHead>{t('status')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.slice(0, 10).map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">{record.date}</TableCell>
                        <TableCell>{formatTime(record.check_in)}</TableCell>
                        <TableCell>{formatTime(record.check_out)}</TableCell>
                        <TableCell>{getWorkingHours(record.check_in, record.check_out)}</TableCell>
                        <TableCell>
                          <span className={`badge ${
                            record.status === 'present' ? 'badge-success' :
                            record.status === 'absent' ? 'badge-error' : 'badge-warning'
                          }`}>
                            {record.status}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8">
                <Clock className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                <p className="text-slate-500">No attendance records yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Leave Requests */}
        <Card className="dashboard-card" data-testid="leave-requests">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-slate-900 font-['Manrope']">
              Leave Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            {leaveRequests.length > 0 ? (
              <div className="space-y-3">
                {leaveRequests.map((leave) => (
                  <div 
                    key={leave.id}
                    className="p-4 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <span className={`badge ${
                          leave.leave_type === 'sick' ? 'badge-error' :
                          leave.leave_type === 'paid' ? 'badge-success' : 'badge-secondary'
                        } mb-2`}>
                          {leave.leave_type.charAt(0).toUpperCase() + leave.leave_type.slice(1)} Leave
                        </span>
                        <p className="text-sm font-medium text-slate-900">
                          {leave.start_date} to {leave.end_date}
                        </p>
                      </div>
                      <span className={`badge ${
                        leave.status === 'approved' ? 'badge-success' :
                        leave.status === 'rejected' ? 'badge-error' : 'badge-warning'
                      }`}>
                        {leave.status}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500">{leave.reason}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                <p className="text-slate-500">No leave requests</p>
                <p className="text-sm text-slate-400 mt-1">
                  Your leave requests will appear here
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Attendance;
