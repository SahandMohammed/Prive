using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace api.Migrations
{
    /// <inheritdoc />
    public partial class EnhanceInventoryItemMaster : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "PurchasePriceBase",
                table: "products",
                type: "numeric(19,4)",
                precision: 19,
                scale: 4,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<Guid>(
                name: "SubcategoryId",
                table: "products",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "product_subcategories",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    CategoryId = table.Column<Guid>(type: "uuid", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_product_subcategories", x => x.Id);
                    table.ForeignKey(
                        name: "FK_product_subcategories_product_categories_CategoryId",
                        column: x => x.CategoryId,
                        principalTable: "product_categories",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "product_unit_conversions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ProductId = table.Column<Guid>(type: "uuid", nullable: false),
                    UnitOfMeasureId = table.Column<Guid>(type: "uuid", nullable: false),
                    Operation = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    Factor = table.Column<decimal>(type: "numeric(19,6)", precision: 19, scale: 6, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_product_unit_conversions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_product_unit_conversions_products_ProductId",
                        column: x => x.ProductId,
                        principalTable: "products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_product_unit_conversions_units_of_measure_UnitOfMeasureId",
                        column: x => x.UnitOfMeasureId,
                        principalTable: "units_of_measure",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_products_SubcategoryId",
                table: "products",
                column: "SubcategoryId");

            migrationBuilder.CreateIndex(
                name: "IX_product_subcategories_CategoryId_Name",
                table: "product_subcategories",
                columns: new[] { "CategoryId", "Name" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_product_unit_conversions_ProductId_UnitOfMeasureId",
                table: "product_unit_conversions",
                columns: new[] { "ProductId", "UnitOfMeasureId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_product_unit_conversions_UnitOfMeasureId",
                table: "product_unit_conversions",
                column: "UnitOfMeasureId");

            migrationBuilder.AddForeignKey(
                name: "FK_products_product_subcategories_SubcategoryId",
                table: "products",
                column: "SubcategoryId",
                principalTable: "product_subcategories",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_products_product_subcategories_SubcategoryId",
                table: "products");

            migrationBuilder.DropTable(
                name: "product_subcategories");

            migrationBuilder.DropTable(
                name: "product_unit_conversions");

            migrationBuilder.DropIndex(
                name: "IX_products_SubcategoryId",
                table: "products");

            migrationBuilder.DropColumn(
                name: "PurchasePriceBase",
                table: "products");

            migrationBuilder.DropColumn(
                name: "SubcategoryId",
                table: "products");
        }
    }
}
