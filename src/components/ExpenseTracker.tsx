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
    if (!lastCommand) return;

    // Check for expense command
    const expenseMatch = lastCommand.match(/record expense (\d+(?:\.\d+)?)(?: dollars?)? for (.+)/i) ||
                         lastCommand.match(/add expense (\d+(?:\.\d+)?)(?: dollars?)? for (.+)/i);
    
    if (expenseMatch) {
      const amount = parseFloat(expenseMatch[1]);
      const categoryText = expenseMatch[2].toLowerCase();
      
      if (!isNaN(amount)) {
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
        
        setAmount(amount.toString());
        setCategory(expenseCategory);
        setPendingExpense({ amount, category: expenseCategory });
      }
    }

    // Check for note command if we have a pending expense
    if (pendingExpense !== null) {
      const noteMatch = lastCommand.match(/add note (.+)/i);
      if (noteMatch) {
        const noteText = noteMatch[1];
        setNote(noteText);
        
        // Automatically save the entry with the note
        handleSaveExpense(pendingExpense.amount, pendingExpense.category, noteText);
        setPendingExpense(null);
      }
    }
  }, [lastCommand, pendingExpense]);

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
