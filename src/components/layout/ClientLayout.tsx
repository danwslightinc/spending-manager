'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import TopNav from './TopNav';
import { ScopeProvider } from '@/lib/scope-context';

export function ClientLayout({ children }: { children: React.ReactNode }) {
    const [mounted, setMounted] = useState(false);
    const { data: session, status } = useSession();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        setMounted(true);
    }, []);

    // Redirect unauthenticated users to login (skip the login page itself)
    useEffect(() => {
        if (status === 'unauthenticated' && pathname !== '/login') {
            router.push('/login');
        }
    }, [status, pathname, router]);

    // Show loading spinner while session is resolving or component is mounting
    if (!mounted || status === 'loading' || (status === 'unauthenticated' && pathname !== '/login')) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#F8FAFC]">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 animate-pulse" />
                    <span className="text-sm text-slate-400">Loading...</span>
                </div>
            </div>
        );
    }

    // Render just the page content for the login route (no shell)
    if (pathname === '/login') {
        return <>{children}</>;
    }

    return (
        <ScopeProvider>
            <div className="flex min-h-screen bg-[#F8FAFC]">
                <Sidebar />
                <main className="flex-1 ml-[260px] transition-all duration-200">
                    <TopNav />
                    <div className="p-8">
                        {children}
                    </div>
                </main>
            </div>
        </ScopeProvider>
    );
}

