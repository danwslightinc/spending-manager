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

    const incomeCategories = new Map<string, number>();
    for (const t of income) {
        let cat = t.category || 'Earnings';
        incomeCategories.set(cat, (incomeCategories.get(cat) || 0) + t.amount);
    }

    const expenseCategories = new Map<string, number>();
    for (const t of expenses) {
        let cat = t.category || 'Uncategorized';
        // Prevent circular links if an expense is somehow categorized as one of our source nodes
        if (incomeCategories.has(cat)) {
            cat = cat + ' (Spending)';
        }
        expenseCategories.set(cat, (expenseCategories.get(cat) || 0) + Math.abs(t.amount));
    }

    const nodes: SankeyData['nodes'] = [];
    const links: SankeyData['links'] = [];

    // Add source nodes (income categories)
    for (const [cat, value] of incomeCategories) {
        nodes.push({ id: cat, nodeColor: CATEGORY_COLORS[cat] || '#22C55E' });
    }

    // Add target nodes (expense categories)
    for (const [cat, value] of expenseCategories) {
        nodes.push({ id: cat, nodeColor: CATEGORY_COLORS[cat] || '#F87171' });

        // Link all income proportionally to expenses
        // Simplification: Just link the largest source to expenses for now to avoid mess, 
        // OR distribute proportionally. Let's do a single 'Total Funds' virtual balance point
        // if multiple sources exist, or just link each source to categories.
    }

    // For a clean Sankey, we'll link all sources to their destination categories
    // We'll use a virtual 'Funds' node to act as a bridge if there are multiple sources
    if (incomeCategories.size > 1) {
        nodes.push({ id: 'Funds', nodeColor: '#94A3B8' });
        for (const [cat, value] of incomeCategories) {
            links.push({ source: cat, target: 'Funds', value: Math.round(value * 100) / 100 });
        }
        for (const [cat, value] of expenseCategories) {
            const ratio = totalExpenses > 0 ? value / totalExpenses : 0;
            links.push({ source: 'Funds', target: cat, value: Math.round(value * 100) / 100 });
        }
        if (savings > 0) {
            nodes.push({ id: 'Savings', nodeColor: '#0EA5E9' });
            links.push({ source: 'Funds', target: 'Savings', value: Math.round(savings * 100) / 100 });
        }
    } else {
        const sourceName = incomeCategories.keys().next().value || 'Earnings';
        // Ensure source exists even if no income transactions
        if (!incomeCategories.has(sourceName)) nodes.push({ id: sourceName, nodeColor: '#22C55E' });

        for (const [cat, value] of expenseCategories) {
            links.push({ source: sourceName, target: cat, value: Math.round(value * 100) / 100 });
        }
        if (savings > 0) {
            nodes.push({ id: 'Savings', nodeColor: '#0EA5E9' });
            links.push({ source: sourceName, target: 'Savings', value: Math.round(savings * 100) / 100 });
        }
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
