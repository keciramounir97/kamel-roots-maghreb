import { useEffect, useState } from "react";
import { useThemeStore } from "../store/theme";
import AOS from "aos";
import "aos/dist/aos.css";
import {
  Mail,
  Phone,
  MapPin,
  Clock,
  Send,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { useTranslation } from "../context/TranslationContext";
import { api } from "../api/client";
import RootsPageShell from "../components/RootsPageShell";

export default function ContactUs() {
  const { theme } = useThemeStore();
  const { t } = useTranslation();

  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: "", msg: "" });

  useEffect(() => {
    AOS.init({ duration: 900, once: true });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus({ type: "", msg: "" });

    try {
      await api.post("/contact", form);
      setStatus({ type: "success", msg: "Message sent successfully!" });
      setForm({ name: "", email: "", message: "" });
    } catch (err) {
      setStatus({
        type: "error",
        msg: err.response?.data?.message || "Failed to send message.",
      });
    } finally {
      setLoading(false);
    }
  };

  const cardBg = theme === "dark" ? "bg-[#151a21]" : "bg-white";
  const borderColor =
    theme === "dark" ? "border-[#d8c7b0]/40" : "border-[#3e2723]/20";
  const inputBg = theme === "dark" ? "bg-[#171c25]" : "bg-[#fff9f0]";

  return (
    <RootsPageShell
      hero={
        <div className="space-y-5">
          <h1 className="text-4xl md:text-5xl font-bold drop-shadow">
            {t("contact_us", "Contact Us")}
          </h1>
          <p className="max-w-3xl mx-auto text-lg opacity-90">
            We're ready to assist you with your genealogical research, archive
            queries, and story preservation. Drop us a line and our team will
            get back within 24 hours.
          </p>
        </div>
      }
    >
      <section className="roots-section roots-section-alt" data-aos="fade-up">
        <div className="grid lg:grid-cols-2 gap-16">
          <div
            className={`${cardBg} p-10 rounded-md shadow-xl border ${borderColor}`}
          >
            <h2 className="text-3xl font-bold mb-6">
              {t("send_us_message", "Send us a Message")}
            </h2>

            {status.msg && (
              <div
                className={`p-4 rounded-md mb-6 flex items-center gap-3 ${
                  status.type === "success"
                    ? "bg-emerald-500/10 text-emerald-400"
                    : "bg-rose-500/10 text-rose-400"
                }`}
              >
                {status.type === "success" ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <AlertCircle className="w-5 h-5" />
                )}
                <span>{status.msg}</span>
              </div>
            )}

            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <label className="font-semibold">
                  {t("full_name", "Full Name")}
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder={t("full_name_placeholder", "Your name")}
                  className={`w-full p-3 rounded-md ${inputBg} border ${borderColor} outline-none ${
                    theme === "dark" ? "text-white" : "text-[#2c1810]"
                  } focus:border-[#5d4037] transition-colors`}
                />
              </div>

              <div className="space-y-2">
                <label className="font-semibold">{t("email", "Email")}</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="example@email.com"
                  className={`w-full p-3 rounded-md ${inputBg} border ${borderColor} outline-none ${
                    theme === "dark" ? "text-white" : "text-[#2c1810]"
                  } focus:border-[#5d4037] transition-colors`}
                />
              </div>

              <div className="space-y-2">
                <label className="font-semibold">
                  {t("your_message", "Your Message")}
                </label>
                <textarea
                  rows="5"
                  required
                  value={form.message}
                  onChange={(e) =>
                    setForm({ ...form, message: e.target.value })
                  }
                  placeholder={t("message_placeholder", "How can we help you?")}
                  className={`w-full p-3 rounded-md ${inputBg} border ${borderColor} outline-none resize-none ${
                    theme === "dark" ? "text-white" : "text-[#2c1810]"
                  } focus:border-[#5d4037] transition-colors`}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-6 rounded-md bg-gradient-to-r from-[#5d4037] to-[#d4af37] text-[#151110] font-semibold shadow-lg hover:opacity-90 transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <span>Sending...</span>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    {t("send_message", "Send Message")}
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="space-y-10">
            {[
              {
                icon: Phone,
                label: "Call Us",
                value: "+961 36 26 082",
                accent: "#5d4037",
              },
              {
                icon: Mail,
                label: "Email",
                value: "kameladmin@rootsmaghreb.com",
                accent: "#d4af37",
              },
              {
                icon: MapPin,
                label: "Visit Us",
                value: "Location opening soon",
                accent: "#0b5d52",
              },
              {
                icon: Clock,
                label: "Opening Hours",
                value: "Sun-Thu: 9:00-18:00",
                accent: "#5d4037",
              },
            ].map((item) => (
              <div
                key={item.label}
                className={`${cardBg} p-6 rounded-md shadow-lg border ${borderColor} flex items-center gap-6`}
              >
                <item.icon
                  className="w-10 h-10"
                  style={{ color: item.accent }}
                />
                <div>
                  <h3 className="text-xl font-bold">{item.label}</h3>
                  <p className="opacity-90 mt-1">{item.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="roots-section" data-aos="zoom-in">
        <h2 className="text-3xl font-bold text-center mb-8">Our Location</h2>
        <div
          className={`${cardBg} rounded-md border ${borderColor} shadow-xl min-h-[220px] flex flex-col items-center justify-center gap-4`}
        >
          <MapPin className="w-16 h-16 text-[#0b5d52] opacity-70" />
          <p className="opacity-70 text-lg font-bold">Location opening soon</p>
          <p className="opacity-50 text-sm">
            Stay tuned for our grand opening!
          </p>
        </div>
      </section>
    </RootsPageShell>
  );
}
