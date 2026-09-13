import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { useAuth, ApiError } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { CATEGORIES, CATEGORY_LABELS, AREAS } from "@/lib/constants";
import { RecommendedInput } from "@/components/RecommendedInput";

type Mode = "login" | "register" | "forgot";

export default function AuthPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showRegistrationPassword, setShowRegistrationPassword] = useState(false);
  const [showRegistrationConfirmation, setShowRegistrationConfirmation] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [showResetConfirmation, setShowResetConfirmation] = useState(false);
  const [registrationId, setRegistrationId] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [regForm, setRegForm] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    dateOfBirth: "",
    gender: "MALE",
    club: "",
    category: CATEGORIES[0] as string,
    area: AREAS[0] as string,
    city: "",
  });
  const [forgotForm, setForgotForm] = useState({ email: "", otp: "", password: "", confirmPassword: "" });

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!loginForm.email || !loginForm.password) {
      setError("Please complete all required fields.");
      return;
    }
    setLoading(true);
    try {
      const user = await login(loginForm.email, loginForm.password);
      navigate(user.role === "ADMIN" ? "/admin" : "/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Invalid login details.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (Object.values(regForm).some((v) => v === "")) {
      setError("Please complete all required fields.");
      return;
    }
    if (regForm.password !== regForm.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const result = await register(regForm);
      setRegistrationId(result.player.playerId);
      setSuccess(`Player registered successfully. Your Player ID is ${result.player.playerId}. Please save it for login.`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to complete registration.");
    } finally {
      setLoading(false);
    }

  }

  async function requestOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const res = await api.post<{ message: string }>("/auth/forgot-password", { email: forgotForm.email });
      setForgotSent(true);
      setSuccess(res.message);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to send the OTP.");
    } finally {
      setLoading(false);
    }
  }

  async function resetPassword(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!/^\d{6}$/.test(forgotForm.otp.trim())) {
      setError("Enter the six-digit OTP from your email.");
      return;
    }
    if (forgotForm.password.length < 6) {
      setError("New password must be at least 6 characters.");
      return;
    }
    if (forgotForm.password !== forgotForm.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const res = await api.post<{ message: string }>("/auth/reset-password", forgotForm);
      setSuccess(res.message);
      setForgotSent(false);
      setMode("login");
      setForgotForm({ email: "", otp: "", password: "", confirmPassword: "" });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to reset the password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-navy to-navy-dark px-4 py-10 relative">
      <div className="absolute top-0 left-0 right-0 h-[5px] bg-gradient-to-r from-saffron via-white to-green" />

      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-2">
            <img src="/logo.jpg" alt="DDABA" className="h-16 w-16 object-contain mx-auto mb-3" />
            <h1 className="font-display text-lg font-bold text-navy uppercase tracking-wide leading-snug">
              Dindigul District
              <br />
              Aeroskatoball Association
            </h1>
            <p className="text-muted-foreground text-xs mt-2">Official Player &amp; Association Management Portal</p>
          </div>

          {mode !== "forgot" && (
            <div className="flex mt-6 mb-5 rounded-lg bg-muted p-1">
              <button
                className={`flex-1 py-2 text-xs font-semibold uppercase tracking-wide rounded-md transition-colors ${mode === "login" ? "bg-navy text-white" : "text-muted-foreground"}`}
                onClick={() => { setMode("login"); setError(""); }}
              >
                Login
              </button>
              <button
                className={`flex-1 py-2 text-xs font-semibold uppercase tracking-wide rounded-md transition-colors ${mode === "register" ? "bg-navy text-white" : "text-muted-foreground"}`}
                onClick={() => { setMode("register"); setError(""); }}
              >
                Player Registration
              </button>
            </div>
          )}

          {error && (
            <div className="mb-4 text-sm text-danger bg-danger/10 border border-danger/30 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 text-sm text-success bg-success/10 border border-success/30 rounded-lg px-3 py-2">
              {success}
            </div>
          )}

          {mode === "login" && (
            <form onSubmit={handleLogin} className="space-y-4">
              <Field label="Email / Player ID">
                <input
                  className="field-input"
                  value={loginForm.email}
                  onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                  placeholder="you@example.com or DDABA-2026-123456"
                />
              </Field>
              <Field label="Password">
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    className="field-input pr-10"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                    placeholder="••••••••"
                  />
                  <button type="button" onClick={() => setShowPassword((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </Field>
              <div className="text-right">
                <button type="button" className="text-xs text-green font-semibold hover:underline" onClick={() => setMode("forgot")}>
                  Forgot password?
                </button>
              </div>
              <SubmitButton loading={loading} label="Login" />
            </form>
          )}

          {mode === "register" && (
            <form onSubmit={handleRegister} className="space-y-4 max-h-[58vh] overflow-y-auto pr-1">
              <Field label="Full Name"><input className="field-input" value={regForm.fullName} onChange={(e) => setRegForm({ ...regForm, fullName: e.target.value })} /></Field>
              <Field label="Email"><input type="email" className="field-input" value={regForm.email} onChange={(e) => setRegForm({ ...regForm, email: e.target.value })} /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Password"><PasswordInput show={showRegistrationPassword} onToggle={() => setShowRegistrationPassword((show) => !show)} value={regForm.password} onChange={(value) => setRegForm({ ...regForm, password: value })} /></Field>
                <Field label="Confirm Password"><PasswordInput show={showRegistrationConfirmation} onToggle={() => setShowRegistrationConfirmation((show) => !show)} value={regForm.confirmPassword} onChange={(value) => setRegForm({ ...regForm, confirmPassword: value })} /></Field>
              </div>
              <p className="text-[11px] text-muted-foreground -mt-2">
                At least 6 characters. Uppercase, lowercase, and special characters are optional.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Phone Number"><input className="field-input" value={regForm.phone} onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })} /></Field>
                <Field label="Date of Birth"><input type="date" className="field-input" value={regForm.dateOfBirth} onChange={(e) => setRegForm({ ...regForm, dateOfBirth: e.target.value })} /></Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Gender">
                  <select className="field-input" value={regForm.gender} onChange={(e) => setRegForm({ ...regForm, gender: e.target.value })}>
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </Field>
              </div>
              <Field label="Club / School / College"><RecommendedInput storageKey="club-school-college" className="field-input" value={regForm.club} onChange={(value) => setRegForm({ ...regForm, club: value })} /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Category">
                  <RecommendedInput storageKey="player-category" className="field-input" value={regForm.category} onChange={(value) => setRegForm({ ...regForm, category: value })} options={CATEGORIES} labels={CATEGORY_LABELS} />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Dindigul District Area">
                  <RecommendedInput storageKey="district-area" className="field-input" value={regForm.area} onChange={(value) => setRegForm({ ...regForm, area: value })} options={AREAS} />
                </Field>
                <Field label="City"><input className="field-input" value={regForm.city} onChange={(e) => setRegForm({ ...regForm, city: e.target.value })} /></Field>
              </div>
              <SubmitButton loading={loading} label="Create Player Account" />
              {registrationId && <button type="button" className="w-full text-sm text-green font-semibold" onClick={() => navigate("/dashboard")}>Continue to Dashboard</button>}
            </form>
          )}

          {mode === "forgot" && (
            <form className="space-y-4" onSubmit={forgotSent ? resetPassword : requestOtp}>
              <Field label="Registered Email">
                <input type="email" required className="field-input" placeholder="you@example.com" value={forgotForm.email} onChange={(e) => setForgotForm({ ...forgotForm, email: e.target.value })} />
              </Field>
              {!forgotSent ? <p className="text-xs text-muted-foreground">We will send a six-digit OTP to this email. Email delivery must be configured by the association.</p> : <>
                <Field label="Email OTP"><input required inputMode="numeric" pattern="\d{6}" className="field-input" value={forgotForm.otp} onChange={(e) => setForgotForm({ ...forgotForm, otp: e.target.value })} /></Field>
                <Field label="New Password"><PasswordInput required minLength={6} show={showResetPassword} onToggle={() => setShowResetPassword((show) => !show)} value={forgotForm.password} onChange={(value) => setForgotForm({ ...forgotForm, password: value })} /><span className="text-[11px] text-muted-foreground">At least 6 characters. Uppercase, lowercase, and special characters are optional.</span></Field>
                <Field label="Confirm New Password"><PasswordInput required show={showResetConfirmation} onToggle={() => setShowResetConfirmation((show) => !show)} value={forgotForm.confirmPassword} onChange={(value) => setForgotForm({ ...forgotForm, confirmPassword: value })} /></Field>
              </>}
              <SubmitButton loading={loading} label={forgotSent ? "Reset Password" : "Send OTP"} />
              <button type="button" className="text-xs text-green font-semibold w-full text-center" onClick={() => setMode("login")}>
                Back to login
              </button>
            </form>
          )}
        </div>
      </div>

      <style>{`
        .field-input {
          width: 100%;
          background: #fff;
          border: 1px solid #e6e3da;
          border-radius: 0.5rem;
          padding: 0.6rem 0.9rem;
          font-size: 0.875rem;
          color: #16202a;
          outline: none;
          transition: border-color 0.2s;
        }
        .field-input:focus {
          border-color: #ff6a00;
        }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-muted-foreground mb-1.5">{label}</span>
      {children}
    </label>
  );
}

function PasswordInput({
  value,
  onChange,
  show,
  onToggle,
  required,
  minLength,
}: {
  value: string;
  onChange: (value: string) => void;
  show: boolean;
  onToggle: () => void;
  required?: boolean;
  minLength?: number;
}) {
  return (
    <div className="relative">
      <input
        required={required}
        minLength={minLength}
        type={show ? "text" : "password"}
        className="field-input pr-10"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <button type="button" onClick={onToggle} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-label={show ? "Hide password" : "Show password"}>
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

function SubmitButton({ loading, label, onClick }: { loading: boolean; label: string; onClick?: (e: any) => void }) {
  return (
    <button
      type={onClick ? "button" : "submit"}
      onClick={onClick}
      disabled={loading}
      className="w-full py-2.5 rounded-lg bg-saffron text-white font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-60 uppercase tracking-wide"
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {label}
    </button>
  );
}
