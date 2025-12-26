import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../utils/translations';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { toast } from 'sonner';
import { 
  User, Mail, Phone, MapPin, Calendar, Briefcase, 
  GraduationCap, Building2, Edit2, Save, X, Upload
} from 'lucide-react';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

const EmployeeData = () => {
  const { user, updateProfile, language } = useAuth();
  const { t } = useTranslation(language);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    if (user) {
      setFormData({ ...user });
    }
  }, [user]);

  const handleSave = async () => {
    setLoading(true);
    try {
      await updateProfile(formData);
      toast.success(t('profileUpdated'));
      setEditing(false);
    } catch (error) {
      toast.error(error.response?.data?.detail || t('errorOccurred'));
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNestedChange = (section, field, value) => {
    setFormData(prev => ({
      ...prev,
      [section]: { ...prev[section], [field]: value }
    }));
  };

  const InfoRow = ({ label, value, icon: Icon }) => (
    <div className="flex items-center gap-3 py-3 border-b border-slate-100 last:border-0">
      {Icon && <Icon className="w-4 h-4 text-slate-400" />}
      <span className="text-sm text-slate-500 w-32">{label}</span>
      <span className="text-sm font-medium text-slate-900 flex-1">{value || '-'}</span>
    </div>
  );

  return (
    <div className="space-y-6" data-testid="employee-data-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 font-['Manrope']">
            {t('employeeData')}
          </h2>
          <p className="text-slate-500 mt-1">
            View and manage your profile information
          </p>
        </div>
        {!editing ? (
          <Button 
            onClick={() => setEditing(true)} 
            className="bg-blue-700 hover:bg-blue-800 gap-2"
            data-testid="edit-profile-btn"
          >
            <Edit2 className="w-4 h-4" />
            Edit Profile
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setEditing(false);
                setFormData({ ...user });
              }}
              data-testid="cancel-edit-btn"
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={loading}
              className="bg-blue-700 hover:bg-blue-800 gap-2"
              data-testid="save-profile-btn"
            >
              <Save className="w-4 h-4" />
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        )}
      </div>

      {/* Profile Header Card */}
      <Card className="dashboard-card" data-testid="profile-header">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="relative">
              <Avatar className="w-24 h-24">
                <AvatarImage src={user?.profile_picture} />
                <AvatarFallback className="text-2xl bg-blue-600 text-white">
                  {user?.full_name?.charAt(0)?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {editing && (
                <button className="absolute bottom-0 right-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white hover:bg-blue-700 transition-colors">
                  <Upload className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="text-center md:text-left flex-1">
              <h3 className="text-xl font-bold text-slate-900 font-['Manrope']">
                {user?.full_name}
              </h3>
              <p className="text-slate-500 capitalize">{user?.role?.replace('_', ' ')}</p>
              <div className="flex flex-wrap gap-2 mt-3 justify-center md:justify-start">
                {user?.employee_fields?.department && (
                  <span className="badge badge-secondary">{user.employee_fields.department}</span>
                )}
                {user?.employee_fields?.designation && (
                  <span className="badge badge-secondary">{user.employee_fields.designation}</span>
                )}
                {user?.intern_fields?.institution && (
                  <span className="badge badge-secondary">{user.intern_fields.institution}</span>
                )}
              </div>
            </div>
            <div className="text-center md:text-right">
              <p className="text-sm text-slate-500">Employee ID</p>
              <p className="text-lg font-semibold text-slate-900">
                {user?.employee_fields?.employee_id || user?.id?.slice(0, 8).toUpperCase()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="personal" className="w-full">
        <TabsList className="bg-slate-100 p-1 rounded-lg">
          <TabsTrigger value="personal" className="data-[state=active]:bg-white">
            Personal Info
          </TabsTrigger>
          <TabsTrigger value="professional" className="data-[state=active]:bg-white">
            Professional Info
          </TabsTrigger>
          <TabsTrigger value="documents" className="data-[state=active]:bg-white">
            Documents
          </TabsTrigger>
        </TabsList>

        {/* Personal Info Tab */}
        <TabsContent value="personal" className="mt-6">
          <Card className="dashboard-card">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-slate-900 font-['Manrope'] flex items-center gap-2">
                <User className="w-5 h-5 text-blue-600" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              {editing ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('fullName')}</Label>
                    <Input
                      value={formData.full_name || ''}
                      onChange={(e) => handleChange('full_name', e.target.value)}
                      data-testid="edit-fullname"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('phone')}</Label>
                    <Input
                      value={formData.phone || ''}
                      onChange={(e) => handleChange('phone', e.target.value)}
                      data-testid="edit-phone"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('gender')}</Label>
                    <Select 
                      value={formData.gender} 
                      onValueChange={(v) => handleChange('gender', v)}
                    >
                      <SelectTrigger data-testid="edit-gender">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">{t('male')}</SelectItem>
                        <SelectItem value="female">{t('female')}</SelectItem>
                        <SelectItem value="other">{t('other')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t('dateOfBirth')}</Label>
                    <Input
                      type="date"
                      value={formData.date_of_birth || ''}
                      onChange={(e) => handleChange('date_of_birth', e.target.value)}
                      data-testid="edit-dob"
                    />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label>{t('address')}</Label>
                    <Textarea
                      value={formData.address || ''}
                      onChange={(e) => handleChange('address', e.target.value)}
                      data-testid="edit-address"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  <InfoRow icon={User} label={t('fullName')} value={user?.full_name} />
                  <InfoRow icon={Mail} label={t('email')} value={user?.email} />
                  <InfoRow icon={Phone} label={t('phone')} value={user?.phone} />
                  <InfoRow icon={User} label={t('gender')} value={user?.gender} />
                  <InfoRow icon={Calendar} label={t('dateOfBirth')} value={user?.date_of_birth} />
                  <InfoRow icon={MapPin} label={t('address')} value={user?.address} />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Professional Info Tab */}
        <TabsContent value="professional" className="mt-6">
          <Card className="dashboard-card">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-slate-900 font-['Manrope'] flex items-center gap-2">
                {user?.role === 'intern' ? (
                  <GraduationCap className="w-5 h-5 text-blue-600" />
                ) : (
                  <Briefcase className="w-5 h-5 text-blue-600" />
                )}
                {user?.role === 'intern' ? 'Internship Details' : 'Employment Details'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {user?.role === 'intern' ? (
                <div className="space-y-1">
                  <InfoRow icon={Building2} label={t('institution')} value={user?.intern_fields?.institution} />
                  <InfoRow icon={Calendar} label={t('currentYear')} value={user?.intern_fields?.current_year} />
                  <InfoRow icon={GraduationCap} label={t('major')} value={user?.intern_fields?.major} />
                  <InfoRow icon={Calendar} label={t('internshipStart')} value={user?.intern_fields?.internship_start} />
                  <InfoRow icon={Calendar} label={t('internshipEnd')} value={user?.intern_fields?.internship_end} />
                  <InfoRow icon={Briefcase} label={t('areaOfInterest')} value={user?.intern_fields?.area_of_interest} />
                </div>
              ) : user?.role === 'employee' ? (
                <div className="space-y-1">
                  <InfoRow icon={Building2} label={t('department')} value={user?.employee_fields?.department} />
                  <InfoRow icon={Briefcase} label={t('designation')} value={user?.employee_fields?.designation} />
                  <InfoRow icon={Calendar} label={t('joiningDate')} value={user?.employee_fields?.joining_date} />
                  <InfoRow icon={User} label={t('reportingManager')} value={user?.employee_fields?.reporting_manager} />
                  <InfoRow icon={Briefcase} label={t('skills')} value={user?.employee_fields?.skills?.join(', ')} />
                </div>
              ) : (
                <div className="space-y-1">
                  <InfoRow icon={Building2} label={t('accessLevel')} value={user?.hr_manager_fields?.access_level} />
                  <InfoRow icon={Building2} label={t('departmentsOverseen')} value={user?.hr_manager_fields?.departments_overseen?.join(', ')} />
                  <InfoRow icon={Briefcase} label={t('workExperience')} value={user?.hr_manager_fields?.work_experience} />
                  <InfoRow icon={MapPin} label={t('officeLocation')} value={user?.hr_manager_fields?.office_location} />
                  <InfoRow icon={Phone} label={t('emergencyContact')} value={user?.hr_manager_fields?.emergency_contact} />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="mt-6">
          <Card className="dashboard-card">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-slate-900 font-['Manrope']">
                Uploaded Documents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { name: 'Resume/CV', type: 'PDF' },
                  { name: 'ID Proof', type: 'Image' },
                  { name: 'Address Proof', type: 'PDF' },
                  { name: 'Portfolio', type: 'Link', url: user?.intern_fields?.portfolio_url },
                ].map((doc, index) => (
                  <div 
                    key={index}
                    className="flex items-center justify-between p-4 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                        <Briefcase className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{doc.name}</p>
                        <p className="text-xs text-slate-500">{doc.type}</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">View</Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EmployeeData;
