import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

const handler = NextAuth({
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID || "",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
        }),
    ],
    secret: process.env.NEXTAUTH_SECRET,
    callbacks: {
        async signIn({ user }) {
            if (!user.email) return false;

            // If ALLOWED_EMAILS is not configured, deny everyone for safety.
            if (process.env.ALLOWED_EMAILS) {
                const allowedEmails = process.env.ALLOWED_EMAILS
                    .split(",")
                    .map((e) => e.trim().toLowerCase());
                if (!allowedEmails.includes(user.email.toLowerCase())) {
                    console.log(`Access Denied for email: ${user.email}`);
                    return false;
                }
            }
            return true;
        },
    },
    pages: {
        signIn: "/login",
    },
});

export { handler as GET, handler as POST };
