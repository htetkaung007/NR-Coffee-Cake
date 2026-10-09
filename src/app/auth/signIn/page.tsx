import { Suspense } from "react";

import { AppService } from "@/app/services";
import SignInForm from "./SignInForm";

// Reads the database (is sign-up still open?) on every request — never
// prerendered at build time.
export const dynamic = "force-dynamic";

export default async function SignInPage() {
  // Display only: hides the "Sign Up" link once the shop exists. The
  // sign-up action enforces it on its own (AppService.createDefaultSetup).
  const isSignUpOpen = await AppService.isSignUpOpen();

  return (
    <main className="flex min-h-screen items-center justify-center bg-brand-cream px-4 py-10">
      <Suspense
        fallback={
          <div className="text-sm text-brand-coffee-light">Loading...</div>
        }
      >
        <SignInForm isSignUpOpen={isSignUpOpen} />
      </Suspense>
    </main>
  );
}
