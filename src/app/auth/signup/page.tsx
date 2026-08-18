import { SignUpForm } from "@/app/components/SignUpForm";

import { Suspense } from "react";

export default function SignUpPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-brand-cream px-4 py-10">
      <Suspense
        fallback={
          <div className="text-sm text-brand-coffee-light">Loading...</div>
        }
      >
        <SignUpForm />
      </Suspense>
    </main>
  );
}
