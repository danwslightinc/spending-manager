'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LayoutDashboard,
    ArrowLeftRight,
    PieChart,
    GitBranch,
    Upload,
    TrendingUp,
    Settings,
    ChevronLeft,
    ChevronRight,
    Wallet,
    Building2,
    User,
} from 'lucide-react';
import { useScope } from '@/lib/scope-context';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
    { href: '/', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
    { href: '/cash-flow', label: 'Cash Flow', icon: TrendingUp },
    { href: '/spending', label: 'Spending', icon: PieChart },
    { href: '/flow', label: 'Money Flow', icon: GitBranch },
    { href: '/upload', label: 'Upload', icon: Upload },
];

export default function Sidebar() {
    const [collapsed, setCollapsed] = useState(false);
    const pathname = usePathname();
    const { scope, setScope } = useScope();

    return (
        <motion.aside
            initial={false}
            animate={{ width: collapsed ? 72 : 260 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className={cn(
                'fixed left-0 top-0 bottom-0 z-40 flex flex-col border-r border-slate-200/80 bg-white',
                'shadow-[1px_0_3px_0_rgba(0,0,0,0.04)]'
            )}
        >
            {/* Logo */}
            <div className="flex items-center gap-3 px-5 h-16 border-b border-slate-100">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 shadow-md shadow-emerald-200/50">
                    <Wallet className="w-4 h-4 text-white" />
                </div>
                <AnimatePresence>
                    {!collapsed && (
                        <motion.span
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            className="font-semibold text-slate-800 text-[15px] whitespace-nowrap"
                        >
                            Spend Manager
                        </motion.span>
                    )}
                </AnimatePresence>
            </div>

            {/* Scope Switcher */}
            <div className="px-3 pt-4 pb-2">
                <AnimatePresence>
                    {!collapsed ? (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex p-1 bg-slate-100 rounded-xl"
                        >
                            <button
                                onClick={() => setScope('personal')}
                                className={cn(
                                    'flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium transition-all duration-200',
                                    scope === 'personal'
                                        ? 'bg-white text-slate-800 shadow-sm'
                                        : 'text-slate-500 hover:text-slate-700'
                                )}
                            >
                                <User className="w-3.5 h-3.5" />
                                Personal
                            </button>
                            <button
                                onClick={() => setScope('business')}
                                className={cn(
                                    'flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium transition-all duration-200',
                                    scope === 'business'
                                        ? 'bg-white text-slate-800 shadow-sm'
                                        : 'text-slate-500 hover:text-slate-700'
                                )}
                            >
                                <Building2 className="w-3.5 h-3.5" />
                                Business
                            </button>
                        </motion.div>
                    ) : (
                        <motion.button
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setScope(scope === 'personal' ? 'business' : 'personal')}
                            className="flex items-center justify-center w-full p-2 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors"
                            title={`Switch to ${scope === 'personal' ? 'Business' : 'Personal'}`}
                        >
                            {scope === 'personal' ? (
                                <User className="w-4 h-4 text-slate-600" />
                            ) : (
                                <Building2 className="w-4 h-4 text-slate-600" />
                            )}
                        </motion.button>
                    )}
                </AnimatePresence>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
                {NAV_ITEMS.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                'relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                                isActive
                                    ? 'text-emerald-700 bg-emerald-50'
                                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                            )}
                        >
                            {isActive && (
                                <motion.div
                                    layoutId="sidebar-active"
                                    className="absolute inset-0 rounded-xl bg-emerald-50 border border-emerald-100"
                                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                                />
                            )}
                            <Icon className={cn('relative z-10 w-5 h-5', isActive ? 'text-emerald-600' : '')} />
                            <AnimatePresence>
                                {!collapsed && (
                                    <motion.span
                                        initial={{ opacity: 0, x: -5 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -5 }}
                                        className="relative z-10 whitespace-nowrap"
                                    >
                                        {item.label}
                                    </motion.span>
                                )}
                            </AnimatePresence>
                        </Link>
                    );
                })}
            </nav>

            {/* Settings + Collapse */}
            <div className="px-3 pb-4 space-y-1 border-t border-slate-100 pt-3">
                <Link
                    href="/settings"
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-all"
                >
                    <Settings className="w-5 h-5" />
                    <AnimatePresence>
                        {!collapsed && (
                            <motion.span
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="whitespace-nowrap"
                            >
                                Settings
                            </motion.span>
                        )}
                    </AnimatePresence>
                </Link>

                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all w-full"
                >
                    {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
                    <AnimatePresence>
                        {!collapsed && (
                            <motion.span
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="whitespace-nowrap"
                            >
                                Collapse
                            </motion.span>
                        )}
                    </AnimatePresence>
                </button>
            </div>
        </motion.aside>
    );
}
