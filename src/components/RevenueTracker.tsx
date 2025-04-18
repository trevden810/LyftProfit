import React, { useState, useEffect } from 'react';
import { Revenue } from '../models/types';
import { saveRevenue, getRevenue } from '../utils/storage';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import VoiceRecognitionService from '../services/VoiceRecognitionService';

interface RevenueTrackerProps {
  voiceService: VoiceRecognitionService | null;
  onDataChange: () => void;
  lastCommand: string;
}

const RevenueTracker: React.FC<RevenueTrackerProps> = ({
  voiceService,
  onDataChange,
  lastCommand
}) => {
  const [amount, setAmount] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [recentRevenue, setRecentRevenue] = useState<Revenue[]>([]);
  const [pendingAmount, setPendingAmount] = useState<number | null>(null);

  // Load recent revenue entries
  useEffect(() => {
    const loadRecentRevenue = () => {
      const allRevenue = getRevenue();
      // Sort by timestamp descending (newest first)
      const sorted = [...allRevenue].sort((a, b) => b.timestamp - a.timestamp);
      // Take only the 5 most recent entries
      setRecentRevenue(sorted.slice(0, 5));
    };

    loadRecentRevenue();
  }, []);

  // Process voice commands
  useEffect(() => {
    if (!lastCommand) return;

    console.log('RevenueTracker processing command:', lastCommand);

    // Check for revenue command
    const revenueMatch = lastCommand.match(/record revenue (\d+(?:\.\d+)?)(?: dollars?)?/i) ||
                         lastCommand.match(/add revenue (\d+(?:\.\d+)?)(?: dollars?)?/i) ||
                         lastCommand.match(/record revenue (\w+)(?: dollars?)?/i) ||
                         lastCommand.match(/add revenue (\w+)(?: dollars?)?/i);

    if (revenueMatch) {
      console.log('Revenue match found in component:', revenueMatch);
      let amountValue: number;

      // Try to parse the amount as a number
      if (!isNaN(parseFloat(revenueMatch[1]))) {
        amountValue = parseFloat(revenueMatch[1]);
      } else {
        // Try to convert word numbers to digits
        amountValue = wordToNumber(revenueMatch[1]);
      }

      console.log('Parsed amount in component:', amountValue);

      if (!isNaN(amountValue) && amountValue > 0) {
        setAmount(amountValue.toString());
        setPendingAmount(amountValue);

        // If there's no pending note, save immediately
        setTimeout(() => {
          if (pendingAmount === amountValue) {
            handleSaveRevenue(amountValue);
            setPendingAmount(null);
          }
        }, 3000); // Wait 3 seconds for a potential note command
      }
    }

    // Check for note command if we have a pending amount
    if (pendingAmount !== null) {
      const noteMatch = lastCommand.match(/add note (.+)/i);
      if (noteMatch) {
        console.log('Note match found in component:', noteMatch);
        const noteText = noteMatch[1];
        setNote(noteText);

        // Automatically save the entry with the note
        handleSaveRevenue(pendingAmount, noteText);
        setPendingAmount(null);
      }
    }
  }, [lastCommand, pendingAmount]);

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

  const handleSaveRevenue = (amountValue: number, noteValue: string = '') => {
    const newRevenue: Revenue = {
      id: Date.now().toString(),
      amount: amountValue,
      timestamp: Date.now(),
      note: noteValue || undefined
    };

    saveRevenue(newRevenue);

    // Update the recent revenue list
    setRecentRevenue([newRevenue, ...recentRevenue].slice(0, 5));

    // Reset form
    setAmount('');
    setNote('');

    // Notify parent component
    onDataChange();

    // Provide voice feedback
    if (voiceService) {
      voiceService.speak(`Recorded ${formatCurrency(amountValue)} revenue.`);
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

    handleSaveRevenue(amountValue, note);
  };

  return (
    <div className="revenue-tracker">
      <h2>Record Revenue</h2>

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
          Save Revenue
        </button>
      </form>

      <div className="voice-instructions">
        <h3>Voice Commands</h3>
        <p>Say "Record revenue [amount]" to add a new entry.</p>
        <p>Then say "Add note [your note]" to add details.</p>
      </div>

      <div className="recent-entries">
        <h3>Recent Revenue</h3>
        {recentRevenue.length === 0 ? (
          <p>No recent revenue entries.</p>
        ) : (
          <ul className="entry-list">
            {recentRevenue.map((rev) => (
              <li key={rev.id} className="entry-item">
                <div className="entry-amount">{formatCurrency(rev.amount)}</div>
                <div className="entry-details">
                  <div className="entry-time">{formatDateTime(rev.timestamp)}</div>
                  {rev.note && <div className="entry-note">{rev.note}</div>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default RevenueTracker;
