using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace api.Migrations
{
    /// <inheritdoc />
    public partial class DirectPostedInvoiceCorrections : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "DeleteReason",
                table: "sales_invoices",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "DeletedAtUtc",
                table: "sales_invoices",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "DeletedByUserId",
                table: "sales_invoices",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsDeleted",
                table: "sales_invoices",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "AfterState",
                table: "activity_logs",
                type: "jsonb",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "BeforeState",
                table: "activity_logs",
                type: "jsonb",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Reason",
                table: "activity_logs",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_sales_invoices_DeletedByUserId",
                table: "sales_invoices",
                column: "DeletedByUserId");

            migrationBuilder.AddForeignKey(
                name: "FK_sales_invoices_users_DeletedByUserId",
                table: "sales_invoices",
                column: "DeletedByUserId",
                principalTable: "users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_sales_invoices_users_DeletedByUserId",
                table: "sales_invoices");

            migrationBuilder.DropIndex(
                name: "IX_sales_invoices_DeletedByUserId",
                table: "sales_invoices");

            migrationBuilder.DropColumn(
                name: "DeleteReason",
                table: "sales_invoices");

            migrationBuilder.DropColumn(
                name: "DeletedAtUtc",
                table: "sales_invoices");

            migrationBuilder.DropColumn(
                name: "DeletedByUserId",
                table: "sales_invoices");

            migrationBuilder.DropColumn(
                name: "IsDeleted",
                table: "sales_invoices");

            migrationBuilder.DropColumn(
                name: "AfterState",
                table: "activity_logs");

            migrationBuilder.DropColumn(
                name: "BeforeState",
                table: "activity_logs");

            migrationBuilder.DropColumn(
                name: "Reason",
                table: "activity_logs");
        }
    }
}
