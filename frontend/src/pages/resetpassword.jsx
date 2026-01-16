import { useThemeStore } from "../store/theme";
import { NavLink, useNavigate } from "react-router-dom";
import { Mail, Lock, ShieldCheck } from "lucide-react";
import AOS from "aos";
import { useEffect, useState } from "react";
import { useAuth } from "../admin/components/AuthContext";
import { useTranslation } from "../context/TranslationContext";
import RootsPageShell from "../components/RootsPageShell";

export default function ForgotPassword() {
  const { theme } = useThemeStore();
  const { requestReset, verifyReset } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  useEffect(() => {
    AOS.init({ duration: 900, once: true });
  }, []);

  const cardBg = theme === "dark" ? "bg-[#1c1110]" : "bg-white";
  const borderColor = theme === "dark" ? "border-[#2c1810]" : "border-[#e8dfca]";
  const inputBg = theme === "dark" ? "bg-white/5" : "bg-black/5";
  const accent = theme === "dark" ? "text-[#d4af37]" : "text-[#5d4037]";

  const handleRequest = async (e) => {
    e.preventDefault();
    setError("");

    const trimmedEmail = email.trim().toLowerCase();
    if (!emailPattern.test(trimmedEmail)) {
      setError(t("invalid_email", "Please enter a valid email address"));
      return;
    }

    setLoading(true);
    try {
      await requestReset(trimmedEmail);
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send reset email");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setError("");

    if (!code.trim()) {
      setError(t("code_required", "Verification code is required"));
      return;
    }
    if (newPassword.length < 8) {
      setError(t("password_strength", "Password must be at least 8 characters long"));
      return;
    }

    setLoading(true);
    try {
      await verifyReset(email.trim().toLowerCase(), code.trim(), newPassword);
      navigate("/login");
    } catch (err) {
      setError(err.response?.data?.message || "Invalid code or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <RootsPageShell
      hero={
        <div className="space-y-3">
          <h1 className="text-4xl font-bold text-center">
            {step === 1
              ? t("reset_password", "Reset Password")
              : t("verify_and_reset", "Verify & Reset")}
          </h1>
          <p className="text-lg opacity-80 text-center">
            {step === 1
              ? t("reset_step1_desc", "Enter your email to receive a verification code.")
              : t("reset_step2_desc", "Use the code and set a new secure password.")}
          </p>
        </div>
      }
      className="min-h-[calc(100vh-120px)]"
    >
      <section className="roots-section">
        <div
          data-aos="zoom-in"
          className={`${cardBg} relative mx-auto w-full max-w-md px-10 py-12 rounded-lg shadow-2xl border ${borderColor}`}
        >
          <form className="space-y-6" onSubmit={step === 1 ? handleRequest : handleReset}>
            {step === 1 && (
              <div className="space-y-2">
                <label className="text-sm font-semibold">{t("email", "Email")}</label>
                <div className={`flex items-center gap-3 p-3 rounded-md border ${borderColor} ${inputBg}`}>
                  <Mail className={`w-5 h-5 ${accent}`} />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@email.com"
                    className={`bg-transparent outline-none flex-1 ${theme === "dark" ? "text-white" : "text-[#2c1810]"}`}
                  />
                </div>
              </div>
            )}

            {step === 2 && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-semibold">{t("verification_code", "Verification Code")}</label>
                  <div className={`flex items-center gap-3 p-3 rounded-md border ${borderColor} ${inputBg}`}>
                    <ShieldCheck className={`w-5 h-5 ${accent}`} />
                    <input
                      type="text"
                      required
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      placeholder={t("code_placeholder", "6-digit code")}
                      className={`bg-transparent outline-none flex-1 tracking-widest ${theme === "dark" ? "text-white" : "text-[#2c1810]"}`}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold">{t("new_password", "New Password")}</label>
                  <div className={`flex items-center gap-3 p-3 rounded-md border ${borderColor} ${inputBg}`}>
                    <Lock className={`w-5 h-5 ${accent}`} />
                    <input
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="********"
                      className={`bg-transparent outline-none flex-1 ${theme === "dark" ? "text-white" : "text-[#2c1810]"}`}
                    />
                  </div>
                </div>
              </>
            )}

            {error && <p className="text-red-500 text-sm text-center">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-3 rounded-md text-white font-semibold shadow-lg bg-gradient-to-r from-[#5d4037] to-[#d4af37] hover:opacity-90 transition disabled:opacity-60"
            >
              {loading
                ? t("please_wait", "Please wait...")
                : step === 1
                ? t("send_code", "Send Code")
                : t("reset_password", "Reset Password")}
            </button>
          </form>

          <div className="w-full h-px opacity-40 bg-[#8d6e63]" />

          <p className="text-center text-sm opacity-90">
            {t("back_to", "Back to")}{" "}
            <NavLink to="/login" className="text-[#5d4037] font-semibold hover:text-[#d4af37]">
              {t("login", "Login")}
            </NavLink>
          </p>
        </div>
      </section>
    </RootsPageShell>
  );
}
