import React from "react";
import { Heart } from "lucide-react";
import OmniLogo from "./OmniLogo";

export default function Footer() {
  return (
    <footer className="omni-footer">
      <div className="omni-footer-inner">
        <div className="omni-footer-brand">
          <div className="omni-nav-brand" style={{ cursor: "default" }}>
            <OmniLogo size={40} />
            <span>Omni Learn</span>
          </div>
          <p>The premium platform for programmers who want to grow every single day.</p>
        </div>
        <div className="omni-footer-cols">
          <div>
            <h4>Platform</h4>
            <a>Problems</a>
            <a>Roadmaps</a>
            <a>Classrooms</a>
            <a>Live Sessions</a>
          </div>
          <div>
            <h4>Company</h4>
            <a>About</a>
            <a>Careers</a>
            <a>Contact</a>
            <a>Press</a>
          </div>
          <div>
            <h4>Resources</h4>
            <a>Docs</a>
            <a>Blog</a>
            <a>Community</a>
            <a>Changelog</a>
          </div>
        </div>
      </div>
      <div className="omni-footer-bottom">
        <span>© {new Date().getFullYear()} Omni Learn. All rights reserved.</span>
        <span className="omni-footer-made">
          Made with <Heart size={12} fill="currentColor" /> for serious developers.
        </span>
      </div>
    </footer>
  );
}
