import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import Card from '../../components/Card';
import { 
  Factory, 
  CheckCircle, 
  Clock, 
  Download,
  Filter,
  RefreshCw,
  Mail,
  Users,
  Package
} from 'lucide-react';

const ManufacturingReports = () => {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [reports, setReports] = useState({
    summary: null,
    statusDistribution: null,
    topEmployees: null,
    topMaterials: null
  });
  const [sendLoading, setSendLoading] = useState(false);

  useEffect(() => {
    fetchReport();
  }, [dateRange]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`/api/reports/generate/manufacturing?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`);
      setReports(response.data.data);
    } catch (error) {
      toast.error('Failed to fetch manufacturing report');
      console.error('Report fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDateRangeChange = (field, value) => {
    setDateRange(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const exportReport = async () => {
    try {
      const response = await axios.get(`/api/reports/export/manufacturing?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `manufacturing-report-${dateRange.startDate}-to-${dateRange.endDate}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('Manufacturing report exported successfully');
    } catch (error) {
      toast.error('Failed to export manufacturing report');
    }
  };

  const sendReport = async () => {
    setSendLoading(true);
    try {
      const reportData = [
        {
          'Total Orders': reports.summary?.totalOrders || 0,
          'Completed Orders': reports.summary?.completedOrders || 0,
          'Total Quantity': reports.summary?.totalQuantity || 0,
          'Total Material Cost': `$${reports.summary?.totalMaterialCost?.toLocaleString() || 0}`,
          'Average Production Time': `${reports.summary?.averageProductionTime?.toFixed(2) || 0} hours`,
          'Period': `${dateRange.startDate} to ${dateRange.endDate}`
        }
      ];

      const response = await axios.post('/api/reports/send', {
        module: 'manufacturing',
        reportData: reportData
      });

      if (response.data.success) {
        toast.success(response.data.message || 'Report sent successfully');
      } else {
        toast.error(response.data.message || 'Failed to send report');
      }
    } catch (error) {
      console.error('Send report error:', error);
      toast.error('Failed to send report');
    } finally {
      setSendLoading(false);
    }
  };

  const StatCard = ({ title, value, icon: Icon, color, subtitle }) => (
    <Card className="dark:bg-gradient-to-br dark:from-slate-800 dark:to-slate-900">
      <div className="p-5">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className={`p-3 rounded-md ${color.includes('blue') ? 'bg-blue-100 dark:bg-blue-500/20' : color.includes('green') ? 'bg-green-100 dark:bg-green-500/20' : color.includes('purple') ? 'bg-purple-100 dark:bg-purple-500/20' : 'bg-orange-100 dark:bg-orange-500/20'}`}>
              <Icon className={`h-6 w-6 ${color}`} />
            </div>
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">{title}</dt>
              <dd className="text-lg font-medium text-gray-900 dark:text-white">{value}</dd>
              {subtitle && <dd className="text-sm text-gray-500 dark:text-gray-400">{subtitle}</dd>}
            </dl>
          </div>
        </div>
      </div>
    </Card>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Manufacturing Reports</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Production analytics and efficiency insights
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={fetchReport}
            className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-slate-600 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
          <button
            onClick={sendReport}
            disabled={sendLoading}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 disabled:opacity-50 transition-colors"
          >
            <Mail className="h-4 w-4 mr-2" />
            {sendLoading ? 'Sending...' : 'Send Report'}
          </button>
          <button
            onClick={exportReport}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 transition-colors"
          >
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </button>
        </div>
      </div>

      {/* Date Range Filter */}
      <Card>
        <div className="flex items-center space-x-4">
          <Filter className="h-5 w-5 text-gray-400 dark:text-gray-500" />
          <div className="flex space-x-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Start Date</label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => handleDateRangeChange('startDate', e.target.value)}
                className="mt-1 block w-full border border-gray-300 dark:border-slate-600 rounded-md shadow-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-primary-500 focus:border-primary-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">End Date</label>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => handleDateRangeChange('endDate', e.target.value)}
                className="mt-1 block w-full border border-gray-300 dark:border-slate-600 rounded-md shadow-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-primary-500 focus:border-primary-500 transition-colors"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Orders"
          value={reports.summary?.totalOrders || '0'}
          icon={Factory}
          color="text-blue-600"
          subtitle="All production orders"
        />
        <StatCard
          title="Completed Orders"
          value={reports.summary?.completedOrders || '0'}
          icon={CheckCircle}
          color="text-green-600"
          subtitle="Finished successfully"
        />
        <StatCard
          title="Total Quantity"
          value={reports.summary?.totalQuantity || '0'}
          icon={Package}
          color="text-purple-600"
          subtitle="Units produced"
        />
        <StatCard
          title="Avg Production Time"
          value={`${reports.summary?.averageProductionTime?.toFixed(1) || '0'} hrs`}
          icon={Clock}
          color="text-orange-600"
          subtitle="Per order"
        />
      </div>

      {/* Status Distribution */}
      {reports.statusDistribution && (
        <Card>
          <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">
            Order Status Distribution
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Object.entries(reports.statusDistribution).map(([status, count]) => (
              <div key={status} className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className={`w-3 h-3 rounded-full ${
                      status === 'completed' ? 'bg-green-500' :
                      status === 'in-progress' ? 'bg-blue-500' :
                      status === 'pending' ? 'bg-yellow-500' :
                      'bg-gray-500'
                    }`}></div>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900 dark:text-white capitalize">{status}</p>
                    <p className="text-lg font-semibold text-gray-600 dark:text-gray-300">{count}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Top Employees */}
      {reports.topEmployees && reports.topEmployees.length > 0 && (
        <Card padding={false} className="overflow-hidden">
          <div className="px-4 py-5 sm:p-6 border-b border-gray-200 dark:border-slate-700">
            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">
              Top Performing Employees
            </h3>
          </div>
          <div className="overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
              <thead className="bg-gray-50 dark:bg-slate-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Employee ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Position</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Orders Completed</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Total Hours</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Avg Hours/Order</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                {reports.topEmployees.map((employee, index) => (
                  <tr key={index} className="hover:bg-gray-50 dark:hover:bg-slate-700/40">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{employee.employeeId}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{employee.position}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{employee.ordersCompleted}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{employee.totalHours.toFixed(1)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{employee.averageHoursPerOrder.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Top Materials */}
      {reports.topMaterials && reports.topMaterials.length > 0 && (
        <Card padding={false} className="overflow-hidden">
          <div className="px-4 py-5 sm:p-6 border-b border-gray-200 dark:border-slate-700">
            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">
              Most Used Materials
            </h3>
          </div>
          <div className="overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
              <thead className="bg-gray-50 dark:bg-slate-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Material</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">SKU</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Total Quantity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Total Cost</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                {reports.topMaterials.map((material, index) => (
                  <tr key={index} className="hover:bg-gray-50 dark:hover:bg-slate-700/40">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{material.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{material.sku}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{material.totalQuantity}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">${material.totalCost.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};

export default ManufacturingReports;

