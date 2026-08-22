using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace api.Migrations
{
    /// <inheritdoc />
    public partial class AddPurchaseModule : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "PurchaseInvoiceId",
                table: "stock_movements",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "PurchaseInvoiceLineId",
                table: "stock_movements",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "purchase_invoices",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    DocumentNumber = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    SupplierId = table.Column<Guid>(type: "uuid", nullable: false),
                    InvoiceDate = table.Column<DateOnly>(type: "date", nullable: false),
                    SupplierReference = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    BranchId = table.Column<Guid>(type: "uuid", nullable: false),
                    WarehouseId = table.Column<Guid>(type: "uuid", nullable: false),
                    CurrencyId = table.Column<Guid>(type: "uuid", nullable: false),
                    BaseCurrencyId = table.Column<Guid>(type: "uuid", nullable: false),
                    ExchangeRate = table.Column<decimal>(type: "numeric(19,6)", precision: 19, scale: 6, nullable: false),
                    Subtotal = table.Column<decimal>(type: "numeric(19,4)", precision: 19, scale: 4, nullable: false),
                    Total = table.Column<decimal>(type: "numeric(19,4)", precision: 19, scale: 4, nullable: false),
                    BaseTotal = table.Column<decimal>(type: "numeric(19,4)", precision: 19, scale: 4, nullable: false),
                    Status = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    Notes = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    PostedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    JournalEntryId = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_purchase_invoices", x => x.Id);
                    table.ForeignKey(
                        name: "FK_purchase_invoices_branches_BranchId",
                        column: x => x.BranchId,
                        principalTable: "branches",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_purchase_invoices_contacts_SupplierId",
                        column: x => x.SupplierId,
                        principalTable: "contacts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_purchase_invoices_currencies_BaseCurrencyId",
                        column: x => x.BaseCurrencyId,
                        principalTable: "currencies",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_purchase_invoices_currencies_CurrencyId",
                        column: x => x.CurrencyId,
                        principalTable: "currencies",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_purchase_invoices_journal_entries_JournalEntryId",
                        column: x => x.JournalEntryId,
                        principalTable: "journal_entries",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_purchase_invoices_users_CreatedByUserId",
                        column: x => x.CreatedByUserId,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_purchase_invoices_warehouses_WarehouseId",
                        column: x => x.WarehouseId,
                        principalTable: "warehouses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "purchase_invoice_lines",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PurchaseInvoiceId = table.Column<Guid>(type: "uuid", nullable: false),
                    ProductId = table.Column<Guid>(type: "uuid", nullable: false),
                    UnitOfMeasureId = table.Column<Guid>(type: "uuid", nullable: false),
                    Quantity = table.Column<decimal>(type: "numeric(19,4)", precision: 19, scale: 4, nullable: false),
                    UnitCost = table.Column<decimal>(type: "numeric(19,4)", precision: 19, scale: 4, nullable: false),
                    LineSubtotal = table.Column<decimal>(type: "numeric(19,4)", precision: 19, scale: 4, nullable: false),
                    LineAmount = table.Column<decimal>(type: "numeric(19,4)", precision: 19, scale: 4, nullable: false),
                    BaseLineAmount = table.Column<decimal>(type: "numeric(19,4)", precision: 19, scale: 4, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_purchase_invoice_lines", x => x.Id);
                    table.ForeignKey(
                        name: "FK_purchase_invoice_lines_products_ProductId",
                        column: x => x.ProductId,
                        principalTable: "products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_purchase_invoice_lines_purchase_invoices_PurchaseInvoiceId",
                        column: x => x.PurchaseInvoiceId,
                        principalTable: "purchase_invoices",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_purchase_invoice_lines_units_of_measure_UnitOfMeasureId",
                        column: x => x.UnitOfMeasureId,
                        principalTable: "units_of_measure",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_stock_movements_PurchaseInvoiceId",
                table: "stock_movements",
                column: "PurchaseInvoiceId");

            migrationBuilder.CreateIndex(
                name: "IX_stock_movements_PurchaseInvoiceLineId",
                table: "stock_movements",
                column: "PurchaseInvoiceLineId");

            migrationBuilder.CreateIndex(
                name: "IX_purchase_invoice_lines_ProductId",
                table: "purchase_invoice_lines",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_purchase_invoice_lines_PurchaseInvoiceId_ProductId",
                table: "purchase_invoice_lines",
                columns: new[] { "PurchaseInvoiceId", "ProductId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_purchase_invoice_lines_UnitOfMeasureId",
                table: "purchase_invoice_lines",
                column: "UnitOfMeasureId");

            migrationBuilder.CreateIndex(
                name: "IX_purchase_invoices_BaseCurrencyId",
                table: "purchase_invoices",
                column: "BaseCurrencyId");

            migrationBuilder.CreateIndex(
                name: "IX_purchase_invoices_BranchId",
                table: "purchase_invoices",
                column: "BranchId");

            migrationBuilder.CreateIndex(
                name: "IX_purchase_invoices_CreatedByUserId",
                table: "purchase_invoices",
                column: "CreatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_purchase_invoices_CurrencyId",
                table: "purchase_invoices",
                column: "CurrencyId");

            migrationBuilder.CreateIndex(
                name: "IX_purchase_invoices_DocumentNumber",
                table: "purchase_invoices",
                column: "DocumentNumber",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_purchase_invoices_InvoiceDate_Status",
                table: "purchase_invoices",
                columns: new[] { "InvoiceDate", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_purchase_invoices_JournalEntryId",
                table: "purchase_invoices",
                column: "JournalEntryId",
                unique: true,
                filter: "\"JournalEntryId\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_purchase_invoices_SupplierId",
                table: "purchase_invoices",
                column: "SupplierId");

            migrationBuilder.CreateIndex(
                name: "IX_purchase_invoices_WarehouseId",
                table: "purchase_invoices",
                column: "WarehouseId");

            migrationBuilder.AddForeignKey(
                name: "FK_stock_movements_purchase_invoice_lines_PurchaseInvoiceLineId",
                table: "stock_movements",
                column: "PurchaseInvoiceLineId",
                principalTable: "purchase_invoice_lines",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_stock_movements_purchase_invoices_PurchaseInvoiceId",
                table: "stock_movements",
                column: "PurchaseInvoiceId",
                principalTable: "purchase_invoices",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_stock_movements_purchase_invoice_lines_PurchaseInvoiceLineId",
                table: "stock_movements");

            migrationBuilder.DropForeignKey(
                name: "FK_stock_movements_purchase_invoices_PurchaseInvoiceId",
                table: "stock_movements");

            migrationBuilder.DropTable(
                name: "purchase_invoice_lines");

            migrationBuilder.DropTable(
                name: "purchase_invoices");

            migrationBuilder.DropIndex(
                name: "IX_stock_movements_PurchaseInvoiceId",
                table: "stock_movements");

            migrationBuilder.DropIndex(
                name: "IX_stock_movements_PurchaseInvoiceLineId",
                table: "stock_movements");

            migrationBuilder.DropColumn(
                name: "PurchaseInvoiceId",
                table: "stock_movements");

            migrationBuilder.DropColumn(
                name: "PurchaseInvoiceLineId",
                table: "stock_movements");
        }
    }
}
