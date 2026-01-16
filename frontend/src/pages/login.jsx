import { useThemeStore } from "../store/theme";
import { NavLink, useNavigate } from "react-router-dom";
import { Lock, Mail } from "lucide-react";
import AOS from "aos";
import { useEffect, useState } from "react";
import { useAuth } from "../admin/components/AuthContext";
import { useTranslation } from "../context/TranslationContext";
import RootsPageShell from "../components/RootsPageShell";

export default function Login() {
  const { theme } = useThemeStore();
  const { login } = useAuth();
  const { user } = useAuth(); // Destructure user, login is already there
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  useEffect(() => {
    AOS.init({ duration: 900, once: true });
    // Redirect if already logged in
    if (user) {
      navigate("/admin", { replace: true });
    }
  }, [user, navigate]);

  const cardBg = theme === "dark" ? "bg-[#1c1110]" : "bg-white";
  const borderColor =
    theme === "dark" ? "border-[#2c1810]" : "border-[#e8dfca]";
  const inputBg = theme === "dark" ? "bg-white/5" : "bg-black/5";
  const accent = theme === "dark" ? "text-[#d4af37]" : "text-[#5d4037]";

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    console.log("🔐 Login button clicked");

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !emailPattern.test(trimmedEmail)) {
      setError(
        t("invalid_email", "Please provide a valid email before logging in")
      );
      return;
    }
    if (!password) {
      setError(t("password_required", "Password is required to sign you in"));
      return;
    }

    console.log("✅ Validation passed, attempting login...");
    setLoading(true);
    try {
      console.log("📡 Calling login API...");
      const user = await login(trimmedEmail, password);
      console.log("✅ Login successful, user:", user);

      if (user) {
        console.log("🚀 Navigating to /admin...");
        navigate("/admin", { replace: true });
      } else {
        console.error("❌ No user returned from login");
        setError("Login failed: No user data received");
      }
    } catch (err) {
      console.error("❌ Login error:", err);
      console.error("Error details:", {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
      });

      const errorMessage =
        err.response?.data?.message ||
        err.message ||
        "Invalid credentials. Please check your email and password.";

      setError(errorMessage);
    } finally {
      console.log("🏁 Login attempt complete");
      setLoading(false);
    }
  };

  return (
    <RootsPageShell
      hero={
        <div className="space-y-3">
          <h1 className="text-4xl font-bold text-center">
            {t("welcome_back", "Welcome Back")}
          </h1>
          <p className="text-lg opacity-80 text-center">
            {t(
              "login_with_email_password",
              "Securely log in and continue building your Roots Maghreb archive."
            )}
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
          <form className="space-y-6" onSubmit={handleLogin}>
            <div className="space-y-2">
              <label className="text-sm font-semibold">
                {t("email", "Email")}
              </label>
              <div
                className={`flex items-center gap-3 p-3 rounded-md border ${borderColor} ${inputBg}`}
              >
                <Mail className={`w-5 h-5 ${accent}`} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@email.com"
                  className={`bg-transparent outline-none flex-1 ${
                    theme === "dark" ? "text-white" : "text-[#2c1810]"
                  }`}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold">
                {t("password", "Password")}
              </label>
              <div
                className={`flex items-center gap-3 p-3 rounded-md border ${borderColor} ${inputBg}`}
              >
                <Lock className={`w-5 h-5 ${accent}`} />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="********"
                  className={`bg-transparent outline-none flex-1 ${
                    theme === "dark" ? "text-white" : "text-[#2c1810]"
                  }`}
                />
              </div>
            </div>

            {error && (
              <p className="text-red-500 text-sm text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-3 rounded-md text-white font-semibold shadow-lg bg-gradient-to-r from-[#5d4037] to-[#d4af37] hover:opacity-90 transition disabled:opacity-60"
            >
              {loading
                ? t("please_wait", "Please wait...")
                : t("login", "Login")}
            </button>

            <div className="w-full h-px opacity-40 bg-[#8d6e63]" />

            <div className="flex justify-between text-sm">
              <NavLink
                to="/resetpassword"
                className="text-[#5d4037] hover:text-[#d4af37]"
              >
                {t("forgot_password", "Forgot password?")}
              </NavLink>
              <NavLink
                to="/signup"
                className="text-[#5d4037] font-semibold hover:text-[#d4af37]"
              >
                {t("create_account", "Create account")}
              </NavLink>
            </div>
          </form>
        </div>
      </section>
    </RootsPageShell>
  );
}
