import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { posApi } from '../api/pos.api'
import type {
  PosCatalogFilters,
  PosCustomerFilters,
  PosSessionFilters,
  PosZReportFilters,
} from '../types/pos.types'

export const POS_KEY = ['pos'] as const

export const usePosSetup = () =>
  useQuery({ queryKey: [...POS_KEY, 'setup'], queryFn: posApi.setup })
export const usePosCatalog = (filters: PosCatalogFilters) =>
  useQuery({ queryKey: [...POS_KEY, 'catalog', filters], queryFn: () => posApi.catalog(filters) })
export const usePosCustomers = (filters: PosCustomerFilters) =>
  useQuery({ queryKey: [...POS_KEY, 'customers', filters], queryFn: () => posApi.customers(filters) })
export const usePosSale = (id?: string) =>
  useQuery({ queryKey: [...POS_KEY, 'sales', id], queryFn: () => posApi.sale(id!), enabled: Boolean(id) })
export const usePosRefundability = (saleId?: string, enabled = true) =>
  useQuery({
    queryKey: [...POS_KEY, 'sales', saleId, 'refundability'],
    queryFn: () => posApi.refundability(saleId!),
    enabled: Boolean(saleId) && enabled,
  })
export const usePosRefund = (id?: string) =>
  useQuery({ queryKey: [...POS_KEY, 'refunds', id], queryFn: () => posApi.refund(id!), enabled: Boolean(id) })

export const usePosRegisters = (includeInactive = false) =>
  useQuery({ queryKey: [...POS_KEY, 'registers', includeInactive], queryFn: () => posApi.registers(includeInactive) })
export const useActivePosSession = () =>
  useQuery({ queryKey: [...POS_KEY, 'session', 'active'], queryFn: posApi.activeSession })
export const usePosSession = (id?: string) =>
  useQuery({ queryKey: [...POS_KEY, 'session', id], queryFn: () => posApi.session(id!), enabled: Boolean(id) })
export const usePosSessions = (filters: PosSessionFilters) =>
  useQuery({ queryKey: [...POS_KEY, 'sessions', filters], queryFn: () => posApi.sessions(filters) })
export const usePosXReport = (id?: string, enabled = true) =>
  useQuery({
    queryKey: [...POS_KEY, 'x-report', id],
    queryFn: () => posApi.xReport(id!),
    enabled: Boolean(id) && enabled,
  })
export const usePosZReports = (filters: PosZReportFilters) =>
  useQuery({ queryKey: [...POS_KEY, 'z-reports', filters], queryFn: () => posApi.zReports(filters) })
export const usePosZReport = (id?: string) =>
  useQuery({ queryKey: [...POS_KEY, 'z-report', id], queryFn: () => posApi.zReport(id!), enabled: Boolean(id) })

export function useOpenPosSession() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: posApi.openSession,
    onSuccess: (session) => {
      client.setQueryData([...POS_KEY, 'session', 'active'], session)
      client.setQueryData([...POS_KEY, 'session', session.id], session)
      return client.invalidateQueries({ queryKey: [...POS_KEY, 'sessions'] })
    },
  })
}

export function useClosePosSession() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Parameters<typeof posApi.closeSession>[1] }) =>
      posApi.closeSession(id, body),
    onSuccess: (report) => {
      client.setQueryData([...POS_KEY, 'session', 'active'], null)
      client.setQueryData([...POS_KEY, 'z-report', report.id], report)
      client.removeQueries({ queryKey: [...POS_KEY, 'x-report', report.posSessionId] })
      client.invalidateQueries({ queryKey: [...POS_KEY, 'session', report.posSessionId] })
      client.invalidateQueries({ queryKey: [...POS_KEY, 'sessions'] })
      client.invalidateQueries({ queryKey: [...POS_KEY, 'z-reports'] })
    },
  })
}

export function useCreatePosRegister() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: posApi.createRegister,
    onSuccess: () => client.invalidateQueries({ queryKey: [...POS_KEY, 'registers'] }),
  })
}

export function useUpdatePosRegister() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Parameters<typeof posApi.updateRegister>[1] }) =>
      posApi.updateRegister(id, body),
    onSuccess: () => client.invalidateQueries({ queryKey: [...POS_KEY, 'registers'] }),
  })
}

export function useCompletePosSale() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: posApi.complete,
    onSuccess: (sale) => {
      client.setQueryData([...POS_KEY, 'sales', sale.id], sale)
      client.invalidateQueries({ queryKey: [...POS_KEY, 'setup'] })
      client.invalidateQueries({ queryKey: [...POS_KEY, 'catalog'] })
      client.invalidateQueries({ queryKey: [...POS_KEY, 'x-report', sale.posSessionId] })
      client.invalidateQueries({ queryKey: [...POS_KEY, 'sessions'] })
      client.invalidateQueries({ queryKey: ['sales'] })
      client.invalidateQueries({ queryKey: ['inventory'] })
      client.invalidateQueries({ queryKey: ['finance'] })
      return client.invalidateQueries({ queryKey: ['accounting'] })
    },
    onError: () => Promise.all([
      client.invalidateQueries({ queryKey: [...POS_KEY, 'setup'] }),
      client.invalidateQueries({ queryKey: [...POS_KEY, 'catalog'] }),
      client.invalidateQueries({ queryKey: [...POS_KEY, 'session', 'active'] }),
    ]),
  })
}

function invalidateRefundEffects(client: ReturnType<typeof useQueryClient>, saleId: string, sessionId: string) {
  client.invalidateQueries({ queryKey: [...POS_KEY, 'sales', saleId] })
  client.invalidateQueries({ queryKey: [...POS_KEY, 'sales', saleId, 'refundability'] })
  client.invalidateQueries({ queryKey: [...POS_KEY, 'setup'] })
  client.invalidateQueries({ queryKey: [...POS_KEY, 'catalog'] })
  client.invalidateQueries({ queryKey: [...POS_KEY, 'x-report', sessionId] })
  client.invalidateQueries({ queryKey: [...POS_KEY, 'sessions'] })
  client.invalidateQueries({ queryKey: [...POS_KEY, 'z-reports'] })
  client.invalidateQueries({ queryKey: ['sales'] })
  client.invalidateQueries({ queryKey: ['inventory'] })
  client.invalidateQueries({ queryKey: ['finance'] })
  client.invalidateQueries({ queryKey: ['accounting'] })
  client.invalidateQueries({ queryKey: ['dashboard'] })
}

export function usePostPosRefund() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ saleId, body }: { saleId: string; body: Parameters<typeof posApi.postRefund>[1] }) =>
      posApi.postRefund(saleId, body),
    onSuccess: (refund) => {
      client.setQueryData([...POS_KEY, 'refunds', refund.id], refund)
      invalidateRefundEffects(client, refund.posSaleId, refund.posSessionId)
    },
  })
}

export function useVoidPosSale() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ saleId, body }: { saleId: string; body: Parameters<typeof posApi.voidSale>[1] }) =>
      posApi.voidSale(saleId, body),
    onSuccess: (refund) => {
      client.setQueryData([...POS_KEY, 'refunds', refund.id], refund)
      invalidateRefundEffects(client, refund.posSaleId, refund.posSessionId)
    },
  })
}
