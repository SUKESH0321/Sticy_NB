import { useState, useEffect } from 'react';
import { motion, useMotionValue } from 'motion/react';
import { Plus, X, GripHorizontal, Palette } from 'lucide-react';

type Note = {
  id: string;
  text: string;
  color: string;
  x: number;
  y: number;
  z: number;
};

const COLORS = [
  'bg-yellow-200',
  'bg-pink-200',
  'bg-blue-200',
  'bg-green-200',
  'bg-purple-200',
  'bg-orange-200'
];

export default function App() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [maxZ, setMaxZ] = useState(1);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from local storage
  useEffect(() => {
    const saved = localStorage.getItem('sticky-notes');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setNotes(parsed);
        const highestZ = Math.max(...parsed.map((n: Note) => n.z), 0);
        setMaxZ(highestZ + 1);
      } catch (e) {
        console.error("Failed to load notes");
      }
    }
    setIsLoaded(true);
  }, []);

  // Save to local storage
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('sticky-notes', JSON.stringify(notes));
    }
  }, [notes, isLoaded]);

  const addNote = () => {
    const newNote: Note = {
      id: crypto.randomUUID(),
      text: '',
      color: COLORS[0],
      x: window.innerWidth / 2 - 128 + (Math.random() * 40 - 20), // Center roughly
      y: window.innerHeight / 2 - 128 + (Math.random() * 40 - 20),
      z: maxZ
    };
    setNotes([...notes, newNote]);
    setMaxZ(maxZ + 1);
  };

  const updateNote = (id: string, updates: Partial<Note>) => {
    setNotes(notes.map(n => n.id === id ? { ...n, ...updates } : n));
  };

  const deleteNote = (id: string) => {
    setNotes(notes.filter(n => n.id !== id));
  };

  const bringToFront = (id: string) => {
    updateNote(id, { z: maxZ });
    setMaxZ(maxZ + 1);
  };

  if (!isLoaded) return null;

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-stone-100 bg-[radial-gradient(#d6d3d1_1px,transparent_1px)] [background-size:24px_24px]">
      {/* Toolbar */}
      <div className="absolute top-6 left-6 z-[9999]">
        <button
          onClick={addNote}
          className="flex items-center gap-2 px-5 py-3 bg-stone-900 text-white rounded-full shadow-xl hover:bg-stone-800 transition-all hover:scale-105 active:scale-95 font-medium"
        >
          <Plus size={20} />
          <span>New Note</span>
        </button>
      </div>

      {/* Notes */}
      {notes.map(note => (
        <StickyNote
          key={note.id}
          note={note}
          updateNote={updateNote}
          deleteNote={deleteNote}
          bringToFront={bringToFront}
        />
      ))}
    </div>
  );
}

function StickyNote({ note, updateNote, deleteNote, bringToFront }: {
  note: Note;
  updateNote: (id: string, updates: Partial<Note>) => void;
  deleteNote: (id: string) => void;
  bringToFront: (id: string) => void;
}) {
  const x = useMotionValue(note.x);
  const y = useMotionValue(note.y);
  const [isEditingColor, setIsEditingColor] = useState(false);

  return (
    <motion.div
      drag
      dragMomentum={false}
      onDragStart={() => bringToFront(note.id)}
      onDragEnd={() => {
        updateNote(note.id, { x: x.get(), y: y.get() });
      }}
      style={{ x, y, zIndex: note.z, position: 'absolute' }}
      className={`w-64 min-h-64 rounded-2xl shadow-xl flex flex-col ${note.color} border border-black/5 overflow-hidden`}
      onPointerDown={() => bringToFront(note.id)}
    >
      {/* Header / Drag Handle */}
      <div className="flex items-center justify-between p-3 cursor-grab active:cursor-grabbing bg-black/5 hover:bg-black/10 transition-colors group">
        <div className="flex items-center gap-2">
          <GripHorizontal size={16} className="text-black/30 group-hover:text-black/50 transition-colors" />
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsEditingColor(!isEditingColor);
              }}
              className="p-1.5 hover:bg-black/10 rounded-md text-black/40 hover:text-black/70 transition-colors"
              title="Change Color"
            >
              <Palette size={14} />
            </button>
            {isEditingColor && (
              <div className="absolute top-full left-0 mt-2 flex gap-1.5 p-2 bg-white rounded-xl shadow-xl border border-black/10 z-10">
                {COLORS.map(c => (
                  <button
                    key={c}
                    onClick={(e) => {
                      e.stopPropagation();
                      updateNote(note.id, { color: c });
                      setIsEditingColor(false);
                    }}
                    className={`w-6 h-6 rounded-full ${c} border border-black/10 hover:scale-110 transition-transform`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            deleteNote(note.id);
          }}
          className="p-1.5 hover:bg-black/10 rounded-md text-black/40 hover:text-black/70 transition-colors"
          title="Delete Note"
        >
          <X size={16} />
        </button>
      </div>

      {/* Content */}
      <textarea
        value={note.text}
        onChange={(e) => updateNote(note.id, { text: e.target.value })}
        placeholder="Write something..."
        className="flex-1 w-full p-5 bg-transparent resize-none outline-none text-stone-800 placeholder:text-stone-800/40 font-medium leading-relaxed"
        onPointerDown={(e) => e.stopPropagation()} // Prevent drag when clicking text
      />
    </motion.div>
  );
}
