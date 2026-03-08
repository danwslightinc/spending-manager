'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Line, ComposedChart, Area,
} from 'recharts';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useScope } from '@/lib/scope-context';
import { getAllTransactions } from '@/lib/storage';
import { Transaction } from '@/lib/types';
import { getMonthlyData, formatCurrency, formatMonth } from '@/lib/analytics';

export default function CashFlowPage() {
    const { scope } = useScope();
    const [transactions, setTransactions] = useState<Transaction[]>([]);

    useEffect(() => {
        async function fetchData() {
            setTransactions(await getAllTransactions());
        }
        fetchData();
    }, []);

    const scopedTxns = useMemo(() => transactions.filter(t => t.scope === scope), [transactions, scope]);
    const monthlyData = useMemo(() => getMonthlyData(scopedTxns), [scopedTxns]);

    const chartData = useMemo(() => {
        return monthlyData.map(d => ({
            ...d,
            monthLabel: formatMonth(d.month),
        }));
    }, [monthlyData]);

    const totals = useMemo(() => {
        const totalIncome = monthlyData.reduce((s, m) => s + m.income, 0);
        const totalExpenses = monthlyData.reduce((s, m) => s + m.expenses, 0);
        return {
            income: totalIncome,
            expenses: totalExpenses,
            net: totalIncome - totalExpenses,
            savingsRate: totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome * 100) : 0,
        };
    }, [monthlyData]);

    return (
        <div className="space-y-8">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                    <Card className="monarch-card">
                        <CardContent className="p-6">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600">
                                    <TrendingUp className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <p className="stat-label">Total Income</p>
                                    <p className="stat-value text-emerald-600">{formatCurrency(totals.income)}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                    <Card className="monarch-card">
                        <CardContent className="p-6">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-rose-400 to-red-500">
                                    <TrendingDown className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <p className="stat-label">Total Expenses</p>
                                    <p className="stat-value text-red-500">{formatCurrency(totals.expenses)}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                    <Card className="monarch-card">
                        <CardContent className="p-6">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600">
                                    <DollarSign className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <p className="stat-label">Savings Rate</p>
                                    <p className="stat-value text-blue-600">{totals.savingsRate.toFixed(1)}%</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>

            {/* Main Cash Flow Chart */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                <Card className="monarch-card">
                    <CardHeader>
                        <CardTitle className="text-base font-semibold text-slate-700">Income vs Expenses</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[400px]">
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
                                    <Tooltip
                                        contentStyle={{
                                            background: 'rgba(255,255,255,0.95)',
                                            border: '1px solid #E2E8F0',
                                            borderRadius: '12px',
                                            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                                        }}
                                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                        formatter={((value: any, name: any) => [formatCurrency(Number(value)), String(name)]) as any}
                                    />
                                    <Bar dataKey="income" name="Income" fill="#10B981" radius={[6, 6, 0, 0]} />
                                    <Bar dataKey="expenses" name="Expenses" fill="#F87171" radius={[6, 6, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>

            {/* Net Cash Flow Trend */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
                <Card className="monarch-card">
                    <CardHeader>
                        <CardTitle className="text-base font-semibold text-slate-700">Net Cash Flow Trend</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="netFlowGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.2} />
                                            <stop offset="100%" stopColor="#3B82F6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
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
                                        tickFormatter={(v) => `$${(v / 1000).toFixed(1)}K`}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            background: 'rgba(255,255,255,0.95)',
                                            border: '1px solid #E2E8F0',
                                            borderRadius: '12px',
                                        }}
                                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                        formatter={((value: any, name: any) => [formatCurrency(Number(value)), String(name)]) as any}
                                    />
                                    <Area type="monotone" dataKey="net" fill="url(#netFlowGrad)" stroke="none" name="Net" />
                                    <Line type="monotone" dataKey="net" stroke="#3B82F6" strokeWidth={2.5} dot={{ r: 4, fill: '#3B82F6' }} name="Net" />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>

            {/* Monthly Breakdown Table */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <Card className="monarch-card">
                    <CardHeader>
                        <CardTitle className="text-base font-semibold text-slate-700">Monthly Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-slate-100">
                                        <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Month</th>
                                        <th className="text-right py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Income</th>
                                        <th className="text-right py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Expenses</th>
                                        <th className="text-right py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Net</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {monthlyData.slice().reverse().map((row) => (
                                        <tr key={row.month} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                            <td className="py-3 px-4 font-medium text-slate-700">{formatMonth(row.month)}</td>
                                            <td className="py-3 px-4 text-right text-emerald-600 font-medium">{formatCurrency(row.income)}</td>
                                            <td className="py-3 px-4 text-right text-red-500 font-medium">{formatCurrency(row.expenses)}</td>
                                            <td className={`py-3 px-4 text-right font-semibold ${row.net >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                                {formatCurrency(row.net)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}
