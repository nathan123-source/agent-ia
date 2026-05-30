# Deploy no Railway — Passo a Passo

## Pré-requisitos
- Conta no GitHub (gratuita): https://github.com
- Conta no Railway (gratuita): https://railway.com
- Chave da API do Groq (gratuita): https://console.groq.com

---

## Passo 1 — Subir o código no GitHub

1. Acesse https://github.com/new e crie um repositório novo (pode ser privado)
2. No terminal, dentro da pasta do projeto, rode:

```bash
git add .
git commit -m "Preparar para deploy no Railway"
git remote add origin https://github.com/SEU_USUARIO/SEU_REPOSITORIO.git
git push -u origin main
```

---

## Passo 2 — Criar o banco de dados no Railway

1. Acesse https://railway.com e faça login
2. Clique em **New Project**
3. Clique em **Add a service** → **Database** → **PostgreSQL**
4. Aguarde criar. Clique no banco criado e vá em **Variables**
5. Copie o valor de **DATABASE_URL** (vai precisar no próximo passo)

---

## Passo 3 — Criar o serviço da aplicação

1. No mesmo projeto, clique em **Add a service** → **GitHub Repo**
2. Conecte sua conta GitHub e selecione o repositório
3. O Railway vai detectar o `nixpacks.toml` automaticamente

---

## Passo 4 — Configurar as variáveis de ambiente

No serviço da aplicação, vá em **Variables** e adicione:

| Variável | Valor |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | `8080` |
| `DATABASE_URL` | (cole o valor copiado no Passo 2) |
| `GROQ_API_KEY` | (sua chave do Groq) |

---

## Passo 5 — Fazer o deploy

1. Vá em **Settings** → **Networking** → **Generate Domain**
2. O Railway vai gerar uma URL pública tipo `seu-app.up.railway.app`
3. Clique em **Deploy** (ou ele já vai iniciar automaticamente)
4. Aguarde o build terminar (~3-5 minutos)

---

## Pronto!

Seu site vai estar disponível 24/7 na URL gerada pelo Railway.
Sempre que você fizer `git push`, o Railway vai atualizar automaticamente.
