// Abbey of St. Blenderius — Editorial Experience & Audio Controller
class AbbeyEditorialApp {
  constructor() {
    this.audio = document.getElementById("bg-audio");
    this.isPlaying = false;
    this.isMuted = false;

    // Player Elements
    this.btnPlay = document.getElementById("btn-play-toggle");
    this.iconPlay = document.getElementById("icon-play");
    this.iconPause = document.getElementById("icon-pause");
    this.vinylDisc = document.getElementById("vinyl-disc-mini");
    this.timeCurrent = document.getElementById("time-current");
    this.timeDuration = document.getElementById("time-duration");
    this.scrubTrack = document.getElementById("audio-scrub-track");
    this.scrubFill = document.getElementById("audio-scrub-fill");
    this.eqBars = document.querySelectorAll(".eq-bar");
    this.btnMute = document.getElementById("btn-mute-toggle");
    this.iconVolOn = document.getElementById("icon-vol-on");
    this.iconVolOff = document.getElementById("icon-vol-off");

    // Hero invitation button
    this.btnInvitePlay = document.getElementById("btn-invite-play");

    // Reading Progress
    this.progressBar = document.getElementById("read-progress-bar");

    // Navigation links & chapters
    this.navLinks = document.querySelectorAll(".nav-link");
    this.chapters = document.querySelectorAll(".hero-section, .treatise-chapter");

    // Audio Visualizer setup
    this.audioContext = null;
    this.analyser = null;
    this.dataArray = null;

    this.init();
  }

  init() {
    this.bindEvents();
    this.setupScrollObserver();
    this.setupReadingProgress();
  }

  setupAudioContext() {
    if (this.audioContext) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioCtx();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 64;
      this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);

      const source = this.audioContext.createMediaElementSource(this.audio);
      source.connect(this.analyser);
      this.analyser.connect(this.audioContext.destination);

      this.startVisualizerLoop();
    } catch (e) {
      console.warn("Web Audio visualizer could not attach:", e);
    }
  }

  startVisualizerLoop() {
    const update = () => {
      if (this.analyser && this.isPlaying && !this.isMuted) {
        this.analyser.getByteFrequencyData(this.dataArray);
        this.eqBars.forEach((bar, idx) => {
          const val = (this.dataArray[idx * 2] || 0) / 255;
          const h = Math.round(val * 14) + 2;
          bar.style.height = `${h}px`;
        });
      } else {
        this.eqBars.forEach((bar, idx) => {
          bar.style.height = `${(idx % 3) * 2 + 3}px`;
        });
      }
      requestAnimationFrame(update);
    };
    requestAnimationFrame(update);
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
        console.warn("Autoplay error:", err);
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
    this.vinylDisc.classList.toggle("playing", this.isPlaying);

    if (this.btnInvitePlay) {
      this.btnInvitePlay.textContent = this.isPlaying ? "❚❚ ПРИОСТАНОВИТЬ САУНДТРЕК" : "▶ ВКЛЮЧИТЬ САУНДТРЕК";
    }
  }

  formatTime(seconds) {
    if (isNaN(seconds)) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }

  setupScrollObserver() {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.id;
            this.navLinks.forEach((link) => {
              const href = link.getAttribute("href").replace("#", "");
              link.classList.toggle("active", href === id);
            });
          }
        });
      },
      {
        rootMargin: "-20% 0px -70% 0px",
      }
    );

    this.chapters.forEach((ch) => observer.observe(ch));
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
    // Play button
    this.btnPlay.addEventListener("click", () => this.togglePlay());
    this.vinylDisc.addEventListener("click", () => this.togglePlay());
    if (this.btnInvitePlay) {
      this.btnInvitePlay.addEventListener("click", () => this.togglePlay());
    }

    // Mute button
    this.btnMute.addEventListener("click", () => this.toggleMute());

    // Audio time update
    this.audio.addEventListener("timeupdate", () => {
      if (this.audio.duration) {
        const pct = (this.audio.currentTime / this.audio.duration) * 100;
        this.scrubFill.style.width = `${pct}%`;
        this.timeCurrent.textContent = this.formatTime(this.audio.currentTime);
      }
    });

    this.audio.addEventListener("loadedmetadata", () => {
      this.timeDuration.textContent = this.formatTime(this.audio.duration);
    });

    // Scrubber click seek
    this.scrubTrack.addEventListener("click", (e) => {
      if (!this.audio.duration) return;
      const rect = this.scrubTrack.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const seekRatio = Math.max(0, Math.min(1, clickX / rect.width));
      this.audio.currentTime = seekRatio * this.audio.duration;
    });

    // Keyboard Space to toggle play/pause when not typing
    window.addEventListener("keydown", (e) => {
      if (e.code === "Space" && e.target.tagName !== "INPUT" && e.target.tagName !== "TEXTAREA") {
        e.preventDefault();
        this.togglePlay();
      }
    });
  }
}

// Instantiate on load
window.addEventListener("DOMContentLoaded", () => {
  new AbbeyEditorialApp();
});
