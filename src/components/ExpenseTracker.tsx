import React, { useState, useEffect } from 'react';
import { Expense, ExpenseCategory } from '../models/types';
import { saveExpense, getExpenses } from '../utils/storage';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import VoiceRecognitionService from '../services/VoiceRecognitionService';

interface ExpenseTrackerProps {
  voiceService: VoiceRecognitionService | null;
  onDataChange: () => void;
  lastCommand: string;
}

const ExpenseTracker: React.FC<ExpenseTrackerProps> = ({
  voiceService,
  onDataChange,
  lastCommand
}) => {
  const [amount, setAmount] = useState<string>('');
  const [category, setCategory] = useState<ExpenseCategory>(ExpenseCategory.GAS);
  const [note, setNote] = useState<string>('');
  const [recentExpenses, setRecentExpenses] = useState<Expense[]>([]);
  const [pendingExpense, setPendingExpense] = useState<{amount: number, category: ExpenseCategory} | null>(null);
  const [lastProcessedCommand, setLastProcessedCommand] = useState<string>('');
  const [processingLock, setProcessingLock] = useState<boolean>(false);

  // Load recent expense entries
  useEffect(() => {
    const loadRecentExpenses = () => {
      const allExpenses = getExpenses();
      // Sort by timestamp descending (newest first)
      const sorted = [...allExpenses].sort((a, b) => b.timestamp - a.timestamp);
      // Take only the 5 most recent entries
      setRecentExpenses(sorted.slice(0, 5));
    };

    loadRecentExpenses();
  }, []);

  // Process voice commands
  useEffect(() => {
    if (!lastCommand || lastCommand === lastProcessedCommand || processingLock) return;

    console.log('ExpenseTracker processing command:', lastCommand);

    // Set processing lock to prevent duplicate processing
    setProcessingLock(true);
    setLastProcessedCommand(lastCommand);

    // Release the lock after a delay
    const lockTimeout = setTimeout(() => {
      setProcessingLock(false);
    }, 3000);

    // Check for expense command
    const expenseMatch = lastCommand.match(/record expense (\d+(?:\.\d+)?)(?: dollars?)? for (.+)/i) ||
                         lastCommand.match(/add expense (\d+(?:\.\d+)?)(?: dollars?)? for (.+)/i) ||
                         lastCommand.match(/record expense (\w+)(?: dollars?)? for (.+)/i) ||
                         lastCommand.match(/add expense (\w+)(?: dollars?)? for (.+)/i);

    if (expenseMatch) {
      console.log('Expense match found in component:', expenseMatch);
      let amountValue: number;

      // Try to parse the amount as a number
      if (!isNaN(parseFloat(expenseMatch[1]))) {
        amountValue = parseFloat(expenseMatch[1]);
      } else {
        // Try to convert word numbers to digits
        amountValue = wordToNumber(expenseMatch[1]);
      }

      const categoryText = expenseMatch[2].toLowerCase();
      console.log('Parsed amount in component:', amountValue, 'Category text:', categoryText);

      if (!isNaN(amountValue) && amountValue > 0) {
        let expenseCategory: ExpenseCategory = ExpenseCategory.OTHER;

        if (categoryText.includes('gas')) {
          expenseCategory = ExpenseCategory.GAS;
        } else if (categoryText.includes('maintenance')) {
          expenseCategory = ExpenseCategory.MAINTENANCE;
        } else if (categoryText.includes('car wash')) {
          expenseCategory = ExpenseCategory.CAR_WASH;
        } else if (categoryText.includes('snack')) {
          expenseCategory = ExpenseCategory.SNACKS;
        } else if (categoryText.includes('toll')) {
          expenseCategory = ExpenseCategory.TOLLS;
        }

        setAmount(amountValue.toString());
        setCategory(expenseCategory);
        setPendingExpense({ amount: amountValue, category: expenseCategory });

        // If there's no pending note, save immediately
        const saveTimeout = setTimeout(() => {
          if (pendingExpense && pendingExpense.amount === amountValue) {
            handleSaveExpense(amountValue, expenseCategory);
            setPendingExpense(null);
          }
        }, 3000); // Wait 3 seconds for a potential note command

        // Clean up the timeout if the component unmounts
        return () => {
          clearTimeout(saveTimeout);
          clearTimeout(lockTimeout);
        };
      }
    }

    // Check for note command if we have a pending expense
    if (pendingExpense !== null) {
      const noteMatch = lastCommand.match(/add note (.+)/i);
      if (noteMatch) {
        console.log('Note match found in component:', noteMatch);
        const noteText = noteMatch[1];
        setNote(noteText);

        // Automatically save the entry with the note
        handleSaveExpense(pendingExpense.amount, pendingExpense.category, noteText);
        setPendingExpense(null);
      }
    }

    // Clean up the timeout if the component unmounts or if we didn't return earlier
    return () => clearTimeout(lockTimeout);
  }, [lastCommand, pendingExpense, lastProcessedCommand, processingLock]);

  // Helper function to convert word numbers to digits
  const wordToNumber = (word: string): number => {
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
  };

  const handleSaveExpense = (amountValue: number, categoryValue: ExpenseCategory, noteValue: string = '') => {
    const newExpense: Expense = {
      id: Date.now().toString(),
      amount: amountValue,
      category: categoryValue,
      timestamp: Date.now(),
      note: noteValue || undefined
    };

    saveExpense(newExpense);

    // Update the recent expenses list
    setRecentExpenses([newExpense, ...recentExpenses].slice(0, 5));

    // Reset form
    setAmount('');
    setCategory(ExpenseCategory.GAS);
    setNote('');

    // Notify parent component
    onDataChange();

    // Provide voice feedback
    if (voiceService) {
      voiceService.speak(`Recorded ${formatCurrency(amountValue)} expense for ${categoryValue}.`);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const amountValue = parseFloat(amount);
    if (isNaN(amountValue) || amountValue <= 0) {
      if (voiceService) {
        voiceService.speak('Please enter a valid amount.');
      }
      return;
    }

    handleSaveExpense(amountValue, category, note);
  };

  return (
    <div className="expense-tracker">
      <h2>Record Expense</h2>

      <form onSubmit={handleSubmit} className="entry-form">
        <div className="form-group">
          <label htmlFor="amount">Amount ($)</label>
          <input
            type="number"
            id="amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Enter amount"
            step="0.01"
            min="0"
            required
            className="form-control"
          />
        </div>

        <div className="form-group">
          <label htmlFor="category">Category</label>
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
            className="form-control"
          >
            {Object.values(ExpenseCategory).map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="note">Note (Optional)</label>
          <input
            type="text"
            id="note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add a note"
            className="form-control"
          />
        </div>

        <button type="submit" className="submit-button">
          Save Expense
        </button>
      </form>

      <div className="voice-instructions">
        <h3>Voice Commands</h3>
        <p>Say "Record expense [amount] for [category]" to add a new entry.</p>
        <p>Then say "Add note [your note]" to add details.</p>
      </div>

      <div className="recent-entries">
        <h3>Recent Expenses</h3>
        {recentExpenses.length === 0 ? (
          <p>No recent expense entries.</p>
        ) : (
          <ul className="entry-list">
            {recentExpenses.map((exp) => (
              <li key={exp.id} className="entry-item">
                <div className="entry-amount">{formatCurrency(exp.amount)}</div>
                <div className="entry-details">
                  <div className="entry-category">{exp.category}</div>
                  <div className="entry-time">{formatDateTime(exp.timestamp)}</div>
                  {exp.note && <div className="entry-note">{exp.note}</div>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default ExpenseTracker;
