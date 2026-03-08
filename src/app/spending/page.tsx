'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useScope } from '@/lib/scope-context';
import { getAllTransactions } from '@/lib/storage';
import { Transaction } from '@/lib/types';
import { getCategoryBreakdown, formatCurrency } from '@/lib/analytics';

export default function SpendingPage() {
    const { scope } = useScope();
    const [transactions, setTransactions] = useState<Transaction[]>([]);

    useEffect(() => {
        async function fetchData() {
            setTransactions(await getAllTransactions());
        }
        fetchData();
    }, []);

    const scopedTxns = useMemo(() => transactions.filter(t => t.scope === scope), [transactions, scope]);
    const categories = useMemo(() => getCategoryBreakdown(scopedTxns), [scopedTxns]);
    const totalExpenses = useMemo(() => categories.reduce((s, c) => s + c.amount, 0), [categories]);

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Donut Chart */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                    <Card className="monarch-card">
                        <CardHeader>
                            <CardTitle className="text-base font-semibold text-slate-700">Spending by Category</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="relative h-[350px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={categories}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={90}
                                            outerRadius={140}
                                            dataKey="amount"
                                            nameKey="category"
                                            paddingAngle={2}
                                            strokeWidth={0}
                                        >
                                            {categories.map((entry, idx) => (
                                                <Cell key={idx} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{
                                                background: 'rgba(255,255,255,0.95)',
                                                border: '1px solid #E2E8F0',
                                                borderRadius: '12px',
                                                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                                            }}
                                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                            formatter={((value: any) => [formatCurrency(Number(value)), 'Amount']) as any}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                                {/* Center text */}
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <div className="text-center">
                                        <p className="text-sm text-slate-400 font-medium">Total</p>
                                        <p className="text-2xl font-bold text-slate-800">{formatCurrency(totalExpenses)}</p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Category Bar List */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                    <Card className="monarch-card">
                        <CardHeader>
                            <CardTitle className="text-base font-semibold text-slate-700">Category Breakdown</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {categories.map((cat, idx) => (
                                    <motion.div
                                        key={cat.category}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.05 * idx }}
                                        className="group"
                                    >
                                        <div className="flex items-center justify-between mb-1.5">
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className="w-3 h-3 rounded-full"
                                                    style={{ backgroundColor: cat.color }}
                                                />
                                                <span className="text-sm font-medium text-slate-700">{cat.category}</span>
                                                <span className="text-xs text-slate-400">({cat.count} txns)</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-sm font-semibold text-slate-800">{formatCurrency(cat.amount)}</span>
                                                <span className="text-xs text-slate-400 w-12 text-right">{cat.percentage}%</span>
                                            </div>
                                        </div>
                                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                            <motion.div
                                                className="h-full rounded-full"
                                                style={{ backgroundColor: cat.color }}
                                                initial={{ width: 0 }}
                                                animate={{ width: `${cat.percentage}%` }}
                                                transition={{ duration: 0.8, delay: 0.1 * idx, ease: 'easeOut' }}
                                            />
                                        </div>
                                    </motion.div>
                                ))}
                                {categories.length === 0 && (
                                    <div className="text-center py-12 text-slate-400">
                                        <p className="text-sm">No expense data available.</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>
        </div>
    );
}
