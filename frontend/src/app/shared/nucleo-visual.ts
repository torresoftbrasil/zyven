interface Particula {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  inicio: number; vida: number; tamanho: number;
}

export class NucleoVisual {
  private readonly contexto: CanvasRenderingContext2D;
  private readonly movimentoReduzido = window.matchMedia('(prefers-reduced-motion: reduce)');
  private readonly observador: ResizeObserver;
  private readonly particulas: Particula[] = [];
  private quadro = 0;
  private tamanho = 0;
  private escala = 1;

  constructor(private readonly canvas: HTMLCanvasElement) {
    const contexto = canvas.getContext('2d', { alpha: true });
    if (!contexto) throw new Error('Canvas indisponível');
    this.contexto = contexto;
    this.observador = new ResizeObserver(() => this.redimensionar());
    this.observador.observe(canvas);
    this.redimensionar();
    this.quadro = requestAnimationFrame(tempo => this.desenhar(tempo));
  }

  disparar(clientX: number, clientY: number): void {
    if (this.movimentoReduzido.matches) return;
    const area = this.canvas.getBoundingClientRect();
    const x = clientX - area.left - area.width / 2;
    const y = clientY - area.top - area.height / 2;
    const agora = performance.now();
    for (let indice = 0; indice < 78; indice++) {
      const angulo = Math.random() * Math.PI * 2;
      const elevacao = Math.asin(Math.random() * 2 - 1);
      const velocidade = (this.tamanho * .18 + Math.random() * this.tamanho * .36) / 1.7;
      this.particulas.push({
        x, y, z: 0,
        vx: Math.cos(angulo) * Math.cos(elevacao) * velocidade,
        vy: Math.sin(angulo) * Math.cos(elevacao) * velocidade,
        vz: Math.sin(elevacao) * velocidade * 1.8,
        inicio: agora + Math.random() * 160,
        vida: 1100 + Math.random() * 900,
        tamanho: .7 + Math.random() * 2.1,
      });
    }
  }

  destruir(): void {
    cancelAnimationFrame(this.quadro);
    this.observador.disconnect();
    this.particulas.length = 0;
  }

  private redimensionar(): void {
    const area = this.canvas.getBoundingClientRect();
    this.tamanho = Math.max(1, Math.min(area.width, area.height));
    this.escala = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(area.width * this.escala);
    this.canvas.height = Math.round(area.height * this.escala);
    this.contexto.setTransform(this.escala, 0, 0, this.escala, 0, 0);
  }

  private desenhar(tempo: number): void {
    const ctx = this.contexto;
    const largura = this.canvas.width / this.escala;
    const altura = this.canvas.height / this.escala;
    const cx = largura / 2;
    const cy = altura / 2;
    const raio = this.tamanho * .315;
    ctx.clearRect(0, 0, largura, altura);
    this.desenharParticulas(tempo, cx, cy, false);
    this.desenharEsfera(cx, cy, raio, this.movimentoReduzido.matches ? 0 : tempo / 28000);
    this.desenharParticulas(tempo, cx, cy, true);
    if (!this.movimentoReduzido.matches || this.particulas.length) this.quadro = requestAnimationFrame(proximo => this.desenhar(proximo));
  }

