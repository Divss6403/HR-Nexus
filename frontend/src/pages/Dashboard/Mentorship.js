import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Avatar, AvatarFallback } from '../../components/ui/avatar';
import { toast } from 'sonner';
import { Navigate } from 'react-router-dom';
import {
  Users, UserPlus, Search, Briefcase, Building2,
  CheckCircle2, AlertCircle, ArrowRight, UserCog, Shield
} from 'lucide-react';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Mentorship = () => {
  const { user } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [interns, setInterns] = useState([]);
  const [unassignedInterns, setUnassignedInterns] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedIntern, setSelectedIntern] = useState('');
  const [assigning, setAssigning] = useState(false);

  const fetchData = async () => {
    try {
      const [empRes, assignRes, unassignedRes] = await Promise.all([
        axios.get(`${API_URL}/users/employees`),
        axios.get(`${API_URL}/mentorship/assignments`),
        axios.get(`${API_URL}/mentorship/unassigned-interns`)
      ]);

      setEmployees(empRes.data);
      setAssignments(assignRes.data.employees || []);
      setUnassignedInterns(unassignedRes.data);
      
      // Get all interns for the list
      const internsRes = await axios.get(`${API_URL}/users/interns`);
      setInterns(internsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load mentorship data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'hr_manager') {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [user?.role]);

  // Redirect non-HR users
  if (!loading && user?.role !== 'hr_manager') {
    return <Navigate to="/dashboard" replace />;
  }

  const handleAssignMentor = async () => {
    if (!selectedEmployee || !selectedIntern) {
      toast.error('Please select both employee and intern');
      return;
    }

    setAssigning(true);
    try {
      await axios.post(`${API_URL}/mentorship/assign`, {
        employee_id: selectedEmployee,
        intern_id: selectedIntern
      });
      toast.success('Intern assigned to mentor successfully');
      setSelectedEmployee('');
      setSelectedIntern('');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to assign mentor');
    } finally {
      setAssigning(false);
    }
  };

  const handleAppointMentor = async (employeeId) => {
    try {
      await axios.put(`${API_URL}/mentorship/appoint-mentor/${employeeId}`);
      toast.success('Employee appointed as mentor');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to appoint mentor');
    }
  };

  const filteredAssignments = assignments.filter(emp =>
    emp.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.employee_fields?.department?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="mentorship-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 font-['Manrope'] flex items-center gap-2">
            <Shield className="w-7 h-7 text-blue-600" />
            Mentorship & Appointment Management
          </h2>
          <p className="text-slate-500 mt-1">
            Manage employee mentors and intern assignments
          </p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="dashboard-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{employees.length}</p>
                <p className="text-sm text-slate-500">Total Employees</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="dashboard-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-emerald-100 flex items-center justify-center">
                <UserCog className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {employees.filter(e => e.is_mentor).length}
                </p>
                <p className="text-sm text-slate-500">Active Mentors</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="dashboard-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                <Briefcase className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{interns.length}</p>
                <p className="text-sm text-slate-500">Total Interns</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="dashboard-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-amber-100 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{unassignedInterns.length}</p>
                <p className="text-sm text-slate-500">Unassigned Interns</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Assign Mentor Panel */}
        <Card className="dashboard-card lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-slate-900 font-['Manrope'] flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-blue-600" />
              Assign Intern to Mentor
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm text-slate-700">Select Employee (Mentor)</Label>
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Choose employee..." />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      <div className="flex items-center gap-2">
                        <span>{emp.full_name}</span>
                        {emp.is_mentor && (
                          <span className="text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">Mentor</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedEmployee && (() => {
                const emp = employees.find(e => e.id === selectedEmployee);
                return emp && (
                  <div className="mt-2 p-3 bg-slate-50 rounded-lg text-sm">
                    <p><span className="text-slate-500">Department:</span> {emp.employee_fields?.department || 'N/A'}</p>
                    <p><span className="text-slate-500">Designation:</span> {emp.employee_fields?.designation || 'N/A'}</p>
                    <p><span className="text-slate-500">Current Interns:</span> {emp.intern_count || 0}/15</p>
                  </div>
                );
              })()}
            </div>

            <div>
              <Label className="text-sm text-slate-700">Select Intern</Label>
              <Select value={selectedIntern} onValueChange={setSelectedIntern}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Choose intern..." />
                </SelectTrigger>
                <SelectContent>
                  {unassignedInterns.map((intern) => (
                    <SelectItem key={intern.id} value={intern.id}>
                      {intern.full_name}
                    </SelectItem>
                  ))}
                  {unassignedInterns.length === 0 && (
                    <div className="px-2 py-3 text-sm text-slate-500 text-center">
                      All interns are assigned
                    </div>
                  )}
                </SelectContent>
              </Select>
              {selectedIntern && (() => {
                const intern = unassignedInterns.find(i => i.id === selectedIntern);
                return intern && (
                  <div className="mt-2 p-3 bg-slate-50 rounded-lg text-sm">
                    <p><span className="text-slate-500">Area:</span> {intern.intern_fields?.area_of_interest || 'N/A'}</p>
                    <p><span className="text-slate-500">Institution:</span> {intern.intern_fields?.institution || 'N/A'}</p>
                  </div>
                );
              })()}
            </div>

            <Button
              onClick={handleAssignMentor}
              disabled={!selectedEmployee || !selectedIntern || assigning}
              className="w-full bg-blue-700 hover:bg-blue-800"
            >
              {assigning ? 'Assigning...' : 'Assign Intern to Mentor'}
            </Button>
          </CardContent>
        </Card>

        {/* Mentor List */}
        <Card className="dashboard-card lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-slate-900 font-['Manrope'] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                Mentors & Assigned Groups
              </div>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 w-48"
                />
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredAssignments.length > 0 ? (
                filteredAssignments.map((employee) => (
                  <div
                    key={employee.id}
                    className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarFallback className="bg-blue-600 text-white">
                            {employee.full_name?.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-slate-900">{employee.full_name}</p>
                            {employee.is_mentor && (
                              <span className="badge badge-success">Mentor</span>
                            )}
                          </div>
                          <p className="text-sm text-slate-500">
                            {employee.employee_fields?.department || 'No Department'} • {employee.employee_fields?.designation || 'Employee'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-slate-900">{employee.intern_count || 0}</p>
                        <p className="text-xs text-slate-500">Interns</p>
                      </div>
                    </div>

                    {/* Assigned Interns */}
                    {employee.assigned_interns && employee.assigned_interns.length > 0 ? (
                      <div className="mt-3 pt-3 border-t border-slate-100">
                        <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Assigned Interns</p>
                        <div className="flex flex-wrap gap-2">
                          {employee.assigned_interns.map((intern) => (
                            <div
                              key={intern.id}
                              className="flex items-center gap-2 px-2 py-1 bg-slate-100 rounded-full text-sm"
                            >
                              <Avatar className="w-5 h-5">
                                <AvatarFallback className="bg-purple-600 text-white text-xs">
                                  {intern.full_name?.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-slate-700">{intern.full_name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="mt-3 pt-3 border-t border-slate-100">
                        <p className="text-sm text-slate-400 text-center py-2">No interns assigned</p>
                      </div>
                    )}

                    {!employee.is_mentor && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAppointMentor(employee.id)}
                        className="mt-3 w-full"
                      >
                        Appoint as Mentor
                      </Button>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <Users className="w-12 h-12 mx-auto text-slate-300 mb-2" />
                  <p>No employees found</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Mentorship;
