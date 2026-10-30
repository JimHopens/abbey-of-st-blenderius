// Abbey of St. Blenderius — Main Application Controller
import confetti from "canvas-confetti";
import { abbeyAudio } from "./audio.js";
import { AbbeyCanvasEngine } from "./canvasEngine.js";
import { CHAPTERS, ABBEY_METADATA } from "./chaptersData.js";

class AbbeyApp {
  constructor() {
    this.currentChapterIndex = 0;
    this.canvasEngine = null;
    this.drawerOpen = false;

    // Cache DOM Elements
    this.canvasEl = document.getElementById("stage-canvas");
    this.btnBrandHome = document.getElementById("btn-brand-home");
    this.hudBadge = document.getElementById("hud-chapter-badge");
    this.hudTitle = document.getElementById("hud-chapter-title");
    this.hudSubtitle = document.getElementById("hud-chapter-subtitle");
    this.actionPrompt = document.getElementById("action-prompt");
    this.actionPromptText = document.getElementById("action-prompt-text");
    this.soundToggleBtn = document.getElementById("btn-sound-toggle");
    this.soundLabel = document.getElementById("sound-label");
    this.eqBars = document.querySelectorAll(".eq-bar");

    // Drawer Elements
    this.btnOpenDrawer = document.getElementById("btn-open-drawer");
    this.btnCloseDrawer = document.getElementById("btn-close-drawer");
    this.codexDrawer = document.getElementById("codex-drawer");
    this.drawerRoman = document.getElementById("drawer-roman");
    this.drawerTitle = document.getElementById("drawer-title");
    this.drawerLatin = document.getElementById("drawer-latin");
    this.drawerQuote = document.getElementById("drawer-quote");
    this.drawerText = document.getElementById("drawer-text");
    this.drawerRelic = document.getElementById("drawer-relic-code");
    this.drawerDanger = document.getElementById("drawer-danger-level");
    this.drawerPurity = document.getElementById("drawer-purity-loss");
    this.drawerYear = document.getElementById("drawer-year");

    // Bottom HUD Elements
    this.timelineProgress = document.getElementById("timeline-progress");
    this.timelineScrubber = document.getElementById("timeline-scrubber");
    this.btnPrev = document.getElementById("btn-prev-chapter");
    this.btnNext = document.getElementById("btn-next-chapter");
    this.chaptersPillsList = document.getElementById("chapters-nav-pills");
    this.timecodeDisplay = document.getElementById("timecode-display");

    // Modals
    this.inquisitionModal = document.getElementById("inquisition-modal");
    this.diagChecklistContainer = document.getElementById("diagnostic-checklist-container");
    this.totalScoreValue = document.getElementById("total-score-value");
    this.inquisitorStampBox = document.getElementById("inquisitor-stamp-container");

    this.diplomaModal = document.getElementById("diploma-modal");
    this.btnSealDiploma = document.getElementById("btn-seal-diploma");
    this.magisterNameInput = document.getElementById("magister-name-input");
    this.magisterTitleSelect = document.getElementById("magister-title-select");

    this.init();
  }

  init() {
    // 1. Initialize Canvas Engine
    this.canvasEngine = new AbbeyCanvasEngine(this.canvasEl, (rpm) => {
      // Optional callback for RPM
    });

    // 2. Render Chapter Navigation Pills
    this.renderNavPills();

    // 3. Render Inquisitor Checklist
    this.renderInquisitorChecklist();

    // 4. Bind Events
    this.bindEvents();

    // 5. Select Initial Chapter (Prologue)
    this.selectChapter(0, false);

    // 6. Start Equalizer Visualizer Loop
    this.startEqualizerLoop();
  }

  renderNavPills() {
    this.chaptersPillsList.innerHTML = "";
    CHAPTERS.forEach((ch, idx) => {
      const btn = document.createElement("button");
      btn.className = `chapter-pip ${idx === 0 ? "active" : ""}`;
      btn.textContent = ch.roman;
      btn.title = ch.title;
      btn.addEventListener("click", () => {
        abbeyAudio.ensureRunning();
        this.selectChapter(idx);
      });
      this.chaptersPillsList.appendChild(btn);
    });
  }

