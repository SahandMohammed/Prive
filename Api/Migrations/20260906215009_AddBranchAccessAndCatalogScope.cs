using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace api.Migrations
{
    /// <inheritdoc />
    public partial class AddBranchAccessAndCatalogScope : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_units_of_measure_Code",
                table: "units_of_measure");

            migrationBuilder.DropIndex(
                name: "IX_service_categories_Name",
                table: "service_categories");

            migrationBuilder.DropIndex(
                name: "IX_products_Barcode",
                table: "products");

            migrationBuilder.DropIndex(
                name: "IX_products_SKU",
                table: "products");

            migrationBuilder.DropIndex(
                name: "IX_product_categories_Name",
                table: "product_categories");

            migrationBuilder.AddColumn<Guid>(
                name: "CatalogBranchId",
                table: "units_of_measure",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "CatalogBranchId",
                table: "services",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "CatalogBranchId",
                table: "service_categories",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "CatalogBranchId",
                table: "products",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "CatalogBranchId",
                table: "product_unit_conversions",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "CatalogBranchId",
                table: "product_subcategories",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "CatalogBranchId",
                table: "product_categories",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "CatalogBranchId",
                table: "contacts",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CatalogMode",
                table: "branches",
                type: "character varying(16)",
                maxLength: 16,
                nullable: false,
                defaultValue: "Shared");

            migrationBuilder.CreateTable(
                name: "user_branch_access",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    BranchId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_user_branch_access", x => x.Id);
                    table.ForeignKey(
                        name: "FK_user_branch_access_branches_BranchId",
                        column: x => x.BranchId,
                        principalTable: "branches",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_user_branch_access_users_UserId",
                        column: x => x.UserId,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_units_of_measure_CatalogBranchId_Code",
                table: "units_of_measure",
                columns: new[] { "CatalogBranchId", "Code" },
                unique: true,
                filter: "\"CatalogBranchId\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_units_of_measure_Code",
                table: "units_of_measure",
                column: "Code",
                unique: true,
                filter: "\"CatalogBranchId\" IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_services_CatalogBranchId",
                table: "services",
                column: "CatalogBranchId");

            migrationBuilder.CreateIndex(
                name: "IX_service_categories_CatalogBranchId_Name",
                table: "service_categories",
                columns: new[] { "CatalogBranchId", "Name" },
                unique: true,
                filter: "\"CatalogBranchId\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_service_categories_Name",
                table: "service_categories",
                column: "Name",
                unique: true,
                filter: "\"CatalogBranchId\" IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_products_Barcode",
                table: "products",
                column: "Barcode",
                unique: true,
                filter: "\"Barcode\" IS NOT NULL AND \"CatalogBranchId\" IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_products_CatalogBranchId_Barcode",
                table: "products",
                columns: new[] { "CatalogBranchId", "Barcode" },
                unique: true,
                filter: "\"Barcode\" IS NOT NULL AND \"CatalogBranchId\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_products_CatalogBranchId_SKU",
                table: "products",
                columns: new[] { "CatalogBranchId", "SKU" },
                unique: true,
                filter: "\"CatalogBranchId\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_products_SKU",
                table: "products",
                column: "SKU",
                unique: true,
                filter: "\"CatalogBranchId\" IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_product_unit_conversions_CatalogBranchId",
                table: "product_unit_conversions",
                column: "CatalogBranchId");

            migrationBuilder.CreateIndex(
                name: "IX_product_subcategories_CatalogBranchId",
                table: "product_subcategories",
                column: "CatalogBranchId");

            migrationBuilder.CreateIndex(
                name: "IX_product_categories_CatalogBranchId_Name",
                table: "product_categories",
                columns: new[] { "CatalogBranchId", "Name" },
                unique: true,
                filter: "\"CatalogBranchId\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_product_categories_Name",
                table: "product_categories",
                column: "Name",
                unique: true,
                filter: "\"CatalogBranchId\" IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_contacts_CatalogBranchId",
                table: "contacts",
                column: "CatalogBranchId");

            migrationBuilder.CreateIndex(
                name: "IX_user_branch_access_BranchId",
                table: "user_branch_access",
                column: "BranchId");

            migrationBuilder.CreateIndex(
                name: "IX_user_branch_access_UserId_BranchId",
                table: "user_branch_access",
                columns: new[] { "UserId", "BranchId" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_contacts_branches_CatalogBranchId",
                table: "contacts",
                column: "CatalogBranchId",
                principalTable: "branches",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_product_categories_branches_CatalogBranchId",
                table: "product_categories",
                column: "CatalogBranchId",
                principalTable: "branches",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_product_subcategories_branches_CatalogBranchId",
                table: "product_subcategories",
                column: "CatalogBranchId",
                principalTable: "branches",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_product_unit_conversions_branches_CatalogBranchId",
                table: "product_unit_conversions",
                column: "CatalogBranchId",
                principalTable: "branches",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_products_branches_CatalogBranchId",
                table: "products",
                column: "CatalogBranchId",
                principalTable: "branches",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_service_categories_branches_CatalogBranchId",
                table: "service_categories",
                column: "CatalogBranchId",
                principalTable: "branches",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_services_branches_CatalogBranchId",
                table: "services",
                column: "CatalogBranchId",
                principalTable: "branches",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_units_of_measure_branches_CatalogBranchId",
                table: "units_of_measure",
                column: "CatalogBranchId",
                principalTable: "branches",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
            // Existing catalogs remain shared; existing staff start with their main branch.
            migrationBuilder.Sql("""
                INSERT INTO user_branch_access ("Id", "UserId", "BranchId")
                SELECT gen_random_uuid(), u."Id", b."Id"
                FROM users u CROSS JOIN branches b
                WHERE b."IsMainBranch" = true AND b."IsActive" = true
                  AND u."Role" IN ('Manager', 'Cashier', 'Professional');
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_contacts_branches_CatalogBranchId",
                table: "contacts");

            migrationBuilder.DropForeignKey(
                name: "FK_product_categories_branches_CatalogBranchId",
                table: "product_categories");

            migrationBuilder.DropForeignKey(
                name: "FK_product_subcategories_branches_CatalogBranchId",
                table: "product_subcategories");

            migrationBuilder.DropForeignKey(
                name: "FK_product_unit_conversions_branches_CatalogBranchId",
                table: "product_unit_conversions");

            migrationBuilder.DropForeignKey(
                name: "FK_products_branches_CatalogBranchId",
                table: "products");

            migrationBuilder.DropForeignKey(
                name: "FK_service_categories_branches_CatalogBranchId",
                table: "service_categories");

            migrationBuilder.DropForeignKey(
                name: "FK_services_branches_CatalogBranchId",
                table: "services");

            migrationBuilder.DropForeignKey(
                name: "FK_units_of_measure_branches_CatalogBranchId",
                table: "units_of_measure");

            migrationBuilder.DropTable(
                name: "user_branch_access");

            migrationBuilder.DropIndex(
                name: "IX_units_of_measure_CatalogBranchId_Code",
                table: "units_of_measure");

            migrationBuilder.DropIndex(
                name: "IX_units_of_measure_Code",
                table: "units_of_measure");

            migrationBuilder.DropIndex(
                name: "IX_services_CatalogBranchId",
                table: "services");

            migrationBuilder.DropIndex(
                name: "IX_service_categories_CatalogBranchId_Name",
                table: "service_categories");

            migrationBuilder.DropIndex(
                name: "IX_service_categories_Name",
                table: "service_categories");

            migrationBuilder.DropIndex(
                name: "IX_products_Barcode",
                table: "products");

            migrationBuilder.DropIndex(
                name: "IX_products_CatalogBranchId_Barcode",
                table: "products");

            migrationBuilder.DropIndex(
                name: "IX_products_CatalogBranchId_SKU",
                table: "products");

            migrationBuilder.DropIndex(
                name: "IX_products_SKU",
                table: "products");

            migrationBuilder.DropIndex(
                name: "IX_product_unit_conversions_CatalogBranchId",
                table: "product_unit_conversions");

            migrationBuilder.DropIndex(
                name: "IX_product_subcategories_CatalogBranchId",
                table: "product_subcategories");

            migrationBuilder.DropIndex(
                name: "IX_product_categories_CatalogBranchId_Name",
                table: "product_categories");

            migrationBuilder.DropIndex(
                name: "IX_product_categories_Name",
                table: "product_categories");

            migrationBuilder.DropIndex(
                name: "IX_contacts_CatalogBranchId",
                table: "contacts");

            migrationBuilder.DropColumn(
                name: "CatalogBranchId",
                table: "units_of_measure");

            migrationBuilder.DropColumn(
                name: "CatalogBranchId",
                table: "services");

            migrationBuilder.DropColumn(
                name: "CatalogBranchId",
                table: "service_categories");

            migrationBuilder.DropColumn(
                name: "CatalogBranchId",
                table: "products");

            migrationBuilder.DropColumn(
                name: "CatalogBranchId",
                table: "product_unit_conversions");

            migrationBuilder.DropColumn(
                name: "CatalogBranchId",
                table: "product_subcategories");

            migrationBuilder.DropColumn(
                name: "CatalogBranchId",
                table: "product_categories");

            migrationBuilder.DropColumn(
                name: "CatalogBranchId",
                table: "contacts");

            migrationBuilder.DropColumn(
                name: "CatalogMode",
                table: "branches");

            migrationBuilder.CreateIndex(
                name: "IX_units_of_measure_Code",
                table: "units_of_measure",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_service_categories_Name",
                table: "service_categories",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_products_Barcode",
                table: "products",
                column: "Barcode",
                unique: true,
                filter: "\"Barcode\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_products_SKU",
                table: "products",
                column: "SKU",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_product_categories_Name",
                table: "product_categories",
                column: "Name",
                unique: true);
        }
    }
}
