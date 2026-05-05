// import React from "react";
// import App from "@/App";
// import ReactDOM from "react-dom/client";

// import { BrowserRouter } from "react-router-dom";

// ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
//   <React.StrictMode>
//     <BrowserRouter>
//       <App />
//     </BrowserRouter>
//   </React.StrictMode>,
// );
import React from "react";
import App from "@/App";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom"; // ← swap this

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <HashRouter>
      {" "}
      <App />
    </HashRouter>
  </React.StrictMode>,
);
