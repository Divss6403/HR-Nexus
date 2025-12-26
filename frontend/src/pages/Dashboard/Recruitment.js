import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../utils/translations';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Progress } from '../../components/ui/progress';
import { Checkbox } from '../../components/ui/checkbox';
import { toast } from 'sonner';
import { 
  FileText, Download, CheckCircle2, Clock, AlertCircle,
  Upload, UserCheck, Calendar, Mail, Phone
} from 'lucide-react';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Recruitment = () => {
  const { user, language } = useAuth();
  const { t } = useTranslation(language);
  const [checklist, setChecklist] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchChecklist();
  }, []);

  const fetchChecklist = async () => {
    try {
      const response = await axios.get(`${API_URL}/onboarding/checklist`);
      setChecklist(response.data);
    } catch (error) {
      console.error('Error fetching checklist:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleChecklistItem = async (itemId) => {
    try {
      await axios.put(`${API_URL}/onboarding/checklist/${itemId}`);
      fetchChecklist();
      toast.success('Checklist updated');
    } catch (error) {
      toast.error('Failed to update checklist');
    }
  };

  const getStatusBadge = (status) => {
    const statusStyles = {
      selected: 'badge-success',
      under_review: 'badge-warning',
      rejected: 'badge-error',
      pending: 'badge-secondary'
    };
    return statusStyles[status] || 'badge-secondary';
  };

  const getStatusLabel = (status) => {
    const labels = {
      selected: 'Selected',
      under_review: 'Under Review',
      rejected: 'Rejected',
      pending: 'Pending'
    };
    return labels[status] || 'Pending';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner" />
      </div>
    );
  }

  const completionRate = checklist?.total_items 
    ? Math.round((checklist.completed_items / checklist.total_items) * 100) 
    : 0;

  return (
    <div className="space-y-6" data-testid="recruitment-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 font-['Manrope']">
            {t('recruitment')}
          </h2>
          <p className="text-slate-500 mt-1">
            Track your application status and complete onboarding tasks
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Application Status Card */}
          <Card className="dashboard-card" data-testid="application-status-card">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-slate-900 font-['Manrope'] flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-blue-600" />
                Application Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">
                      {user?.application_status ? getStatusLabel(user.application_status) : 'Selected'}
                    </p>
                    <p className="text-sm text-slate-500">Your application has been processed</p>
                  </div>
                </div>
                <span className={`badge ${getStatusBadge(user?.application_status || 'selected')}`}>
                  {getStatusLabel(user?.application_status || 'selected')}
                </span>
              </div>

              {/* Timeline */}
              <div className="mt-6 space-y-4">
                <h4 className="text-sm font-medium text-slate-700">Application Timeline</h4>
                <div className="space-y-3">
                  {[
                    { label: 'Application Submitted', date: user?.created_at, completed: true },
                    { label: 'Documents Verified', date: null, completed: true },
                    { label: 'Interview Completed', date: null, completed: true },
                    { label: 'Offer Extended', date: null, completed: true },
                    { label: 'Onboarding', date: null, completed: checklist?.status === 'completed' },
                  ].map((step, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        step.completed ? 'bg-emerald-100' : 'bg-slate-100'
                      }`}>
                        {step.completed ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Clock className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className={`text-sm font-medium ${step.completed ? 'text-slate-900' : 'text-slate-500'}`}>
                          {step.label}
                        </p>
                      </div>
                      {step.completed && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Onboarding Checklist */}
          <Card className="dashboard-card" data-testid="onboarding-checklist">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-slate-900 font-['Manrope'] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  {t('onboardingChecklist')}
                </div>
                <span className="text-sm font-normal text-slate-500">
                  {checklist?.completed_items || 0}/{checklist?.total_items || 0} completed
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-600">Progress</span>
                  <span className="text-sm font-medium text-slate-900">{completionRate}%</span>
                </div>
                <Progress value={completionRate} className="h-2" />
              </div>

              <div className="space-y-3">
                {checklist?.items?.map((item) => (
                  <div 
                    key={item.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                      item.completed 
                        ? 'bg-emerald-50 border-emerald-200' 
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <Checkbox
                      checked={item.completed}
                      onCheckedChange={() => toggleChecklistItem(item.id)}
                      data-testid={`checklist-item-${item.id}`}
                    />
                    <span className={`flex-1 text-sm ${
                      item.completed ? 'text-slate-500 line-through' : 'text-slate-700'
                    }`}>
                      {item.title}
                    </span>
                    {item.completed && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Document Submission */}
          <Card className="dashboard-card" data-testid="document-submission">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-slate-900 font-['Manrope'] flex items-center gap-2">
                <Upload className="w-5 h-5 text-blue-600" />
                Document Submission
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { name: 'ID Proof', status: 'uploaded' },
                  { name: 'Resume/CV', status: 'uploaded' },
                  { name: 'College ID (for interns)', status: user?.role === 'intern' ? 'pending' : 'na' },
                  { name: 'Address Proof', status: 'pending' },
                ].filter(doc => doc.status !== 'na').map((doc, index) => (
                  <div 
                    key={index}
                    className="flex items-center justify-between p-3 rounded-lg border border-slate-200"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-slate-400" />
                      <span className="text-sm text-slate-700">{doc.name}</span>
                    </div>
                    {doc.status === 'uploaded' ? (
                      <span className="badge badge-success">Uploaded</span>
                    ) : (
                      <Button size="sm" variant="outline" className="text-xs">
                        Upload
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Offer Letter */}
          <Card className="dashboard-card" data-testid="offer-letter-card">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-slate-900 font-['Manrope'] flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                {t('offerLetter')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-4">
                <div className="w-16 h-16 mx-auto bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <FileText className="w-8 h-8 text-blue-600" />
                </div>
                <p className="text-sm text-slate-600 mb-4">
                  {user?.role === 'intern' ? 'Internship Agreement' : 'Offer Letter'}
                </p>
                <Button className="w-full bg-blue-700 hover:bg-blue-800 gap-2">
                  <Download className="w-4 h-4" />
                  Download PDF
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* HR Contact */}
          <Card className="dashboard-card" data-testid="hr-contact-card">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-slate-900 font-['Manrope']">
                {t('welcomeHR')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-medium">
                  HR
                </div>
                <div>
                  <p className="font-medium text-slate-900">HR Team</p>
                  <p className="text-sm text-slate-500">Human Resources</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Mail className="w-4 h-4 text-slate-400" />
                  <span>hr@company.com</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <span>+91 98765 43210</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Joining Details */}
          <Card className="dashboard-card" data-testid="joining-details">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-slate-900 font-['Manrope'] flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                Joining Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">Joining Date</span>
                  <span className="text-sm font-medium text-slate-900">
                    {user?.role === 'intern' 
                      ? user?.intern_fields?.internship_start || 'TBD'
                      : user?.employee_fields?.joining_date || 'TBD'
                    }
                  </span>
                </div>
                {user?.role === 'intern' && (
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-500">End Date</span>
                    <span className="text-sm font-medium text-slate-900">
                      {user?.intern_fields?.internship_end || 'TBD'}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">Department</span>
                  <span className="text-sm font-medium text-slate-900">
                    {user?.employee_fields?.department || user?.intern_fields?.area_of_interest || 'TBD'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">Role</span>
                  <span className="text-sm font-medium text-slate-900 capitalize">
                    {user?.employee_fields?.designation || user?.role?.replace('_', ' ') || 'TBD'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Recruitment;
