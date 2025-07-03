import React from "react";
import ReactDOM from "react-dom/client";
import Welcome from "@/pages/Welcome";
import About from "@/pages/About";
import App from "@/App";
import Settings from "@/components/Settings";
import { Workspace } from "@/pages/Workspace";
import { CreateProject } from "@/components/CreateProject";
import KnowledgeStore from "./components/KnowledgeStore";

import { BrowserRouter, Routes, Route } from "react-router-dom";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Welcome />} />
          <Route path="/About" element={<About />} />
          <Route path="/Workspace" element={<Workspace />} />
          <Route path="/Settings" element={<Settings />} />
          <Route path="/CreateProject" element={<CreateProject />} />
          <Route path="/KnowledgeStore" element={<KnowledgeStore />} />
        </Routes>
      </BrowserRouter>
    </App>
  </React.StrictMode>
);
