namespace chess_backend.EFCore
{
    public class Move
    {
        public int Id { get; set; }
        public int GameId { get; set; }      // FK
        public Game Game { get; set; }      // back-reference
        public int MoveNumber { get; set; }
        public int Player { get; set; }
        public string Notation { get; set; }
    }

    public class Game
    {
        public int Id { get; set; }
        public string GameCode { get; set; }
        public int PlayerWhiteId { get; set; }
        public int PlayerBlackId { get; set; }
        public string Status { get; set; }
        public DateTime Created { get; set; }
        public DateTime Completed { get; set; }
        public int WinnerId { get; set; }
        public ICollection<Move> MoveHistory { get; set; } = new List<Move>();
    }
}
