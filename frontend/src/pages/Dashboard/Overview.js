import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../utils/translations';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Progress } from '../../components/ui/progress';
import { toast } from 'sonner';
import { 
  Clock, Calendar, Target, CheckCircle2, AlertCircle, 
  Megaphone, Users, TrendingUp, LogIn, LogOut as LogOutIcon,
  ArrowRight, Timer
} from 'lucide-react';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

const DashboardOverview = () => {
  const { user, language } = useAuth();
  const { t } = useTranslation(language);
  const [stats, setStats] = useState(null);
  const [hrStats, setHrStats] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, announcementsRes, todayRes] = await Promise.all([
        axios.get(`${API_URL}/dashboard/stats`),
        axios.get(`${API_URL}/announcements`),
        axios.get(`${API_URL}/attendance/today`)
      ]);
      
      setStats(statsRes.data);
      setAnnouncements(announcementsRes.data.slice(0, 3));
      setTodayAttendance(todayRes.data);

      if (user?.role === 'hr_manager') {
        const hrRes = await axios.get(`${API_URL}/dashboard/hr-stats`);
        setHrStats(hrRes.data);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async () => {
    setCheckingIn(true);
    try {
      await axios.post(`${API_URL}/attendance/check-in`);
      toast.success(t('checkInSuccess'));
      fetchDashboardData();
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
      fetchDashboardData();
    } catch (error) {
      toast.error(error.response?.data?.detail || t('errorOccurred'));
    } finally {
      setCheckingOut(false);
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

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="dashboard-overview">
      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 font-['Manrope']">
            {getGreeting()}, {user?.full_name?.split(' ')[0]}!
          </h2>
          <p className="text-slate-500 mt-1">
            {new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </div>
        
        {/* Quick Actions */}
        <div className="flex gap-3">
          {!todayAttendance?.check_in ? (
            <Button
              onClick={handleCheckIn}
              disabled={checkingIn}
              className="bg-emerald-600 hover:bg-emerald-700 btn-hover-lift gap-2"
              data-testid="check-in-btn"
            >
              <LogIn className="w-4 h-4" />
              {checkingIn ? 'Checking in...' : t('checkIn')}
            </Button>
          ) : !todayAttendance?.check_out ? (
            <Button
              onClick={handleCheckOut}
              disabled={checkingOut}
              className="bg-rose-600 hover:bg-rose-700 btn-hover-lift gap-2"
              data-testid="check-out-btn"
            >
              <LogOutIcon className="w-4 h-4" />
              {checkingOut ? 'Checking out...' : t('checkOut')}
            </Button>
          ) : (
            <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-4 py-2 rounded-lg">
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-medium">Day Complete</span>
            </div>
          )}
        </div>
      </div>

      {/* HR Stats (Only for HR Manager) */}
      {user?.role === 'hr_manager' && hrStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-fade-in">
          <Card className="dashboard-card card-hover">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="stats-icon-bg bg-blue-100">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{hrStats.total_staff}</p>
                  <p className="text-sm text-slate-500">Total Staff</p>
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
                  <p className="text-2xl font-bold text-slate-900">{hrStats.present_today}</p>
                  <p className="text-sm text-slate-500">Present Today</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="dashboard-card card-hover">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="stats-icon-bg bg-amber-100">
                  <AlertCircle className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{hrStats.pending_leaves}</p>
                  <p className="text-sm text-slate-500">Pending Leaves</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="dashboard-card card-hover">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="stats-icon-bg bg-purple-100">
                  <TrendingUp className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{hrStats.total_interns}</p>
                  <p className="text-sm text-slate-500">Interns</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Attendance */}
        <Card className="dashboard-card card-hover animate-fade-in stagger-1" data-testid="attendance-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              {t('todayAttendance')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">Check In</span>
                <span className="font-medium text-slate-900">{formatTime(todayAttendance?.check_in)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">Check Out</span>
                <span className="font-medium text-slate-900">{formatTime(todayAttendance?.check_out)}</span>
              </div>
              {todayAttendance?.check_in && !todayAttendance?.check_out && (
                <div className="flex items-center gap-2 text-emerald-600 mt-2">
                  <Timer className="w-4 h-4 animate-pulse" />
                  <span className="text-sm font-medium">Working...</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Pending Tasks */}
        <Card className="dashboard-card card-hover animate-fade-in stagger-2" data-testid="tasks-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
              <Target className="w-4 h-4" />
              {t('pendingTasks')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-slate-900">{stats?.tasks?.pending || 0}</p>
            <p className="text-sm text-slate-500 mt-1">tasks remaining</p>
          </CardContent>
        </Card>

        {/* Leave Balance */}
        <Card className="dashboard-card card-hover animate-fade-in stagger-3" data-testid="leave-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {t('leaveBalance')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold text-slate-900">{stats?.leaves?.approved || 0}</p>
              <p className="text-sm text-slate-500">approved</p>
            </div>
            {stats?.leaves?.pending > 0 && (
              <p className="text-sm text-amber-600 mt-1">{stats.leaves.pending} pending</p>
            )}
          </CardContent>
        </Card>

        {/* Goal Progress */}
        <Card className="dashboard-card card-hover animate-fade-in stagger-4" data-testid="goals-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              {t('goalProgress')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-slate-900">{stats?.goals?.completion_rate || 0}%</p>
            <Progress value={stats?.goals?.completion_rate || 0} className="mt-2 h-2" />
            <p className="text-sm text-slate-500 mt-2">
              {stats?.goals?.completed || 0} of {stats?.goals?.total || 0} goals
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Attendance Overview & Announcements */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance Rate */}
        <Card className="dashboard-card animate-fade-in stagger-5" data-testid="attendance-overview">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-slate-900 font-['Manrope']">
              Attendance Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-4xl font-bold text-slate-900">{stats?.attendance?.attendance_rate || 0}%</p>
                <p className="text-sm text-slate-500">Attendance Rate</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold text-emerald-600">{stats?.attendance?.present || 0}</p>
                <p className="text-sm text-slate-500">Days Present</p>
              </div>
            </div>
            <Progress value={stats?.attendance?.attendance_rate || 0} className="h-3" />
            <div className="flex justify-between mt-2 text-sm text-slate-500">
              <span>0%</span>
              <span>100%</span>
            </div>
          </CardContent>
        </Card>

        {/* Recent Announcements */}
        <Card className="dashboard-card animate-fade-in stagger-5" data-testid="announcements-overview">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold text-slate-900 font-['Manrope']">
              <div className="flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-blue-600" />
                {t('recentAnnouncements')}
              </div>
            </CardTitle>
            <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 gap-1">
              {t('viewAll')}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {announcements.length > 0 ? (
              <div className="space-y-3">
                {announcements.map((announcement) => (
                  <div 
                    key={announcement.id} 
                    className="p-3 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-medium text-slate-900 text-sm">{announcement.title}</h4>
                      <span className={`announcement-category ${
                        announcement.category === 'important' 
                          ? 'announcement-category-important' 
                          : announcement.category === 'event'
                          ? 'announcement-category-event'
                          : 'announcement-category-general'
                      }`}>
                        {announcement.category}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 mt-1 line-clamp-2">{announcement.content}</p>
                    <p className="text-xs text-slate-400 mt-2">
                      {new Date(announcement.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">
                <Megaphone className="w-12 h-12 mx-auto text-slate-300 mb-2" />
                <p>No announcements yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardOverview;
