import * as pdfjsLib from 'pdfjs-dist';
import type { ParsedCSVResult, BankName } from '@/lib/types';
import { categorizeTransaction, cleanDescription } from '@/lib/categories';

// Configure worker
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

/**
 * Extract text content from a PDF ArrayBuffer, preserving line structure.
 * Returns an array of lines (strings) across all pages.
 */
async function extractTextLines(data: ArrayBuffer): Promise<string[]> {
    const pdf = await pdfjsLib.getDocument({ data }).promise;
    const allLines: string[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();

        // Group text items by Y position (same row = same line)
        const rows = new Map<number, { x: number; str: string }[]>();
        for (const item of content.items) {
            if (!('str' in item) || !item.str.trim()) continue;
            // Round Y to nearest 2px to cluster items on the same baseline
            const y = Math.round((item as any).transform[5] / 2) * 2;
            if (!rows.has(y)) rows.set(y, []);
            rows.get(y)!.push({ x: (item as any).transform[4], str: item.str });
        }

        // Sort by Y descending (PDF Y is bottom-up), then items by X
        const sortedYs = [...rows.keys()].sort((a, b) => b - a);
        for (const y of sortedYs) {
            const items = rows.get(y)!.sort((a, b) => a.x - b.x);
            const line = items.map(i => i.str).join('  ');
            if (line.trim()) allLines.push(line.trim());
        }
    }

    return allLines;
}

// ──────────────────────────────────────────────────
// Date parsing helpers
// ──────────────────────────────────────────────────
const MONTH_MAP: Record<string, string> = {
    jan: '01', january: '01',
    feb: '02', february: '02',
    mar: '03', march: '03',
    apr: '04', april: '04',
    may: '05',
    jun: '06', june: '06',
    jul: '07', july: '07',
    aug: '08', august: '08',
    sep: '09', sept: '09', september: '09',
    oct: '10', october: '10',
    nov: '11', november: '11',
    dec: '12', december: '12',
};

/**
 * Try to parse a date string like "Jan 15", "JAN 15, 2025", "01/15/2025",
 * "2025-01-15", "January 15, 2025" etc. into YYYY-MM-DD.
 */
function parseDate(raw: string, fallbackYear?: string): string | null {
    const s = raw.trim();

    // ISO: 2025-01-15
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

    // MM/DD/YYYY or DD/MM/YYYY — assume MM/DD for North American banks
    const slashMatch = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (slashMatch) {
        return `${slashMatch[3]}-${slashMatch[1].padStart(2, '0')}-${slashMatch[2].padStart(2, '0')}`;
    }

    // "Jan 15" or "Jan 15, 2025" or "January 15 2025"
    const nameMatch = s.match(/^([A-Za-z]+)\s+(\d{1,2})(?:[,\s]+(\d{4}))?$/);
    if (nameMatch) {
        const month = MONTH_MAP[nameMatch[1].toLowerCase()];
        if (month) {
            let year = parseInt(nameMatch[3] || fallbackYear || new Date().getFullYear().toString());
            const day = parseInt(nameMatch[2]);

            // If the date is in the "future" (more than 30 days ahead of now), 
            // it's likely a transaction from the previous year.
            const date = new Date(year, parseInt(month) - 1, day);
            const now = new Date();
            if (date.getTime() > now.getTime() + 30 * 24 * 60 * 60 * 1000) {
                year -= 1;
            }

            return `${year}-${month}-${nameMatch[2].padStart(2, '0')}`;
        }
    }

    // "15 Jan" or "15 Jan 2025"
    const revMatch = s.match(/^(\d{1,2})\s+([A-Za-z]+)(?:[,\s]+(\d{4}))?$/);
    if (revMatch) {
        const month = MONTH_MAP[revMatch[2].toLowerCase()];
        if (month) {
            let year = parseInt(revMatch[3] || fallbackYear || new Date().getFullYear().toString());
            const day = parseInt(revMatch[1]);

            const date = new Date(year, parseInt(month) - 1, day);
            const now = new Date();
            if (date.getTime() > now.getTime() + 30 * 24 * 60 * 60 * 1000) {
                year -= 1;
            }

            return `${year}-${month}-${revMatch[1].padStart(2, '0')}`;
        }
    }

    return null;
}

function parseAmount(raw: string): number | null {
    const s = raw.replace(/[$,\s]/g, '').replace(/\((.+)\)/, '-$1');
    const n = parseFloat(s);
    return isNaN(n) ? null : n;
}

// ──────────────────────────────────────────────────
// Bank detection
// ──────────────────────────────────────────────────
type BankId = BankName;

