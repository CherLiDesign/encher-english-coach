import React from "react";
import { createRoot } from "react-dom/client";
import { CoachApp } from "./components/CoachApp";
import { AuthGate } from "./components/AuthGate";
import { registerPwa } from "./lib/pwa";
import "./globals.css";

registerPwa();

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthGate>{(user, signOut) => <CoachApp user={user} onSignOut={signOut} />}</AuthGate>
  </React.StrictMode>,
);
