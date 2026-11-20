using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ConsultorioContable.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class DocumentBinaryContent : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<byte[]>(
                name: "contenido",
                table: "documentos_caso",
                type: "varbinary(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "mime_type",
                table: "documentos_caso",
                type: "nvarchar(150)",
                maxLength: 150,
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "tamano",
                table: "documentos_caso",
                type: "bigint",
                nullable: false,
                defaultValue: 0L);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "contenido",
                table: "documentos_caso");

            migrationBuilder.DropColumn(
                name: "mime_type",
                table: "documentos_caso");

            migrationBuilder.DropColumn(
                name: "tamano",
                table: "documentos_caso");
        }
    }
}
