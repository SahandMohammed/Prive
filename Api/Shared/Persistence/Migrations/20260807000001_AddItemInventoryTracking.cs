using Api.Shared.Persistence;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace api.Shared.Persistence.Migrations;

[DbContext(typeof(AppDbContext))]
[Migration("20260807000001_AddItemInventoryTracking")]
public partial class AddItemInventoryTracking : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder) => migrationBuilder.AddColumn<bool>(
        name: "TrackInventory", table: "Items", type: "boolean", nullable: false, defaultValue: false);

    protected override void Down(MigrationBuilder migrationBuilder) => migrationBuilder.DropColumn(name: "TrackInventory", table: "Items");
}
