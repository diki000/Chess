using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace chess_backend.Migrations
{
    /// <inheritdoc />
    public partial class AddGameCode : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "GameCode",
                table: "Games",
                type: "text",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "GameCode",
                table: "Games");
        }
    }
}
