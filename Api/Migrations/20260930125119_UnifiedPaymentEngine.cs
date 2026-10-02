using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace api.Migrations
{
    /// <inheritdoc />
    public partial class UnifiedPaymentEngine : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Unified Payment Engine is a fresh-database cutover. Do not partially
            // apply its destructive schema changes to legacy transactional data.
            migrationBuilder.Sql(
                """
                DO $$
                BEGIN
                    IF EXISTS (SELECT 1 FROM sales_invoices)
                       OR EXISTS (SELECT 1 FROM customer_receipts)
                       OR EXISTS (SELECT 1 FROM pos_sales)
                       OR EXISTS (SELECT 1 FROM branches) THEN
                        RAISE EXCEPTION 'UnifiedPaymentEngine requires a reset database. Drop and recreate the database before applying this migration.';
                    END IF;
                END $$;
                """);

            migrationBuilder.DropForeignKey(
                name: "FK_customer_receipts_journal_entries_JournalEntryId",
                table: "customer_receipts");

            migrationBuilder.DropForeignKey(
                name: "FK_pos_sale_changes_money_ledger_entries_MoneyLedgerEntryId",
                table: "pos_sale_changes");

            migrationBuilder.DropForeignKey(
                name: "FK_pos_sale_tenders_money_ledger_entries_MoneyLedgerEntryId",
                table: "pos_sale_tenders");

            migrationBuilder.DropTable(
                name: "customer_receipt_allocations");

            migrationBuilder.DropIndex(
                name: "IX_customer_receipts_JournalEntryId",
                table: "customer_receipts");

            migrationBuilder.DropIndex(
                name: "IX_contacts_CatalogBranchId",
                table: "contacts");

            migrationBuilder.RenameColumn(
                name: "MoneyLedgerEntryId",
                table: "pos_sale_tenders",
                newName: "PaymentMoneyLineId");

            migrationBuilder.RenameIndex(
                name: "IX_pos_sale_tenders_MoneyLedgerEntryId",
                table: "pos_sale_tenders",
                newName: "IX_pos_sale_tenders_PaymentMoneyLineId");

            migrationBuilder.RenameColumn(
                name: "MoneyLedgerEntryId",
                table: "pos_sale_changes",
                newName: "PaymentMoneyLineId");

            migrationBuilder.RenameIndex(
                name: "IX_pos_sale_changes_MoneyLedgerEntryId",
                table: "pos_sale_changes",
                newName: "IX_pos_sale_changes_PaymentMoneyLineId");

            migrationBuilder.RenameColumn(
                name: "JournalEntryId",
                table: "customer_receipts",
                newName: "PaymentId");

            migrationBuilder.AlterColumn<Guid>(
                name: "CustomerId",
                table: "sales_invoices",
                type: "uuid",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "PaymentId",
                table: "pos_sales",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DeleteReason",
                table: "customer_receipts",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "DeletedAtUtc",
                table: "customer_receipts",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "DeletedByUserId",
                table: "customer_receipts",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsDeleted",
                table: "customer_receipts",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "SystemRole",
                table: "contacts",
                type: "character varying(32)",
                maxLength: 32,
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "WalkInCustomerId",
                table: "branches",
                type: "uuid",
                nullable: false);

            migrationBuilder.CreateTable(
                name: "customer_receipt_draft_allocations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CustomerReceiptId = table.Column<Guid>(type: "uuid", nullable: false),
                    SalesInvoiceId = table.Column<Guid>(type: "uuid", nullable: false),
                    Amount = table.Column<decimal>(type: "numeric(19,4)", precision: 19, scale: 4, nullable: false),
                    BaseAmount = table.Column<decimal>(type: "numeric(19,4)", precision: 19, scale: 4, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_customer_receipt_draft_allocations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_customer_receipt_draft_allocations_customer_receipts_Custom~",
                        column: x => x.CustomerReceiptId,
                        principalTable: "customer_receipts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_customer_receipt_draft_allocations_sales_invoices_SalesInvo~",
                        column: x => x.SalesInvoiceId,
                        principalTable: "sales_invoices",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "payment_document_counters",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    NextValue = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_payment_document_counters", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "payments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    DocumentNumber = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    BranchId = table.Column<Guid>(type: "uuid", nullable: false),
                    CustomerId = table.Column<Guid>(type: "uuid", nullable: false),
                    PaymentDate = table.Column<DateOnly>(type: "date", nullable: false),
                    CurrencyId = table.Column<Guid>(type: "uuid", nullable: false),
                    BaseCurrencyId = table.Column<Guid>(type: "uuid", nullable: false),
                    Amount = table.Column<decimal>(type: "numeric(19,4)", precision: 19, scale: 4, nullable: false),
                    BaseAmount = table.Column<decimal>(type: "numeric(19,4)", precision: 19, scale: 4, nullable: false),
                    Origin = table.Column<string>(type: "character varying(24)", maxLength: 24, nullable: false),
                    SourceSalesInvoiceId = table.Column<Guid>(type: "uuid", nullable: true),
                    Notes = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    JournalEntryId = table.Column<Guid>(type: "uuid", nullable: false),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    DeletedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    DeletedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    DeleteReason = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_payments", x => x.Id);
                    table.CheckConstraint("CK_payments_amounts", "\"Amount\" > 0 AND \"BaseAmount\" > 0");
                    table.CheckConstraint("CK_payments_delete_metadata", "(\"IsDeleted\" = false AND \"DeletedAtUtc\" IS NULL AND \"DeletedByUserId\" IS NULL AND \"DeleteReason\" IS NULL) OR (\"IsDeleted\" = true AND \"DeletedAtUtc\" IS NOT NULL AND \"DeletedByUserId\" IS NOT NULL AND \"DeleteReason\" IS NOT NULL)");
                    table.CheckConstraint("CK_payments_origin_source", "(\"Origin\" = 'CustomerReceipt' AND \"SourceSalesInvoiceId\" IS NULL) OR (\"Origin\" IN ('SalesInvoice', 'Pos') AND \"SourceSalesInvoiceId\" IS NOT NULL)");
                    table.ForeignKey(
                        name: "FK_payments_branches_BranchId",
                        column: x => x.BranchId,
                        principalTable: "branches",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_payments_contacts_CustomerId",
                        column: x => x.CustomerId,
                        principalTable: "contacts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_payments_currencies_BaseCurrencyId",
                        column: x => x.BaseCurrencyId,
                        principalTable: "currencies",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_payments_currencies_CurrencyId",
                        column: x => x.CurrencyId,
                        principalTable: "currencies",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_payments_journal_entries_JournalEntryId",
                        column: x => x.JournalEntryId,
                        principalTable: "journal_entries",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_payments_sales_invoices_SourceSalesInvoiceId",
                        column: x => x.SourceSalesInvoiceId,
                        principalTable: "sales_invoices",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_payments_users_CreatedByUserId",
                        column: x => x.CreatedByUserId,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_payments_users_DeletedByUserId",
                        column: x => x.DeletedByUserId,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "payment_allocations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PaymentId = table.Column<Guid>(type: "uuid", nullable: false),
                    SalesInvoiceId = table.Column<Guid>(type: "uuid", nullable: false),
                    Amount = table.Column<decimal>(type: "numeric(19,4)", precision: 19, scale: 4, nullable: false),
                    BaseAmount = table.Column<decimal>(type: "numeric(19,4)", precision: 19, scale: 4, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_payment_allocations", x => x.Id);
                    table.CheckConstraint("CK_payment_allocations_amounts", "\"Amount\" > 0 AND \"BaseAmount\" > 0");
                    table.ForeignKey(
                        name: "FK_payment_allocations_payments_PaymentId",
                        column: x => x.PaymentId,
                        principalTable: "payments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_payment_allocations_sales_invoices_SalesInvoiceId",
                        column: x => x.SalesInvoiceId,
                        principalTable: "sales_invoices",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "payment_money_lines",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PaymentId = table.Column<Guid>(type: "uuid", nullable: false),
                    Sequence = table.Column<int>(type: "integer", nullable: false),
                    MoneyAccountId = table.Column<Guid>(type: "uuid", nullable: false),
                    CurrencyId = table.Column<Guid>(type: "uuid", nullable: false),
                    Amount = table.Column<decimal>(type: "numeric(19,4)", precision: 19, scale: 4, nullable: false),
                    ExchangeRate = table.Column<decimal>(type: "numeric(19,6)", precision: 19, scale: 6, nullable: false),
                    BaseAmount = table.Column<decimal>(type: "numeric(19,4)", precision: 19, scale: 4, nullable: false),
                    Direction = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    MoneyLedgerEntryId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_payment_money_lines", x => x.Id);
                    table.CheckConstraint("CK_payment_money_lines_amounts", "\"Amount\" > 0 AND \"ExchangeRate\" > 0 AND \"BaseAmount\" > 0");
                    table.CheckConstraint("CK_payment_money_lines_sequence", "\"Sequence\" > 0");
                    table.ForeignKey(
                        name: "FK_payment_money_lines_currencies_CurrencyId",
                        column: x => x.CurrencyId,
                        principalTable: "currencies",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_payment_money_lines_money_accounts_MoneyAccountId",
                        column: x => x.MoneyAccountId,
                        principalTable: "money_accounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_payment_money_lines_money_ledger_entries_MoneyLedgerEntryId",
                        column: x => x.MoneyLedgerEntryId,
                        principalTable: "money_ledger_entries",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_payment_money_lines_payments_PaymentId",
                        column: x => x.PaymentId,
                        principalTable: "payments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.InsertData(
                table: "payment_document_counters",
                columns: new[] { "Id", "NextValue" },
                values: new object[] { 1, 1L });

            migrationBuilder.CreateIndex(
                name: "IX_pos_sales_PaymentId",
                table: "pos_sales",
                column: "PaymentId",
                unique: true,
                filter: "\"PaymentId\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_customer_receipts_DeletedByUserId",
                table: "customer_receipts",
                column: "DeletedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_customer_receipts_PaymentId",
                table: "customer_receipts",
                column: "PaymentId",
                unique: true,
                filter: "\"PaymentId\" IS NOT NULL");

            migrationBuilder.AddCheckConstraint(
                name: "CK_customer_receipts_posting_state",
                table: "customer_receipts",
                sql: "(\"Status\" = 'Draft' AND \"PaymentId\" IS NULL) OR (\"Status\" = 'Posted' AND \"PaymentId\" IS NOT NULL)");

            migrationBuilder.CreateIndex(
                name: "IX_contacts_CatalogBranchId_SystemRole",
                table: "contacts",
                columns: new[] { "CatalogBranchId", "SystemRole" },
                unique: true,
                filter: "\"CatalogBranchId\" IS NOT NULL AND \"SystemRole\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_contacts_SystemRole",
                table: "contacts",
                column: "SystemRole",
                unique: true,
                filter: "\"CatalogBranchId\" IS NULL AND \"SystemRole\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_branches_WalkInCustomerId",
                table: "branches",
                column: "WalkInCustomerId");

            migrationBuilder.CreateIndex(
                name: "IX_customer_receipt_draft_allocations_CustomerReceiptId_SalesI~",
                table: "customer_receipt_draft_allocations",
                columns: new[] { "CustomerReceiptId", "SalesInvoiceId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_customer_receipt_draft_allocations_SalesInvoiceId",
                table: "customer_receipt_draft_allocations",
                column: "SalesInvoiceId");

            migrationBuilder.CreateIndex(
                name: "IX_payment_allocations_PaymentId_SalesInvoiceId",
                table: "payment_allocations",
                columns: new[] { "PaymentId", "SalesInvoiceId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_payment_allocations_SalesInvoiceId",
                table: "payment_allocations",
                column: "SalesInvoiceId");

            migrationBuilder.CreateIndex(
                name: "IX_payment_money_lines_CurrencyId",
                table: "payment_money_lines",
                column: "CurrencyId");

            migrationBuilder.CreateIndex(
                name: "IX_payment_money_lines_MoneyAccountId",
                table: "payment_money_lines",
                column: "MoneyAccountId");

            migrationBuilder.CreateIndex(
                name: "IX_payment_money_lines_MoneyLedgerEntryId",
                table: "payment_money_lines",
                column: "MoneyLedgerEntryId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_payment_money_lines_PaymentId_Sequence",
                table: "payment_money_lines",
                columns: new[] { "PaymentId", "Sequence" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_payments_BaseCurrencyId",
                table: "payments",
                column: "BaseCurrencyId");

            migrationBuilder.CreateIndex(
                name: "IX_payments_BranchId_PaymentDate",
                table: "payments",
                columns: new[] { "BranchId", "PaymentDate" });

            migrationBuilder.CreateIndex(
                name: "IX_payments_CreatedByUserId",
                table: "payments",
                column: "CreatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_payments_CurrencyId",
                table: "payments",
                column: "CurrencyId");

            migrationBuilder.CreateIndex(
                name: "IX_payments_CustomerId",
                table: "payments",
                column: "CustomerId");

            migrationBuilder.CreateIndex(
                name: "IX_payments_DeletedByUserId",
                table: "payments",
                column: "DeletedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_payments_DocumentNumber",
                table: "payments",
                column: "DocumentNumber",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_payments_JournalEntryId",
                table: "payments",
                column: "JournalEntryId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_payments_SourceSalesInvoiceId",
                table: "payments",
                column: "SourceSalesInvoiceId",
                filter: "\"SourceSalesInvoiceId\" IS NOT NULL");

            migrationBuilder.AddForeignKey(
                name: "FK_branches_contacts_WalkInCustomerId",
                table: "branches",
                column: "WalkInCustomerId",
                principalTable: "contacts",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_customer_receipts_payments_PaymentId",
                table: "customer_receipts",
                column: "PaymentId",
                principalTable: "payments",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_customer_receipts_users_DeletedByUserId",
                table: "customer_receipts",
                column: "DeletedByUserId",
                principalTable: "users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_pos_sale_changes_payment_money_lines_PaymentMoneyLineId",
                table: "pos_sale_changes",
                column: "PaymentMoneyLineId",
                principalTable: "payment_money_lines",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_pos_sale_tenders_payment_money_lines_PaymentMoneyLineId",
                table: "pos_sale_tenders",
                column: "PaymentMoneyLineId",
                principalTable: "payment_money_lines",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_pos_sales_payments_PaymentId",
                table: "pos_sales",
                column: "PaymentId",
                principalTable: "payments",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_branches_contacts_WalkInCustomerId",
                table: "branches");

            migrationBuilder.DropForeignKey(
                name: "FK_customer_receipts_payments_PaymentId",
                table: "customer_receipts");

            migrationBuilder.DropForeignKey(
                name: "FK_customer_receipts_users_DeletedByUserId",
                table: "customer_receipts");

            migrationBuilder.DropForeignKey(
                name: "FK_pos_sale_changes_payment_money_lines_PaymentMoneyLineId",
                table: "pos_sale_changes");

            migrationBuilder.DropForeignKey(
                name: "FK_pos_sale_tenders_payment_money_lines_PaymentMoneyLineId",
                table: "pos_sale_tenders");

            migrationBuilder.DropForeignKey(
                name: "FK_pos_sales_payments_PaymentId",
                table: "pos_sales");

            migrationBuilder.DropTable(
                name: "customer_receipt_draft_allocations");

            migrationBuilder.DropTable(
                name: "payment_allocations");

            migrationBuilder.DropTable(
                name: "payment_document_counters");

            migrationBuilder.DropTable(
                name: "payment_money_lines");

            migrationBuilder.DropTable(
                name: "payments");

            migrationBuilder.DropIndex(
                name: "IX_pos_sales_PaymentId",
                table: "pos_sales");

            migrationBuilder.DropIndex(
                name: "IX_customer_receipts_DeletedByUserId",
                table: "customer_receipts");

            migrationBuilder.DropIndex(
                name: "IX_customer_receipts_PaymentId",
                table: "customer_receipts");

            migrationBuilder.DropCheckConstraint(
                name: "CK_customer_receipts_posting_state",
                table: "customer_receipts");

            migrationBuilder.DropIndex(
                name: "IX_contacts_CatalogBranchId_SystemRole",
                table: "contacts");

            migrationBuilder.DropIndex(
                name: "IX_contacts_SystemRole",
                table: "contacts");

            migrationBuilder.DropIndex(
                name: "IX_branches_WalkInCustomerId",
                table: "branches");

            migrationBuilder.DropColumn(
                name: "PaymentId",
                table: "pos_sales");

            migrationBuilder.DropColumn(
                name: "DeleteReason",
                table: "customer_receipts");

            migrationBuilder.DropColumn(
                name: "DeletedAtUtc",
                table: "customer_receipts");

            migrationBuilder.DropColumn(
                name: "DeletedByUserId",
                table: "customer_receipts");

            migrationBuilder.DropColumn(
                name: "IsDeleted",
                table: "customer_receipts");

            migrationBuilder.DropColumn(
                name: "SystemRole",
                table: "contacts");

            migrationBuilder.DropColumn(
                name: "WalkInCustomerId",
                table: "branches");

            migrationBuilder.RenameColumn(
                name: "PaymentMoneyLineId",
                table: "pos_sale_tenders",
                newName: "MoneyLedgerEntryId");

            migrationBuilder.RenameIndex(
                name: "IX_pos_sale_tenders_PaymentMoneyLineId",
                table: "pos_sale_tenders",
                newName: "IX_pos_sale_tenders_MoneyLedgerEntryId");

            migrationBuilder.RenameColumn(
                name: "PaymentMoneyLineId",
                table: "pos_sale_changes",
                newName: "MoneyLedgerEntryId");

            migrationBuilder.RenameIndex(
                name: "IX_pos_sale_changes_PaymentMoneyLineId",
                table: "pos_sale_changes",
                newName: "IX_pos_sale_changes_MoneyLedgerEntryId");

            migrationBuilder.RenameColumn(
                name: "PaymentId",
                table: "customer_receipts",
                newName: "JournalEntryId");

            migrationBuilder.AlterColumn<Guid>(
                name: "CustomerId",
                table: "sales_invoices",
                type: "uuid",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uuid");

            migrationBuilder.CreateTable(
                name: "customer_receipt_allocations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CustomerReceiptId = table.Column<Guid>(type: "uuid", nullable: false),
                    SalesInvoiceId = table.Column<Guid>(type: "uuid", nullable: false),
                    Amount = table.Column<decimal>(type: "numeric(19,4)", precision: 19, scale: 4, nullable: false),
                    BaseAmount = table.Column<decimal>(type: "numeric(19,4)", precision: 19, scale: 4, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_customer_receipt_allocations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_customer_receipt_allocations_customer_receipts_CustomerRece~",
                        column: x => x.CustomerReceiptId,
                        principalTable: "customer_receipts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_customer_receipt_allocations_sales_invoices_SalesInvoiceId",
                        column: x => x.SalesInvoiceId,
                        principalTable: "sales_invoices",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_customer_receipts_JournalEntryId",
                table: "customer_receipts",
                column: "JournalEntryId",
                unique: true,
                filter: "\"JournalEntryId\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_contacts_CatalogBranchId",
                table: "contacts",
                column: "CatalogBranchId");

            migrationBuilder.CreateIndex(
                name: "IX_customer_receipt_allocations_CustomerReceiptId_SalesInvoice~",
                table: "customer_receipt_allocations",
                columns: new[] { "CustomerReceiptId", "SalesInvoiceId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_customer_receipt_allocations_SalesInvoiceId",
                table: "customer_receipt_allocations",
                column: "SalesInvoiceId");

            migrationBuilder.AddForeignKey(
                name: "FK_customer_receipts_journal_entries_JournalEntryId",
                table: "customer_receipts",
                column: "JournalEntryId",
                principalTable: "journal_entries",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_pos_sale_changes_money_ledger_entries_MoneyLedgerEntryId",
                table: "pos_sale_changes",
                column: "MoneyLedgerEntryId",
                principalTable: "money_ledger_entries",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_pos_sale_tenders_money_ledger_entries_MoneyLedgerEntryId",
                table: "pos_sale_tenders",
                column: "MoneyLedgerEntryId",
                principalTable: "money_ledger_entries",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }
    }
}
