# Desafio 30 Dias Sem Desculpa

App web instalável no celular para controlar check-ins, pontuação, ranking, dias livres e regras do desafio.

## O que tem

- Cadastro de participantes
- Check-in diário
- Pontuação automática
- Ranking geral
- Histórico com edição e exclusão
- Controle de dia livre
- Exportação CSV
- PWA com manifesto e service worker

## Regras principais

- Refrigerante comum não é permitido; refrigerante zero é permitido.
- Doces com açúcar não são permitidos.
- Itens proteicos, fit, saudáveis e zero açúcar são permitidos.
- Sucos não são permitidos como bebida livre.
- Cada participante tem 2 dias livres no mês.
- Meta de treino: 2 vezes por semana.
- Meta de água sugerida: 2 litros por dia.

## Como usar localmente

Abra o arquivo `index.html` no navegador.

## Como instalar no celular

Hospede a pasta em qualquer serviço estático com HTTPS, como GitHub Pages, Netlify, Vercel ou o próprio servidor do seu sistema. Depois abra o link no celular e escolha **Adicionar à tela inicial**.

## Observação

Os dados ficam salvos no navegador do aparelho usando `localStorage`. Para usar com várias pessoas em celulares diferentes com ranking sincronizado, será necessário conectar um banco de dados, como Firebase, Supabase ou Google Sheets.
