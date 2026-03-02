import { useState, useEffect } from 'react';
import { ThemeSettings } from '../types';

export const useTheme = () => {
  const [settings, setSettings] = useState<ThemeSettings>(() => {
    const saved = localStorage.getItem('themeSettings');
    return saved ? JSON.parse(saved) : {
      theme: 'auto',
      darkTheme: 'default',
      autoSchedule: true,
      scheduleStart: '20:00',
      scheduleEnd: '07:00'
    };
  });
  
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>('light');
  
  useEffect(() => {
    const applyTheme = () => {
      let shouldBeDark = false;
      
      if (settings.theme === 'dark') {
        shouldBeDark = true;
      } else if (settings.theme === 'auto') {
        if (settings.autoSchedule) {
          shouldBeDark = isInDarkSchedule(settings.scheduleStart, settings.scheduleEnd);
        } else {
          shouldBeDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        }
      }
      
      setCurrentTheme(shouldBeDark ? 'dark' : 'light');
      document.documentElement.classList.toggle('dark', shouldBeDark);
      
      if (shouldBeDark) {
        document.documentElement.setAttribute('data-dark-theme', settings.darkTheme);
      }
    };
    
    applyTheme();
    localStorage.setItem('themeSettings', JSON.stringify(settings));
    
    if (settings.theme === 'auto' && settings.autoSchedule) {
      const interval = setInterval(applyTheme, 60000);
      return () => clearInterval(interval);
    }
  }, [settings]);
  
  return {
    settings,
    currentTheme,
    updateSettings: (newSettings: Partial<ThemeSettings>) => {
      setSettings(prev => ({ ...prev, ...newSettings }));
    }
  };
};

const isInDarkSchedule = (start: string, end: string): boolean => {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTime = currentHour * 60 + currentMinute;
  
  const [startHour, startMin] = start.split(':').map(Number);
  const [endHour, endMin] = end.split(':').map(Number);
  const startTime = startHour * 60 + startMin;
  const endTime = endHour * 60 + endMin;
  
  if (startTime < endTime) {
    return currentTime >= startTime && currentTime < endTime;
  } else {
    return currentTime >= startTime || currentTime < endTime;
  }
};
