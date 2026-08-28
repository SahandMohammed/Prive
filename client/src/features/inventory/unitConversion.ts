import { UnitConversionOperation } from './types/inventory.types'
import type { ProductUnitConversion } from './types/inventory.types'

export interface UnitConvertibleProduct {
  unitOfMeasureId: string
  unitName: string
  unitCode: string
  unitConversions: ProductUnitConversion[]
}

export interface ProductUnitOption {
  id: string
  name: string
  code: string
  operation: UnitConversionOperation | null
  factor: number
}

export function productUnitOptions(product?: UnitConvertibleProduct): ProductUnitOption[] {
  if (!product) return []
  return [
    {
      id: product.unitOfMeasureId,
      name: product.unitName,
      code: product.unitCode,
      operation: null,
      factor: 1,
    },
    ...product.unitConversions.map((conversion) => ({
      id: conversion.unitOfMeasureId,
      name: conversion.unitName,
      code: conversion.unitCode,
      operation: conversion.operation,
      factor: conversion.factor,
    })),
  ]
}

export function convertToBaseQuantity(product: UnitConvertibleProduct, unitId: string, quantity: number) {
  const unit = productUnitOptions(product).find((option) => option.id === unitId)
  if (!unit || unit.factor <= 0) return null
  if (unit.operation === null) return quantity
  return unit.operation === UnitConversionOperation.Multiply
    ? quantity * unit.factor
    : quantity / unit.factor
}

export function convertBasePriceToUnitPrice(product: UnitConvertibleProduct, unitId: string, basePrice: number) {
  return convertToBaseQuantity(product, unitId, basePrice)
}

export function convertUnitPriceToBasePrice(product: UnitConvertibleProduct, unitId: string, unitPrice: number) {
  const unit = productUnitOptions(product).find((option) => option.id === unitId)
  if (!unit || unit.factor <= 0) return null
  if (unit.operation === null) return unitPrice
  return unit.operation === UnitConversionOperation.Multiply
    ? unitPrice / unit.factor
    : unitPrice * unit.factor
}