  renderInquisitorChecklist() {
    const chapter7 = CHAPTERS[7];
    if (!chapter7 || !chapter7.diagnosticItems) return;

    this.diagChecklistContainer.innerHTML = "";
    chapter7.diagnosticItems.forEach((item) => {
      const row = document.createElement("div");
      row.className = `diagnostic-item ${item.checked ? "checked" : ""}`;
      row.innerHTML = `
        <div class="diag-left">
          <div class="custom-checkbox">${item.checked ? "✓" : ""}</div>
          <div class="diag-text">
            <h4>${item.label}</h4>
            <span>${item.meaning}</span>
          </div>
        </div>
        <div class="diag-points">+${item.points} б.</div>
      `;

      row.addEventListener("click", () => {
        abbeyAudio.ensureRunning();
        item.checked = !item.checked;
        row.classList.toggle("checked", item.checked);
        row.querySelector(".custom-checkbox").textContent = item.checked ? "✓" : "";
        abbeyAudio.playClick(item.checked ? 1.4 : 0.8);
        this.updateInquisitionScore();
      });

      this.diagChecklistContainer.appendChild(row);
    });

    this.updateInquisitionScore();
  }

  updateInquisitionScore() {
    const chapter7 = CHAPTERS[7];
    if (!chapter7 || !chapter7.diagnosticItems) return;

    const total = chapter7.diagnosticItems.reduce((acc, it) => acc + (it.checked ? it.points : 0), 0);
    this.totalScoreValue.textContent = `${total} / 260`;

    if (total >= 100) {
      this.inquisitorStampBox.innerHTML = `<div class="wax-verdict-stamp">HAERETICUS DETECTUS</div>`;
      this.totalScoreValue.style.color = "#ff1744";
    } else {
      this.inquisitorStampBox.innerHTML = `<div class="wax-verdict-stamp" style="border-color: #c89d42; color: #c89d42;">SUSPECTUS</div>`;
      this.totalScoreValue.style.color = "#ffb74d";
    }
  }

  selectChapter(index, playAudioCue = true) {
    if (index < 0 || index >= CHAPTERS.length) return;
    this.currentChapterIndex = index;
    const ch = CHAPTERS[index];

    if (playAudioCue) {
      abbeyAudio.ensureRunning();
      abbeyAudio.playClick(1.0);
      if (index === 0) abbeyAudio.playBell(220);
      else if (index === 7) abbeyAudio.playBell(440);
      else if (index === 8) abbeyAudio.playInvestitureFanfare();
    }

    // Update Canvas Engine
    this.canvasEngine.setChapter(index);

    // Update Top HUD
    this.hudBadge.textContent = `TRACK ${String(index).padStart(2, "0")} // ${ch.roman}`;
    this.hudTitle.textContent = ch.title;
    this.hudSubtitle.textContent = ch.latinTitle;

    // Update Floating Prompt
    this.actionPromptText.textContent = ch.actionHint;

    // Update Bottom Timeline Scrubber
    const progressPct = ((index) / (CHAPTERS.length - 1)) * 100;
    this.timelineProgress.style.width = `${Math.max(8, progressPct)}%`;
    this.timecodeDisplay.textContent = `${ch.year} // ${ABBEY_METADATA.archiveTitle.slice(0, 18)}`;

    // Update Nav Pills Active state
    const pips = this.chaptersPillsList.querySelectorAll(".chapter-pip");
    pips.forEach((p, i) => {
      p.classList.toggle("active", i === index);
    });

    // Update Overlays
    this.inquisitionModal.style.display = index === 7 ? "block" : "none";
    this.diplomaModal.style.display = index === 8 ? "block" : "none";

    // Update Drawer text if open
    this.populateDrawer(ch);
  }

  populateDrawer(ch) {
    this.drawerRoman.textContent = `CAPITULUM ${ch.roman}`;
    this.drawerTitle.textContent = ch.title;
    this.drawerLatin.textContent = ch.latinTitle;
    this.drawerQuote.textContent = ch.quote;
    this.drawerText.textContent = ch.fullText;
    this.drawerRelic.textContent = ch.stats?.relicCode || "BLND-1243";
    this.drawerDanger.textContent = ch.stats?.dangerLevel || "Критический";
    this.drawerPurity.textContent = ch.stats?.purityLoss || "100%";
    this.drawerYear.textContent = ch.year;
  }

