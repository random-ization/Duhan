import React from 'react';
import { Button } from '../ui';

interface UnitSidebarProps {
  units: string[];
  selectedUnit: string | null;
  onSelectUnit: (unit: string | null) => void;
}

const UnitSidebar: React.FC<UnitSidebarProps> = ({ units, selectedUnit, onSelectUnit }) => {
  return (
    <nav className="w-64 bg-card border-2 border-foreground rounded-xl shadow-[4px_4px_0px_0px_#0f172a] flex flex-col overflow-hidden shrink-0">
      {/* Header */}
      <div className="p-3 border-b-2 border-foreground bg-yellow-50 flex justify-between items-center">
        <span className="font-black text-xs uppercase tracking-wider">Course Units</span>
        <span className="bg-black text-white text-[10px] px-1.5 py-0.5 rounded font-bold">
          {units.length}
        </span>
      </div>

      {/* Unit List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2 no-scrollbar">
        {/* View All Button */}
        <Button
          type="button"
          variant="ghost"
          size="auto"
          onClick={() => onSelectUnit(null)}
          className={`
                        w-full text-left px-3 py-2 border-2 border-foreground rounded-lg font-bold text-sm 
                        flex justify-between items-center transition-colors
                        ${
                          selectedUnit === null
                            ? 'bg-primary text-white shadow-[2px_2px_0px_0px_#0f172a]'
                            : 'bg-muted hover:bg-muted'
                        }
                    `}
        >
          <span>🚀 View All</span>
        </Button>

        {/* Unit Buttons */}
        {units.map((unit, index) => {
          const unitNumber = String(index + 1).padStart(2, '0');
          const unitName = unit.split(': ')[1]?.split(' (')[0] || unit;
          const isSelected = selectedUnit === unit;

          return (
            <Button
              key={unit}
              type="button"
              variant="ghost"
              size="auto"
              onClick={() => onSelectUnit(unit)}
              className={`
                                w-full text-left px-3 py-2 rounded-lg flex items-center gap-3 transition-all group
                                ${
                                  isSelected
                                    ? 'bg-primary text-white border-2 border-foreground shadow-[2px_2px_0px_0px_#0f172a]'
                                    : 'bg-card hover:bg-muted border-2 border-transparent hover:border-foreground text-muted-foreground'
                                }
                            `}
            >
              <div
                className={`
                                w-6 h-6 rounded flex items-center justify-center font-black text-xs shrink-0 border-2
                                ${
                                  isSelected
                                    ? 'bg-yellow-400 text-foreground border-foreground'
                                    : 'bg-muted group-hover:bg-card border-transparent group-hover:border-foreground text-muted-foreground group-hover:text-foreground'
                                }
                            `}
              >
                {unitNumber}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold truncate">{unitName}</div>
              </div>
              {isSelected && <div className="w-2 h-2 rounded-full bg-green-400"></div>}
            </Button>
          );
        })}
      </div>
    </nav>
  );
};

export default UnitSidebar;
