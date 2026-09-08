using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace api.Migrations
{
    /// <inheritdoc />
    public partial class AddPosSessionManagement : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "PosSessionId",
                table: "pos_sales",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "pos_registers",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Code = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    Name = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    BranchId = table.Column<Guid>(type: "uuid", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_pos_registers", x => x.Id);
                    table.ForeignKey(
                        name: "FK_pos_registers_branches_BranchId",
                        column: x => x.BranchId,
                        principalTable: "branches",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "pos_sessions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SessionNumber = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    BranchId = table.Column<Guid>(type: "uuid", nullable: false),
                    RegisterId = table.Column<Guid>(type: "uuid", nullable: false),
                    CashierUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Status = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    OpenedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    ClosedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    ClosedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    OpeningNotes = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    ClosingNotes = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_pos_sessions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_pos_sessions_branches_BranchId",
                        column: x => x.BranchId,
                        principalTable: "branches",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_pos_sessions_pos_registers_RegisterId",
                        column: x => x.RegisterId,
                        principalTable: "pos_registers",
                        principalColumn: "Id",
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
                name: "pos_session_closing_counts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PosSessionId = table.Column<Guid>(type: "uuid", nullable: false),
                    CurrencyId = table.Column<Guid>(type: "uuid", nullable: false),
                    ExpectedAmount = table.Column<decimal>(type: "numeric(19,4)", precision: 19, scale: 4, nullable: false),
                    CountedAmount = table.Column<decimal>(type: "numeric(19,4)", precision: 19, scale: 4, nullable: false),
                    VarianceAmount = table.Column<decimal>(type: "numeric(19,4)", precision: 19, scale: 4, nullable: false),
                    ExchangeRate = table.Column<decimal>(type: "numeric(19,6)", precision: 19, scale: 6, nullable: false),
                    ExpectedBaseAmount = table.Column<decimal>(type: "numeric(19,4)", precision: 19, scale: 4, nullable: false),
                    CountedBaseAmount = table.Column<decimal>(type: "numeric(19,4)", precision: 19, scale: 4, nullable: false),
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
                        name: "FK_pos_session_closing_counts_pos_sessions_PosSessionId",
                        column: x => x.PosSessionId,
                        principalTable: "pos_sessions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "pos_session_opening_counts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PosSessionId = table.Column<Guid>(type: "uuid", nullable: false),
                    CurrencyId = table.Column<Guid>(type: "uuid", nullable: false),
                    Amount = table.Column<decimal>(type: "numeric(19,4)", precision: 19, scale: 4, nullable: false),
                    ExchangeRate = table.Column<decimal>(type: "numeric(19,6)", precision: 19, scale: 6, nullable: false),
                    BaseAmount = table.Column<decimal>(type: "numeric(19,4)", precision: 19, scale: 4, nullable: false)
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
                        name: "FK_pos_session_opening_counts_pos_sessions_PosSessionId",
                        column: x => x.PosSessionId,
                        principalTable: "pos_sessions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "pos_z_reports",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ReportNumber = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    PosSessionId = table.Column<Guid>(type: "uuid", nullable: false),
                    BranchId = table.Column<Guid>(type: "uuid", nullable: false),
                    BranchCode = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    BranchName = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    RegisterId = table.Column<Guid>(type: "uuid", nullable: false),
                    RegisterCode = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    RegisterName = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    CashierUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    CashierUsername = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    ClosedByUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    ClosedByUsername = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    BaseCurrencyId = table.Column<Guid>(type: "uuid", nullable: false),
                    BaseCurrencyCode = table.Column<string>(type: "character varying(8)", maxLength: 8, nullable: false),
                    OpenedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    ClosedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    GeneratedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    SaleCount = table.Column<int>(type: "integer", nullable: false),
                    ServiceSalesBase = table.Column<decimal>(type: "numeric(19,4)", precision: 19, scale: 4, nullable: false),
                    ProductSalesBase = table.Column<decimal>(type: "numeric(19,4)", precision: 19, scale: 4, nullable: false),
                    GrossSalesBase = table.Column<decimal>(type: "numeric(19,4)", precision: 19, scale: 4, nullable: false)
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
                    CurrencyId = table.Column<Guid>(type: "uuid", nullable: false),
                    CurrencyCode = table.Column<string>(type: "character varying(8)", maxLength: 8, nullable: false),
                    OpeningAmount = table.Column<decimal>(type: "numeric(19,4)", precision: 19, scale: 4, nullable: false),
                    TenderedAmount = table.Column<decimal>(type: "numeric(19,4)", precision: 19, scale: 4, nullable: false),
                    ChangeAmount = table.Column<decimal>(type: "numeric(19,4)", precision: 19, scale: 4, nullable: false),
                    ExpectedAmount = table.Column<decimal>(type: "numeric(19,4)", precision: 19, scale: 4, nullable: false),
                    CountedAmount = table.Column<decimal>(type: "numeric(19,4)", precision: 19, scale: 4, nullable: false),
                    VarianceAmount = table.Column<decimal>(type: "numeric(19,4)", precision: 19, scale: 4, nullable: false),
                    ExchangeRate = table.Column<decimal>(type: "numeric(19,6)", precision: 19, scale: 6, nullable: false),
                    OpeningBaseAmount = table.Column<decimal>(type: "numeric(19,4)", precision: 19, scale: 4, nullable: false),
                    TenderedBaseAmount = table.Column<decimal>(type: "numeric(19,4)", precision: 19, scale: 4, nullable: false),
                    ChangeBaseAmount = table.Column<decimal>(type: "numeric(19,4)", precision: 19, scale: 4, nullable: false),
                    ExpectedBaseAmount = table.Column<decimal>(type: "numeric(19,4)", precision: 19, scale: 4, nullable: false),
                    CountedBaseAmount = table.Column<decimal>(type: "numeric(19,4)", precision: 19, scale: 4, nullable: false),
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
                    MoneyAccountId = table.Column<Guid>(type: "uuid", nullable: false),
                    MoneyAccountCode = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    MoneyAccountName = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    MoneyAccountType = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    CurrencyId = table.Column<Guid>(type: "uuid", nullable: false),
                    CurrencyCode = table.Column<string>(type: "character varying(8)", maxLength: 8, nullable: false),
                    TenderedAmount = table.Column<decimal>(type: "numeric(19,4)", precision: 19, scale: 4, nullable: false),
                    ChangeAmount = table.Column<decimal>(type: "numeric(19,4)", precision: 19, scale: 4, nullable: false),
                    NetAmount = table.Column<decimal>(type: "numeric(19,4)", precision: 19, scale: 4, nullable: false),
                    TenderedBaseAmount = table.Column<decimal>(type: "numeric(19,4)", precision: 19, scale: 4, nullable: false),
                    ChangeBaseAmount = table.Column<decimal>(type: "numeric(19,4)", precision: 19, scale: 4, nullable: false),
                    NetBaseAmount = table.Column<decimal>(type: "numeric(19,4)", precision: 19, scale: 4, nullable: false)
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
                name: "IX_pos_sales_PosSessionId",
                table: "pos_sales",
                column: "PosSessionId");

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
                name: "IX_pos_session_closing_counts_PosSessionId_CurrencyId",
                table: "pos_session_closing_counts",
                columns: new[] { "PosSessionId", "CurrencyId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_pos_session_opening_counts_CurrencyId",
                table: "pos_session_opening_counts",
                column: "CurrencyId");

            migrationBuilder.CreateIndex(
                name: "IX_pos_session_opening_counts_PosSessionId_CurrencyId",
                table: "pos_session_opening_counts",
                columns: new[] { "PosSessionId", "CurrencyId" },
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
                name: "IX_pos_sessions_SessionNumber",
                table: "pos_sessions",
                column: "SessionNumber",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_pos_z_drawer_summaries_PosZReportId_CurrencyId",
                table: "pos_z_drawer_summaries",
                columns: new[] { "PosZReportId", "CurrencyId" },
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
                name: "FK_pos_sales_pos_sessions_PosSessionId",
                table: "pos_sales",
                column: "PosSessionId",
                principalTable: "pos_sessions",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_pos_sales_pos_sessions_PosSessionId",
                table: "pos_sales");

            migrationBuilder.DropTable(
                name: "pos_session_closing_counts");

            migrationBuilder.DropTable(
                name: "pos_session_opening_counts");

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
                name: "IX_pos_sales_PosSessionId",
                table: "pos_sales");

            migrationBuilder.DropColumn(
                name: "PosSessionId",
                table: "pos_sales");
        }
    }
}
