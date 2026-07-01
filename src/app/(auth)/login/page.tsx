import { Suspense } from "react";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="grid min-h-screen place-items-center text-white">Loading...</main>}>
      <LoginForm />
    </Suspense>
  );
}
