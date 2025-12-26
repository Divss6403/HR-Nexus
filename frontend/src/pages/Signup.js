import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../utils/translations';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { toast } from 'sonner';
import { 
  Mail, Lock, Eye, EyeOff, Building2, Globe, User, Phone, 
  Calendar, MapPin, GraduationCap, Briefcase, UserCog, ArrowLeft, ArrowRight 
} from 'lucide-react';

const Signup = () => {
  const navigate = useNavigate();
  const { register, language, changeLanguage } = useAuth();
  const { t } = useTranslation(language);
  
  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    full_name: '',
    phone: '',
    gender: '',
    date_of_birth: '',
    address: '',
    preferred_language: 'english',
    role: '',
    profile_picture: null,
    // Intern fields
    intern_fields: {
      institution: '',
      current_year: '',
      major: '',
      internship_start: '',
      internship_end: '',
      portfolio_url: '',
      area_of_interest: ''
    },
    // Employee fields
    employee_fields: {
      department: '',
      designation: '',
      joining_date: '',
      reporting_manager: '',
      skills: '',
      government_id: '',
      bank_account: '',
      bank_ifsc: ''
    },
    // HR Manager fields
    hr_manager_fields: {
      access_level: 'view_only',
      departments_overseen: '',
      approval_permissions: false,
      work_experience: '',
      certifications: '',
      office_location: '',
      emergency_contact: ''
    }
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNestedChange = (section, field, value) => {
    setFormData(prev => ({
      ...prev,
      [section]: { ...prev[section], [field]: value }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    
    setLoading(true);
    
    try {
      const submitData = {
        ...formData,
        employee_fields: formData.role === 'employee' ? {
          ...formData.employee_fields,
          skills: formData.employee_fields.skills.split(',').map(s => s.trim()).filter(Boolean)
        } : null,
        intern_fields: formData.role === 'intern' ? formData.intern_fields : null,
        hr_manager_fields: formData.role === 'hr_manager' ? {
          ...formData.hr_manager_fields,
          departments_overseen: formData.hr_manager_fields.departments_overseen.split(',').map(s => s.trim()).filter(Boolean),
          certifications: formData.hr_manager_fields.certifications.split(',').map(s => s.trim()).filter(Boolean)
        } : null
      };
      
      delete submitData.confirmPassword;
      
      await register(submitData);
      toast.success(t('registerSuccess'));
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || t('errorOccurred'));
    } finally {
      setLoading(false);
    }
  };

  const roleIcons = {
    intern: <GraduationCap className="w-8 h-8" />,
    employee: <Briefcase className="w-8 h-8" />,
    hr_manager: <UserCog className="w-8 h-8" />
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold text-slate-900 font-['Manrope']">{t('selectRole')}</h3>
              <p className="text-sm text-slate-500 mt-1">Choose your role to continue</p>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              {['intern', 'employee', 'hr_manager'].map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => {
                    handleChange('role', role);
                    setStep(2);
                  }}
                  className={`p-6 rounded-xl border-2 transition-all hover:shadow-md flex items-center gap-4 ${
                    formData.role === role 
                      ? 'border-blue-600 bg-blue-50' 
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                  data-testid={`role-${role}-btn`}
                >
                  <div className={`p-3 rounded-lg ${
                    formData.role === role ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {roleIcons[role]}
                  </div>
                  <div className="text-left">
                    <div className="font-semibold text-slate-900 font-['Manrope']">
                      {t(role === 'hr_manager' ? 'hrManager' : role)}
                    </div>
                    <div className="text-sm text-slate-500">
                      {role === 'intern' && 'Join as an intern to start your journey'}
                      {role === 'employee' && 'Register as a full-time employee'}
                      {role === 'hr_manager' && 'Access HR management features'}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4 animate-fade-in">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label className="text-slate-700 font-medium">{t('fullName')}</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="John Doe"
                    className="pl-10"
                    value={formData.full_name}
                    onChange={(e) => handleChange('full_name', e.target.value)}
                    required
                    data-testid="fullname-input"
                  />
                </div>
              </div>
              
              <div className="col-span-2 space-y-2">
                <Label className="text-slate-700 font-medium">{t('email')}</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    type="email"
                    placeholder="name@company.com"
                    className="pl-10"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    required
                    data-testid="email-input"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-700 font-medium">{t('password')}</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    className="pl-10"
                    value={formData.password}
                    onChange={(e) => handleChange('password', e.target.value)}
                    required
                    data-testid="password-input"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-700 font-medium">{t('confirmPassword')}</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    className="pl-10"
                    value={formData.confirmPassword}
                    onChange={(e) => handleChange('confirmPassword', e.target.value)}
                    required
                    data-testid="confirm-password-input"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-700 font-medium">{t('phone')}</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="+91 9876543210"
                    className="pl-10"
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    required
                    data-testid="phone-input"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-700 font-medium">{t('gender')}</Label>
                <Select value={formData.gender} onValueChange={(v) => handleChange('gender', v)}>
                  <SelectTrigger data-testid="gender-select">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">{t('male')}</SelectItem>
                    <SelectItem value="female">{t('female')}</SelectItem>
                    <SelectItem value="other">{t('other')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-700 font-medium">{t('dateOfBirth')}</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    type="date"
                    className="pl-10"
                    value={formData.date_of_birth}
                    onChange={(e) => handleChange('date_of_birth', e.target.value)}
                    required
                    data-testid="dob-input"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-700 font-medium">{t('preferredLanguage')}</Label>
                <Select value={formData.preferred_language} onValueChange={(v) => handleChange('preferred_language', v)}>
                  <SelectTrigger data-testid="language-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="english">English</SelectItem>
                    <SelectItem value="hindi">हिंदी</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-2 space-y-2">
                <Label className="text-slate-700 font-medium">{t('address')}</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <Textarea
                    placeholder="Enter your full address"
                    className="pl-10 min-h-[80px]"
                    value={formData.address}
                    onChange={(e) => handleChange('address', e.target.value)}
                    required
                    data-testid="address-input"
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 3:
        if (formData.role === 'intern') {
          return (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center gap-2 mb-4 p-3 bg-blue-50 rounded-lg">
                <GraduationCap className="w-5 h-5 text-blue-600" />
                <span className="font-medium text-blue-900">Intern Information</span>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label className="text-slate-700 font-medium">{t('institution')}</Label>
                  <Input
                    placeholder="University/College name"
                    value={formData.intern_fields.institution}
                    onChange={(e) => handleNestedChange('intern_fields', 'institution', e.target.value)}
                    data-testid="institution-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-700 font-medium">{t('currentYear')}</Label>
                  <Select 
                    value={formData.intern_fields.current_year} 
                    onValueChange={(v) => handleNestedChange('intern_fields', 'current_year', v)}
                  >
                    <SelectTrigger data-testid="year-select">
                      <SelectValue placeholder="Select year" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1st Year">1st Year</SelectItem>
                      <SelectItem value="2nd Year">2nd Year</SelectItem>
                      <SelectItem value="3rd Year">3rd Year</SelectItem>
                      <SelectItem value="4th Year">4th Year</SelectItem>
                      <SelectItem value="Post Graduate">Post Graduate</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-700 font-medium">{t('major')}</Label>
                  <Input
                    placeholder="e.g., Computer Science"
                    value={formData.intern_fields.major}
                    onChange={(e) => handleNestedChange('intern_fields', 'major', e.target.value)}
                    data-testid="major-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-700 font-medium">{t('internshipStart')}</Label>
                  <Input
                    type="date"
                    value={formData.intern_fields.internship_start}
                    onChange={(e) => handleNestedChange('intern_fields', 'internship_start', e.target.value)}
                    data-testid="internship-start-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-700 font-medium">{t('internshipEnd')}</Label>
                  <Input
                    type="date"
                    value={formData.intern_fields.internship_end}
                    onChange={(e) => handleNestedChange('intern_fields', 'internship_end', e.target.value)}
                    data-testid="internship-end-input"
                  />
                </div>

                <div className="col-span-2 space-y-2">
                  <Label className="text-slate-700 font-medium">{t('portfolioUrl')}</Label>
                  <Input
                    placeholder="https://yourportfolio.com"
                    value={formData.intern_fields.portfolio_url}
                    onChange={(e) => handleNestedChange('intern_fields', 'portfolio_url', e.target.value)}
                    data-testid="portfolio-input"
                  />
                </div>

                <div className="col-span-2 space-y-2">
                  <Label className="text-slate-700 font-medium">{t('areaOfInterest')}</Label>
                  <Select 
                    value={formData.intern_fields.area_of_interest} 
                    onValueChange={(v) => handleNestedChange('intern_fields', 'area_of_interest', v)}
                  >
                    <SelectTrigger data-testid="interest-select">
                      <SelectValue placeholder="Select area of interest" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Web Development">Web Development</SelectItem>
                      <SelectItem value="Mobile Development">Mobile Development</SelectItem>
                      <SelectItem value="Data Science">Data Science</SelectItem>
                      <SelectItem value="Marketing">Marketing</SelectItem>
                      <SelectItem value="Design">Design</SelectItem>
                      <SelectItem value="HR">Human Resources</SelectItem>
                      <SelectItem value="Finance">Finance</SelectItem>
                      <SelectItem value="Operations">Operations</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          );
        }

        if (formData.role === 'employee') {
          return (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center gap-2 mb-4 p-3 bg-emerald-50 rounded-lg">
                <Briefcase className="w-5 h-5 text-emerald-600" />
                <span className="font-medium text-emerald-900">Employee Information</span>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-700 font-medium">{t('department')}</Label>
                  <Select 
                    value={formData.employee_fields.department} 
                    onValueChange={(v) => handleNestedChange('employee_fields', 'department', v)}
                  >
                    <SelectTrigger data-testid="department-select">
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Engineering">Engineering</SelectItem>
                      <SelectItem value="Product">Product</SelectItem>
                      <SelectItem value="Design">Design</SelectItem>
                      <SelectItem value="Marketing">Marketing</SelectItem>
                      <SelectItem value="Sales">Sales</SelectItem>
                      <SelectItem value="HR">Human Resources</SelectItem>
                      <SelectItem value="Finance">Finance</SelectItem>
                      <SelectItem value="Operations">Operations</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-700 font-medium">{t('designation')}</Label>
                  <Input
                    placeholder="e.g., Software Engineer"
                    value={formData.employee_fields.designation}
                    onChange={(e) => handleNestedChange('employee_fields', 'designation', e.target.value)}
                    data-testid="designation-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-700 font-medium">{t('joiningDate')}</Label>
                  <Input
                    type="date"
                    value={formData.employee_fields.joining_date}
                    onChange={(e) => handleNestedChange('employee_fields', 'joining_date', e.target.value)}
                    data-testid="joining-date-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-700 font-medium">{t('reportingManager')}</Label>
                  <Input
                    placeholder="Manager's name"
                    value={formData.employee_fields.reporting_manager}
                    onChange={(e) => handleNestedChange('employee_fields', 'reporting_manager', e.target.value)}
                    data-testid="manager-input"
                  />
                </div>

                <div className="col-span-2 space-y-2">
                  <Label className="text-slate-700 font-medium">{t('skills')}</Label>
                  <Input
                    placeholder="React, Python, SQL (comma separated)"
                    value={formData.employee_fields.skills}
                    onChange={(e) => handleNestedChange('employee_fields', 'skills', e.target.value)}
                    data-testid="skills-input"
                  />
                </div>

                <div className="col-span-2 space-y-2">
                  <Label className="text-slate-700 font-medium">{t('governmentId')}</Label>
                  <Input
                    placeholder="PAN/Aadhaar number"
                    value={formData.employee_fields.government_id}
                    onChange={(e) => handleNestedChange('employee_fields', 'government_id', e.target.value)}
                    data-testid="govid-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-700 font-medium">{t('bankAccount')}</Label>
                  <Input
                    placeholder="Account number"
                    value={formData.employee_fields.bank_account}
                    onChange={(e) => handleNestedChange('employee_fields', 'bank_account', e.target.value)}
                    data-testid="bank-account-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-700 font-medium">{t('bankIfsc')}</Label>
                  <Input
                    placeholder="IFSC Code"
                    value={formData.employee_fields.bank_ifsc}
                    onChange={(e) => handleNestedChange('employee_fields', 'bank_ifsc', e.target.value)}
                    data-testid="bank-ifsc-input"
                  />
                </div>
              </div>
            </div>
          );
        }

        if (formData.role === 'hr_manager') {
          return (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center gap-2 mb-4 p-3 bg-purple-50 rounded-lg">
                <UserCog className="w-5 h-5 text-purple-600" />
                <span className="font-medium text-purple-900">HR Manager Information</span>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-700 font-medium">{t('accessLevel')}</Label>
                  <Select 
                    value={formData.hr_manager_fields.access_level} 
                    onValueChange={(v) => handleNestedChange('hr_manager_fields', 'access_level', v)}
                  >
                    <SelectTrigger data-testid="access-level-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="view_only">View Only</SelectItem>
                      <SelectItem value="edit_limited">Edit Limited</SelectItem>
                      <SelectItem value="edit_all">Edit All</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-700 font-medium">{t('officeLocation')}</Label>
                  <Input
                    placeholder="e.g., Mumbai HQ"
                    value={formData.hr_manager_fields.office_location}
                    onChange={(e) => handleNestedChange('hr_manager_fields', 'office_location', e.target.value)}
                    data-testid="office-location-input"
                  />
                </div>

                <div className="col-span-2 space-y-2">
                  <Label className="text-slate-700 font-medium">{t('departmentsOverseen')}</Label>
                  <Input
                    placeholder="Engineering, Product, Design (comma separated)"
                    value={formData.hr_manager_fields.departments_overseen}
                    onChange={(e) => handleNestedChange('hr_manager_fields', 'departments_overseen', e.target.value)}
                    data-testid="departments-input"
                  />
                </div>

                <div className="col-span-2 space-y-2">
                  <Label className="text-slate-700 font-medium">{t('workExperience')}</Label>
                  <Input
                    placeholder="e.g., 5 years in HR Management"
                    value={formData.hr_manager_fields.work_experience}
                    onChange={(e) => handleNestedChange('hr_manager_fields', 'work_experience', e.target.value)}
                    data-testid="experience-input"
                  />
                </div>

                <div className="col-span-2 space-y-2">
                  <Label className="text-slate-700 font-medium">{t('certifications')}</Label>
                  <Input
                    placeholder="SHRM-CP, PHR (comma separated)"
                    value={formData.hr_manager_fields.certifications}
                    onChange={(e) => handleNestedChange('hr_manager_fields', 'certifications', e.target.value)}
                    data-testid="certifications-input"
                  />
                </div>

                <div className="col-span-2 space-y-2">
                  <Label className="text-slate-700 font-medium">{t('emergencyContact')}</Label>
                  <Input
                    placeholder="+91 9876543210"
                    value={formData.hr_manager_fields.emergency_contact}
                    onChange={(e) => handleNestedChange('hr_manager_fields', 'emergency_contact', e.target.value)}
                    data-testid="emergency-contact-input"
                  />
                </div>
              </div>
            </div>
          );
        }
        return null;

      default:
        return null;
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 min-h-screen w-full overflow-hidden" data-testid="signup-page">
      {/* Left Panel - Image */}
      <div className="hidden lg:flex flex-col justify-between p-12 bg-slate-900 relative overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ 
            backgroundImage: 'url(https://images.unsplash.com/photo-1758691736975-9f7f643d178e?crop=entropy&cs=srgb&fm=jpg&q=85)',
          }}
        />
        <div className="absolute inset-0 auth-overlay" />
        
        <div className="relative z-20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-white font-['Manrope']">HR Nexus</span>
          </div>
        </div>
        
        <div className="relative z-20 space-y-6">
          <blockquote className="text-2xl font-medium text-white font-['Manrope'] leading-relaxed">
            "Join thousands of professionals managing their HR operations efficiently."
          </blockquote>
          <div className="flex items-center gap-4">
            <div className="flex -space-x-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="w-10 h-10 rounded-full bg-slate-700 border-2 border-slate-900" />
              ))}
            </div>
            <span className="text-slate-300">500+ companies trust us</span>
          </div>
        </div>
        
        <div className="relative z-20 flex items-center gap-4 text-sm text-slate-400">
          <span>© 2024 HR Nexus</span>
          <span>•</span>
          <span>All rights reserved</span>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex items-center justify-center p-8 bg-slate-50 overflow-y-auto">
        <div className="w-full max-w-lg space-y-6">
          {/* Language Selector */}
          <div className="flex justify-end">
            <Select value={language} onValueChange={changeLanguage}>
              <SelectTrigger className="w-32" data-testid="language-selector">
                <Globe className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="english">English</SelectItem>
                <SelectItem value="hindi">हिंदी</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-slate-900 font-['Manrope']">HR Nexus</span>
          </div>

          <Card className="border-slate-200 shadow-lg">
            <CardHeader className="space-y-1 text-center pb-4">
              <CardTitle className="text-2xl font-bold tracking-tight font-['Manrope']">
                {t('joinTeam')}
              </CardTitle>
              <CardDescription className="text-slate-500">
                {t('createAccountDesc')}
              </CardDescription>
              
              {/* Step Indicator */}
              <div className="flex items-center justify-center gap-2 pt-4">
                {[1, 2, 3].map((s) => (
                  <div
                    key={s}
                    className={`h-2 rounded-full transition-all ${
                      s === step ? 'w-8 bg-blue-600' : s < step ? 'w-2 bg-blue-600' : 'w-2 bg-slate-200'
                    }`}
                  />
                ))}
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit}>
                {renderStep()}

                <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-100">
                  {step > 1 ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setStep(step - 1)}
                      className="gap-2"
                      data-testid="back-btn"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Back
                    </Button>
                  ) : (
                    <div />
                  )}
                  
                  {step < 3 ? (
                    <Button
                      type="button"
                      onClick={() => setStep(step + 1)}
                      className="bg-blue-700 hover:bg-blue-800 gap-2 btn-hover-lift"
                      disabled={step === 1 && !formData.role}
                      data-testid="next-btn"
                    >
                      Next
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  ) : (
                    <Button
                      type="submit"
                      className="bg-blue-700 hover:bg-blue-800 btn-hover-lift"
                      disabled={loading}
                      data-testid="signup-submit-btn"
                    >
                      {loading ? (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Creating account...</span>
                        </div>
                      ) : (
                        t('createAccount')
                      )}
                    </Button>
                  )}
                </div>
              </form>

              <div className="mt-6 text-center text-sm">
                <span className="text-slate-500">{t('hasAccount')} </span>
                <Link 
                  to="/login" 
                  className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
                  data-testid="login-link"
                >
                  {t('login')}
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Signup;
