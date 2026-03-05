import { signal, computed } from '@angular/core';

export enum Phase {
  Earth = 'Erde',
  Orbit = 'Orbit',
  Exodus = 'Exodus'
}

export enum GameMode {
  Classic = 'Klassisch',
  Board = 'Brettspiel'
}

export enum MissionLength {
  Short = 'Kurz',
  Long = 'Lang'
}

export enum AIDifficulty {
  Easy = 'Leicht',
  Medium = 'Mittel',
  Hard = 'Schwer'
}

export type FieldType = 'start' | 'resources' | 'research' | 'event';

export interface BoardField {
  type: FieldType;
  name: string;
  gridCol?: number;
  gridRow?: number;
}

export interface Resources {
  water: number;
  energy: number;
  metals: number;
  research: number;
}

export interface Technology {
  id: string;
  name: string;
  description: string;
  cost: Resources;
  unlocked: boolean;
}

export type ResourceType = 'water' | 'energy' | 'metals';

export interface Question {
  text: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface PlayerState {
  id: number;
  name: string;
  resources: Resources;
  phase: Phase;
  modules: number;
  isAI: boolean;
  aiDifficulty: AIDifficulty;
  actionPoints: number;
  maxActionPoints: number;
  technologies: Technology[];
  specialization: ResourceType | null;
  population: number;
  usedQuestionIndices: Record<ResourceType | 'research', number[]>;
  boardPosition: number;
  color: string;
}

export interface GameEvent {
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

export interface PlayerConfig {
  name: string;
  color: string;
  isAI: boolean;
  aiDifficulty?: AIDifficulty;
}

export class GameLogic {
  players = signal<PlayerState[]>([]);
  currentPlayerIndex = signal(0);
  turnCount = signal(1);
  eventLog = signal<GameEvent[]>([]);
  winner = signal<PlayerState | null>(null);
  gameMode: GameMode;
  missionLength: MissionLength;
  board: BoardField[] = [];

  lastDiceRoll = signal<number | null>(null);
  
  // Question state
  activeQuestion = signal<{ question: Question; type: ResourceType | 'research' } | null>(null);

  currentPlayer = computed(() => this.players()[this.currentPlayerIndex()]);

