'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Bell, Search, LogOut, ChevronDown } from 'lucide-react';
import { useScope } from '@/lib/scope-context';
import { Input } from '@/components/ui/input';
import { useSession, signOut } from 'next-auth/react';
import Image from 'next/image';

const PAGE_TITLES: Record<string, string> = {
    '/': 'Dashboard',
    '/transactions': 'Transactions',
    '/cash-flow': 'Cash Flow',
    '/spending': 'Spending',
    '/flow': 'Money Flow',
    '/upload': 'Upload Statements',
    '/settings': 'Settings',
};

export default function TopNav() {
    const pathname = usePathname();
    const { scope } = useScope();
    const pageTitle = PAGE_TITLES[pathname] || 'Dashboard';
    const { data: session } = useSession();
    const [menuOpen, setMenuOpen] = useState(false);

    const user = session?.user;
    // Build initials from the user's name
    const initials = user?.name
        ? user.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
        : 'U';

    return (
        <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-8 bg-white/80 backdrop-blur-md border-b border-slate-100">
            {/* Left: Title */}
            <div className="flex items-center gap-4">
                <h1 className="text-xl font-semibold text-slate-800">{pageTitle}</h1>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-500 capitalize">
                    {scope}
                </span>
            </div>

            {/* Right: Search + Actions */}
            <div className="flex items-center gap-4">
                <div className="relative hidden md:block">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                        placeholder="Search transactions..."
                        className="pl-9 w-64 h-9 bg-slate-50 border-slate-200 rounded-xl text-sm placeholder:text-slate-400 focus:bg-white"
                    />
                </div>
                <button className="relative p-2 rounded-xl hover:bg-slate-50 transition-colors">
                    <Bell className="w-5 h-5 text-slate-500" />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-500 rounded-full" />
                </button>

                {/* User avatar + dropdown */}
                <div className="relative">
                    <button
                        onClick={() => setMenuOpen((prev) => !prev)}
                        className="flex items-center gap-2 rounded-xl px-2 py-1 hover:bg-slate-50 transition-colors"
                        aria-label="User menu"
                    >
                        {user?.image ? (
                            <Image
                                src={user.image}
                                alt={user.name ?? 'User'}
                                width={36}
                                height={36}
                                className="rounded-xl object-cover"
                            />
                        ) : (
                            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 text-white text-sm font-semibold shadow-sm">
                                {initials}
                            </div>
                        )}
                        <ChevronDown className="w-4 h-4 text-slate-400 hidden md:block" />
                    </button>

                    {menuOpen && (
                        <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white border border-slate-100 shadow-xl overflow-hidden z-50">
                            <div className="px-4 py-3 border-b border-slate-100">
                                <p className="text-sm font-semibold text-slate-800 truncate">{user?.name ?? 'User'}</p>
                                <p className="text-xs text-slate-400 truncate">{user?.email ?? ''}</p>
                            </div>
                            <button
                                onClick={() => signOut({ callbackUrl: '/login' })}
                                className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-500 hover:bg-red-50 transition-colors"
                            >
                                <LogOut className="w-4 h-4" />
                                Sign out
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}

