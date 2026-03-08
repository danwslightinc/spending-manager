'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Download, Upload, Trash2, Database, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { exportData, importData, clearAllData, getAllTransactions, addTransactions } from '@/lib/storage';

export default function SettingsPage() {
    const [status, setStatus] = useState('');

    const handleExport = async () => {
        const data = await exportData();
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `spend-manager-backup-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        setStatus('Data exported successfully.');
    };

    const handleImport = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return;
            try {
                const text = await file.text();
                const result = await importData(text);
                setStatus(`Imported ${result.transactions} transactions and ${result.accounts} accounts.`);
            } catch {
                setStatus('Failed to import data. Invalid file format.');
            }
        };
        input.click();
    };

    const [confirmCount, setConfirmCount] = useState(0);

    const handleClearAll = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (confirmCount === 0) {
            setConfirmCount(1);
            setStatus('Click "Delete All" again to confirm deletion.');
            setTimeout(() => setConfirmCount(0), 4000);
            return;
        }

        await clearAllData();
        setStatus('All data cleared successfully. Resetting app...');
        setTimeout(() => {
            window.location.replace('/');
        }, 800);
    };

    const handleLoadSample = async () => {
        const existing = await getAllTransactions();
        if (existing.length > 0) {
            if (!confirm('This will add sample data alongside your existing data. Continue?')) return;
        }
        const { generateSampleData } = await import('@/lib/sample-data');
        const samples = generateSampleData();
        await addTransactions(samples);
        setStatus(`Loaded ${samples.length} sample transactions.`);
    };

    return (
        <div className="max-w-2xl mx-auto space-y-8">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="monarch-card">
                    <CardHeader>
                        <CardTitle className="text-base font-semibold text-slate-700">Data Management</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between py-3">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                                    <Download className="w-5 h-5 text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-slate-700">Export Data</p>
                                    <p className="text-xs text-slate-400">Download all transactions as JSON backup</p>
                                </div>
                            </div>
                            <Button variant="outline" size="sm" onClick={handleExport} className="rounded-xl">
                                Export
                            </Button>
                        </div>

                        <div className="border-t border-slate-100" />

                        <div className="flex items-center justify-between py-3">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                                    <Upload className="w-5 h-5 text-emerald-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-slate-700">Import Data</p>
                                    <p className="text-xs text-slate-400">Restore from a JSON backup file</p>
                                </div>
                            </div>
                            <Button variant="outline" size="sm" onClick={handleImport} className="rounded-xl">
                                Import
                            </Button>
                        </div>

                        <div className="border-t border-slate-100" />

                        <div className="flex items-center justify-between py-3">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                                    <Database className="w-5 h-5 text-amber-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-slate-700">Load Sample Data</p>
                                    <p className="text-xs text-slate-400">Add demo transactions for testing</p>
                                </div>
                            </div>
                            <Button variant="outline" size="sm" onClick={handleLoadSample} className="rounded-xl">
                                Load
                            </Button>
                        </div>

                        <div className="border-t border-slate-100" />

                        <div className="flex items-center justify-between py-3">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
                                    <Trash2 className="w-5 h-5 text-red-500" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-slate-700">Clear All Data</p>
                                    <p className="text-xs text-slate-400">Delete all transactions (cannot be undone)</p>
                                </div>
                            </div>
                            <Button variant={confirmCount > 0 ? "outline" : "destructive"} size="sm" onClick={handleClearAll} className="rounded-xl">
                                {confirmCount > 0 ? "Click to Confirm" : "Delete All"}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>

            {status && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl"
                >
                    <Info className="w-4 h-4 text-emerald-600" />
                    <p className="text-sm text-emerald-700">{status}</p>
                </motion.div>
            )}

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <Card className="monarch-card">
                    <CardHeader>
                        <CardTitle className="text-base font-semibold text-slate-700">About</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3 text-sm text-slate-500">
                            <p>
                                <strong className="text-slate-700">Spend Manager</strong> is a personal finance dashboard
                                inspired by Monarch Money. Upload bank PDF statements from CIBC, RBC, and TD to track spending,
                                monitor cash flow, and analyze your financial habits.
                            </p>
                            <p>
                                Data is securely synced with your Supabase database.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}
