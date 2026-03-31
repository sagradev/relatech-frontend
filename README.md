# 🎫 RelaTech — Frontend

Interface web para montar e preencher máscaras de atendimento de suporte técnico.

## ✨ Funcionalidades

- Autenticação com login e cadastro
- Máscaras salvas por usuário no banco de dados
- Criação, edição e exclusão de máscaras personalizadas
- Campos do tipo texto, área de texto e seleção
- Preview em tempo real do relato gerado
- Botão de copiar com feedback visual
- Histórico dos últimos 3 relatos copiados
- Contador de atendimentos do dia
- Layout responsivo para desktop e mobile

## 🛠️ Tecnologias

- React 19
- Vite
- JWT para autenticação
- Spring Boot 3.5 (backend)
- PostgreSQL (banco de dados)

## 🚀 Como rodar localmente

### Pré-requisitos
- Node.js 18+
- Backend rodando ([relatech-backend](link-do-repo-backend))

### Instalação
```bash
git clone https://github.com/seu-usuario/relatech-frontend.git
cd relatech-frontend
npm install
echo "VITE_API_URL=http://localhost:8080/api" > .env
npm run dev
```

## 🌐 Deploy

- Frontend: [relatech.vercel.app](https://relatech.vercel.app)
- Backend: Railway