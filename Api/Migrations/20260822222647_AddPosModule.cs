using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace api.Migrations
{
    /// <inheritdoc />
    public partial class AddPosModule : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "ProfessionalUserId",
                table: "sales_invoice_lines",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "pos_sales",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    DocumentNumber = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    SalesInvoiceId = table.Column<Guid>(type: "uuid", nullable: false),
                    Status = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    CashierUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    CompletedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_pos_sales", x => x.Id);
                    table.ForeignKey(
                        name: "FK_pos_sales_sales_invoices_SalesInvoiceId",
                        column: x => x.SalesInvoiceId,
                        principalTable: "sales_invoices",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_pos_sales_users_CashierUserId",
                        column: x => x.CashierUserId,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "pos_sale_changes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PosSaleId = table.Column<Guid>(type: "uuid", nullable: false),
                    MoneyAccountId = table.Column<Guid>(type: "uuid", nullable: false),
                    Amount = table.Column<decimal>(type: "numeric(19,4)", precision: 19, scale: 4, nullable: false),
                    ExchangeRate = table.Column<decimal>(type: "numeric(19,6)", precision: 19, scale: 6, nullable: false),
                    BaseAmount = table.Column<decimal>(type: "numeric(19,4)", precision: 19, scale: 4, nullable: false),
                    MoneyLedgerEntryId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_pos_sale_changes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_pos_sale_changes_money_accounts_MoneyAccountId",
                        column: x => x.MoneyAccountId,
                        principalTable: "money_accounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_pos_sale_changes_money_ledger_entries_MoneyLedgerEntryId",
                        column: x => x.MoneyLedgerEntryId,
                        principalTable: "money_ledger_entries",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_pos_sale_changes_pos_sales_PosSaleId",
                        column: x => x.PosSaleId,
                        principalTable: "pos_sales",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "pos_sale_tenders",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PosSaleId = table.Column<Guid>(type: "uuid", nullable: false),
                    Sequence = table.Column<int>(type: "integer", nullable: false),
                    MoneyAccountId = table.Column<Guid>(type: "uuid", nullable: false),
                    TenderedAmount = table.Column<decimal>(type: "numeric(19,4)", precision: 19, scale: 4, nullable: false),
                    ExchangeRate = table.Column<decimal>(type: "numeric(19,6)", precision: 19, scale: 6, nullable: false),
                    BaseAmount = table.Column<decimal>(type: "numeric(19,4)", precision: 19, scale: 4, nullable: false),
                    MoneyLedgerEntryId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_pos_sale_tenders", x => x.Id);
                    table.ForeignKey(
                        name: "FK_pos_sale_tenders_money_accounts_MoneyAccountId",
                        column: x => x.MoneyAccountId,
                        principalTable: "money_accounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_pos_sale_tenders_money_ledger_entries_MoneyLedgerEntryId",
                        column: x => x.MoneyLedgerEntryId,
                        principalTable: "money_ledger_entries",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_pos_sale_tenders_pos_sales_PosSaleId",
                        column: x => x.PosSaleId,
                        principalTable: "pos_sales",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_sales_invoice_lines_ProfessionalUserId",
                table: "sales_invoice_lines",
                column: "ProfessionalUserId");

            migrationBuilder.CreateIndex(
                name: "IX_pos_sale_changes_MoneyAccountId",
                table: "pos_sale_changes",
                column: "MoneyAccountId");

            migrationBuilder.CreateIndex(
                name: "IX_pos_sale_changes_MoneyLedgerEntryId",
                table: "pos_sale_changes",
                column: "MoneyLedgerEntryId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_pos_sale_changes_PosSaleId",
                table: "pos_sale_changes",
                column: "PosSaleId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_pos_sale_tenders_MoneyAccountId",
                table: "pos_sale_tenders",
                column: "MoneyAccountId");

            migrationBuilder.CreateIndex(
                name: "IX_pos_sale_tenders_MoneyLedgerEntryId",
                table: "pos_sale_tenders",
                column: "MoneyLedgerEntryId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_pos_sale_tenders_PosSaleId_Sequence",
                table: "pos_sale_tenders",
                columns: new[] { "PosSaleId", "Sequence" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_pos_sales_CashierUserId",
                table: "pos_sales",
                column: "CashierUserId");

            migrationBuilder.CreateIndex(
                name: "IX_pos_sales_CompletedAtUtc_Status",
                table: "pos_sales",
                columns: new[] { "CompletedAtUtc", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_pos_sales_DocumentNumber",
                table: "pos_sales",
                column: "DocumentNumber",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_pos_sales_SalesInvoiceId",
                table: "pos_sales",
                column: "SalesInvoiceId",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_sales_invoice_lines_users_ProfessionalUserId",
                table: "sales_invoice_lines",
                column: "ProfessionalUserId",
                principalTable: "users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_sales_invoice_lines_users_ProfessionalUserId",
                table: "sales_invoice_lines");

            migrationBuilder.DropTable(
                name: "pos_sale_changes");

            migrationBuilder.DropTable(
                name: "pos_sale_tenders");

            migrationBuilder.DropTable(
                name: "pos_sales");

            migrationBuilder.DropIndex(
                name: "IX_sales_invoice_lines_ProfessionalUserId",
                table: "sales_invoice_lines");

            migrationBuilder.DropColumn(
                name: "ProfessionalUserId",
                table: "sales_invoice_lines");
        }
    }
}
