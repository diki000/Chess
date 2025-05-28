namespace chess_backend.Models
{
    public class GameModel
    {
        public int Id { get; set; }
        public string gameCode { get; set; }
        public int playerWhiteId { get; set; }
        public int playerBlackId { get; set; }
        public string status { get; set; }
        public DateTime created { get; set; }
        public DateTime completed { get; set; }
        public int winnerId { get; set; }
        public List<MoveModel> moveHistory { get; set; }
    }
}
