import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../utils/translations';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
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
  Table, TableBody, TableCell, TableHead, 
  TableHeader, TableRow 
} from '../../components/ui/table';
import { toast } from 'sonner';
import { 
  DollarSign, Download, Calendar, CreditCard, 
  TrendingUp, CheckCircle2, Clock, FileText, Plus, Users, Edit2
} from 'lucide-react';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const Payroll = () => {
  const { user, language } = useAuth();
  const { t } = useTranslation(language);
  const [records, setRecords] = useState([]);
  const [allRecords, setAllRecords] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [newPayroll, setNewPayroll] = useState({
    user_id: '',
    month: MONTHS[new Date().getMonth()],
    year: new Date().getFullYear().toString(),
    base_amount: '',
    bonus: '0',
    deductions: '0',
    notes: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const myRecordsRes = await axios.get(`${API_URL}/payroll/my-records`);
      setRecords(myRecordsRes.data);

      if (user?.role === 'hr_manager') {
        const [allRecordsRes, usersRes] = await Promise.all([
          axios.get(`${API_URL}/payroll/all`),
          axios.get(`${API_URL}/users`)
        ]);
        setAllRecords(allRecordsRes.data);
        setUsers(usersRes.data.filter(u => u.role !== 'hr_manager'));
      }
    } catch (error) {
      console.error('Error fetching payroll:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePayroll = async () => {
    if (!newPayroll.user_id || !newPayroll.base_amount) {
      toast.error('Please fill all required fields');
      return;
    }
    try {
      await axios.post(`${API_URL}/payroll`, newPayroll);
      toast.success('Payroll record created successfully');
      setDialogOpen(false);
      setNewPayroll({
        user_id: '',
        month: MONTHS[new Date().getMonth()],
        year: new Date().getFullYear().toString(),
        base_amount: '',
        bonus: '0',
        deductions: '0',
        notes: ''
      });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create payroll');
    }
  };

  const handleUpdatePayroll = async () => {
    try {
      await axios.put(`${API_URL}/payroll/${selectedRecord.id}`, {
        base_amount: selectedRecord.base_amount,
        bonus: selectedRecord.bonus,
        deductions: selectedRecord.deductions,
        notes: selectedRecord.notes
      });
      toast.success('Payroll updated successfully');
      setEditDialogOpen(false);
      setSelectedRecord(null);
      fetchData();
    } catch (error) {
      toast.error('Failed to update payroll');
    }
  };

  const handleMarkPaid = async (recordId) => {
    try {
      await axios.put(`${API_URL}/payroll/${recordId}/pay`);
      toast.success('Payment marked as paid');
      fetchData();
    } catch (error) {
      toast.error('Failed to update payment status');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const totalEarnings = records
    .filter(r => r.status === 'paid')
    .reduce((sum, r) => sum + (r.net_amount || r.amount || 0), 0);

  const pendingAmount = records
    .filter(r => r.status === 'pending')
    .reduce((sum, r) => sum + (r.net_amount || r.amount || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="payroll-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 font-['Manrope']">
            {t('payroll')}
          </h2>
          <p className="text-slate-500 mt-1">
            {user?.role === 'hr_manager' 
              ? 'Manage payroll for all employees and interns'
              : user?.role === 'intern' ? 'View your stipend details and payment history' : 'View your salary details and payment history'
            }
          </p>
        </div>
        {user?.role === 'hr_manager' && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-700 hover:bg-blue-800 gap-2" data-testid="create-payroll-btn">
                <Plus className="w-4 h-4" />
                Create Payroll
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Payroll Record</DialogTitle>
                <DialogDescription>
                  Add a new payroll entry for an employee or intern
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Employee/Intern *</Label>
                  <Select 
                    value={newPayroll.user_id} 
                    onValueChange={(v) => setNewPayroll({ ...newPayroll, user_id: v })}
                  >
                    <SelectTrigger data-testid="payroll-user-select">
                      <SelectValue placeholder="Select person" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map(u => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.full_name} ({u.role})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Month *</Label>
                    <Select 
                      value={newPayroll.month} 
                      onValueChange={(v) => setNewPayroll({ ...newPayroll, month: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MONTHS.map(m => (
                          <SelectItem key={m} value={m}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Year *</Label>
                    <Select 
                      value={newPayroll.year} 
                      onValueChange={(v) => setNewPayroll({ ...newPayroll, year: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2024">2024</SelectItem>
                        <SelectItem value="2025">2025</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Base Amount (₹) *</Label>
                  <Input
                    type="number"
                    placeholder="25000"
                    value={newPayroll.base_amount}
                    onChange={(e) => setNewPayroll({ ...newPayroll, base_amount: e.target.value })}
                    data-testid="payroll-amount-input"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Bonus (₹)</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={newPayroll.bonus}
                      onChange={(e) => setNewPayroll({ ...newPayroll, bonus: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Deductions (₹)</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={newPayroll.deductions}
                      onChange={(e) => setNewPayroll({ ...newPayroll, deductions: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    placeholder="Any additional notes..."
                    value={newPayroll.notes}
                    onChange={(e) => setNewPayroll({ ...newPayroll, notes: e.target.value })}
                  />
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">Net Amount:</span>
                    <span className="text-lg font-bold text-slate-900">
                      {formatCurrency(
                        (parseFloat(newPayroll.base_amount) || 0) + 
                        (parseFloat(newPayroll.bonus) || 0) - 
                        (parseFloat(newPayroll.deductions) || 0)
                      )}
                    </span>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreatePayroll}
                  className="bg-blue-700 hover:bg-blue-800"
                  data-testid="save-payroll-btn"
                >
                  Create Record
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="dashboard-card card-hover" data-testid="total-earnings-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 mb-1">Total Earnings</p>
                <p className="text-2xl font-bold text-slate-900">{formatCurrency(totalEarnings)}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-emerald-100 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="dashboard-card card-hover" data-testid="pending-amount-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 mb-1">Pending Amount</p>
                <p className="text-2xl font-bold text-slate-900">{formatCurrency(pendingAmount)}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-amber-100 flex items-center justify-center">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="dashboard-card card-hover" data-testid="payment-method-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 mb-1">Payment Method</p>
                <p className="text-lg font-bold text-slate-900">Bank Transfer</p>
                <p className="text-xs text-slate-400 mt-1">
                  ****{user?.employee_fields?.bank_account?.slice(-4) || '1234'}
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* HR Manager View - Tabs */}
      {user?.role === 'hr_manager' ? (
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="bg-slate-100 p-1 rounded-lg">
            <TabsTrigger value="all" className="data-[state=active]:bg-white gap-2">
              <Users className="w-4 h-4" />
              All Payroll Records
            </TabsTrigger>
            <TabsTrigger value="my" className="data-[state=active]:bg-white">
              My Records
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-6">
            <Card className="dashboard-card">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-slate-900 font-['Manrope'] flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-blue-600" />
                  All Payroll Records
                </CardTitle>
              </CardHeader>
              <CardContent>
                {allRecords.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Employee</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Period</TableHead>
                          <TableHead>Base</TableHead>
                          <TableHead>Bonus</TableHead>
                          <TableHead>Deductions</TableHead>
                          <TableHead>Net Amount</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {allRecords.map((record) => (
                          <TableRow key={record.id}>
                            <TableCell className="font-medium">{record.user_name}</TableCell>
                            <TableCell className="capitalize">{record.user_role}</TableCell>
                            <TableCell>{record.month} {record.year}</TableCell>
                            <TableCell>{formatCurrency(record.base_amount)}</TableCell>
                            <TableCell className="text-emerald-600">+{formatCurrency(record.bonus)}</TableCell>
                            <TableCell className="text-rose-600">-{formatCurrency(record.deductions)}</TableCell>
                            <TableCell className="font-semibold">{formatCurrency(record.net_amount)}</TableCell>
                            <TableCell>
                              <span className={`badge ${
                                record.status === 'paid' ? 'badge-success' : 'badge-warning'
                              }`}>
                                {record.status === 'paid' ? (
                                  <span className="flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" />
                                    Paid
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    Pending
                                  </span>
                                )}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => {
                                    setSelectedRecord(record);
                                    setEditDialogOpen(true);
                                  }}
                                >
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                                {record.status === 'pending' && (
                                  <Button 
                                    size="sm"
                                    className="bg-emerald-600 hover:bg-emerald-700"
                                    onClick={() => handleMarkPaid(record.id)}
                                  >
                                    Mark Paid
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <FileText className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                    <p className="text-slate-500">No payroll records yet</p>
                    <p className="text-sm text-slate-400 mt-1">
                      Create your first payroll record using the button above
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="my" className="mt-6">
            <PayrollTable records={records} formatCurrency={formatCurrency} />
          </TabsContent>
        </Tabs>
      ) : (
        <PayrollTable records={records} formatCurrency={formatCurrency} user={user} />
      )}

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Payroll Record</DialogTitle>
            <DialogDescription>
              Update payroll details for {selectedRecord?.user_name}
            </DialogDescription>
          </DialogHeader>
          {selectedRecord && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Base Amount (₹)</Label>
                <Input
                  type="number"
                  value={selectedRecord.base_amount}
                  onChange={(e) => setSelectedRecord({ ...selectedRecord, base_amount: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Bonus (₹)</Label>
                  <Input
                    type="number"
                    value={selectedRecord.bonus}
                    onChange={(e) => setSelectedRecord({ ...selectedRecord, bonus: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Deductions (₹)</Label>
                  <Input
                    type="number"
                    value={selectedRecord.deductions}
                    onChange={(e) => setSelectedRecord({ ...selectedRecord, deductions: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={selectedRecord.notes || ''}
                  onChange={(e) => setSelectedRecord({ ...selectedRecord, notes: e.target.value })}
                />
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Net Amount:</span>
                  <span className="text-lg font-bold text-slate-900">
                    {formatCurrency(
                      (selectedRecord.base_amount || 0) + 
                      (selectedRecord.bonus || 0) - 
                      (selectedRecord.deductions || 0)
                    )}
                  </span>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleUpdatePayroll}
              className="bg-blue-700 hover:bg-blue-800"
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Payroll Table Component
const PayrollTable = ({ records, formatCurrency, user }) => (
  <>
    {/* Salary/Stipend Details */}
    <Card className="dashboard-card" data-testid="salary-details-card">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-slate-900 font-['Manrope'] flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-blue-600" />
          {user?.role === 'intern' ? 'Stipend Details' : 'Salary Details'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">Payment Frequency</span>
              <span className="font-semibold text-slate-900">Monthly</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">Payment Date</span>
              <span className="font-semibold text-slate-900">1st of every month</span>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">Bank Name</span>
              <span className="font-semibold text-slate-900">HDFC Bank</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">Account Number</span>
              <span className="font-semibold text-slate-900">
                ****{user?.employee_fields?.bank_account?.slice(-4) || '1234'}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>

    {/* Payment History */}
    <Card className="dashboard-card mt-6" data-testid="payment-history-card">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-slate-900 font-['Manrope'] flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-600" />
          Payment History
        </CardTitle>
      </CardHeader>
      <CardContent>
        {records.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead>Base Amount</TableHead>
                  <TableHead>Bonus</TableHead>
                  <TableHead>Deductions</TableHead>
                  <TableHead>Net Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payment Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">
                      {record.month} {record.year}
                    </TableCell>
                    <TableCell>{formatCurrency(record.base_amount || record.amount)}</TableCell>
                    <TableCell className="text-emerald-600">+{formatCurrency(record.bonus || 0)}</TableCell>
                    <TableCell className="text-rose-600">-{formatCurrency(record.deductions || 0)}</TableCell>
                    <TableCell className="font-semibold">{formatCurrency(record.net_amount || record.amount)}</TableCell>
                    <TableCell>
                      <span className={`badge ${
                        record.status === 'paid' ? 'badge-success' : 'badge-warning'
                      }`}>
                        {record.status === 'paid' ? (
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Paid
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Pending
                          </span>
                        )}
                      </span>
                    </TableCell>
                    <TableCell>
                      {record.payment_date 
                        ? new Date(record.payment_date).toLocaleDateString() 
                        : '-'
                      }
                    </TableCell>
                    <TableCell className="text-right">
                      {record.status === 'paid' && (
                        <Button variant="outline" size="sm" className="gap-1">
                          <Download className="w-3 h-3" />
                          Slip
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500">No payment records yet</p>
            <p className="text-sm text-slate-400 mt-1">
              Your payment history will appear here once processed
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  </>
);

export default Payroll;
