'use client';

import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faClock, faCalendarAlt } from '@fortawesome/free-solid-svg-icons';

export default function DateClock() {
  const [time, setTime] = useState(null);

  useEffect(() => {
    setTime(new Date());
    const interval = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!time) {
    return (
      <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-xl p-2 px-4 text-white flex items-center space-x-3 opacity-50">
        <div className="w-4 h-4 bg-white/20 rounded-full animate-pulse"></div>
        <div className="h-4 w-28 bg-white/20 rounded animate-pulse"></div>
      </div>
    );
  }

  const timeString = time.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  const dateString = time.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-2.5 px-4 text-white flex flex-row items-center gap-4 sm:gap-6 shadow-md transition-all duration-300 hover:bg-white/15">
      <div className="flex items-center space-x-2">
        <FontAwesomeIcon icon={faCalendarAlt} className="text-orange-300 text-sm" />
        <span className="text-xs sm:text-sm font-semibold tracking-wide">{dateString}</span>
      </div>
      
      {/* Decorative vertical divider line */}
      <div className="h-5 w-[1px] bg-white/20"></div>
      
      <div className="flex items-center space-x-2">
        <FontAwesomeIcon icon={faClock} className="text-green-300 text-sm animate-[pulse_2s_infinite]" />
        <span className="text-xs sm:text-sm font-mono font-bold tracking-wider">{timeString}</span>
      </div>
    </div>
  );
}
