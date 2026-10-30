// Abbey of St. Blenderius — Mobile-Optimized Audio & Editorial Controller
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
    this.widgetWave = document.getElementById("widget-wave");
    this.btnMute = document.getElementById("btn-mute-toggle");
    this.iconVolOn = document.getElementById("icon-vol-on");
    this.iconVolOff = document.getElementById("icon-vol-off");

    // Reading Progress
    this.progressBar = document.getElementById("read-progress-bar");

    // Seamless loop point (in seconds):
    // The master file has the intro (0s - 11.28s) followed by 8 seamless 16-bar cycles (~5.75 mins).
    // When the master track reaches the end, it loops back to 11.28s (downbeat of bar 1).
    this.loopStart = 11.2815;

    this.init();
  }

  init() {
    this.bindEvents();
    this.setupReadingProgress();
    this.setupLoopMonitoring();
    this.setupAutoPlay();
  }

  setupLoopMonitoring() {
    // When the 5.75-minute track ends, loop back to the groove (11.28s)
    this.audio.addEventListener("ended", () => {
      this.audio.currentTime = this.loopStart;
      this.audio.play().catch(() => {});
    });
  }

  hideCurtain() {
    if (this.curtain) {
      this.curtain.classList.add("hidden");
    }
  }

  startMusic() {
    this.audio.play().then(() => {
      this.isPlaying = true;
      this.updatePlayerUI();
      this.hideCurtain();
    }).catch(err => {
      console.warn("Audio waiting for user gesture:", err);
    });
  }

  setupAutoPlay() {
    // 1. Attempt immediate play
    this.audio.play().then(() => {
      this.isPlaying = true;
      this.updatePlayerUI();
      this.hideCurtain();
    }).catch(() => {
      // Browser blocked unmuted autoplay.
      // Start immediately on first user touch, tap, click, or keypress
      const onUserGesture = () => {
        this.startMusic();
        window.removeEventListener("click", onUserGesture, true);
        window.removeEventListener("pointerdown", onUserGesture, true);
        window.removeEventListener("touchstart", onUserGesture, true);
        window.removeEventListener("keydown", onUserGesture, true);
      };

      window.addEventListener("click", onUserGesture, true);
      window.addEventListener("pointerdown", onUserGesture, true);
      window.addEventListener("touchstart", onUserGesture, true);
      window.addEventListener("keydown", onUserGesture, true);
    });
  }

  togglePlay() {
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
    if (this.widgetWave) {
      this.widgetWave.classList.toggle("playing", this.isPlaying && !this.isMuted);
    }
  }

  updatePlayerUI() {
    this.iconPlay.style.display = this.isPlaying ? "none" : "block";
    this.iconPause.style.display = this.isPlaying ? "block" : "none";
    this.btnVinyl.classList.toggle("playing", this.isPlaying);
    if (this.widgetWave) {
      this.widgetWave.classList.toggle("playing", this.isPlaying && !this.isMuted);
    }
  }

  setupReadingProgress() {
    window.addEventListener("scroll", () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      this.progressBar.style.width = `${Math.min(100, Math.max(0, progress))}%`;
    }, { passive: true });
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
