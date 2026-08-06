import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Save, Package, Plus } from 'lucide-react';
import { createItemSchema, type CreateItemFormValues } from '../schemas/settings.schemas';
import { useCreateItem, useCategories, useUnitsOfMeasure } from '../hooks/useSettings';
import { ApiRequestError } from '@/lib/apiError';
import { CreateCategoryModal } from '../components/CreateCategoryModal';

export function CreateItemPage() {
  const navigate = useNavigate();
  const createItem = useCreateItem();
  
  const { data: categories = [] } = useCategories();
  const { data: uoms = [] } = useUnitsOfMeasure();

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isSubcategoryModalOpen, setIsSubcategoryModalOpen] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateItemFormValues>({
    resolver: zodResolver(createItemSchema),
    defaultValues: {
      type: 'Product',
      basePrice: 0,
      baseCost: 0,
      additionalUnits: [],
    },
  });

  const selectedType = watch('type');
  const selectedCategoryId = watch('categoryId');

  const topLevelCategories = categories.filter(c => !c.parentCategoryId);
  const subcategories = categories.filter(c => c.parentCategoryId === selectedCategoryId);
  const selectedCategoryName = topLevelCategories.find(c => c.id === selectedCategoryId)?.name;

  const onSubmit = (values: CreateItemFormValues) => {
    // Determine the actual categoryId to send (subcategory if selected, else top-level)
    const finalCategoryId = values.subcategoryId || values.categoryId;
    
    const payload = {
      ...values,
      categoryId: finalCategoryId,
      durationMinutes: values.durationMinutes ?? null,
      description: values.description ?? null,
      additionalUnits: values.additionalUnits ?? [],
    };
    createItem.mutate(payload, {
      onSuccess: () => navigate('/settings/items'),
    });
  };

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6 w-full h-full overflow-y-auto pb-20">
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <Button type="button" variant="outline" onClick={() => navigate('/settings/items')} className="rounded-full w-10 h-10 p-0 shadow-2xs cursor-pointer">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold font-heading text-slate-900 dark:text-white">Create Item</h1>
            <p className="text-sm text-slate-500">Add a new product or service</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button type="button" variant="outline" onClick={() => navigate('/settings/items')} className="shadow-2xs cursor-pointer">Cancel</Button>
          <Button type="submit" disabled={createItem.isPending} className="bg-[#e05d38] hover:bg-[#c94f2d] text-white shadow-xs gap-1.5 px-6 cursor-pointer">
            <Save className="w-4 h-4" /> {createItem.isPending ? 'Saving...' : 'Save Item'}
          </Button>
        </div>
      </div>

      {createItem.isError && (
        <div className="p-4 bg-red-50 text-red-600 rounded-lg text-sm font-medium border border-red-200">
          {createItem.error instanceof ApiRequestError ? createItem.error.message : 'An unexpected error occurred.'}
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xs p-6 space-y-8">
        
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="bg-orange-50 dark:bg-orange-950/30 p-2 rounded-lg">
            <Package className="w-5 h-5 text-[#e05d38]" />
          </div>
          <h2 className="font-semibold text-slate-800 dark:text-slate-200">Basic Information</h2>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Item Type</label>
            <select 
              {...register('type')}
              className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-slate-50 dark:bg-slate-800/50 px-3 py-2 text-sm shadow-xs ring-offset-white focus:outline-none focus:ring-1 focus:ring-[#e05d38] disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:ring-offset-slate-950"
            >
              <option value="Product">Product</option>
              <option value="Service">Service</option>
            </select>
            {errors.type && <p className="text-xs text-red-500">{errors.type.message}</p>}
          </div>
          
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Item Code / SKU</label>
            <Input 
              {...register('code')}
              placeholder="e.g. PRD-001"
              className="shadow-xs font-mono bg-slate-50 dark:bg-slate-800/50"
            />
            {errors.code && <p className="text-xs text-red-500">{errors.code.message}</p>}
          </div>

          <div className="col-span-2 space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Item Name</label>
            <Input 
              {...register('name')}
              placeholder="e.g. Premium Consulting Hour"
              className="shadow-xs bg-slate-50 dark:bg-slate-800/50"
            />
            {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Category</label>
            <div className="flex items-center gap-2">
              <select 
                {...register('categoryId')}
                className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-slate-50 dark:bg-slate-800/50 px-3 py-2 text-sm shadow-xs ring-offset-white focus:outline-none focus:ring-1 focus:ring-[#e05d38] disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:ring-offset-slate-950"
              >
                <option value="">Select a category...</option>
                {topLevelCategories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <Button type="button" variant="outline" size="icon" onClick={() => setIsCategoryModalOpen(true)}>
                <Plus className="w-4 h-4 text-slate-600" />
              </Button>
            </div>
            {errors.categoryId && <p className="text-xs text-red-500">{errors.categoryId.message}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Subcategory (Optional)</label>
            <div className="flex items-center gap-2">
              <select 
                {...register('subcategoryId')}
                disabled={!selectedCategoryId}
                className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-slate-50 dark:bg-slate-800/50 px-3 py-2 text-sm shadow-xs ring-offset-white focus:outline-none focus:ring-1 focus:ring-[#e05d38] disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:ring-offset-slate-950"
              >
                <option value="">{selectedCategoryId ? "Select a subcategory..." : "Select a category first"}</option>
                {subcategories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <Button type="button" variant="outline" size="icon" disabled={!selectedCategoryId} onClick={() => setIsSubcategoryModalOpen(true)}>
                <Plus className="w-4 h-4 text-slate-600" />
              </Button>
            </div>
            {errors.subcategoryId && <p className="text-xs text-red-500">{errors.subcategoryId.message}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Base Unit of Measure</label>
            <select 
              {...register('baseUnitOfMeasureId')}
              className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-slate-50 dark:bg-slate-800/50 px-3 py-2 text-sm shadow-xs ring-offset-white focus:outline-none focus:ring-1 focus:ring-[#e05d38] disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:ring-offset-slate-950"
            >
              <option value="">Select a unit...</option>
              {uoms.map(u => (
                <option key={u.id} value={u.id}>{u.name} {u.abbreviation ? `(${u.abbreviation})` : ''}</option>
              ))}
            </select>
            {errors.baseUnitOfMeasureId && <p className="text-xs text-red-500">{errors.baseUnitOfMeasureId.message}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Base Sales Price</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
              <Input 
                type="number"
                min="0"
                step="0.01"
                {...register('basePrice', { valueAsNumber: true })}
                onFocus={e => e.target.select()}
                className="pl-7 shadow-xs bg-slate-50 dark:bg-slate-800/50 font-mono"
              />
            </div>
            {errors.basePrice && <p className="text-xs text-red-500">{errors.basePrice.message}</p>}
          </div>
          
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Base Cost</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
              <Input 
                type="number"
                min="0"
                step="0.01"
                {...register('baseCost', { valueAsNumber: true })}
                onFocus={e => e.target.select()}
                className="pl-7 shadow-xs bg-slate-50 dark:bg-slate-800/50 font-mono"
              />
            </div>
            {errors.baseCost && <p className="text-xs text-red-500">{errors.baseCost.message}</p>}
          </div>
          
          {selectedType === 'Service' && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Duration (Minutes)</label>
              <Input 
                type="number"
                min="1"
                {...register('durationMinutes', { valueAsNumber: true })}
                onFocus={e => e.target.select()}
                className="shadow-xs bg-slate-50 dark:bg-slate-800/50 font-mono"
              />
              {errors.durationMinutes && <p className="text-xs text-red-500">{errors.durationMinutes.message}</p>}
            </div>
          )}
        </div>

        <div className="space-y-1.5 pt-4 border-t border-slate-100 dark:border-slate-800">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Description / Notes</label>
          <textarea
            {...register('description')}
            placeholder="Internal notes or default invoice description..."
            className="w-full min-h-[80px] rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-3 py-2 text-sm shadow-xs outline-none focus:ring-1 focus:ring-[#e05d38] resize-y"
          />
          {errors.description && <p className="text-xs text-red-500">{errors.description.message}</p>}
        </div>
      </div>
    </form>

      <CreateCategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        onSuccess={(id) => setValue('categoryId', id)}
      />

      <CreateCategoryModal
        isOpen={isSubcategoryModalOpen}
        onClose={() => setIsSubcategoryModalOpen(false)}
        parentCategoryId={selectedCategoryId}
        parentCategoryName={selectedCategoryName}
        onSuccess={(id) => setValue('subcategoryId', id)}
      />
    </>
  );
}
