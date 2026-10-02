using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace api.Migrations
{
    /// <inheritdoc />
    public partial class FinalizePosContextIdentity : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                DO $$
                BEGIN
                  IF EXISTS (SELECT 1 FROM pos_sales LIMIT 1) THEN
                    RAISE EXCEPTION 'FinalizePosContextIdentity requires an empty transactional database. Reset the database before applying this migration.';
                  END IF;
                END $$;
                """);

            migrationBuilder.DropForeignKey(
                name: "FK_pos_refunds_pos_sales_PosSaleId",
                table: "pos_refunds");

            migrationBuilder.DropForeignKey(
                name: "FK_pos_sale_changes_money_accounts_MoneyAccountId",
                table: "pos_sale_changes");

            migrationBuilder.DropForeignKey(
                name: "FK_pos_sale_changes_payment_money_lines_PaymentMoneyLineId",
                table: "pos_sale_changes");

            migrationBuilder.DropForeignKey(
                name: "FK_pos_sale_changes_pos_sales_PosSaleId",
                table: "pos_sale_changes");

            migrationBuilder.DropForeignKey(
                name: "FK_pos_sale_tenders_money_accounts_MoneyAccountId",
                table: "pos_sale_tenders");

            migrationBuilder.DropForeignKey(
                name: "FK_pos_sale_tenders_payment_money_lines_PaymentMoneyLineId",
                table: "pos_sale_tenders");

            migrationBuilder.DropForeignKey(
                name: "FK_pos_sale_tenders_pos_sales_PosSaleId",
                table: "pos_sale_tenders");

            migrationBuilder.DropTable(
                name: "pos_sales");

            migrationBuilder.DropIndex(
                name: "IX_pos_refunds_PosSaleId_PostedAtUtc",
                table: "pos_refunds");

            migrationBuilder.DropPrimaryKey(
                name: "PK_pos_sale_tenders",
                table: "pos_sale_tenders");

            migrationBuilder.DropPrimaryKey(
                name: "PK_pos_sale_changes",
                table: "pos_sale_changes");

            migrationBuilder.DropColumn(
                name: "PosSaleId",
                table: "pos_refunds");

            migrationBuilder.RenameTable(
                name: "pos_sale_tenders",
                newName: "pos_tenders");

            migrationBuilder.RenameTable(
                name: "pos_sale_changes",
                newName: "pos_changes");

            migrationBuilder.RenameColumn(
                name: "PosSaleId",
                table: "pos_tenders",
                newName: "SalesInvoiceId");

            migrationBuilder.RenameIndex(
                name: "IX_pos_sale_tenders_PosSaleId_Sequence",
                table: "pos_tenders",
                newName: "IX_pos_tenders_SalesInvoiceId_Sequence");

            migrationBuilder.RenameIndex(
                name: "IX_pos_sale_tenders_PaymentMoneyLineId",
                table: "pos_tenders",
                newName: "IX_pos_tenders_PaymentMoneyLineId");

            migrationBuilder.RenameIndex(
                name: "IX_pos_sale_tenders_MoneyAccountId",
                table: "pos_tenders",
                newName: "IX_pos_tenders_MoneyAccountId");

            migrationBuilder.RenameColumn(
                name: "PosSaleId",
                table: "pos_changes",
                newName: "SalesInvoiceId");

            migrationBuilder.RenameIndex(
                name: "IX_pos_sale_changes_PosSaleId",
                table: "pos_changes",
                newName: "IX_pos_changes_SalesInvoiceId");

            migrationBuilder.RenameIndex(
                name: "IX_pos_sale_changes_PaymentMoneyLineId",
                table: "pos_changes",
                newName: "IX_pos_changes_PaymentMoneyLineId");

            migrationBuilder.RenameIndex(
                name: "IX_pos_sale_changes_MoneyAccountId",
                table: "pos_changes",
                newName: "IX_pos_changes_MoneyAccountId");

            migrationBuilder.AddPrimaryKey(
                name: "PK_pos_tenders",
                table: "pos_tenders",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_pos_changes",
                table: "pos_changes",
                column: "Id");

            migrationBuilder.CreateTable(
                name: "pos_contexts",
                columns: table => new
                {
                    SalesInvoiceId = table.Column<Guid>(type: "uuid", nullable: false),
                    PaymentId = table.Column<Guid>(type: "uuid", nullable: true),
                    PosSessionId = table.Column<Guid>(type: "uuid", nullable: false),
                    CashierUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    CompletedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ClientRequestId = table.Column<Guid>(type: "uuid", nullable: true),
                    RequestFingerprint = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_pos_contexts", x => x.SalesInvoiceId);
                    table.ForeignKey(
                        name: "FK_pos_contexts_payments_PaymentId",
                        column: x => x.PaymentId,
                        principalTable: "payments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_pos_contexts_pos_sessions_PosSessionId",
                        column: x => x.PosSessionId,
                        principalTable: "pos_sessions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_pos_contexts_sales_invoices_SalesInvoiceId",
                        column: x => x.SalesInvoiceId,
                        principalTable: "sales_invoices",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_pos_contexts_users_CashierUserId",
                        column: x => x.CashierUserId,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_pos_refunds_SalesInvoiceId_PostedAtUtc",
                table: "pos_refunds",
                columns: new[] { "SalesInvoiceId", "PostedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_pos_contexts_CashierUserId",
                table: "pos_contexts",
                column: "CashierUserId");

            migrationBuilder.CreateIndex(
                name: "IX_pos_contexts_ClientRequestId",
                table: "pos_contexts",
                column: "ClientRequestId",
                unique: true,
                filter: "\"ClientRequestId\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_pos_contexts_CompletedAtUtc",
                table: "pos_contexts",
                column: "CompletedAtUtc");

            migrationBuilder.CreateIndex(
                name: "IX_pos_contexts_PaymentId",
                table: "pos_contexts",
                column: "PaymentId",
                unique: true,
                filter: "\"PaymentId\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_pos_contexts_PosSessionId",
                table: "pos_contexts",
                column: "PosSessionId");

            migrationBuilder.AddForeignKey(
                name: "FK_pos_changes_money_accounts_MoneyAccountId",
                table: "pos_changes",
                column: "MoneyAccountId",
                principalTable: "money_accounts",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_pos_changes_payment_money_lines_PaymentMoneyLineId",
                table: "pos_changes",
                column: "PaymentMoneyLineId",
                principalTable: "payment_money_lines",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_pos_changes_pos_contexts_SalesInvoiceId",
                table: "pos_changes",
                column: "SalesInvoiceId",
                principalTable: "pos_contexts",
                principalColumn: "SalesInvoiceId",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_pos_refunds_pos_contexts_SalesInvoiceId",
                table: "pos_refunds",
                column: "SalesInvoiceId",
                principalTable: "pos_contexts",
                principalColumn: "SalesInvoiceId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_pos_tenders_money_accounts_MoneyAccountId",
                table: "pos_tenders",
                column: "MoneyAccountId",
                principalTable: "money_accounts",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_pos_tenders_payment_money_lines_PaymentMoneyLineId",
                table: "pos_tenders",
                column: "PaymentMoneyLineId",
                principalTable: "payment_money_lines",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_pos_tenders_pos_contexts_SalesInvoiceId",
                table: "pos_tenders",
                column: "SalesInvoiceId",
                principalTable: "pos_contexts",
                principalColumn: "SalesInvoiceId",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_pos_changes_money_accounts_MoneyAccountId",
                table: "pos_changes");

            migrationBuilder.DropForeignKey(
                name: "FK_pos_changes_payment_money_lines_PaymentMoneyLineId",
                table: "pos_changes");

            migrationBuilder.DropForeignKey(
                name: "FK_pos_changes_pos_contexts_SalesInvoiceId",
                table: "pos_changes");

            migrationBuilder.DropForeignKey(
                name: "FK_pos_refunds_pos_contexts_SalesInvoiceId",
                table: "pos_refunds");

            migrationBuilder.DropForeignKey(
                name: "FK_pos_tenders_money_accounts_MoneyAccountId",
                table: "pos_tenders");

            migrationBuilder.DropForeignKey(
                name: "FK_pos_tenders_payment_money_lines_PaymentMoneyLineId",
                table: "pos_tenders");

            migrationBuilder.DropForeignKey(
                name: "FK_pos_tenders_pos_contexts_SalesInvoiceId",
                table: "pos_tenders");

            migrationBuilder.DropTable(
                name: "pos_contexts");

            migrationBuilder.DropIndex(
                name: "IX_pos_refunds_SalesInvoiceId_PostedAtUtc",
                table: "pos_refunds");

            migrationBuilder.DropPrimaryKey(
                name: "PK_pos_tenders",
                table: "pos_tenders");

            migrationBuilder.DropPrimaryKey(
                name: "PK_pos_changes",
                table: "pos_changes");

            migrationBuilder.RenameTable(
                name: "pos_tenders",
                newName: "pos_sale_tenders");

            migrationBuilder.RenameTable(
                name: "pos_changes",
                newName: "pos_sale_changes");

            migrationBuilder.RenameColumn(
                name: "SalesInvoiceId",
                table: "pos_sale_tenders",
                newName: "PosSaleId");

            migrationBuilder.RenameIndex(
                name: "IX_pos_tenders_SalesInvoiceId_Sequence",
                table: "pos_sale_tenders",
                newName: "IX_pos_sale_tenders_PosSaleId_Sequence");

            migrationBuilder.RenameIndex(
                name: "IX_pos_tenders_PaymentMoneyLineId",
                table: "pos_sale_tenders",
                newName: "IX_pos_sale_tenders_PaymentMoneyLineId");

            migrationBuilder.RenameIndex(
                name: "IX_pos_tenders_MoneyAccountId",
                table: "pos_sale_tenders",
                newName: "IX_pos_sale_tenders_MoneyAccountId");

            migrationBuilder.RenameColumn(
                name: "SalesInvoiceId",
                table: "pos_sale_changes",
                newName: "PosSaleId");

            migrationBuilder.RenameIndex(
                name: "IX_pos_changes_SalesInvoiceId",
                table: "pos_sale_changes",
                newName: "IX_pos_sale_changes_PosSaleId");

            migrationBuilder.RenameIndex(
                name: "IX_pos_changes_PaymentMoneyLineId",
                table: "pos_sale_changes",
                newName: "IX_pos_sale_changes_PaymentMoneyLineId");

            migrationBuilder.RenameIndex(
                name: "IX_pos_changes_MoneyAccountId",
                table: "pos_sale_changes",
                newName: "IX_pos_sale_changes_MoneyAccountId");

            migrationBuilder.AddColumn<Guid>(
                name: "PosSaleId",
                table: "pos_refunds",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddPrimaryKey(
                name: "PK_pos_sale_tenders",
                table: "pos_sale_tenders",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_pos_sale_changes",
                table: "pos_sale_changes",
                column: "Id");

            migrationBuilder.CreateTable(
                name: "pos_sales",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CashierUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    PaymentId = table.Column<Guid>(type: "uuid", nullable: true),
                    PosSessionId = table.Column<Guid>(type: "uuid", nullable: true),
                    SalesInvoiceId = table.Column<Guid>(type: "uuid", nullable: false),
                    ClientRequestId = table.Column<Guid>(type: "uuid", nullable: true),
                    CompletedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    DocumentNumber = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    RequestFingerprint = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    Status = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_pos_sales", x => x.Id);
                    table.ForeignKey(
                        name: "FK_pos_sales_payments_PaymentId",
                        column: x => x.PaymentId,
                        principalTable: "payments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_pos_sales_pos_sessions_PosSessionId",
                        column: x => x.PosSessionId,
                        principalTable: "pos_sessions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
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

            migrationBuilder.CreateIndex(
                name: "IX_pos_refunds_PosSaleId_PostedAtUtc",
                table: "pos_refunds",
                columns: new[] { "PosSaleId", "PostedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_pos_sales_CashierUserId",
                table: "pos_sales",
                column: "CashierUserId");

            migrationBuilder.CreateIndex(
                name: "IX_pos_sales_ClientRequestId",
                table: "pos_sales",
                column: "ClientRequestId",
                unique: true,
                filter: "\"ClientRequestId\" IS NOT NULL");

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
                name: "IX_pos_sales_PaymentId",
                table: "pos_sales",
                column: "PaymentId",
                unique: true,
                filter: "\"PaymentId\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_pos_sales_PosSessionId",
                table: "pos_sales",
                column: "PosSessionId");

            migrationBuilder.CreateIndex(
                name: "IX_pos_sales_SalesInvoiceId",
                table: "pos_sales",
                column: "SalesInvoiceId",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_pos_refunds_pos_sales_PosSaleId",
                table: "pos_refunds",
                column: "PosSaleId",
                principalTable: "pos_sales",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_pos_sale_changes_money_accounts_MoneyAccountId",
                table: "pos_sale_changes",
                column: "MoneyAccountId",
                principalTable: "money_accounts",
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
                name: "FK_pos_sale_changes_pos_sales_PosSaleId",
                table: "pos_sale_changes",
                column: "PosSaleId",
                principalTable: "pos_sales",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_pos_sale_tenders_money_accounts_MoneyAccountId",
                table: "pos_sale_tenders",
                column: "MoneyAccountId",
                principalTable: "money_accounts",
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
                name: "FK_pos_sale_tenders_pos_sales_PosSaleId",
                table: "pos_sale_tenders",
                column: "PosSaleId",
                principalTable: "pos_sales",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
