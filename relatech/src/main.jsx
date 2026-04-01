import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import LoginPage from './LoginPage.jsx'

function Root() {
  const [auth, setAuth] = useState(() => {
    const token = localStorage.getItem("relatech:token");
    console.log(">>> Token no Root:", token);
    console.log(">>> Auth:", !!token);
    return !!token;
  });

  console.log(">>> Renderizando Root, auth =", auth);

  if (!auth) {
    console.log(">>> Mostrando LoginPage");
    return <LoginPage onLogin={() => setAuth(true)} />;
  }

  console.log(">>> Mostrando App");
  return <App onLogout={() => {
    localStorage.removeItem("relatech:token");
    localStorage.removeItem("relatech:user");
    setAuth(false);
  }} />;
}