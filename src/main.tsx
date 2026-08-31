import React from "react";
import ReactDOM from "react-dom/client";
import "./utils/fetchInterceptor";
import App from "./App";

const tw = document.createElement("script");
tw.src = "https://cdn.tailwindcss.com";

tw.onload = () => {
  ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
};

document.head.appendChild(tw);
