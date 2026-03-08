'use client';

import React, { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useScope } from '@/lib/scope-context';
import { getAllTransactions } from '@/lib/storage';
import { getSankeyData, formatCurrency } from '@/lib/analytics';
import type { SankeyData, Transaction } from '@/lib/types';

// Dynamic import for @nivo/sankey (SSR incompatible)
const ResponsiveSankey = dynamic(
    () => import('@nivo/sankey').then(mod => mod.ResponsiveSankey),
    { ssr: false, loading: () => <div className="h-[500px] flex items-center justify-center text-slate-400">Loading chart...</div> }
);

export default function FlowPage() {
    const { scope } = useScope();
    const [transactions, setTransactions] = useState<Transaction[]>([]);

    useEffect(() => {
        async function fetchData() {
            setTransactions(await getAllTransactions());
        }
        fetchData();
    }, []);

    const scopedTxns = useMemo(() => transactions.filter(t => t.scope === scope), [transactions, scope]);
    const sankeyData = useMemo(() => getSankeyData(scopedTxns), [scopedTxns]);

    const hasData = sankeyData.links.length > 0;

    return (
        <div className="space-y-8">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="monarch-card">
                    <CardHeader>
                        <div>
                            <CardTitle className="text-base font-semibold text-slate-700">Money Flow</CardTitle>
                            <p className="text-sm text-slate-400 mt-1">
                                Visualize how your income flows into spending categories and savings
                            </p>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {hasData ? (
                            <div className="h-[500px]">
                                <ResponsiveSankey
                                    data={sankeyData}
                                    margin={{ top: 20, right: 160, bottom: 20, left: 20 }}
                                    align="justify"
                                    colors={(node: SankeyData['nodes'][0]) => node.nodeColor || '#CBD5E1'}
                                    nodeOpacity={1}
                                    nodeHoverOthersOpacity={0.35}
                                    nodeThickness={18}
                                    nodeSpacing={24}
                                    nodeBorderWidth={0}
                                    nodeBorderRadius={3}
                                    linkOpacity={0.3}
                                    linkHoverOpacity={0.6}
                                    linkContract={3}
                                    enableLinkGradient={true}
                                    labelPosition="outside"
                                    labelOrientation="horizontal"
                                    labelPadding={16}
                                    labelTextColor={{ from: 'color', modifiers: [['darker', 1.5]] }}
                                    nodeTooltip={({ node }: { node: { id: string; value: number; color: string } }) => (
                                        <div className="bg-white/95 backdrop-blur-sm rounded-xl px-4 py-3 shadow-lg border border-slate-100">
                                            <p className="text-xs font-medium text-slate-500">{node.id}</p>
                                            <p className="text-sm font-semibold" style={{ color: node.color }}>
                                                {formatCurrency(node.value)}
                                            </p>
                                        </div>
                                    )}
                                    linkTooltip={({ link }: { link: { source: { id: string }; target: { id: string }; value: number } }) => (
                                        <div className="bg-white/95 backdrop-blur-sm rounded-xl px-4 py-3 shadow-lg border border-slate-100">
                                            <p className="text-xs text-slate-500">
                                                {link.source.id} → {link.target.id}
                                            </p>
                                            <p className="text-sm font-semibold text-slate-700">
                                                {formatCurrency(link.value)}
                                            </p>
                                        </div>
                                    )}
                                />
                            </div>
                        ) : (
                            <div className="h-[300px] flex items-center justify-center">
                                <div className="text-center text-slate-400">
                                    <p className="text-sm">No transaction data to visualize.</p>
                                    <p className="text-xs mt-1">Upload bank statements to see your money flow.</p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}
