import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { DollarSign, FileText, TrendingUp, TrendingDown, Wallet, Activity, ArrowUp, ArrowDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import Card from '../../components/Card';
import ExpensesPieChart from '../../components/Finance/ExpensesPieChart';

let financeDashboardCache = null; // PERSISTENT CACHE FOR ZERO-RELOAD

const FinanceDashboard = () => {
  const { t } = useTranslation();
  const [dashboardData, setDashboardData] = useState(financeDashboardCache?.dashboardData || null);
  const [monthComparison, setMonthComparison] = useState(financeDashboardCache?.monthComparison || null);
  const [loading, setLoading] = useState(!financeDashboardCache);
  const [loadingComparison, setLoadingComparison] = useState(!financeDashboardCache);

  useEffect(() => {
    fetchDashboard();
    fetchMonthComparison();
  }, []);

  const fetchDashboard = async () => {
    try {
      const response = await axios.get('/api/finance/dashboard');
      const data = response.data.data;
      setDashboardData(data);

      // Update Cache
      financeDashboardCache = {
        ...(financeDashboardCache || {}),
        dashboardData: data
      };
    } catch (error) {
      console.error('Error fetching dashboard:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const fetchMonthComparison = async () => {
    try {
      const response = await axios.get('/api/finance/month-comparison');
      const data = response.data.data;
      setMonthComparison(data);

      // Update Cache
      financeDashboardCache = {
        ...(financeDashboardCache || {}),
        monthComparison: data
      };
    } catch (error) {
      console.error('Error fetching month comparison:', error);
    } finally {
      setLoadingComparison(false);
    }
  };

  const formatPercentageChange = (value) => {
    if (value === null || value === undefined || isNaN(value)) return '0%';
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  };

  const getChangeColor = (value) => {
    if (value >= 0) return 'text-green-600';
    return 'text-red-600';
  };

  const getChangeIcon = (value) => {
    if (value >= 0) return <ArrowUp className="h-3 w-3" />;
    return <ArrowDown className="h-3 w-3" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 dark:text-gray-400">{t('common.loading')}</div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 dark:text-gray-400">{t('common.noData')}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 transition-colors duration-300">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('finance.dashboard.title')}</h1>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {/* Total Balance */}
        <Card className="dark:bg-gradient-to-br dark:from-slate-800 dark:to-slate-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('finance.dashboard.totalBalance')}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                {dashboardData.totalBalance.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })} EGP
              </p>
              {monthComparison && (
                <p className={`text-xs mt-1 flex items-center ${getChangeColor(monthComparison.percentageChange.balance)} dark:text-green-400`}>
                  {getChangeIcon(monthComparison.percentageChange.balance)}
                  <span className="ml-1">
                    {formatPercentageChange(monthComparison.percentageChange.balance)} {t('finance.dashboard.vsLastMonth')}
                  </span>
                </p>
              )}
            </div>
            <div className="bg-blue-100 dark:bg-blue-500/20 rounded-full p-3">
              <Wallet className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </Card>

        {/* Unpaid Invoices */}
        <Card className="dark:bg-gradient-to-br dark:from-slate-800 dark:to-slate-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('finance.dashboard.unpaidInvoices')}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                {dashboardData.totalUnpaid}
              </p>
            </div>
            <div className="bg-red-100 dark:bg-red-500/20 rounded-full p-3">
              <FileText className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
          </div>
        </Card>

        {/* Paid Invoices */}
        <Card className="dark:bg-gradient-to-br dark:from-slate-800 dark:to-slate-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('finance.dashboard.paidInvoices')}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                {dashboardData.totalPaid}
              </p>
            </div>
            <div className="bg-green-100 dark:bg-green-500/20 rounded-full p-3">
              <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </Card>

        {/* Monthly Expenses */}
        <Card className="dark:bg-gradient-to-br dark:from-slate-800 dark:to-slate-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('finance.dashboard.monthlyExpenses')}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                {dashboardData.totalExpenses.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })} EGP
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {dashboardData.expensesCount} {t('finance.dashboard.expensesCount')}
              </p>
              {monthComparison && (
                <p className={`text-xs mt-1 flex items-center ${getChangeColor(monthComparison.percentageChange.expenses)} dark:text-orange-400`}>
                  {getChangeIcon(monthComparison.percentageChange.expenses)}
                  <span className="ml-1">
                    {formatPercentageChange(monthComparison.percentageChange.expenses)} {t('finance.dashboard.vsLastMonth')}
                  </span>
                </p>
              )}
            </div>
            <div className="bg-orange-100 dark:bg-orange-500/20 rounded-full p-3">
              <TrendingDown className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
        </Card>

        {/* Net Cash Flow */}
        <Card className="dark:bg-gradient-to-br dark:from-slate-800 dark:to-slate-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('finance.dashboard.netCashFlow')}</p>
              <p
                className={`text-2xl font-bold mt-2 ${dashboardData.netCashFlow >= 0
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'
                  }`}
              >
                {dashboardData.netCashFlow >= 0 ? '+' : ''}
                {dashboardData.netCashFlow.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}{' '}
                EGP
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {t('finance.dashboard.income')}: {dashboardData.totalIncome?.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                }) || '0.00'} EGP
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t('finance.dashboard.outgoing')}: {dashboardData.totalOutgoing?.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                }) || '0.00'} EGP
              </p>
              {monthComparison && (
                <p className={`text-xs mt-1 flex items-center ${getChangeColor(monthComparison.percentageChange.netFlow)} dark:text-green-400`}>
                  {getChangeIcon(monthComparison.percentageChange.netFlow)}
                  <span className="ml-1">
                    {formatPercentageChange(monthComparison.percentageChange.netFlow)} {t('finance.dashboard.vsLastMonth')}
                  </span>
                </p>
              )}
            </div>
            <div
              className={`rounded-full p-3 ${dashboardData.netCashFlow >= 0
                ? 'bg-green-100 dark:bg-green-500/20'
                : 'bg-red-100 dark:bg-red-500/20'
                }`}
            >
              <Activity
                className={`h-6 w-6 ${dashboardData.netCashFlow >= 0
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'
                  }`}
              />
            </div>
          </div>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expenses Pie Chart */}
        <div className="lg:col-span-2">
          <ExpensesPieChart />
        </div>
      </div>

      {/* Recent Transactions */}
      <Card padding={false}>
        <div className="p-6 border-b border-gray-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Transactions</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
            <thead className="bg-gray-100 dark:bg-slate-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Bank Account
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
              {dashboardData.recentTransactions.length > 0 ? (
                dashboardData.recentTransactions.map((transaction) => (
                  <tr key={transaction._id} className="hover:bg-gray-50 dark:hover:bg-slate-700/40 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {new Date(transaction.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded-full ${transaction.direction === 'in'
                          ? 'bg-green-100 dark:bg-green-500/20 text-green-800 dark:text-green-400'
                          : 'bg-red-100 dark:bg-red-500/20 text-red-800 dark:text-red-400'
                          }`}
                      >
                        {transaction.direction === 'in' ? 'IN' : 'OUT'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                      {transaction.notes || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {transaction.bankAccount?.name || 'N/A'}
                    </td>
                    <td
                      className={`px-6 py-4 whitespace-nowrap text-sm font-medium text-right ${transaction.direction === 'in'
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-600 dark:text-red-400'
                        }`}
                    >
                      {transaction.direction === 'in' ? '+' : '-'}
                      {transaction.amount.toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}{' '}
                      EGP
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                    No transactions yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default FinanceDashboard;

