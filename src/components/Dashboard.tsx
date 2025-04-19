import React, { useState, useEffect } from 'react';
import { Revenue, Expense, ExpenseCategory } from '../models/types';
import { getTodayData } from '../utils/storage';
import { formatCurrency } from '../utils/formatters';
import VoiceRecognitionService from '../services/VoiceRecognitionService';
import RevenueTracker from './RevenueTracker';
import ExpenseTracker from './ExpenseTracker';
import Summary from './Summary';

const Dashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'revenue' | 'expenses' | 'summary'>('summary');
  const [revenue, setRevenue] = useState<Revenue[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [lastCommand, setLastCommand] = useState('');
  const [voiceService, setVoiceService] = useState<VoiceRecognitionService | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [debugMessages, setDebugMessages] = useState<string[]>([]);

  // Initialize voice recognition service
  useEffect(() => {
    const handlers = {
      onRevenueCommand: (_amount: number, _note?: string) => {
        setActiveTab('revenue');
        // The actual recording will be handled by the RevenueTracker component
      },
      onExpenseCommand: (_amount: number, _category: ExpenseCategory, _note?: string) => {
        setActiveTab('expenses');
        // The actual recording will be handled by the ExpenseTracker component
      },
      onStatusCommand: (type: 'revenue' | 'expenses' | 'profit') => {
        if (type === 'profit') {
          setActiveTab('summary');
        } else {
          setActiveTab(type as 'revenue' | 'expenses');
        }

        const todayData = getTodayData();
        const totalRevenue = todayData.revenue.reduce((sum, rev) => sum + rev.amount, 0);
        const totalExpenses = todayData.expenses.reduce((sum, exp) => sum + exp.amount, 0);
        const profit = totalRevenue - totalExpenses;

        let message = '';
        if (type === 'revenue') {
          message = `Your total revenue today is ${formatCurrency(totalRevenue)}.`;
        } else if (type === 'expenses') {
          message = `Your total expenses today are ${formatCurrency(totalExpenses)}.`;
        } else {
          message = `Your profit so far today is ${formatCurrency(profit)}.`;
        }

        if (voiceService) {
          voiceService.speak(message);
        }
      },
      onError: (error: string) => {
        console.error(error);
      },
      onListening: (listening: boolean) => {
        setIsListening(listening);
      },
      onResult: (result: string) => {
        setLastCommand(result);
        setDebugMessages(prev => [...prev, `Command received: ${result}`].slice(-10));
      }
    };

    const service = new VoiceRecognitionService(handlers);
    setVoiceService(service);

    return () => {
      if (service) {
        service.stop();
      }
    };
  }, []);

  // Load today's data
  useEffect(() => {
    const loadTodayData = () => {
      const todayData = getTodayData();
      setRevenue(todayData.revenue);
      setExpenses(todayData.expenses);
    };

    loadTodayData();

    // Refresh data every minute
    const intervalId = setInterval(loadTodayData, 60000);

    return () => clearInterval(intervalId);
  }, []);

  const toggleListening = () => {
    if (voiceService) {
      if (isListening) {
        voiceService.stop();
      } else {
        voiceService.start();
      }
    }
  };

  const handleDataChange = () => {
    const todayData = getTodayData();
    setRevenue(todayData.revenue);
    setExpenses(todayData.expenses);
  };

  return (
    <div className="dashboard">
      <header className="app-header">
        <h1>Lyft Profit Tracker</h1>
        <button
          className={`voice-button ${isListening ? 'listening' : ''}`}
          onClick={toggleListening}
        >
          {isListening ? 'Listening...' : 'Start Voice Control'}
        </button>
        {lastCommand && (
          <div className="last-command">
            <small>Last command: "{lastCommand}"</small>
            <button
              className="debug-toggle"
              onClick={() => setShowDebug(!showDebug)}
              style={{ marginLeft: '10px', fontSize: '0.8rem', padding: '2px 5px' }}
            >
              {showDebug ? 'Hide Debug' : 'Show Debug'}
            </button>
          </div>
        )}

        {showDebug && (
          <div className="debug-panel" style={{
            backgroundColor: '#f0f0f0',
            padding: '10px',
            margin: '10px 0',
            borderRadius: '5px',
            textAlign: 'left',
            fontSize: '0.8rem'
          }}>
            <h4>Debug Messages:</h4>
            <ul style={{ listStyle: 'none', padding: '0', margin: '0' }}>
              {debugMessages.map((msg, index) => (
                <li key={index} style={{ marginBottom: '5px' }}>{msg}</li>
              ))}
            </ul>
            <div style={{ marginTop: '10px' }}>
              <button
                onClick={() => {
                  if (voiceService) {
                    voiceService.speak('Hello, this is your Lyft Profit Tracker. I\'ll help you track your earnings and expenses.');
                    setDebugMessages(prev => [...prev, 'Testing Demi Moore-like voice'].slice(-10));
                  }
                }}
                style={{ fontSize: '0.8rem', padding: '2px 5px', marginRight: '5px' }}
              >
                Test Demi Moore Voice
              </button>
              <button
                onClick={() => console.log('Current state:', { revenue, expenses, lastCommand, isListening })}
                style={{ fontSize: '0.8rem', padding: '2px 5px' }}
              >
                Log State
              </button>
            </div>
          </div>
        )}
      </header>

      <div className="tab-navigation">
        <button
          className={`tab-button ${activeTab === 'summary' ? 'active' : ''}`}
          onClick={() => setActiveTab('summary')}
        >
          Summary
        </button>
        <button
          className={`tab-button ${activeTab === 'revenue' ? 'active' : ''}`}
          onClick={() => setActiveTab('revenue')}
        >
          Revenue
        </button>
        <button
          className={`tab-button ${activeTab === 'expenses' ? 'active' : ''}`}
          onClick={() => setActiveTab('expenses')}
        >
          Expenses
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'summary' && (
          <Summary revenue={revenue} expenses={expenses} />
        )}
        {activeTab === 'revenue' && (
          <RevenueTracker
            voiceService={voiceService}
            onDataChange={handleDataChange}
            lastCommand={lastCommand}
          />
        )}
        {activeTab === 'expenses' && (
          <ExpenseTracker
            voiceService={voiceService}
            onDataChange={handleDataChange}
            lastCommand={lastCommand}
          />
        )}
      </div>
    </div>
  );
};

export default Dashboard;
