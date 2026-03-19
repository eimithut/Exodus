import { ChangeDetectionStrategy, Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { GameLogic, Phase, ResourceType, GameMode, PlayerConfig, MissionLength, AIDifficulty } from './game.logic';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-root',
  imports: [CommonModule, MatIconModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  game = signal<GameLogic | null>(null);
  gameStarted = signal(false);
  
  // Setup options
  availableColors = [
    { name: 'Indigo', value: '#6366f1' },
    { name: 'Pink', value: '#ec4899' },
    { name: 'Amber', value: '#f59e0b' },
    { name: 'Emerald', value: '#10b981' },
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Purple', value: '#8b5cf6' },
    { name: 'Red', value: '#ef4444' }
  ];

  setupPlayers = signal<PlayerConfig[]>([
    { name: 'Spieler 1', color: '#6366f1', isAI: false },
    { name: 'KI 1', color: '#ec4899', isAI: true, aiDifficulty: AIDifficulty.Medium }
  ]);

  selectedMode = signal<GameMode>(GameMode.Classic);
  selectedBoardSize = signal<number>(4);
  selectedMissionLength = signal<MissionLength>(MissionLength.Long);
  GameMode = GameMode;
  Phase = Phase;
  MissionLength = MissionLength;
  AIDifficulty = AIDifficulty;

  // Generate rings for portal animation (denser for wormhole effect)
  portalRings = Array.from({ length: 30 }, (_, i) => ({
    delay: i * 0.1,
    duration: 3
  }));

  isJumpingLocal = signal(false);
  isLocked = signal(true);

  changelog = [
    {
      version: 'v1.4.0',
      date: '19.03.2026',
      changes: [
        'System dauerhaft gesperrt.',
        'Spielbetrieb eingestellt.'
      ]
    },
    {
      version: 'v1.3.0',
      date: '19.03.2026',
      changes: [
        'Sperrbildschirm ("Leck Ei") mit verrückten Animationen hinzugefügt.',
        'Sperr-Button in der Lobby und in der Missionskontrolle implementiert.'
      ]
    },
    {
      version: 'v1.2.0',
      date: '05.03.2026',
      changes: [
        'Neues Changelog in der Lobby hinzugefügt.',
        'Fehler behoben, bei dem die KI den Zug des menschlichen Spielers im Brettspiel-Modus übernahm.',
        'Sprunganimation und Siegesbildschirm (Galaxie-Ansicht) vereinheitlicht.',
        'Die Erfolgschance für den interstellaren Sprung skaliert nun mit erforschten Technologien (+1 Bonus pro Technologie).'
      ]
    },
    {
      version: 'v1.1.0',
      date: '05.03.2026',
      changes: [
        'Brettspiel-Modus hinzugefügt.',
        'Wurmloch-Animation für den finalen Sprung implementiert.'
      ]
    },
    {
      version: 'v1.0.0',
      date: '04.03.2026',
      changes: [
        'Initiale Veröffentlichung von "Mission: Exodus".',
        'Klassischer Modus mit Ressourcenmanagement und Technologiebaum.'
      ]
    }
  ];

  currentTheme = computed(() => {
    if (this.game()?.winner()) return 'theme-galaxy';
    const player = this.game()?.currentPlayer();
    if (!player) return 'theme-earth';
    
    // If player is in Orbit phase OR has space research (which implies capability to be in space)
    if (player.phase === Phase.Orbit || this.hasSpaceResearch) {
      return 'theme-orbit';
    }
    return 'theme-earth';
  });

  protected readonly Math = Math;

  constructor() {
    // Initial game setup
  }

  async jump() {
    this.isJumpingLocal.set(true);
    
    // Play animation for 6 seconds
    await new Promise(resolve => setTimeout(resolve, 6000));
    
    // Perform jump logic
    await this.game()?.performJump();
    
    this.isJumpingLocal.set(false);
  }

  toggleLock() {
    // Permanently locked
  }

  addPlayer(isAI = false) {
    if (this.setupPlayers().length >= 7) return;
    
    const nextIndex = this.setupPlayers().length;
    const color = this.availableColors[nextIndex % this.availableColors.length].value;
    const name = isAI ? `KI ${nextIndex + 1}` : `Spieler ${nextIndex + 1}`;
    
    this.setupPlayers.update(p => [...p, { name, color, isAI, aiDifficulty: isAI ? AIDifficulty.Medium : undefined }]);
  }

  cycleAIDifficulty(index: number) {
    this.setupPlayers.update(players => {
      const newPlayers = [...players];
      const current = newPlayers[index].aiDifficulty || AIDifficulty.Medium;
      let next = AIDifficulty.Medium;
      
      if (current === AIDifficulty.Easy) next = AIDifficulty.Medium;
      else if (current === AIDifficulty.Medium) next = AIDifficulty.Hard;
      else next = AIDifficulty.Easy;
      
      newPlayers[index] = { ...newPlayers[index], aiDifficulty: next };
      return newPlayers;
    });
  }

  removePlayer(index: number) {
    if (this.setupPlayers().length <= 1) return;
    this.setupPlayers.update(p => p.filter((_, i) => i !== index));
  }

  updatePlayerName(index: number, name: string) {
    this.setupPlayers.update(players => {
      const newPlayers = [...players];
      newPlayers[index] = { ...newPlayers[index], name };
      return newPlayers;
    });
  }

  updatePlayerColor(index: number, color: string) {
    this.setupPlayers.update(players => {
      const newPlayers = [...players];
      newPlayers[index] = { ...newPlayers[index], color };
      return newPlayers;
    });
  }

  cyclePlayerColor(index: number) {
    this.setupPlayers.update(players => {
      const newPlayers = [...players];
      const currentColor = newPlayers[index].color;
      const colorIndex = this.availableColors.findIndex(c => c.value === currentColor);
      const nextColorIndex = (colorIndex + 1) % this.availableColors.length;
      newPlayers[index] = { ...newPlayers[index], color: this.availableColors[nextColorIndex].value };
      return newPlayers;
    });
  }

  toggleAI(index: number) {
    this.setupPlayers.update(players => {
      const newPlayers = [...players];
      const isAI = !newPlayers[index].isAI;
      const name = isAI ? `KI ${index + 1}` : `Spieler ${index + 1}`;
      newPlayers[index] = { ...newPlayers[index], isAI, name };
      return newPlayers;
    });
  }

  startGame() {
    this.game.set(new GameLogic(this.setupPlayers(), this.selectedMode(), this.selectedBoardSize(), this.selectedMissionLength()));
    this.gameStarted.set(true);
  }

  restartGame() {
    this.gameStarted.set(false);
    this.game.set(null);
  }

  // Helper methods for the template
  get currentPlayer() { return this.game()?.currentPlayer(); }
  get players() { return this.game()?.players() || []; }
  get eventLog() { return this.game()?.eventLog() || []; }
  get turnCount() { return this.game()?.turnCount() || 1; }
  get winner() { return this.game()?.winner(); }
  get activeQuestion() { return this.game()?.activeQuestion(); }
  get gameMode() { return this.game()?.gameMode; }
  get board() { return this.game()?.board || []; }
  get lastDiceRoll() { return this.game()?.lastDiceRoll(); }

  get hasSpaceResearch() {
    return this.currentPlayer?.technologies.find(t => t.id === 'space_research')?.unlocked;
  }

  get hasCannedFood() {
    return this.currentPlayer?.technologies.find(t => t.id === 'canned_food')?.unlocked;
  }

  get hasHyperdrive() {
    return this.currentPlayer?.technologies.find(t => t.id === 'hyperdrive')?.unlocked;
  }

  collect() { this.game()?.collectResources(); }
  research() { this.game()?.research(); }
  build() { this.game()?.buildModule(); }
  unlockTech(id: string) { this.game()?.unlockTechnology(id); }
  rollDice() { this.game()?.rollDice(); }
  
  setSpecialization(type: ResourceType) { this.game()?.setSpecialization(type); }
  answerQuestion(index: number) { this.game()?.answerQuestion(index); }

  getPhaseIcon(phase: Phase | undefined) {
    switch (phase) {
      case Phase.Earth: return 'public';
      case Phase.Orbit: return 'rocket';
      case Phase.Exodus: return 'star';
      default: return 'help';
    }
  }

  getResourceColor(key: string) {
    switch (key) {
      case 'water': return 'text-blue-400';
      case 'energy': return 'text-yellow-400';
      case 'metals': return 'text-slate-400';
      case 'research': return 'text-purple-400';
      default: return 'text-white';
    }
  }
}
