using chess_backend.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace chess_backend.Controllers
{
    [ApiController]
    public class GameController : Controller
    {
        private readonly GameFunctions _db;
        private readonly IConfiguration _configuration;
        private readonly EFCore._EFCore _dataContext;
        public GameController(EFCore._EFCore _EFCore, EFCore._EFCore ef_DataContext, IConfiguration configuration)
        {
            _db = new GameFunctions(ef_DataContext);
            _configuration = configuration;
            _dataContext = _EFCore;
        }

        [HttpPost]
        [Route("api/[controller]/CreateGame")]
        public async Task<IActionResult> CreateGame([FromBody] CreateGameRequest request)
        {
            var game = await _db.CreateGame(request.CreatorPlayerId);
            return Ok(new { game.gameCode });
        }

        [HttpPost]
        [Route("api/[controller]/JoinGame")]
        public async Task<IActionResult> JoinGame([FromBody] JoinGameRequest request)
        {
            var game = await _db.JoinGame(request.GameCode, request.PlayerId);
            return Ok(game);
        }
        [HttpGet]
        [Route("api/[controller]/GetMoves/{gameCode}")]
        public async Task<IActionResult> GetMoves(string gameCode)
        {
            var moves = await _dataContext.Moves
                                          .AsNoTracking()
                                          .Where(m => m.Game.GameCode == gameCode)
                                          .OrderBy(m => m.MoveNumber)
                                          .Select(m => new MoveDto(m.MoveNumber, m.Player, m.Notation))
                                          .ToListAsync();

            return Ok(moves);
        }
        [HttpGet]
        [Route("api/[controller]/GetPlayers/{gameCode}")]
        public async Task<IActionResult> GetPlayers(string gameCode)
        {
            var players = await _dataContext.Games
                                            .AsNoTracking()
                                            .Where(g => g.GameCode == gameCode)
                                            .Select(g => new
                                            {
                                                PlayerWhiteId = g.PlayerWhiteId,
                                                PlayerBlackId = g.PlayerBlackId
                                            })
                                            .FirstOrDefaultAsync();

            if (players == null)
                return NotFound("Game not found");

            return Ok(players);
        }
        public class JoinGameRequest
        {
            public string GameCode { get; set; }
            public int PlayerId { get; set; }
        }
        public class CreateGameRequest
        {
            public int CreatorPlayerId { get; set; }
        }
        public record MoveDto(int MoveNumber, int Player, string Notation);
    }
}
