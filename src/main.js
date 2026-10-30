// Abbey of St. Blenderius — Minimal Floating Audio & Editorial Controller
class AbbeyEditorialApp {
  constructor() {
    this.audio = document.getElementById("bg-audio");
    this.isPlaying = false;
    this.isMuted = false;

    // Widget Elements
    this.btnPlay = document.getElementById("btn-play-toggle");
    this.btnVinyl = document.getElementById("btn-vinyl-toggle");
    this.iconPlay = document.getElementById("icon-play");
    this.iconPause = document.getElementById("icon-pause");
    this.wBars = document.querySelectorAll(".w-bar");
    this.btnMute = document.getElementById("btn-mute-toggle");
    this.iconVolOn = document.getElementById("icon-vol-on");
    this.iconVolOff = document.getElementById("icon-vol-off");

    // Reading Progress
    this.progressBar = document.getElementById("read-progress-bar");

    // Audio Visualizer setup
    this.audioContext = null;
    this.analyser = null;
    this.dataArray = null;

    this.init();
  }

  init() {
    this.bindEvents();
    this.setupReadingProgress();
    this.setupAutoPlay();
  }

  setupAudioContext() {
    if (this.audioContext) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioCtx();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 32;
      this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);

      const source = this.audioContext.createMediaElementSource(this.audio);
      source.connect(this.analyser);
      this.analyser.connect(this.audioContext.destination);

      this.startVisualizerLoop();
    } catch (e) {
      console.warn("Web Audio visualizer note:", e);
    }
  }

  startVisualizerLoop() {
    const update = () => {
      if (this.analyser && this.isPlaying && !this.isMuted) {
        this.analyser.getByteFrequencyData(this.dataArray);
        this.wBars.forEach((bar, idx) => {
          const val = (this.dataArray[idx * 2] || 0) / 255;
          const h = Math.round(val * 14) + 2;
          bar.style.height = `${h}px`;
        });
      } else {
        this.wBars.forEach((bar, idx) => {
          bar.style.height = `${(idx % 2) * 2 + 3}px`;
        });
      }
      requestAnimationFrame(update);
    };
    requestAnimationFrame(update);
  }

  setupAutoPlay() {
    // 1. Try immediate autoplay
    const tryPlay = () => {
      this.setupAudioContext();
      if (this.audioContext && this.audioContext.state === "suspended") {
        this.audioContext.resume();
      }

      this.audio.play().then(() => {
        this.isPlaying = true;
        this.updatePlayerUI();
      }).catch(() => {
        // Autoplay policy prevented immediate play.
        // Fallback: Start immediately on first user touch/scroll/click
        const startOnGesture = () => {
          this.setupAudioContext();
          if (this.audioContext && this.audioContext.state === "suspended") {
            this.audioContext.resume();
          }
          this.audio.play().then(() => {
            this.isPlaying = true;
            this.updatePlayerUI();
          }).catch(() => {});

          window.removeEventListener("pointerdown", startOnGesture);
          window.removeEventListener("scroll", startOnGesture);
          window.removeEventListener("touchstart", startOnGesture);
          window.removeEventListener("keydown", startOnGesture);
          window.removeEventListener("wheel", startOnGesture);
        };

        window.addEventListener("pointerdown", startOnGesture, { once: true, passive: true });
        window.addEventListener("scroll", startOnGesture, { once: true, passive: true });
        window.addEventListener("touchstart", startOnGesture, { once: true, passive: true });
        window.addEventListener("keydown", startOnGesture, { once: true, passive: true });
        window.addEventListener("wheel", startOnGesture, { once: true, passive: true });
      });
    };

    // Execute when ready
    if (document.readyState === "complete" || document.readyState === "interactive") {
      tryPlay();
    } else {
      window.addEventListener("DOMContentLoaded", tryPlay);
    }
  }

  togglePlay() {
    this.setupAudioContext();
    if (this.audioContext && this.audioContext.state === "suspended") {
      this.audioContext.resume();
    }

    if (this.audio.paused) {
      this.audio.play().then(() => {
        this.isPlaying = true;
        this.updatePlayerUI();
      }).catch(err => {
        console.warn("Play error:", err);
      });
    } else {
      this.audio.pause();
      this.isPlaying = false;
      this.updatePlayerUI();
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    this.audio.muted = this.isMuted;
    this.iconVolOn.style.display = this.isMuted ? "none" : "block";
    this.iconVolOff.style.display = this.isMuted ? "block" : "none";
  }

  updatePlayerUI() {
    this.iconPlay.style.display = this.isPlaying ? "none" : "block";
    this.iconPause.style.display = this.isPlaying ? "block" : "none";
    this.btnVinyl.classList.toggle("playing", this.isPlaying);
  }

  setupReadingProgress() {
    window.addEventListener("scroll", () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      this.progressBar.style.width = `${Math.min(100, Math.max(0, progress))}%`;
    });
  }

  bindEvents() {
    this.btnPlay.addEventListener("click", () => this.togglePlay());
    this.btnVinyl.addEventListener("click", () => this.togglePlay());
    this.btnMute.addEventListener("click", () => this.toggleMute());

    // Spacebar to toggle
    window.addEventListener("keydown", (e) => {
      if (e.code === "Space" && e.target.tagName !== "INPUT" && e.target.tagName !== "TEXTAREA") {
        e.preventDefault();
        this.togglePlay();
      }
    });
  }
}

// Start
new AbbeyEditorialApp();
