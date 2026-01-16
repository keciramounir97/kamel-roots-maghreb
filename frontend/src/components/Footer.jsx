import { useEffect, useMemo, useState } from "react";
import {
  Facebook,
  Twitter,
  Instagram,
  Youtube,
  MapPin,
  Mail,
  Phone,
  Clock,
  MessageCircle,
  Send,
} from "lucide-react";
import { api } from "../api/client";
import { useTranslation } from "../context/TranslationContext";

const fallbackFooter = {
  enabled: true,
  fineprint: "© Roots Maghreb. All rights reserved.",
};

export default function Footer({ data }) {
  const { t } = useTranslation();
  const [footer, setFooter] = useState(data || fallbackFooter);
  const [loaded, setLoaded] = useState(Boolean(data));
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterStatus, setNewsletterStatus] = useState({
    type: "",
    message: "",
  });
  const [newsletterLoading, setNewsletterLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    if (data) {
      setFooter(data);
      setLoaded(true);
      return () => {
        mounted = false;
      };
    }

    (async () => {
      try {
        const { data: res } = await api.get("/footer");
        if (!mounted) return;
        const cfg =
          res?.footer && typeof res.footer === "object"
            ? res.footer
            : fallbackFooter;
        setFooter({ ...fallbackFooter, ...cfg });
      } catch {
        if (mounted) setFooter(fallbackFooter);
      } finally {
        if (mounted) setLoaded(true);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [data]);

  const navLinks = useMemo(
    () => [
      { label: t("home", "Home"), href: "/" },
      { label: t("library", "Library"), href: "/library" },
      { label: t("periods", "Periods"), href: "/periods" },
      { label: t("archives", "Archives"), href: "/archives" },
      { label: t("sources", "Sources"), href: "/sources" },
      {
        label: t("access_reliability", "Access & Reliability"),
        href: "/access-reliability",
      },
    ],
    [t]
  );

  const resourceLinks = useMemo(
    () => [
      { label: t("archives", "Archives Directory"), href: "/archives" },
      { label: t("sources", "Primary Sources"), href: "/sources" },
      {
        label: t("access_reliability", "Access & Reliability"),
        href: "/access-reliability",
      },
      { label: t("library", "Library"), href: "/library" },
      { label: t("periods", "Periods Timeline"), href: "/periods" },
    ],
    [t]
  );

  const socialLinks = useMemo(
    () => [
      { Icon: Facebook, href: "https://facebook.com" },
      { Icon: Twitter, href: "https://twitter.com" },
      { Icon: Instagram, href: "https://instagram.com" },
      { Icon: Youtube, href: "https://youtube.com" },
    ],
    []
  );

  const handleNewsletterSubmit = async (event) => {
    event.preventDefault();
    const email = newsletterEmail.trim();
    if (!email) {
      setNewsletterStatus({
        type: "error",
        message: t("newsletter_email_required", "Email is required."),
      });
      return;
    }

    try {
      setNewsletterLoading(true);
      setNewsletterStatus({ type: "", message: "" });
      await api.post("/newsletter", { email });
      setNewsletterEmail("");
      setNewsletterStatus({
        type: "success",
        message: t(
          "newsletter_success",
          "Thanks! We will reach out to you soon."
        ),
      });
    } catch (err) {
      setNewsletterStatus({
        type: "error",
        message:
          err.response?.data?.message ||
          t("newsletter_failed", "Failed to subscribe."),
      });
    } finally {
      setNewsletterLoading(false);
    }
  };

  if (!loaded || footer?.enabled === false) return null;

  return (
    <footer className="heritage-footer">
      <div className="heritage-footer-grid">
        <div className="heritage-footer-column">
          <div className="heritage-logo">
            roots
            <span>maghreb</span>
          </div>
          <p>
            {footer.brandTagline ||
              t(
                "footer_desc",
                "La référence pour préserver l'histoire familiale du Maghreb."
              )}
          </p>
          <div className="heritage-social-links">
            {socialLinks.map(({ Icon, href }) => (
              <a key={href} href={href} target="_blank" rel="noreferrer">
                <Icon size={18} />
              </a>
            ))}
          </div>
        </div>

        <div className="heritage-footer-column">
          <h3>{t("links", "Liens rapides")}</h3>
          <ul className="heritage-footer-links">
            {navLinks.map((link) => (
              <li key={link.href}>
                <a href={link.href}>{link.label}</a>
              </li>
            ))}
          </ul>
        </div>

        <div className="heritage-footer-column">
          <h3>{t("resources", "Ressources")}</h3>
          <ul className="heritage-footer-links">
            {resourceLinks.map((link) => (
              <li key={link.href}>
                <a href={link.href}>{link.label}</a>
              </li>
            ))}
          </ul>
        </div>

        <div className="heritage-footer-column">
          <h3>{t("contact", "Contact")}</h3>
          <ul className="heritage-footer-links">
            <li>
              <MapPin size={16} style={{ marginRight: "5px" }} />
              Location opening soon
            </li>
            <li>
              <Mail size={16} style={{ marginRight: "5px" }} />
              contact@rootsmaghreb.com
            </li>
            <li>
              <Phone size={16} style={{ marginRight: "5px" }} />
              +961 36 26 082
            </li>
            <li>
              <MessageCircle size={16} style={{ marginRight: "5px" }} />
              WhatsApp: +961 36 26 082
            </li>
            <li>
              <Clock size={16} style={{ marginRight: "5px" }} />
              Lun-Ven: 9h-17h
            </li>
          </ul>
          <form className="mt-6 space-y-3" onSubmit={handleNewsletterSubmit}>
            <p className="text-sm uppercase tracking-[0.3em] text-[#d4af37]">
              {t("newsletter", "Newsletter")}
            </p>
            <p className="text-sm opacity-80">
              {t(
                "newsletter_prompt",
                "Leave your email and we will reach out to you."
              )}
            </p>
            <input
              type="email"
              value={newsletterEmail}
              onChange={(event) => {
                setNewsletterEmail(event.target.value);
                if (newsletterStatus.message) {
                  setNewsletterStatus({ type: "", message: "" });
                }
              }}
              placeholder={t("email", "Email")}
              className="heritage-input w-full px-4 py-2 rounded-lg"
              aria-label={t("email", "Email")}
            />
            <button
              type="submit"
              className="heritage-btn w-full justify-center gap-2"
              disabled={newsletterLoading}
            >
              <Send size={16} />
              {newsletterLoading
                ? t("subscribing", "Subscribing...")
                : t("subscribe", "Subscribe")}
            </button>
            {newsletterStatus.message ? (
              <p
                className={`text-sm ${
                  newsletterStatus.type === "success"
                    ? "text-green-300"
                    : "text-red-300"
                }`}
              >
                {newsletterStatus.message}
              </p>
            ) : null}
          </form>
        </div>
      </div>
      <div className="heritage-footer-meta">
        {footer.fineprint || "© Roots Maghreb. Tous droits réservés."}
      </div>
    </footer>
  );
}

