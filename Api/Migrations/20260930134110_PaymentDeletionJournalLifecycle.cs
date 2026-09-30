using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace api.Migrations
{
    /// <inheritdoc />
    public partial class PaymentDeletionJournalLifecycle : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_payments_JournalEntryId",
                table: "payments");

            migrationBuilder.AlterColumn<Guid>(
                name: "JournalEntryId",
                table: "payments",
                type: "uuid",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uuid");

            migrationBuilder.CreateIndex(
                name: "IX_payments_JournalEntryId",
                table: "payments",
                column: "JournalEntryId",
                unique: true,
                filter: "\"JournalEntryId\" IS NOT NULL");

            migrationBuilder.AddCheckConstraint(
                name: "CK_payments_journal_state",
                table: "payments",
                sql: "(\"IsDeleted\" = false AND \"JournalEntryId\" IS NOT NULL) OR (\"IsDeleted\" = true AND \"JournalEntryId\" IS NULL)");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_payments_JournalEntryId",
                table: "payments");

            migrationBuilder.DropCheckConstraint(
                name: "CK_payments_journal_state",
                table: "payments");

            migrationBuilder.AlterColumn<Guid>(
                name: "JournalEntryId",
                table: "payments",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_payments_JournalEntryId",
                table: "payments",
                column: "JournalEntryId",
                unique: true);
        }
    }
}
