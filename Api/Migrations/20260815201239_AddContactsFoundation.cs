using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace api.Migrations
{
    /// <inheritdoc />
    public partial class AddContactsFoundation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "contacts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Kind = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    IsCustomer = table.Column<bool>(type: "boolean", nullable: false),
                    IsSupplier = table.Column<bool>(type: "boolean", nullable: false),
                    PrimaryPhoneNumber = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    PrimaryPhoneNormalized = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    SecondaryPhoneNumber = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    SecondaryPhoneNormalized = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    Email = table.Column<string>(type: "character varying(254)", maxLength: 254, nullable: true),
                    Address = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    City = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    Region = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    Country = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    Notes = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_contacts", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_contacts_IsCustomer_IsSupplier_IsActive",
                table: "contacts",
                columns: new[] { "IsCustomer", "IsSupplier", "IsActive" });

            migrationBuilder.CreateIndex(
                name: "IX_contacts_Name",
                table: "contacts",
                column: "Name");

            migrationBuilder.CreateIndex(
                name: "IX_contacts_PrimaryPhoneNormalized",
                table: "contacts",
                column: "PrimaryPhoneNormalized");

            migrationBuilder.CreateIndex(
                name: "IX_contacts_SecondaryPhoneNormalized",
                table: "contacts",
                column: "SecondaryPhoneNormalized");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "contacts");
        }
    }
}