  private questions: Record<ResourceType | 'research', Question[]> = {
    water: [
      { text: "Wie lautet die chemische Formel für Wasser?", options: ["H2O", "CO2", "HO2", "H2O2"], correctIndex: 0, explanation: "Wasser besteht aus zwei Wasserstoffatomen und einem Sauerstoffatom." },
      { text: "Was ist die Dichte von reinem Wasser bei 4°C?", options: ["0,5 g/cm³", "1,0 g/cm³", "2,0 g/cm³", "1,5 g/cm³"], correctIndex: 1, explanation: "Wasser hat seine maximale Dichte von 1,0 g/cm³ bei 4°C." },
      { text: "Bei welcher Temperatur gefriert Wasser (Celsius)?", options: ["-10°C", "0°C", "10°C", "32°C"], correctIndex: 1, explanation: "Reines Wasser gefriert bei 0°C unter normalem atmosphärischem Druck." },
      { text: "Was ist der Siedepunkt von Wasser auf Meereshöhe?", options: ["90°C", "100°C", "110°C", "120°C"], correctIndex: 1, explanation: "Wasser siedet bei 100°C unter Standarddruck." },
      { text: "Welcher Anteil der Erdoberfläche ist mit Wasser bedeckt?", options: ["50%", "60%", "71%", "85%"], correctIndex: 2, explanation: "Etwa 71% der Erdoberfläche sind wasserbedeckt." },
      { text: "Wie nennt man den Übergang von gasförmig zu flüssig?", options: ["Verdampfen", "Kondensieren", "Schmelzen", "Sublimieren"], correctIndex: 1, explanation: "Kondensation ist der Übergang von Gas zu Flüssigkeit." }
    ],
    energy: [
      { text: "Was ist die SI-Einheit der Energie?", options: ["Watt", "Newton", "Joule", "Volt"], correctIndex: 2, explanation: "Das Joule ist die Standardeinheit für Energie." },
      { text: "Welche dieser Quellen ist eine erneuerbare Energiequelle?", options: ["Kohle", "Erdgas", "Solar", "Atomkraft"], correctIndex: 2, explanation: "Solarenergie wird natürlich regeneriert." },
      { text: "Was stellt E=mc² dar?", options: ["Energie-Masse-Äquivalenz", "Elektrizität", "Entropie", "Elasticity"], correctIndex: 0, explanation: "Einsteins Formel zeigt, dass Masse in Energie umgewandelt werden kann." },
      { text: "Was ist die Einheit der elektrischen Leistung?", options: ["Volt", "Ampere", "Ohm", "Watt"], correctIndex: 3, explanation: "Watt (W) ist die Einheit für Leistung." },
      { text: "Welches Gesetz besagt, dass Energie nicht vernichtet werden kann?", options: ["Newton's Gesetz", "Energieerhaltungssatz", "Ohm'sches Gesetz", "Relativität"], correctIndex: 1, explanation: "Der Energieerhaltungssatz besagt, dass Energie nur umgewandelt werden kann." },
      { text: "Was ist die Lichtgeschwindigkeit im Vakuum (ca.)?", options: ["300.000 km/s", "150.000 km/s", "1.000.000 km/s", "30.000 km/s"], correctIndex: 0, explanation: "Licht bewegt sich mit ca. 300.000 Kilometern pro Sekunde." }
    ],
    metals: [
      { text: "Was ist das chemische Symbol für Eisen?", options: ["Ir", "Fe", "In", "Au"], correctIndex: 1, explanation: "Fe kommt vom lateinischen Wort 'Ferrum'." },
      { text: "Welches Metall ist bei Raumtemperatur flüssig?", options: ["Quecksilber", "Blei", "Aluminium", "Kupfer"], correctIndex: 0, explanation: "Quecksilber (Hg) hat einen sehr niedrigen Schmelzpunkt." },
      { text: "Welches ist das am häufigsten vorkommende Metall in der Erdkruste?", options: ["Eisen", "Gold", "Aluminium", "Silber"], correctIndex: 2, explanation: "Aluminium macht etwa 8% der Erdkruste aus." },
      { text: "Was ist das chemische Symbol für Gold?", options: ["Gd", "Go", "Au", "Ag"], correctIndex: 2, explanation: "Au kommt vom lateinischen 'Aurum'." },
      { text: "Aus welchen Metallen besteht Bronze hauptsächlich?", options: ["Eisen & Kohle", "Kupfer & Zinn", "Gold & Silber", "Blei & Zink"], correctIndex: 1, explanation: "Bronze ist eine Legierung aus Kupfer und Zinn." },
      { text: "Welches Metall leitet Elektrizität am besten?", options: ["Gold", "Kupfer", "Silber", "Aluminium"], correctIndex: 2, explanation: "Silber hat die höchste elektrische Leitfähigkeit aller Metalle." }
    ],
    research: [
      { text: "Wer entwickelte die Relativitätstheorie?", options: ["Isaac Newton", "Albert Einstein", "Marie Curie", "Nikola Tesla"], correctIndex: 1, explanation: "Albert Einstein veröffentlichte die allgemeine Relativitätstheorie im Jahr 1915." },
      { text: "Was ist der erste Schritt der wissenschaftlichen Methode?", options: ["Experiment", "Hypothese", "Beobachtung", "Schlussfolgerung"], correctIndex: 2, explanation: "Wissenschaft beginnt mit der Beobachtung eines Phänomens." },
      { text: "Wofür steht DNA?", options: ["Desoxyribonukleinsäure", "Dinukleinsäure", "Digital Network Array", "Deoxygenated Acid"], correctIndex: 0, explanation: "DNA ist das Molekül, das die genetischen Anweisungen trägt." },
      { text: "Wer entdeckte das Gesetz der Schwerkraft?", options: ["Galileo Galilei", "Isaac Newton", "Charles Darwin", "Stephen Hawking"], correctIndex: 1, explanation: "Newton formulierte das universelle Gravitationsgesetz." },
      { text: "Wer begründete die Evolutionstheorie?", options: ["Gregor Mendel", "Louis Pasteur", "Charles Darwin", "Thomas Edison"], correctIndex: 2, explanation: "Charles Darwin veröffentlichte 'Über die Entstehung der Arten'." },
      { text: "Wer erfand das Periodensystem der Elemente?", options: ["Niels Bohr", "Dmitri Mendelejew", "Ernest Rutherford", "Max Planck"], correctIndex: 1, explanation: "Mendelejew ordnete die Elemente nach ihren Eigenschaften." }
    ]
  };

  constructor(playerConfigs: PlayerConfig[], mode: GameMode = GameMode.Classic, boardSize = 4, missionLength: MissionLength = MissionLength.Long) {
    this.gameMode = mode;
    this.missionLength = missionLength;
    this.generateBoard(boardSize);
    
    const initialPlayers: PlayerState[] = [];
    
    playerConfigs.forEach((config, index) => {
      initialPlayers.push(this.createPlayer(index + 1, config.name, config.isAI, config.color, config.aiDifficulty));
    });

    this.players.set(initialPlayers);
    this.addLog({ message: `Spiel gestartet im ${mode}-Modus!`, type: 'info' });
  }

