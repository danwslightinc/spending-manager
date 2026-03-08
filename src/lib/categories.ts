import { CategoryRule, Scope } from './types';

// Category colors for charts
export const CATEGORY_COLORS: Record<string, string> = {
    // Personal
    'Groceries': '#10B981',
    'Dining': '#F59E0B',
    'Transportation': '#3B82F6',
    'Entertainment': '#8B5CF6',
    'Utilities': '#6366F1',
    'Rent / Mortgage': '#EC4899',
    'Healthcare': '#EF4444',
    'Shopping': '#F97316',
    'Insurance': '#14B8A6',
    'Subscriptions': '#A855F7',
    'Education': '#06B6D4',
    'Personal Care': '#D946EF',
    'Gifts & Donations': '#FB923C',
    'Travel': '#0EA5E9',
    'Earnings': '#22C55E',
    'Credit Card Payment': '#94A3B8',
    'Transfer': '#94A3B8',
    'Coffee': '#78350F',
    // Business
    'Office Supplies': '#3B82F6',
    'Software & SaaS': '#6366F1',
    'Business Travel': '#0EA5E9',
    'Marketing': '#EC4899',
    'Professional Services': '#14B8A6',
    'Payroll': '#EF4444',
    'Equipment': '#F97316',
    'Business Insurance': '#A855F7',
    'Client Entertainment': '#F59E0B',
    'Business Misc': '#94A3B8',
    // Fallback
    'Uncategorized': '#CBD5E1',
};

// Auto-categorization rules for personal spending
export const PERSONAL_RULES: CategoryRule[] = [
    { keywords: ['costco', 'walmart', 'no frills', 'loblaws', 'metro', 'sobeys', 'freshco', 'food basics', 'grocery', 'superstore', 't&t', 'farm boy', 'whole foods'], category: 'Groceries' },
    { keywords: ['mcdonald', 'restaurant', 'uber eats', 'doordash', 'skip the dishes', 'subway', 'pizza', 'sushi', 'cafe', 'dining', 'a&w', 'popeyes', 'wendy', 'chipotle', 'boston pizza', 'cake', 'bakery', 'pastry', 'dessert'], category: 'Dining' },
    { keywords: ['starbucks', 'tim horton', 'coffee', 'espresso', 'nespresso', 'keurig', 'beans', 'roaster', 'second cup', 'balzac'], category: 'Coffee' },
    { keywords: ['uber', 'lyft', 'presto', 'go transit', 'ttc', 'esso', 'petro', 'shell', 'gas', 'parking', 'canadian tire gas', 'fuel'], category: 'Transportation' },
    { keywords: ['netflix', 'spotify', 'disney', 'amazon prime', 'apple music', 'youtube', 'hulu', 'cinema', 'cineplex', 'movie', 'game'], category: 'Entertainment' },
    { keywords: ['hydro', 'enbridge', 'gas bill', 'water bill', 'electric', 'internet', 'bell', 'rogers', 'telus', 'fido', 'koodo', 'freedom mobile'], category: 'Utilities' },
    { keywords: ['rent', 'mortgage', 'property tax', 'condo fee'], category: 'Rent / Mortgage' },
    { keywords: ['pharmacy', 'shoppers drug', 'rexall', 'doctor', 'dentist', 'medical', 'health', 'hospital', 'clinic', 'prescription'], category: 'Healthcare' },
    { keywords: ['amazon', 'best buy', 'ikea', 'hudson bay', 'winners', 'marshalls', 'old navy', 'h&m', 'zara', 'gap', 'apple store', 'indigo'], category: 'Shopping' },
    { keywords: ['insurance', 'manulife', 'sun life', 'intact', 'aviva', 'desjardins', 'co-operators'], category: 'Insurance' },
    { keywords: ['subscription', 'membership', 'annual fee'], category: 'Subscriptions' },
    { keywords: ['tuition', 'school', 'university', 'college', 'course', 'udemy', 'coursera'], category: 'Education' },
    { keywords: ['salon', 'barber', 'spa', 'gym', 'fitness', 'goodlife'], category: 'Personal Care' },
    { keywords: ['donation', 'gift', 'charity'], category: 'Gifts & Donations' },
    { keywords: ['hotel', 'airbnb', 'air canada', 'westjet', 'flight', 'booking.com', 'expedia'], category: 'Travel' },
    { keywords: ['payroll', 'salary', 'deposit', 'direct deposit', 'pay -', 'e-transfer received'], category: 'Earnings' },
    { keywords: ['rewards redemption', 'rewards', 'redemption', 'redeem', 'cash back', 'rewards back', 'interest adj'], category: 'Credit Card Payment' },
    { keywords: ['transfer', 'e-transfer', 'etransfer', 'tfr', 'xfer'], category: 'Transfer' },
];

