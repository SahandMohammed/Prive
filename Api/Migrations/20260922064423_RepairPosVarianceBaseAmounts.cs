using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace api.Migrations
{
    /// <inheritdoc />
    public partial class RepairPosVarianceBaseAmounts : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                UPDATE pos_session_closing_counts
                SET \"VarianceBaseAmount\" = ROUND(\"VarianceAmount\" * \"ExchangeRate\", 4);

                UPDATE pos_z_drawer_summaries
                SET \"VarianceBaseAmount\" = ROUND(\"VarianceAmount\" * \"ExchangeRate\", 4);
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {

        }
    }
}
