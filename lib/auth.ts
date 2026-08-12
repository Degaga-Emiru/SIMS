import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import prisma from "@/lib/prisma";
import { Role } from "@/app/generated/prisma";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      role: Role;
      image?: string | null;
      forcePasswordChange?: boolean;
    };
  }

  interface User {
    id: string;
    name: string;
    email: string;
    role: Role;
    image?: string | null;
    forcePasswordChange?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    forcePasswordChange?: boolean;
  }
}

function sanitizeImage(url?: string | null): string | null {
  if (!url || url.startsWith("data:") || url.length > 500) {
    return null;
  }
  return url;
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user) {
          throw new Error("Invalid email or password");
        }

        if (user.status === "INACTIVE") {
          throw new Error("Your account has been deactivated. Contact your administrator.");
        }

        const isValid = await bcrypt.compare(credentials.password, user.password);
        if (!isValid) {
          throw new Error("Invalid email or password");
        }

        await prisma.user.update({
          where: { id: user.id },
          data: { lastLogin: new Date() },
        });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          image: sanitizeImage(user.image),
          forcePasswordChange: user.forcePasswordChange,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60,
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.forcePasswordChange = user.forcePasswordChange;
        token.picture = sanitizeImage(user.image);
      }
      if (trigger === "update" && session) {
        if (session.name) token.name = session.name;
        if (session.image !== undefined) token.picture = sanitizeImage(session.image);
        if (session.forcePasswordChange !== undefined) {
          token.forcePasswordChange = session.forcePasswordChange;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.forcePasswordChange = token.forcePasswordChange;
        if (token.name) session.user.name = token.name;
        session.user.image = sanitizeImage(token.picture);
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};


