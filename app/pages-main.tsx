import React from "react";
import { createRoot } from "react-dom/client";
import { CoachApp } from "./components/CoachApp";
import "./globals.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <CoachApp />
  </React.StrictMode>,
);
