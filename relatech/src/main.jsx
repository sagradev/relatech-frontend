import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import LoginPage from './LoginPage.jsx'
import { isAuthenticated } from './services/authService.js'

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
import { useState } from 'react'
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)