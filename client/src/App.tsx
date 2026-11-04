import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { lazy, Suspense } from "react";
import { Redirect, Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import { trpc } from "./lib/trpc";
import { FEATURES } from "@shared/const";

// Everything but the landing page loads on demand (smaller first download).
const Admin = lazy(() => import("./pages/Admin"));
const Anslagstavla = lazy(() => import("./pages/Anslagstavla"));
const Kontakt = lazy(() => import("./pages/Kontakt"));
const Login = lazy(() => import("./pages/Login"));
const Profil = lazy(() => import("./pages/Profil"));
const Bilbingo = lazy(() => import("./pages/Bilbingo"));
const Dokument = lazy(() => import("./pages/Dokument"));
const Konto = lazy(() => import("./pages/Konto"));
const Arbetsdagar = lazy(() => import("./pages/Arbetsdagar"));
const Notiser = lazy(() => import("./pages/Notiser"));
const LagFamiljer = lazy(() => import("./pages/LagFamiljer"));
const Skidspar = lazy(() => import("./pages/Skidspar"));
const Sponsorer = lazy(() => import("./pages/Sponsorer"));


function SeasonHome() {
  // The landing page follows the active season: summer shows Bilbingo,
  // winter shows the hockey rink status page. Both remain reachable via nav.
  const seasonQuery = trpc.settings.getSeason.useQuery();
  if (FEATURES.bilbingo && seasonQuery.data?.season === "sommar") return <Bilbingo />;
  return <Home />;
}

function Router() {
  return (
    <Suspense fallback={<div className="min-h-screen" aria-busy="true" />}>
    <Switch>
      <Route path="/" component={SeasonHome} />
      <Route path="/skidspar" component={Skidspar} />
      {FEATURES.bilbingo && <Route path="/bilbingo" component={Bilbingo} />}
      <Route path="/dokument" component={Dokument} />
      {FEATURES.bilbingo && <Route path="/lag/:token" component={LagFamiljer} />}
      {/* Old pages now live as tabs in the Rinken hub. */}
      <Route path="/schema"><Redirect to="/?flik=jour" replace /></Route>
      <Route path="/boka"><Redirect to="/?flik=boka" replace /></Route>
      <Route path="/info"><Redirect to="/?flik=info" replace /></Route>
      <Route path="/funktionar"><Redirect to="/?flik=jour" replace /></Route>
      <Route path="/anslagstavla" component={Anslagstavla} />
      <Route path="/kontakt" component={Kontakt} />
      <Route path="/login" component={Login} />
      <Route path="/konto/:token" component={Konto} />
      <Route path="/profil" component={Profil} />
      <Route path="/admin" component={Admin} />
      <Route path="/arbetsdagar" component={Arbetsdagar} />
      <Route path="/notiser" component={Notiser} />
      <Route path="/sponsorer" component={Sponsorer} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster position="top-center" />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
