using Microsoft.EntityFrameworkCore;
using chess_backend.Models;

namespace chess_backend.EFCore
{
    public class _EFCore : DbContext
    {
        public _EFCore(DbContextOptions<_EFCore> options) : base(options) { }

        public DbSet<User> Users { get; set; }
        public DbSet<Game> Games { get; set; }
        public DbSet<Move> Moves { get; set; }
        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<Game>()
                        .HasMany(g => g.MoveHistory)
                        .WithOne(m => m.Game)
                        .HasForeignKey(m => m.GameId)
                        .OnDelete(DeleteBehavior.Cascade);
            
            base.OnModelCreating(modelBuilder);
        }
    }
}
