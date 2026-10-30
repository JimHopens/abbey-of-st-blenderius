// Abbey of St. Blenderius — Minimal Floating Audio & Editorial Controller
class AbbeyEditorialApp {
  constructor() {
    this.audio = document.getElementById("bg-audio");
    this.isPlaying = false;
    this.isMuted = false;

    // Entry Curtain
    this.curtain = document.getElementById("entry-curtain");
    this.btnEnter = document.getElementById("btn-enter-abbey");

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

  hideCurtain() {
    if (this.curtain) {
      this.curtain.classList.add("hidden");
    }
  }

  startMusic() {
    this.setupAudioContext();
    if (this.audioContext && this.audioContext.state === "suspended") {
      this.audioContext.resume();
    }

    this.audio.play().then(() => {
      this.isPlaying = true;
      this.updatePlayerUI();
      this.hideCurtain();
    }).catch(err => {
      console.warn("Audio playback waiting for user action:", err);
    });
  }

  setupAutoPlay() {
    // 1. Try immediate unmuted play on page load
    this.audio.play().then(() => {
      this.isPlaying = true;
      this.updatePlayerUI();
      this.hideCurtain();
      this.setupAudioContext();
    }).catch(() => {
      // Browser blocked unmuted autoplay.
      // Set up click/tap listeners to start immediately upon ANY user action
      const handleUserGesture = () => {
        this.startMusic();
        window.removeEventListener("click", handleUserGesture, true);
        window.removeEventListener("pointerdown", handleUserGesture, true);
        window.removeEventListener("touchstart", handleUserGesture, true);
        window.removeEventListener("keydown", handleUserGesture, true);
      };

      window.addEventListener("click", handleUserGesture, true);
      window.addEventListener("pointerdown", handleUserGesture, true);
      window.addEventListener("touchstart", handleUserGesture, true);
      window.addEventListener("keydown", handleUserGesture, true);
    });
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
    // Curtain click
    if (this.curtain) {
      this.curtain.addEventListener("click", () => this.startMusic());
    }
    if (this.btnEnter) {
      this.btnEnter.addEventListener("click", (e) => {
        e.stopPropagation();
        this.startMusic();
      });
    }

    // Play/Pause button
    this.btnPlay.addEventListener("click", (e) => {
      e.stopPropagation();
      this.togglePlay();
    });

    // Vinyl click
    this.btnVinyl.addEventListener("click", (e) => {
      e.stopPropagation();
      this.togglePlay();
    });

    // Mute button
    this.btnMute.addEventListener("click", (e) => {
      e.stopPropagation();
      this.toggleMute();
    });

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
