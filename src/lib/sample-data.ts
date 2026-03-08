import { Transaction, Scope } from './types';
import { categorizeTransaction } from './categories';

/**
 * Generate sample transactions for demo/testing purposes.
 * Provides a realistic set of Canadian personal & business transactions.
 */

function randomId(): string {
    return Math.random().toString(36).slice(2, 11);
}

function randomDate(startMonth: string, endMonth: string): string {
    const start = new Date(startMonth + '-01');
    const end = new Date(endMonth + '-28');
    const diff = end.getTime() - start.getTime();
    const date = new Date(start.getTime() + Math.random() * diff);
    return date.toISOString().slice(0, 10);
}

interface SampleEntry {
    description: string;
    amountRange: [number, number];
    isIncome?: boolean;
}

const PERSONAL_SAMPLES: SampleEntry[] = [
    { description: 'COSTCO WHOLESALE #1234', amountRange: [80, 350] },
    { description: 'LOBLAWS #5678', amountRange: [40, 180] },
    { description: 'NO FRILLS #9012', amountRange: [25, 120] },
    { description: 'TIM HORTONS #3456', amountRange: [3, 15] },
    { description: 'STARBUCKS #7890', amountRange: [5, 12] },
    { description: 'UBER TRIP', amountRange: [8, 45] },
    { description: 'UBER EATS', amountRange: [15, 55] },
    { description: 'PRESTO RELOAD', amountRange: [20, 100] },
    { description: 'ESSO STATION #123', amountRange: [40, 90] },
    { description: 'NETFLIX.COM', amountRange: [16, 23] },
    { description: 'SPOTIFY PREMIUM', amountRange: [10, 11] },
    { description: 'AMAZON.CA MARKETPLACE', amountRange: [15, 200] },
    { description: 'SHOPPERS DRUG MART #456', amountRange: [10, 80] },
    { description: 'CANADIAN TIRE #789', amountRange: [20, 150] },
    { description: 'ROGERS WIRELESS', amountRange: [70, 100] },
    { description: 'ENBRIDGE GAS', amountRange: [50, 180] },
    { description: 'HYDRO ONE', amountRange: [60, 200] },
    { description: 'MCDONALD\'S #2345', amountRange: [8, 25] },
    { description: 'CINEPLEX GALAXY', amountRange: [15, 45] },
    { description: 'GOODLIFE FITNESS', amountRange: [50, 60] },
    { description: 'IKEA CANADA', amountRange: [30, 400] },
    { description: 'DIRECT DEPOSIT - PAYROLL', amountRange: [3500, 5500], isIncome: true },
    { description: 'E-TRANSFER RECEIVED', amountRange: [50, 500], isIncome: true },
    { description: 'INTEREST PAYMENT', amountRange: [2, 15], isIncome: true },
];

const BUSINESS_SAMPLES: SampleEntry[] = [
    { description: 'GITHUB INC.', amountRange: [7, 44] },
    { description: 'VERCEL INC.', amountRange: [20, 100] },
    { description: 'AWS SERVICES', amountRange: [50, 500] },
    { description: 'GOOGLE WORKSPACE', amountRange: [14, 30] },
    { description: 'ZOOM COMMUNICATIONS', amountRange: [17, 25] },
    { description: 'SLACK TECHNOLOGIES', amountRange: [8, 15] },
    { description: 'NOTION LABS', amountRange: [10, 16] },
    { description: 'STAPLES CANADA #123', amountRange: [25, 200] },
    { description: 'BEST BUY BUSINESS', amountRange: [100, 1500] },
    { description: 'LINKEDIN PREMIUM', amountRange: [35, 60] },
    { description: 'GOOGLE ADS', amountRange: [50, 500] },
    { description: 'CLIENT PAYMENT - INVOICE #001', amountRange: [2000, 8000], isIncome: true },
    { description: 'CLIENT PAYMENT - INVOICE #002', amountRange: [1500, 5000], isIncome: true },
    { description: 'CONSULTING FEE RECEIVED', amountRange: [500, 3000], isIncome: true },
];

function generateForScope(scope: Scope, samples: SampleEntry[], count: number): Transaction[] {
    const transactions: Transaction[] = [];
    const banks = ['CIBC', 'RBC', 'TD'] as const;

    for (let i = 0; i < count; i++) {
        const sample = samples[Math.floor(Math.random() * samples.length)];
        const [min, max] = sample.amountRange;
        const rawAmount = min + Math.random() * (max - min);
        const amount = sample.isIncome
            ? Math.round(rawAmount * 100) / 100
            : -Math.round(rawAmount * 100) / 100;
        const bank = banks[Math.floor(Math.random() * banks.length)];
        const date = randomDate('2025-01', '2026-03');
        const description = sample.description;

        transactions.push({
            id: randomId(),
            date,
            description,
            amount,
            category: categorizeTransaction(description, scope),
            bank,
            accountType: amount > 0 ? 'chequing' : (Math.random() > 0.5 ? 'chequing' : 'credit'),
            accountName: `${bank} ${amount > 0 ? 'Chequing' : (Math.random() > 0.5 ? 'Chequing' : 'Visa')}`,
            scope,
            tags: [],
        });
    }

    return transactions;
}

export function generateSampleData(): Transaction[] {
    const personal = generateForScope('personal', PERSONAL_SAMPLES, 150);
    const business = generateForScope('business', BUSINESS_SAMPLES, 60);
    return [...personal, ...business];
}