  private desenharEsfera(cx: number, cy: number, raio: number, rotacao: number): void {
    const ctx = this.contexto;
    const halo = ctx.createRadialGradient(cx, cy, raio * .6, cx, cy, raio * 1.65);
    halo.addColorStop(0, '#3dd8ff13');
    halo.addColorStop(.65, '#2db6db0b');
    halo.addColorStop(1, '#2db6db00');
    ctx.fillStyle = halo;
    ctx.beginPath(); ctx.arc(cx, cy, raio * 1.65, 0, Math.PI * 2); ctx.fill();

    const superficie = ctx.createRadialGradient(cx - raio * .36, cy - raio * .42, raio * .04, cx + raio * .18, cy + raio * .1, raio * 1.18);
    superficie.addColorStop(0, '#36778a');
    superficie.addColorStop(.22, '#174456');
    superficie.addColorStop(.58, '#0a2633');
    superficie.addColorStop(.84, '#06141e');
    superficie.addColorStop(1, '#02080d');
    ctx.fillStyle = superficie;
    ctx.beginPath(); ctx.arc(cx, cy, raio, 0, Math.PI * 2); ctx.fill();

    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, raio - 1, 0, Math.PI * 2); ctx.clip();
    for (const latitude of [-.64, -.26, .12, .5]) this.desenharLatitude(cx, cy, raio, latitude, rotacao);
    const brilho = ctx.createRadialGradient(cx - raio * .48, cy - raio * .5, 0, cx - raio * .38, cy - raio * .39, raio * .76);
    brilho.addColorStop(0, '#b8f7ff28');
    brilho.addColorStop(.32, '#91ecff0b');
    brilho.addColorStop(1, '#91ecff00');
    ctx.fillStyle = brilho;
    ctx.fillRect(cx - raio, cy - raio, raio * 2, raio * 2);
    ctx.restore();

    ctx.strokeStyle = '#9beeff27';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx, cy, raio - .5, 0, Math.PI * 2); ctx.stroke();
  }

  private desenharLatitude(cx: number, cy: number, raio: number, latitude: number, rotacao: number): void {
    const ctx = this.contexto;
    const inclinacao = -.32;
    ctx.beginPath();
    let desenhando = false;
    for (let passo = 0; passo <= 100; passo++) {
      const longitude = passo / 100 * Math.PI * 2 + rotacao;
      const x = Math.cos(latitude) * Math.cos(longitude);
      const y = Math.sin(latitude);
      const z = Math.cos(latitude) * Math.sin(longitude);
      const frente = y * Math.sin(inclinacao) + z * Math.cos(inclinacao);
      if (frente <= 0) { desenhando = false; continue; }
      const px = cx + x * raio;
      const py = cy + (y * Math.cos(inclinacao) - z * Math.sin(inclinacao)) * raio;
      if (desenhando) ctx.lineTo(px, py); else ctx.moveTo(px, py);
      desenhando = true;
    }
    ctx.strokeStyle = '#9aeaff17';
    ctx.lineWidth = .65;
    ctx.stroke();
  }

  private desenharParticulas(tempo: number, cx: number, cy: number, frente: boolean): void {
    const ctx = this.contexto;
    for (let indice = this.particulas.length - 1; indice >= 0; indice--) {
      const part = this.particulas[indice];
      const decorrido = tempo - part.inicio;
      if (decorrido < 0) continue;
      if (decorrido > part.vida) { this.particulas.splice(indice, 1); continue; }
      const t = decorrido / 1000;
      const z = part.z + part.vz * t;
      if ((z >= 0) !== frente) continue;
      const perspectiva = Math.max(.48, Math.min(2.25, 520 / (520 - z)));
      const x = cx + (part.x + part.vx * t) * perspectiva;
      const y = cy + (part.y + part.vy * t) * perspectiva;
      const anterior = Math.max(0, t - .065);
      const perspectivaAnterior = Math.max(.48, Math.min(2.25, 520 / (520 - part.vz * anterior)));
      const px = cx + (part.x + part.vx * anterior) * perspectivaAnterior;
      const py = cy + (part.y + part.vy * anterior) * perspectivaAnterior;
      const intensidade = Math.sin(Math.PI * Math.min(1, decorrido / part.vida));
      ctx.save();
      ctx.globalAlpha = intensidade * (frente ? .85 : .36);
      ctx.strokeStyle = '#9feeff';
      ctx.lineWidth = Math.max(.6, part.tamanho * perspectiva * .75);
      ctx.shadowColor = '#83e8ff'; ctx.shadowBlur = 10 * perspectiva;
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(x, y); ctx.stroke();
      ctx.fillStyle = '#e9fcff';
      ctx.beginPath(); ctx.arc(x, y, Math.max(.5, part.tamanho * perspectiva * .58), 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }
}
