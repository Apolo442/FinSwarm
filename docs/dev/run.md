# Como rodar o FinSwarm

Dois terminais, nesta ordem:

## 1 — Backend (terminal 1)

```bash
cd ~/finswarm
poetry run uvicorn src.api:app --port 8000 --ws wsproto
```

API REST + WebSocket dos agentes. Roda em `http://localhost:8000`.  
**`--ws wsproto`** é obrigatório — sem ele o Chrome rejeita o WebSocket com 400.

## 2 — Frontend (terminal 2)

```bash
cd ~/finswarm/web
npm run dev
```

Interface React. Abre em `http://localhost:5173`.  
O Vite faz proxy de todas as chamadas de API para o backend, então os dois precisam estar rodando ao mesmo tempo.

---

**Antes de reiniciar**, verificar se há processo Vite pendurado:

```bash
pgrep -af vite   # se aparecer algo, matar com kill <pid>
```
