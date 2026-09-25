import type { ReactElement } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import { ErrorBoundary } from "./components/ErrorBoundary";
import CapturePage from "./routes/CapturePage";
import LandingPage from "./routes/LandingPage";
import LoginPage from "./routes/LoginPage";
import QuizPage from "./routes/QuizPage";
import ResultsPage from "./routes/ResultsPage";
import StudyPage from "./routes/StudyPage";

function guarded(node: ReactElement): ReactElement {
  return <ErrorBoundary>{node}</ErrorBoundary>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={guarded(<LandingPage />)} />
      <Route path="/landing" element={<Navigate to="/" replace />} />
      <Route path="/login" element={guarded(<LoginPage />)} />
      <Route path="/app" element={guarded(<CapturePage />)} />
      <Route path="/study/:id" element={guarded(<StudyPage />)} />
      <Route path="/quiz/:id" element={guarded(<QuizPage />)} />
      <Route path="/results/:attemptId" element={guarded(<ResultsPage />)} />
    </Routes>
  );
}
