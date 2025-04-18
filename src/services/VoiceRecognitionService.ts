import { ExpenseCategory } from '../models/types';

interface VoiceCommandHandler {
  onRevenueCommand: (amount: number, note?: string) => void;
  onExpenseCommand: (amount: number, category: ExpenseCategory, note?: string) => void;
  onStatusCommand: (type: 'revenue' | 'expenses' | 'profit') => void;
  onError: (error: string) => void;
  onListening: (isListening: boolean) => void;
  onResult: (result: string) => void;
}

// Define SpeechRecognition types for TypeScript
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
  error: any;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (event: Event) => void;
  onend: (event: Event) => void;
  onerror: (event: SpeechRecognitionEvent) => void;
  onresult: (event: SpeechRecognitionEvent) => void;
  start(): void;
  stop(): void;
  abort(): void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognition;

class VoiceRecognitionService {
  private recognition: SpeechRecognition | null = null;
  private isListening: boolean = false;
  private handlers: VoiceCommandHandler;
  private speechSynthesis: SpeechSynthesis;

  constructor(handlers: VoiceCommandHandler) {
    this.handlers = handlers;
    this.speechSynthesis = window.speechSynthesis;
    this.initRecognition();
  }

  private initRecognition(): void {
    if (!('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      this.handlers.onError('Speech recognition is not supported in this browser.');
      return;
    }

    // Use the appropriate constructor
    const SpeechRecognitionConstructor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition as SpeechRecognitionConstructor;
    this.recognition = new SpeechRecognitionConstructor();

    if (this.recognition) {
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.recognition.lang = 'en-US';

      this.recognition.onstart = () => {
        this.isListening = true;
        this.handlers.onListening(true);
      };

      this.recognition.onend = () => {
        this.isListening = false;
        this.handlers.onListening(false);
      };

      this.recognition.onerror = (event: SpeechRecognitionEvent) => {
        this.handlers.onError(`Speech recognition error: ${event.error}`);
        this.isListening = false;
        this.handlers.onListening(false);
      };

      this.recognition.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = event.results[0][0].transcript.trim().toLowerCase();
        this.handlers.onResult(transcript);
        this.processCommand(transcript);
      };
    }
  }

  public start(): void {
    if (this.recognition && !this.isListening) {
      this.recognition.start();
    }
  }

  public stop(): void {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
    }
  }

  public speak(text: string): void {
    if (!this.speechSynthesis) return;

    // Stop any ongoing speech
    this.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    this.speechSynthesis.speak(utterance);
  }

  private processCommand(command: string): void {
    // Revenue command pattern: "record revenue [amount]"
    const revenueMatch = command.match(/record revenue (\d+(?:\.\d+)?)(?: dollars?)?/i) ||
                         command.match(/add revenue (\d+(?:\.\d+)?)(?: dollars?)?/i);

    if (revenueMatch) {
      const amount = parseFloat(revenueMatch[1]);
      if (!isNaN(amount)) {
        this.handlers.onRevenueCommand(amount);
        this.speak(`Recorded ${amount} dollars revenue.`);
        return;
      }
    }

    // Note command pattern: "add note [text]"
    const noteMatch = command.match(/add note (.+)/i);
    if (noteMatch) {
      // This will be handled by the component that called the voice recognition
      return;
    }

    // Expense command pattern: "record expense [amount] for [category]"
    const expenseMatch = command.match(/record expense (\d+(?:\.\d+)?)(?: dollars?)? for (.+)/i) ||
                         command.match(/add expense (\d+(?:\.\d+)?)(?: dollars?)? for (.+)/i);

    if (expenseMatch) {
      const amount = parseFloat(expenseMatch[1]);
      const categoryText = expenseMatch[2].toLowerCase();

      if (!isNaN(amount)) {
        let category: ExpenseCategory = ExpenseCategory.OTHER;

        if (categoryText.includes('gas')) {
          category = ExpenseCategory.GAS;
        } else if (categoryText.includes('maintenance')) {
          category = ExpenseCategory.MAINTENANCE;
        } else if (categoryText.includes('car wash')) {
          category = ExpenseCategory.CAR_WASH;
        } else if (categoryText.includes('snack')) {
          category = ExpenseCategory.SNACKS;
        } else if (categoryText.includes('toll')) {
          category = ExpenseCategory.TOLLS;
        }

        this.handlers.onExpenseCommand(amount, category);
        this.speak(`Recorded ${amount} dollars expense for ${category}.`);
        return;
      }
    }

    // Status commands
    if (command.includes('total revenue') || command.match(/how much (have i|did i) earn(ed)?/i)) {
      this.handlers.onStatusCommand('revenue');
      return;
    }

    if (command.includes('total expenses') || command.match(/how much (have i|did i) spend/i)) {
      this.handlers.onStatusCommand('expenses');
      return;
    }

    if (command.includes('profit') || command.match(/how much (have i|did i) make/i)) {
      this.handlers.onStatusCommand('profit');
      return;
    }

    // If we get here, the command wasn't recognized
    this.speak("Sorry, I didn't understand that command. Try saying 'record revenue' or 'record expense'.");
  }
}

// Add TypeScript declarations for the Web Speech API
declare global {
  interface Window {
    SpeechRecognition: SpeechRecognitionConstructor;
    webkitSpeechRecognition: SpeechRecognitionConstructor;
  }
}

export default VoiceRecognitionService;
