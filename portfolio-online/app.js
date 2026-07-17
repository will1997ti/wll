const root = document.documentElement;
const canvas = document.getElementById('growthCanvas');
const ctx = canvas.getContext('2d');
let nodes = [];

const cases = {
  milhao: {
    metric: 'R$ 1M+',
    title: 'Conta milionária com rotina de escala',
    summary: 'Estrutura para crescer com controle: leitura de margem, criativos, campanhas, funil e decisão semanal baseada em dados.',
    bullets: ['Mapeamento de gargalos de mídia e loja', 'Rotina de testes para criativos e ofertas', 'Dashboard para acompanhar faturamento, CPA, ROAS e margem'],
  },
  zero: {
    metric: '0 → vendas',
    title: 'Operações que saíram do zero',
    summary: 'Construção da base comercial para validar oferta, público, página, checkout e primeiros ciclos de aquisição.',
    bullets: ['Validação de posicionamento e proposta', 'Primeiras campanhas com aprendizado rápido', 'Ajustes de página para converter tráfego frio'],
  },
  cemmil: {
    metric: 'R$ 100k+',
    title: 'Lojas acima de R$ 100 mil por mês',
    summary: 'Acompanhamento para organizar escala, previsibilidade e gestão de indicadores em operações que já têm tração.',
    bullets: ['Segmentação de campanhas por etapa do funil', 'Controle de ticket, mix e recompra', 'Planejamento de campanhas promocionais e sazonais'],
  },
  lucro: {
    metric: 'Lucro',
    title: 'Virada de prejuízo para margem positiva',
    summary: 'Correção de rota para parar de comprar faturamento caro e voltar a olhar caixa, margem e eficiência operacional.',
    bullets: ['Revisão de precificação e custos variáveis', 'Corte de desperdício em campanhas', 'Plano de retenção para aumentar LTV'],
  },
};

function resize() {
  canvas.width = innerWidth * devicePixelRatio;
  canvas.height = innerHeight * devicePixelRatio;
  ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  nodes = Array.from({ length: Math.min(90, Math.floor(innerWidth / 16)) }, () => ({
    x: Math.random() * innerWidth,
    y: Math.random() * innerHeight,
    vx: (Math.random() - 0.5) * 0.38,
    vy: (Math.random() - 0.5) * 0.38,
  }));
}

function draw() {
  ctx.clearRect(0, 0, innerWidth, innerHeight);
  nodes.forEach((node, index) => {
    node.x += node.vx;
    node.y += node.vy;
    if (node.x < 0 || node.x > innerWidth) node.vx *= -1;
    if (node.y < 0 || node.y > innerHeight) node.vy *= -1;
    ctx.fillStyle = 'rgba(99,245,184,.68)';
    ctx.beginPath();
    ctx.arc(node.x, node.y, 1.8, 0, Math.PI * 2);
    ctx.fill();
    nodes.slice(index + 1).forEach(other => {
      const distance = Math.hypot(node.x - other.x, node.y - other.y);
      if (distance < 125) {
        ctx.strokeStyle = `rgba(132,168,255,${(125 - distance) / 500})`;
        ctx.beginPath();
        ctx.moveTo(node.x, node.y);
        ctx.lineTo(other.x, other.y);
        ctx.stroke();
      }
    });
  });
  requestAnimationFrame(draw);
}

function renderCase(key) {
  const item = cases[key];
  document.querySelectorAll('[data-case]').forEach(button => button.classList.toggle('active', button.dataset.case === key));
  document.getElementById('caseOutput').innerHTML = `
    <article>
      <p class="kicker">Resultado</p>
      <div class="case-number">${item.metric}</div>
      <h3>${item.title}</h3>
    </article>
    <article>
      <p>${item.summary}</p>
      <ul>${item.bullets.map(bullet => `<li>${bullet}</li>`).join('')}</ul>
    </article>
  `;
}

function metricLabel(value) {
  if (value >= 1000000) return 'R$ 1M+';
  if (value >= 100000) return 'R$ 100k+';
  if (value === 360) return '360°';
  return '0 → vendas';
}

function animateCounters() {
  document.querySelectorAll('[data-counter]').forEach(element => {
    const target = Number(element.dataset.counter);
    let progress = 0;
    const timer = setInterval(() => {
      progress += 0.04;
      if (progress >= 1) {
        progress = 1;
        clearInterval(timer);
      }
      element.textContent = progress === 1 ? metricLabel(target) : Math.round(target * progress).toLocaleString('pt-BR');
    }, 22);
  });
}

const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) entry.target.classList.add('visible');
  });
}, { threshold: 0.12 });

document.querySelectorAll('.reveal').forEach(element => observer.observe(element));
document.querySelectorAll('[data-case]').forEach(button => button.addEventListener('click', () => renderCase(button.dataset.case)));
document.getElementById('themeToggle').addEventListener('click', () => root.classList.toggle('light'));
document.getElementById('contactForm').addEventListener('submit', event => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  document.getElementById('formResult').textContent = `${data.get('name')}, agora é só conectar este formulário ao WhatsApp, CRM ou e-mail.`;
});

resize();
draw();
renderCase('milhao');
animateCounters();
addEventListener('resize', resize);
