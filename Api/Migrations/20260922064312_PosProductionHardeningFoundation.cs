using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace api.Migrations
{
    /// <inheritdoc />
    public partial class PosProductionHardeningFoundation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "AdjustmentAmount",
                table: "pos_z_drawer_summaries",
                type: "numeric(19,4)",
                precision: 19,
                scale: 4,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "AdjustmentBaseAmount",
                table: "pos_z_drawer_summaries",
                type: "numeric(19,4)",
                precision: 19,
                scale: 4,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "CashDropAmount",
                table: "pos_z_drawer_summaries",
                type: "numeric(19,4)",
                precision: 19,
                scale: 4,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "CashDropBaseAmount",
                table: "pos_z_drawer_summaries",
                type: "numeric(19,4)",
                precision: 19,
                scale: 4,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "CashInAmount",
                table: "pos_z_drawer_summaries",
                type: "numeric(19,4)",
                precision: 19,
                scale: 4,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "CashInBaseAmount",
                table: "pos_z_drawer_summaries",
                type: "numeric(19,4)",
                precision: 19,
                scale: 4,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "CashOutAmount",
                table: "pos_z_drawer_summaries",
                type: "numeric(19,4)",
                precision: 19,
                scale: 4,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "CashOutBaseAmount",
                table: "pos_z_drawer_summaries",
                type: "numeric(19,4)",
                precision: 19,
                scale: 4,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<Guid>(
                name: "ClientRequestId",
                table: "pos_sales",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RequestFingerprint",
                table: "pos_sales",
                type: "character varying(64)",
                maxLength: 64,
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "ClientRequestId",
                table: "pos_refunds",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RequestFingerprint",
                table: "pos_refunds",
                type: "character varying(64)",
                maxLength: 64,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ReceiptFooter",
                table: "businesses",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ReceiptPaperWidth",
                table: "businesses",
                type: "character varying(8)",
                maxLength: 8,
                nullable: false,
                defaultValue: "Mm80");

            migrationBuilder.AddColumn<string>(
                name: "TimeZoneId",
                table: "businesses",
                type: "character varying(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "Asia/Baghdad");

            migrationBuilder.CreateTable(
                name: "pos_drawer_movements",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    DocumentNumber = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    PosSessionId = table.Column<Guid>(type: "uuid", nullable: false),
                    BranchId = table.Column<Guid>(type: "uuid", nullable: false),
                    CashboxMoneyAccountId = table.Column<Guid>(type: "uuid", nullable: false),
                    DestinationMoneyAccountId = table.Column<Guid>(type: "uuid", nullable: true),
                    OffsetAccountId = table.Column<Guid>(type: "uuid", nullable: true),
                    Type = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    AdjustmentDirection = table.Column<string>(type: "character varying(8)", maxLength: 8, nullable: true),
                    CurrencyId = table.Column<Guid>(type: "uuid", nullable: false),
                    Amount = table.Column<decimal>(type: "numeric(19,4)", precision: 19, scale: 4, nullable: false),
                    ExchangeRate = table.Column<decimal>(type: "numeric(19,6)", precision: 19, scale: 6, nullable: false),
                    BaseAmount = table.Column<decimal>(type: "numeric(19,4)", precision: 19, scale: 4, nullable: false),
                    Reason = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Notes = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    JournalEntryId = table.Column<Guid>(type: "uuid", nullable: false),
                    CashboxLedgerEntryId = table.Column<Guid>(type: "uuid", nullable: false),
                    DestinationLedgerEntryId = table.Column<Guid>(type: "uuid", nullable: true)
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

            migrationBuilder.CreateIndex(
                name: "IX_pos_sales_ClientRequestId",
                table: "pos_sales",
                column: "ClientRequestId",
                unique: true,
                filter: "\"ClientRequestId\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_pos_refunds_ClientRequestId",
                table: "pos_refunds",
                column: "ClientRequestId",
                unique: true,
                filter: "\"ClientRequestId\" IS NOT NULL");

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
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "pos_drawer_movements");

            migrationBuilder.DropIndex(
                name: "IX_pos_sales_ClientRequestId",
                table: "pos_sales");

            migrationBuilder.DropIndex(
                name: "IX_pos_refunds_ClientRequestId",
                table: "pos_refunds");

            migrationBuilder.DropColumn(
                name: "AdjustmentAmount",
                table: "pos_z_drawer_summaries");

            migrationBuilder.DropColumn(
                name: "AdjustmentBaseAmount",
                table: "pos_z_drawer_summaries");

            migrationBuilder.DropColumn(
                name: "CashDropAmount",
                table: "pos_z_drawer_summaries");

            migrationBuilder.DropColumn(
                name: "CashDropBaseAmount",
                table: "pos_z_drawer_summaries");

            migrationBuilder.DropColumn(
                name: "CashInAmount",
                table: "pos_z_drawer_summaries");

            migrationBuilder.DropColumn(
                name: "CashInBaseAmount",
                table: "pos_z_drawer_summaries");

            migrationBuilder.DropColumn(
                name: "CashOutAmount",
                table: "pos_z_drawer_summaries");

            migrationBuilder.DropColumn(
                name: "CashOutBaseAmount",
                table: "pos_z_drawer_summaries");

            migrationBuilder.DropColumn(
                name: "ClientRequestId",
                table: "pos_sales");

            migrationBuilder.DropColumn(
                name: "RequestFingerprint",
                table: "pos_sales");

            migrationBuilder.DropColumn(
                name: "ClientRequestId",
                table: "pos_refunds");

            migrationBuilder.DropColumn(
                name: "RequestFingerprint",
                table: "pos_refunds");

            migrationBuilder.DropColumn(
                name: "ReceiptFooter",
                table: "businesses");

            migrationBuilder.DropColumn(
                name: "ReceiptPaperWidth",
                table: "businesses");

            migrationBuilder.DropColumn(
                name: "TimeZoneId",
                table: "businesses");
        }
    }
}
