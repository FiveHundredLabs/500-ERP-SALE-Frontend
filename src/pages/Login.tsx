import React, { useEffect } from "react";
import LoginForm from "../components/LoginForm";

const Login: React.FC = () => {
  useEffect(() => {
    // Enforce dark theme on login page as default
    const root = document.documentElement;
    root.classList.remove("light");
    root.classList.add("dark");
    root.setAttribute("data-theme", "dark");
    document.body.classList.remove("light-theme");
    document.body.classList.add("dark-theme");
  }, []);

  return (
    <div className="login-page dark relative min-h-screen overflow-hidden bg-[#0B1120] flex items-center justify-center">

      {/* Background Gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(37,99,235,0.18),transparent_40%),radial-gradient(circle_at_80%_80%,rgba(14,165,233,0.12),transparent_40%)]" />

      {/* Subtle Grid */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
        }}
      />

      {/* Decorative Glow Elements */}
      <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-blue-600/15 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-cyan-500/15 blur-3xl pointer-events-none" />

      {/* Small Accent Line */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-70" />

      {/* Login Content */}
      <div className="relative z-10 w-full max-w-md px-4 py-8">
        <LoginForm />
      </div>

      {/* Footer */}
      <div className="absolute bottom-5 left-0 right-0 text-center pointer-events-none">
        <p className="text-xs text-slate-500" style={{ color: '#64748b' }}>
          © {new Date().getFullYear()} 500 Labs. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default Login;