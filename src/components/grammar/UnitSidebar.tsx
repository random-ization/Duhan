import React from 'react';
import { Button } from '../ui/button';

interface UnitSidebarProps {
  units: string[];
  selectedUnit: string | null;
  onSelectUnit: (unit: string | null) => void;
}

const UnitSidebar: React.FC<UnitSidebarProps> = ({ units, selectedUnit, onSelectUnit }) => {
  return (
    <nav className="w-64 bg-white border-2 border-slate-900 rounded-xl shadow-[4px_4px_0px_0px_#0f172a] flex flex-col overflow-hidden shrink-0">
      {/* Header */}
      <div className="p-3 border-b-2 border-slate-900 bg-yellow-50 flex justify-between items-center">
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
                        w-full text-left px-3 py-2 border-2 border-slate-900 rounded-lg font-bold text-sm 
                        flex justify-between items-center transition-colors
                        ${
                          selectedUnit === null
                            ? 'bg-slate-900 text-white shadow-[2px_2px_0px_0px_#0f172a]'
                            : 'bg-slate-100 hover:bg-slate-200'
                        }
                    `}
        >
          <span>🚀 全部查看</span>
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
                                    ? 'bg-slate-900 text-white border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a]'
                                    : 'bg-white hover:bg-slate-50 border-2 border-transparent hover:border-slate-900 text-slate-600'
                                }
                            `}
            >
              <div
                className={`
                                w-6 h-6 rounded flex items-center justify-center font-black text-xs shrink-0 border-2
                                ${
                                  isSelected
                                    ? 'bg-yellow-400 text-black border-black'
                                    : 'bg-slate-100 group-hover:bg-white border-transparent group-hover:border-slate-900 text-slate-400 group-hover:text-slate-900'
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
