'use client';

import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, CheckCircle, XCircle, X, Files, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useScope } from '@/lib/scope-context';
import { categorizeTransaction, cleanDescription } from '@/lib/categories';
import { addTransactions } from '@/lib/storage';
import { formatCurrency } from '@/lib/analytics';
import { Transaction, ParsedCSVResult } from '@/lib/types';

type UploadState = 'idle' | 'parsing' | 'preview' | 'success' | 'error';

interface ParsedFile {
    fileName: string;
    result: ParsedCSVResult;
    accountName: string;
    error?: string;
}

export default function UploadPage() {
    const { scope } = useScope();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [state, setState] = useState<UploadState>('idle');
    const [dragOver, setDragOver] = useState(false);
    const [parsedFiles, setParsedFiles] = useState<ParsedFile[]>([]);
    const [errors, setErrors] = useState<string[]>([]);
    const [importedCount, setImportedCount] = useState(0);
    const [expandedFile, setExpandedFile] = useState<number>(0);
    const [isAILoading, setIsAILoading] = useState(false);

    const processFiles = useCallback(async (files: File[]) => {
        setState('parsing');
        setErrors([]);

        const supportedFiles = files.filter(f =>
            f.name.endsWith('.pdf') || f.type === 'application/pdf'
        );

        if (supportedFiles.length === 0) {
            setErrors(['No supported files found. Please upload PDF statements.']);
            setState('error');
            return;
        }

        const results: ParsedFile[] = [];
        const parseErrors: string[] = [];

        for (const file of supportedFiles) {
            try {
                // Dynamic import to keep PDF.js client-only
                const { parsePDF } = await import('@/lib/parsers/pdf-parser');
                const buffer = await file.arrayBuffer();
                const result = await parsePDF(buffer);

                if (result.transactions.length === 0) {
                    parseErrors.push(`${file.name}: No transactions found.`);
                    continue;
                }

                results.push({
                    fileName: file.name,
                    result,
                    accountName: result.accountName || `${result.bank} ${result.accountType === 'credit' ? 'Visa' : 'Chequing'}`,
                });
            } catch (err: unknown) {
                parseErrors.push(`${file.name}: ${err instanceof Error ? err.message : 'Parse failed.'}`);
            }
        }

        if (results.length === 0) {
            setErrors(parseErrors.length > 0 ? parseErrors : ['Failed to parse any files.']);
            setState('error');
            return;
        }

        setParsedFiles(results);
        setErrors(parseErrors);
        setExpandedFile(0);
        setState('preview');
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            processFiles(files);
        }
    }, [processFiles]);

    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files ? Array.from(e.target.files) : [];
        if (files.length > 0) processFiles(files);
    }, [processFiles]);

    const updateAccountName = (index: number, name: string) => {
        setParsedFiles(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], accountName: name };
            return updated;
        });
    };

    const removeFile = (index: number) => {
        setParsedFiles(prev => {
            const updated = prev.filter((_, i) => i !== index);
            if (updated.length === 0) {
                setState('idle');
            } else if (expandedFile >= updated.length) {
                setExpandedFile(updated.length - 1);
            }
            return updated;
        });
    };

    const handleImportAll = useCallback(async () => {
        let totalImported = 0;
        const allNewTxns: Transaction[] = [];

        for (const pf of parsedFiles) {
            const newTxns: Transaction[] = pf.result.transactions.map((t) => ({
                ...t,
                id: crypto.randomUUID(),
                category: t.category || categorizeTransaction(t.description, scope),
                scope,
                tags: [],
                accountName: pf.accountName,
            }));

            allNewTxns.push(...newTxns);
            totalImported += newTxns.length;
        }

        if (allNewTxns.length > 0) {
            await addTransactions(allNewTxns);
        }

        setImportedCount(totalImported);
        setState('success');
    }, [parsedFiles, scope]);

    const resetUpload = () => {
        setState('idle');
        setParsedFiles([]);
        setErrors([]);
        setImportedCount(0);
        setExpandedFile(0);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleSmartCategorize = async () => {
        setIsAILoading(true);
        const uncategorized = parsedFiles.flatMap(pf =>
            pf.result.transactions
                .filter(t => categorizeTransaction(t.description, scope) === 'Uncategorized')
                .map(t => t.description)
        );

        if (uncategorized.length === 0) {
            setIsAILoading(false);
            return;
        }

        try {
            const descriptions = [...new Set(uncategorized)];
            const res = await fetch('/api/ai/categorize', {
                method: 'POST',
                body: JSON.stringify({ descriptions, scope }),
            });
            const mapping = await res.json();

            if (!res.ok) {
                alert(`AI Update Failed: ${mapping.details || 'Check your Gemini API key'}`);
                return;
            }

            // Update local state with AI suggestions
            setParsedFiles(prev => prev.map(pf => ({
                ...pf,
                result: {
                    ...pf.result,
                    transactions: pf.result.transactions.map(t => {
                        const aiCategory = mapping[t.description];
                        if (aiCategory && aiCategory !== 'Uncategorized') {
                            return { ...t, category: aiCategory };
                        }
                        return t;
                    })
                }
            })));

            alert(`Gemini categorized ${Object.keys(mapping).length} new items! Review the categories below.`);

        } catch (err) {
            console.error('AI Suggest Error:', err);
            alert('A network error occurred while reaching Gemini AI.');
        } finally {
            setIsAILoading(false);
        }
    };

    const totalTransactions = parsedFiles.reduce((s, pf) => s + pf.result.transactions.length, 0);

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <AnimatePresence mode="wait">
                {/* ── Idle: Drop Zone ── */}
                {state === 'idle' && (
                    <motion.div
                        key="upload"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                    >
                        <Card className="monarch-card overflow-hidden">
                            <CardContent className="p-0">
                                <div
                                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                                    onDragLeave={() => setDragOver(false)}
                                    onDrop={handleDrop}
                                    onClick={() => fileInputRef.current?.click()}
                                    className={`flex flex-col items-center justify-center min-h-[350px] p-12 cursor-pointer transition-all duration-300 ${dragOver
                                        ? 'bg-emerald-50 border-2 border-dashed border-emerald-400'
                                        : 'border-2 border-dashed border-slate-200 hover:border-emerald-300 hover:bg-slate-50'
                                        } rounded-2xl m-6`}
                                >
                                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 transition-all ${dragOver ? 'bg-emerald-100' : 'bg-slate-100'
                                        }`}>
                                        <Upload className={`w-7 h-7 ${dragOver ? 'text-emerald-600' : 'text-slate-400'}`} />
                                    </div>
                                    <h3 className="text-lg font-semibold text-slate-700 mb-2">Upload Bank Statements</h3>
                                    <p className="text-sm text-slate-400 mb-2 text-center max-w-md">
                                        Drag and drop one or <strong className="text-slate-500">multiple PDF files</strong>, or click to browse.
                                    </p>
                                    <p className="text-xs text-slate-400 mb-6 text-center max-w-md">
                                        We auto-detect CIBC, RBC, and TD PDF statement formats.
                                    </p>
                                    <div className="flex gap-2 mb-4">
                                        <Badge variant="secondary" className="text-xs">PDF Statements Only</Badge>
                                        <Badge variant="secondary" className="text-xs">CIBC</Badge>
                                        <Badge variant="secondary" className="text-xs">RBC</Badge>
                                        <Badge variant="secondary" className="text-xs">TD</Badge>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                                        <Files className="w-3.5 h-3.5" />
                                        <span>Bulk upload supported</span>
                                    </div>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".pdf,application/pdf"
                                        multiple
                                        onChange={handleFileSelect}
                                        className="hidden"
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}

                {/* ── Parsing ── */}
                {
                    state === 'parsing' && (
                        <motion.div
                            key="parsing"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex items-center justify-center min-h-[300px]"
                        >
                            <div className="text-center">
                                <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center mx-auto mb-4 animate-pulse">
                                    <FileText className="w-6 h-6 text-emerald-600" />
                                </div>
                                <p className="text-sm text-slate-500">Parsing your bank statements...</p>
                            </div>
                        </motion.div>
                    )
                }

                {/* ── Preview ── */}
                {
                    state === 'preview' && (
                        <motion.div
                            key="preview"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="space-y-6"
                        >
                            {/* Summary Header */}
                            <Card className="monarch-card">
                                <CardContent className="p-6">
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                                            <CheckCircle className="w-6 h-6 text-emerald-600" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-semibold text-slate-700">
                                                {parsedFiles.length} file{parsedFiles.length > 1 ? 's' : ''} parsed successfully
                                            </h3>
                                            <p className="text-xs text-slate-400">
                                                {totalTransactions} total transactions ready to import as <strong className="text-slate-600 capitalize">{scope}</strong>
                                            </p>
                                        </div>
                                    </div>

                                    {/* Parse Warnings */}
                                    {errors.length > 0 && (
                                        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                                            <p className="text-xs font-semibold text-amber-700 mb-1">Some files had issues:</p>
                                            {errors.map((err, i) => (
                                                <p key={i} className="text-xs text-amber-600">• {err}</p>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* File Cards */}
                            {parsedFiles.map((pf, idx) => (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                >
                                    <Card className="monarch-card overflow-hidden">
                                        {/* File Header */}
                                        <div
                                            className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50/50 transition-colors"
                                            onClick={() => setExpandedFile(expandedFile === idx ? -1 : idx)}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center">
                                                    <FileText className="w-4 h-4 text-slate-500" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-slate-700">{pf.fileName}</p>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{pf.result.bank}</Badge>
                                                        <span className="text-xs text-slate-400">
                                                            {pf.result.transactions.length} txns · {pf.result.accountType}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                                                    className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                                                    title="Remove file"
                                                >
                                                    <X className="w-4 h-4 text-slate-400 hover:text-red-500" />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Expanded: Account Name + Preview */}
                                        {expandedFile === idx && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="border-t border-slate-100"
                                            >
                                                {/* Account Name */}
                                                <div className="px-4 py-3 bg-slate-50/50">
                                                    <label className="block text-xs font-medium text-slate-500 mb-1.5">Account Name</label>
                                                    <input
                                                        type="text"
                                                        value={pf.accountName}
                                                        onChange={(e) => updateAccountName(idx, e.target.value)}
                                                        className="w-full text-sm border border-slate-200 rounded-xl px-4 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                                                        placeholder="e.g. CIBC Chequing, RBC Visa..."
                                                    />
                                                </div>

                                                {/* Preview Table */}
                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-sm">
                                                        <thead>
                                                            <tr className="border-b border-slate-100 bg-slate-50/30">
                                                                <th className="text-left py-2.5 px-4 text-xs font-semibold text-slate-500">Date</th>
                                                                <th className="text-left py-2.5 px-4 text-xs font-semibold text-slate-500">Description</th>
                                                                <th className="text-left py-2.5 px-4 text-xs font-semibold text-slate-500">Category</th>
                                                                <th className="text-right py-2.5 px-4 text-xs font-semibold text-slate-500">Amount</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {pf.result.transactions.slice(0, 10).map((txn, tidx) => (
                                                                <tr key={tidx} className="border-b border-slate-50">
                                                                    <td className="py-2 px-4 text-slate-600 text-xs">{txn.date}</td>
                                                                    <td className="py-2 px-4 text-slate-700 font-medium text-xs truncate max-w-[250px]">{txn.description}</td>
                                                                    <td className="py-2 px-4 text-slate-500 text-xs">
                                                                        {txn.category || categorizeTransaction(txn.description, scope)}
                                                                    </td>
                                                                    <td className={`py-2 px-4 text-right font-semibold text-xs ${txn.amount > 0 ? 'text-emerald-600' : 'text-slate-700'}`}>
                                                                        {formatCurrency(txn.amount)}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                    {pf.result.transactions.length > 10 && (
                                                        <p className="text-xs text-slate-400 text-center py-2">
                                                            +{pf.result.transactions.length - 10} more transactions
                                                        </p>
                                                    )}
                                                </div>
                                            </motion.div>
                                        )}
                                    </Card>
                                </motion.div>
                            ))}

                            {/* Import All Button */}
                            <div className="flex gap-3 justify-end">
                                <Button variant="outline" onClick={resetUpload} className="rounded-xl">
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleSmartCategorize}
                                    disabled={isAILoading}
                                    className="rounded-xl bg-purple-100 text-purple-700 hover:bg-purple-200 border-none px-6"
                                >
                                    <Sparkles className={`w-4 h-4 mr-2 ${isAILoading ? 'animate-spin' : ''}`} />
                                    {isAILoading ? 'AI Working...' : 'Smart Categorize (AI)'}
                                </Button>
                                <Button onClick={handleImportAll} className="rounded-xl bg-emerald-600 hover:bg-emerald-700 px-6">
                                    <Files className="w-4 h-4 mr-2" />
                                    Import All — {totalTransactions} Transactions
                                </Button>
                            </div>
                        </motion.div>
                    )
                }

                {/* ── Success ── */}
                {
                    state === 'success' && (
                        <motion.div
                            key="success"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="text-center py-20"
                        >
                            <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto mb-6">
                                <CheckCircle className="w-8 h-8 text-emerald-600" />
                            </div>
                            <h3 className="text-xl font-semibold text-slate-700 mb-2">Import Successful!</h3>
                            <p className="text-sm text-slate-400 mb-8">
                                {importedCount} transactions from {parsedFiles.length} file{parsedFiles.length > 1 ? 's' : ''} imported into your {scope} dashboard.
                            </p>
                            <div className="flex gap-3 justify-center">
                                <Button variant="outline" onClick={resetUpload} className="rounded-xl">
                                    Upload More
                                </Button>
                                <Button asChild className="rounded-xl bg-emerald-600 hover:bg-emerald-700">
                                    <a href="/transactions">View Transactions</a>
                                </Button>
                            </div>
                        </motion.div>
                    )
                }

                {/* ── Error ── */}
                {
                    state === 'error' && (
                        <motion.div
                            key="error"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-center py-20"
                        >
                            <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-6">
                                <XCircle className="w-8 h-8 text-red-500" />
                            </div>
                            <h3 className="text-xl font-semibold text-slate-700 mb-2">Upload Error</h3>
                            <div className="space-y-1 mb-8">
                                {errors.map((err, i) => (
                                    <p key={i} className="text-sm text-red-500">{err}</p>
                                ))}
                            </div>
                            <Button variant="outline" onClick={resetUpload} className="rounded-xl">
                                Try Again
                            </Button>
                        </motion.div>
                    )
                }
            </AnimatePresence >
        </div >
    );
}
