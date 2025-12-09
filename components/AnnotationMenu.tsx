import React, { useState } from 'react';
import { MoreHorizontal, FileText, Type, ChevronDown, Check, X, Trash2, BookmarkPlus } from 'lucide-react';

interface AnnotationMenuProps {
    visible: boolean;
    position: { top: number; left: number } | null;
    onAddNote: () => void;
    onHighlight?: (color: string) => void;
    selectedColor: string;
    setSelectedColor: (val: string) => void;
    onSaveWord?: (text: string) => void;
    selectionText?: string;
    onClose: () => void;
    onDelete?: () => void; // Optional delete for existing annotations
    labels: { [key: string]: string };
}

const COLORS = [
    { name: 'yellow', bgClass: 'bg-yellow-300', ringClass: 'ring-yellow-500', indicator: 'bg-yellow-400' },
    { name: 'green', bgClass: 'bg-green-300', ringClass: 'ring-green-500', indicator: 'bg-green-400' },
    { name: 'blue', bgClass: 'bg-blue-300', ringClass: 'ring-blue-500', indicator: 'bg-blue-400' },
    { name: 'pink', bgClass: 'bg-pink-300', ringClass: 'ring-pink-500', indicator: 'bg-pink-400' },
];

const AnnotationMenu: React.FC<AnnotationMenuProps> = ({
    visible,
    position,
    onAddNote,
    onHighlight,
    selectedColor,
    setSelectedColor,
    onSaveWord,
    selectionText,
    onClose,
    onDelete,
    labels,
}) => {
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [showMoreMenu, setShowMoreMenu] = useState(false);

    if (!visible || !position) return null;

    return (
        <div
            className="fixed z-50 flex flex-col items-center animate-in zoom-in-95 duration-200"
            style={{
                top: `${position.top}px`,
                left: `${position.left}px`,
                transform: 'translate(-50%, -100%)',
            }}
        >
            {/* Color Picker Dropdown (Above) */}
            {showColorPicker && (
                <div className="mb-2 bg-white shadow-lg rounded-lg border border-slate-200 p-2 flex gap-1 animate-in slide-in-from-bottom-2">
                    <button
                        onClick={() => {
                            setSelectedColor(''); // Clear highlight
                            if (onHighlight) onHighlight(''); // Save as cleared/white? Or delete? Actually '' might imply remove.
                            setShowColorPicker(false);
                        }}
                        className={`w-6 h-6 rounded-full border border-slate-200 bg-white transition-all ${selectedColor === '' ? 'ring-2 ring-slate-400 ring-offset-1' : 'hover:scale-110'
                            }`}
                        title="None"
                    />
                    {COLORS.map((color) => (
                        <button
                            key={color.name}
                            onClick={() => {
                                setSelectedColor(color.name);
                                if (onHighlight) onHighlight(color.name);
                                setShowColorPicker(false);
                            }}
                            className={`w-6 h-6 rounded-full ${color.bgClass} transition-all ${selectedColor === color.name ? `ring-2 ${color.ringClass} ring-offset-1` : 'hover:scale-110'
                                }`}
                            title={color.name}
                        />
                    ))}
                </div>
            )}

            {/* Main Toolbar */}
            <div className="bg-white shadow-xl border border-slate-200 rounded-lg flex items-center p-1 gap-1">
                {/* Add Note Button */}
                <button
                    onClick={() => {
                        onAddNote();
                        onClose();
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:bg-slate-100 text-slate-700 text-sm font-medium transition-colors"
                >
                    <FileText className="w-4 h-4 text-slate-500" />
                    {labels.addNote || 'Note'}
                </button>

                <div className="w-px h-4 bg-slate-200"></div>

                {/* Color/Highlight Button */}
                <button
                    onClick={() => setShowColorPicker(!showColorPicker)}
                    className="flex items-center gap-1 px-2 py-1.5 rounded-md hover:bg-slate-100 text-slate-700 transition-colors"
                >
                    <div className="relative">
                        <Type className="w-4 h-4 text-slate-700" />
                        <div className={`absolute -bottom-1 left-0 right-0 h-1 rounded-sm ${COLORS.find(c => c.name === selectedColor)?.indicator || (selectedColor ? '' : 'bg-slate-200')}`}></div>
                    </div>
                    <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>
            </div>
        </div>
    );
};

export default AnnotationMenu;
