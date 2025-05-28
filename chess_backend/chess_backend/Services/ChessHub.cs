using chess_backend.Models;
using chess_backend.Services;
using Microsoft.AspNetCore.SignalR;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

public class ChessHub : Hub
{
    private readonly GameFunctions _game;
    private readonly ILogger<ChessHub> _log;

    public ChessHub(GameFunctions game, ILogger<ChessHub> log)
    {
        _game = game;
        _log = log;
    }
    private static Dictionary<string, List<string>> gameConnections = new Dictionary<string, List<string>>();
    private static Dictionary<string, Dictionary<string, string>> gamePlayerColors = new Dictionary<string, Dictionary<string, string>>();
    private static Dictionary<string, string> gameTurns = new Dictionary<string, string>();
    private static Dictionary<string, string> connectionToPlayerId = new Dictionary<string, string>();

    public async Task JoinGame(string gameId, string playerId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, gameId);

        if (!gameConnections.ContainsKey(gameId))
            gameConnections[gameId] = new List<string>();

        if (!gamePlayerColors.ContainsKey(gameId))
            gamePlayerColors[gameId] = new Dictionary<string, string>();

        if (!gameTurns.ContainsKey(gameId))
            gameTurns[gameId] = "w";

        connectionToPlayerId[Context.ConnectionId] = playerId;

        if (gamePlayerColors[gameId].ContainsKey(playerId))
        {
            string existingColor = gamePlayerColors[gameId][playerId];
            await Clients.Client(Context.ConnectionId).SendAsync("ReceiveColor", existingColor);
        }
        else
        {
            string assignedColor = (gamePlayerColors[gameId].Count == 0) ? "w" : "b";
            gamePlayerColors[gameId][playerId] = assignedColor;
            await Clients.Client(Context.ConnectionId).SendAsync("ReceiveColor", assignedColor);
        }

        gameConnections[gameId].Add(Context.ConnectionId);

        string currentTurn = gameTurns[gameId];
        await Clients.Client(Context.ConnectionId).SendAsync("TurnChanged", currentTurn);

        if (gamePlayerColors[gameId].Count == 2)
        {
            await Clients.Group(gameId).SendAsync("GameReady", "Both players have joined. The game can begin!");
        }
    }

    public async Task RequestPlayerColor(string gameId)
    {
        if (!connectionToPlayerId.ContainsKey(Context.ConnectionId))
            return;

        string playerId = connectionToPlayerId[Context.ConnectionId];

        if (gamePlayerColors.ContainsKey(gameId) &&
            gamePlayerColors[gameId].TryGetValue(playerId, out string color))
        {
            await Clients.Client(Context.ConnectionId).SendAsync("ReceiveColor", color);
        }
    }

    public async Task MakeMove(string gameCode, int userId, string move)
    {
        try
        {
            await _game.SaveMove(gameCode, userId, move);
        }
        catch (Exception ex)
        {
            _log.LogError(ex,
                "Failed to save move {Move} for game {Game} (player {User})",
                move, gameCode, userId);
            return;
        }

        await Clients.Group(gameCode).SendAsync("ReceiveMove", move);

        if (gameTurns.TryGetValue(gameCode, out var turn))
        {
            var next = turn == "w" ? "b" : "w";
            gameTurns[gameCode] = next;
            await Clients.Group(gameCode).SendAsync("TurnChanged", next);
        }
    }
    public async Task EndGame(string gameCode, int winnerPlayerId)
    {
        await _game.CompleteGameAsync(gameCode, winnerPlayerId);

        await Clients.Group(gameCode)
                     .SendAsync("GameOver", winnerPlayerId);
    }

}
