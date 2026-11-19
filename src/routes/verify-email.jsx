import { createFileRoute } from "@tanstack/react-router";
import { VerifyEmailPage } from "@/components/auth/VerifyEmailPage";

export const Route = createFileRoute("/verify-email")({ ssr: false, component: VerifyEmailPage });
