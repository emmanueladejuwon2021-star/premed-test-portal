import { Moon, Sun } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

export default function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, setTheme } = useAppContext();

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  return (
    <button
      onClick={toggleTheme}
      className={`p-2 rounded-xl transition-colors ${
        theme === 'light' 
          ? 'bg-slate-200 text-slate-700 hover:bg-slate-300' 
          : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
      } ${className}`}
      aria-label="Toggle theme"
    >
      {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
    </button>
  );
}