// Auto-categorization rules for business spending
export const BUSINESS_RULES: CategoryRule[] = [
    { keywords: ['staples', 'office depot', 'office supplies', 'paper', 'toner', 'ink'], category: 'Office Supplies' },
    { keywords: ['github', 'vercel', 'aws', 'google cloud', 'azure', 'slack', 'zoom', 'notion', 'figma', 'adobe', 'microsoft 365', 'dropbox', 'software'], category: 'Software & SaaS' },
    { keywords: ['hotel', 'airbnb', 'air canada', 'westjet', 'flight', 'uber', 'lyft', 'rental car', 'business trip'], category: 'Business Travel' },
    { keywords: ['google ads', 'facebook ads', 'marketing', 'advertising', 'promotion', 'linkedin'], category: 'Marketing' },
    { keywords: ['lawyer', 'accountant', 'consultant', 'legal', 'cpa', 'bookkeeper'], category: 'Professional Services' },
    { keywords: ['payroll', 'salary', 'wages', 'employee'], category: 'Payroll' },
    { keywords: ['computer', 'laptop', 'monitor', 'equipment', 'hardware', 'printer'], category: 'Equipment' },
    { keywords: ['business insurance', 'liability insurance', 'e&o'], category: 'Business Insurance' },
    { keywords: ['client lunch', 'client dinner', 'business meal', 'client entertainment'], category: 'Client Entertainment' },
    { keywords: ['invoice', 'payment received', 'earnings', 'client payment', 'deposit'], category: 'Earnings' },
];

/**
 * Auto-categorize a transaction description based on scope-specific rules
 */
export function categorizeTransaction(description: string, scope: Scope): string {
    const desc = description.toLowerCase();
    const rules = scope === 'personal' ? PERSONAL_RULES : BUSINESS_RULES;

    for (const rule of rules) {
        for (const keyword of rule.keywords) {
            if (desc.includes(keyword.toLowerCase())) {
                return rule.category;
            }
        }
    }

    return 'Uncategorized';
}

/**
 * Get all categories for a given scope
 */
export function getCategoriesForScope(scope: Scope): string[] {
    const rules = scope === 'personal' ? PERSONAL_RULES : BUSINESS_RULES;
    return [...new Set(rules.map(r => r.category)), 'Uncategorized'];
}

/**
 * Clean a transaction description by removing redundant date prefixes 
 * often found in bank statements (e.g., "MAR 31 STARBUCKS" -> "STARBUCKS")
 */
export function cleanDescription(description: string): string {
    if (!description) return '';

    // Patterns to remove from the beginning of the string:
    // 1. MMM DD (e.g., MAR 31)
    // 2. MM/DD (e.g., 03/31)
    // 3. YYYY-MM-DD
    // 4. Multiple spaces
    return description
        .replace(/^([A-Z]{3}\s+\d{1,2}|(?:\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?)|(?:\d{4}-\d{2}-\d{2}))\s+/, '')
        .replace(/\s+/g, ' ')
        .trim();
}
