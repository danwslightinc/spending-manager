"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

function LoginContent() {
    const searchParams = useSearchParams();
    const error = searchParams.get("error");
    const { data: session, status } = useSession();
    const router = useRouter();

    useEffect(() => {
        if (status === "authenticated") {
            router.push("/");
        }
    }, [status, router]);

    return (
        <div className="relative z-10">
            <div
                className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl shadow-lg"
                style={{ background: "linear-gradient(135deg, #10b981, #0d9488)" }}
            >
                {/* Wallet / spend icon */}
                <svg className="h-8 w-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                    <rect x="2" y="7" width="20" height="14" rx="2" />
                    <path d="M16 14a1 1 0 1 0 2 0 1 1 0 0 0-2 0z" fill="currentColor" stroke="none" />
                    <path d="M2 10h20" />
                    <path d="M6 4l4-1 8 2" />
                </svg>
            </div>

            <h1 className="mb-2 text-3xl font-bold text-slate-800">Spend Manager</h1>
            <p className="mb-8 text-sm text-slate-500">
                Sign in with your authorized Google account to access your personal finance dashboard.
            </p>

            {error === "AccessDenied" && (
                <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-600">
                    Access Denied. Your email is not authorized to use this application.
                </div>
            )}

            {error && error !== "AccessDenied" && (
                <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-600">
                    An error occurred during sign-in. Please try again.
                </div>
            )}

            <button
                onClick={() => signIn("google", { callbackUrl: "/" })}
                className="flex w-full items-center justify-center gap-3 rounded-xl bg-white px-6 py-4 font-semibold text-slate-800 shadow-md border border-slate-200 transition-all hover:shadow-lg hover:scale-[1.02] active:scale-[0.99]"
            >
                {/* Google SVG */}
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#4285F4"
                    />
                    <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                    />
                    <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        fill="#FBBC05"
                    />
                    <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                    />
                </svg>
                Sign in with Google
            </button>
        </div>
    );
}

export default function LoginPage() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{ background: "linear-gradient(135deg, #f0fdf4 0%, #f8fafc 50%, #e0f2fe 100%)" }}>
            <div className="w-full max-w-md rounded-3xl bg-white/80 backdrop-blur-md border border-white/60 shadow-2xl p-10 text-center relative overflow-hidden">
                {/* Decorative blobs */}
                <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full bg-emerald-400 opacity-10 blur-3xl pointer-events-none" />
                <div className="absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-teal-500 opacity-10 blur-3xl pointer-events-none" />

                <Suspense fallback={<div className="p-4 text-slate-500">Loading...</div>}>
                    <LoginContent />
                </Suspense>

                <p className="mt-8 text-xs text-slate-400">
                    Dawn&apos;s Light Inc · Spend Manager &copy; {new Date().getFullYear()}
                </p>
            </div>
        </div>
    );
}
