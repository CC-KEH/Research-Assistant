import { ThemeProvider } from "@/components/small/ThemeProvider";
import "./App.css";

function App({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <div className="h-full w-full overflow-hidden">{children}</div>
      {/* <div className="h-screen w-screen overflow-hidden">{children}</div> */}
    </ThemeProvider>
  );
}

export default App;
