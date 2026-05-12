import React from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import Cookies from "js-cookie";
import OmniLogo from "./OmniLogo";

const NAV_LINKS = [
  { label: "HOME", to: "/problems" },
];

const isLoggedIn = () => {
  try {
    return !!Cookies.get("token") && !!Cookies.get("user");
  } catch {
    return false;
  }
};

export default function Navbar() {
  const navigate = useNavigate();
  const loggedIn = isLoggedIn();
  return (
    <motion.nav
      className="omni-navbar"
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <div className="omni-nav-brand" onClick={() => navigate("/")}>
        <OmniLogo size={36} />
        <span>Omni Learn</span>
      </div>
      <div className="omni-nav-links">
        {NAV_LINKS.map((l) => (
          <button key={l.to} onClick={() => navigate(l.to)} className="omni-nav-link">
            {l.label}
          </button>
        ))}
      </div>
      <div className="omni-nav-actions">
        {loggedIn ? (
          <>
            <button className="omni-nav-ghost" onClick={() => navigate("/problems")}>
              Dashboard
            </button>
            <button className="omni-nav-cta" onClick={() => navigate("/editor")}>
              Start coding
            </button>
          </>
        ) : (
          <>
            <button className="omni-nav-ghost" onClick={() => navigate("/auth")}>
              Sign in
            </button>
            <button className="omni-nav-cta" onClick={() => navigate("/auth")}>
              Get started
            </button>
          </>
        )}
      </div>
    </motion.nav>
  );
}
