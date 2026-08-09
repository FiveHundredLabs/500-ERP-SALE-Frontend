import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import { ShieldCheck } from "lucide-react";

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
      <div className="text-center mb-8 flex flex-col items-center select-none">
        <div className="w-12 h-12 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center mb-3.5 shadow-lg shadow-blue-500/10">
          <ShieldCheck size={26} />
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">
          500Core
        </h1>
        <p className="text-xs font-semibold text-slate-400 tracking-wider uppercase mt-1">
          Business Management & ERP Platform
        </p>
      </div>

      {/* Main card */}
      <div className="w-full bg-[#1e293b] border border-[#334155] rounded-2xl shadow-2xl p-8 relative overflow-hidden">
        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-[#1e293b]/70 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="w-10 h-10 border-4 border-slate-600 border-t-blue-500 rounded-full animate-spin"></div>
          </div>
        )}

        <form className="space-y-5" onSubmit={handleSubmit}>
          {/* EMAIL */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              name="email"
              placeholder="name@company.com"
              disabled={isLoading}
              value={formData.email}
              onChange={handleChange}
              className={`w-full px-4 py-3 rounded-xl bg-[#0f172a] border border-[#334155] text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                fieldErrors.email ? "ring-2 ring-red-500 border-transparent" : ""
              }`}
            />
            {fieldErrors.email && (
              <p className="text-red-400 text-xs mt-1.5">{fieldErrors.email}</p>
            )}
          </div>

          {/* PASSWORD WITH SHOW/HIDE */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
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
                className={`w-full px-4 pr-12 py-3 rounded-xl bg-[#0f172a] border border-[#334155] text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                  fieldErrors.password ? "ring-2 ring-red-500 border-transparent" : ""
                }`}
              />

              {/* Eye Icon Inside Input */}
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
              >
                {showPassword ? (
                  <EyeSlashIcon className="w-5 h-5" />
                ) : (
                  <EyeIcon className="w-5 h-5" />
                )}
              </button>
            </div>
            {fieldErrors.password && (
              <p className="text-red-400 text-xs mt-1.5">{fieldErrors.password}</p>
            )}
          </div>

          {/* SUBMIT BUTTON */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all disabled:bg-blue-500/50 disabled:cursor-not-allowed shadow-lg shadow-blue-600/20 mt-2"
          >
            Sign In
          </button>
        </form>
      </div>

      {/* Developer attribution */}
      <div className="mt-8 text-center text-xs text-slate-500 select-none font-medium">
        Designed & Developed by{" "}
        <span className="text-slate-400 font-semibold hover:text-blue-400 transition-colors">
          500 Labs
        </span>
      </div>
    </div>
  );
};

export default LoginForm;
