'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, CreditCard, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useScope } from '@/lib/scope-context';
import { getAllTransactions } from '@/lib/storage';
import {
  getMonthlyData, getNetBalance, getTotalIncome as getTotalEarnings, getTotalExpenses,
  getCumulativeNetWorth, getRecentTransactions, formatCurrency, formatMonth,
} from '@/lib/analytics';
import { Transaction } from '@/lib/types';

// ── Stat Card Component ──
function StatCard({ label, value, icon: Icon, trend, color }: {
  label: string;
  value: string;
  icon: React.ElementType;
  trend?: { value: number; label: string };
  color: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="monarch-card overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="stat-label">{label}</p>
              <p className="stat-value">{value}</p>
              {trend && (
                <div className="flex items-center gap-1">
                  {trend.value >= 0 ? (
                    <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <ArrowDownRight className="w-3.5 h-3.5 text-red-400" />
                  )}
                  <span className={`text-xs font-medium ${trend.value >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {Math.abs(trend.value).toFixed(1)}%
                  </span>
                  <span className="text-xs text-slate-400">{trend.label}</span>
                </div>
              )}
            </div>
            <div className={`flex items-center justify-center w-11 h-11 rounded-xl ${color}`}>
              <Icon className="w-5 h-5 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ── Custom Tooltip ──
function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string; color: string }>; label?: string }) {
  if (!active || !payload) return null;
  return (
    <div className="bg-white/95 backdrop-blur-sm rounded-xl px-4 py-3 shadow-lg border border-slate-100">
      <p className="text-xs font-medium text-slate-500 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-sm font-semibold" style={{ color: p.color }}>
          {p.name}: {formatCurrency(p.value)}
        </p>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const { scope } = useScope();
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    async function fetchData() {
      const data = await getAllTransactions();
      setTransactions(data);
    }
    fetchData();
  }, []);

  // Filter by scope
  const scopedTxns = useMemo(() => transactions.filter(t => t.scope === scope), [transactions, scope]);

  // Analytics
  const netBalance = useMemo(() => getNetBalance(scopedTxns), [scopedTxns]);
  const totalEarnings = useMemo(() => getTotalEarnings(scopedTxns), [scopedTxns]);
  const totalExpenses = useMemo(() => getTotalExpenses(scopedTxns), [scopedTxns]);
  const monthlyData = useMemo(() => getMonthlyData(scopedTxns), [scopedTxns]);
  const netWorthData = useMemo(() => getCumulativeNetWorth(scopedTxns), [scopedTxns]);
  const recentTxns = useMemo(() => getRecentTransactions(scopedTxns, 8), [scopedTxns]);

  // Chart data: last 6 months
  const chartData = useMemo(() => {
    return monthlyData.slice(-6).map(d => ({
      ...d,
      monthLabel: formatMonth(d.month),
    }));
  }, [monthlyData]);

  return (
    <div className="space-y-8">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          label="Net Balance"
          value={formatCurrency(netBalance)}
          icon={DollarSign}
          color="bg-gradient-to-br from-emerald-500 to-teal-600"
          trend={{ value: netBalance > 0 ? 12.5 : -3.2, label: 'vs last month' }}
        />
        <StatCard
          label="Total Earnings"
          value={formatCurrency(totalEarnings)}
          icon={TrendingUp}
          color="bg-gradient-to-br from-blue-500 to-indigo-600"
          trend={{ value: 8.2, label: 'vs last month' }}
        />
        <StatCard
          label="Total Expenses"
          value={formatCurrency(totalExpenses)}
          icon={TrendingDown}
          color="bg-gradient-to-br from-rose-400 to-red-500"
          trend={{ value: -2.1, label: 'vs last month' }}
        />
        <StatCard
          label="Transactions"
          value={scopedTxns.length.toString()}
          icon={CreditCard}
          color="bg-gradient-to-br from-amber-400 to-orange-500"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Net Worth Trend */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="monarch-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-slate-700">Net Worth Trend</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={netWorthData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="netWorthGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10B981" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11, fill: '#94A3B8' }}
                      tickLine={false}
                      axisLine={{ stroke: '#E2E8F0' }}
                      tickFormatter={(v) => v.slice(5)}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#94A3B8' }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="#10B981"
                      strokeWidth={2.5}
                      fill="url(#netWorthGrad)"
                      name="Net Worth"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Monthly Cash Flow */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="monarch-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-slate-700">Monthly Cash Flow</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis
                      dataKey="monthLabel"
                      tick={{ fontSize: 11, fill: '#94A3B8' }}
                      tickLine={false}
                      axisLine={{ stroke: '#E2E8F0' }}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#94A3B8' }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="income" name="Earnings" fill="#10B981" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="expenses" name="Expenses" fill="#F87171" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Recent Transactions */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <Card className="monarch-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold text-slate-700">Recent Transactions</CardTitle>
              <a href="/transactions" className="text-sm text-emerald-600 hover:text-emerald-700 font-medium">
                View all →
              </a>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {recentTxns.map((txn) => (
                <div
                  key={txn.id}
                  className="flex items-center justify-between py-3 px-4 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={`flex items-center justify-center w-10 h-10 rounded-xl ${txn.amount > 0 ? 'bg-emerald-50' : 'bg-red-50'
                      }`}>
                      {txn.amount > 0 ? (
                        <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <ArrowDownRight className="w-4 h-4 text-red-500" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-700 truncate max-w-[280px]">{txn.description}</p>
                      <p className="text-xs text-slate-400">{txn.date} · {txn.bank} · {txn.category}</p>
                    </div>
                  </div>
                  <span className={`text-sm font-semibold ${txn.amount > 0 ? 'text-emerald-600' : 'text-slate-700'}`}>
                    {formatCurrency(txn.amount)}
                  </span>
                </div>
              ))}
              {recentTxns.length === 0 && (
                <div className="text-center py-12 text-slate-400">
                  <p className="text-sm">No transactions yet.</p>
                  <p className="text-xs mt-1">Upload a bank statement to get started.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
