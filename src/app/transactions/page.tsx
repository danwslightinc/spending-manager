'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, ArrowUpRight, ArrowDownRight, Trash2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useScope } from '@/lib/scope-context';
import { getAllTransactions, updateTransaction, deleteTransaction } from '@/lib/storage';
import { formatCurrency } from '@/lib/analytics';
import { getCategoriesForScope, CATEGORY_COLORS, categorizeTransaction, cleanDescription } from '@/lib/categories';
import { Transaction } from '@/lib/types';

type SortField = 'date' | 'amount' | 'description' | 'category';
type SortDir = 'asc' | 'desc';

export default function TransactionsPage() {
    const { scope } = useScope();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [search, setSearch] = useState('');
    const [sortField, setSortField] = useState<SortField>('date');
    const [sortDir, setSortDir] = useState<SortDir>('desc');
    const [filterCategory, setFilterCategory] = useState<string>('all');
    const [isAILoading, setIsAILoading] = useState(false);

    useEffect(() => {
        async function fetchData() {
            setTransactions(await getAllTransactions());
        }
        fetchData();
    }, []);

    const categories = useMemo(() => getCategoriesForScope(scope), [scope]);

    const filteredTxns = useMemo(() => {
        let txns = transactions.filter(t => t.scope === scope);

        // Search
        if (search) {
            const q = search.toLowerCase();
            txns = txns.filter(t =>
                t.description.toLowerCase().includes(q) ||
                t.category.toLowerCase().includes(q) ||
                t.bank.toLowerCase().includes(q)
            );
        }

        // Category filter
        if (filterCategory !== 'all') {
            txns = txns.filter(t => t.category === filterCategory);
        }

        // Sort
        txns.sort((a, b) => {
            let cmp = 0;
            switch (sortField) {
                case 'date': cmp = a.date.localeCompare(b.date); break;
                case 'amount': cmp = a.amount - b.amount; break;
                case 'description': cmp = a.description.localeCompare(b.description); break;
                case 'category': cmp = a.category.localeCompare(b.category); break;
            }
            return sortDir === 'desc' ? -cmp : cmp;
        });

        return txns;
    }, [transactions, scope, search, sortField, sortDir, filterCategory]);

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDir('desc');
        }
    };

    const handleCategoryChange = async (txnId: string, newCategory: string) => {
        await updateTransaction(txnId, { category: newCategory });
        setTransactions(await getAllTransactions());
    };

    const handleDelete = async (txnId: string) => {
        await deleteTransaction(txnId);
        setTransactions(await getAllTransactions());
    };

    const handleSmartClean = async () => {
        setIsAILoading(true);
        const uncategorized = transactions.filter(t => t.scope === scope && t.category === 'Uncategorized');

        if (uncategorized.length === 0) {
            setIsAILoading(false);
            alert('No "Uncategorized" transactions found to process.');
            return;
        }

        try {
            // Clean descriptions by removing redundant dates and removing duplicates for AI matching
            const descriptions = [...new Set(uncategorized.map(u => cleanDescription(u.description)))];
            const res = await fetch('/api/ai/categorize', {
                method: 'POST',
                body: JSON.stringify({ descriptions, scope }),
            });

            const mapping = await res.json();

            if (!res.ok) {
                alert(`AI Update Failed: ${mapping.details || 'Check your Gemini API key'}`);
                return;
            }

            // Bulk update categories in DB
            for (const txn of uncategorized) {
                const aiCategory = mapping[cleanDescription(txn.description)];
                if (aiCategory && aiCategory !== 'Uncategorized') {
                    await updateTransaction(txn.id, { category: aiCategory });
                }
            }

            setTransactions(await getAllTransactions());
            alert(`Smart Clean finished! Categorized ${Object.keys(mapping).length} unique items.`);
        } catch (err) {
            console.error('AI Clean Error:', err);
            alert('A network error occurred while reaching Gemini AI.');
        } finally {
            setIsAILoading(false);
        }
    };

    const sortIndicator = (field: SortField) => {
        if (sortField !== field) return null;
        return sortDir === 'asc' ? ' ↑' : ' ↓';
    };

    return (
        <div className="space-y-6">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                        placeholder="Search transactions..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9 bg-white border-slate-200 rounded-xl"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-slate-400" />
                    <select
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                        className="text-sm border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    >
                        <option value="all">All Categories</option>
                        {categories.map(c => (
                            <option key={c} value={c}>{c}</option>
                        ))}
                    </select>
                    <Button
                        onClick={handleSmartClean}
                        disabled={isAILoading}
                        className="rounded-xl bg-purple-100 text-purple-700 hover:bg-purple-200 border-none px-6"
                    >
                        <Sparkles className={`w-4 h-4 mr-2 ${isAILoading ? 'animate-spin' : ''}`} />
                        {isAILoading ? 'Cleaning...' : 'Smart Clean (AI)'}
                    </Button>
                </div>
            </div>

            {/* Transaction count */}
            <p className="text-sm text-slate-400">{filteredTxns.length} transactions</p>

            {/* Table */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="monarch-card overflow-hidden">
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-slate-100 bg-slate-50/50">
                                        <th className="w-10"></th>
                                        <th
                                            className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-700"
                                            onClick={() => handleSort('date')}
                                        >
                                            Date{sortIndicator('date')}
                                        </th>
                                        <th
                                            className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-700"
                                            onClick={() => handleSort('description')}
                                        >
                                            Description{sortIndicator('description')}
                                        </th>
                                        <th
                                            className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-700"
                                            onClick={() => handleSort('category')}
                                        >
                                            Category{sortIndicator('category')}
                                        </th>
                                        <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Bank</th>
                                        <th
                                            className="text-right py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-700"
                                            onClick={() => handleSort('amount')}
                                        >
                                            Amount{sortIndicator('amount')}
                                        </th>
                                        <th className="w-10"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredTxns.map((txn) => (
                                        <tr key={txn.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors group">
                                            <td className="py-3 px-3">
                                                <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${txn.amount > 0 ? 'bg-emerald-50' : 'bg-red-50'
                                                    }`}>
                                                    {txn.amount > 0 ? (
                                                        <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
                                                    ) : (
                                                        <ArrowDownRight className="w-3.5 h-3.5 text-red-500" />
                                                    )}
                                                </div>
                                            </td>
                                            <td className="py-3 px-4 text-slate-600 whitespace-nowrap">{txn.date}</td>
                                            <td className="py-3 px-4 text-slate-700 font-medium max-w-[300px] truncate">{cleanDescription(txn.description)}</td>
                                            <td className="py-3 px-4">
                                                <select
                                                    value={txn.category}
                                                    onChange={(e) => handleCategoryChange(txn.id, e.target.value)}
                                                    className="text-xs font-medium px-2 py-1 rounded-lg border-0 bg-transparent hover:bg-slate-100 cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                                                    style={{ color: CATEGORY_COLORS[txn.category] || '#64748B' }}
                                                >
                                                    {categories.map(c => (
                                                        <option key={c} value={c}>{c}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="py-3 px-4">
                                                <Badge variant="secondary" className="text-[10px] font-medium">{txn.bank}</Badge>
                                            </td>
                                            <td className={`py-3 px-4 text-right font-semibold whitespace-nowrap ${txn.amount > 0 ? 'text-emerald-600' : 'text-slate-700'
                                                }`}>
                                                {formatCurrency(txn.amount)}
                                            </td>
                                            <td className="py-3 px-2">
                                                <button
                                                    onClick={() => handleDelete(txn.id)}
                                                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 transition-all"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {filteredTxns.length === 0 && (
                                <div className="text-center py-16 text-slate-400">
                                    <p className="text-sm">No transactions found.</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}
