import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import LoginPage from './LoginPage.jsx'

function Root() {
  const [auth, setAuth] = useState(() => {
    const token = localStorage.getItem("relatech:token");
    return !!token;
  });

  if (!auth) {
    return <LoginPage onLogin={() => setAuth(true)} />;
  }

  return <App onLogout={() => {
    localStorage.removeItem("relatech:token");
    localStorage.removeItem("relatech:user");
    setAuth(false);
  }} />;
}

createRoot(document.getElementById('root')).render(
  <Root />
)