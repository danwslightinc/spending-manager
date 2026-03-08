// Core data types for the Spend Manager dashboard

export type BankName = 'CIBC' | 'RBC' | 'TD' | 'Unknown';
export type AccountType = 'chequing' | 'savings' | 'credit' | 'other';
export type Scope = 'personal' | 'business';

export interface Transaction {
  id: string;
  date: string;           // ISO date string (YYYY-MM-DD)
  description: string;
  amount: number;         // negative = expense, positive = income/deposit
  category: string;
  bank: BankName;
  accountType: AccountType;
  accountName: string;    // user-assigned account name
  scope: Scope;
  tags: string[];
  isManual?: boolean;     // true if manually entered
}

export interface Account {
  id: string;
  name: string;
  bank: BankName;
  type: AccountType;
  scope: Scope;
  balance: number;
  lastUpdated: string;    // ISO date
}

export interface CategoryRule {
  keywords: string[];
  category: string;
}

export interface ParsedCSVResult {
  bank: BankName;
  accountType: AccountType;
  accountName?: string;
  transactions: Omit<Transaction, 'id' | 'scope' | 'tags' | 'accountName'>[];
  rawHeaders: string[];
  rowCount: number;
}

export interface MonthlyData {
  month: string;          // YYYY-MM
  income: number;
  expenses: number;
  net: number;
}

export interface CategoryBreakdown {
  category: string;
  amount: number;
  percentage: number;
  count: number;
  color: string;
}

export interface SankeyNode {
  id: string;
  nodeColor?: string;
}

export interface SankeyLink {
  source: string;
  target: string;
  value: number;
}

export interface SankeyData {
  nodes: SankeyNode[];
  links: SankeyLink[];
}
