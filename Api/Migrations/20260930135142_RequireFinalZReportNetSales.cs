using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace api.Migrations
{
    /// <inheritdoc />
    public partial class RequireFinalZReportNetSales : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<decimal>(
                name: "NetSalesBase",
                table: "pos_z_reports",
                type: "numeric(19,4)",
                precision: 19,
                scale: 4,
                nullable: false,
                defaultValue: 0m,
                oldClrType: typeof(decimal),
                oldType: "numeric(19,4)",
                oldPrecision: 19,
                oldScale: 4,
                oldNullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<decimal>(
                name: "NetSalesBase",
                table: "pos_z_reports",
                type: "numeric(19,4)",
                precision: 19,
                scale: 4,
                nullable: true,
                oldClrType: typeof(decimal),
                oldType: "numeric(19,4)",
                oldPrecision: 19,
                oldScale: 4);
        }
    }
}
