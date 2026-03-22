"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { GoogleLogin } from "@react-oauth/google";
import { Eye, EyeOff } from "lucide-react";

type NoticeKind = "success" | "warning" | "error" | "info";

function formatSeconds(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(sec).padStart(2, "0");
  return `${mm}:${ss}`;
}

function NoticeBox({
  kind,
  title,
  children,
}: {
  kind: NoticeKind;
  title?: string;
  children: React.ReactNode;
}) {
  const styles = useMemo(() => {
    switch (kind) {
      case "success":
        return "border-emerald-400/40 bg-emerald-400/10 text-emerald-100";
      case "warning":
        return "border-amber-400/40 bg-amber-400/10 text-amber-100";
      case "error":
        return "border-rose-400/40 bg-rose-400/10 text-rose-100";
      default:
        return "border-white/15 bg-white/10 text-gray-100";
    }
  }, [kind]);

  return (
    <div className={`rounded-xl border px-4 py-3 text-sm ${styles}`}>
      {title && <div className="mb-1 font-semibold">{title}</div>}
      <div className="leading-relaxed">{children}</div>
    </div>
  );
}

const COOLDOWN_KEY = "verificationCooldownUntilMs";
const COOLDOWN_SECONDS = 60;

export default function LoginPage() {

 
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  );
}

 function LoginPageInner() {

  const [formData, setFormData] = useState({ email: "", password: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  const [emailNotVerified, setEmailNotVerified] = useState(false);

  const [useGoogleHint, setUseGoogleHint] = useState(false);

  const params = useSearchParams();
const reason = useMemo(() => params.get("reason"), [params]);

  const [notice, setNotice] = useState<{
    kind: NoticeKind;
    title?: string;
    text: string;
  } | null>(null);

  const [cooldownUntilMs, setCooldownUntilMs] = useState<number | null>(null);
  const [nowMs, setNowMs] = useState(Date.now());

  const router = useRouter();

  // tick timer
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // load cooldown from storage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(COOLDOWN_KEY);
      if (!raw) return;
      const until = Number(raw);
      if (until > Date.now()) setCooldownUntilMs(until);
    } catch {}
  }, []);

  const cooldownSecondsLeft = useMemo(() => {
    if (!cooldownUntilMs) return 0;
    const diff = Math.ceil((cooldownUntilMs - nowMs) / 1000);
    return Math.max(0, diff);
  }, [cooldownUntilMs, nowMs]);

  const isCoolingDown = cooldownSecondsLeft > 0;

  const startCooldown = () => {
    const until = Date.now() + COOLDOWN_SECONDS * 1000;
    setCooldownUntilMs(until);
    localStorage.setItem(COOLDOWN_KEY, String(until));
  };

  const clearCooldown = () => {
    setCooldownUntilMs(null);
    localStorage.removeItem(COOLDOWN_KEY);
  };

 useEffect(() => {
  if (cooldownUntilMs && cooldownSecondsLeft === 0) {
    clearCooldown();
  }
}, [cooldownSecondsLeft, cooldownUntilMs]);

  useEffect(() => {
  const token = localStorage.getItem("token");
  if (token) router.replace("/dashboard");
}, [router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const { name, value } = e.target;

  setUseGoogleHint(false); // 🔥 reset hint

  setFormData((prev) => ({ ...prev, [name]: value }));
};

const attemptLogin = async (silent = false) => {

    if (!formData.email || !formData.password) {
      return false;
    }

    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

    let data;

try {
  data = await res.json();
} catch {
  data = {};
}

    if (!res.ok) {

  // 🔥 NEW: Google account detection
  if (data?.code === "USE_GOOGLE") {

  if (!silent) {
    setUseGoogleHint(true);

    setNotice({
      kind: "info",
      title: "This account uses a different sign-in method",
      text: "Please continue with Google  Sign-In.",
    });
  }

  return false;
}

  // existing verification logic
  if (data?.error?.toLowerCase().includes("verify")) {
    setEmailNotVerified(true);
    setNotice(null);
    return false;
  }

 if (!silent) {
  setUseGoogleHint(false);

  setNotice({
    kind: "error",
    title: "Login failed",
    text: data?.error ?? "Invalid credentials.",
  });
}

  return false;
}

    localStorage.setItem("token", data.token);
    localStorage.setItem("userId", String(data.user?.id ?? ""));
    localStorage.setItem("userName", String(data.user?.name ?? ""));
    localStorage.setItem("avatar", String(data.user?.avatar ?? ""));

    setNotice({
  kind: "success",
  title: "Login successful",
  text: "Redirecting to dashboard...",
});

setIsLeaving(true);

setTimeout(() => router.push("/dashboard"), 600);

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setNotice(null);
    await attemptLogin();
    setIsSubmitting(false);
  };

  const resendVerification = async () => {

    if (isCoolingDown) return;

    try {

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/resend-verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email }),
      });

      if (res.status === 429) {
        startCooldown();

        setNotice(null);
return;
      }

      let data;

