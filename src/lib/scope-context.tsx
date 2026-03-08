'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Scope } from '@/lib/types';

interface ScopeContextType {
    scope: Scope;
    setScope: (scope: Scope) => void;
    toggleScope: () => void;
}

const ScopeContext = createContext<ScopeContextType>({
    scope: 'personal',
    setScope: () => { },
    toggleScope: () => { },
});

export function ScopeProvider({ children }: { children: ReactNode }) {
    const [scope, setScopeState] = useState<Scope>('personal');

    const setScope = useCallback((newScope: Scope) => {
        setScopeState(newScope);
    }, []);

    const toggleScope = useCallback(() => {
        setScopeState(prev => prev === 'personal' ? 'business' : 'personal');
    }, []);

    return (
        <ScopeContext.Provider value={{ scope, setScope, toggleScope }}>
            {children}
        </ScopeContext.Provider>
    );
}

export function useScope() {
    return useContext(ScopeContext);
}