function detectBank(lines: string[]): BankId {
    const text = lines.slice(0, 50).join('\n').toLowerCase();

    // Check for CIBC
    if (text.includes('cibc') || text.includes('canadian imperial') || text.includes('aventura')) return 'CIBC';

    // Check for RBC
    if (text.includes('royal bank') || text.includes('rbc ') || text.includes('rbc.') || text.includes('avion')) return 'RBC';

    // Check for TD - expanded list
    if (
        text.includes('td canada') ||
        text.includes('td bank') ||
        text.includes('toronto-dominion') ||
        text.includes('td access') ||
        text.includes('td visa') ||
        text.includes('td credit') ||
        text.includes('td watermark') || // Some TD PDFs have watermark in text
        text.includes('trustee for') // Sometimes found in TD trust docs
    ) return 'TD';

    // Global check for "TD" as a standalone word/token in the header
    if (lines.slice(0, 30).some(l => l.match(/\bTD\b/))) return 'TD';

    return 'Unknown';
}

function detectAccountType(lines: string[]): 'chequing' | 'credit' | 'savings' {
    const text = lines.slice(0, 50).join('\n').toLowerCase();
    if (text.includes('visa') || text.includes('mastercard') || text.includes('credit card') || text.includes('credit statement')) return 'credit';
    if (text.includes('savings')) return 'savings';
    return 'chequing';
}

function detectYear(lines: string[]): string {
    // Look for a year in the first 30 lines (statement header)
    for (const line of lines.slice(0, 30)) {
        const m = line.match(/\b(20\d{2})\b/);
        if (m) return m[1];
    }
    return new Date().getFullYear().toString();
}

function detectAccountName(lines: string[], bank: BankName, type: string): string {
    const text = lines.slice(0, 40).join('\n').toLowerCase();

    // Masked account number detection (e.g. ****1234)
    const cardMasked = lines.slice(0, 40).find(l => l.match(/\*{3,}\d{4}/));
    const accountNumber = cardMasked ? cardMasked.match(/(\*{3,}\d{4})/)?.[1] : null;

    if (bank === 'TD') {
        if (text.includes('visa')) {
            let name = 'TD Visa';
            if (text.includes('cash back')) name = 'TD Cash Back Visa';
            else if (text.includes('first class')) name = 'TD First Class Visa';
            else if (text.includes('emerald')) name = 'TD Emerald Visa';
            else if (text.includes('rewards')) name = 'TD Rewards Visa';
            else if (text.includes('aeroplan')) name = 'TD Aeroplan Visa';
            return accountNumber ? `${name} (${accountNumber})` : name;
        }
        if (text.includes('all-inclusive')) return 'TD All-Inclusive Banking';
        if (text.includes('unlimited')) return 'TD Unlimited Banking';
        if (text.includes('savings')) return 'TD High Interest Savings';
        return 'TD Chequing Account';
    }

    if (bank === 'RBC') {
        if (text.includes('avion')) return 'RBC Avion Visa';
        if (text.includes('westjet')) return 'RBC WestJet Mastercard';
        if (text.includes('day to day')) return 'RBC Day to Day Banking';
        if (text.includes('savings')) return 'RBC Savings';
        return 'RBC Account';
    }

    if (bank === 'CIBC') {
        if (text.includes('aventura')) return 'CIBC Aventura Visa';
        if (text.includes('aeroplan')) return 'CIBC Aeroplan Visa';
        if (text.includes('smart')) return 'CIBC Smart Account';
        return 'CIBC Account';
    }

    return `${bank} ${type.charAt(0).toUpperCase() + type.slice(1)}`;
}

// ──────────────────────────────────────────────────
// Transaction line parser — generic approach
// ──────────────────────────────────────────────────
// Most Canadian bank PDF statements follow a pattern:
//   [Date]  [Description]  [Debit/Withdrawal]  [Credit/Deposit]  [Balance]
// or for credit cards:
//   [Trans Date]  [Post Date]  [Description]  [Amount]
//
// We use a regex-based approach to detect lines that start with a date
// and contain at least one dollar amount.
// ──────────────────────────────────────────────────

interface RawTxn {
    date: string;
    description: string;
    amount: number;
}

const DATE_PATTERN = /^([A-Za-z]{3,9}\s+\d{1,2}(?:[,\s]+\d{4})?|\d{1,2}\s+[A-Za-z]{3,9}(?:\s+\d{4})?|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}-\d{2}-\d{2})/;
const AMOUNT_PATTERN = /\$?\s*-?\d{1,3}(?:,\d{3})*\.\d{2}/g;

