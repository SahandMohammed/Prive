using Api.Shared.Persistence;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace api.Migrations;

[DbContext(typeof(AppDbContext))]
[Migration("20260908030000_AddPosSessionManagement")]
public partial class AddPosSessionManagement : Migration
{
  protected override void Up(MigrationBuilder migrationBuilder)
  {
    migrationBuilder.Sql("""
      CREATE TABLE pos_registers (
        "Id" uuid NOT NULL,
        "Code" character varying(32) NOT NULL,
        "Name" character varying(120) NOT NULL,
        "BranchId" uuid NOT NULL,
        "IsActive" boolean NOT NULL,
        CONSTRAINT "PK_pos_registers" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_pos_registers_branches_BranchId" FOREIGN KEY ("BranchId") REFERENCES branches ("Id") ON DELETE RESTRICT
      );
      CREATE UNIQUE INDEX "IX_pos_registers_Code" ON pos_registers ("Code");
      CREATE INDEX "IX_pos_registers_BranchId_IsActive" ON pos_registers ("BranchId", "IsActive");

      CREATE TABLE pos_sessions (
        "Id" uuid NOT NULL,
        "SessionNumber" character varying(20) NOT NULL,
        "BranchId" uuid NOT NULL,
        "RegisterId" uuid NOT NULL,
        "CashierUserId" uuid NOT NULL,
        "Status" character varying(16) NOT NULL,
        "OpenedAtUtc" timestamp with time zone NOT NULL,
        "ClosedAtUtc" timestamp with time zone NULL,
        "ClosedByUserId" uuid NULL,
        "OpeningNotes" character varying(500) NULL,
        "ClosingNotes" character varying(500) NULL,
        "CreatedAtUtc" timestamp with time zone NOT NULL,
        "UpdatedAtUtc" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_pos_sessions" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_pos_sessions_branches_BranchId" FOREIGN KEY ("BranchId") REFERENCES branches ("Id") ON DELETE RESTRICT,
        CONSTRAINT "FK_pos_sessions_pos_registers_RegisterId" FOREIGN KEY ("RegisterId") REFERENCES pos_registers ("Id") ON DELETE RESTRICT,
        CONSTRAINT "FK_pos_sessions_users_CashierUserId" FOREIGN KEY ("CashierUserId") REFERENCES users ("Id") ON DELETE RESTRICT,
        CONSTRAINT "FK_pos_sessions_users_ClosedByUserId" FOREIGN KEY ("ClosedByUserId") REFERENCES users ("Id") ON DELETE RESTRICT
      );
      CREATE UNIQUE INDEX "IX_pos_sessions_SessionNumber" ON pos_sessions ("SessionNumber");
      CREATE INDEX "IX_pos_sessions_BranchId_OpenedAtUtc" ON pos_sessions ("BranchId", "OpenedAtUtc");
      CREATE INDEX "IX_pos_sessions_CashierUserId" ON pos_sessions ("CashierUserId");
      CREATE INDEX "IX_pos_sessions_ClosedByUserId" ON pos_sessions ("ClosedByUserId");
      CREATE UNIQUE INDEX "IX_pos_sessions_RegisterId" ON pos_sessions ("RegisterId") WHERE "Status" = 'Open';
      CREATE UNIQUE INDEX "IX_pos_sessions_BranchId_CashierUserId" ON pos_sessions ("BranchId", "CashierUserId") WHERE "Status" = 'Open';

      CREATE TABLE pos_session_opening_counts (
        "Id" uuid NOT NULL,
        "PosSessionId" uuid NOT NULL,
        "CurrencyId" uuid NOT NULL,
        "Amount" numeric(19,4) NOT NULL,
        "ExchangeRate" numeric(19,6) NOT NULL,
        "BaseAmount" numeric(19,4) NOT NULL,
        CONSTRAINT "PK_pos_session_opening_counts" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_pos_session_opening_counts_pos_sessions_PosSessionId" FOREIGN KEY ("PosSessionId") REFERENCES pos_sessions ("Id") ON DELETE CASCADE,
        CONSTRAINT "FK_pos_session_opening_counts_currencies_CurrencyId" FOREIGN KEY ("CurrencyId") REFERENCES currencies ("Id") ON DELETE RESTRICT
      );
      CREATE UNIQUE INDEX "IX_pos_session_opening_counts_PosSessionId_CurrencyId" ON pos_session_opening_counts ("PosSessionId", "CurrencyId");
      CREATE INDEX "IX_pos_session_opening_counts_CurrencyId" ON pos_session_opening_counts ("CurrencyId");

      CREATE TABLE pos_session_closing_counts (
        "Id" uuid NOT NULL,
        "PosSessionId" uuid NOT NULL,
        "CurrencyId" uuid NOT NULL,
        "ExpectedAmount" numeric(19,4) NOT NULL,
        "CountedAmount" numeric(19,4) NOT NULL,
        "VarianceAmount" numeric(19,4) NOT NULL,
        "ExchangeRate" numeric(19,6) NOT NULL,
        "ExpectedBaseAmount" numeric(19,4) NOT NULL,
        "CountedBaseAmount" numeric(19,4) NOT NULL,
        "VarianceBaseAmount" numeric(19,4) NOT NULL,
        CONSTRAINT "PK_pos_session_closing_counts" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_pos_session_closing_counts_pos_sessions_PosSessionId" FOREIGN KEY ("PosSessionId") REFERENCES pos_sessions ("Id") ON DELETE CASCADE,
        CONSTRAINT "FK_pos_session_closing_counts_currencies_CurrencyId" FOREIGN KEY ("CurrencyId") REFERENCES currencies ("Id") ON DELETE RESTRICT
      );
      CREATE UNIQUE INDEX "IX_pos_session_closing_counts_PosSessionId_CurrencyId" ON pos_session_closing_counts ("PosSessionId", "CurrencyId");
      CREATE INDEX "IX_pos_session_closing_counts_CurrencyId" ON pos_session_closing_counts ("CurrencyId");

      CREATE TABLE pos_z_reports (
        "Id" uuid NOT NULL,
        "ReportNumber" character varying(20) NOT NULL,
        "PosSessionId" uuid NOT NULL,
        "BranchId" uuid NOT NULL,
        "BranchCode" character varying(32) NOT NULL,
        "BranchName" character varying(120) NOT NULL,
        "RegisterId" uuid NOT NULL,
        "RegisterCode" character varying(32) NOT NULL,
        "RegisterName" character varying(120) NOT NULL,
        "CashierUserId" uuid NOT NULL,
        "CashierUsername" character varying(100) NOT NULL,
        "ClosedByUserId" uuid NOT NULL,
        "ClosedByUsername" character varying(100) NOT NULL,
        "BaseCurrencyId" uuid NOT NULL,
        "BaseCurrencyCode" character varying(8) NOT NULL,
        "OpenedAtUtc" timestamp with time zone NOT NULL,
        "ClosedAtUtc" timestamp with time zone NOT NULL,
        "GeneratedAtUtc" timestamp with time zone NOT NULL,
        "SaleCount" integer NOT NULL,
        "ServiceSalesBase" numeric(19,4) NOT NULL,
        "ProductSalesBase" numeric(19,4) NOT NULL,
        "GrossSalesBase" numeric(19,4) NOT NULL,
        CONSTRAINT "PK_pos_z_reports" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_pos_z_reports_pos_sessions_PosSessionId" FOREIGN KEY ("PosSessionId") REFERENCES pos_sessions ("Id") ON DELETE RESTRICT
      );
      CREATE UNIQUE INDEX "IX_pos_z_reports_ReportNumber" ON pos_z_reports ("ReportNumber");
      CREATE UNIQUE INDEX "IX_pos_z_reports_PosSessionId" ON pos_z_reports ("PosSessionId");
      CREATE INDEX "IX_pos_z_reports_BranchId_ClosedAtUtc" ON pos_z_reports ("BranchId", "ClosedAtUtc");

      CREATE TABLE pos_z_payment_summaries (
        "Id" uuid NOT NULL,
        "PosZReportId" uuid NOT NULL,
        "MoneyAccountId" uuid NOT NULL,
        "MoneyAccountCode" character varying(32) NOT NULL,
        "MoneyAccountName" character varying(120) NOT NULL,
        "MoneyAccountType" character varying(16) NOT NULL,
        "CurrencyId" uuid NOT NULL,
        "CurrencyCode" character varying(8) NOT NULL,
        "TenderedAmount" numeric(19,4) NOT NULL,
        "ChangeAmount" numeric(19,4) NOT NULL,
        "NetAmount" numeric(19,4) NOT NULL,
        "TenderedBaseAmount" numeric(19,4) NOT NULL,
        "ChangeBaseAmount" numeric(19,4) NOT NULL,
        "NetBaseAmount" numeric(19,4) NOT NULL,
        CONSTRAINT "PK_pos_z_payment_summaries" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_pos_z_payment_summaries_pos_z_reports_PosZReportId" FOREIGN KEY ("PosZReportId") REFERENCES pos_z_reports ("Id") ON DELETE CASCADE
      );
      CREATE UNIQUE INDEX "IX_pos_z_payment_summaries_PosZReportId_MoneyAccountId" ON pos_z_payment_summaries ("PosZReportId", "MoneyAccountId");

      CREATE TABLE pos_z_drawer_summaries (
        "Id" uuid NOT NULL,
        "PosZReportId" uuid NOT NULL,
        "CurrencyId" uuid NOT NULL,
        "CurrencyCode" character varying(8) NOT NULL,
        "OpeningAmount" numeric(19,4) NOT NULL,
        "TenderedAmount" numeric(19,4) NOT NULL,
        "ChangeAmount" numeric(19,4) NOT NULL,
        "ExpectedAmount" numeric(19,4) NOT NULL,
        "CountedAmount" numeric(19,4) NOT NULL,
        "VarianceAmount" numeric(19,4) NOT NULL,
        "ExchangeRate" numeric(19,6) NOT NULL,
        "OpeningBaseAmount" numeric(19,4) NOT NULL,
        "TenderedBaseAmount" numeric(19,4) NOT NULL,
        "ChangeBaseAmount" numeric(19,4) NOT NULL,
        "ExpectedBaseAmount" numeric(19,4) NOT NULL,
        "CountedBaseAmount" numeric(19,4) NOT NULL,
        "VarianceBaseAmount" numeric(19,4) NOT NULL,
        CONSTRAINT "PK_pos_z_drawer_summaries" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_pos_z_drawer_summaries_pos_z_reports_PosZReportId" FOREIGN KEY ("PosZReportId") REFERENCES pos_z_reports ("Id") ON DELETE CASCADE
      );
      CREATE UNIQUE INDEX "IX_pos_z_drawer_summaries_PosZReportId_CurrencyId" ON pos_z_drawer_summaries ("PosZReportId", "CurrencyId");

      ALTER TABLE pos_sales ADD COLUMN "PosSessionId" uuid NULL;
      CREATE INDEX "IX_pos_sales_PosSessionId" ON pos_sales ("PosSessionId");
      ALTER TABLE pos_sales ADD CONSTRAINT "FK_pos_sales_pos_sessions_PosSessionId"
        FOREIGN KEY ("PosSessionId") REFERENCES pos_sessions ("Id") ON DELETE RESTRICT;
      """);
  }

  protected override void Down(MigrationBuilder migrationBuilder)
  {
    migrationBuilder.Sql("""
      ALTER TABLE pos_sales DROP CONSTRAINT IF EXISTS "FK_pos_sales_pos_sessions_PosSessionId";
      DROP INDEX IF EXISTS "IX_pos_sales_PosSessionId";
      ALTER TABLE pos_sales DROP COLUMN IF EXISTS "PosSessionId";
      DROP TABLE IF EXISTS pos_z_drawer_summaries;
      DROP TABLE IF EXISTS pos_z_payment_summaries;
      DROP TABLE IF EXISTS pos_z_reports;
      DROP TABLE IF EXISTS pos_session_closing_counts;
      DROP TABLE IF EXISTS pos_session_opening_counts;
      DROP TABLE IF EXISTS pos_sessions;
      DROP TABLE IF EXISTS pos_registers;
      """);
  }
}
