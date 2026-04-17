import { UnifiedAuthPage } from "@/components/auth/UnifiedAuthPage";

export default function RegisterPage() {
  const googleEnabled = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  const metaEnabled = Boolean(process.env.META_CLIENT_ID && process.env.META_CLIENT_SECRET);

  return <UnifiedAuthPage mode="register" googleEnabled={googleEnabled} metaEnabled={metaEnabled} />;
}
