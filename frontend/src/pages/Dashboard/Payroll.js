import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../utils/translations';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { 
  Table, TableBody, TableCell, TableHead, 
  TableHeader, TableRow 
} from '../../components/ui/table';
import { toast } from 'sonner';
import { 
  DollarSign, Download, Calendar, CreditCard, 
  TrendingUp, CheckCircle2, Clock, FileText
} from 'lucide-react';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Payroll = () => {
  const { user, language } = useAuth();
  const { t } = useTranslation(language);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPayrollRecords();
  }, []);

  const fetchPayrollRecords = async () => {
    try {
      const response = await axios.get(`${API_URL}/payroll/my-records`);
      setRecords(response.data);
    } catch (error) {
      console.error('Error fetching payroll:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const totalEarnings = records
    .filter(r => r.status === 'paid')
    .reduce((sum, r) => sum + r.amount, 0);

  const pendingAmount = records
    .filter(r => r.status === 'pending')
    .reduce((sum, r) => sum + r.amount, 0);

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
            {user?.role === 'intern' ? 'View your stipend details and payment history' : 'View your salary details and payment history'}
          </p>
        </div>
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

      {/* Stipend/Salary Details */}
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
                <span className="text-slate-500">Monthly Amount</span>
                <span className="font-semibold text-slate-900">{formatCurrency(25000)}</span>
              </div>
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
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">IFSC Code</span>
                <span className="font-semibold text-slate-900">
                  {user?.employee_fields?.bank_ifsc || 'HDFC0001234'}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment History */}
      <Card className="dashboard-card" data-testid="payment-history-card">
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
                    <TableHead>Amount</TableHead>
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
                      <TableCell>{formatCurrency(record.amount)}</TableCell>
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
    </div>
  );
};

export default Payroll;
