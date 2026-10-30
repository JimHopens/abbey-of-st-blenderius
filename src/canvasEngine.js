// Abbey of St. Blenderius — Interactive Audiovisual Canvas Engine
// Inspired by Because-Recollection (vinyl scratching, inertial physics, fluid particles, vortex blenders)
import { abbeyAudio } from "./audio.js";

export class AbbeyCanvasEngine {
  constructor(canvasElement, onRpmChange = null) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext("2d");
    this.onRpmChange = onRpmChange;

    this.currentChapterId = 0;
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);

    // Images
    this.images = {
      monk: null,
      blender: null,
      seal: null,
    };
    this.loadImages();

    // Turntable / Disc State
    this.discRotation = 0;
    this.discVelocity = 0.003;
    this.isDragging = false;
    this.lastPointerAngle = 0;
    this.lastPointerDist = 0;
    this.pointerX = 0;
    this.pointerY = 0;
    this.prevPointerX = 0;
    this.prevPointerY = 0;

    // Blender (Chapter 2) State
    this.blenderRpm = 0;
    this.blenderAngle = 0;
    this.isHoldingBlender = false;

    // Agitator (Chapter 3) State
    this.agitatorAngle = 0;
    this.agitatorHeat = 0;
    this.sparks = [];

    // Mortar (Chapter 1) Particles
    this.mortarParticles = [];

    // Nectar (Chapter 4) Fluid points
    this.nectarRipples = [];

    // Seed Vault (Chapter 5) Seeds & Roots
    this.seeds = [];
    this.roots = [];

    // Mallet (Chapter 6) Strike
    this.malletProgress = 0;
    this.malletStriking = false;
    this.shockwaves = [];

    // Screen Shake
    this.shakeAmount = 0;

    // Ambient floating particles
    this.ambientParticles = [];
    this.initAmbientParticles();

    this.resize();
    window.addEventListener("resize", () => this.resize());
    this.setupEvents();

    this.rafId = requestAnimationFrame((t) => this.render(t));
  }

  loadImages() {
    const monkImg = new Image();
    monkImg.src = "/monk_persimmon.jpg";
    monkImg.onload = () => (this.images.monk = monkImg);

    const blenderImg = new Image();
    blenderImg.src = "/blender_relic.jpg";
    blenderImg.onload = () => (this.images.blender = blenderImg);

    const sealImg = new Image();
    sealImg.src = "/persimmon_seal.jpg";
    sealImg.onload = () => (this.images.seal = sealImg);
  }

  resize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    this.ctx.scale(this.dpr, this.dpr);
  }

  initAmbientParticles() {
    this.ambientParticles = [];
    for (let i = 0; i < 45; i++) {
      this.ambientParticles.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        radius: Math.random() * 2 + 0.5,
        vx: (Math.random() - 0.5) * 0.3,
        vy: -Math.random() * 0.4 - 0.1,
        alpha: Math.random() * 0.5 + 0.2,
        color: Math.random() > 0.4 ? "#c89d42" : "#e65100", // gold or persimmon
      });
    }
  }

  setChapter(chapterId) {
    this.currentChapterId = chapterId;
    this.isHoldingBlender = false;
    this.agitatorHeat = 0;
    this.shakeAmount = 0;
    abbeyAudio.stopBlender();
  }

  setupEvents() {
    const getPointer = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return {
        x: clientX - rect.left,
        y: clientY - rect.top,
      };
    };

    const onStart = (e) => {
      abbeyAudio.ensureRunning();
      const p = getPointer(e);
      this.isDragging = true;
      this.pointerX = p.x;
      this.pointerY = p.y;
      this.prevPointerX = p.x;
      this.prevPointerY = p.y;

      const centerX = this.width / 2;
      const centerY = this.height / 2;
      this.lastPointerAngle = Math.atan2(p.y - centerY, p.x - centerX);
      this.lastPointerDist = Math.hypot(p.x - centerX, p.y - centerY);

      if (this.currentChapterId === 2) {
        this.isHoldingBlender = true;
      } else if (this.currentChapterId === 5) {
        this.dropSeed(p.x, p.y);
      } else if (this.currentChapterId === 6) {
        this.triggerMalletStrike();
      }
    };

    const onMove = (e) => {
      if (!this.isDragging && e.type.startsWith("touch")) return;
      const p = getPointer(e);
      this.prevPointerX = this.pointerX;
      this.prevPointerY = this.pointerY;
      this.pointerX = p.x;
      this.pointerY = p.y;

      const centerX = this.width / 2;
      const centerY = this.height / 2;
      const currentAngle = Math.atan2(p.y - centerY, p.x - centerX);
      let deltaAngle = currentAngle - this.lastPointerAngle;

      if (deltaAngle > Math.PI) deltaAngle -= Math.PI * 2;
      if (deltaAngle < -Math.PI) deltaAngle += Math.PI * 2;

      if (this.isDragging) {
        this.discVelocity = deltaAngle * 0.8;
        this.discRotation += deltaAngle;
        this.lastPointerAngle = currentAngle;

        // Sound on rotation / scratch
        if (Math.abs(deltaAngle) > 0.04) {
          abbeyAudio.playScratch(Math.min(2.5, Math.abs(deltaAngle) * 20));
        }

        // Chapter 1: Stone Mortar Grinding
        if (this.currentChapterId === 1) {
          const dist = Math.hypot(p.x - centerX, p.y - centerY);
          if (dist < 180) {
            this.addMortarSquish(p.x, p.y);
            if (Math.random() < 0.25) abbeyAudio.playSquish();
          }
        }

        // Chapter 3: Crank Agitator
        if (this.currentChapterId === 3) {
          const dx = p.x - this.prevPointerX;
          const dy = p.y - this.prevPointerY;
          const speed = Math.hypot(dx, dy);
          if (speed > 4) {
            this.agitatorAngle += speed * 0.08;
            this.agitatorHeat = Math.min(100, this.agitatorHeat + speed * 0.12);
            this.addSparks(centerX, centerY, speed);
            if (Math.random() < 0.2) abbeyAudio.playClick(1.2);
          }
        }

        // Chapter 4: Nectar Fluid
        if (this.currentChapterId === 4) {
          this.addNectarRipple(p.x, p.y);
          if (Math.random() < 0.15) abbeyAudio.playSquish();
        }
      }
    };

    const onEnd = () => {
      this.isDragging = false;
      this.isHoldingBlender = false;
    };

    this.canvas.addEventListener("mousedown", onStart);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onEnd);

    this.canvas.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onEnd);

    // Keyboard Space support for Chapter 2 & 6
    window.addEventListener("keydown", (e) => {
      if (e.code === "Space" && !e.repeat) {
        if (this.currentChapterId === 2) {
          this.isHoldingBlender = true;
        } else if (this.currentChapterId === 6) {
          this.triggerMalletStrike();
        }
      }
    });

    window.addEventListener("keyup", (e) => {
      if (e.code === "Space") {
        if (this.currentChapterId === 2) {
          this.isHoldingBlender = false;
        }
      }
    });
  }

  // --- Chapter-specific Interactions ---

  addMortarSquish(x, y) {
    for (let i = 0; i < 4; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 4 + 1;
      this.mortarParticles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: Math.random() * 5 + 3,
        alpha: 1.0,
        decay: Math.random() * 0.02 + 0.015,
        color: Math.random() > 0.3 ? "#e65100" : "#ff9800",
      });
    }
  }

  addSparks(cx, cy, intensity) {
    for (let i = 0; i < 3; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (Math.random() * 5 + 2) * (intensity / 10);
      this.sparks.push({
        x: cx + (Math.random() - 0.5) * 80,
        y: cy + (Math.random() - 0.5) * 80,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 3 + 1,
        life: 1.0,
        decay: Math.random() * 0.05 + 0.03,
      });
    }
  }

  addNectarRipple(x, y) {
    this.nectarRipples.push({
      x: x,
      y: y,
      radius: 10,
      maxRadius: Math.random() * 60 + 40,
      alpha: 0.8,
      speed: Math.random() * 2 + 2,
    });
  }

  dropSeed(x, y) {
    abbeyAudio.playClick(0.7);
    this.seeds.push({
      x: x,
      y: y,
      vx: (Math.random() - 0.5) * 2,
      vy: Math.random() * 2 + 1,
      angle: Math.random() * Math.PI,
      va: (Math.random() - 0.5) * 0.1,
      targetY: Math.min(this.height - 120, y + Math.random() * 180 + 100),
      landed: false,
    });
  }

  triggerMalletStrike() {
    if (this.malletStriking) return;
    this.malletStriking = true;
    this.malletProgress = 0;

    // Mallet hits at halfway progress
    setTimeout(() => {
      abbeyAudio.playMallet();
      this.shakeAmount = 18;
      this.shockwaves.push({
        x: this.width / 2,
        y: this.height / 2 + 50,
        radius: 10,
        maxRadius: Math.min(this.width, this.height) * 0.6,
        alpha: 1.0,
      });
      // Spawn golden crushing sparks
      for (let i = 0; i < 35; i++) {
        const a = Math.random() * Math.PI * 2;
        const spd = Math.random() * 12 + 4;
        this.sparks.push({
          x: this.width / 2,
          y: this.height / 2 + 50,
          vx: Math.cos(a) * spd,
          vy: Math.sin(a) * spd - 3,
          size: Math.random() * 4 + 2,
          life: 1.0,
          decay: Math.random() * 0.03 + 0.015,
        });
      }
    }, 180);

    setTimeout(() => {
      this.malletStriking = false;
    }, 600);
  }

  // --- Main Render Loop ---

  render(timestamp) {
    this.rafId = requestAnimationFrame((t) => this.render(t));

    // Handle Screen Shake
    let shakeX = 0;
    let shakeY = 0;
    if (this.shakeAmount > 0.1) {
      shakeX = (Math.random() - 0.5) * this.shakeAmount;
      shakeY = (Math.random() - 0.5) * this.shakeAmount;
      this.shakeAmount *= 0.9;
    }

    this.ctx.save();
    this.ctx.translate(shakeX, shakeY);

    // Deep Charcoal / Dark Abbey Backdrop
    this.ctx.fillStyle = "#0c0d10";
    this.ctx.fillRect(-20, -20, this.width + 40, this.height + 40);

    // Render Ambient Particles
    this.renderAmbientParticles();

    // Inertial Disc Physics
    if (!this.isDragging) {
      this.discRotation += this.discVelocity;
      this.discVelocity *= 0.96; // friction
      if (Math.abs(this.discVelocity) < 0.001) {
        this.discVelocity = 0.0015; // gentle ambient turning
      }
    }

    const centerX = this.width / 2;
    const centerY = this.height / 2;
    const discRadius = Math.min(this.width, this.height) * 0.32;

    // Render Center Turntable / Codex Disc
    this.renderCentralDisc(centerX, centerY, discRadius);

    // Render Chapter Specific Interactive Layers
    switch (this.currentChapterId) {
      case 1:
        this.renderMortarInteractive(centerX, centerY, discRadius);
        break;
      case 2:
        this.renderBlenderInteractive(centerX, centerY, discRadius);
        break;
      case 3:
        this.renderAgitatorInteractive(centerX, centerY, discRadius);
        break;
      case 4:
        this.renderNectarInteractive(centerX, centerY, discRadius);
        break;
      case 5:
        this.renderSeedVaultInteractive(centerX, centerY);
        break;
      case 6:
        this.renderMalletInteractive(centerX, centerY, discRadius);
        break;
      case 7:
        this.renderDiagnosticHUD(centerX, centerY, discRadius);
        break;
      case 8:
        this.renderMasterMedallion(centerX, centerY, discRadius);
        break;
    }

    // Render Shockwaves
    this.renderShockwaves();

    this.ctx.restore();
  }

  // --- Central Astrolabe / Turntable Disc ---

  renderCentralDisc(cx, cy, radius) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(this.discRotation);

    // Outer Shadow & Glow
    const glowGrad = ctx.createRadialGradient(0, 0, radius * 0.8, 0, 0, radius * 1.15);
    glowGrad.addColorStop(0, "rgba(200, 157, 66, 0.2)");
    glowGrad.addColorStop(0.7, "rgba(230, 81, 0, 0.08)");
    glowGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 1.15, 0, Math.PI * 2);
    ctx.fill();

    // Outer Heavy Rim (Bronze / Charcoal)
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fillStyle = "#16171b";
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#c89d42";
    ctx.stroke();

    // Concentric Vinyl / Astrolabe Micro-Grooves
    for (let r = radius * 0.45; r < radius * 0.95; r += 7) {
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(217, 214, 206, 0.04)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Outer Astrolabe Ticks
    const tickCount = 48;
    for (let i = 0; i < tickCount; i++) {
      const a = (i / tickCount) * Math.PI * 2;
      const isMajor = i % 4 === 0;
      const r1 = radius - (isMajor ? 16 : 8);
      const r2 = radius - 3;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r1, Math.sin(a) * r1);
      ctx.lineTo(Math.cos(a) * r2, Math.sin(a) * r2);
      ctx.strokeStyle = isMajor ? "#c89d42" : "rgba(200, 157, 66, 0.3)";
      ctx.lineWidth = isMajor ? 2 : 1;
      ctx.stroke();
    }

    // Latin Inscription along the rim
    ctx.save();
    ctx.font = "9px 'Cinzel', serif";
    ctx.fillStyle = "rgba(200, 157, 66, 0.7)";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const latinText = "ARCHIVUM SANCTI BLENDERII • ANNO DOMINI MCCXLIII • FRUCTUS LIBIDO • ";
    for (let i = 0; i < latinText.length; i++) {
      const charAngle = (i / latinText.length) * Math.PI * 2;
      ctx.save();
      ctx.rotate(charAngle);
      ctx.fillText(latinText[i], 0, -radius + 22);
      ctx.restore();
    }
    ctx.restore();

    // Center Artwork Image Masked
    const innerRadius = radius * 0.65;
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, innerRadius, 0, Math.PI * 2);
    ctx.clip();

    // Choose appropriate image
    let currentImg = this.images.monk;
    if (this.currentChapterId >= 2 && this.currentChapterId <= 4 && this.images.blender) {
      currentImg = this.images.blender;
    } else if (this.currentChapterId >= 5 && this.images.seal) {
      currentImg = this.images.seal;
    }

    if (currentImg) {
      ctx.drawImage(
        currentImg,
        -innerRadius,
        -innerRadius,
        innerRadius * 2,
        innerRadius * 2
      );
    } else {
      // Fallback geometric Art Deco sunburst
      ctx.fillStyle = "#1e1e24";
      ctx.fill();
    }

    // Faceted Deco Vignette Overlay
    const innerGrad = ctx.createRadialGradient(0, 0, innerRadius * 0.3, 0, 0, innerRadius);
    innerGrad.addColorStop(0, "rgba(0,0,0,0)");
    innerGrad.addColorStop(0.8, "rgba(12, 13, 16, 0.4)");
    innerGrad.addColorStop(1, "rgba(12, 13, 16, 0.85)");
    ctx.fillStyle = innerGrad;
    ctx.beginPath();
    ctx.arc(0, 0, innerRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore(); // end clipped artwork

    // Center Spindle / Golden Boss
    ctx.beginPath();
    ctx.arc(0, 0, 24, 0, Math.PI * 2);
    ctx.fillStyle = "#c89d42";
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, 0, 7, 0, Math.PI * 2);
    ctx.fillStyle = "#0c0d10";
    ctx.fill();

    ctx.restore();
  }

  // --- Chapter 1: Stone Mortar Interactive ---
  renderMortarInteractive(cx, cy, radius) {
    const ctx = this.ctx;

    // Render splattered particles
    for (let i = this.mortarParticles.length - 1; i >= 0; i--) {
      const p = this.mortarParticles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.94;
      p.vy *= 0.94;
      p.alpha -= p.decay;

      if (p.alpha <= 0) {
        this.mortarParticles.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Dynamic Pestle Follower when dragging
    if (this.isDragging) {
      ctx.save();
      ctx.translate(this.pointerX, this.pointerY);
      ctx.fillStyle = "rgba(40, 42, 50, 0.8)";
      ctx.beginPath();
      ctx.arc(0, 0, 28, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = "#c89d42";
      ctx.stroke();
      ctx.fillStyle = "#ff9800";
      ctx.font = "10px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillText("PESTLE", 0, 4);
      ctx.restore();
    }
  }

  // --- Chapter 2: Alchemical Blender Vortex Interactive ---
  renderBlenderInteractive(cx, cy, radius) {
    const ctx = this.ctx;

    // Ramp Up or Down RPM
    if (this.isHoldingBlender) {
      this.blenderRpm = Math.min(24000, this.blenderRpm + 650);
      this.shakeAmount = Math.min(12, (this.blenderRpm / 24000) * 10);
    } else {
      this.blenderRpm = Math.max(0, this.blenderRpm - 450);
    }

    const rpmRatio = this.blenderRpm / 24000;
    abbeyAudio.setBlenderRpm(rpmRatio);

    if (this.onRpmChange) {
      this.onRpmChange(this.blenderRpm);
    }

    this.blenderAngle += (this.blenderRpm / 60) * 0.05;

    // Blender Vortex Blades in Center
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(this.blenderAngle);

    // Quad Blades
    const bladeLength = radius * 0.55;
    const bladeWidth = 14 + rpmRatio * 10;

    for (let b = 0; b < 4; b++) {
      ctx.save();
      ctx.rotate((b * Math.PI) / 2);
      ctx.beginPath();
      ctx.moveTo(0, -bladeWidth / 2);
      ctx.lineTo(bladeLength, 0);
      ctx.lineTo(0, bladeWidth / 2);
      ctx.closePath();
      ctx.fillStyle = `rgba(255, 152, 0, ${0.4 + rpmRatio * 0.6})`;
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }

    // Swirling Viscous Vortex Particles
    if (rpmRatio > 0.05) {
      ctx.lineWidth = 3;
      for (let s = 0; s < 18; s++) {
        const spiralR = (s / 18) * radius * 0.6;
        const spiralA = s * 0.8 + this.blenderAngle * (1 + s * 0.05);
        ctx.strokeStyle = s % 2 === 0 ? "rgba(230, 81, 0, 0.7)" : "rgba(255, 193, 7, 0.8)";
        ctx.beginPath();
        ctx.arc(
          Math.cos(spiralA) * spiralR,
          Math.sin(spiralA) * spiralR,
          Math.random() * 6 + 3,
          0,
          Math.PI * 2
        );
        ctx.stroke();
      }
    }

    ctx.restore();

    // Interactive RPM Dial HUD in bottom-center
    this.renderRpmDial(cx, cy + radius * 0.85, this.blenderRpm);
  }

  renderRpmDial(x, y, rpm) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(x, y);

    ctx.fillStyle = "rgba(18, 19, 24, 0.85)";
    ctx.beginPath();
    ctx.roundRect(-100, -32, 200, 64, 8);
    ctx.fill();
    ctx.strokeStyle = rpm > 18000 ? "#ff1744" : "#c89d42";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = "#d9d6ce";
    ctx.font = "10px 'JetBrains Mono', monospace";
    ctx.textAlign = "center";
    ctx.fillText("ALCHEMICAL TACHOMETER", 0, -12);

    ctx.font = "bold 20px 'Space Grotesk', sans-serif";
    ctx.fillStyle = rpm > 18000 ? "#ff5252" : "#ffb74d";
    ctx.fillText(`${Math.round(rpm)} RPM`, 0, 16);

    ctx.restore();
  }

  // --- Chapter 3: Mechanical Crank Agitator ---
  renderAgitatorInteractive(cx, cy, radius) {
    const ctx = this.ctx;
    this.agitatorHeat = Math.max(0, this.agitatorHeat - 0.25);

    // Render crank piston rods
    ctx.save();
    ctx.translate(cx, cy);

    const crankR = radius * 0.45;
    const px = Math.cos(this.agitatorAngle) * crankR;
    const py = Math.sin(this.agitatorAngle) * crankR;

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(px, py);
    ctx.lineWidth = 10;
    ctx.strokeStyle = "#8d6e63";
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(px, py, 18, 0, Math.PI * 2);
    ctx.fillStyle = "#c89d42";
    ctx.fill();
    ctx.stroke();

    ctx.restore();

    // Render Sparks
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const sp = this.sparks[i];
      sp.x += sp.vx;
      sp.y += sp.vy;
      sp.life -= sp.decay;
      if (sp.life <= 0) {
        this.sparks.splice(i, 1);
        continue;
      }
      ctx.save();
      ctx.globalAlpha = sp.life;
      ctx.fillStyle = "#ffeb3b";
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, sp.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Heat Bar HUD
    ctx.save();
    ctx.translate(cx - 100, cy + radius * 0.9);
    ctx.fillStyle = "rgba(18, 19, 24, 0.85)";
    ctx.roundRect(0, 0, 200, 22, 6);
    ctx.fill();
    ctx.strokeStyle = "#c89d42";
    ctx.stroke();

    const heatWidth = (this.agitatorHeat / 100) * 196;
    ctx.fillStyle = this.agitatorHeat > 70 ? "#ff1744" : "#ff9800";
    ctx.roundRect(2, 2, heatWidth, 18, 4);
    ctx.fill();

    ctx.fillStyle = "#fff";
    ctx.font = "9px 'JetBrains Mono', monospace";
    ctx.textAlign = "center";
    ctx.fillText(`FRICTION HEAT: ${Math.round(this.agitatorHeat)}%`, 100, 14);
    ctx.restore();
  }

  // --- Chapter 4: Viscous Nectar Ripples ---
  renderNectarInteractive(cx, cy, radius) {
    const ctx = this.ctx;

    for (let i = this.nectarRipples.length - 1; i >= 0; i--) {
      const r = this.nectarRipples[i];
      r.radius += r.speed;
      r.alpha -= 0.015;
      if (r.alpha <= 0 || r.radius >= r.maxRadius) {
        this.nectarRipples.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 179, 0, ${r.alpha})`;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.restore();
    }
  }

  // --- Chapter 5: Golden Seed Vault & Subterranean Roots ---
  renderSeedVaultInteractive(cx, cy) {
    const ctx = this.ctx;

    for (let i = 0; i < this.seeds.length; i++) {
      const s = this.seeds[i];
      if (!s.landed) {
        s.y += s.vy;
        s.x += s.vx;
        s.vy += 0.25; // gravity
        s.angle += s.va;

        if (s.y >= s.targetY) {
          s.landed = true;
          abbeyAudio.playBell(330 + Math.random() * 200);
          // Sprout a glowing root
          this.roots.push({
            x: s.x,
            y: s.y,
            branches: [{ x1: s.x, y1: s.y, x2: s.x + (Math.random() - 0.5) * 60, y2: s.y + 40 }],
            alpha: 1.0,
          });
        }
      }

      // Draw Seed
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.angle);
      ctx.fillStyle = "#d4af37"; // golden seed
      ctx.beginPath();
      ctx.ellipse(0, 0, 12, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#8d6e63";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
    }

    // Draw Sprouted Roots
    for (const r of this.roots) {
      ctx.strokeStyle = "rgba(200, 157, 66, 0.75)";
      ctx.lineWidth = 2;
      for (const b of r.branches) {
        ctx.beginPath();
        ctx.moveTo(b.x1, b.y1);
        ctx.lineTo(b.x2, b.y2);
        ctx.stroke();
      }
    }
  }

  // --- Chapter 6: Blacksmith Mallet Strike ---
  renderMalletInteractive(cx, cy, radius) {
    const ctx = this.ctx;

    // Hovering heavy stone/iron hammer head
    const hammerY = this.malletStriking ? cy + 40 : cy - 80;

    ctx.save();
    ctx.translate(cx, hammerY);

    // Hammer block
    ctx.fillStyle = "#263238";
    ctx.roundRect(-50, -35, 100, 70, 8);
    ctx.fill();
    ctx.strokeStyle = "#c89d42";
    ctx.lineWidth = 3;
    ctx.stroke();

    // Wood handle
    ctx.fillStyle = "#5d4037";
    ctx.fillRect(-12, -180, 24, 145);

    ctx.fillStyle = "#fff";
    ctx.font = "bold 11px 'Cinzel', serif";
    ctx.textAlign = "center";
    ctx.fillText("MALLEUS", 0, 4);

    ctx.restore();
  }

  // --- Chapter 7: Diagnostic HUD ---
  renderDiagnosticHUD(cx, cy, radius) {
    // Elegant alchemical concentric measurement arcs
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(cx, cy);

    ctx.strokeStyle = "rgba(200, 157, 66, 0.25)";
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.88, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.restore();
  }

  // --- Chapter 8: Grand Master Golden Medallion Aura ---
  renderMasterMedallion(cx, cy, radius) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(cx, cy);

    // Radiant divine rays
    const rayCount = 24;
    ctx.strokeStyle = "rgba(200, 157, 66, 0.15)";
    ctx.lineWidth = 2;
    for (let i = 0; i < rayCount; i++) {
      const a = (i / rayCount) * Math.PI * 2 + this.discRotation * 0.5;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * (radius * 1.4), Math.sin(a) * (radius * 1.4));
      ctx.stroke();
    }

    ctx.restore();
  }

  // --- Shockwaves ---
  renderShockwaves() {
    const ctx = this.ctx;
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.radius += 12;
      sw.alpha -= 0.035;
      if (sw.alpha <= 0 || sw.radius >= sw.maxRadius) {
        this.shockwaves.splice(i, 1);
        continue;
      }
      ctx.save();
      ctx.beginPath();
      ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 235, 59, ${sw.alpha})`;
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.restore();
    }
  }

  // --- Ambient Dust / Golden Spores ---
  renderAmbientParticles() {
    const ctx = this.ctx;
    for (const p of this.ambientParticles) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.y < 0) p.y = this.height;
      if (p.x < 0) p.x = this.width;
      if (p.x > this.width) p.x = 0;

      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  destroy() {
    if (this.rafId) cancelAnimationFrame(this.rafId);
  }
}
