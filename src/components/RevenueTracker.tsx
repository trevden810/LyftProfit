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

    // Check for revenue command
    const revenueMatch = lastCommand.match(/record revenue (\d+(?:\.\d+)?)(?: dollars?)?/i) || 
                         lastCommand.match(/add revenue (\d+(?:\.\d+)?)(?: dollars?)?/i);
    
    if (revenueMatch) {
      const amount = parseFloat(revenueMatch[1]);
      if (!isNaN(amount)) {
        setAmount(amount.toString());
        setPendingAmount(amount);
      }
    }

    // Check for note command if we have a pending amount
    if (pendingAmount !== null) {
      const noteMatch = lastCommand.match(/add note (.+)/i);
      if (noteMatch) {
        const noteText = noteMatch[1];
        setNote(noteText);
        
        // Automatically save the entry with the note
        handleSaveRevenue(pendingAmount, noteText);
        setPendingAmount(null);
      }
    }
  }, [lastCommand, pendingAmount]);

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
