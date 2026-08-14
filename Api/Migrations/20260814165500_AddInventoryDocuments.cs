using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace api.Migrations
{
    /// <inheritdoc />
    public partial class AddInventoryDocuments : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "OpeningStockDocumentId",
                table: "stock_movements",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "OpeningStockLineId",
                table: "stock_movements",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "StockAdjustmentDocumentId",
                table: "stock_movements",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "StockAdjustmentLineId",
                table: "stock_movements",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "WarehouseTransferDocumentId",
                table: "stock_movements",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "WarehouseTransferLineId",
                table: "stock_movements",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "opening_stock_documents",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    DocumentNumber = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    DocumentDate = table.Column<DateOnly>(type: "date", nullable: false),
                    BranchId = table.Column<Guid>(type: "uuid", nullable: false),
                    WarehouseId = table.Column<Guid>(type: "uuid", nullable: false),
                    Status = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    Notes = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    PostedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_opening_stock_documents", x => x.Id);
                    table.ForeignKey(
                        name: "FK_opening_stock_documents_branches_BranchId",
                        column: x => x.BranchId,
                        principalTable: "branches",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_opening_stock_documents_users_CreatedByUserId",
                        column: x => x.CreatedByUserId,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_opening_stock_documents_warehouses_WarehouseId",
                        column: x => x.WarehouseId,
                        principalTable: "warehouses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "stock_adjustment_documents",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    DocumentNumber = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    DocumentDate = table.Column<DateOnly>(type: "date", nullable: false),
                    BranchId = table.Column<Guid>(type: "uuid", nullable: false),
                    WarehouseId = table.Column<Guid>(type: "uuid", nullable: false),
                    Reason = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    Notes = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    Status = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    PostedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_stock_adjustment_documents", x => x.Id);
                    table.ForeignKey(
                        name: "FK_stock_adjustment_documents_branches_BranchId",
                        column: x => x.BranchId,
                        principalTable: "branches",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_stock_adjustment_documents_users_CreatedByUserId",
                        column: x => x.CreatedByUserId,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_stock_adjustment_documents_warehouses_WarehouseId",
                        column: x => x.WarehouseId,
                        principalTable: "warehouses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "warehouse_transfer_documents",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    DocumentNumber = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    DocumentDate = table.Column<DateOnly>(type: "date", nullable: false),
                    BranchId = table.Column<Guid>(type: "uuid", nullable: false),
                    SourceWarehouseId = table.Column<Guid>(type: "uuid", nullable: false),
                    DestinationWarehouseId = table.Column<Guid>(type: "uuid", nullable: false),
                    Notes = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    Status = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    PostedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_warehouse_transfer_documents", x => x.Id);
                    table.ForeignKey(
                        name: "FK_warehouse_transfer_documents_branches_BranchId",
                        column: x => x.BranchId,
                        principalTable: "branches",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_warehouse_transfer_documents_users_CreatedByUserId",
                        column: x => x.CreatedByUserId,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_warehouse_transfer_documents_warehouses_DestinationWarehous~",
                        column: x => x.DestinationWarehouseId,
                        principalTable: "warehouses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_warehouse_transfer_documents_warehouses_SourceWarehouseId",
                        column: x => x.SourceWarehouseId,
                        principalTable: "warehouses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "opening_stock_lines",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    OpeningStockDocumentId = table.Column<Guid>(type: "uuid", nullable: false),
                    ProductId = table.Column<Guid>(type: "uuid", nullable: false),
                    Quantity = table.Column<decimal>(type: "numeric(19,4)", precision: 19, scale: 4, nullable: false),
                    UnitCostBase = table.Column<decimal>(type: "numeric(19,4)", precision: 19, scale: 4, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_opening_stock_lines", x => x.Id);
                    table.ForeignKey(
                        name: "FK_opening_stock_lines_opening_stock_documents_OpeningStockDoc~",
                        column: x => x.OpeningStockDocumentId,
                        principalTable: "opening_stock_documents",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_opening_stock_lines_products_ProductId",
                        column: x => x.ProductId,
                        principalTable: "products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "stock_adjustment_lines",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    StockAdjustmentDocumentId = table.Column<Guid>(type: "uuid", nullable: false),
                    ProductId = table.Column<Guid>(type: "uuid", nullable: false),
                    SystemQuantity = table.Column<decimal>(type: "numeric(19,4)", precision: 19, scale: 4, nullable: false),
                    ActualQuantity = table.Column<decimal>(type: "numeric(19,4)", precision: 19, scale: 4, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_stock_adjustment_lines", x => x.Id);
                    table.ForeignKey(
                        name: "FK_stock_adjustment_lines_products_ProductId",
                        column: x => x.ProductId,
                        principalTable: "products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_stock_adjustment_lines_stock_adjustment_documents_StockAdju~",
                        column: x => x.StockAdjustmentDocumentId,
                        principalTable: "stock_adjustment_documents",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "warehouse_transfer_lines",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    WarehouseTransferDocumentId = table.Column<Guid>(type: "uuid", nullable: false),
                    ProductId = table.Column<Guid>(type: "uuid", nullable: false),
                    AvailableSourceQuantity = table.Column<decimal>(type: "numeric(19,4)", precision: 19, scale: 4, nullable: false),
                    Quantity = table.Column<decimal>(type: "numeric(19,4)", precision: 19, scale: 4, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_warehouse_transfer_lines", x => x.Id);
                    table.ForeignKey(
                        name: "FK_warehouse_transfer_lines_products_ProductId",
                        column: x => x.ProductId,
                        principalTable: "products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_warehouse_transfer_lines_warehouse_transfer_documents_Wareh~",
                        column: x => x.WarehouseTransferDocumentId,
                        principalTable: "warehouse_transfer_documents",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_stock_movements_OpeningStockDocumentId",
                table: "stock_movements",
                column: "OpeningStockDocumentId");

            migrationBuilder.CreateIndex(
                name: "IX_stock_movements_OpeningStockLineId",
                table: "stock_movements",
                column: "OpeningStockLineId");

            migrationBuilder.CreateIndex(
                name: "IX_stock_movements_StockAdjustmentDocumentId",
                table: "stock_movements",
                column: "StockAdjustmentDocumentId");

            migrationBuilder.CreateIndex(
                name: "IX_stock_movements_StockAdjustmentLineId",
                table: "stock_movements",
                column: "StockAdjustmentLineId");

            migrationBuilder.CreateIndex(
                name: "IX_stock_movements_WarehouseTransferDocumentId",
                table: "stock_movements",
                column: "WarehouseTransferDocumentId");

            migrationBuilder.CreateIndex(
                name: "IX_stock_movements_WarehouseTransferLineId",
                table: "stock_movements",
                column: "WarehouseTransferLineId");

            migrationBuilder.CreateIndex(
                name: "IX_opening_stock_documents_BranchId",
                table: "opening_stock_documents",
                column: "BranchId");

            migrationBuilder.CreateIndex(
                name: "IX_opening_stock_documents_CreatedByUserId",
                table: "opening_stock_documents",
                column: "CreatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_opening_stock_documents_DocumentDate_Status",
                table: "opening_stock_documents",
                columns: new[] { "DocumentDate", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_opening_stock_documents_DocumentNumber",
                table: "opening_stock_documents",
                column: "DocumentNumber",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_opening_stock_documents_WarehouseId",
                table: "opening_stock_documents",
                column: "WarehouseId");

            migrationBuilder.CreateIndex(
                name: "IX_opening_stock_lines_OpeningStockDocumentId_ProductId",
                table: "opening_stock_lines",
                columns: new[] { "OpeningStockDocumentId", "ProductId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_opening_stock_lines_ProductId",
                table: "opening_stock_lines",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_stock_adjustment_documents_BranchId",
                table: "stock_adjustment_documents",
                column: "BranchId");

            migrationBuilder.CreateIndex(
                name: "IX_stock_adjustment_documents_CreatedByUserId",
                table: "stock_adjustment_documents",
                column: "CreatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_stock_adjustment_documents_DocumentDate_Status",
                table: "stock_adjustment_documents",
                columns: new[] { "DocumentDate", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_stock_adjustment_documents_DocumentNumber",
                table: "stock_adjustment_documents",
                column: "DocumentNumber",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_stock_adjustment_documents_WarehouseId",
                table: "stock_adjustment_documents",
                column: "WarehouseId");

            migrationBuilder.CreateIndex(
                name: "IX_stock_adjustment_lines_ProductId",
                table: "stock_adjustment_lines",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_stock_adjustment_lines_StockAdjustmentDocumentId_ProductId",
                table: "stock_adjustment_lines",
                columns: new[] { "StockAdjustmentDocumentId", "ProductId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_warehouse_transfer_documents_BranchId",
                table: "warehouse_transfer_documents",
                column: "BranchId");

            migrationBuilder.CreateIndex(
                name: "IX_warehouse_transfer_documents_CreatedByUserId",
                table: "warehouse_transfer_documents",
                column: "CreatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_warehouse_transfer_documents_DestinationWarehouseId",
                table: "warehouse_transfer_documents",
                column: "DestinationWarehouseId");

            migrationBuilder.CreateIndex(
                name: "IX_warehouse_transfer_documents_DocumentDate_Status",
                table: "warehouse_transfer_documents",
                columns: new[] { "DocumentDate", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_warehouse_transfer_documents_DocumentNumber",
                table: "warehouse_transfer_documents",
                column: "DocumentNumber",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_warehouse_transfer_documents_SourceWarehouseId",
                table: "warehouse_transfer_documents",
                column: "SourceWarehouseId");

            migrationBuilder.CreateIndex(
                name: "IX_warehouse_transfer_lines_ProductId",
                table: "warehouse_transfer_lines",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_warehouse_transfer_lines_WarehouseTransferDocumentId_Produc~",
                table: "warehouse_transfer_lines",
                columns: new[] { "WarehouseTransferDocumentId", "ProductId" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_stock_movements_opening_stock_documents_OpeningStockDocumen~",
                table: "stock_movements",
                column: "OpeningStockDocumentId",
                principalTable: "opening_stock_documents",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_stock_movements_opening_stock_lines_OpeningStockLineId",
                table: "stock_movements",
                column: "OpeningStockLineId",
                principalTable: "opening_stock_lines",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_stock_movements_stock_adjustment_documents_StockAdjustmentD~",
                table: "stock_movements",
                column: "StockAdjustmentDocumentId",
                principalTable: "stock_adjustment_documents",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_stock_movements_stock_adjustment_lines_StockAdjustmentLineId",
                table: "stock_movements",
                column: "StockAdjustmentLineId",
                principalTable: "stock_adjustment_lines",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_stock_movements_warehouse_transfer_documents_WarehouseTrans~",
                table: "stock_movements",
                column: "WarehouseTransferDocumentId",
                principalTable: "warehouse_transfer_documents",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_stock_movements_warehouse_transfer_lines_WarehouseTransferL~",
                table: "stock_movements",
                column: "WarehouseTransferLineId",
                principalTable: "warehouse_transfer_lines",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_stock_movements_opening_stock_documents_OpeningStockDocumen~",
                table: "stock_movements");

            migrationBuilder.DropForeignKey(
                name: "FK_stock_movements_opening_stock_lines_OpeningStockLineId",
                table: "stock_movements");

            migrationBuilder.DropForeignKey(
                name: "FK_stock_movements_stock_adjustment_documents_StockAdjustmentD~",
                table: "stock_movements");

            migrationBuilder.DropForeignKey(
                name: "FK_stock_movements_stock_adjustment_lines_StockAdjustmentLineId",
                table: "stock_movements");

            migrationBuilder.DropForeignKey(
                name: "FK_stock_movements_warehouse_transfer_documents_WarehouseTrans~",
                table: "stock_movements");

            migrationBuilder.DropForeignKey(
                name: "FK_stock_movements_warehouse_transfer_lines_WarehouseTransferL~",
                table: "stock_movements");

            migrationBuilder.DropTable(
                name: "opening_stock_lines");

            migrationBuilder.DropTable(
                name: "stock_adjustment_lines");

            migrationBuilder.DropTable(
                name: "warehouse_transfer_lines");

            migrationBuilder.DropTable(
                name: "opening_stock_documents");

            migrationBuilder.DropTable(
                name: "stock_adjustment_documents");

            migrationBuilder.DropTable(
                name: "warehouse_transfer_documents");

            migrationBuilder.DropIndex(
                name: "IX_stock_movements_OpeningStockDocumentId",
                table: "stock_movements");

            migrationBuilder.DropIndex(
                name: "IX_stock_movements_OpeningStockLineId",
                table: "stock_movements");

            migrationBuilder.DropIndex(
                name: "IX_stock_movements_StockAdjustmentDocumentId",
                table: "stock_movements");

            migrationBuilder.DropIndex(
                name: "IX_stock_movements_StockAdjustmentLineId",
                table: "stock_movements");

            migrationBuilder.DropIndex(
                name: "IX_stock_movements_WarehouseTransferDocumentId",
                table: "stock_movements");

            migrationBuilder.DropIndex(
                name: "IX_stock_movements_WarehouseTransferLineId",
                table: "stock_movements");

            migrationBuilder.DropColumn(
                name: "OpeningStockDocumentId",
                table: "stock_movements");

            migrationBuilder.DropColumn(
                name: "OpeningStockLineId",
                table: "stock_movements");

            migrationBuilder.DropColumn(
                name: "StockAdjustmentDocumentId",
                table: "stock_movements");

            migrationBuilder.DropColumn(
                name: "StockAdjustmentLineId",
                table: "stock_movements");

            migrationBuilder.DropColumn(
                name: "WarehouseTransferDocumentId",
                table: "stock_movements");

            migrationBuilder.DropColumn(
                name: "WarehouseTransferLineId",
                table: "stock_movements");
        }
    }
}
