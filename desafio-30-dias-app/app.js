const root = document.documentElement;
const canvas = document.getElementById('networkCanvas');
const ctx = canvas.getContext('2d');
let particles = [];

const caseData = {
  scale: [
    ['Papel', 'Escalar sem perder leitura de margem'],
    ['Alavanca', 'Campanhas, criativos, oferta e rotina de decisão'],
    ['Resultado', 'Operação com faturamento milionário e controle de indicadores'],
  ],
  zero: [
    ['Papel', 'Construir tração em uma loja sem histórico'],
    ['Alavanca', 'Oferta, página, criativos e primeiros públicos'],
    ['Resultado', 'Primeiras vendas previsíveis e base para escala'],
  ],
  profit: [
    ['Papel', 'Virar uma operação deficitária'],
    ['Alavanca', 'Precificação, CPA, mix, ticket médio e retenção'],
    ['Resultado', 'Foco em margem positiva, não só volume de receita'],
  ],
};

function resizeCanvas() {
  canvas.width = innerWidth * devicePixelRatio;
  canvas.height = innerHeight * devicePixelRatio;
  ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  particles = Array.from({ length: Math.min(80, Math.floor(innerWidth / 18)) }, () => ({
    x: Math.random() * innerWidth,
    y: Math.random() * innerHeight,
    vx: (Math.random() - 0.5) * 0.45,
    vy: (Math.random() - 0.5) * 0.45,
  }));
}

function drawNetwork() {
  ctx.clearRect(0, 0, innerWidth, innerHeight);
  particles.forEach((p, index) => {
    p.x += p.vx; p.y += p.vy;
    if (p.x < 0 || p.x > innerWidth) p.vx *= -1;
    if (p.y < 0 || p.y > innerHeight) p.vy *= -1;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 1.7, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(101,244,182,.65)';
    ctx.fill();
    particles.slice(index + 1).forEach(other => {
      const distance = Math.hypot(p.x - other.x, p.y - other.y);
      if (distance < 130) {
        ctx.strokeStyle = `rgba(122,167,255,${(130 - distance) / 520})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(other.x, other.y);
        ctx.stroke();
      }
    });
  });
  requestAnimationFrame(drawNetwork);
}

function formatMetric(value) {
  if (value >= 1000000) return 'R$ 1M+';
  if (value >= 100000) return 'R$ 100k+';
  if (value === 360) return '360°';
  return '0 → vendas';
}

function animateCounters() {
  document.querySelectorAll('[data-count]').forEach(el => {
    const target = Number(el.dataset.count);
    let progress = 0;
    const timer = setInterval(() => {
      progress += 0.045;
      if (progress >= 1) { progress = 1; clearInterval(timer); }
      el.textContent = progress === 1 ? formatMetric(target) : Math.round(target * progress).toLocaleString('pt-BR');
    }, 24);
  });
}

function showCase(key = 'scale') {
  document.getElementById('caseDetail').innerHTML = caseData[key].map(([title, text]) => `
    <article><strong>${title}</strong><p>${text}</p></article>
  `).join('');
}

document.addEventListener('pointermove', event => {
  root.style.setProperty('--mx', `${event.clientX}px`);
  root.style.setProperty('--my', `${event.clientY}px`);
  const card = document.querySelector('.command-card');
  if (!card) return;
  const rect = card.getBoundingClientRect();
  const rotateY = ((event.clientX - rect.left) / rect.width - 0.5) * 8;
  const rotateX = -((event.clientY - rect.top) / rect.height - 0.5) * 8;
  card.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
});

document.getElementById('themeToggle').addEventListener('click', () => root.classList.toggle('light'));
document.querySelectorAll('.case-card').forEach(card => card.addEventListener('click', () => showCase(card.dataset.case)));
document.getElementById('contactForm').addEventListener('submit', event => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  document.getElementById('formFeedback').textContent = `${data.get('name')}, sua mensagem de diagnóstico foi preparada. Conecte este formulário ao WhatsApp, CRM ou e-mail.`;
});

const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) entry.target.classList.add('visible');
  });
}, { threshold: 0.14 });
document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

resizeCanvas();
drawNetwork();
showCase();
animateCounters();
addEventListener('resize', resizeCanvas);
