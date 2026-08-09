import React from "react";
import LoginForm from "../components/LoginForm";

const Login: React.FC = () => {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0B1120] flex items-center justify-center">

      {/* Background Gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(37,99,235,0.15),transparent_35%),radial-gradient(circle_at_80%_80%,rgba(14,165,233,0.10),transparent_35%)]" />

      {/* Subtle Grid */}
      <div
        className="absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
        }}
      />

      {/* Decorative Glow Elements */}
      <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-blue-600/10 blur-3xl" />
      <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl" />

      {/* Small Accent Line */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-70" />

      {/* Login Content */}
      <div className="relative z-10 w-full max-w-md px-6">
        <LoginForm />
      </div>

      {/* Footer */}
      <div className="absolute bottom-5 left-0 right-0 text-center">
        <p className="text-xs text-slate-500">
          © {new Date().getFullYear()} 500 Labs. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default Login;