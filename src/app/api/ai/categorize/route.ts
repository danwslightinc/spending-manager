import { NextResponse } from 'next/server';
import { PERSONAL_RULES, BUSINESS_RULES } from '@/lib/categories';
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: Request) {
    try {
        const { descriptions, scope } = await JSON.parse(await req.text());
        const apiKey = process.env.GOOGLE_GERMINI_API_KEY;

        console.log('AI Request: Received', descriptions.length, 'descriptions. Project Key:', !!apiKey);

        if (!apiKey) {
            return NextResponse.json({
                error: 'Configuration missing',
                details: 'Please ensure GOOGLE_GERMINI_API_KEY is in .env'
            }, { status: 400 });
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const modelName = "gemini-flash-latest";
        console.log(`AI Request: Using model ${modelName}`);
        const model = genAI.getGenerativeModel({ model: modelName });

        const categories = (scope === 'personal' ? PERSONAL_RULES : BUSINESS_RULES).map(r => r.category);
        const uniqueCategories = [...new Set(categories), 'Uncategorized'];

        const prompt = `
            You are a professional financial assistant. Categorize these bank transaction descriptions into EXACTLY one of these categories:
            [${uniqueCategories.join(', ')}]

            Return ONLY a valid JSON object. No other text.
            The JSON keys should be the descriptions, and values should be the categories.

            Transactions:
            ${descriptions.join('\n')}
        `;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        console.log('AI Response Raw:', responseText);

        const firstBrace = responseText.indexOf('{');
        const lastBrace = responseText.lastIndexOf('}');

        if (firstBrace === -1 || lastBrace === -1) {
            throw new Error('AI response did not contain a valid JSON object');
        }

        const cleanJson = responseText.substring(firstBrace, lastBrace + 1);
        const mapping = JSON.parse(cleanJson);
        return NextResponse.json(mapping);
    } catch (error: any) {
        console.error('Gemini API Error:', error);
        return NextResponse.json({
            error: 'AI Error',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
