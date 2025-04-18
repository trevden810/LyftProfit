import React, { useMemo } from 'react';
import { Revenue, Expense, ExpenseCategory } from '../models/types';
import { formatCurrency } from '../utils/formatters';

interface SummaryProps {
  revenue: Revenue[];
  expenses: Expense[];
}

const Summary: React.FC<SummaryProps> = ({ revenue, expenses }) => {
  // Calculate summary data
  const summaryData = useMemo(() => {
    const totalRevenue = revenue.reduce((sum, rev) => sum + rev.amount, 0);
    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const netProfit = totalRevenue - totalExpenses;
    
    // Calculate expenses by category
    const expensesByCategory: Record<ExpenseCategory, number> = {
      [ExpenseCategory.GAS]: 0,
      [ExpenseCategory.MAINTENANCE]: 0,
      [ExpenseCategory.CAR_WASH]: 0,
      [ExpenseCategory.SNACKS]: 0,
      [ExpenseCategory.TOLLS]: 0,
      [ExpenseCategory.OTHER]: 0
    };
    
    expenses.forEach((exp) => {
      expensesByCategory[exp.category] += exp.amount;
    });
    
    return {
      totalRevenue,
      totalExpenses,
      netProfit,
      expensesByCategory
    };
  }, [revenue, expenses]);
  
  // Calculate profit percentage
  const profitPercentage = useMemo(() => {
    if (summaryData.totalRevenue === 0) return 0;
    return (summaryData.netProfit / summaryData.totalRevenue) * 100;
  }, [summaryData]);

  return (
    <div className="summary">
      <h2>Today's Summary</h2>
      
      <div className="summary-cards">
        <div className="summary-card revenue-card">
          <h3>Total Revenue</h3>
          <div className="amount">{formatCurrency(summaryData.totalRevenue)}</div>
        </div>
        
        <div className="summary-card expenses-card">
          <h3>Total Expenses</h3>
          <div className="amount">{formatCurrency(summaryData.totalExpenses)}</div>
        </div>
        
        <div className={`summary-card profit-card ${summaryData.netProfit < 0 ? 'negative' : ''}`}>
          <h3>Net Profit</h3>
          <div className="amount">{formatCurrency(summaryData.netProfit)}</div>
          <div className="percentage">
            {profitPercentage.toFixed(1)}% of revenue
          </div>
        </div>
      </div>
      
      <div className="expense-breakdown">
        <h3>Expense Breakdown</h3>
        
        {Object.entries(summaryData.expensesByCategory)
          .filter(([_, amount]) => amount > 0)
          .sort(([_, a], [__, b]) => b - a) // Sort by amount descending
          .map(([category, amount]) => (
            <div key={category} className="expense-category-item">
              <div className="category-name">{category}</div>
              <div className="category-amount">{formatCurrency(amount)}</div>
              <div className="category-percentage">
                {summaryData.totalExpenses > 0
                  ? ((amount / summaryData.totalExpenses) * 100).toFixed(1)
                  : '0'}%
              </div>
              <div 
                className="category-bar"
                style={{ 
                  width: `${summaryData.totalExpenses > 0 
                    ? (amount / summaryData.totalExpenses) * 100 
                    : 0}%` 
                }}
              />
            </div>
          ))}
      </div>
      
      <div className="voice-instructions">
        <h3>Voice Commands</h3>
        <p>Ask "What's my total revenue today?" to hear your earnings.</p>
        <p>Ask "What are my expenses today?" to hear your costs.</p>
        <p>Ask "What's my profit so far?" to hear your net profit.</p>
      </div>
    </div>
  );
};

export default Summary;
