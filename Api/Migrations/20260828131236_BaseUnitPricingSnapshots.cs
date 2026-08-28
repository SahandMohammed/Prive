using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace api.Migrations
{
    /// <inheritdoc />
    public partial class BaseUnitPricingSnapshots : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "BaseQuantity",
                table: "sales_invoice_lines",
                type: "numeric(19,4)",
                precision: 19,
                scale: 4,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "BaseUnitPrice",
                table: "sales_invoice_lines",
                type: "numeric(19,4)",
                precision: 19,
                scale: 4,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "ConversionFactor",
                table: "sales_invoice_lines",
                type: "numeric(19,6)",
                precision: 19,
                scale: 6,
                nullable: false,
                defaultValue: 1m);

            migrationBuilder.AddColumn<string>(
                name: "ConversionOperation",
                table: "sales_invoice_lines",
                type: "character varying(16)",
                maxLength: 16,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "BaseQuantity",
                table: "purchase_invoice_lines",
                type: "numeric(19,4)",
                precision: 19,
                scale: 4,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "BaseUnitCost",
                table: "purchase_invoice_lines",
                type: "numeric(19,4)",
                precision: 19,
                scale: 4,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "ConversionFactor",
                table: "purchase_invoice_lines",
                type: "numeric(19,6)",
                precision: 19,
                scale: 6,
                nullable: false,
                defaultValue: 1m);

            migrationBuilder.AddColumn<string>(
                name: "ConversionOperation",
                table: "purchase_invoice_lines",
                type: "character varying(16)",
                maxLength: 16,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "BaseQuantity",
                table: "opening_stock_lines",
                type: "numeric(19,4)",
                precision: 19,
                scale: 4,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "ConversionFactor",
                table: "opening_stock_lines",
                type: "numeric(19,6)",
                precision: 19,
                scale: 6,
                nullable: false,
                defaultValue: 1m);

            migrationBuilder.AddColumn<string>(
                name: "ConversionOperation",
                table: "opening_stock_lines",
                type: "character varying(16)",
                maxLength: 16,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "UnitCost",
                table: "opening_stock_lines",
                type: "numeric(19,4)",
                precision: 19,
                scale: 4,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<Guid>(
                name: "UnitOfMeasureId",
                table: "opening_stock_lines",
                type: "uuid",
                nullable: true);

            migrationBuilder.Sql("""
                UPDATE sales_invoice_lines AS line
                SET "BaseQuantity" = line."Quantity",
                    "BaseUnitPrice" = line."UnitPrice" * invoice."ExchangeRate"
                FROM sales_invoices AS invoice
                WHERE invoice."Id" = line."SalesInvoiceId";

                UPDATE purchase_invoice_lines AS line
                SET "BaseQuantity" = line."Quantity",
                    "BaseUnitCost" = line."UnitCost" * invoice."ExchangeRate"
                FROM purchase_invoices AS invoice
                WHERE invoice."Id" = line."PurchaseInvoiceId";

                UPDATE opening_stock_lines AS line
                SET "BaseQuantity" = line."Quantity",
                    "UnitCost" = line."UnitCostBase",
                    "UnitOfMeasureId" = product."UnitOfMeasureId"
                FROM products AS product
                WHERE product."Id" = line."ProductId";
                """);

            migrationBuilder.AlterColumn<Guid>(
                name: "UnitOfMeasureId",
                table: "opening_stock_lines",
                type: "uuid",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_opening_stock_lines_UnitOfMeasureId",
                table: "opening_stock_lines",
                column: "UnitOfMeasureId");

            migrationBuilder.AddForeignKey(
                name: "FK_opening_stock_lines_units_of_measure_UnitOfMeasureId",
                table: "opening_stock_lines",
                column: "UnitOfMeasureId",
                principalTable: "units_of_measure",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_opening_stock_lines_units_of_measure_UnitOfMeasureId",
                table: "opening_stock_lines");

            migrationBuilder.DropIndex(
                name: "IX_opening_stock_lines_UnitOfMeasureId",
                table: "opening_stock_lines");

            migrationBuilder.DropColumn(
                name: "BaseQuantity",
                table: "sales_invoice_lines");

            migrationBuilder.DropColumn(
                name: "BaseUnitPrice",
                table: "sales_invoice_lines");

            migrationBuilder.DropColumn(
                name: "ConversionFactor",
                table: "sales_invoice_lines");

            migrationBuilder.DropColumn(
                name: "ConversionOperation",
                table: "sales_invoice_lines");

            migrationBuilder.DropColumn(
                name: "BaseQuantity",
                table: "purchase_invoice_lines");

            migrationBuilder.DropColumn(
                name: "BaseUnitCost",
                table: "purchase_invoice_lines");

            migrationBuilder.DropColumn(
                name: "ConversionFactor",
                table: "purchase_invoice_lines");

            migrationBuilder.DropColumn(
                name: "ConversionOperation",
                table: "purchase_invoice_lines");

            migrationBuilder.DropColumn(
                name: "BaseQuantity",
                table: "opening_stock_lines");

            migrationBuilder.DropColumn(
                name: "ConversionFactor",
                table: "opening_stock_lines");

            migrationBuilder.DropColumn(
                name: "ConversionOperation",
                table: "opening_stock_lines");

            migrationBuilder.DropColumn(
                name: "UnitCost",
                table: "opening_stock_lines");

            migrationBuilder.DropColumn(
                name: "UnitOfMeasureId",
                table: "opening_stock_lines");
        }
    }
}
