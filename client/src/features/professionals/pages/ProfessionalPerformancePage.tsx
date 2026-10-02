import { useMemo, useState } from 'react'
import { BarChart3, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTableShell } from '@/components/data-table/DataTableShell'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useBranchSelectionStore } from '@/features/business'
import { useServices } from '@/features/sales'
import { formatNumber } from '@/lib/i18n'
import { useProfessionalPerformance, useProfessionals } from '../hooks/useProfessionals'
import {
  ProfessionalPerformancePeriod,
  ProfessionalPerformanceSource,
  type ProfessionalPerformanceParams,
} from '../types/professionals.types'

const today = () => new Date().toLocaleDateString('en-CA')

export function ProfessionalPerformancePage() {
  const { t } = useTranslation(['professionals', 'common'])
  const branchId = useBranchSelectionStore((state) => state.branchId) ?? ''
  const [period, setPeriod] = useState<ProfessionalPerformancePeriod>(ProfessionalPerformancePeriod.ThisMonth)
  const [fromDate, setFromDate] = useState(today)
  const [toDate, setToDate] = useState(today)
  const [professionalId, setProfessionalId] = useState('')
  const [serviceId, setServiceId] = useState('')
  const [source, setSource] = useState<ProfessionalPerformanceSource>(ProfessionalPerformanceSource.All)
  const customReady = period !== ProfessionalPerformancePeriod.Custom || Boolean(fromDate && toDate && fromDate <= toDate)
  const params = useMemo<ProfessionalPerformanceParams>(() => ({
    period,
    fromDate: period === ProfessionalPerformancePeriod.Custom ? fromDate : undefined,
    toDate: period === ProfessionalPerformancePeriod.Custom ? toDate : undefined,
    professionalId: professionalId || undefined,
    serviceId: serviceId || undefined,
    source,
  }), [fromDate, period, professionalId, serviceId, source, toDate])
  const report = useProfessionalPerformance(params, Boolean(branchId) && customReady)
  const professionals = useProfessionals({ page: 1, pageSize: 100, branchId: branchId || undefined })
  const services = useServices({ page: 1, pageSize: 100 })
  const data = report.data
  const totals = useMemo(() => (data?.rows ?? []).reduce((value, row) => ({
    gross: value.gross + row.grossValueBase,
    refunds: value.refunds + row.refundValueBase,
    net: value.net + row.netValueBase,
  }), { gross: 0, refunds: 0, net: 0 }), [data?.rows])

  return (
    <div className="flex h-full w-full flex-col space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <BarChart3 className="size-6 text-primary" />
          {t('professionals:performance.title')}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('professionals:performance.description')}</p>
      </div>

      <Card>
        <CardContent className="grid gap-3 pt-6 sm:grid-cols-2 lg:grid-cols-5">
          <Filter label={t('professionals:performance.period')}>
            <select className={selectClass} value={period} onChange={(event) => setPeriod(Number(event.target.value) as ProfessionalPerformancePeriod)}>
              <option value={ProfessionalPerformancePeriod.Today}>{t('professionals:performance.periods.today')}</option>
              <option value={ProfessionalPerformancePeriod.ThisWeek}>{t('professionals:performance.periods.thisWeek')}</option>
              <option value={ProfessionalPerformancePeriod.ThisMonth}>{t('professionals:performance.periods.thisMonth')}</option>
              <option value={ProfessionalPerformancePeriod.Custom}>{t('professionals:performance.periods.custom')}</option>
            </select>
          </Filter>
          <Filter label={t('professionals:performance.professional')}>
            <select className={selectClass} value={professionalId} onChange={(event) => setProfessionalId(event.target.value)}>
              <option value="">{t('professionals:performance.allProfessionals')}</option>
              {(professionals.data?.data ?? []).map((professional) => (
                <option key={professional.id} value={professional.id}>{professional.name}</option>
              ))}
            </select>
          </Filter>
          <Filter label={t('professionals:performance.service')}>
            <select className={selectClass} value={serviceId} onChange={(event) => setServiceId(event.target.value)}>
              <option value="">{t('professionals:performance.allServices')}</option>
              {(services.data?.data ?? []).map((service) => (
                <option key={service.id} value={service.id}>{service.name}</option>
              ))}
            </select>
          </Filter>
          <Filter label={t('professionals:performance.source')}>
            <select className={selectClass} value={source} onChange={(event) => setSource(Number(event.target.value) as ProfessionalPerformanceSource)}>
              <option value={ProfessionalPerformanceSource.All}>{t('professionals:performance.sources.all')}</option>
              <option value={ProfessionalPerformanceSource.Pos}>{t('professionals:performance.sources.pos')}</option>
              <option value={ProfessionalPerformanceSource.Manual}>{t('professionals:performance.sources.manual')}</option>
            </select>
          </Filter>
          <div className="text-sm text-muted-foreground lg:self-end lg:pb-2">
            {data ? `${data.fromDate} – ${data.toDate}` : t('professionals:performance.branchHint')}
          </div>
          {period === ProfessionalPerformancePeriod.Custom && (
            <>
              <Filter label={t('professionals:performance.fromDate')}><Input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} /></Filter>
              <Filter label={t('professionals:performance.toDate')}><Input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} /></Filter>
            </>
          )}
        </CardContent>
      </Card>

      {data && (
        <div className="grid gap-4 sm:grid-cols-3">
          <MetricCard title={t('professionals:performance.gross')} value={totals.gross} currency={data.baseCurrencyCode} />
          <MetricCard title={t('professionals:performance.refunds')} value={totals.refunds} currency={data.baseCurrencyCode} />
          <MetricCard title={t('professionals:performance.net')} value={totals.net} currency={data.baseCurrencyCode} accent />
        </div>
      )}

      {!customReady && <p role="alert" className="text-sm text-destructive">{t('professionals:performance.invalidDates')}</p>}
      {report.isError && <p role="alert" className="text-sm text-destructive">{report.error.message}</p>}

      <DataTableShell>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead>{t('professionals:performance.professional')}</TableHead>
              <TableHead className="text-end">{t('professionals:performance.serviceQuantity')}</TableHead>
              <TableHead className="text-end">{t('professionals:performance.visitsServed')}</TableHead>
              <TableHead className="text-end">{t('professionals:performance.gross')}</TableHead>
              <TableHead className="text-end">{t('professionals:performance.refunds')}</TableHead>
              <TableHead className="text-end">{t('professionals:performance.net')}</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {report.isPending && <TableRow><TableCell colSpan={6} className="h-32 text-center"><Loader2 className="mx-auto size-5 animate-spin" /></TableCell></TableRow>}
              {!report.isPending && !report.isError && data?.rows.length === 0 && <TableRow><TableCell colSpan={6} className="h-32 text-center text-muted-foreground">{t('professionals:performance.empty')}</TableCell></TableRow>}
              {(data?.rows ?? []).map((row) => (
                <TableRow key={row.professionalId}>
                  <TableCell className="font-medium">{row.professionalName}</TableCell>
                  <TableCell className="text-end font-mono">{number(row.serviceQuantity)}</TableCell>
                  <TableCell className="text-end font-mono">{row.visitsServed}</TableCell>
                  <TableCell className="text-end font-mono">{money(row.grossValueBase)} {data?.baseCurrencyCode}</TableCell>
                  <TableCell className="text-end font-mono">{money(row.refundValueBase)} {data?.baseCurrencyCode}</TableCell>
                  <TableCell className="text-end font-mono font-semibold">{money(row.netValueBase)} {data?.baseCurrencyCode}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </DataTableShell>
    </div>
  )
}

function Filter({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="space-y-1.5 text-sm font-medium"><span className="block">{label}</span>{children}</label>
}

function MetricCard({ title, value, currency, accent = false }: { title: string; value: number; currency: string; accent?: boolean }) {
  return <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle></CardHeader><CardContent><p className={`font-mono text-2xl font-bold ${accent ? 'text-primary' : ''}`}>{money(value)} <span className="text-sm font-medium text-muted-foreground">{currency}</span></p></CardContent></Card>
}

const selectClass = 'h-10 w-full rounded-md border border-input bg-background px-3 text-sm'
const money = (value: number) => formatNumber(value, { minimumFractionDigits: 0, maximumFractionDigits: 4 })
const number = (value: number) => formatNumber(value, { maximumFractionDigits: 4 })
