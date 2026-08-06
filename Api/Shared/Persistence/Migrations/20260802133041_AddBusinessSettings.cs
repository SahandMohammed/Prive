using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace api.Shared.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddBusinessSettings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "BusinessSettings",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    BaseCurrencyCode = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: false),
                    CurrencySymbol = table.Column<string>(type: "text", nullable: false),
                    CurrencySymbolPosition = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    CurrencyDecimalPlaces = table.Column<int>(type: "integer", nullable: false),
                    BusinessName = table.Column<string>(type: "text", nullable: false),
                    Address = table.Column<string>(type: "text", nullable: true),
                    PhoneNumber = table.Column<string>(type: "text", nullable: true),
                    TaxRegistrationNumber = table.Column<string>(type: "text", nullable: true),
                    LogoUrl = table.Column<string>(type: "text", nullable: true),
                    DefaultLanguage = table.Column<string>(type: "text", nullable: false),
                    DateFormat = table.Column<string>(type: "text", nullable: false),
                    Timezone = table.Column<string>(type: "text", nullable: false),
                    InvoiceNumberPrefix = table.Column<string>(type: "text", nullable: true),
                    NextInvoiceNumber = table.Column<int>(type: "integer", nullable: false),
                    IsSetupCompleted = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BusinessSettings", x => x.Id);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "BusinessSettings");
        }
    }
}