try {
  data = await res.json();
} catch {
  data = {};
}

      if (!res.ok) {
        setNotice({
          kind: "error",
          title: "Error",
          text: data?.error ?? "Failed to resend verification email.",
        });
        return;
      }

      startCooldown();

      setNotice({
        kind: "success",
        title: "Verification email sent",
        text: "Please check your inbox and spam folder.",
      });

    } catch {
      setNotice({
        kind: "error",
        title: "Network error",
        text: "Failed to resend email.",
      });
    }
  };

  // 🔥 automatic verification detection
 useEffect(() => {

  if (!emailNotVerified) return;

  let tries = 0;

  const interval = setInterval(async () => {

    tries++;

    const ok = await attemptLogin(true); // 🔥 silent mode

    if (ok || tries > 60) {
      clearInterval(interval);
    }

  }, 5000);

  return () => clearInterval(interval);

}, [emailNotVerified]);

  useEffect(() => {

  if (!emailNotVerified) return;

  const sendInitialEmail = async () => {

    try {

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/resend-verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email }),
      });

      if (res.ok) {
        startCooldown();
      }

    } catch (err) {
      console.error("Auto verification email failed:", err);
    }

  };

  sendInitialEmail();

}, [emailNotVerified]);

 return (
  <main
  className={`relative overflow-hidden bg-gradient-to-br text-white font-sans ${
    emailNotVerified
      ? "from-red-900 via-red-800 to-amber-400"
      : "from-blue-900 via-indigo-900 to-amber-400"
  }`}
>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20" />
     
      <div className="relative mx-auto flex min-h-[100svh] max-w-5xl flex-col items-center justify-center px-4 py-10 sm:px-6 sm:py-14">
  {reason === "session_expired" && (
  <div className="mb-4 text-sm text-red-400 text-center">
    ⚠️ Your session expired. Please log in again.
  </div>
)}
        <motion.div
  className="w-full max-w-md rounded-2xl bg-white/10 p-6 shadow-2xl backdrop-blur-md sm:p-8"
  initial={{ opacity: 0, y: 24 }}
  animate={isLeaving ? { opacity: 0, y: -20 } : { opacity: 1, y: 0 }}
  transition={{ duration: 0.4 }}
>

          <div className="mb-6 text-center">
            <h2 className="text-base font-medium text-gray-200 sm:text-lg">
              Welcome back to
            </h2>

            <h1 className="mt-1 text-3xl font-extrabold text-amber-300 drop-shadow-md sm:text-4xl">
              Networ.King 👑
            </h1>
          </div>

          {!emailNotVerified && (

            <form onSubmit={handleSubmit} className="space-y-4">

              <input
 autoFocus
 type="email"
 name="email"
 placeholder="Email"
 value={formData.email}
 onChange={handleChange}
 required
 autoComplete="email"
 inputMode="email"
 className="w-full rounded-lg bg-white/20 p-3 text-white placeholder-gray-300"
/>

              <div className="relative">

<input
 type={showPassword ? "text" : "password"}
 name="password"
 placeholder="Password"
 value={formData.password}
 onChange={handleChange}
 required
 autoComplete="current-password"
 className="w-full rounded-lg bg-white/20 p-3 pr-14 text-white placeholder-gray-300"
/>

<button
  type="button"
  onClick={() => setShowPassword(!showPassword)}
  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-white"
>
  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
</button>

</div>

              <button
  type="submit"
  disabled={isSubmitting}
  className="w-full rounded-lg bg-amber-400 py-3 font-semibold text-gray-900 flex items-center justify-center gap-2"
>
  {isSubmitting && (
    <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-900 border-t-transparent"></span>
  )}

  {isSubmitting ? "Logging in..." : "Log In"}
</button>

              <Link
                href="/forgot-password"
                className="block text-center text-sm text-amber-300 hover:underline"
              >
                Forgot your password?
              </Link>

            </form>

            

          )}

        {!emailNotVerified && (
  <>
<div className="my-5 flex items-center gap-3 text-sm text-gray-300">
  <div className="h-px flex-1 bg-white/20" />
  <span className="whitespace-nowrap">or</span>
  <div className="h-px flex-1 bg-white/20" />
</div>

    <div className="flex flex-col items-center gap-3">

  {useGoogleHint && (
    <div className="text-sm text-amber-200 text-center">
      👉 Continue with Google to access your account
    </div>
  )}

  <GoogleLogin
    theme="filled_black"
    shape="pill"
    size="large"
    onSuccess={async (credentialResponse) => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/auth/google`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              token: credentialResponse.credential,
            }),
          }
        );

        let data;

        try {
          data = await res.json();
        } catch {
          data = {};
        }

        if (!res.ok) return;

        localStorage.setItem("token", data.token);
        localStorage.setItem("userId", String(data.user?.id ?? ""));
        localStorage.setItem("userName", String(data.user?.name ?? ""));
        localStorage.setItem("avatar", String(data.user?.avatar ?? ""));

        setIsLeaving(true);
        setTimeout(() => router.push("/dashboard"), 600);

      } catch (err) {
        console.error("Google login error", err);
      }
    }}
    onError={() => console.log("Google Login Failed")}
  />
</div>
    <p className="text-xs mt-3 mb-3 text-gray-300 text-center leading-relaxed">
 
By continuing, you agree to our
<Link href="/terms" className="text-amber-300 hover:underline"> Terms </Link>
and
<Link href="/privacy" className="text-amber-300 hover:underline"> Privacy Policy</Link>.
</p>

  </>
)}

          {emailNotVerified && (

            <div className="space-y-4 text-center">

            <div className="rounded-xl border border-white/40 bg-white/10 backdrop-blur-md p-5 text-gray-100 shadow-lg">
  
  <div className="text-lg font-semibold text-white mb-2">
    Email not verified
  </div>

  <div className="text-sm text-gray-200 leading-relaxed">
    Please check your inbox and click the verification link.
  </div>

  <div className="text-m text-grey mt-4 flex items-center justify-center gap-2">
  <span className="animate-pulse">Checking verification...</span>
</div>

</div>


              <button
                onClick={resendVerification}
                disabled={isCoolingDown}
                className="w-full rounded-lg bg-amber-400 py-3 font-semibold text-gray-900 disabled:opacity-60"
              >
                {isCoolingDown
                  ? `Resend in ${formatSeconds(cooldownSecondsLeft)}`
                  : "Resend verification email"}
              </button>

              <button
                onClick={() => setEmailNotVerified(false)}
                className="text-sm text-amber-300 hover:underline"
              >
                Back to login
              </button>

            </div>

          )}

          {notice && (
            <div className="mt-4">
              <NoticeBox kind={notice.kind} title={notice.title}>
                {notice.text}
              </NoticeBox>
            </div>
          )}
          <div className="h-px mt-3 flex-1 bg-white/20" />
          <p className="mt-5 text-center text-sm text-gray-200/90">
            Don’t have an account?{" "}
            <Link href="/register" className="font-semibold text-amber-300 hover:underline">
              Register here
            </Link>
          </p>

        </motion.div>

        <footer className="mt-8 text-center text-xs text-gray-200/80 sm:mt-10 sm:text-sm md:absolute md:bottom-6 md:mt-0">
          © {new Date().getFullYear()} Networ.King
        </footer>

      </div>
    </main>
  );
}
