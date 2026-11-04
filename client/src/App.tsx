import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Admin from "./pages/Admin";
import Anslagstavla from "./pages/Anslagstavla";
import Boka from "./pages/Boka";
import Home from "./pages/Home";
import Kontakt from "./pages/Kontakt";
import Login from "./pages/Login";
import Profil from "./pages/Profil";
import Bilbingo from "./pages/Bilbingo";
import Dokument from "./pages/Dokument";
import Funktionar from "./pages/Funktionar";
import Info from "./pages/Info";
import Konto from "./pages/Konto";
import Notiser from "./pages/Notiser";
import LagFamiljer from "./pages/LagFamiljer";
import Schema from "./pages/Schema";
import Skidspar from "./pages/Skidspar";
import { trpc } from "./lib/trpc";
import { FEATURES } from "@shared/const";

function SeasonHome() {
  // The landing page follows the active season: summer shows Bilbingo,
  // winter shows the hockey rink status page. Both remain reachable via nav.
  const seasonQuery = trpc.settings.getSeason.useQuery();
  if (FEATURES.bilbingo && seasonQuery.data?.season === "sommar") return <Bilbingo />;
  return <Home />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={SeasonHome} />
      <Route path="/skidspar" component={Skidspar} />
      {FEATURES.bilbingo && <Route path="/bilbingo" component={Bilbingo} />}
      <Route path="/dokument" component={Dokument} />
      {FEATURES.bilbingo && <Route path="/lag/:token" component={LagFamiljer} />}
      <Route path="/schema" component={Schema} />
      <Route path="/boka" component={Boka} />
      <Route path="/anslagstavla" component={Anslagstavla} />
      <Route path="/kontakt" component={Kontakt} />
      <Route path="/login" component={Login} />
      <Route path="/konto/:token" component={Konto} />
      <Route path="/profil" component={Profil} />
      <Route path="/admin" component={Admin} />
      <Route path="/funktionar" component={Funktionar} />
      <Route path="/info" component={Info} />
      <Route path="/notiser" component={Notiser} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
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