  private generateBoard(size: number) {
    const totalFields = (size * 4) - 4;
    const board: BoardField[] = [];
    
    const fieldNames = [
      'Eis-Vorkommen', 'Solar-Array', 'Bio-Labor', 'Metall-Ader', 'Wasser-Quelle', 
      'Physik-Zentrum', 'Energie-Zelle', 'Tiefen-Bergbau', 'Hydro-Kultur', 'KI-Kern', 
      'Lithium-Mine', 'Reaktor-Block', 'Material-Test', 'Eis-Bohrung', 'Titan-Lager', 
      'Wind-Park', 'Chemie-Labor', 'Oase', 'Geothermie', 'Astro-Physik', 
      'Uran-Depot', 'Wasser-Werk', 'Batterie-Farm', 'Gen-Sequenz', 'Kupfer-Mine', 
      'Algen-Farm', 'Quanten-Computer'
    ];

    for (let i = 0; i < totalFields; i++) {
      let type: FieldType = 'resources';
      let name = i === 0 ? 'Start-Basis' : fieldNames[(i - 1) % fieldNames.length];
      
      if (i === 0) {
        type = 'start';
        name = 'Start-Basis';
      } else {
        const rand = Math.random();
        if (rand < 0.1) type = 'event';
        else if (rand < 0.4) type = 'research';
      }
      
      let gridCol = 1;
      let gridRow = 1;

      if (i < size) {
        // Top row (left to right)
        gridRow = 1;
        gridCol = i + 1;
      } else if (i < size + size - 1) {
        // Right column (top to bottom)
        gridCol = size;
        gridRow = (i - size) + 2;
      } else if (i < size + size - 1 + size - 1) {
        // Bottom row (right to left)
        gridRow = size;
        gridCol = size - (i - (size + size - 1)) - 1;
      } else {
        // Left column (bottom to top)
        gridCol = 1;
        gridRow = size - (i - (size + size - 1 + size - 1)) - 1;
      }

      board.push({
        type,
        name,
        gridCol,
        gridRow
      });
    }
    this.board = board;
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  private createPlayer(id: number, name: string, isAI: boolean, color: string, aiDifficulty: AIDifficulty = AIDifficulty.Medium): PlayerState {
    return {
      id,
      name,
      resources: { water: 0, energy: 0, metals: 0, research: 0 },
      phase: Phase.Earth,
      modules: 0,
      isAI,
      aiDifficulty,
      actionPoints: 1,
      maxActionPoints: 1,
      technologies: [
        { id: 'mining', name: 'Fortgeschrittener Bergbau', description: '+5 Metalle pro Sammlung', cost: { water: 10, energy: 10, metals: 20, research: 2 }, unlocked: false },
        { id: 'solar', name: 'Solaranlagen', description: '+5 Energie pro Sammlung', cost: { water: 10, energy: 20, metals: 10, research: 2 }, unlocked: false },
        { id: 'water', name: 'Wasseraufbereitung', description: '+5 Wasser pro Sammlung', cost: { water: 20, energy: 10, metals: 10, research: 2 }, unlocked: false },
        { id: 'space_research', name: 'Weltraumforschung', description: 'Ermöglicht den Bau von Modulen.', cost: { water: 30, energy: 30, metals: 30, research: 5 }, unlocked: false },
        { id: 'canned_food', name: 'Konservennahrung', description: 'Überlebenswichtig für die lange Reise.', cost: { water: 40, energy: 20, metals: 10, research: 8 }, unlocked: false },
        { id: 'hyperdrive', name: 'Hyperraumantrieb', description: 'Ermöglicht den interstellaren Sprung.', cost: { water: 20, energy: 50, metals: 40, research: 10 }, unlocked: false }
      ],
      specialization: null,
      population: 10,
      usedQuestionIndices: { water: [], energy: [], metals: [], research: [] },
      boardPosition: 0,
      color
    };
  }

  addLog(event: GameEvent) {
    this.eventLog.update(logs => [event, ...logs].slice(0, 50));
  }

  setSpecialization(type: ResourceType) {
    const player = this.currentPlayer();
    if (player.specialization || player.actionPoints <= 0) return;

    // Check limits
    const playerCount = this.players().length;
    const limit = Math.max(1, Math.ceil(playerCount / 2));
    const count = this.players().filter(p => p.specialization === type).length;

    if (count >= limit) {
      this.addLog({ message: `Zu viele Spieler sind auf ${type} spezialisiert! Limit ist ${limit}.`, type: 'error' });
      return;
    }

    this.updatePlayer(player.id, p => ({ ...p, specialization: type, actionPoints: p.actionPoints - 1 }));
    this.addLog({ message: `${player.name} hat sich auf ${type.toUpperCase()} spezialisiert!`, type: 'success' });
    
    if (!this.checkAutoEndTurn()) {
      if (player.isAI && this.currentPlayer().actionPoints > 0) {
        setTimeout(() => this.runAITurn(), 1000);
      }
    }
  }

  collectResources() {
    const player = this.currentPlayer();
    if (this.winner() || player.actionPoints <= 0) return;

    if (!player.specialization) {
      this.addLog({ message: 'Du musst zuerst eine Spezialisierung wählen!', type: 'error' });
      return;
    }

    // Trigger Question
    const spec = player.specialization as ResourceType;
    const typeQuestions = this.questions[spec];
    const availableIndices = typeQuestions.map((_, i) => i).filter(i => !player.usedQuestionIndices[spec].includes(i));
    
    let index: number;
    if (availableIndices.length === 0) {
      // Reset if all used
      index = Math.floor(Math.random() * typeQuestions.length);
      this.updatePlayer(player.id, p => ({ ...p, usedQuestionIndices: { ...p.usedQuestionIndices, [spec]: [] } }));
    } else {
      index = availableIndices[Math.floor(Math.random() * availableIndices.length)];
    }

    this.updatePlayer(player.id, p => ({ 
      ...p, 
      usedQuestionIndices: { ...p.usedQuestionIndices, [spec]: [...p.usedQuestionIndices[spec], index] } 
    }));

    this.activeQuestion.set({ question: typeQuestions[index], type: spec });
  }

  research() {
    const player = this.currentPlayer();
    if (this.winner() || player.actionPoints <= 0) return;

    // Trigger Question
    const typeQuestions = this.questions.research;
    const availableIndices = typeQuestions.map((_, i: number) => i).filter((i: number) => !player.usedQuestionIndices.research.includes(i));
    
    let index: number;
    if (availableIndices.length === 0) {
      index = Math.floor(Math.random() * typeQuestions.length);
      this.updatePlayer(player.id, p => ({ ...p, usedQuestionIndices: { ...p.usedQuestionIndices, research: [] } }));
    } else {
      index = availableIndices[Math.floor(Math.random() * availableIndices.length)];
    }

    this.updatePlayer(player.id, p => ({ 
      ...p, 
      usedQuestionIndices: { ...p.usedQuestionIndices, research: [...p.usedQuestionIndices.research, index] } 
    }));

    this.activeQuestion.set({ question: typeQuestions[index], type: 'research' });
  }

  async rollDice() {
    const player = this.currentPlayer();
    if (this.winner() || player.actionPoints <= 0 || this.gameMode !== GameMode.Board) return;

    const roll = Math.floor(Math.random() * 6) + 1;
    this.lastDiceRoll.set(roll);
    
    let newPos = player.boardPosition + roll;
    let passedStart = false;
    
    if (newPos >= this.board.length) {
      newPos = newPos % this.board.length;
      passedStart = true;
    }

    this.updatePlayer(player.id, p => ({ 
      ...p, 
      boardPosition: newPos,
      actionPoints: p.actionPoints - 1
    }));

    this.addLog({ message: `${player.name} hat eine ${roll} gewürfelt und landet auf ${this.board[newPos].name}.`, type: 'info' });

    if (passedStart) {
      this.updatePlayer(player.id, p => ({
        ...p,
        resources: {
          water: p.resources.water + 5,
          energy: p.resources.energy + 5,
          metals: p.resources.metals + 5,
          research: p.resources.research + 5
        }
      }));
      this.addLog({ message: `${player.name} hat Start passiert! +5 von allen Ressourcen.`, type: 'success' });
    }

    // Small delay so the user sees the movement before the field action (e.g. question modal)
    await new Promise(resolve => setTimeout(resolve, 800));
    this.handleFieldAction(newPos);
    
    this.checkAutoEndTurn();
  }

  private handleFieldAction(pos: number) {
    const field = this.board[pos];

    switch (field.type) {
      case 'resources':
        this.collectResourcesBoard();
        break;
      case 'research':
        this.researchBoard();
        break;
      case 'event':
        this.triggerBoardEvent();
        break;
      case 'start':
        // Already handled passing start
        break;
    }
  }

  private collectResourcesBoard() {
    const player = this.currentPlayer();
    const baseGain = Math.floor(Math.random() * 4) + 3; // 3-6
    const spec = player.specialization;
    
    const newResources = {
      water: player.resources.water + baseGain + (spec === 'water' ? 3 : 0),
      energy: player.resources.energy + baseGain + (spec === 'energy' ? 3 : 0),
      metals: player.resources.metals + baseGain + (spec === 'metals' ? 3 : 0),
      research: player.resources.research
    };

    this.updatePlayer(player.id, p => ({ ...p, resources: newResources }));
    this.addLog({ message: `${player.name} erhält ${baseGain} von allen Ressourcen${spec ? ' (+3 Bonus)' : ''}.`, type: 'success' });
  }

  private researchBoard() {
    const player = this.currentPlayer();
    const gain = Math.floor(Math.random() * 4) + 3; // 3-6 research points
    this.updatePlayer(player.id, p => ({
      ...p,
      resources: { ...p.resources, research: p.resources.research + gain }
    }));
    this.addLog({ message: `${player.name} hat geforscht und ${gain} Forschungspunkte erhalten.`, type: 'success' });
  }

  private triggerBoardEvent() {
    const events = [
      { message: "Meteorschauer! -10 Metalle", action: (p: PlayerState) => ({ ...p, resources: { ...p.resources, metals: Math.max(0, p.resources.metals - 10) } }), type: 'error' as const },
      { message: "Wasserquelle gefunden! +10 Wasser", action: (p: PlayerState) => ({ ...p, resources: { ...p.resources, water: p.resources.water + 10 } }), type: 'success' as const },
      { message: "Energieschub! +10 Energie", action: (p: PlayerState) => ({ ...p, resources: { ...p.resources, energy: p.resources.energy + 10 } }), type: 'success' as const },
      { message: "Datenleck! -5 Forschung", action: (p: PlayerState) => ({ ...p, resources: { ...p.resources, research: Math.max(0, p.resources.research - 5) } }), type: 'error' as const },
    ];

    const event = events[Math.floor(Math.random() * events.length)];
    const player = this.currentPlayer();
    this.updatePlayer(player.id, event.action);
    this.addLog({ message: `FELD-EREIGNIS: ${event.message}`, type: event.type });
  }

  checkAutoEndTurn(): boolean {
    const player = this.currentPlayer();
    if (player.actionPoints <= 0 && !this.activeQuestion() && !this.winner()) {
      this.endTurn();
      return true;
    }
    return false;
  }

  answerQuestion(index: number) {
    const active = this.activeQuestion();
    if (!active) return;

    const player = this.currentPlayer();
    const isCorrect = index === active.question.correctIndex;
    
    if (isCorrect) {
      if (active.type === 'research') {
        const gain = Math.floor(Math.random() * 2) + 2;
        this.updatePlayer(player.id, p => ({
          ...p,
          actionPoints: p.actionPoints - 1,
          resources: { ...p.resources, research: p.resources.research + gain }
        }));
        this.addLog({ message: `Richtig! ${player.name} hat ${gain} Forschungspunkte erhalten.`, type: 'success' });
      } else {
        const type = active.type as ResourceType;
        const hasTech = (id: string) => player.technologies.find(t => t.id === id)?.unlocked;
        const techBonus = (type === 'water' && hasTech('water')) || 
                          (type === 'energy' && hasTech('solar')) || 
                          (type === 'metals' && hasTech('mining')) ? 10 : 0;
        
        const mainGain = Math.floor(Math.random() * 15) + 15 + techBonus;
        const otherGain = Math.floor(Math.random() * 5) + 5; // Collect everything, but less of others

        this.updatePlayer(player.id, p => ({
          ...p,
          actionPoints: p.actionPoints - 1,
          resources: {
            ...p.resources,
            water: p.resources.water + (type === 'water' ? mainGain : otherGain),
            energy: p.resources.energy + (type === 'energy' ? mainGain : otherGain),
            metals: p.resources.metals + (type === 'metals' ? mainGain : otherGain)
          }
        }));
        this.addLog({ message: `Richtig! ${player.name} hat Ressourcen gesammelt (Bonus auf ${type}).`, type: 'success' });
      }
    } else {
      this.addLog({ message: `Falsch! ${active.question.explanation}`, type: 'error' });
      this.updatePlayer(player.id, p => ({ ...p, actionPoints: p.actionPoints - 1 }));
    }

    this.activeQuestion.set(null);
    this.checkPhaseTransition(player.id);
    
    if (!this.checkAutoEndTurn()) {
      // Continue AI turn if AP > 0
      if (player.isAI && this.currentPlayer().actionPoints > 0) {
        setTimeout(() => this.runAITurn(), 1000);
      }
    }
  }



  getResearchUnlockCost(spec: ResourceType): { water: number; energy: number; metals: number } {
    switch (spec) {
      case 'water': return { water: 30, metals: 20, energy: 20 };
      case 'metals': return { water: 20, metals: 30, energy: 20 };
      case 'energy': return { water: 20, metals: 20, energy: 30 };
      default: return { water: 25, metals: 25, energy: 25 };
    }
  }

  unlockTechnology(techId: string) {
    const player = this.currentPlayer();
    if (this.winner() || player.actionPoints <= 0) return;

    // Specialization check for upgrades
    const techMapping: Record<string, ResourceType | 'research'> = {
      'mining': 'metals',
      'solar': 'energy',
      'water': 'water',
      'space_research': 'research',
      'canned_food': 'research',
      'hyperdrive': 'research'
    };

    // Space research, canned food, and hyperdrive are available for everyone
    const isGlobalTech = ['space_research', 'canned_food', 'hyperdrive'].includes(techId);
    if (!isGlobalTech && techMapping[techId] !== (player.specialization || 'research')) {
      this.addLog({ message: `Du kannst nur Technologien deiner Spezialisierung (${player.specialization || 'Forschung'}) freischalten!`, type: 'error' });
      return;
    }

    // Check if player has built 3 modules for canned_food and hyperdrive
    if ((techId === 'canned_food' || techId === 'hyperdrive') && player.modules < 3) {
      this.addLog({ message: `Du musst zuerst alle 3 Schiffsmodule bauen, um ${techId === 'canned_food' ? 'Konservennahrung' : 'Hyperraumantrieb'} zu erforschen!`, type: 'error' });
      return;
    }

    const tech = player.technologies.find(t => t.id === techId);
    if (!tech || tech.unlocked) return;

    const canAfford = 
      player.resources.water >= tech.cost.water &&
      player.resources.energy >= tech.cost.energy &&
      player.resources.metals >= tech.cost.metals &&
      player.resources.research >= tech.cost.research;

    if (!canAfford) {
      this.addLog({ message: `Nicht genügend Ressourcen, um ${tech.name} freizuschalten!`, type: 'error' });
      return;
    }

    this.updatePlayer(player.id, p => ({
      ...p,
      actionPoints: p.actionPoints - 1,
      resources: {
        water: p.resources.water - tech.cost.water,
        energy: p.resources.energy - tech.cost.energy,
        metals: p.resources.metals - tech.cost.metals,
        research: p.resources.research - tech.cost.research
      },
      technologies: p.technologies.map(t => t.id === techId ? { ...t, unlocked: true } : t)
    }));

    this.addLog({ message: `${player.name} hat die Technologie freigeschaltet: ${tech.name}!`, type: 'success' });
    
    if (!this.checkAutoEndTurn()) {
      if (player.isAI && this.currentPlayer().actionPoints > 0) {
        setTimeout(() => this.runAITurn(), 1000);
      }
    }
  }

  buildModule() {
    const player = this.currentPlayer();
    if (this.winner() || player.actionPoints <= 0) return;

    const hasSpaceResearch = player.technologies.find(t => t.id === 'space_research')?.unlocked;
    if (player.phase !== Phase.Orbit && !hasSpaceResearch) {
      this.addLog({ message: 'Du musst in der Orbit-Phase sein oder Weltraumforschung haben, um Module zu bauen!', type: 'error' });
      return;
    }

    const cost = 40; // Total resources cost
    const totalResources = player.resources.water + player.resources.energy + player.resources.metals;

    if (totalResources < cost) {
      this.addLog({ message: `Nicht genügend Ressourcen! Benötigt werden insgesamt ${cost}.`, type: 'error' });
      return;
    }

    // Deduct resources proportionally or just subtract from total
    let remainingToDeduct = cost;
    const newResources = { ...player.resources };
    
    const deduct = (key: keyof Resources) => {
      const amount = Math.min(newResources[key], remainingToDeduct);
      (newResources[key] as number) -= amount;
      remainingToDeduct -= amount;
    };

    deduct('metals');
    deduct('energy');
    deduct('water');

    this.updatePlayer(player.id, p => ({
      ...p,
      actionPoints: p.actionPoints - 1,
      resources: newResources,
      modules: p.modules + 1
    }));

    this.addLog({ message: `${player.name} hat ein Schiffsmodul gebaut! (${player.modules + 1}/3)`, type: 'success' });
    
    if (!this.checkAutoEndTurn()) {
      if (player.isAI && this.currentPlayer().actionPoints > 0) {
        setTimeout(() => this.runAITurn(), 1000);
      }
    }

    if (player.modules + 1 >= 3) {
      this.updatePlayer(player.id, p => ({ ...p, phase: Phase.Exodus }));
      this.addLog({ message: `${player.name} hat Phase 3 erreicht: Exodus! Zeit für den interstellaren Sprung.`, type: 'info' });
    }
  }

  async performJump() {
    const player = this.currentPlayer();
    if (this.winner() || player.actionPoints <= 0) return;

    const hasSpaceResearch = player.technologies.find(t => t.id === 'space_research')?.unlocked;
    const hasCannedFood = player.technologies.find(t => t.id === 'canned_food')?.unlocked;
    const hasHyperdrive = player.technologies.find(t => t.id === 'hyperdrive')?.unlocked;

    if (this.missionLength === MissionLength.Long && (!hasCannedFood || !hasHyperdrive)) {
      this.addLog({ message: 'Du musst zuerst Konservennahrung und den Hyperraumantrieb erforschen!', type: 'error' });
      return;
    }

    let bonus = 0;
    if (hasSpaceResearch) bonus += 1;
    if (hasCannedFood) bonus += 1;
    if (hasHyperdrive) bonus += 1;

    const roll = Math.floor(Math.random() * 6) + 1;
    const totalRoll = roll + bonus;
    this.addLog({ message: `${player.name} hat eine ${roll}${bonus ? ' (+' + bonus + ' Bonus)' : ''} für den Sprung gewürfelt!`, type: 'info' });

    this.updatePlayer(player.id, p => ({ ...p, actionPoints: p.actionPoints - 1 }));

    // Success threshold is 5, but with full tech (bonus +3), any roll >= 2 succeeds.
    if (totalRoll >= 5) {
      this.winner.set(player);
      this.addLog({ message: `ERFOLG! ${player.name} hat die Sterne erreicht!`, type: 'success' });
    } else {
      this.addLog({ message: `SPRUNG FEHLGESCHLAGEN! Die Triebwerke konnten nicht stabilisiert werden. Rekalibrierung läuft...`, type: 'error' });
      if (!this.checkAutoEndTurn()) {
        if (player.isAI && this.currentPlayer().actionPoints > 0) {
          setTimeout(() => this.runAITurn(), 1000);
        }
      }
    }
  }

  endTurn() {
    if (this.winner()) return;

    this.triggerRandomEvent();

    // Reset AP for current player before switching
    const currentPlayer = this.currentPlayer();
    
    // Reproduction and Kid Production
    const growth = Math.max(1, Math.floor(currentPlayer.population * 0.1));
    const newPop = currentPlayer.population + growth;
    
    // Kids produce 20% of the population's capacity (1 kid = 0.2 resources of each type)
    const kidProduction = Math.floor(currentPlayer.population * 0.2);
    
    this.updatePlayer(currentPlayer.id, p => ({ 
      ...p, 
      actionPoints: p.maxActionPoints,
      population: newPop,
      resources: {
        ...p.resources,
        water: p.resources.water + kidProduction,
        energy: p.resources.energy + kidProduction,
        metals: p.resources.metals + kidProduction
      }
    }));

    if (kidProduction > 0) {
      this.addLog({ message: `Bevölkerung wächst (+${growth}). Die nächste Generation produzierte ${kidProduction} von jeder Ressource.`, type: 'info' });
    }

    const nextIndex = (this.currentPlayerIndex() + 1) % this.players().length;
    this.currentPlayerIndex.set(nextIndex);
    
    if (nextIndex === 0) {
      this.turnCount.update(t => t + 1);
    }

    const nextPlayer = this.players()[nextIndex];
    if (nextPlayer.isAI) {
      setTimeout(() => this.runAITurn(), 1000);
    }
  }

  private triggerRandomEvent() {
    const events = [
      { message: "Sonnensturm: -10 Energie", action: (p: PlayerState) => ({ ...p, resources: { ...p.resources, energy: Math.max(0, p.resources.energy - 10) } }), type: 'warning' as const },
      { message: "Technischer Durchbruch: +5 Forschung", action: (p: PlayerState) => ({ ...p, resources: { ...p.resources, research: p.resources.research + 5 } }), type: 'success' as const },
      { message: "Meteorschauer: -5 Metalle", action: (p: PlayerState) => ({ ...p, resources: { ...p.resources, metals: Math.max(0, p.resources.metals - 5) } }), type: 'warning' as const },
      { message: "Effizientes Recycling: +10 Wasser", action: (p: PlayerState) => ({ ...p, resources: { ...p.resources, water: p.resources.water + 10 } }), type: 'success' as const },
      { message: "Ruhige Runde: Nichts passiert.", action: (p: PlayerState) => p, type: 'info' as const }
    ];

    if (Math.random() < 0.3) {
      const event = events[Math.floor(Math.random() * events.length)];
      const player = this.currentPlayer();
      this.updatePlayer(player.id, event.action);
      this.addLog({ message: `EREIGNIS: ${event.message} (Betrifft ${player.name})`, type: event.type });
    }
  }

  private checkPhaseTransition(playerId: number) {
    const player = this.players().find(p => p.id === playerId);
    if (!player || player.phase !== Phase.Earth) return;

    const totalResources = player.resources.water + player.resources.energy + player.resources.metals;
    if (totalResources >= 100 && player.resources.research >= 3) {
      this.updatePlayer(playerId, p => ({ ...p, phase: Phase.Orbit }));
      this.addLog({ message: `${player.name} hat den Orbit erreicht! Phase 2 beginnt.`, type: 'info' });
    }
  }

  updatePlayerColor(id: number, color: string) {
    this.updatePlayer(id, p => ({ ...p, color }));
  }

  private updatePlayer(id: number, updater: (p: PlayerState) => PlayerState) {
    this.players.update(players => players.map(p => p.id === id ? updater(p) : p));
  }

  private runAITurn() {
    if (this.winner()) return;
    const player = this.currentPlayer();
    
    // Safety check: Ensure it's actually an AI turn
    if (!player.isAI) return;
    
    if (player.actionPoints > 0) {
      // AI Specialization
      if (!player.specialization) {
        const types: ResourceType[] = ['water', 'energy', 'metals'];
        const playerCount = this.players().length;
        const limit = Math.max(1, Math.ceil(playerCount / 2));
        
        // Easy AI picks random specialization
        if (player.aiDifficulty === AIDifficulty.Easy) {
          const randomType = types[Math.floor(Math.random() * types.length)];
          this.setSpecialization(randomType);
        } else {
          // Medium/Hard AI picks balanced specialization
          for (const type of types) {
            const count = this.players().filter(p => p.specialization === type).length;
            if (count < limit) {
              this.setSpecialization(type);
              break;
            }
          }
        }
        setTimeout(() => this.runAITurn(), 1000);
        return;
      }

      // Difficulty Modifiers
      const isEasy = player.aiDifficulty === AIDifficulty.Easy;
      const isHard = player.aiDifficulty === AIDifficulty.Hard;

      // Chance to make a suboptimal move (Easy only)
      if (isEasy && Math.random() < 0.3) {
        if (this.gameMode === GameMode.Board) {
           this.rollDice().then(() => {
             // Check if it's still this AI's turn
             if (this.currentPlayer().id !== player.id) return;

             if (this.activeQuestion()) {
               this.handleAIQuestion();
             } else if (this.currentPlayer().actionPoints > 0) {
               setTimeout(() => this.runAITurn(), 1000);
             }
           });
        } else {
           this.collectResources();
           if (this.activeQuestion()) {
             this.handleAIQuestion();
           } else if (this.currentPlayer().actionPoints > 0) {
             setTimeout(() => this.runAITurn(), 1000);
           }
        }
        return;
      }

      if (this.gameMode === GameMode.Board) {
        const hasSpaceResearch = player.technologies.find(t => t.id === 'space_research')?.unlocked;
        const hasCannedFood = player.technologies.find(t => t.id === 'canned_food')?.unlocked;
        const hasHyperdrive = player.technologies.find(t => t.id === 'hyperdrive')?.unlocked;

        const readyToJump = this.missionLength === MissionLength.Short ? player.modules === 3 : (hasCannedFood && hasHyperdrive && player.modules === 3);

        if (readyToJump) {
          this.performJump();
        } else if (player.modules === 3 && this.missionLength === MissionLength.Long) {
          // AI Logic: Try to unlock canned food or hyperdrive
          const nextTech = player.technologies.find(t => !t.unlocked && (t.id === 'canned_food' || t.id === 'hyperdrive'));
          if (nextTech && 
              player.resources.water >= nextTech.cost.water &&
              player.resources.energy >= nextTech.cost.energy &&
              player.resources.metals >= nextTech.cost.metals &&
              player.resources.research >= nextTech.cost.research) {
            this.unlockTechnology(nextTech.id);
          } else {
            this.rollDice().then(() => {
              if (this.currentPlayer().id !== player.id) return;
              if (this.activeQuestion()) {
                this.handleAIQuestion();
              } else if (this.currentPlayer().actionPoints > 0) {
                setTimeout(() => this.runAITurn(), 1000);
              }
            });
          }
        } else if (hasSpaceResearch) {
          const total = player.resources.water + player.resources.energy + player.resources.metals;
          // Hard AI builds sooner (at 30 resources), Easy/Medium at 40
          const buildThreshold = isHard ? 30 : 40;
          
          if (total >= buildThreshold) {
            this.buildModule();
          } else {
            this.rollDice().then(() => {
              if (this.currentPlayer().id !== player.id) return;
              if (this.activeQuestion()) {
                this.handleAIQuestion();
              } else if (this.currentPlayer().actionPoints > 0) {
                setTimeout(() => this.runAITurn(), 1000);
              }
            });
          }
        } else {
          // Try to buy space research if possible
          const spaceTech = player.technologies.find(t => t.id === 'space_research' && !t.unlocked);
          if (spaceTech && 
              player.resources.water >= spaceTech.cost.water &&
              player.resources.energy >= spaceTech.cost.energy &&
              player.resources.metals >= spaceTech.cost.metals &&
              player.resources.research >= spaceTech.cost.research) {
            this.unlockTechnology(spaceTech.id);
          } else {
            this.rollDice().then(() => {
              if (this.currentPlayer().id !== player.id) return;
              if (this.activeQuestion()) {
                this.handleAIQuestion();
              } else if (this.currentPlayer().actionPoints > 0) {
                setTimeout(() => this.runAITurn(), 1000);
              }
            });
          }
        }
      } else {
        const hasSpaceResearch = player.technologies.find(t => t.id === 'space_research')?.unlocked;
        const hasCannedFood = player.technologies.find(t => t.id === 'canned_food')?.unlocked;
        const hasHyperdrive = player.technologies.find(t => t.id === 'hyperdrive')?.unlocked;

        // AI Logic: Try to unlock tech if possible
        const techMapping: Record<string, ResourceType | 'research'> = {
          'mining': 'metals',
          'solar': 'energy',
          'water': 'water',
          'space_research': 'research',
          'canned_food': 'research',
          'hyperdrive': 'research'
        };

        const affordableTech = player.technologies.find(t => !t.unlocked && 
          (['space_research', 'canned_food', 'hyperdrive'].includes(t.id) || techMapping[t.id] === (player.specialization || 'research')) &&
          player.resources.water >= t.cost.water &&
          player.resources.energy >= t.cost.energy &&
          player.resources.metals >= t.cost.metals &&
          player.resources.research >= t.cost.research &&
          ((t.id !== 'canned_food' && t.id !== 'hyperdrive') || player.modules === 3) &&
          (this.missionLength === MissionLength.Long || (t.id !== 'canned_food' && t.id !== 'hyperdrive'))
        );

        if (affordableTech) {
          this.unlockTechnology(affordableTech.id);
        } else if (player.modules === 3) {
          const readyToJump = this.missionLength === MissionLength.Short || (hasCannedFood && hasHyperdrive);
          if (readyToJump) {
            this.performJump();
          } else {
            this.collectResources();
            if (this.activeQuestion()) {
              this.handleAIQuestion();
            } else if (this.currentPlayer().actionPoints > 0) {
              setTimeout(() => this.runAITurn(), 1000);
            }
          }
        } else if (hasSpaceResearch) {
          // Hard AI builds aggressively
          const buildThreshold = isHard ? 30 : 40;
          const totalResources = player.resources.water + player.resources.energy + player.resources.metals;
          
          if (totalResources >= buildThreshold) {
            this.buildModule();
          } else {
            this.collectResources();
            if (this.activeQuestion()) {
              this.handleAIQuestion();
            } else if (this.currentPlayer().actionPoints > 0) {
              setTimeout(() => this.runAITurn(), 1000);
            }
          }
        } else {
          // Prioritize research for space tech
          if (player.resources.research < 5) {
            this.research();
            if (this.activeQuestion()) {
              this.handleAIQuestion();
            } else if (this.currentPlayer().actionPoints > 0) {
              setTimeout(() => this.runAITurn(), 1000);
            }
          } else {
            this.collectResources();
            if (this.activeQuestion()) {
              this.handleAIQuestion();
            } else if (this.currentPlayer().actionPoints > 0) {
              setTimeout(() => this.runAITurn(), 1000);
            }
          }
        }
      }
    } else {
      this.checkAutoEndTurn();
    }
  }

  private handleAIQuestion() {
    const active = this.activeQuestion();
    if (active) {
      setTimeout(() => {
        const player = this.currentPlayer();
        let accuracy = 0.7; // Medium default
        
        if (player.aiDifficulty === AIDifficulty.Easy) accuracy = 0.5;
        if (player.aiDifficulty === AIDifficulty.Hard) accuracy = 0.9;

        const isCorrect = Math.random() < accuracy;
        const index = isCorrect ? active.question.correctIndex : (active.question.correctIndex + 1) % active.question.options.length;
        this.answerQuestion(index);
      }, 4000);
    }
  }
}
