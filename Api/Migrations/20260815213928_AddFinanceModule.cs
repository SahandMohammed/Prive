using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace api.Migrations
{
    /// <inheritdoc />
    public partial class AddFinanceModule : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "exchange_rates",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    FromCurrencyId = table.Column<Guid>(type: "uuid", nullable: false),
                    ToCurrencyId = table.Column<Guid>(type: "uuid", nullable: false),
                    Rate = table.Column<decimal>(type: "numeric(19,6)", precision: 19, scale: 6, nullable: false),
                    EffectiveAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_exchange_rates", x => x.Id);
                    table.ForeignKey(
                        name: "FK_exchange_rates_currencies_FromCurrencyId",
                        column: x => x.FromCurrencyId,
                        principalTable: "currencies",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_exchange_rates_currencies_ToCurrencyId",
                        column: x => x.ToCurrencyId,
                        principalTable: "currencies",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_exchange_rates_users_CreatedByUserId",
                        column: x => x.CreatedByUserId,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "money_accounts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Code = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Type = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    BranchId = table.Column<Guid>(type: "uuid", nullable: false),
                    CurrencyId = table.Column<Guid>(type: "uuid", nullable: false),
                    AccountingAccountId = table.Column<Guid>(type: "uuid", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    Notes = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    BankName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    AccountNumberOrIban = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_money_accounts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_money_accounts_accounts_AccountingAccountId",
                        column: x => x.AccountingAccountId,
                        principalTable: "accounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_money_accounts_branches_BranchId",
                        column: x => x.BranchId,
                        principalTable: "branches",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_money_accounts_currencies_CurrencyId",
                        column: x => x.CurrencyId,
                        principalTable: "currencies",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "money_account_access",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    MoneyAccountId = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    AccessLevel = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_money_account_access", x => x.Id);
                    table.ForeignKey(
                        name: "FK_money_account_access_money_accounts_MoneyAccountId",
                        column: x => x.MoneyAccountId,
                        principalTable: "money_accounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_money_account_access_users_UserId",
                        column: x => x.UserId,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "money_ledger_entries",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    MoneyAccountId = table.Column<Guid>(type: "uuid", nullable: false),
                    MovementDate = table.Column<DateOnly>(type: "date", nullable: false),
                    SourceType = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    SourceDocumentId = table.Column<Guid>(type: "uuid", nullable: false),
                    DocumentNumber = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    Amount = table.Column<decimal>(type: "numeric(19,4)", precision: 19, scale: 4, nullable: false),
                    BaseAmount = table.Column<decimal>(type: "numeric(19,4)", precision: 19, scale: 4, nullable: false),
                    CurrencyId = table.Column<Guid>(type: "uuid", nullable: false),
                    BaseCurrencyId = table.Column<Guid>(type: "uuid", nullable: false),
                    ExchangeRate = table.Column<decimal>(type: "numeric(19,6)", precision: 19, scale: 6, nullable: false),
                    JournalEntryId = table.Column<Guid>(type: "uuid", nullable: false),
                    PerformedByUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Notes = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    PostedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_money_ledger_entries", x => x.Id);
                    table.ForeignKey(
                        name: "FK_money_ledger_entries_currencies_BaseCurrencyId",
                        column: x => x.BaseCurrencyId,
                        principalTable: "currencies",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_money_ledger_entries_currencies_CurrencyId",
                        column: x => x.CurrencyId,
                        principalTable: "currencies",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_money_ledger_entries_journal_entries_JournalEntryId",
                        column: x => x.JournalEntryId,
                        principalTable: "journal_entries",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_money_ledger_entries_money_accounts_MoneyAccountId",
                        column: x => x.MoneyAccountId,
                        principalTable: "money_accounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_money_ledger_entries_users_PerformedByUserId",
                        column: x => x.PerformedByUserId,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "money_transfers",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    DocumentNumber = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    TransferDate = table.Column<DateOnly>(type: "date", nullable: false),
                    SourceMoneyAccountId = table.Column<Guid>(type: "uuid", nullable: false),
                    DestinationMoneyAccountId = table.Column<Guid>(type: "uuid", nullable: false),
                    CurrencyId = table.Column<Guid>(type: "uuid", nullable: false),
                    BaseCurrencyId = table.Column<Guid>(type: "uuid", nullable: false),
                    Amount = table.Column<decimal>(type: "numeric(19,4)", precision: 19, scale: 4, nullable: false),
                    ExchangeRate = table.Column<decimal>(type: "numeric(19,6)", precision: 19, scale: 6, nullable: false),
                    BaseAmount = table.Column<decimal>(type: "numeric(19,4)", precision: 19, scale: 4, nullable: false),
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
                    table.PrimaryKey("PK_money_transfers", x => x.Id);
                    table.ForeignKey(
                        name: "FK_money_transfers_currencies_BaseCurrencyId",
                        column: x => x.BaseCurrencyId,
                        principalTable: "currencies",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_money_transfers_currencies_CurrencyId",
                        column: x => x.CurrencyId,
                        principalTable: "currencies",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_money_transfers_journal_entries_JournalEntryId",
                        column: x => x.JournalEntryId,
                        principalTable: "journal_entries",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_money_transfers_money_accounts_DestinationMoneyAccountId",
                        column: x => x.DestinationMoneyAccountId,
                        principalTable: "money_accounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_money_transfers_money_accounts_SourceMoneyAccountId",
                        column: x => x.SourceMoneyAccountId,
                        principalTable: "money_accounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_money_transfers_users_CreatedByUserId",
                        column: x => x.CreatedByUserId,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "supplier_payments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    DocumentNumber = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    SupplierId = table.Column<Guid>(type: "uuid", nullable: false),
                    PaymentDate = table.Column<DateOnly>(type: "date", nullable: false),
                    MoneyAccountId = table.Column<Guid>(type: "uuid", nullable: false),
                    CurrencyId = table.Column<Guid>(type: "uuid", nullable: false),
                    BaseCurrencyId = table.Column<Guid>(type: "uuid", nullable: false),
                    ExchangeRate = table.Column<decimal>(type: "numeric(19,6)", precision: 19, scale: 6, nullable: false),
                    TotalAmount = table.Column<decimal>(type: "numeric(19,4)", precision: 19, scale: 4, nullable: false),
                    BaseTotalAmount = table.Column<decimal>(type: "numeric(19,4)", precision: 19, scale: 4, nullable: false),
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
                    table.PrimaryKey("PK_supplier_payments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_supplier_payments_contacts_SupplierId",
                        column: x => x.SupplierId,
                        principalTable: "contacts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_supplier_payments_currencies_BaseCurrencyId",
                        column: x => x.BaseCurrencyId,
                        principalTable: "currencies",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_supplier_payments_currencies_CurrencyId",
                        column: x => x.CurrencyId,
                        principalTable: "currencies",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_supplier_payments_journal_entries_JournalEntryId",
                        column: x => x.JournalEntryId,
                        principalTable: "journal_entries",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_supplier_payments_money_accounts_MoneyAccountId",
                        column: x => x.MoneyAccountId,
                        principalTable: "money_accounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_supplier_payments_users_CreatedByUserId",
                        column: x => x.CreatedByUserId,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "supplier_payment_allocations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SupplierPaymentId = table.Column<Guid>(type: "uuid", nullable: false),
                    PurchaseInvoiceId = table.Column<Guid>(type: "uuid", nullable: false),
                    Amount = table.Column<decimal>(type: "numeric(19,4)", precision: 19, scale: 4, nullable: false),
                    BaseAmount = table.Column<decimal>(type: "numeric(19,4)", precision: 19, scale: 4, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_supplier_payment_allocations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_supplier_payment_allocations_purchase_invoices_PurchaseInvo~",
                        column: x => x.PurchaseInvoiceId,
                        principalTable: "purchase_invoices",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_supplier_payment_allocations_supplier_payments_SupplierPaym~",
                        column: x => x.SupplierPaymentId,
                        principalTable: "supplier_payments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_exchange_rates_CreatedByUserId",
                table: "exchange_rates",
                column: "CreatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_exchange_rates_FromCurrencyId_ToCurrencyId_EffectiveAtUtc",
                table: "exchange_rates",
                columns: new[] { "FromCurrencyId", "ToCurrencyId", "EffectiveAtUtc" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_exchange_rates_ToCurrencyId",
                table: "exchange_rates",
                column: "ToCurrencyId");

            migrationBuilder.CreateIndex(
                name: "IX_money_account_access_MoneyAccountId_UserId",
                table: "money_account_access",
                columns: new[] { "MoneyAccountId", "UserId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_money_account_access_UserId",
                table: "money_account_access",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_money_accounts_AccountingAccountId",
                table: "money_accounts",
                column: "AccountingAccountId");

            migrationBuilder.CreateIndex(
                name: "IX_money_accounts_BranchId",
                table: "money_accounts",
                column: "BranchId");

            migrationBuilder.CreateIndex(
                name: "IX_money_accounts_Code",
                table: "money_accounts",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_money_accounts_CurrencyId",
                table: "money_accounts",
                column: "CurrencyId");

            migrationBuilder.CreateIndex(
                name: "IX_money_ledger_entries_BaseCurrencyId",
                table: "money_ledger_entries",
                column: "BaseCurrencyId");

            migrationBuilder.CreateIndex(
                name: "IX_money_ledger_entries_CurrencyId",
                table: "money_ledger_entries",
                column: "CurrencyId");

            migrationBuilder.CreateIndex(
                name: "IX_money_ledger_entries_JournalEntryId",
                table: "money_ledger_entries",
                column: "JournalEntryId");

            migrationBuilder.CreateIndex(
                name: "IX_money_ledger_entries_MoneyAccountId_MovementDate",
                table: "money_ledger_entries",
                columns: new[] { "MoneyAccountId", "MovementDate" });

            migrationBuilder.CreateIndex(
                name: "IX_money_ledger_entries_PerformedByUserId",
                table: "money_ledger_entries",
                column: "PerformedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_money_ledger_entries_SourceType_SourceDocumentId",
                table: "money_ledger_entries",
                columns: new[] { "SourceType", "SourceDocumentId" });

            migrationBuilder.CreateIndex(
                name: "IX_money_transfers_BaseCurrencyId",
                table: "money_transfers",
                column: "BaseCurrencyId");

            migrationBuilder.CreateIndex(
                name: "IX_money_transfers_CreatedByUserId",
                table: "money_transfers",
                column: "CreatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_money_transfers_CurrencyId",
                table: "money_transfers",
                column: "CurrencyId");

            migrationBuilder.CreateIndex(
                name: "IX_money_transfers_DestinationMoneyAccountId",
                table: "money_transfers",
                column: "DestinationMoneyAccountId");

            migrationBuilder.CreateIndex(
                name: "IX_money_transfers_DocumentNumber",
                table: "money_transfers",
                column: "DocumentNumber",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_money_transfers_JournalEntryId",
                table: "money_transfers",
                column: "JournalEntryId",
                unique: true,
                filter: "\"JournalEntryId\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_money_transfers_SourceMoneyAccountId",
                table: "money_transfers",
                column: "SourceMoneyAccountId");

            migrationBuilder.CreateIndex(
                name: "IX_money_transfers_TransferDate_Status",
                table: "money_transfers",
                columns: new[] { "TransferDate", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_supplier_payment_allocations_PurchaseInvoiceId",
                table: "supplier_payment_allocations",
                column: "PurchaseInvoiceId");

            migrationBuilder.CreateIndex(
                name: "IX_supplier_payment_allocations_SupplierPaymentId_PurchaseInvo~",
                table: "supplier_payment_allocations",
                columns: new[] { "SupplierPaymentId", "PurchaseInvoiceId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_supplier_payments_BaseCurrencyId",
                table: "supplier_payments",
                column: "BaseCurrencyId");

            migrationBuilder.CreateIndex(
                name: "IX_supplier_payments_CreatedByUserId",
                table: "supplier_payments",
                column: "CreatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_supplier_payments_CurrencyId",
                table: "supplier_payments",
                column: "CurrencyId");

            migrationBuilder.CreateIndex(
                name: "IX_supplier_payments_DocumentNumber",
                table: "supplier_payments",
                column: "DocumentNumber",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_supplier_payments_JournalEntryId",
                table: "supplier_payments",
                column: "JournalEntryId",
                unique: true,
                filter: "\"JournalEntryId\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_supplier_payments_MoneyAccountId",
                table: "supplier_payments",
                column: "MoneyAccountId");

            migrationBuilder.CreateIndex(
                name: "IX_supplier_payments_PaymentDate_Status",
                table: "supplier_payments",
                columns: new[] { "PaymentDate", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_supplier_payments_SupplierId",
                table: "supplier_payments",
                column: "SupplierId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "exchange_rates");

            migrationBuilder.DropTable(
                name: "money_account_access");

            migrationBuilder.DropTable(
                name: "money_ledger_entries");

            migrationBuilder.DropTable(
                name: "money_transfers");

            migrationBuilder.DropTable(
                name: "supplier_payment_allocations");

            migrationBuilder.DropTable(
                name: "supplier_payments");

            migrationBuilder.DropTable(
                name: "money_accounts");
        }
    }
}
