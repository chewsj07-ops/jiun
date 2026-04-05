import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay, 
  eachDayOfInterval,
  setYear,
  setMonth
} from 'date-fns';
import { cn } from '../lib/utils';

// Simple Lotus SVG icon
const LotusIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M12 22C12 22 17 19 19 14C21 9 19 4 19 4C19 4 16 6 12 10C8 6 5 4 5 4C5 4 3 9 5 14C7 19 12 22 12 22Z" opacity="0.4"/>
    <path d="M12 22C12 22 14 18 14 12C14 6 12 2 12 2C12 2 10 6 10 12C10 18 12 22 12 22Z" />
    <path d="M12 22C12 22 19 20 22 15C25 10 21 6 21 6C21 6 18 9 14 12C13 13 12 22 12 22Z" opacity="0.7"/>
    <path d="M12 22C12 22 5 20 2 15C-1 10 3 6 3 6C3 6 6 9 10 12C11 13 12 22 12 22Z" opacity="0.7"/>
  </svg>
);

interface CustomCalendarProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  recordDates: string[]; // Array of 'YYYY-MM-DD' strings
}

export const CustomCalendar: React.FC<CustomCalendarProps> = ({ selectedDate, onSelectDate, recordDates }) => {
  const [currentMonth, setCurrentMonth] = useState(selectedDate);

  useEffect(() => {
    setCurrentMonth(selectedDate);
  }, [selectedDate]);

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCurrentMonth(setYear(currentMonth, parseInt(e.target.value)));
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCurrentMonth(setMonth(currentMonth, parseInt(e.target.value)));
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const dateFormat = "yyyy-MM-dd";
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  const currentYear = currentMonth.getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear - 5 + i);
  const months = Array.from({ length: 12 }, (_, i) => i);

  return (
    <div className="bg-white rounded-2xl p-4 border border-zen-accent/10 shadow-sm w-[300px] sm:w-[340px] mx-auto">
      <div className="flex justify-between items-center mb-4">
        <button onClick={prevMonth} className="p-1 hover:bg-zen-bg rounded-lg text-zen-accent transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex gap-2 font-serif font-bold text-zen-ink">
          <select 
            value={currentMonth.getMonth()} 
            onChange={handleMonthChange}
            className="bg-transparent outline-none cursor-pointer hover:text-zen-accent transition-colors"
          >
            {months.map(m => (
              <option key={m} value={m}>{format(setMonth(new Date(), m), 'MMM')}</option>
            ))}
          </select>
          <select 
            value={currentYear} 
            onChange={handleYearChange}
            className="bg-transparent outline-none cursor-pointer hover:text-zen-accent transition-colors"
          >
            {years.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <button onClick={nextMonth} className="p-1 hover:bg-zen-bg rounded-lg text-zen-accent transition-colors">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map(day => (
          <div key={day} className="text-center text-xs font-bold text-zen-accent/50 uppercase tracking-wider py-1">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day, i) => {
          const dateStr = format(day, dateFormat);
          const hasRecord = recordDates.includes(dateStr);
          const isSelected = isSameDay(day, selectedDate);
          const isCurrentMonth = isSameMonth(day, currentMonth);

          return (
            <button
              key={i}
              onClick={() => onSelectDate(day)}
              className={cn(
                "relative h-12 w-full flex flex-col items-center justify-center rounded-xl transition-all",
                !isCurrentMonth && "opacity-30",
                isSelected ? "bg-zen-accent text-white shadow-md" : "hover:bg-zen-bg text-zen-ink",
                hasRecord && !isSelected && "text-pink-500 font-bold"
              )}
            >
              <span className="text-sm z-10 leading-none mt-1">{format(day, 'd')}</span>
              <div className="h-4 mt-1 flex items-center justify-center pointer-events-none">
                {hasRecord && (
                  <LotusIcon className={cn("w-3.5 h-3.5", isSelected ? "text-white" : "text-pink-400")} />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};