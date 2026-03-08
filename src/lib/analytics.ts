import { Transaction, MonthlyData, CategoryBreakdown, SankeyData } from './types';
import { CATEGORY_COLORS } from './categories';

/**
 * Get monthly summary data from transactions
 */
export function getMonthlyData(transactions: Transaction[]): MonthlyData[] {
    const map = new Map<string, { income: number; expenses: number }>();

    for (const t of transactions) {
        const month = t.date.slice(0, 7); // YYYY-MM
        const entry = map.get(month) || { income: 0, expenses: 0 };
        if (t.amount > 0) {
            entry.income += t.amount;
        } else {
            entry.expenses += Math.abs(t.amount);
        }
        map.set(month, entry);
    }

    return Array.from(map.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, data]) => ({
            month,
            income: Math.round(data.income * 100) / 100,
            expenses: Math.round(data.expenses * 100) / 100,
            net: Math.round((data.income - data.expenses) * 100) / 100,
        }));
}

/**
 * Get category breakdown from transactions
 */
export function getCategoryBreakdown(transactions: Transaction[]): CategoryBreakdown[] {
    const expenses = transactions.filter(t => t.amount < 0);
    const totalExpenses = expenses.reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const map = new Map<string, { amount: number; count: number }>();

    for (const t of expenses) {
        const cat = t.category || 'Uncategorized';
        const entry = map.get(cat) || { amount: 0, count: 0 };
        entry.amount += Math.abs(t.amount);
        entry.count += 1;
        map.set(cat, entry);
    }

    return Array.from(map.entries())
        .map(([category, data]) => ({
            category,
            amount: Math.round(data.amount * 100) / 100,
            percentage: totalExpenses > 0 ? Math.round((data.amount / totalExpenses) * 1000) / 10 : 0,
            count: data.count,
            color: CATEGORY_COLORS[category] || '#CBD5E1',
        }))
        .sort((a, b) => b.amount - a.amount);
}

/**
 * Get total balance across all transactions
 */
export function getNetBalance(transactions: Transaction[]): number {
    return Math.round(transactions.reduce((sum, t) => sum + t.amount, 0) * 100) / 100;
}

/**
 * Get total income
 */
export function getTotalIncome(transactions: Transaction[]): number {
    return Math.round(
        transactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0) * 100
    ) / 100;
}

/**
 * Get total expenses
 */
export function getTotalExpenses(transactions: Transaction[]): number {
    return Math.round(
        transactions.filter(t => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0) * 100
    ) / 100;
}

/**
 * Get cumulative net worth over time (daily)
 */
export function getCumulativeNetWorth(transactions: Transaction[]): { date: string; value: number }[] {
    const sorted = [...transactions].sort((a, b) => a.date.localeCompare(b.date));
    let cumulative = 0;
    const dailyMap = new Map<string, number>();

    for (const t of sorted) {
        cumulative += t.amount;
        dailyMap.set(t.date, cumulative);
    }

    return Array.from(dailyMap.entries()).map(([date, value]) => ({
        date,
        value: Math.round(value * 100) / 100,
    }));
}

/**
 * Get Sankey diagram data: Income → Categories → Savings
 */
export function getSankeyData(transactions: Transaction[]): SankeyData {
    const income = transactions.filter(t => t.amount > 0);
    const expenses = transactions.filter(t => t.amount < 0);

    const totalIncome = income.reduce((sum, t) => sum + t.amount, 0);
    const totalExpenses = expenses.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const savings = totalIncome - totalExpenses;

    // Income sources → Category spending
    const categoryExpenses = new Map<string, number>();
    for (const t of expenses) {
        const cat = t.category || 'Uncategorized';
        categoryExpenses.set(cat, (categoryExpenses.get(cat) || 0) + Math.abs(t.amount));
    }

    const nodes: SankeyData['nodes'] = [
        { id: 'Income', nodeColor: '#22C55E' },
    ];

    const links: SankeyData['links'] = [];

    // Add category nodes and links from Income
    for (const [cat, amount] of categoryExpenses) {
        if (amount > 0) {
            nodes.push({ id: cat, nodeColor: CATEGORY_COLORS[cat] || '#CBD5E1' });
            links.push({ source: 'Income', target: cat, value: Math.round(amount * 100) / 100 });
        }
    }

    // Add savings node
    if (savings > 0) {
        nodes.push({ id: 'Savings', nodeColor: '#0EA5E9' });
        links.push({ source: 'Income', target: 'Savings', value: Math.round(savings * 100) / 100 });
    }

    return { nodes, links };
}

/**
 * Get recent transactions (sorted by date, newest first)
 */
export function getRecentTransactions(transactions: Transaction[], limit = 10): Transaction[] {
    return [...transactions]
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, limit);
}

/**
 * Get transaction count per bank
 */
export function getTransactionsByBank(transactions: Transaction[]): Record<string, number> {
    const result: Record<string, number> = {};
    for (const t of transactions) {
        result[t.bank] = (result[t.bank] || 0) + 1;
    }
    return result;
}

/**
 * Format currency
 */
export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-CA', {
        style: 'currency',
        currency: 'CAD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount);
}

/**
 * Format compact currency (e.g. $1.2K)
 */
export function formatCompactCurrency(amount: number): string {
    if (Math.abs(amount) >= 1_000_000) {
        return `$${(amount / 1_000_000).toFixed(1)}M`;
    }
    if (Math.abs(amount) >= 1_000) {
        return `$${(amount / 1_000).toFixed(1)}K`;
    }
    return formatCurrency(amount);
}

/**
 * Format month name
 */
export function formatMonth(yyyymm: string): string {
    const [year, month] = yyyymm.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-CA', { month: 'short', year: 'numeric' });
}
