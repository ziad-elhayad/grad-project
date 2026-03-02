import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import Card from '../components/Card';
import {
  Users,
  ShoppingCart,
  ShoppingBag,
  Package,
  TrendingUp,
  Clock,
  Factory,
  Truck,
  UserCheck,
  AlertTriangle,
  DollarSign,
  Star
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import {
  LineChart as ForecastIcon,
  ChevronRight,
  Info,
  Layers
} from 'lucide-react';

let dashboardCache = null; // PERSISTENT CACHE FOR ZERO-RELOAD

const Dashboard = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [kpis, setKpis] = useState(dashboardCache?.kpis || null);
  const [recentActivities, setRecentActivities] = useState(dashboardCache?.activities || []);
  const [departmentChart, setDepartmentChart] = useState(dashboardCache?.chart || []);
  const [loading, setLoading] = useState(!dashboardCache);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      if (user?.role === 'admin') {
        // Admin gets comprehensive data from all departments
        const [kpisRes, activitiesRes, chartRes] = await Promise.all([
          axios.get('/api/dashboard/kpis'),
          axios.get('/api/dashboard/recent-activities'),
          axios.get('/api/dashboard/sales-chart?period=month')
        ]);

        setKpis(kpisRes.data.data);
        setRecentActivities(activitiesRes.data.data);
        setDepartmentChart(chartRes.data.data);

        // Update Cache
        dashboardCache = {
          kpis: kpisRes.data.data,
          activities: activitiesRes.data.data,
          chart: chartRes.data.data
        };
      } else {
        // Managers get department-specific data
        const [kpisRes, activitiesRes, chartRes] = await Promise.all([
          axios.get(`/api/dashboard/kpis?department=${user?.department}`),
          axios.get(`/api/dashboard/recent-activities?department=${user?.department}`),
          axios.get(`/api/dashboard/department-chart?department=${user?.department}&period=month`)
        ]);

        setKpis(kpisRes.data.data);
        setRecentActivities(activitiesRes.data.data);
        setDepartmentChart(chartRes.data.data);

        // Update Cache
        dashboardCache = {
          kpis: kpisRes.data.data,
          activities: activitiesRes.data.data,
          chart: chartRes.data.data
        };
      }
    } catch (error) {
      console.error('Dashboard data fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // Department-specific KPI cards
  const getDepartmentKPIs = () => {
    // Admin gets comprehensive overview of all departments
    if (user?.role === 'admin') {
      return [
        {
          title: t('mainDashboard.kpis.totalEmployees'),
          value: kpis?.employees?.total || 0,
          icon: Users,
          color: 'text-blue-600',
          bgColor: 'bg-blue-100'
        },
        {
          title: t('mainDashboard.kpis.salesRevenue'),
          value: `$${((kpis?.sales?.totalRevenue || 0)).toLocaleString()}`,
          icon: DollarSign,
          color: 'text-green-600',
          bgColor: 'bg-green-100'
        },
        {
          title: t('mainDashboard.kpis.totalProducts'),
          value: kpis?.inventory?.totalProducts || 0,
          icon: Package,
          color: 'text-purple-600',
          bgColor: 'bg-purple-100'
        },
        {
          title: t('mainDashboard.kpis.lowStockAlerts'),
          value: kpis?.inventory?.lowStockAlerts || 0,
          icon: AlertTriangle,
          color: 'text-red-600',
          bgColor: 'bg-red-100'
        },
        {
          title: t('mainDashboard.kpis.pendingOrders'),
          value: (kpis?.production?.pending || 0) + (kpis?.purchasing?.pending || 0),
          icon: Clock,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-100'
        },
        {
          title: t('mainDashboard.kpis.totalCustomers'),
          value: kpis?.customers?.total || 0,
          icon: UserCheck,
          color: 'text-indigo-600',
          bgColor: 'bg-indigo-100'
        },
        {
          title: t('mainDashboard.kpis.activeSuppliers'),
          value: kpis?.suppliers?.total || 0,
          icon: Truck,
          color: 'text-orange-600',
          bgColor: 'bg-orange-100'
        },
        {
          title: t('mainDashboard.kpis.topProduct'),
          value: kpis?.topProduct?.name || 'N/A',
          subtitle: kpis?.topProduct ? `${kpis.topProduct.totalQuantity} ${t('mainDashboard.kpis.sold')}` : t('mainDashboard.kpis.noSalesData'),
          icon: Star,
          color: 'text-pink-600',
          bgColor: 'bg-pink-100'
        }
      ];
    }

    // Managers get department-specific data
    const department = user?.department?.toLowerCase();

    switch (department) {
      case 'sales':
        return [
          {
            title: t('mainDashboard.kpis.totalRevenue'),
            value: `$${((kpis?.revenue || 0)).toLocaleString()}`,
            icon: DollarSign,
            color: 'text-green-600',
            bgColor: 'bg-green-100'
          },
          {
            title: t('mainDashboard.kpis.ordersThisMonth'),
            value: kpis?.orders || 0,
            icon: ShoppingCart,
            color: 'text-blue-600',
            bgColor: 'bg-blue-100'
          },
          {
            title: t('mainDashboard.kpis.activeCustomers'),
            value: kpis?.customers || 0,
            icon: UserCheck,
            color: 'text-indigo-600',
            bgColor: 'bg-indigo-100'
          },
          {
            title: 'Top Product',
            value: kpis?.topProduct?.name || 'N/A',
            subtitle: kpis?.topProduct ? `${kpis.topProduct.quantity} ${t('mainDashboard.kpis.sold')}` : t('mainDashboard.kpis.noSalesData'),
            icon: Star,
            color: 'text-orange-600',
            bgColor: 'bg-orange-100'
          }
        ];

      case 'purchasing':
        return [
          {
            title: t('mainDashboard.kpis.totalSpending'),
            value: `$${((kpis?.spending || 0)).toLocaleString()}`,
            icon: DollarSign,
            color: 'text-purple-600',
            bgColor: 'bg-purple-100'
          },
          {
            title: t('mainDashboard.kpis.purchaseOrders'),
            value: kpis?.orders || 0,
            icon: ShoppingBag,
            color: 'text-blue-600',
            bgColor: 'bg-blue-100'
          },
          {
            title: 'Active Suppliers',
            value: kpis?.suppliers || 0,
            icon: Truck,
            color: 'text-indigo-600',
            bgColor: 'bg-indigo-100'
          },
          {
            title: 'Pending Orders',
            value: kpis?.pending || 0,
            icon: Clock,
            color: 'text-yellow-600',
            bgColor: 'bg-yellow-100'
          }
        ];

      case 'hr':
        return [
          {
            title: t('mainDashboard.kpis.totalEmployees'),
            value: kpis?.employees || 0,
            icon: Users,
            color: 'text-blue-600',
            bgColor: 'bg-blue-100'
          },
          {
            title: t('mainDashboard.kpis.presentToday'),
            value: kpis?.present || 0,
            icon: UserCheck,
            color: 'text-green-600',
            bgColor: 'bg-green-100'
          },
          {
            title: t('mainDashboard.kpis.absentToday'),
            value: kpis?.absent || 0,
            icon: AlertTriangle,
            color: 'text-red-600',
            bgColor: 'bg-red-100'
          },
          {
            title: t('mainDashboard.kpis.newHiresThisMonth'),
            value: kpis?.newHires || 0,
            icon: TrendingUp,
            color: 'text-purple-600',
            bgColor: 'bg-purple-100'
          }
        ];

      case 'inventory':
        return [
          {
            title: t('mainDashboard.kpis.totalProducts'),
            value: kpis?.products || 0,
            icon: Package,
            color: 'text-blue-600',
            bgColor: 'bg-blue-100'
          },
          {
            title: t('mainDashboard.kpis.lowStockItems'),
            value: kpis?.lowStock || 0,
            icon: AlertTriangle,
            color: 'text-red-600',
            bgColor: 'bg-red-100'
          },
          {
            title: t('mainDashboard.kpis.totalValue'),
            value: `$${((kpis?.totalValue || 0)).toLocaleString()}`,
            icon: DollarSign,
            color: 'text-green-600',
            bgColor: 'bg-green-100'
          },
          {
            title: t('mainDashboard.kpis.recentMovements'),
            value: kpis?.movements || 0,
            icon: TrendingUp,
            color: 'text-purple-600',
            bgColor: 'bg-purple-100'
          }
        ];

      case 'manufacturing':
        return [
          {
            title: t('mainDashboard.kpis.productionOrders'),
            value: kpis?.orders || 0,
            icon: Factory,
            color: 'text-blue-600',
            bgColor: 'bg-blue-100'
          },
          {
            title: t('mainDashboard.kpis.completedToday'),
            value: kpis?.completed || 0,
            icon: UserCheck,
            color: 'text-green-600',
            bgColor: 'bg-green-100'
          },
          {
            title: t('mainDashboard.kpis.inProgress'),
            value: kpis?.inProgress || 0,
            icon: Clock,
            color: 'text-yellow-600',
            bgColor: 'bg-yellow-100'
          },
          {
            title: 'Efficiency Rate',
            value: `${kpis?.efficiency || 0}%`,
            icon: TrendingUp,
            color: 'text-purple-600',
            bgColor: 'bg-purple-100'
          }
        ];

      default:
        return [
          {
            title: t('mainDashboard.kpis.departmentOverview'),
            value: t('mainDashboard.kpis.noDataAvailable'),
            icon: Package,
            color: 'text-gray-600',
            bgColor: 'bg-gray-100'
          }
        ];
    }
  };

  const kpiCards = getDepartmentKPIs();

  const getActivityIcon = (type) => {
    switch (type) {
      case 'sales': return ShoppingCart;
      case 'production': return Factory;
      case 'purchasing': return Truck;
      default: return Clock;
    }
  };

  const getActivityColor = (type) => {
    switch (type) {
      case 'sales': return 'text-green-600';
      case 'production': return 'text-blue-600';
      case 'purchasing': return 'text-purple-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'in-progress': return 'text-blue-600 bg-blue-100';
      case 'confirmed': return 'text-green-600 bg-green-100';
      case 'shipped': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('mainDashboard.title')}</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {t('mainDashboard.description')}
        </p>
      </div>

      {/* Module Navigation Grid */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Layers className="w-5 h-5 text-primary-600" />
          {t('mainDashboard.modules.title')}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { id: 'hr', name: t('mainDashboard.modules.hr'), path: '/app/hr/dashboard', icon: Users, color: 'bg-blue-500' },
            { id: 'sales', name: t('mainDashboard.modules.sales'), path: '/app/sales/dashboard', icon: ShoppingCart, color: 'bg-green-500' },
            { id: 'inventory', name: t('mainDashboard.modules.inventory'), path: '/app/inventory/dashboard', icon: Package, color: 'bg-purple-500' },
            { id: 'manufacturing', name: t('mainDashboard.modules.manufacturing'), path: '/app/manufacturing/dashboard', icon: Factory, color: 'bg-orange-500' },
            { id: 'scm', name: t('mainDashboard.modules.purchasing'), path: '/app/scm/dashboard', icon: Truck, color: 'bg-indigo-500' },
            { id: 'crm', name: t('mainDashboard.modules.crm') || 'CRM', path: '/app/crm/dashboard', icon: UserCheck, color: 'bg-pink-500' },
            { id: 'finance', name: t('mainDashboard.modules.finance'), path: '/app/finance/dashboard', icon: DollarSign, color: 'bg-red-500' },
            { id: 'forecasting', name: t('mainDashboard.modules.forecasting'), path: '/app/forecasting', icon: ForecastIcon, color: 'bg-yellow-500' }
          ].filter(module => {
            // ROLE CHECK: ADMIN sees all, others see based on their assigned permissions
            if (user?.role === 'admin') return true;

            const permissionMap = {
              'hr': 'hr',
              'sales': 'sales',
              'inventory': 'inventory',
              'manufacturing': 'manufacturing',
              'scm': 'scm',
              'crm': 'crm',
              'finance': 'finance',
              'forecasting': 'forecasting'
            };

            // Fetch allowed modules from the centralized permission configuration
            const permissions = require('../config/permissions');
            const allowedModules = permissions.getUserAllowedModules(user);
            return allowedModules.includes(permissionMap[module.id]);
          }).map((module) => (
            <button
              key={module.id}
              onClick={() => navigate(module.path)}
              className="flex items-center p-4 bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:scale-[1.02] transition-all group text-left"
            >
              <div className={`p-3 rounded-lg ${module.color} text-white mr-4 group-hover:scale-110 transition-transform`}>
                <module.icon className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{module.name}</h3>
                <div className="flex items-center text-xs text-primary-600 font-medium mt-1">
                  <span>Explore</span>
                  <ChevronRight className="w-3 h-3 ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between mb-4 mt-8">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-green-600" />
          Key Performance Indicators
        </h2>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {kpiCards.map((card, index) => (
          <Card key={index} className="dark:bg-gradient-to-br dark:from-slate-800 dark:to-slate-900">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className={`p-3 rounded-md ${card.bgColor}`}>
                    <card.icon className={`h-6 w-6 ${card.color}`} />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                      {card.title}
                    </dt>
                    <dd className="text-lg font-medium text-gray-900 dark:text-white">
                      {card.value}
                    </dd>
                    {card.subtitle && (
                      <dd className="text-sm text-gray-500 dark:text-gray-400">
                        {card.subtitle}
                      </dd>
                    )}
                  </dl>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Charts and Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              {user?.role === 'admin' ? t('mainDashboard.charts.salesRevenueChart') : `${user?.department} ${t('mainDashboard.charts.performanceTrend')}`}
            </h3>
            <div className="flex items-center text-sm text-green-600">
              <TrendingUp className="h-4 w-4 mr-1" />
              {departmentChart.length > 0 ?
                `$${departmentChart.reduce((sum, item) => sum + (user?.role === 'admin' ? (item.revenue || 0) : (item.value || 0)), 0).toLocaleString()} total` :
                t('common.noData')
              }
            </div>
          </div>
          <div className="h-64">
            {departmentChart.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={departmentChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="_id"
                    stroke="#666"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  />
                  <YAxis
                    stroke="#666"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(value) => [`$${value.toLocaleString()}`, t('sales.dashboard.revenue')]}
                    contentStyle={{
                      backgroundColor: document.documentElement.classList.contains('dark') ? '#1e293b' : '#fff',
                      border: `1px solid ${document.documentElement.classList.contains('dark') ? '#334155' : '#e5e7eb'}`,
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                      color: document.documentElement.classList.contains('dark') ? '#fff' : '#000'
                    }}
                    labelFormatter={(value) => new Date(value).toLocaleDateString()}
                  />
                  <Line
                    type="monotone"
                    dataKey={user?.role === 'admin' ? 'revenue' : 'value'}
                    stroke="#3B82F6"
                    strokeWidth={3}
                    dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: '#3B82F6', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                <div className="text-center">
                  <TrendingUp className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p>{t('mainDashboard.charts.noSalesDataAvailable')}</p>
                </div>
              </div>
            )}
          </div>
        </Card>

        <Card>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">{t('mainDashboard.charts.recentActivities')}</h3>
          <div className="space-y-4">
            {recentActivities.slice(0, 5).map((activity, index) => {
              const Icon = getActivityIcon(activity.type);
              return (
                <div key={index} className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <div className="p-2 bg-gray-100 rounded-full">
                      <Icon className="h-4 w-4 text-gray-600" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 dark:text-white">{activity.description}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(activity.status)}`}>
                        {activity.status}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(activity.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">{t('mainDashboard.charts.employeeAttendance')}</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">{t('mainDashboard.charts.presentToday')}</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {kpis?.employees?.presentToday || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">{t('mainDashboard.charts.totalEmployees')}</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {kpis?.employees?.total || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">{t('mainDashboard.charts.attendanceRate')}</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {kpis?.employees?.attendanceRate || 0}%
              </span>
            </div>
          </div>
        </Card>

        <Card>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">{t('mainDashboard.charts.productionStatus')}</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">{t('mainDashboard.charts.pendingOrders')}</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {kpis?.production?.pending || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">{t('mainDashboard.charts.inProgress')}</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {kpis?.production?.inProgress || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">{t('mainDashboard.charts.totalOrders')}</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {kpis?.production?.totalOrders || 0}
              </span>
            </div>
          </div>
        </Card>

        <Card>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">{t('mainDashboard.charts.inventoryValue')}</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">{t('mainDashboard.charts.totalValue')}</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                ${(kpis?.inventory?.totalValue || 0).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">{t('mainDashboard.charts.lowStockItems')}</span>
              <span className="text-sm font-medium text-red-600 dark:text-red-400">
                {kpis?.inventory?.lowStockAlerts || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">Total Products</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {kpis?.inventory?.totalProducts || 0}
              </span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
