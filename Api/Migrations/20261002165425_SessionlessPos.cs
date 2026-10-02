using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace api.Migrations
{
    /// <inheritdoc />
    public partial class SessionlessPos : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameTable(
                name: "pos_refund_tenders",
                newName: "pos_refund_payouts");

            migrationBuilder.RenameIndex(
                name: "IX_pos_refund_tenders_PosRefundId_Sequence",
                table: "pos_refund_payouts",
                newName: "IX_pos_refund_payouts_PosRefundId_Sequence");

            migrationBuilder.RenameIndex(
                name: "IX_pos_refund_tenders_MoneyLedgerEntryId",
                table: "pos_refund_payouts",
                newName: "IX_pos_refund_payouts_MoneyLedgerEntryId");

            migrationBuilder.RenameIndex(
                name: "IX_pos_refund_tenders_MoneyAccountId",
                table: "pos_refund_payouts",
                newName: "IX_pos_refund_payouts_MoneyAccountId");

            migrationBuilder.DropForeignKey(
                name: "FK_pos_contexts_payments_PaymentId",
                table: "pos_contexts");

            migrationBuilder.DropForeignKey(
                name: "FK_pos_contexts_pos_sessions_PosSessionId",
                table: "pos_contexts");

            migrationBuilder.DropForeignKey(
                name: "FK_pos_contexts_users_CashierUserId",
                table: "pos_contexts");

            migrationBuilder.DropForeignKey(
                name: "FK_pos_refunds_pos_sessions_PosSessionId",
                table: "pos_refunds");

            migrationBuilder.DropTable(
                name: "pos_changes");

            migrationBuilder.DropTable(
                name: "pos_drawer_movements");

            migrationBuilder.DropTable(
                name: "pos_register_cashboxes");

            migrationBuilder.DropTable(
                name: "pos_session_closing_counts");

            migrationBuilder.DropTable(
                name: "pos_session_opening_counts");

            migrationBuilder.DropTable(
                name: "pos_tenders");

            migrationBuilder.DropTable(
                name: "pos_z_drawer_summaries");

            migrationBuilder.DropTable(
                name: "pos_z_payment_summaries");

            migrationBuilder.DropTable(
                name: "pos_z_reports");

            migrationBuilder.DropTable(
                name: "pos_sessions");

            migrationBuilder.DropTable(
                name: "pos_registers");

            migrationBuilder.DropIndex(
                name: "IX_pos_refunds_PosSessionId_PostedAtUtc",
                table: "pos_refunds");

            migrationBuilder.DropIndex(
                name: "IX_pos_refunds_SalesInvoiceId",
                table: "pos_refunds");

            migrationBuilder.DropIndex(
                name: "IX_pos_contexts_PosSessionId",
                table: "pos_contexts");

            migrationBuilder.DropIndex(
                name: "IX_pos_contexts_PaymentId",
                table: "pos_contexts");

            migrationBuilder.DropColumn(
                name: "PosSessionId",
                table: "pos_refunds");

            migrationBuilder.DropColumn(
                name: "PosSessionId",
                table: "pos_contexts");

            migrationBuilder.DropColumn(
                name: "PaymentId",
                table: "pos_contexts");

            migrationBuilder.DropColumn(
                name: "PaymentMode",
                table: "pos_contexts");

            migrationBuilder.RenameColumn(
                name: "CashierUserId",
                table: "pos_contexts",
                newName: "OperatorUserId");

            migrationBuilder.RenameIndex(
                name: "IX_pos_contexts_CashierUserId",
                table: "pos_contexts",
                newName: "IX_pos_contexts_OperatorUserId");

            migrationBuilder.CreateIndex(
                name: "IX_payments_active_pos_source_invoice",
                table: "payments",
                columns: new[] { "SourceSalesInvoiceId", "Origin" },
                unique: true,
                filter: "\"Origin\" = 'Pos' AND \"SourceSalesInvoiceId\" IS NOT NULL AND \"IsDeleted\" = false");

            migrationBuilder.AddForeignKey(
                name: "FK_pos_contexts_users_OperatorUserId",
                table: "pos_contexts",
                column: "OperatorUserId",
                principalTable: "users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameIndex(
                name: "IX_pos_refund_payouts_PosRefundId_Sequence",
                table: "pos_refund_payouts",
                newName: "IX_pos_refund_tenders_PosRefundId_Sequence");

            migrationBuilder.RenameIndex(
                name: "IX_pos_refund_payouts_MoneyLedgerEntryId",
                table: "pos_refund_payouts",
                newName: "IX_pos_refund_tenders_MoneyLedgerEntryId");

            migrationBuilder.RenameIndex(
                name: "IX_pos_refund_payouts_MoneyAccountId",
                table: "pos_refund_payouts",
                newName: "IX_pos_refund_tenders_MoneyAccountId");

            migrationBuilder.RenameTable(
                name: "pos_refund_payouts",
                newName: "pos_refund_tenders");

            migrationBuilder.DropForeignKey(
                name: "FK_pos_contexts_users_OperatorUserId",
                table: "pos_contexts");

            migrationBuilder.DropIndex(
                name: "IX_payments_active_pos_source_invoice",
                table: "payments");

            migrationBuilder.RenameColumn(
                name: "OperatorUserId",
                table: "pos_contexts",
                newName: "CashierUserId");

            migrationBuilder.RenameIndex(
                name: "IX_pos_contexts_OperatorUserId",
                table: "pos_contexts",
                newName: "IX_pos_contexts_CashierUserId");

            migrationBuilder.AddColumn<Guid>(
                name: "PosSessionId",
                table: "pos_refunds",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<Guid>(
                name: "PosSessionId",
                table: "pos_contexts",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<Guid>(
                name: "PaymentId",
                table: "pos_contexts",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PaymentMode",
                table: "pos_contexts",
                type: "character varying(16)",
                maxLength: 16,
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateTable(
                name: "pos_changes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    MoneyAccountId = table.Column<Guid>(type: "uuid", nullable: false),
                    PaymentMoneyLineId = table.Column<Guid>(type: "uuid", nullable: false),
                    SalesInvoiceId = table.Column<Guid>(type: "uuid", nullable: false),
                    Amount = table.Column<decimal>(type: "numeric(19,4)", precision: 19, scale: 4, nullable: false),
                    BaseAmount = table.Column<decimal>(type: "numeric(19,4)", precision: 19, scale: 4, nullable: false),
                    ExchangeRate = table.Column<decimal>(type: "numeric(19,6)", precision: 19, scale: 6, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_pos_changes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_pos_changes_money_accounts_MoneyAccountId",
                        column: x => x.MoneyAccountId,
                        principalTable: "money_accounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_pos_changes_payment_money_lines_PaymentMoneyLineId",
                        column: x => x.PaymentMoneyLineId,
                        principalTable: "payment_money_lines",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_pos_changes_pos_contexts_SalesInvoiceId",
                        column: x => x.SalesInvoiceId,
                        principalTable: "pos_contexts",
                        principalColumn: "SalesInvoiceId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "pos_registers",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    BranchId = table.Column<Guid>(type: "uuid", nullable: false),
                    Code = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    Name = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_pos_registers", x => x.Id);
                    table.UniqueConstraint("AK_pos_registers_Id_BranchId", x => new { x.Id, x.BranchId });
                    table.ForeignKey(
                        name: "FK_pos_registers_branches_BranchId",
                        column: x => x.BranchId,
                        principalTable: "branches",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "pos_tenders",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    MoneyAccountId = table.Column<Guid>(type: "uuid", nullable: false),
                    PaymentMoneyLineId = table.Column<Guid>(type: "uuid", nullable: false),
                    SalesInvoiceId = table.Column<Guid>(type: "uuid", nullable: false),
                    BaseAmount = table.Column<decimal>(type: "numeric(19,4)", precision: 19, scale: 4, nullable: false),
                    ExchangeRate = table.Column<decimal>(type: "numeric(19,6)", precision: 19, scale: 6, nullable: false),
                    Sequence = table.Column<int>(type: "integer", nullable: false),
                    TenderedAmount = table.Column<decimal>(type: "numeric(19,4)", precision: 19, scale: 4, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_pos_tenders", x => x.Id);
                    table.ForeignKey(
                        name: "FK_pos_tenders_money_accounts_MoneyAccountId",
                        column: x => x.MoneyAccountId,
                        principalTable: "money_accounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_pos_tenders_payment_money_lines_PaymentMoneyLineId",
                        column: x => x.PaymentMoneyLineId,
                        principalTable: "payment_money_lines",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_pos_tenders_pos_contexts_SalesInvoiceId",
                        column: x => x.SalesInvoiceId,
                        principalTable: "pos_contexts",
                        principalColumn: "SalesInvoiceId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "pos_register_cashboxes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CurrencyId = table.Column<Guid>(type: "uuid", nullable: false),
                    MoneyAccountId = table.Column<Guid>(type: "uuid", nullable: false),
                    PosRegisterId = table.Column<Guid>(type: "uuid", nullable: false),
                    BranchId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_pos_register_cashboxes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_pos_register_cashboxes_currencies_CurrencyId",
                        column: x => x.CurrencyId,
                        principalTable: "currencies",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_pos_register_cashboxes_money_accounts_MoneyAccountId_Branch~",
                        columns: x => new { x.MoneyAccountId, x.BranchId, x.CurrencyId },
                        principalTable: "money_accounts",
                        principalColumns: new[] { "Id", "BranchId", "CurrencyId" },
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_pos_register_cashboxes_pos_registers_PosRegisterId_BranchId",
                        columns: x => new { x.PosRegisterId, x.BranchId },
                        principalTable: "pos_registers",
                        principalColumns: new[] { "Id", "BranchId" },
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "pos_sessions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    BranchId = table.Column<Guid>(type: "uuid", nullable: false),
                    CashierUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    ClosedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    RegisterId = table.Column<Guid>(type: "uuid", nullable: false),
                    ClosedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    ClosingNotes = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    OpenedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    OpeningNotes = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    SessionNumber = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Status = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_pos_sessions", x => x.Id);
                    table.UniqueConstraint("AK_pos_sessions_Id_BranchId", x => new { x.Id, x.BranchId });
                    table.ForeignKey(
                        name: "FK_pos_sessions_branches_BranchId",
                        column: x => x.BranchId,
                        principalTable: "branches",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_pos_sessions_pos_registers_RegisterId_BranchId",
                        columns: x => new { x.RegisterId, x.BranchId },
                        principalTable: "pos_registers",
                        principalColumns: new[] { "Id", "BranchId" },
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_pos_sessions_users_CashierUserId",
                        column: x => x.CashierUserId,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_pos_sessions_users_ClosedByUserId",
                        column: x => x.ClosedByUserId,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "pos_drawer_movements",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CashboxLedgerEntryId = table.Column<Guid>(type: "uuid", nullable: false),
                    CashboxMoneyAccountId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    CurrencyId = table.Column<Guid>(type: "uuid", nullable: false),
                    DestinationLedgerEntryId = table.Column<Guid>(type: "uuid", nullable: true),
                    DestinationMoneyAccountId = table.Column<Guid>(type: "uuid", nullable: true),
                    JournalEntryId = table.Column<Guid>(type: "uuid", nullable: false),
                    OffsetAccountId = table.Column<Guid>(type: "uuid", nullable: true),
                    PosSessionId = table.Column<Guid>(type: "uuid", nullable: false),
                    AdjustmentDirection = table.Column<string>(type: "character varying(8)", maxLength: 8, nullable: true),
                    Amount = table.Column<decimal>(type: "numeric(19,4)", precision: 19, scale: 4, nullable: false),
                    BaseAmount = table.Column<decimal>(type: "numeric(19,4)", precision: 19, scale: 4, nullable: false),
                    BranchId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    DocumentNumber = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    ExchangeRate = table.Column<decimal>(type: "numeric(19,6)", precision: 19, scale: 6, nullable: false),
                    Notes = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    Reason = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Type = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_pos_drawer_movements", x => x.Id);
                    table.ForeignKey(
                        name: "FK_pos_drawer_movements_accounts_OffsetAccountId",
                        column: x => x.OffsetAccountId,
                        principalTable: "accounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_pos_drawer_movements_currencies_CurrencyId",
                        column: x => x.CurrencyId,
                        principalTable: "currencies",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_pos_drawer_movements_journal_entries_JournalEntryId",
                        column: x => x.JournalEntryId,
                        principalTable: "journal_entries",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_pos_drawer_movements_money_accounts_CashboxMoneyAccountId",
                        column: x => x.CashboxMoneyAccountId,
                        principalTable: "money_accounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_pos_drawer_movements_money_accounts_DestinationMoneyAccount~",
                        column: x => x.DestinationMoneyAccountId,
                        principalTable: "money_accounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_pos_drawer_movements_money_ledger_entries_CashboxLedgerEntr~",
                        column: x => x.CashboxLedgerEntryId,
                        principalTable: "money_ledger_entries",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_pos_drawer_movements_money_ledger_entries_DestinationLedger~",
                        column: x => x.DestinationLedgerEntryId,
                        principalTable: "money_ledger_entries",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_pos_drawer_movements_pos_sessions_PosSessionId",
                        column: x => x.PosSessionId,
                        principalTable: "pos_sessions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_pos_drawer_movements_users_CreatedByUserId",
                        column: x => x.CreatedByUserId,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "pos_session_closing_counts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CurrencyId = table.Column<Guid>(type: "uuid", nullable: false),
                    MoneyAccountId = table.Column<Guid>(type: "uuid", nullable: false),
                    PosSessionId = table.Column<Guid>(type: "uuid", nullable: false),
                    BranchId = table.Column<Guid>(type: "uuid", nullable: false),
                    CountedAmount = table.Column<decimal>(type: "numeric(19,4)", precision: 19, scale: 4, nullable: false),
                    CountedBaseAmount = table.Column<decimal>(type: "numeric(19,4)", precision: 19, scale: 4, nullable: false),
                    ExchangeRate = table.Column<decimal>(type: "numeric(19,6)", precision: 19, scale: 6, nullable: false),
                    ExpectedAmount = table.Column<decimal>(type: "numeric(19,4)", precision: 19, scale: 4, nullable: false),
                    ExpectedBaseAmount = table.Column<decimal>(type: "numeric(19,4)", precision: 19, scale: 4, nullable: false),
                    VarianceAmount = table.Column<decimal>(type: "numeric(19,4)", precision: 19, scale: 4, nullable: false),
                    VarianceBaseAmount = table.Column<decimal>(type: "numeric(19,4)", precision: 19, scale: 4, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_pos_session_closing_counts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_pos_session_closing_counts_currencies_CurrencyId",
                        column: x => x.CurrencyId,
                        principalTable: "currencies",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_pos_session_closing_counts_money_accounts_MoneyAccountId_Br~",
                        columns: x => new { x.MoneyAccountId, x.BranchId, x.CurrencyId },
                        principalTable: "money_accounts",
                        principalColumns: new[] { "Id", "BranchId", "CurrencyId" },
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_pos_session_closing_counts_pos_sessions_PosSessionId_Branch~",
                        columns: x => new { x.PosSessionId, x.BranchId },
                        principalTable: "pos_sessions",
                        principalColumns: new[] { "Id", "BranchId" },
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "pos_session_opening_counts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CurrencyId = table.Column<Guid>(type: "uuid", nullable: false),
                    MoneyAccountId = table.Column<Guid>(type: "uuid", nullable: false),
                    PosSessionId = table.Column<Guid>(type: "uuid", nullable: false),
                    BranchId = table.Column<Guid>(type: "uuid", nullable: false),
                    Amount = table.Column<decimal>(type: "numeric(19,4)", precision: 19, scale: 4, nullable: false),
                    BaseAmount = table.Column<decimal>(type: "numeric(19,4)", precision: 19, scale: 4, nullable: false),
                    ExchangeRate = table.Column<decimal>(type: "numeric(19,6)", precision: 19, scale: 6, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_pos_session_opening_counts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_pos_session_opening_counts_currencies_CurrencyId",
                        column: x => x.CurrencyId,
                        principalTable: "currencies",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_pos_session_opening_counts_money_accounts_MoneyAccountId_Br~",
                        columns: x => new { x.MoneyAccountId, x.BranchId, x.CurrencyId },
                        principalTable: "money_accounts",
                        principalColumns: new[] { "Id", "BranchId", "CurrencyId" },
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_pos_session_opening_counts_pos_sessions_PosSessionId_Branch~",
                        columns: x => new { x.PosSessionId, x.BranchId },
                        principalTable: "pos_sessions",
                        principalColumns: new[] { "Id", "BranchId" },
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "pos_z_reports",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PosSessionId = table.Column<Guid>(type: "uuid", nullable: false),
                    BaseCurrencyCode = table.Column<string>(type: "character varying(8)", maxLength: 8, nullable: false),
                    BaseCurrencyId = table.Column<Guid>(type: "uuid", nullable: false),
                    BranchCode = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    BranchId = table.Column<Guid>(type: "uuid", nullable: false),
                    BranchName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    CashierUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    CashierUsername = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    ClosedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    ClosedByUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    ClosedByUsername = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    GeneratedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    GrossSalesBase = table.Column<decimal>(type: "numeric(19,4)", precision: 19, scale: 4, nullable: false),
                    NetSalesBase = table.Column<decimal>(type: "numeric(19,4)", precision: 19, scale: 4, nullable: false),
                    OpenedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    ProductRefundsBase = table.Column<decimal>(type: "numeric(19,4)", precision: 19, scale: 4, nullable: false),
                    ProductSalesBase = table.Column<decimal>(type: "numeric(19,4)", precision: 19, scale: 4, nullable: false),
                    RefundCount = table.Column<int>(type: "integer", nullable: false),
                    RefundTotalBase = table.Column<decimal>(type: "numeric(19,4)", precision: 19, scale: 4, nullable: false),
                    RegisterCode = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    RegisterId = table.Column<Guid>(type: "uuid", nullable: false),
                    RegisterName = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    ReportNumber = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    SaleCount = table.Column<int>(type: "integer", nullable: false),
                    ServiceRefundsBase = table.Column<decimal>(type: "numeric(19,4)", precision: 19, scale: 4, nullable: false),
                    ServiceSalesBase = table.Column<decimal>(type: "numeric(19,4)", precision: 19, scale: 4, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_pos_z_reports", x => x.Id);
                    table.ForeignKey(
                        name: "FK_pos_z_reports_pos_sessions_PosSessionId",
                        column: x => x.PosSessionId,
                        principalTable: "pos_sessions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "pos_z_drawer_summaries",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PosZReportId = table.Column<Guid>(type: "uuid", nullable: false),
                    AdjustmentAmount = table.Column<decimal>(type: "numeric(19,4)", precision: 19, scale: 4, nullable: false),
                    AdjustmentBaseAmount = table.Column<decimal>(type: "numeric(19,4)", precision: 19, scale: 4, nullable: false),
                    CashDropAmount = table.Column<decimal>(type: "numeric(19,4)", precision: 19, scale: 4, nullable: false),
                    CashDropBaseAmount = table.Column<decimal>(type: "numeric(19,4)", precision: 19, scale: 4, nullable: false),
                    CashInAmount = table.Column<decimal>(type: "numeric(19,4)", precision: 19, scale: 4, nullable: false),
                    CashInBaseAmount = table.Column<decimal>(type: "numeric(19,4)", precision: 19, scale: 4, nullable: false),
                    CashOutAmount = table.Column<decimal>(type: "numeric(19,4)", precision: 19, scale: 4, nullable: false),
                    CashOutBaseAmount = table.Column<decimal>(type: "numeric(19,4)", precision: 19, scale: 4, nullable: false),
                    ChangeAmount = table.Column<decimal>(type: "numeric(19,4)", precision: 19, scale: 4, nullable: false),
                    ChangeBaseAmount = table.Column<decimal>(type: "numeric(19,4)", precision: 19, scale: 4, nullable: false),
                    CountedAmount = table.Column<decimal>(type: "numeric(19,4)", precision: 19, scale: 4, nullable: false),
                    CountedBaseAmount = table.Column<decimal>(type: "numeric(19,4)", precision: 19, scale: 4, nullable: false),
                    CurrencyCode = table.Column<string>(type: "character varying(8)", maxLength: 8, nullable: false),
                    CurrencyDecimalPlaces = table.Column<int>(type: "integer", nullable: false),
                    CurrencyId = table.Column<Guid>(type: "uuid", nullable: false),
                    ExchangeRate = table.Column<decimal>(type: "numeric(19,6)", precision: 19, scale: 6, nullable: false),
                    ExpectedAmount = table.Column<decimal>(type: "numeric(19,4)", precision: 19, scale: 4, nullable: false),
                    ExpectedBaseAmount = table.Column<decimal>(type: "numeric(19,4)", precision: 19, scale: 4, nullable: false),
                    MoneyAccountCode = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    MoneyAccountId = table.Column<Guid>(type: "uuid", nullable: false),
                    MoneyAccountName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    OpeningAmount = table.Column<decimal>(type: "numeric(19,4)", precision: 19, scale: 4, nullable: false),
                    OpeningBaseAmount = table.Column<decimal>(type: "numeric(19,4)", precision: 19, scale: 4, nullable: false),
                    RefundAmount = table.Column<decimal>(type: "numeric(19,4)", precision: 19, scale: 4, nullable: false),
                    RefundBaseAmount = table.Column<decimal>(type: "numeric(19,4)", precision: 19, scale: 4, nullable: false),
                    TenderedAmount = table.Column<decimal>(type: "numeric(19,4)", precision: 19, scale: 4, nullable: false),
                    TenderedBaseAmount = table.Column<decimal>(type: "numeric(19,4)", precision: 19, scale: 4, nullable: false),
                    VarianceAmount = table.Column<decimal>(type: "numeric(19,4)", precision: 19, scale: 4, nullable: false),
                    VarianceBaseAmount = table.Column<decimal>(type: "numeric(19,4)", precision: 19, scale: 4, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_pos_z_drawer_summaries", x => x.Id);
                    table.ForeignKey(
                        name: "FK_pos_z_drawer_summaries_pos_z_reports_PosZReportId",
                        column: x => x.PosZReportId,
                        principalTable: "pos_z_reports",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "pos_z_payment_summaries",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PosZReportId = table.Column<Guid>(type: "uuid", nullable: false),
                    ChangeAmount = table.Column<decimal>(type: "numeric(19,4)", precision: 19, scale: 4, nullable: false),
                    ChangeBaseAmount = table.Column<decimal>(type: "numeric(19,4)", precision: 19, scale: 4, nullable: false),
                    CurrencyCode = table.Column<string>(type: "character varying(8)", maxLength: 8, nullable: false),
                    CurrencyId = table.Column<Guid>(type: "uuid", nullable: false),
                    MoneyAccountCode = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    MoneyAccountId = table.Column<Guid>(type: "uuid", nullable: false),
                    MoneyAccountName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    MoneyAccountType = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    NetAmount = table.Column<decimal>(type: "numeric(19,4)", precision: 19, scale: 4, nullable: false),
                    NetBaseAmount = table.Column<decimal>(type: "numeric(19,4)", precision: 19, scale: 4, nullable: false),
                    RefundAmount = table.Column<decimal>(type: "numeric(19,4)", precision: 19, scale: 4, nullable: false),
                    RefundBaseAmount = table.Column<decimal>(type: "numeric(19,4)", precision: 19, scale: 4, nullable: false),
                    TenderedAmount = table.Column<decimal>(type: "numeric(19,4)", precision: 19, scale: 4, nullable: false),
                    TenderedBaseAmount = table.Column<decimal>(type: "numeric(19,4)", precision: 19, scale: 4, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_pos_z_payment_summaries", x => x.Id);
                    table.ForeignKey(
                        name: "FK_pos_z_payment_summaries_pos_z_reports_PosZReportId",
                        column: x => x.PosZReportId,
                        principalTable: "pos_z_reports",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_pos_refunds_PosSessionId_PostedAtUtc",
                table: "pos_refunds",
                columns: new[] { "PosSessionId", "PostedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_pos_refunds_SalesInvoiceId",
                table: "pos_refunds",
                column: "SalesInvoiceId");

            migrationBuilder.CreateIndex(
                name: "IX_pos_contexts_PosSessionId",
                table: "pos_contexts",
                column: "PosSessionId");

            migrationBuilder.CreateIndex(
                name: "IX_pos_contexts_PaymentId",
                table: "pos_contexts",
                column: "PaymentId",
                unique: true,
                filter: "\"PaymentId\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_pos_changes_MoneyAccountId",
                table: "pos_changes",
                column: "MoneyAccountId");

            migrationBuilder.CreateIndex(
                name: "IX_pos_changes_PaymentMoneyLineId",
                table: "pos_changes",
                column: "PaymentMoneyLineId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_pos_changes_SalesInvoiceId",
                table: "pos_changes",
                column: "SalesInvoiceId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_pos_drawer_movements_CashboxLedgerEntryId",
                table: "pos_drawer_movements",
                column: "CashboxLedgerEntryId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_pos_drawer_movements_CashboxMoneyAccountId",
                table: "pos_drawer_movements",
                column: "CashboxMoneyAccountId");

            migrationBuilder.CreateIndex(
                name: "IX_pos_drawer_movements_CreatedByUserId",
                table: "pos_drawer_movements",
                column: "CreatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_pos_drawer_movements_CurrencyId",
                table: "pos_drawer_movements",
                column: "CurrencyId");

            migrationBuilder.CreateIndex(
                name: "IX_pos_drawer_movements_DestinationLedgerEntryId",
                table: "pos_drawer_movements",
                column: "DestinationLedgerEntryId",
                unique: true,
                filter: "\"DestinationLedgerEntryId\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_pos_drawer_movements_DestinationMoneyAccountId",
                table: "pos_drawer_movements",
                column: "DestinationMoneyAccountId");

            migrationBuilder.CreateIndex(
                name: "IX_pos_drawer_movements_DocumentNumber",
                table: "pos_drawer_movements",
                column: "DocumentNumber",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_pos_drawer_movements_JournalEntryId",
                table: "pos_drawer_movements",
                column: "JournalEntryId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_pos_drawer_movements_OffsetAccountId",
                table: "pos_drawer_movements",
                column: "OffsetAccountId");

            migrationBuilder.CreateIndex(
                name: "IX_pos_drawer_movements_PosSessionId_CreatedAtUtc",
                table: "pos_drawer_movements",
                columns: new[] { "PosSessionId", "CreatedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_pos_register_cashboxes_CurrencyId",
                table: "pos_register_cashboxes",
                column: "CurrencyId");

            migrationBuilder.CreateIndex(
                name: "IX_pos_register_cashboxes_MoneyAccountId_BranchId_CurrencyId",
                table: "pos_register_cashboxes",
                columns: new[] { "MoneyAccountId", "BranchId", "CurrencyId" });

            migrationBuilder.CreateIndex(
                name: "IX_pos_register_cashboxes_PosRegisterId_BranchId",
                table: "pos_register_cashboxes",
                columns: new[] { "PosRegisterId", "BranchId" });

            migrationBuilder.CreateIndex(
                name: "UX_pos_register_cashboxes_money_account_id",
                table: "pos_register_cashboxes",
                column: "MoneyAccountId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "UX_pos_register_cashboxes_register_currency",
                table: "pos_register_cashboxes",
                columns: new[] { "PosRegisterId", "CurrencyId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_pos_registers_BranchId_IsActive",
                table: "pos_registers",
                columns: new[] { "BranchId", "IsActive" });

            migrationBuilder.CreateIndex(
                name: "IX_pos_registers_Code",
                table: "pos_registers",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_pos_session_closing_counts_CurrencyId",
                table: "pos_session_closing_counts",
                column: "CurrencyId");

            migrationBuilder.CreateIndex(
                name: "IX_pos_session_closing_counts_MoneyAccountId_BranchId_Currency~",
                table: "pos_session_closing_counts",
                columns: new[] { "MoneyAccountId", "BranchId", "CurrencyId" });

            migrationBuilder.CreateIndex(
                name: "IX_pos_session_closing_counts_PosSessionId_BranchId",
                table: "pos_session_closing_counts",
                columns: new[] { "PosSessionId", "BranchId" });

            migrationBuilder.CreateIndex(
                name: "IX_pos_session_closing_counts_PosSessionId_CurrencyId",
                table: "pos_session_closing_counts",
                columns: new[] { "PosSessionId", "CurrencyId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_pos_session_closing_counts_PosSessionId_MoneyAccountId",
                table: "pos_session_closing_counts",
                columns: new[] { "PosSessionId", "MoneyAccountId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_pos_session_opening_counts_CurrencyId",
                table: "pos_session_opening_counts",
                column: "CurrencyId");

            migrationBuilder.CreateIndex(
                name: "IX_pos_session_opening_counts_MoneyAccountId_BranchId_Currency~",
                table: "pos_session_opening_counts",
                columns: new[] { "MoneyAccountId", "BranchId", "CurrencyId" });

            migrationBuilder.CreateIndex(
                name: "IX_pos_session_opening_counts_PosSessionId_BranchId",
                table: "pos_session_opening_counts",
                columns: new[] { "PosSessionId", "BranchId" });

            migrationBuilder.CreateIndex(
                name: "IX_pos_session_opening_counts_PosSessionId_CurrencyId",
                table: "pos_session_opening_counts",
                columns: new[] { "PosSessionId", "CurrencyId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_pos_session_opening_counts_PosSessionId_MoneyAccountId",
                table: "pos_session_opening_counts",
                columns: new[] { "PosSessionId", "MoneyAccountId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_pos_sessions_BranchId_CashierUserId",
                table: "pos_sessions",
                columns: new[] { "BranchId", "CashierUserId" },
                unique: true,
                filter: "\"Status\" = 'Open'");

            migrationBuilder.CreateIndex(
                name: "IX_pos_sessions_BranchId_OpenedAtUtc",
                table: "pos_sessions",
                columns: new[] { "BranchId", "OpenedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_pos_sessions_CashierUserId",
                table: "pos_sessions",
                column: "CashierUserId");

            migrationBuilder.CreateIndex(
                name: "IX_pos_sessions_ClosedByUserId",
                table: "pos_sessions",
                column: "ClosedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_pos_sessions_RegisterId",
                table: "pos_sessions",
                column: "RegisterId",
                unique: true,
                filter: "\"Status\" = 'Open'");

            migrationBuilder.CreateIndex(
                name: "IX_pos_sessions_RegisterId_BranchId",
                table: "pos_sessions",
                columns: new[] { "RegisterId", "BranchId" });

            migrationBuilder.CreateIndex(
                name: "IX_pos_sessions_SessionNumber",
                table: "pos_sessions",
                column: "SessionNumber",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_pos_tenders_MoneyAccountId",
                table: "pos_tenders",
                column: "MoneyAccountId");

            migrationBuilder.CreateIndex(
                name: "IX_pos_tenders_PaymentMoneyLineId",
                table: "pos_tenders",
                column: "PaymentMoneyLineId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_pos_tenders_SalesInvoiceId_Sequence",
                table: "pos_tenders",
                columns: new[] { "SalesInvoiceId", "Sequence" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_pos_z_drawer_summaries_PosZReportId_MoneyAccountId",
                table: "pos_z_drawer_summaries",
                columns: new[] { "PosZReportId", "MoneyAccountId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_pos_z_payment_summaries_PosZReportId_MoneyAccountId",
                table: "pos_z_payment_summaries",
                columns: new[] { "PosZReportId", "MoneyAccountId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_pos_z_reports_BranchId_ClosedAtUtc",
                table: "pos_z_reports",
                columns: new[] { "BranchId", "ClosedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_pos_z_reports_PosSessionId",
                table: "pos_z_reports",
                column: "PosSessionId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_pos_z_reports_ReportNumber",
                table: "pos_z_reports",
                column: "ReportNumber",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_pos_contexts_payments_PaymentId",
                table: "pos_contexts",
                column: "PaymentId",
                principalTable: "payments",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_pos_contexts_pos_sessions_PosSessionId",
                table: "pos_contexts",
                column: "PosSessionId",
                principalTable: "pos_sessions",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_pos_contexts_users_CashierUserId",
                table: "pos_contexts",
                column: "CashierUserId",
                principalTable: "users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_pos_refunds_pos_sessions_PosSessionId",
                table: "pos_refunds",
                column: "PosSessionId",
                principalTable: "pos_sessions",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }
    }
}