function parseLinesGeneric(lines: string[], year: string, accountType: string): RawTxn[] {
    const txns: RawTxn[] = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const dateMatch = line.match(DATE_PATTERN);
        if (!dateMatch) continue;

        const parsedDate = parseDate(dateMatch[1], year);
        if (!parsedDate) continue;

        // Find all dollar amounts on this line
        const amounts: number[] = [];
        let amountMatch;
        const amountRegex = new RegExp(AMOUNT_PATTERN.source, 'g');
        while ((amountMatch = amountRegex.exec(line)) !== null) {
            const val = parseAmount(amountMatch[0]);
            if (val !== null) amounts.push(val);
        }

        if (amounts.length === 0) continue;

        // Extract description: text between date and first amount
        const afterDate = line.substring(dateMatch[0].length);
        const firstAmountIdx = afterDate.search(/\$?\s*-?\d{1,3}(?:,\d{3})*\.\d{2}/);
        let description = firstAmountIdx > 0
            ? afterDate.substring(0, firstAmountIdx).trim()
            : afterDate.replace(/\$?\s*-?\d{1,3}(?:,\d{3})*\.\d{2}/g, '').trim();

        // Sometimes description is on the next line (multi-line transactions)
        if (!description && i + 1 < lines.length && !lines[i + 1].match(DATE_PATTERN)) {
            description = lines[i + 1].replace(/\$?\s*-?\d{1,3}(?:,\d{3})*\.\d{2}/g, '').trim();
        }

        if (!description) description = 'Unknown Transaction';

        // Clean description: remove redundant date prefixes (e.g. "APR 02 STARBUCKS")
        description = cleanDescription(description);

        // Determine the transaction amount
        let amount: number;
        if (accountType === 'credit') {
            const rowText = line.toLowerCase();
            const isCredit =
                rowText.includes(' cr') ||
                rowText.includes('payment') ||
                rowText.includes('rewards') ||
                rowText.includes('redeem') ||
                rowText.includes('cash back') ||
                rowText.includes('redemption') ||
                rowText.includes('adj') ||
                rowText.includes('credit') ||
                rowText.includes('refund');

            amount = isCredit ? Math.abs(amounts[0]) : -Math.abs(amounts[0]);
        } else {
            // Chequing/Savings: may have separate debit/credit columns
            if (amounts.length >= 2) {
                // Two amounts: first = debit (withdrawal), second = credit (deposit), or vice versa
                // If there's also a balance (3 amounts), the last is balance
                // Convention: check position in line to determine which is debit vs credit
                const lastAmount = amounts.length >= 3 ? amounts[amounts.length - 1] : null;
                const relevantAmounts = lastAmount !== null ? amounts.slice(0, -1) : amounts;

                if (relevantAmounts.length === 2) {
                    // Often one of the two is the actual value and the position indicates debit/credit
                    // Use the first non-zero or treat as: first=debit(neg), second=credit(pos)
                    if (relevantAmounts[0] > 0 && relevantAmounts[1] === 0) {
                        amount = -relevantAmounts[0]; // withdrawal
                    } else if (relevantAmounts[1] > 0 && relevantAmounts[0] === 0) {
                        amount = relevantAmounts[1]; // deposit
                    } else {
                        amount = -relevantAmounts[0]; // default: first amount is debit
                    }
                } else {
                    amount = -Math.abs(relevantAmounts[0]);
                }
            } else {
                // Single amount — negative is assumed (expense) unless marked
                amount = -Math.abs(amounts[0]);
                if (
                    line.toLowerCase().includes('deposit') ||
                    line.toLowerCase().includes('payroll') ||
                    line.toLowerCase().includes('direct dep') ||
                    line.toLowerCase().includes(' cr')
                ) {
                    amount = Math.abs(amounts[0]);
                }
            }
        }

        // Skip likely balance lines or summary rows
        if (
            description.toLowerCase().includes('opening balance') ||
            description.toLowerCase().includes('closing balance') ||
            description.toLowerCase().includes('total') ||
            description.toLowerCase().includes('statement period') ||
            description.toLowerCase().includes('previous balance') ||
            description.toLowerCase().includes('new balance')
        ) {
            continue;
        }

        txns.push({ date: parsedDate, description, amount });
    }

    return txns;
}

// ──────────────────────────────────────────────────
// Main PDF parser
// ──────────────────────────────────────────────────
export async function parsePDF(data: ArrayBuffer): Promise<ParsedCSVResult> {
    const lines = await extractTextLines(data);

    if (lines.length === 0) {
        throw new Error('Could not extract any text from this PDF. It may be a scanned image — only digital PDFs are supported.');
    }

    const bank = detectBank(lines);
    const accountType = detectAccountType(lines);
    const year = detectYear(lines);
    const accountName = detectAccountName(lines, bank, accountType);

    const rawTxns = parseLinesGeneric(lines, year, accountType);

    if (rawTxns.length === 0) {
        throw new Error(
            `Could not parse transactions from this ${bank} PDF. ` +
            `Extracted ${lines.length} lines of text but no transaction patterns matched. ` +
            `Try exporting as CSV from your online banking instead.`
        );
    }

    const transactions = rawTxns.map(t => ({
        date: t.date,
        description: t.description,
        amount: t.amount,
        category: categorizeTransaction(t.description, 'personal'), // default to personal for parser
        bank: bank,
        accountType,
    }));

    return {
        transactions,
        bank: bank,
        accountType,
        accountName,
        rawHeaders: [],
        rowCount: lines.length,
    };
}
