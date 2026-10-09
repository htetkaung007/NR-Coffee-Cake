import { Suspense } from "react";

import { AppService } from "@/app/services";
import { SignUpClosedNotice } from "./SignUpClosedNotice";
import { SignUpForm } from "./SignUpForm";

// Reads the database (is sign-up still open?) on every request — never
// prerendered at build time.
export const dynamic = "force-dynamic";

export default async function SignUpPage() {
  // Single-shop mode: only the first owner signs up; staff accounts are
  // created by the owner in Settings. Display only — registerAction
  // enforces it on its own (AppService.createDefaultSetup).
  const isSignUpOpen = await AppService.isSignUpOpen();

  return (
    <main className="flex min-h-screen items-center justify-center bg-brand-cream px-4 py-10">
      {isSignUpOpen ? (
        <Suspense
          fallback={
            <div className="text-sm text-brand-coffee-light">Loading...</div>
          }
        >
          <SignUpForm />
        </Suspense>
      ) : (
        <SignUpClosedNotice />
      )}
    </main>
  );
}
