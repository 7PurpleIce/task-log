import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";
import { installDiagnostics } from "./diagnostics";
import { DiagnosticBoundary } from "./components/Diagnostics";

installDiagnostics();

createRoot(document.getElementById("root")).render(<DiagnosticBoundary><App /></DiagnosticBoundary>);