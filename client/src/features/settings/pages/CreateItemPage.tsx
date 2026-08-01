import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Save, Package } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export function CreateItemPage() {
  const navigate = useNavigate()

  const [code, setCode] = useState('PRD-006')
  const [name, setName] = useState('')
  const [type, setType] = useState<'Product' | 'Service'>('Product')
  const [unit, setUnit] = useState('ea')
  const [price, setPrice] = useState(0)
  const [cost, setCost] = useState(0)
  const [description, setDescription] = useState('')

  return (
    <div className="flex flex-col gap-6 w-full h-full overflow-y-auto pb-20">
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate('/settings/items')} className="rounded-full w-10 h-10 p-0 shadow-2xs cursor-pointer">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold font-heading text-slate-900 dark:text-white">Create Item</h1>
            <p className="text-sm text-slate-500">Add a new product or service</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => navigate('/settings/items')} className="shadow-2xs cursor-pointer">Cancel</Button>
          <Button className="bg-[#e05d38] hover:bg-[#c94f2d] text-white shadow-xs gap-1.5 px-6 cursor-pointer">
            <Save className="w-4 h-4" /> Save Item
          </Button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xs p-6 space-y-8">
        
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="bg-orange-50 dark:bg-orange-950/30 p-2 rounded-lg">
            <Package className="w-5 h-5 text-[#e05d38]" />
          </div>
          <h2 className="font-semibold text-slate-800 dark:text-slate-200">Basic Information</h2>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Item Type</label>
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700 w-full">
              <button
                onClick={() => setType('Product')}
                className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all cursor-pointer ${
                  type === 'Product' 
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs' 
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                Product
              </button>
              <button
                onClick={() => setType('Service')}
                className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all cursor-pointer ${
                  type === 'Service' 
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs' 
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                Service
              </button>
            </div>
          </div>
          
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Item Code / SKU</label>
            <Input 
              value={code} 
              onChange={e => setCode(e.target.value)}
              className="shadow-xs font-mono bg-slate-50 dark:bg-slate-800/50"
            />
          </div>

          <div className="col-span-2 space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Item Name</label>
            <Input 
              value={name} 
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Premium Consulting Hour"
              className="shadow-xs bg-slate-50 dark:bg-slate-800/50"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Unit of Measure</label>
            <Input 
              value={unit} 
              onChange={e => setUnit(e.target.value)}
              placeholder="e.g. ea, hr, kg"
              className="shadow-xs bg-slate-50 dark:bg-slate-800/50"
            />
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
                value={price} 
                onChange={e => setPrice(Number(e.target.value))}
                onFocus={e => e.target.select()}
                className="pl-7 shadow-xs bg-slate-50 dark:bg-slate-800/50 font-mono"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Base Cost</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
              <Input 
                type="number"
                min="0"
                value={cost} 
                onChange={e => setCost(Number(e.target.value))}
                onFocus={e => e.target.select()}
                className="pl-7 shadow-xs bg-slate-50 dark:bg-slate-800/50 font-mono"
              />
            </div>
          </div>
        </div>

        <div className="space-y-1.5 pt-4 border-t border-slate-100 dark:border-slate-800">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Description / Notes</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Internal notes or default invoice description..."
            className="w-full min-h-[80px] rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-3 py-2 text-sm shadow-xs outline-none focus:ring-1 focus:ring-[#e05d38] resize-y"
          />
        </div>
      </div>
    </div>
  )
}
