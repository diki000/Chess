using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using chess_backend.EFCore;
using chess_backend.Models;

namespace chess_backend.Services
{
    public class GameFunctions
    {
        private readonly _EFCore _dataContext;

        public GameFunctions(_EFCore dataContext)
        {
            _dataContext = dataContext;
        }
        private string GenerateGameCode()
        {
            var characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
            var random = new Random();
            return new string(Enumerable.Repeat(characters, 8)
                .Select(s => s[random.Next(s.Length)]).ToArray());
        }
        public async Task SaveMove(string gameCode, int playerId, string moveNotation)
        {
            var game = await _dataContext.Games
                                         .Include(g => g.MoveHistory)
                                         .SingleOrDefaultAsync(g => g.GameCode == gameCode);

            if (game == null)
                throw new Exception($"Game with code '{gameCode}' not found");

            int nextNo = game.MoveHistory.Count + 1;

            game.MoveHistory.Add(new Move
            {
                MoveNumber = nextNo,
                Player = playerId,
                Notation = moveNotation
            });

            await _dataContext.SaveChangesAsync();
        }

        public async Task<GameModel> CreateGame(int creatorPlayerId)
        {
            string gameCode;
            do
            {
                gameCode = GenerateGameCode();
            } while (await _dataContext.Games.AnyAsync(g => g.GameCode == gameCode));
            var newGame = new Game
            {
                GameCode = gameCode,
                PlayerWhiteId = creatorPlayerId,
                PlayerBlackId = 0,
                Status = "waiting",
                Created = DateTime.UtcNow,
                Completed = DateTime.MinValue,
                WinnerId = 0,
                MoveHistory = new List<Move>()
            };
            var newGameModel = new GameModel
            {
                gameCode = gameCode,
                playerWhiteId = creatorPlayerId,
                playerBlackId = 0,
                status = "waiting",
                created = DateTime.UtcNow,
                completed = DateTime.MinValue,
                winnerId = 0,
                moveHistory = new List<MoveModel>()
            };

            _dataContext.Games.Add(newGame);
            await _dataContext.SaveChangesAsync();

            return newGameModel;
        }
        public async Task<List<int>> GetPlayersAsync(string gameCode)
        {
            var game = await _dataContext.Games
                                         .AsNoTracking()
                                         .SingleOrDefaultAsync(g => g.GameCode == gameCode);

            if (game == null)
                throw new Exception($"Partija s kodom '{gameCode}' ne postoji");

            var players = new List<int>();

            if (game.PlayerWhiteId != 0) players.Add(game.PlayerWhiteId);
            if (game.PlayerBlackId != 0) players.Add(game.PlayerBlackId);

            return players;
        }
        public async Task<GameModel> JoinGame(string gameCode, int joiningPlayerId)
        {
            var game = await _dataContext.Games
                             .Include(g => g.MoveHistory)
                             .FirstOrDefaultAsync(g => g.GameCode == gameCode);

            if (game is null) throw new Exception("Game not found");

            if (game.PlayerWhiteId == joiningPlayerId || game.PlayerBlackId == joiningPlayerId)
                return ToModel(game);

            if (game.PlayerBlackId != 0)
                throw new Exception("Game already has two players");

            game.PlayerBlackId = joiningPlayerId;
            game.Status = "ongoing";

            await _dataContext.SaveChangesAsync();
            return ToModel(game);
        }
        public async Task CompleteGameAsync(string gameCode, int winnerPlayerId)
        {
            var game = await _dataContext.Games
                             .SingleOrDefaultAsync(g => g.GameCode == gameCode);
            if (game == null) throw new Exception("Game not found");

            if (winnerPlayerId == 0)
            {
                game.Status = "draw";
                game.WinnerId = 0;
            }
            else
            {
                game.Status = "completed";
                game.WinnerId = winnerPlayerId;
            }
            game.Completed = DateTime.UtcNow;

            await _dataContext.SaveChangesAsync();
        }
        private static GameModel ToModel(Game game) => new()
        {
            Id = game.Id,
            playerWhiteId = game.PlayerWhiteId,
            playerBlackId = game.PlayerBlackId,
            status = game.Status,
            created = game.Created,
            completed = game.Completed,
            winnerId = game.WinnerId,
            moveHistory = game.MoveHistory.OrderBy(m => m.MoveNumber)
                                 .Select(m => new MoveModel
                                 {
                                     MoveNumber = m.MoveNumber,
                                     Player = m.Player,
                                     Notation = m.Notation
                                 }).ToList()
            };
        }

}