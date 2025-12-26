import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../utils/translations';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Progress } from '../../components/ui/progress';
import { Checkbox } from '../../components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Avatar, AvatarFallback } from '../../components/ui/avatar';
import { toast } from 'sonner';
import {
  FileText, Download, CheckCircle2, Clock, AlertCircle,
  Upload, UserCheck, Calendar, Mail, Phone, Search,
  Users, Loader2, RefreshCw, Eye
} from 'lucide-react';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

// HR Manager View Component
const HROnboardingManagement = () => {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API_URL}/onboarding/all-users`);
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const selectUser = async (userId) => {
    setSelectedUserId(userId);
    try {
      const response = await axios.get(`${API_URL}/onboarding/user/${userId}`);
      setSelectedUser(response.data);
    } catch (error) {
      toast.error('Failed to load user onboarding data');
    }
  };

  const updateChecklistItem = async (itemId, completed) => {
    if (!selectedUser) return;
    setUpdating(true);
    try {
      await axios.put(`${API_URL}/onboarding/user/${selectedUser.user.id}/item/${itemId}`, {
        completed
      });
      toast.success('Checklist updated');
      selectUser(selectedUser.user.id);
      fetchUsers();
    } catch (error) {
      toast.error('Failed to update checklist');
    } finally {
      setUpdating(false);
    }
  };

  const completeAllItems = async () => {
    if (!selectedUser) return;
    setUpdating(true);
    try {
      await axios.put(`${API_URL}/onboarding/user/${selectedUser.user.id}/complete-all`);
      toast.success('All items marked as complete');
      selectUser(selectedUser.user.id);
      fetchUsers();
    } catch (error) {
      toast.error('Failed to complete onboarding');
    } finally {
      setUpdating(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    return matchesSearch && matchesRole;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 font-['Manrope'] flex items-center gap-2">
            <Users className="w-7 h-7 text-blue-600" />
            Intern & Employee Onboarding Management
          </h2>
          <p className="text-slate-500 mt-1">
            Manage onboarding checklists for all employees and interns
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User Selection Panel */}
        <Card className="dashboard-card lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-slate-900 font-['Manrope'] flex items-center gap-2">
              <Search className="w-5 h-5 text-blue-600" />
              Search & Select User
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Input
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <div>
              <Select value={filterRole} onValueChange={setFilterRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="intern">Interns</SelectItem>
                  <SelectItem value="employee">Employees</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredUsers.map((user) => (
                <div
                  key={user.id}
                  onClick={() => selectUser(user.id)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedUserId === user.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback className={`${
                        user.role === 'intern' ? 'bg-purple-600' : 'bg-emerald-600'
                      } text-white`}>
                        {user.full_name?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 truncate">{user.full_name}</p>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          user.role === 'intern' 
                            ? 'bg-purple-100 text-purple-700' 
                            : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {user.role}
                        </span>
                        <span className={`text-xs ${
                          user.onboarding?.status === 'completed' 
                            ? 'text-emerald-600' 
                            : 'text-amber-600'
                        }`}>
                          {user.onboarding?.completed_items || 0}/{user.onboarding?.total_items || 6}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {filteredUsers.length === 0 && (
                <p className="text-center text-slate-500 py-4">No users found</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Onboarding Checklist Management */}
        <Card className="dashboard-card lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-slate-900 font-['Manrope'] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                Onboarding Checklist
              </div>
              {selectedUser && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={completeAllItems}
                  disabled={updating || selectedUser.onboarding?.status === 'completed'}
                  className="gap-1"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Complete All
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedUser ? (
              <div className="space-y-4">
                {/* User Info */}
                <div className="p-4 bg-slate-50 rounded-lg">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-slate-500 uppercase">Name</p>
                      <p className="font-medium text-slate-900">{selectedUser.user.full_name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase">Role</p>
                      <p className="font-medium text-slate-900 capitalize">{selectedUser.user.role}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase">Department</p>
                      <p className="font-medium text-slate-900">
                        {selectedUser.user.employee_fields?.department || 
                         selectedUser.user.intern_fields?.area_of_interest || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase">Joining Date</p>
                      <p className="font-medium text-slate-900">
                        {selectedUser.user.employee_fields?.joining_date || 
                         selectedUser.user.intern_fields?.internship_start || 'TBD'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Progress */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-600">Progress</span>
                    <span className="text-sm font-medium text-slate-900">
                      {selectedUser.onboarding?.completed_items || 0}/{selectedUser.onboarding?.total_items || 6} completed
                    </span>
                  </div>
                  <Progress 
                    value={(selectedUser.onboarding?.completed_items / selectedUser.onboarding?.total_items) * 100 || 0} 
                    className="h-2" 
                  />
                </div>

                {/* Checklist Items */}
                <div className="space-y-3">
                  {selectedUser.onboarding?.items?.map((item) => (
                    <div
                      key={item.id}
                      className={`flex items-center gap-3 p-4 rounded-lg border transition-colors ${
                        item.completed
                          ? 'bg-emerald-50 border-emerald-200'
                          : 'bg-white border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <Checkbox
                        checked={item.completed}
                        onCheckedChange={(checked) => updateChecklistItem(item.id, checked)}
                        disabled={updating}
                      />
                      <span className={`flex-1 ${
                        item.completed ? 'text-slate-500 line-through' : 'text-slate-700'
                      }`}>
                        {item.title}
                      </span>
                      {item.completed ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <Clock className="w-5 h-5 text-amber-500" />
                      )}
                    </div>
                  ))}
                </div>

                {selectedUser.onboarding?.updated_at && (
                  <p className="text-xs text-slate-500 text-right">
                    Last updated: {new Date(selectedUser.onboarding.updated_at).toLocaleString()}
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500">
                <Users className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                <p className="text-lg font-medium">Select a user to manage onboarding</p>
                <p className="text-sm">Choose an intern or employee from the list</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Employee/Intern Read-Only View Component
const UserOnboardingView = () => {
  const { user, language } = useAuth();
  const { t } = useTranslation(language);
  const [checklist, setChecklist] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState({});
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [checklistRes, docsRes] = await Promise.all([
        axios.get(`${API_URL}/onboarding/checklist`),
        axios.get(`${API_URL}/documents/my-documents`)
      ]);
      setChecklist(checklistRes.data);
      setDocuments(docsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDocumentUpload = async (docType, file) => {
    if (!file) return;
    
    setUploading(prev => ({ ...prev, [docType]: true }));
    
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result;
        await axios.post(`${API_URL}/documents/upload`, {
          type: docType,
          name: file.name,
          data: base64
        });
        toast.success('Document uploaded successfully');
        fetchData();
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast.error('Failed to upload document');
    } finally {
      setUploading(prev => ({ ...prev, [docType]: false }));
    }
  };

  const downloadOfferLetter = async () => {
    setDownloading(true);
    try {
      const response = await axios.get(`${API_URL}/documents/offer-letter/download`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `offer_letter_${user?.full_name?.replace(/\s+/g, '_')}.txt`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Offer letter downloaded');
    } catch (error) {
      toast.error('Failed to download offer letter');
    } finally {
      setDownloading(false);
    }
  };

  const isDocUploaded = (docType) => {
    return documents.some(doc => doc.type === docType);
  };

  const completionRate = checklist?.total_items
    ? Math.round((checklist.completed_items / checklist.total_items) * 100)
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner" />
      </div>
    );
  }

  const documentTypes = [
    { type: 'id_proof', name: 'ID Proof (Govt ID)' },
    { type: 'resume', name: 'Resume/CV' },
    { type: 'address_proof', name: 'Address Proof' },
    ...(user?.role === 'intern' ? [{ type: 'college_id', name: 'College ID' }] : [])
  ];

  return (
    <div className="space-y-6" data-testid="recruitment-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 font-['Manrope']">
            {t('recruitment')}
          </h2>
          <p className="text-slate-500 mt-1">
            Track your onboarding status and submit required documents
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Onboarding Status */}
          <Card className="dashboard-card border-l-4 border-l-blue-500">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-slate-900 font-['Manrope'] flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-blue-600" />
                Onboarding
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg mb-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  checklist?.status === 'completed' ? 'bg-emerald-100' : 'bg-amber-100'
                }`}>
                  {checklist?.status === 'completed' ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                  ) : (
                    <Clock className="w-6 h-6 text-amber-600" />
                  )}
                </div>
                <div>
                  <p className="font-semibold text-slate-900">
                    {checklist?.status === 'completed' ? 'Onboarding Complete' : 'Onboarding In Progress'}
                  </p>
                  <p className="text-sm text-slate-500">
                    {checklist?.status === 'completed' 
                      ? 'You have completed all onboarding tasks' 
                      : 'Your HR manager will update your progress'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Onboarding Checklist - Read Only */}
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
                    className={`flex items-center gap-3 p-3 rounded-lg border ${
                      item.completed
                        ? 'bg-emerald-50 border-emerald-200'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                      item.completed ? 'bg-emerald-500' : 'bg-slate-200'
                    }`}>
                      {item.completed && <CheckCircle2 className="w-4 h-4 text-white" />}
                    </div>
                    <span className={`flex-1 text-sm ${
                      item.completed ? 'text-slate-500 line-through' : 'text-slate-700'
                    }`}>
                      {item.title}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      item.completed 
                        ? 'bg-emerald-100 text-emerald-700' 
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      {item.completed ? 'Completed' : 'Pending'}
                    </span>
                  </div>
                ))}
              </div>

              <p className="text-xs text-slate-500 mt-4 text-center">
                Note: Only HR Manager can update your onboarding checklist
              </p>
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
                {documentTypes.map((doc) => (
                  <div
                    key={doc.type}
                    className="p-4 rounded-lg border border-slate-200 hover:border-blue-300 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-slate-400" />
                        <span className="text-sm font-medium text-slate-700">{doc.name}</span>
                      </div>
                      {isDocUploaded(doc.type) && (
                        <span className="badge badge-success">Uploaded</span>
                      )}
                    </div>
                    <div>
                      <input
                        type="file"
                        id={`upload-${doc.type}`}
                        className="hidden"
                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                        onChange={(e) => handleDocumentUpload(doc.type, e.target.files[0])}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full gap-2"
                        disabled={uploading[doc.type]}
                        onClick={() => document.getElementById(`upload-${doc.type}`).click()}
                      >
                        {uploading[doc.type] ? (
                          <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</>
                        ) : isDocUploaded(doc.type) ? (
                          <><RefreshCw className="w-4 h-4" /> Re-upload</>
                        ) : (
                          <><Upload className="w-4 h-4" /> Upload</>
                        )}
                      </Button>
                    </div>
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
                <Button 
                  className="w-full bg-blue-700 hover:bg-blue-800 gap-2"
                  onClick={downloadOfferLetter}
                  disabled={downloading}
                >
                  {downloading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Downloading...</>
                  ) : (
                    <><Download className="w-4 h-4" /> Download PDF</>
                  )}
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
                <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium">
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

// Main Recruitment Component - Switches based on role
const Recruitment = () => {
  const { user } = useAuth();
  
  // HR Manager sees management view, others see read-only view
  if (user?.role === 'hr_manager') {
    return <HROnboardingManagement />;
  }
  
  return <UserOnboardingView />;
};

export default Recruitment;
