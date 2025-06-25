import React from "react";
import ReactDOM from "react-dom/client";
import Welcome from "@/pages/Welcome";
import About from "@/pages/About";
import App from "@/App";
import { Workspace } from "@/pages/Workspace";

import { BrowserRouter, Routes, Route } from "react-router-dom";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Welcome />} />
          <Route path="/About" element={<About />} />
          <Route path="/Workspace" element={<Workspace />} />
        </Routes>
      </BrowserRouter>
    </App>
  </React.StrictMode>
);
