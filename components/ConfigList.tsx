import React from 'react';
import { Plus } from 'lucide-react';

interface ConfigListProps<T> {
  title: string;
  items: T[];
  onUpdate: (items: T[]) => void;
  renderItem: (item: T, index: number, onDelete: () => void, onEdit: (newItem: T) => void) => React.ReactNode;
  createEmpty: () => T;
}

export function ConfigList<T extends { id: string }>({ 
  title, 
  items, 
  onUpdate, 
  renderItem, 
  createEmpty 
}: ConfigListProps<T>) {
  const handleAdd = () => {
    const newItem = createEmpty();
    onUpdate([...items, newItem]);
  };

  const handleDelete = (id: string) => {
    onUpdate(items.filter(i => i.id !== id));
  };

  const handleEdit = (updatedItem: T) => {
    onUpdate(items.map(i => i.id === updatedItem.id ? updatedItem : i));
  };

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-zinc-800">
      <div className="flex justify-between items-center mb-4 border-b border-gray-50 dark:border-zinc-800 pb-4">
        <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100 uppercase tracking-wider">
          {title}
        </h3>
        <button 
          onClick={handleAdd}
          className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 text-primary transition-colors"
          title="Add New Entry"
        >
          <Plus size={18} />
        </button>
      </div>
      
      <div className="p-0">
        {items.length === 0 ? (
          <div className="py-8 text-center text-gray-400 text-sm border-2 border-dashed border-gray-100 dark:border-zinc-800 rounded-2xl">
            List kosong. Klik + untuk menambah.
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item, index) => (
              <div key={item.id} className="p-4 bg-gray-50 dark:bg-zinc-800/50 rounded-2xl border border-gray-100 dark:border-zinc-800/80">
                 {renderItem(
                   item, 
                   index, 
                   () => handleDelete(item.id), 
                   (newItem) => handleEdit(newItem)
                 )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}