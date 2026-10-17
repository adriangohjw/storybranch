interface Particle {
  color: string;
  rotation: number;
  size: number;
  spin: number;
  vx: number;
  vy: number;
  x: number;
  y: number;
}

export function fireReviewDemoConfetti(container: HTMLElement): void {
  const rect = container.getBoundingClientRect();

  if (rect.width === 0 || rect.height === 0) {
    return;
  }

  const canvas = document.createElement("canvas");
  const dpr = Math.min(window.devicePixelRatio, 2);

  canvas.width = Math.floor(rect.width * dpr);
  canvas.height = Math.floor(rect.height * dpr);
  canvas.className = "pointer-events-none absolute inset-0 z-20 size-full";
  container.appendChild(canvas);

  const ctx = canvas.getContext("2d");

  if (ctx === null) {
    canvas.remove();
    return;
  }

  ctx.scale(dpr, dpr);

  const colors = ["#34d399", "#38bdf8", "#fbbf24", "#a78bfa", "#f472b6", "#fb7185"];
  const particles: Particle[] = [];
  const originX = rect.width / 2;
  const originY = rect.height * 0.42;

  for (let index = 0; index < 140; index += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 3 + Math.random() * 7;

    particles.push({
      color: colors[Math.floor(Math.random() * colors.length)] ?? colors[0]!,
      rotation: Math.random() * Math.PI,
      size: 5 + Math.random() * 5,
      spin: (Math.random() - 0.5) * 0.25,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 5,
      x: originX,
      y: originY,
    });
  }

  let frame = 0;
  const maxFrames = 100;

  const tick = (): void => {
    frame += 1;
    ctx.clearRect(0, 0, rect.width, rect.height);

    for (const particle of particles) {
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.vy += 0.18;
      particle.vx *= 0.99;
      particle.rotation += particle.spin;

      ctx.save();
      ctx.translate(particle.x, particle.y);
      ctx.rotate(particle.rotation);
      ctx.fillStyle = particle.color;
      ctx.fillRect(
        -particle.size / 2,
        -particle.size / 4,
        particle.size,
        particle.size / 2
      );
      ctx.restore();
    }

    if (frame < maxFrames) {
      requestAnimationFrame(tick);
    } else {
      canvas.remove();
    }
  };

  requestAnimationFrame(tick);
}
