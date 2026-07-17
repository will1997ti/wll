# WLL — Portfólio Online

O portfólio novo e separado está em [`portfolio-online/`](./portfolio-online/). O app antigo/experimental `desafio-30-dias-app/` foi preservado sem ser transformado no portfólio.

## Visualizar localmente

> Importante: `127.0.0.1:4173` só funciona enquanto um servidor local estiver rodando. Se aparecer `ERR_CONNECTION_REFUSED`, execute um dos comandos abaixo e deixe o terminal aberto.

Opção mais simples, servindo a raiz do repositório:

```bash
python3 -m http.server 4173
```

Depois abra:

```text
http://127.0.0.1:4173/
```

A raiz redireciona automaticamente para `portfolio-online/`.

Também dá para servir diretamente a pasta do portfólio:

```bash
python3 -m http.server 4173 --directory portfolio-online
```

Depois abra:

```text
http://127.0.0.1:4173/
```

## Atalho com npm

```bash
npm start
```

Depois abra `http://127.0.0.1:4173/`.
