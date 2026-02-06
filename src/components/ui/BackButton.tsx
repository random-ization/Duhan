import React from 'react';
import { useLocalizedNavigate } from '../../hooks/useLocalizedNavigate';
import { ArrowLeft } from 'lucide-react';
import { Button } from './button';

interface BackButtonProps {
  className?: string;
  onClick?: () => void;
}

/**
 * Neo-brutalist style back button
 * Use on secondary pages to navigate back
 */
const BackButton: React.FC<BackButtonProps> = ({ className = '', onClick }) => {
  const navigate = useLocalizedNavigate();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      navigate(-1);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="auto"
      onClick={handleClick}
      className={`
        w-12 h-12 flex items-center justify-center
        bg-white border-2 border-slate-900 rounded-xl
        shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]
        hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]
        hover:translate-x-[2px] hover:translate-y-[2px]
        active:shadow-none active:translate-x-[3px] active:translate-y-[3px]
        transition-all duration-150
        ${className}
      `}
      aria-label="返回上一页"
    >
      <ArrowLeft className="w-5 h-5 text-slate-900" strokeWidth={2.5} />
    </Button>
  );
};

export default BackButton;
