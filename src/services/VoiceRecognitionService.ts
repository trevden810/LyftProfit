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
    console.log('Processing command:', command);

    // Simple revenue command pattern: just "record revenue"
    if (command.match(/^record revenue$/i) || command.match(/^add revenue$/i)) {
      this.speak('Please say a number for the revenue amount');
      return;
    }

    // Simple expense command pattern: just "record expense"
    if (command.match(/^record expense$/i) || command.match(/^add expense$/i)) {
      this.speak('Please say a number for the expense amount and a category');
      return;
    }

    // Revenue command pattern: "record revenue [amount]"
    // More flexible pattern to catch various ways of saying numbers
    const revenueMatch = command.match(/record revenue (\d+(?:\.\d+)?)(?: dollars?)?/i) ||
                         command.match(/add revenue (\d+(?:\.\d+)?)(?: dollars?)?/i) ||
                         command.match(/record revenue (\w+)(?: dollars?)?/i) ||
                         command.match(/add revenue (\w+)(?: dollars?)?/i);

    if (revenueMatch) {
      console.log('Revenue match found:', revenueMatch);
      let amount: number;

      // Try to parse the amount as a number
      if (!isNaN(parseFloat(revenueMatch[1]))) {
        amount = parseFloat(revenueMatch[1]);
      } else {
        // Try to convert word numbers to digits
        amount = this.wordToNumber(revenueMatch[1]);
      }

      console.log('Parsed amount:', amount);

      if (!isNaN(amount) && amount > 0) {
        this.handlers.onRevenueCommand(amount);
        this.speak(`Recorded ${amount} dollars revenue.`);
        return;
      } else {
        this.speak('I could not understand the amount. Please try again with a clear number.');
        return;
      }
    }

    // Note command pattern: "add note [text]"
    const noteMatch = command.match(/add note (.+)/i);
    if (noteMatch) {
      console.log('Note match found:', noteMatch);
      // This will be handled by the component that called the voice recognition
      return;
    }

    // Expense command pattern: "record expense [amount] for [category]"
    // More flexible pattern to catch various ways of saying numbers and categories
    const expenseMatch = command.match(/record expense (\d+(?:\.\d+)?)(?: dollars?)? for (.+)/i) ||
                         command.match(/add expense (\d+(?:\.\d+)?)(?: dollars?)? for (.+)/i) ||
                         command.match(/record expense (\w+)(?: dollars?)? for (.+)/i) ||
                         command.match(/add expense (\w+)(?: dollars?)? for (.+)/i);

    if (expenseMatch) {
      console.log('Expense match found:', expenseMatch);
      let amount: number;

      // Try to parse the amount as a number
      if (!isNaN(parseFloat(expenseMatch[1]))) {
        amount = parseFloat(expenseMatch[1]);
      } else {
        // Try to convert word numbers to digits
        amount = this.wordToNumber(expenseMatch[1]);
      }

      const categoryText = expenseMatch[2].toLowerCase();
      console.log('Parsed amount:', amount, 'Category text:', categoryText);

      if (!isNaN(amount) && amount > 0) {
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
      } else {
        this.speak('I could not understand the amount. Please try again with a clear number.');
        return;
      }
    }

    // Status commands
    if (command.includes('total revenue') || command.match(/how much (have i|did i) earn(ed)?/i)) {
      console.log('Status command for revenue');
      this.handlers.onStatusCommand('revenue');
      return;
    }

    if (command.includes('total expenses') || command.match(/how much (have i|did i) spend/i)) {
      console.log('Status command for expenses');
      this.handlers.onStatusCommand('expenses');
      return;
    }

    if (command.includes('profit') || command.match(/how much (have i|did i) make/i)) {
      console.log('Status command for profit');
      this.handlers.onStatusCommand('profit');
      return;
    }

    // If we get here, the command wasn't recognized
    console.log('Command not recognized');
    this.speak("Sorry, I didn't understand that command. Try saying 'record revenue' or 'record expense'.");
  }

  // Helper method to convert word numbers to digits
  private wordToNumber(word: string): number {
    const wordMap: {[key: string]: number} = {
      'zero': 0, 'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
      'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
      'eleven': 11, 'twelve': 12, 'thirteen': 13, 'fourteen': 14, 'fifteen': 15,
      'sixteen': 16, 'seventeen': 17, 'eighteen': 18, 'nineteen': 19, 'twenty': 20,
      'thirty': 30, 'forty': 40, 'fifty': 50, 'sixty': 60, 'seventy': 70,
      'eighty': 80, 'ninety': 90
    };

    // Clean up the word and convert to lowercase
    const cleanWord = word.toLowerCase().trim();

    // Check if it's a simple number word
    if (wordMap[cleanWord] !== undefined) {
      return wordMap[cleanWord];
    }

    // Handle compound numbers like "twenty five"
    const parts = cleanWord.split(/\s+/);
    if (parts.length === 2) {
      const tens = wordMap[parts[0]];
      const ones = wordMap[parts[1]];
      if (tens !== undefined && ones !== undefined && tens % 10 === 0) {
        return tens + ones;
      }
    }

    // If we can't parse it, return NaN
    return NaN;
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
