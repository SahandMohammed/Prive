using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace api.Migrations
{
    /// <inheritdoc />
    public partial class RegisterSpecificCashboxesDualCurrencyCheckout : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                DO $$
                BEGIN
                    IF EXISTS (SELECT 1 FROM pos_session_opening_counts LIMIT 1)
                        OR EXISTS (SELECT 1 FROM pos_session_closing_counts LIMIT 1)
                        OR EXISTS (SELECT 1 FROM pos_z_drawer_summaries LIMIT 1) THEN
                        RAISE EXCEPTION 'Register-specific Cashboxes cannot be inferred from legacy currency-only POS data. Explicitly reset/reseed development POS data before applying this migration.';
                    END IF;
                END $$;
                """);

            migrationBuilder.DropForeignKey(
                name: "FK_pos_session_closing_counts_pos_sessions_PosSessionId",
                table: "pos_session_closing_counts");

            migrationBuilder.DropForeignKey(
                name: "FK_pos_session_opening_counts_pos_sessions_PosSessionId",
                table: "pos_session_opening_counts");

            migrationBuilder.DropForeignKey(
                name: "FK_pos_sessions_pos_registers_RegisterId",
                table: "pos_sessions");

            migrationBuilder.DropIndex(
                name: "IX_pos_z_drawer_summaries_PosZReportId_CurrencyId",
                table: "pos_z_drawer_summaries");

            migrationBuilder.AddColumn<int>(
                name: "CurrencyDecimalPlaces",
                table: "pos_z_drawer_summaries",
                type: "integer",
                nullable: false);

            migrationBuilder.AddColumn<string>(
                name: "MoneyAccountCode",
                table: "pos_z_drawer_summaries",
                type: "character varying(32)",
                maxLength: 32,
                nullable: false);

            migrationBuilder.AddColumn<Guid>(
                name: "MoneyAccountId",
                table: "pos_z_drawer_summaries",
                type: "uuid",
                nullable: false);

            migrationBuilder.AddColumn<string>(
                name: "MoneyAccountName",
                table: "pos_z_drawer_summaries",
                type: "character varying(200)",
                maxLength: 200,
                nullable: false);

            migrationBuilder.AddColumn<Guid>(
                name: "BranchId",
                table: "pos_session_opening_counts",
                type: "uuid",
                nullable: false);

            migrationBuilder.AddColumn<Guid>(
                name: "MoneyAccountId",
                table: "pos_session_opening_counts",
                type: "uuid",
                nullable: false);

            migrationBuilder.AddColumn<Guid>(
                name: "BranchId",
                table: "pos_session_closing_counts",
                type: "uuid",
                nullable: false);

            migrationBuilder.AddColumn<Guid>(
                name: "MoneyAccountId",
                table: "pos_session_closing_counts",
                type: "uuid",
                nullable: false);

            migrationBuilder.AddUniqueConstraint(
                name: "AK_pos_sessions_Id_BranchId",
                table: "pos_sessions",
                columns: new[] { "Id", "BranchId" });

            migrationBuilder.AddUniqueConstraint(
                name: "AK_pos_registers_Id_BranchId",
                table: "pos_registers",
                columns: new[] { "Id", "BranchId" });

            migrationBuilder.AddUniqueConstraint(
                name: "AK_money_accounts_Id_BranchId_CurrencyId",
                table: "money_accounts",
                columns: new[] { "Id", "BranchId", "CurrencyId" });

            migrationBuilder.CreateTable(
                name: "pos_register_cashboxes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PosRegisterId = table.Column<Guid>(type: "uuid", nullable: false),
                    MoneyAccountId = table.Column<Guid>(type: "uuid", nullable: false),
                    BranchId = table.Column<Guid>(type: "uuid", nullable: false),
                    CurrencyId = table.Column<Guid>(type: "uuid", nullable: false)
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

            migrationBuilder.CreateIndex(
                name: "IX_pos_z_drawer_summaries_PosZReportId_MoneyAccountId",
                table: "pos_z_drawer_summaries",
                columns: new[] { "PosZReportId", "MoneyAccountId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_pos_sessions_RegisterId_BranchId",
                table: "pos_sessions",
                columns: new[] { "RegisterId", "BranchId" });

            migrationBuilder.CreateIndex(
                name: "IX_pos_session_opening_counts_MoneyAccountId_BranchId_Currency~",
                table: "pos_session_opening_counts",
                columns: new[] { "MoneyAccountId", "BranchId", "CurrencyId" });

            migrationBuilder.CreateIndex(
                name: "IX_pos_session_opening_counts_PosSessionId_BranchId",
                table: "pos_session_opening_counts",
                columns: new[] { "PosSessionId", "BranchId" });

            migrationBuilder.CreateIndex(
                name: "IX_pos_session_opening_counts_PosSessionId_MoneyAccountId",
                table: "pos_session_opening_counts",
                columns: new[] { "PosSessionId", "MoneyAccountId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_pos_session_closing_counts_MoneyAccountId_BranchId_Currency~",
                table: "pos_session_closing_counts",
                columns: new[] { "MoneyAccountId", "BranchId", "CurrencyId" });

            migrationBuilder.CreateIndex(
                name: "IX_pos_session_closing_counts_PosSessionId_BranchId",
                table: "pos_session_closing_counts",
                columns: new[] { "PosSessionId", "BranchId" });

            migrationBuilder.CreateIndex(
                name: "IX_pos_session_closing_counts_PosSessionId_MoneyAccountId",
                table: "pos_session_closing_counts",
                columns: new[] { "PosSessionId", "MoneyAccountId" },
                unique: true);

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

            migrationBuilder.AddForeignKey(
                name: "FK_pos_session_closing_counts_money_accounts_MoneyAccountId_Br~",
                table: "pos_session_closing_counts",
                columns: new[] { "MoneyAccountId", "BranchId", "CurrencyId" },
                principalTable: "money_accounts",
                principalColumns: new[] { "Id", "BranchId", "CurrencyId" },
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_pos_session_closing_counts_pos_sessions_PosSessionId_Branch~",
                table: "pos_session_closing_counts",
                columns: new[] { "PosSessionId", "BranchId" },
                principalTable: "pos_sessions",
                principalColumns: new[] { "Id", "BranchId" },
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_pos_session_opening_counts_money_accounts_MoneyAccountId_Br~",
                table: "pos_session_opening_counts",
                columns: new[] { "MoneyAccountId", "BranchId", "CurrencyId" },
                principalTable: "money_accounts",
                principalColumns: new[] { "Id", "BranchId", "CurrencyId" },
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_pos_session_opening_counts_pos_sessions_PosSessionId_Branch~",
                table: "pos_session_opening_counts",
                columns: new[] { "PosSessionId", "BranchId" },
                principalTable: "pos_sessions",
                principalColumns: new[] { "Id", "BranchId" },
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_pos_sessions_pos_registers_RegisterId_BranchId",
                table: "pos_sessions",
                columns: new[] { "RegisterId", "BranchId" },
                principalTable: "pos_registers",
                principalColumns: new[] { "Id", "BranchId" },
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_pos_session_closing_counts_money_accounts_MoneyAccountId_Br~",
                table: "pos_session_closing_counts");

            migrationBuilder.DropForeignKey(
                name: "FK_pos_session_closing_counts_pos_sessions_PosSessionId_Branch~",
                table: "pos_session_closing_counts");

            migrationBuilder.DropForeignKey(
                name: "FK_pos_session_opening_counts_money_accounts_MoneyAccountId_Br~",
                table: "pos_session_opening_counts");

            migrationBuilder.DropForeignKey(
                name: "FK_pos_session_opening_counts_pos_sessions_PosSessionId_Branch~",
                table: "pos_session_opening_counts");

            migrationBuilder.DropForeignKey(
                name: "FK_pos_sessions_pos_registers_RegisterId_BranchId",
                table: "pos_sessions");

            migrationBuilder.DropTable(
                name: "pos_register_cashboxes");

            migrationBuilder.DropIndex(
                name: "IX_pos_z_drawer_summaries_PosZReportId_MoneyAccountId",
                table: "pos_z_drawer_summaries");

            migrationBuilder.DropUniqueConstraint(
                name: "AK_pos_sessions_Id_BranchId",
                table: "pos_sessions");

            migrationBuilder.DropIndex(
                name: "IX_pos_sessions_RegisterId_BranchId",
                table: "pos_sessions");

            migrationBuilder.DropIndex(
                name: "IX_pos_session_opening_counts_MoneyAccountId_BranchId_Currency~",
                table: "pos_session_opening_counts");

            migrationBuilder.DropIndex(
                name: "IX_pos_session_opening_counts_PosSessionId_BranchId",
                table: "pos_session_opening_counts");

            migrationBuilder.DropIndex(
                name: "IX_pos_session_opening_counts_PosSessionId_MoneyAccountId",
                table: "pos_session_opening_counts");

            migrationBuilder.DropIndex(
                name: "IX_pos_session_closing_counts_MoneyAccountId_BranchId_Currency~",
                table: "pos_session_closing_counts");

            migrationBuilder.DropIndex(
                name: "IX_pos_session_closing_counts_PosSessionId_BranchId",
                table: "pos_session_closing_counts");

            migrationBuilder.DropIndex(
                name: "IX_pos_session_closing_counts_PosSessionId_MoneyAccountId",
                table: "pos_session_closing_counts");

            migrationBuilder.DropUniqueConstraint(
                name: "AK_pos_registers_Id_BranchId",
                table: "pos_registers");

            migrationBuilder.DropUniqueConstraint(
                name: "AK_money_accounts_Id_BranchId_CurrencyId",
                table: "money_accounts");

            migrationBuilder.DropColumn(
                name: "CurrencyDecimalPlaces",
                table: "pos_z_drawer_summaries");

            migrationBuilder.DropColumn(
                name: "MoneyAccountCode",
                table: "pos_z_drawer_summaries");

            migrationBuilder.DropColumn(
                name: "MoneyAccountId",
                table: "pos_z_drawer_summaries");

            migrationBuilder.DropColumn(
                name: "MoneyAccountName",
                table: "pos_z_drawer_summaries");

            migrationBuilder.DropColumn(
                name: "BranchId",
                table: "pos_session_opening_counts");

            migrationBuilder.DropColumn(
                name: "MoneyAccountId",
                table: "pos_session_opening_counts");

            migrationBuilder.DropColumn(
                name: "BranchId",
                table: "pos_session_closing_counts");

            migrationBuilder.DropColumn(
                name: "MoneyAccountId",
                table: "pos_session_closing_counts");

            migrationBuilder.CreateIndex(
                name: "IX_pos_z_drawer_summaries_PosZReportId_CurrencyId",
                table: "pos_z_drawer_summaries",
                columns: new[] { "PosZReportId", "CurrencyId" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_pos_session_closing_counts_pos_sessions_PosSessionId",
                table: "pos_session_closing_counts",
                column: "PosSessionId",
                principalTable: "pos_sessions",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_pos_session_opening_counts_pos_sessions_PosSessionId",
                table: "pos_session_opening_counts",
                column: "PosSessionId",
                principalTable: "pos_sessions",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_pos_sessions_pos_registers_RegisterId",
                table: "pos_sessions",
                column: "RegisterId",
                principalTable: "pos_registers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }
    }
}
