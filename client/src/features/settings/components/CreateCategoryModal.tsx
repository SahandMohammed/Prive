import { useState } from 'react';
import { useCreateCategory } from '../hooks/useSettings';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface CreateCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  parentCategoryId?: string | null;
  parentCategoryName?: string;
  onSuccess?: (newCategoryId: string) => void;
}

export function CreateCategoryModal({ isOpen, onClose, parentCategoryId, parentCategoryName, onSuccess }: CreateCategoryModalProps) {
  const [name, setName] = useState('');
  const createCategory = useCreateCategory();

  const isSubcategory = !!parentCategoryId;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    createCategory.mutate({
      name: name.trim(),
      parentCategoryId: parentCategoryId || null,
    }, {
      onSuccess: (data) => {
        setName('');
        if (onSuccess) onSuccess(data.id);
        onClose();
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent showCloseButton={true}>
        <DialogHeader>
          <DialogTitle>{isSubcategory ? 'Create Subcategory' : 'Create Category'}</DialogTitle>
          <DialogDescription>
            {isSubcategory 
              ? `Add a new subcategory under "${parentCategoryName}".` 
              : 'Add a new top-level category.'}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Name</label>
            <Input 
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Coloring"
              autoFocus
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={createCategory.isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || createCategory.isPending} className="bg-[#e05d38] hover:bg-[#c94f2d] text-white">
              {createCategory.isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
