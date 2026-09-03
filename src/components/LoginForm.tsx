import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import Logo from "../assets/logo_without_bg.png";

const LoginForm: React.FC = () => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
  }>({});

  const navigate = useNavigate();
  const { login, isLoading } = useAuth();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (fieldErrors[name as keyof typeof fieldErrors]) {
      setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});

    const errors: { email?: string; password?: string } = {};
    if (!formData.email.trim()) errors.email = "Email is required";
    else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim()))
        errors.email = "Please enter a valid email";
    }
    if (!formData.password.trim()) errors.password = "Password is required";

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    try {
      await login({
        email: formData.email.trim(),
        password: formData.password.trim(),
      });
      navigate("/dashboard");
    } catch (err: any) {
      const msg =
        err.message || "Invalid email or password. Please try again.";
      setFieldErrors({ email: msg, password: msg });
    }
  };

  return (
    <div className="w-full max-w-md flex flex-col items-center">
      {/* Brand Header above the card */}
      <div className="text-center mb-6 flex flex-col items-center select-none">
        <div 
          className="w-20 h-20 rounded-2xl bg-[#0f172a] border border-[#233876] flex items-center justify-center mb-3 shadow-2xl p-2.5 transition-transform hover:scale-105 shadow-blue-900/30"
          style={{ backgroundColor: '#0f172a', borderColor: '#233876' }}
        >
          <img src={Logo} alt="S & K Enterprises" className="w-full h-full object-contain filter drop-shadow" />
        </div>
        <h1 
          className="text-2xl sm:text-3xl font-black text-white tracking-tight drop-shadow-md"
          style={{ color: '#ffffff' }}
        >
          S &amp; K Enterprises
        </h1>
        <p 
          className="text-xs font-bold text-blue-400 tracking-[0.2em] uppercase mt-1.5"
          style={{ color: '#60a5fa' }}
        >
          Automotive &amp; Hardware ERP Suite
        </p>
      </div>

      {/* Main card */}
      <div 
        className="w-full login-card rounded-2xl p-7 sm:p-8 relative overflow-hidden backdrop-blur-xl border"
        style={{ 
          backgroundColor: '#131d36', 
          borderColor: '#263558', 
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5), 0 0 25px rgba(37,99,235,0.08)' 
        }}
      >
        {/* Subtle top card glow line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />

        {/* Loading overlay */}
        {isLoading && (
          <div 
            className="absolute inset-0 backdrop-blur-sm flex items-center justify-center z-50"
            style={{ backgroundColor: 'rgba(15, 23, 42, 0.85)' }}
          >
            <div className="w-10 h-10 border-4 border-slate-600 border-t-blue-500 rounded-full animate-spin"></div>
          </div>
        )}

        <form className="space-y-5" onSubmit={handleSubmit} autoComplete="off">
          {/* EMAIL */}
          <div>
            <label 
              className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5"
              style={{ color: '#cbd5e1' }}
            >
              Email Address
            </label>
            <input
              type="email"
              name="email"
              placeholder="name@company.com"
              disabled={isLoading}
              value={formData.email}
              onChange={handleChange}
              autoComplete="off"
              style={{ 
                backgroundColor: '#0b1120', 
                borderColor: fieldErrors.email ? '#ef4444' : '#263558', 
                color: '#ffffff' 
              }}
              className={`w-full px-4 py-3 rounded-xl border text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                fieldErrors.email ? "ring-2 ring-red-500 border-transparent" : "border-[#263558]"
              }`}
            />
            {fieldErrors.email && (
              <p className="text-red-400 text-xs mt-1.5 font-medium">{fieldErrors.email}</p>
            )}
          </div>

          {/* PASSWORD WITH SHOW/HIDE */}
          <div>
            <label 
              className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5"
              style={{ color: '#cbd5e1' }}
            >
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="••••••••"
                disabled={isLoading}
                value={formData.password}
                onChange={handleChange}
                autoComplete="new-password"
                style={{ 
                  backgroundColor: '#0b1120', 
                  borderColor: fieldErrors.password ? '#ef4444' : '#263558', 
                  color: '#ffffff' 
                }}
                className={`w-full px-4 pr-12 py-3 rounded-xl border text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                  fieldErrors.password ? "ring-2 ring-red-500 border-transparent" : "border-[#263558]"
                }`}
              />

              {/* Eye Icon Inside Input */}
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                style={{ color: '#94a3b8' }}
              >
                {showPassword ? (
                  <EyeSlashIcon className="w-5 h-5" />
                ) : (
                  <EyeIcon className="w-5 h-5" />
                )}
              </button>
            </div>
            {fieldErrors.password && (
              <p className="text-red-400 text-xs mt-1.5 font-medium">{fieldErrors.password}</p>
            )}
          </div>

          {/* SUBMIT BUTTON */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-600/30 active:scale-[0.99] mt-2 tracking-wide text-sm"
            style={{ color: '#ffffff' }}
          >
            Sign In
          </button>
        </form>
      </div>

      {/* Developer attribution */}
      <div 
        className="mt-8 text-center text-xs text-slate-500 select-none font-medium"
        style={{ color: '#64748b' }}
      >
        Designed &amp; Developed by{" "}
        <span 
          className="text-slate-400 font-semibold hover:text-blue-400 transition-colors"
          style={{ color: '#94a3b8' }}
        >
          500 Labs
        </span>
      </div>
    </div>
  );
};

export default LoginForm;
