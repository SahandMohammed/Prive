using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace api.Migrations
{
    /// <inheritdoc />
    public partial class AddPosRefunds : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "PosRefundLineId",
                table: "stock_movements",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "AccountsReceivableAccountId",
                table: "sales_invoices",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "CostOfGoodsSoldAccountId",
                table: "sales_invoice_lines",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "InventoryAccountId",
                table: "sales_invoice_lines",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "OriginalUnitCostBase",
                table: "sales_invoice_lines",
                type: "numeric(19,4)",
                precision: 19,
                scale: 4,
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "RevenueAccountId",
                table: "sales_invoice_lines",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "NetSalesBase",
                table: "pos_z_reports",
                type: "numeric(19,4)",
                precision: 19,
                scale: 4,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "ProductRefundsBase",
                table: "pos_z_reports",
                type: "numeric(19,4)",
                precision: 19,
                scale: 4,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<int>(
                name: "RefundCount",
                table: "pos_z_reports",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<decimal>(
                name: "RefundTotalBase",
                table: "pos_z_reports",
                type: "numeric(19,4)",
                precision: 19,
                scale: 4,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "ServiceRefundsBase",
                table: "pos_z_reports",
                type: "numeric(19,4)",
                precision: 19,
                scale: 4,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "RefundAmount",
                table: "pos_z_payment_summaries",
                type: "numeric(19,4)",
                precision: 19,
                scale: 4,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "RefundBaseAmount",
                table: "pos_z_payment_summaries",
                type: "numeric(19,4)",
                precision: 19,
                scale: 4,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "RefundAmount",
                table: "pos_z_drawer_summaries",
                type: "numeric(19,4)",
                precision: 19,
                scale: 4,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "RefundBaseAmount",
                table: "pos_z_drawer_summaries",
                type: "numeric(19,4)",
                precision: 19,
                scale: 4,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.CreateTable(
                name: "pos_refunds",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    DocumentNumber = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    PosSaleId = table.Column<Guid>(type: "uuid", nullable: false),
                    SalesInvoiceId = table.Column<Guid>(type: "uuid", nullable: false),
                    BranchId = table.Column<Guid>(type: "uuid", nullable: false),
                    PosSessionId = table.Column<Guid>(type: "uuid", nullable: false),
                    CustomerId = table.Column<Guid>(type: "uuid", nullable: true),
                    Reason = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    Notes = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    IsVoid = table.Column<bool>(type: "boolean", nullable: false),
                    Status = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    TotalRefundBase = table.Column<decimal>(type: "numeric(19,4)", precision: 19, scale: 4, nullable: false),
                    ReceivableReversalBase = table.Column<decimal>(type: "numeric(19,4)", precision: 19, scale: 4, nullable: false),
                    CashRefundBase = table.Column<decimal>(type: "numeric(19,4)", precision: 19, scale: 4, nullable: false),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    ApprovedByUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    PostedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    JournalEntryId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_pos_refunds", x => x.Id);
                    table.ForeignKey(
                        name: "FK_pos_refunds_branches_BranchId",
                        column: x => x.BranchId,
                        principalTable: "branches",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_pos_refunds_contacts_CustomerId",
                        column: x => x.CustomerId,
                        principalTable: "contacts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_pos_refunds_journal_entries_JournalEntryId",
                        column: x => x.JournalEntryId,
                        principalTable: "journal_entries",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_pos_refunds_pos_sales_PosSaleId",
                        column: x => x.PosSaleId,
                        principalTable: "pos_sales",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_pos_refunds_pos_sessions_PosSessionId",
                        column: x => x.PosSessionId,
                        principalTable: "pos_sessions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_pos_refunds_sales_invoices_SalesInvoiceId",
                        column: x => x.SalesInvoiceId,
                        principalTable: "sales_invoices",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_pos_refunds_users_ApprovedByUserId",
                        column: x => x.ApprovedByUserId,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_pos_refunds_users_CreatedByUserId",
                        column: x => x.CreatedByUserId,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "pos_refund_lines",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PosRefundId = table.Column<Guid>(type: "uuid", nullable: false),
                    OriginalSalesInvoiceLineId = table.Column<Guid>(type: "uuid", nullable: false),
                    LineType = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    ServiceId = table.Column<Guid>(type: "uuid", nullable: true),
                    ProductId = table.Column<Guid>(type: "uuid", nullable: true),
                    UnitOfMeasureId = table.Column<Guid>(type: "uuid", nullable: true),
                    ProfessionalUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    Description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    UnitCode = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: true),
                    ProfessionalUsername = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    Quantity = table.Column<decimal>(type: "numeric(19,4)", precision: 19, scale: 4, nullable: false),
                    BaseQuantity = table.Column<decimal>(type: "numeric(19,4)", precision: 19, scale: 4, nullable: false),
                    RefundAmountBase = table.Column<decimal>(type: "numeric(19,4)", precision: 19, scale: 4, nullable: false),
                    RestockProduct = table.Column<bool>(type: "boolean", nullable: false),
                    OriginalUnitCostBase = table.Column<decimal>(type: "numeric(19,4)", precision: 19, scale: 4, nullable: true),
                    RevenueAccountId = table.Column<Guid>(type: "uuid", nullable: false),
                    InventoryAccountId = table.Column<Guid>(type: "uuid", nullable: true),
                    CostOfGoodsSoldAccountId = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_pos_refund_lines", x => x.Id);
                    table.ForeignKey(
                        name: "FK_pos_refund_lines_pos_refunds_PosRefundId",
                        column: x => x.PosRefundId,
                        principalTable: "pos_refunds",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_pos_refund_lines_sales_invoice_lines_OriginalSalesInvoiceLi~",
                        column: x => x.OriginalSalesInvoiceLineId,
                        principalTable: "sales_invoice_lines",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "pos_refund_tenders",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PosRefundId = table.Column<Guid>(type: "uuid", nullable: false),
                    Sequence = table.Column<int>(type: "integer", nullable: false),
                    MoneyAccountId = table.Column<Guid>(type: "uuid", nullable: false),
                    Amount = table.Column<decimal>(type: "numeric(19,4)", precision: 19, scale: 4, nullable: false),
                    ExchangeRate = table.Column<decimal>(type: "numeric(19,6)", precision: 19, scale: 6, nullable: false),
                    BaseAmount = table.Column<decimal>(type: "numeric(19,4)", precision: 19, scale: 4, nullable: false),
                    MoneyLedgerEntryId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_pos_refund_tenders", x => x.Id);
                    table.ForeignKey(
                        name: "FK_pos_refund_tenders_money_accounts_MoneyAccountId",
                        column: x => x.MoneyAccountId,
                        principalTable: "money_accounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_pos_refund_tenders_money_ledger_entries_MoneyLedgerEntryId",
                        column: x => x.MoneyLedgerEntryId,
                        principalTable: "money_ledger_entries",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_pos_refund_tenders_pos_refunds_PosRefundId",
                        column: x => x.PosRefundId,
                        principalTable: "pos_refunds",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_stock_movements_PosRefundLineId",
                table: "stock_movements",
                column: "PosRefundLineId");

            migrationBuilder.CreateIndex(
                name: "IX_sales_invoices_AccountsReceivableAccountId",
                table: "sales_invoices",
                column: "AccountsReceivableAccountId");

            migrationBuilder.CreateIndex(
                name: "IX_sales_invoice_lines_RevenueAccountId",
                table: "sales_invoice_lines",
                column: "RevenueAccountId");

            migrationBuilder.CreateIndex(
                name: "IX_pos_refund_lines_OriginalSalesInvoiceLineId",
                table: "pos_refund_lines",
                column: "OriginalSalesInvoiceLineId");

            migrationBuilder.CreateIndex(
                name: "IX_pos_refund_lines_PosRefundId_OriginalSalesInvoiceLineId",
                table: "pos_refund_lines",
                columns: new[] { "PosRefundId", "OriginalSalesInvoiceLineId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_pos_refund_tenders_MoneyAccountId",
                table: "pos_refund_tenders",
                column: "MoneyAccountId");

            migrationBuilder.CreateIndex(
                name: "IX_pos_refund_tenders_MoneyLedgerEntryId",
                table: "pos_refund_tenders",
                column: "MoneyLedgerEntryId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_pos_refund_tenders_PosRefundId_Sequence",
                table: "pos_refund_tenders",
                columns: new[] { "PosRefundId", "Sequence" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_pos_refunds_ApprovedByUserId",
                table: "pos_refunds",
                column: "ApprovedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_pos_refunds_BranchId",
                table: "pos_refunds",
                column: "BranchId");

            migrationBuilder.CreateIndex(
                name: "IX_pos_refunds_CreatedByUserId",
                table: "pos_refunds",
                column: "CreatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_pos_refunds_CustomerId",
                table: "pos_refunds",
                column: "CustomerId");

            migrationBuilder.CreateIndex(
                name: "IX_pos_refunds_DocumentNumber",
                table: "pos_refunds",
                column: "DocumentNumber",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_pos_refunds_JournalEntryId",
                table: "pos_refunds",
                column: "JournalEntryId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_pos_refunds_PosSaleId_PostedAtUtc",
                table: "pos_refunds",
                columns: new[] { "PosSaleId", "PostedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_pos_refunds_PosSessionId_PostedAtUtc",
                table: "pos_refunds",
                columns: new[] { "PosSessionId", "PostedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_pos_refunds_SalesInvoiceId",
                table: "pos_refunds",
                column: "SalesInvoiceId");

            migrationBuilder.AddForeignKey(
                name: "FK_stock_movements_pos_refund_lines_PosRefundLineId",
                table: "stock_movements",
                column: "PosRefundLineId",
                principalTable: "pos_refund_lines",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_stock_movements_pos_refund_lines_PosRefundLineId",
                table: "stock_movements");

            migrationBuilder.DropTable(
                name: "pos_refund_lines");

            migrationBuilder.DropTable(
                name: "pos_refund_tenders");

            migrationBuilder.DropTable(
                name: "pos_refunds");

            migrationBuilder.DropIndex(
                name: "IX_stock_movements_PosRefundLineId",
                table: "stock_movements");

            migrationBuilder.DropIndex(
                name: "IX_sales_invoices_AccountsReceivableAccountId",
                table: "sales_invoices");

            migrationBuilder.DropIndex(
                name: "IX_sales_invoice_lines_RevenueAccountId",
                table: "sales_invoice_lines");

            migrationBuilder.DropColumn(
                name: "PosRefundLineId",
                table: "stock_movements");

            migrationBuilder.DropColumn(
                name: "AccountsReceivableAccountId",
                table: "sales_invoices");

            migrationBuilder.DropColumn(
                name: "CostOfGoodsSoldAccountId",
                table: "sales_invoice_lines");

            migrationBuilder.DropColumn(
                name: "InventoryAccountId",
                table: "sales_invoice_lines");

            migrationBuilder.DropColumn(
                name: "OriginalUnitCostBase",
                table: "sales_invoice_lines");

            migrationBuilder.DropColumn(
                name: "RevenueAccountId",
                table: "sales_invoice_lines");

            migrationBuilder.DropColumn(
                name: "NetSalesBase",
                table: "pos_z_reports");

            migrationBuilder.DropColumn(
                name: "ProductRefundsBase",
                table: "pos_z_reports");

            migrationBuilder.DropColumn(
                name: "RefundCount",
                table: "pos_z_reports");

            migrationBuilder.DropColumn(
                name: "RefundTotalBase",
                table: "pos_z_reports");

            migrationBuilder.DropColumn(
                name: "ServiceRefundsBase",
                table: "pos_z_reports");

            migrationBuilder.DropColumn(
                name: "RefundAmount",
                table: "pos_z_payment_summaries");

            migrationBuilder.DropColumn(
                name: "RefundBaseAmount",
                table: "pos_z_payment_summaries");

            migrationBuilder.DropColumn(
                name: "RefundAmount",
                table: "pos_z_drawer_summaries");

            migrationBuilder.DropColumn(
                name: "RefundBaseAmount",
                table: "pos_z_drawer_summaries");
        }
    }
}
