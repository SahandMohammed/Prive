using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace api.Migrations
{
    /// <inheritdoc />
    public partial class AddProfessionalManagement : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_sales_invoice_lines_users_ProfessionalUserId",
                table: "sales_invoice_lines");

            migrationBuilder.RenameColumn(
                name: "ProfessionalUserId",
                table: "sales_invoice_lines",
                newName: "ProfessionalId");

            migrationBuilder.RenameIndex(
                name: "IX_sales_invoice_lines_ProfessionalUserId",
                table: "sales_invoice_lines",
                newName: "IX_sales_invoice_lines_ProfessionalId");

            migrationBuilder.RenameColumn(
                name: "ProfessionalUsername",
                table: "pos_refund_lines",
                newName: "ProfessionalName");

            migrationBuilder.RenameColumn(
                name: "ProfessionalUserId",
                table: "pos_refund_lines",
                newName: "ProfessionalId");

            migrationBuilder.AlterColumn<string>(
                name: "ProfessionalName",
                table: "pos_refund_lines",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(100)",
                oldMaxLength: 100,
                oldNullable: true);

            migrationBuilder.CreateTable(
                name: "professionals",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    PhoneNumber = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    PhoneNormalized = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    Email = table.Column<string>(type: "character varying(254)", maxLength: 254, nullable: true),
                    Notes = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_professionals", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "professional_branch_assignments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ProfessionalId = table.Column<Guid>(type: "uuid", nullable: false),
                    BranchId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_professional_branch_assignments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_professional_branch_assignments_branches_BranchId",
                        column: x => x.BranchId,
                        principalTable: "branches",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_professional_branch_assignments_professionals_ProfessionalId",
                        column: x => x.ProfessionalId,
                        principalTable: "professionals",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.Sql("""
                INSERT INTO professionals ("Id", "Name", "IsActive")
                SELECT "Id", "Username", "IsActive"
                FROM users
                WHERE "Role" = 'Professional'
                ON CONFLICT ("Id") DO NOTHING;

                INSERT INTO professional_branch_assignments ("Id", "ProfessionalId", "BranchId")
                SELECT md5(access."UserId"::text || access."BranchId"::text)::uuid, access."UserId", access."BranchId"
                FROM user_branch_access AS access
                INNER JOIN users AS user_account ON user_account."Id" = access."UserId"
                WHERE user_account."Role" = 'Professional';

                UPDATE users
                SET "LinkedProfessionalId" = CASE
                  WHEN "Role" = 'Professional' THEN "Id"
                  ELSE NULL
                END;

                UPDATE pos_refund_lines AS refund_line
                SET "ProfessionalName" = user_account."Username"
                FROM users AS user_account
                WHERE refund_line."ProfessionalId" = user_account."Id"
                  AND refund_line."ProfessionalName" IS NULL;
                """);

            migrationBuilder.CreateIndex(
                name: "IX_users_LinkedProfessionalId",
                table: "users",
                column: "LinkedProfessionalId",
                unique: true,
                filter: "\"LinkedProfessionalId\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_professional_branch_assignments_BranchId",
                table: "professional_branch_assignments",
                column: "BranchId");

            migrationBuilder.CreateIndex(
                name: "IX_professional_branch_assignments_ProfessionalId_BranchId",
                table: "professional_branch_assignments",
                columns: new[] { "ProfessionalId", "BranchId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_professionals_IsActive_Name",
                table: "professionals",
                columns: new[] { "IsActive", "Name" });

            migrationBuilder.CreateIndex(
                name: "IX_professionals_Name",
                table: "professionals",
                column: "Name");

            migrationBuilder.CreateIndex(
                name: "IX_professionals_PhoneNormalized",
                table: "professionals",
                column: "PhoneNormalized");

            migrationBuilder.AddForeignKey(
                name: "FK_sales_invoice_lines_professionals_ProfessionalId",
                table: "sales_invoice_lines",
                column: "ProfessionalId",
                principalTable: "professionals",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_users_professionals_LinkedProfessionalId",
                table: "users",
                column: "LinkedProfessionalId",
                principalTable: "professionals",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_sales_invoice_lines_professionals_ProfessionalId",
                table: "sales_invoice_lines");

            migrationBuilder.DropForeignKey(
                name: "FK_users_professionals_LinkedProfessionalId",
                table: "users");

            migrationBuilder.DropTable(
                name: "professional_branch_assignments");

            migrationBuilder.DropTable(
                name: "professionals");

            migrationBuilder.DropIndex(
                name: "IX_users_LinkedProfessionalId",
                table: "users");

            migrationBuilder.RenameColumn(
                name: "ProfessionalId",
                table: "sales_invoice_lines",
                newName: "ProfessionalUserId");

            migrationBuilder.RenameIndex(
                name: "IX_sales_invoice_lines_ProfessionalId",
                table: "sales_invoice_lines",
                newName: "IX_sales_invoice_lines_ProfessionalUserId");

            migrationBuilder.RenameColumn(
                name: "ProfessionalName",
                table: "pos_refund_lines",
                newName: "ProfessionalUsername");

            migrationBuilder.RenameColumn(
                name: "ProfessionalId",
                table: "pos_refund_lines",
                newName: "ProfessionalUserId");

            migrationBuilder.AlterColumn<string>(
                name: "ProfessionalUsername",
                table: "pos_refund_lines",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(200)",
                oldMaxLength: 200,
                oldNullable: true);

            migrationBuilder.AddForeignKey(
                name: "FK_sales_invoice_lines_users_ProfessionalUserId",
                table: "sales_invoice_lines",
                column: "ProfessionalUserId",
                principalTable: "users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }
    }
}
