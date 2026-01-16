import { useThemeStore } from "../store/theme";
import { NavLink, useNavigate } from "react-router-dom";
import { Mail, Lock, User, Phone } from "lucide-react";
import AOS from "aos";
import { useEffect, useState } from "react";
import { useAuth } from "../admin/components/AuthContext";
import { useTranslation } from "../context/TranslationContext";
import RootsPageShell from "../components/RootsPageShell";

export default function Signup() {
  const { theme } = useThemeStore();
  const { signup } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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

  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");

    if (!fullName.trim()) {
      setError(t("full_name_required", "Full name is required"));
      return;
    }
    if (!emailPattern.test(email.trim().toLowerCase())) {
      setError(t("invalid_email", "Please enter a valid email address"));
      return;
    }
    if (String(password).length < 8) {
      setError(t("password_strength", "Password must be at least 8 characters long"));
      return;
    }

    setLoading(true);
    try {
      await signup(fullName.trim(), phone.trim(), email.trim().toLowerCase(), password);
      navigate("/login");
    } catch (err) {
      setError(err.response?.data?.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <RootsPageShell
      hero={
        <div className="space-y-4">
          <h1 className="text-4xl font-bold text-center">{t("signup", "Sign Up")}</h1>
          <p className="text-lg opacity-80 text-center">
            {t("signup_desc", "Join Roots Maghreb and preserve your family's stories across the Maghreb.")}
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
          <form className="space-y-6" onSubmit={handleSignup}>
            {[
              {
                label: t("full_name", "Full Name"),
                icon: User,
                type: "text",
                placeholder: t("full_name_placeholder", "Your name"),
                value: fullName,
                setter: setFullName,
              },
              {
                label: t("phone", "Phone"),
                icon: Phone,
                type: "tel",
                placeholder: "+1 555 123 4567",
                value: phone,
                setter: setPhone,
              },
              {
                label: t("email", "Email"),
                icon: Mail,
                type: "email",
                placeholder: "example@email.com",
                value: email,
                setter: setEmail,
              },
            ].map((field) => (
              <div key={field.label} className="space-y-2">
                <label className="text-sm font-semibold">{field.label}</label>
                <div className={`flex items-center gap-3 p-3 rounded-md border ${borderColor} ${inputBg}`}>
                  <field.icon className={`w-5 h-5 ${accent}`} />
                  <input
                    type={field.type}
                    required
                    value={field.value}
                    onChange={(e) => field.setter(e.target.value)}
                    placeholder={field.placeholder}
                    className={`bg-transparent outline-none flex-1 ${theme === "dark" ? "text-white" : "text-[#2c1810]"}`}
                  />
                </div>
              </div>
            ))}

            <div className="space-y-2">
              <label className="text-sm font-semibold">{t("password", "Password")}</label>
              <div className={`flex items-center gap-3 p-3 rounded-md border ${borderColor} ${inputBg}`}>
                <Lock className={`w-5 h-5 ${accent}`} />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="********"
                  className={`bg-transparent outline-none flex-1 ${theme === "dark" ? "text-white" : "text-[#2c1810]"}`}
                />
              </div>
            </div>

            {error && <p className="text-red-500 text-sm text-center">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-3 rounded-md text-white font-semibold shadow-lg bg-gradient-to-r from-[#5d4037] to-[#d4af37] hover:opacity-90 transition disabled:opacity-60"
            >
              {loading ? t("please_wait", "Please wait...") : t("signup", "Sign Up")}
            </button>

            <div className="w-full h-px opacity-40 bg-[#8d6e63]" />

            <p className="text-center text-sm opacity-90">
              {t("already_have_account", "Already have an account?")}&nbsp;
              <NavLink to="/login" className="text-[#5d4037] font-semibold hover:text-[#d4af37]">
                {t("login", "Login")}
              </NavLink>
            </p>
          </form>
        </div>
      </section>
    </RootsPageShell>
  );
}
