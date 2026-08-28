namespace Api.Modules.Inventory;

public readonly record struct ProductUnitSelection(
  Guid UnitOfMeasureId,
  UnitConversionOperation? Operation,
  decimal Factor,
  bool IsActive)
{
  public bool IsValid => Factor > 0 &&
    (Operation is null && Factor == 1 ||
     Operation is not null && Enum.IsDefined(Operation.Value));
}

public static class UnitConversionCalculator
{
  public static ProductUnitSelection? Resolve(
    ProductEntity product,
    Guid unitOfMeasureId)
  {
    if (product.UnitOfMeasureId == unitOfMeasureId)
    {
      return new ProductUnitSelection(
        unitOfMeasureId,
        null,
        1m,
        product.UnitOfMeasure.IsActive);
    }

    var conversion = product.UnitConversions.SingleOrDefault(
      item => item.UnitOfMeasureId == unitOfMeasureId);
    return conversion is null
      ? null
      : new ProductUnitSelection(
        unitOfMeasureId,
        conversion.Operation,
        conversion.Factor,
        conversion.UnitOfMeasure.IsActive);
  }

  public static decimal ConvertToBaseQuantity(
    decimal selectedQuantity,
    UnitConversionOperation? operation,
    decimal factor) => operation switch
    {
      null when factor == 1 => selectedQuantity,
      UnitConversionOperation.Multiply when factor > 0 => selectedQuantity * factor,
      UnitConversionOperation.Divide when factor > 0 => selectedQuantity / factor,
      _ => throw new ArgumentOutOfRangeException(nameof(factor), "A unit conversion requires a valid operation and a factor greater than zero.")
    };

  public static decimal ConvertBasePriceToUnitPrice(
    decimal baseUnitPrice,
    UnitConversionOperation? operation,
    decimal factor) => ConvertToBaseQuantity(baseUnitPrice, operation, factor);

  public static decimal ConvertUnitPriceToBasePrice(
    decimal selectedUnitPrice,
    UnitConversionOperation? operation,
    decimal factor) => operation switch
    {
      null when factor == 1 => selectedUnitPrice,
      UnitConversionOperation.Multiply when factor > 0 => selectedUnitPrice / factor,
      UnitConversionOperation.Divide when factor > 0 => selectedUnitPrice * factor,
      _ => throw new ArgumentOutOfRangeException(nameof(factor), "A unit conversion requires a valid operation and a factor greater than zero.")
    };
}
