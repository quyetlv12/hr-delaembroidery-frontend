import { Toaster } from "sonner";

import { AppRouter } from "./routes/AppRouter";

export function App() {
  return (
    <>
      <AppRouter />
      <Toaster closeButton richColors duration={4000} position="top-right" />
    </>
  );
}
