import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area
} from 'recharts';
import {
    TrendingUp,
    RefreshCw,
    LayoutDashboard,
    AlertTriangle,
    Activity,
    Layers,
    DollarSign,
    Target,
    Download
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import Card from '../../components/Card';
import toast from 'react-hot-toast';

// Native Date Helpers to avoid moment dependency
const formatPeriod = (period) => {
    if (!period) return '';
    const date = new Date(period + (period.length === 7 ? '-01' : ''));
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
};

const formatFullPeriod = (period) => {
    if (!period) return '';
    const date = new Date(period + (period.length === 7 ? '-01' : ''));
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};

/**
 * @section INTEGRATED FORECASTING MODULE (v2.0)
 * Fully aligned with Modular Backend Architecture.
 */
let dashboardCache = null;
let financeCache = null;
let salesCache = null;
let reportsCache = null;

const ForecastingModule = ({ activeTabProp }) => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState(activeTabProp || 'dashboard');
    const [loading, setLoading] = useState(false);

    // Sub-module states
    const [dashboardData, setDashboardData] = useState(dashboardCache);
    const [financeData, setFinanceData] = useState(financeCache);
    const [salesData, setSalesData] = useState(salesCache);
    const [reportsData, setReportsData] = useState(reportsCache);

    const isFinance = user?.role === 'admin' || (user?.role === 'manager' && user?.department === 'Finance');
    const isSales = user?.role === 'admin' || (user?.role === 'manager' && user?.department === 'Sales');
    const hasAccess = user?.role === 'admin' || isFinance || isSales;

    // Define accessible tabs (for logic, but UI navbar is removed)
    const tabs = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, show: true },
        { id: 'finance', label: 'Finance', icon: DollarSign, show: isFinance },
        { id: 'sales', label: 'Sales', icon: Target, show: isSales },
    ].filter(t => t.show);

    useEffect(() => {
        if (activeTabProp) setActiveTab(activeTabProp);
    }, [activeTabProp]);

    useEffect(() => {
        // Ensure active tab is valid for current role
        if (!tabs.find(t => t.id === activeTab)) {
            setActiveTab(tabs[0]?.id || 'dashboard');
        }
    }, [user, activeTab, tabs]);

    useEffect(() => {
        if (hasAccess && tabs.find(t => t.id === activeTab)) {
            fetchDataForTab(activeTab);
            // Always fetch reports in background if in finance or sales
            if (activeTab === 'finance' || activeTab === 'sales') {
                fetchDataForTab('reports', true);
            }
        }
    }, [activeTab, hasAccess]);

    const fetchDataForTab = async (tab, silent = false) => {
        try {
            if (!silent) setLoading(true);

            let endpoint = '';
            switch (tab) {
                case 'dashboard': endpoint = '/api/forecast/dashboard'; break;
                case 'finance': endpoint = '/api/forecast/finance'; break;
                case 'sales': endpoint = '/api/forecast/sales'; break;
                case 'reports': endpoint = '/api/forecast/reports'; break;
                default: endpoint = '/api/forecast/dashboard';
            }

            const response = await axios.get(endpoint);
            if (response.data.success) {
                const newData = response.data.data;
                if (tab === 'dashboard') { setDashboardData(newData); dashboardCache = newData; }
                if (tab === 'finance') { setFinanceData(newData); financeCache = newData; }
                if (tab === 'sales') { setSalesData(newData); salesCache = newData; }
                if (tab === 'reports') { setReportsData(newData); reportsCache = newData; }
            }
        } catch (error) {
            console.error(`Error fetching ${tab} data:`, error);
            toast.error(`Failed to load ${tab} intelligence.`);
        } finally {
            setLoading(false);
        }
    };

    const handleSyncData = async () => {
        try {
            toast.loading('Synchronizing ERP data...', { id: 'sync' });
            await axios.post('/api/forecast/sync');
            toast.success('Forecasting engine synchronized!', { id: 'sync' });
            fetchDataForTab(activeTab);
        } catch (error) {
            toast.error('Sync failed.', { id: 'sync' });
        }
    };

    const handleExportExcel = async (reportId) => {
        const toastId = 'export-toast';
        try {
            toast.loading('Preparing your Excel report...', { id: toastId });
            console.log('Starting Export process...');

            let id = reportId;

            // If no ID (Header button), we MUST generate a NEW report to get latest data
            if (!id) {
                console.log('No report ID provided, generating fresh report...');
                const genResponse = await axios.post('/api/forecast/reports/generate');

                if (genResponse.data?.success && genResponse.data.data?._id) {
                    id = genResponse.data.data._id;
                    console.log('Report generated with ID:', id);
                } else {
                    throw new Error('Server failed to generate a report ID.');
                }
            }

            console.log(`Downloading report ${id}...`);
            const response = await axios({
                url: `/api/forecast/reports/${id}/export`,
                method: 'GET',
                responseType: 'blob',
            });

            // Handle potential empty/error blob
            if (response.data.size === 0) throw new Error('Received an empty file from server.');

            const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = window.URL.createObjectURL(blob);

            const fileName = `Forecasting_${user?.department || 'General'}_Report_${new Date().toISOString().split('T')[0]}.xlsx`;

            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', fileName);
            document.body.appendChild(link);
            link.click();

            // Cleanup
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            toast.success('Excel report downloaded!', { id: toastId });
            console.log('Export sequence complete.');
        } catch (error) {
            console.error('CRITICAL EXPORT ERROR:', error);
            const errorMsg = error.response?.data?.message || error.message || 'Export failed. Please try again.';
            toast.error(errorMsg, { id: toastId });
        }
    };

    if (!hasAccess) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[500px] bg-white dark:bg-slate-900 rounded-3xl border border-gray-200 dark:border-slate-800 p-12 text-center shadow-xl">
                <div className="p-6 bg-red-100 dark:bg-red-900/10 rounded-full mb-6">
                    <AlertTriangle className="w-16 h-16 text-red-500" />
                </div>
                <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">Access Denied</h2>
                <p className="text-gray-500 dark:text-gray-400 max-w-sm mt-3 font-medium">The Forecasting Module is restricted to Management.</p>
            </div>
        );
    }

    /**
     * @section RENDER SUB-MODULE 1: DASHBOARD
     */
    const renderDashboard = () => {
        if (!dashboardData) return null;
        const { kpis, charts, alerts } = dashboardData;

        return (
            <div className="space-y-6 animate-in fade-in duration-500">
                {/* 1. Alerts Section */}
                {alerts?.length > 0 && (
                    <div className="space-y-3">
                        {alerts.map((alert, i) => (
                            <div key={i} className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-xl text-amber-800 dark:text-amber-300">
                                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                                <p className="text-sm font-medium">{alert.message}</p>
                            </div>
                        ))}
                    </div>
                )}

                {/* 2. Main KPIs - Department Specific */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                    {/* Common Metric for both or filtered */}
                    <Card>
                        <div className="p-5 flex items-center">
                            <div className="bg-blue-100 dark:bg-blue-500/20 rounded-full p-3">
                                <DollarSign className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div className="ml-5">
                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Revenue Forecast</p>
                                <p className="text-xl font-bold text-gray-900 dark:text-white">${kpis.expectedRevenue.toLocaleString()}</p>
                            </div>
                        </div>
                    </Card>

                    {isFinance && (
                        <>
                            <Card>
                                <div className="p-5 flex items-center">
                                    <div className="bg-emerald-100 dark:bg-emerald-500/20 rounded-full p-3">
                                        <TrendingUp className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                                    </div>
                                    <div className="ml-5">
                                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Net Profit Estimate</p>
                                        <p className={`text-xl font-bold ${kpis.expectedNetProfit > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                            ${kpis.expectedNetProfit.toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                            </Card>
                            <Card>
                                <div className="p-5 flex items-center">
                                    <div className="bg-purple-100 dark:bg-purple-500/20 rounded-full p-3">
                                        <Layers className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                                    </div>
                                    <div className="ml-5">
                                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Cash Liquidity</p>
                                        <p className="text-xl font-bold text-gray-900 dark:text-white">{kpis.cashFlowStatus}</p>
                                    </div>
                                </div>
                            </Card>
                        </>
                    )}

                    {isSales && (
                        <>
                            <Card>
                                <div className="p-5 flex items-center">
                                    <div className="bg-primary-100 dark:bg-primary-500/20 rounded-full p-3">
                                        <Activity className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                                    </div>
                                    <div className="ml-5">
                                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Sales Growth</p>
                                        <p className="text-xl font-bold text-gray-900 dark:text-white">{kpis.salesGrowthRate.toFixed(1)}%</p>
                                    </div>
                                </div>
                            </Card>
                            <Card>
                                <div className="p-5 flex items-center">
                                    <div className="bg-amber-100 dark:bg-amber-500/20 rounded-full p-3">
                                        <Target className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                                    </div>
                                    <div className="ml-5">
                                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Confidence Score</p>
                                        <p className="text-xl font-bold text-gray-900 dark:text-white">89.2%</p>
                                    </div>
                                </div>
                            </Card>
                        </>
                    )}
                </div>

                {/* 3. Combined Charts - Filtered by department */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {isSales && (
                        <Card padding={false} className="overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800">
                                <h3 className="text-sm font-bold text-gray-900 dark:text-white">Sales Trend Forecast</h3>
                            </div>
                            <div className="p-6 h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={charts.salesChart.labels.map((l, i) => ({ name: l, actual: charts.salesChart.actual[i], forecast: charts.salesChart.forecast[i] }))}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                                        <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} />
                                        <YAxis fontSize={10} axisLine={false} tickLine={false} />
                                        <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', backgroundColor: '#1e293b', color: '#fff' }} />
                                        <Line type="monotone" dataKey="actual" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} />
                                        <Line type="monotone" dataKey="forecast" stroke="#10b981" strokeWidth={3} strokeDasharray="5 5" dot={{ r: 4 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>
                    )}

                    {isFinance && (
                        <Card padding={false} className="overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800">
                                <h3 className="text-sm font-bold text-gray-900 dark:text-white">Revenue vs Expense Forecast</h3>
                            </div>
                            <div className="p-6 h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={charts.financeChart.labels.map((l, i) => ({ name: l, rev: charts.financeChart.revenue[i], exp: charts.financeChart.expenses[i] }))}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                                        <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} />
                                        <YAxis fontSize={10} axisLine={false} tickLine={false} />
                                        <Tooltip />
                                        <Area type="monotone" dataKey="rev" stroke="#10b981" fill="#10b98120" strokeWidth={2} />
                                        <Area type="monotone" dataKey="exp" stroke="#ef4444" fill="#ef444420" strokeWidth={2} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>
                    )}
                </div>
            </div>
        );
    };


    /**
     * @section RENDER SUB-MODULE 2: FINANCE
     */
    const renderFinance = () => {
        if (!financeData) return null;
        const { forecast } = financeData;

        return (
            <div className="space-y-12 animate-in slide-in-from-bottom duration-500">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {forecast.map((f, idx) => (
                        <Card key={idx} padding={false} className="overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/50">
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">{formatPeriod(f.period)} Prediction</p>
                            </div>
                            <div className="p-6 space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-500">Expected Revenue</span>
                                    <span className="text-lg font-bold text-emerald-600">${f.revenue.predicted_value.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-500">Expected Expenses</span>
                                    <span className="text-lg font-bold text-rose-600">${f.expense.predicted_value.toLocaleString()}</span>
                                </div>
                                <div className="pt-4 border-t border-gray-100 dark:border-slate-800 flex justify-between items-center">
                                    <span className="text-sm font-bold text-gray-900 dark:text-white">Projected Profit</span>
                                    <span className={`text-xl font-bold ${f.profit.predicted_value > 0 ? 'text-primary-600' : 'text-rose-600'}`}>
                                        ${f.profit.predicted_value.toLocaleString()}
                                    </span>
                                </div>
                            </div>
                            <div className="px-6 py-3 bg-gray-50 dark:bg-slate-800/20 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between">
                                <span className="text-[10px] font-medium text-gray-400 uppercase">Confidence Level</span>
                                <span className="text-[10px] font-bold text-gray-500">{f.profit.confidence_level}%</span>
                            </div>
                        </Card>
                    ))}
                </div>
            </div>
        );
    };

    /**
     * @section RENDER SUB-MODULE 3: SALES
     */
    const renderSales = () => {
        if (!salesData) return null;
        const { forecast } = salesData;

        return (
            <div className="space-y-12 animate-in slide-in-from-top duration-500">
                <Card padding={false} className="overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800">
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white">Unit Volume & Revenue Projections</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 dark:bg-slate-800/80 text-[11px] uppercase font-bold text-gray-500">
                                <tr>
                                    <th className="px-6 py-3">Predicted Period</th>
                                    <th className="px-6 py-3">Technique</th>
                                    <th className="px-6 py-3 text-right">Estimated Qty</th>
                                    <th className="px-6 py-3 text-right">Expected Revenue</th>
                                    <th className="px-6 py-3 text-center">Confidence</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                                {forecast.map((f, i) => (
                                    <tr key={i} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/50 transition-colors text-sm">
                                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{formatFullPeriod(f.period)}</td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-0.5 bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded text-[10px] font-bold uppercase">
                                                {f.forecast_type.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right text-gray-500">
                                            {f.metadata?.predicted_quantity ? Math.round(f.metadata.predicted_quantity).toLocaleString() : 'N/A'} Units
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold text-emerald-600">
                                            ${f.predicted_value.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col items-center gap-1">
                                                <span className="text-[10px] font-bold text-gray-400">{f.confidence_level}%</span>
                                                <div className="w-16 h-1 bg-gray-100 dark:bg-slate-800 rounded-full">
                                                    <div className="h-full bg-emerald-500" style={{ width: `${f.confidence_level}%` }} />
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Forecasting Analytics</h1>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-1">Predictive ERP Intelligence</p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={handleSyncData}
                        disabled={loading}
                        className="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-[13px] font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700 transition-all shadow-sm"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        <span>Refresh</span>
                    </button>
                    <button
                        onClick={() => handleExportExcel()}
                        disabled={loading}
                        className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 text-white rounded-xl text-[13px] font-bold hover:bg-primary-700 transition-all shadow-lg shadow-primary-500/20 active:scale-95 disabled:opacity-50"
                    >
                        <Download className="w-4 h-4" />
                        <span>Export Report</span>
                    </button>
                </div>
            </div>

            {/* Content Renderer */}
            <div className="mt-2 text-gray-900 dark:text-white">
                {loading && !dashboardData && !financeData && !salesData && !reportsData ? (
                    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                        <span className="text-sm font-medium text-gray-500">Processing Analytics...</span>
                    </div>
                ) : (
                    <div className="transition-all duration-300">
                        {activeTab === 'dashboard' && renderDashboard()}
                        {activeTab === 'finance' && renderFinance()}
                        {activeTab === 'sales' && renderSales()}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ForecastingModule;
