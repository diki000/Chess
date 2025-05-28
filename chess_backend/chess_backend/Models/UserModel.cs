namespace chess_backend.Models
{
    public class UserModel
    {
        public int UserId { get; set; }
        public string Username { get; set; }
        public string Password { get; set; }
        public string? profilePicture { get; set; }
        public DateTime CreatedAt { get; set; }
        public string? AccessToken { get; set; }
    }
}
