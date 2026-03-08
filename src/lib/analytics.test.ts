import { describe, it, expect } from 'vitest';
import { getMonthlyData, getNetBalance, getTotalIncome, getTotalExpenses } from '@/lib/analytics';
import { Transaction } from '@/lib/types';

const mockTransactions: Transaction[] = [
    {
        id: '1',
        date: '2024-01-10',
        description: 'Salary',
        amount: 5000,
        category: 'Income',
        bank: 'TD',
        accountType: 'chequing',
        accountName: 'TD main',
        scope: 'personal',
        tags: []
    },
    {
        id: '2',
        date: '2024-01-15',
        description: 'Rent',
        amount: -2000,
        category: 'Housing',
        bank: 'TD',
        accountType: 'chequing',
        accountName: 'TD main',
        scope: 'personal',
        tags: []
    },
    {
        id: '3',
        date: '2024-02-05',
        description: 'Groceries',
        amount: -150.50,
        category: 'Food',
        bank: 'RBC',
        accountType: 'credit',
        accountName: 'RBC visa',
        scope: 'personal',
        tags: []
    }
];

describe('Analytics Helpers', () => {
    it('should calculate net balance correctly', () => {
        expect(getNetBalance(mockTransactions)).toBe(2849.50);
    });

    it('should calculate total income and expenses', () => {
        expect(getTotalIncome(mockTransactions)).toBe(5000);
        expect(getTotalExpenses(mockTransactions)).toBe(2150.50);
    });

    it('should group monthly data accurately', () => {
        const monthly = getMonthlyData(mockTransactions);
        expect(monthly).toHaveLength(2);
        expect(monthly[0].month).toBe('2024-01');
        expect(monthly[0].income).toBe(5000);
        expect(monthly[0].expenses).toBe(2000);
        expect(monthly[1].month).toBe('2024-02');
        expect(monthly[1].expenses).toBe(150.50);
    });
});
