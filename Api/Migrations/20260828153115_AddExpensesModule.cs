using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace api.Migrations
{
    /// <inheritdoc />
    public partial class AddExpensesModule : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "expense_categories",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Code = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    AccountingAccountId = table.Column<Guid>(type: "uuid", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    Description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_expense_categories", x => x.Id);
                    table.ForeignKey(
                        name: "FK_expense_categories_accounts_AccountingAccountId",
                        column: x => x.AccountingAccountId,
                        principalTable: "accounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "expense_documents",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    DocumentNumber = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Status = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    ExpenseDate = table.Column<DateOnly>(type: "date", nullable: false),
                    BranchId = table.Column<Guid>(type: "uuid", nullable: false),
                    MoneyAccountId = table.Column<Guid>(type: "uuid", nullable: false),
                    CurrencyId = table.Column<Guid>(type: "uuid", nullable: false),
                    BaseCurrencyId = table.Column<Guid>(type: "uuid", nullable: false),
                    ExchangeRate = table.Column<decimal>(type: "numeric(19,6)", precision: 19, scale: 6, nullable: false),
                    ContactId = table.Column<Guid>(type: "uuid", nullable: true),
                    PayeeName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    Reference = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    Notes = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    TotalAmount = table.Column<decimal>(type: "numeric(19,4)", precision: 19, scale: 4, nullable: false),
                    BaseTotalAmount = table.Column<decimal>(type: "numeric(19,4)", precision: 19, scale: 4, nullable: false),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    PostedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    PostedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    JournalEntryId = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_expense_documents", x => x.Id);
                    table.ForeignKey(
                        name: "FK_expense_documents_branches_BranchId",
                        column: x => x.BranchId,
                        principalTable: "branches",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_expense_documents_contacts_ContactId",
                        column: x => x.ContactId,
                        principalTable: "contacts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_expense_documents_currencies_BaseCurrencyId",
                        column: x => x.BaseCurrencyId,
                        principalTable: "currencies",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_expense_documents_currencies_CurrencyId",
                        column: x => x.CurrencyId,
                        principalTable: "currencies",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_expense_documents_journal_entries_JournalEntryId",
                        column: x => x.JournalEntryId,
                        principalTable: "journal_entries",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_expense_documents_money_accounts_MoneyAccountId",
                        column: x => x.MoneyAccountId,
                        principalTable: "money_accounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_expense_documents_users_CreatedByUserId",
                        column: x => x.CreatedByUserId,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_expense_documents_users_PostedByUserId",
                        column: x => x.PostedByUserId,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "expense_lines",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ExpenseDocumentId = table.Column<Guid>(type: "uuid", nullable: false),
                    ExpenseCategoryId = table.Column<Guid>(type: "uuid", nullable: false),
                    Description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    Amount = table.Column<decimal>(type: "numeric(19,4)", precision: 19, scale: 4, nullable: false),
                    BaseAmount = table.Column<decimal>(type: "numeric(19,4)", precision: 19, scale: 4, nullable: false),
                    ExpenseAccountingAccountId = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_expense_lines", x => x.Id);
                    table.ForeignKey(
                        name: "FK_expense_lines_accounts_ExpenseAccountingAccountId",
                        column: x => x.ExpenseAccountingAccountId,
                        principalTable: "accounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_expense_lines_expense_categories_ExpenseCategoryId",
                        column: x => x.ExpenseCategoryId,
                        principalTable: "expense_categories",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_expense_lines_expense_documents_ExpenseDocumentId",
                        column: x => x.ExpenseDocumentId,
                        principalTable: "expense_documents",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_expense_categories_AccountingAccountId",
                table: "expense_categories",
                column: "AccountingAccountId");

            migrationBuilder.CreateIndex(
                name: "IX_expense_categories_Code",
                table: "expense_categories",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_expense_documents_BaseCurrencyId",
                table: "expense_documents",
                column: "BaseCurrencyId");

            migrationBuilder.CreateIndex(
                name: "IX_expense_documents_BranchId",
                table: "expense_documents",
                column: "BranchId");

            migrationBuilder.CreateIndex(
                name: "IX_expense_documents_ContactId",
                table: "expense_documents",
                column: "ContactId");

            migrationBuilder.CreateIndex(
                name: "IX_expense_documents_CreatedByUserId",
                table: "expense_documents",
                column: "CreatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_expense_documents_CurrencyId",
                table: "expense_documents",
                column: "CurrencyId");

            migrationBuilder.CreateIndex(
                name: "IX_expense_documents_DocumentNumber",
                table: "expense_documents",
                column: "DocumentNumber",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_expense_documents_ExpenseDate_Status",
                table: "expense_documents",
                columns: new[] { "ExpenseDate", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_expense_documents_JournalEntryId",
                table: "expense_documents",
                column: "JournalEntryId",
                unique: true,
                filter: "\"JournalEntryId\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_expense_documents_MoneyAccountId",
                table: "expense_documents",
                column: "MoneyAccountId");

            migrationBuilder.CreateIndex(
                name: "IX_expense_documents_PostedByUserId",
                table: "expense_documents",
                column: "PostedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_expense_lines_ExpenseAccountingAccountId",
                table: "expense_lines",
                column: "ExpenseAccountingAccountId");

            migrationBuilder.CreateIndex(
                name: "IX_expense_lines_ExpenseCategoryId",
                table: "expense_lines",
                column: "ExpenseCategoryId");

            migrationBuilder.CreateIndex(
                name: "IX_expense_lines_ExpenseDocumentId",
                table: "expense_lines",
                column: "ExpenseDocumentId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "expense_lines");

            migrationBuilder.DropTable(
                name: "expense_categories");

            migrationBuilder.DropTable(
                name: "expense_documents");
        }
    }
}
