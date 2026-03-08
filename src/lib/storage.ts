import { Transaction, Account, Scope } from './types';
import { supabase } from './supabase';

const TRANSACTIONS_TABLE = 'spending_manager_transactions';
const ACCOUNTS_TABLE = 'spending_manager_accounts';

// ──────────────────────────────────────
//  Mapping Helpers
// ──────────────────────────────────────

const mapTransactionToDB = (t: Transaction) => ({
    id: t.id,
    date: t.date,
    description: t.description,
    amount: t.amount,
    category: t.category,
    bank: t.bank,
    account_type: t.accountType,
    account_name: t.accountName,
    scope: t.scope,
    tags: t.tags,
    is_manual: t.isManual || false,
});

const mapDBToTransaction = (row: any): Transaction => ({
    id: row.id,
    date: row.date,
    description: row.description,
    amount: row.amount,
    category: row.category,
    bank: row.bank,
    accountType: row.account_type,
    accountName: row.account_name,
    scope: row.scope,
    tags: row.tags || [],
    isManual: row.is_manual,
});

const mapAccountToDB = (a: Account) => ({
    id: a.id,
    name: a.name,
    bank: a.bank,
    type: a.type,
    scope: a.scope,
    balance: a.balance,
    last_updated: a.lastUpdated,
});

const mapDBToAccount = (row: any): Account => ({
    id: row.id,
    name: row.name,
    bank: row.bank,
    type: row.type,
    scope: row.scope,
    balance: row.balance,
    lastUpdated: row.last_updated,
});

// ──────────────────────────────────────
//  Transactions
// ──────────────────────────────────────

export async function getAllTransactions(): Promise<Transaction[]> {
    const { data, error } = await supabase
        .from(TRANSACTIONS_TABLE)
        .select('*')
        .order('date', { ascending: false });

    if (error) {
        console.error('Error fetching transactions:', error);
        return [];
    }
    return (data || []).map(mapDBToTransaction);
}

export async function getTransactions(scope: Scope): Promise<Transaction[]> {
    const { data, error } = await supabase
        .from(TRANSACTIONS_TABLE)
        .select('*')
        .eq('scope', scope)
        .order('date', { ascending: false });

    if (error) {
        console.error('Error fetching filtered transactions:', error);
        return [];
    }
    return (data || []).map(mapDBToTransaction);
}

export async function addTransactions(newTxns: Transaction[]): Promise<void> {
    const dbTxns = newTxns.map(mapTransactionToDB);
    const { error } = await supabase
        .from(TRANSACTIONS_TABLE)
        .insert(dbTxns);

    if (error) {
        console.error('Error adding transactions:', error);
        throw error;
    }
}

export async function updateTransaction(id: string, updates: Partial<Transaction>): Promise<void> {
    // Map partial updates
    const dbUpdates: any = {};
    if (updates.date) dbUpdates.date = updates.date;
    if (updates.description) dbUpdates.description = updates.description;
    if (updates.amount !== undefined) dbUpdates.amount = updates.amount;
    if (updates.category) dbUpdates.category = updates.category;
    if (updates.bank) dbUpdates.bank = updates.bank;
    if (updates.accountType) dbUpdates.account_type = updates.accountType;
    if (updates.accountName) dbUpdates.account_name = updates.accountName;
    if (updates.scope) dbUpdates.scope = updates.scope;
    if (updates.tags) dbUpdates.tags = updates.tags;
    if (updates.isManual !== undefined) dbUpdates.is_manual = updates.isManual;

    const { error } = await supabase
        .from(TRANSACTIONS_TABLE)
        .update(dbUpdates)
        .eq('id', id);

    if (error) {
        console.error('Error updating transaction:', error);
        throw error;
    }
}

export async function deleteTransaction(id: string): Promise<void> {
    const { error } = await supabase
        .from(TRANSACTIONS_TABLE)
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting transaction:', error);
        throw error;
    }
}

// ──────────────────────────────────────
//  Accounts
// ──────────────────────────────────────

export async function getAllAccounts(): Promise<Account[]> {
    const { data, error } = await supabase
        .from(ACCOUNTS_TABLE)
        .select('*');

    if (error) {
        console.error('Error fetching accounts:', error);
        return [];
    }
    return (data || []).map(mapDBToAccount);
}

export async function getAccounts(scope: Scope): Promise<Account[]> {
    const { data, error } = await supabase
        .from(ACCOUNTS_TABLE)
        .select('*')
        .eq('scope', scope);

    if (error) {
        console.error('Error fetching filtered accounts:', error);
        return [];
    }
    return (data || []).map(mapDBToAccount);
}

export async function addAccount(account: Account): Promise<void> {
    const { error } = await supabase
        .from(ACCOUNTS_TABLE)
        .insert(mapAccountToDB(account));

    if (error) {
        console.error('Error adding account:', error);
        throw error;
    }
}

export async function updateAccount(id: string, updates: Partial<Account>): Promise<void> {
    const dbUpdates: any = {};
    if (updates.name) dbUpdates.name = updates.name;
    if (updates.bank) dbUpdates.bank = updates.bank;
    if (updates.type) dbUpdates.type = updates.type;
    if (updates.scope) dbUpdates.scope = updates.scope;
    if (updates.balance !== undefined) dbUpdates.balance = updates.balance;
    if (updates.lastUpdated) dbUpdates.last_updated = updates.lastUpdated;

    const { error } = await supabase
        .from(ACCOUNTS_TABLE)
        .update(dbUpdates)
        .eq('id', id);

    if (error) {
        console.error('Error updating account:', error);
        throw error;
    }
}

export async function deleteAccount(id: string): Promise<void> {
    const { error } = await supabase
        .from(ACCOUNTS_TABLE)
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting account:', error);
        throw error;
    }
}

// ──────────────────────────────────────
//  Utils
// ──────────────────────────────────────

export async function clearAllData(): Promise<void> {
    const { error: txError } = await supabase.from(TRANSACTIONS_TABLE).delete().neq('id', '00000000-0000-0000-0000-000000000000');
    const { error: accError } = await supabase.from(ACCOUNTS_TABLE).delete().neq('id', '00000000-0000-0000-0000-000000000000');

    if (txError || accError) {
        console.error('Error clearing data:', txError || accError);
    }
}

// ──────────────────────────────────────
//  Export / Import (Backup)
// ──────────────────────────────────────

export async function exportData(): Promise<string> {
    const transactions = await getAllTransactions();
    const accounts = await getAllAccounts();
    return JSON.stringify({
        transactions,
        accounts,
        exportedAt: new Date().toISOString(),
    }, null, 2);
}

export async function importData(json: string): Promise<{ transactions: number; accounts: number }> {
    const data = JSON.parse(json);
    if (data.transactions) await addTransactions(data.transactions);
    if (data.accounts) {
        for (const acc of data.accounts) {
            await addAccount(acc);
        }
    }
    return {
        transactions: data.transactions?.length ?? 0,
        accounts: data.accounts?.length ?? 0,
    };
}
