import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import LoginPage from './LoginPage.jsx'

function Root() {
  const [token, setToken] = useState(() => localStorage.getItem("relatech:token"));

  if (!token) {
    return <LoginPage onLogin={(newToken) => setToken(newToken)} />;
  }

  return <App
    token={token}
    onLogout={() => {
      localStorage.removeItem("relatech:token");
      localStorage.removeItem("relatech:user");
      setToken(null);
    }}
  />;
}

createRoot(document.getElementById('root')).render(<Root />)