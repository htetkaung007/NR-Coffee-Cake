import { Suspense } from "react";

import SignInForm from "@/app/components/SignInForm";

export default function SignInPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-brand-cream px-4 py-10">
      <Suspense
        fallback={
          <div className="text-sm text-brand-coffee-light">Loading...</div>
        }
      >
        <SignInForm />
      </Suspense>
    </main>
  );
}
