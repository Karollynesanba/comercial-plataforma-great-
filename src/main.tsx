import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { seedLocalCommercialBackup } from "./lib/localBackupBootstrap";

const rootElement = document.getElementById("root");

async function bootstrap() {
  try {
    await seedLocalCommercialBackup();
  } catch (error) {
    console.warn('Não foi possível carregar o backup local no localhost.', error);
  }

  if (rootElement) {
    createRoot(rootElement).render(<App />);
  }
}

void bootstrap();