  toggleDrawer(forceOpen = null) {
    abbeyAudio.ensureRunning();
    this.drawerOpen = forceOpen !== null ? forceOpen : !this.drawerOpen;
    this.codexDrawer.classList.toggle("open", this.drawerOpen);
    if (this.drawerOpen) {
      abbeyAudio.playScratch(1.5);
      this.populateDrawer(CHAPTERS[this.currentChapterIndex]);
    } else {
      abbeyAudio.playClick(0.7);
    }
  }

  startEqualizerLoop() {
    const updateEq = () => {
      const levels = abbeyAudio.getVisualizerLevels();
      this.eqBars.forEach((bar, idx) => {
        const h = Math.round(levels[idx] * 14) + 2;
        bar.style.height = `${h}px`;
      });
      requestAnimationFrame(updateEq);
    };
    requestAnimationFrame(updateEq);
  }

  bindEvents() {
    // Brand click returns to Prologue
    this.btnBrandHome.addEventListener("click", () => {
      this.selectChapter(0);
    });

    // Sound toggle
    this.soundToggleBtn.addEventListener("click", () => {
      const isMuted = abbeyAudio.toggleMute();
      this.soundLabel.textContent = isMuted ? "SOUND: OFF" : "SOUND: ON";
    });

    // Drawer toggles
    this.btnOpenDrawer.addEventListener("click", () => this.toggleDrawer(true));
    this.btnCloseDrawer.addEventListener("click", () => this.toggleDrawer(false));

    // Bottom Prev / Next
    this.btnPrev.addEventListener("click", () => {
      if (this.currentChapterIndex > 0) {
        this.selectChapter(this.currentChapterIndex - 1);
      }
    });

    this.btnNext.addEventListener("click", () => {
      if (this.currentChapterIndex < CHAPTERS.length - 1) {
        this.selectChapter(this.currentChapterIndex + 1);
      }
    });

    // Scrubber click
    this.timelineScrubber.addEventListener("click", (e) => {
      const rect = this.timelineScrubber.getBoundingClientRect();
      const clickRatio = (e.clientX - rect.left) / rect.width;
      const targetIndex = Math.round(clickRatio * (CHAPTERS.length - 1));
      this.selectChapter(targetIndex);
    });

    // Chapter 8 Diploma Seal Celebration
    this.btnSealDiploma.addEventListener("click", () => {
      abbeyAudio.ensureRunning();
      abbeyAudio.playStamp();
      setTimeout(() => abbeyAudio.playInvestitureFanfare(), 150);

      const name = this.magisterNameInput.value.trim() || "Брат Блендерий";
      const title = this.magisterTitleSelect.value;

      // Confetti burst
      confetti({
        particleCount: 120,
        spread: 90,
        origin: { y: 0.6 },
        colors: ["#c89d42", "#e65100", "#ffb300", "#ffffff", "#8a1818"],
      });

      alert(`✦ ДЕКРЕТ ОБ ИНВЕСТИТУРЕ ✦\n\nДа пребудет с вами сила блендера, о достопочтенный ${name}!\nВам навечно присвоен титул: «${title}».\n\nДа сохранят ваши внутренние закрома каждую косточку!`);
    });

    // Keyboard Shortcuts
    window.addEventListener("keydown", (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "SELECT") return;

      if (e.key === "ArrowLeft") {
        if (this.currentChapterIndex > 0) this.selectChapter(this.currentChapterIndex - 1);
      } else if (e.key === "ArrowRight") {
        if (this.currentChapterIndex < CHAPTERS.length - 1) this.selectChapter(this.currentChapterIndex + 1);
      } else if (e.key === "KeyM" || e.key === "m" || e.key === "ь") {
        const isMuted = abbeyAudio.toggleMute();
        this.soundLabel.textContent = isMuted ? "SOUND: OFF" : "SOUND: ON";
      } else if (e.key === "Escape") {
        if (this.drawerOpen) this.toggleDrawer(false);
      } else if (e.key >= "0" && e.key <= "8") {
        const num = parseInt(e.key, 10);
        if (num < CHAPTERS.length) this.selectChapter(num);
      }
    });
  }
}

// Instantiate on DOM load
window.addEventListener("DOMContentLoaded", () => {
  new AbbeyApp();
});
