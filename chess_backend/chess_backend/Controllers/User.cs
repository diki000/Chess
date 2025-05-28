using chess_backend.Models;
using chess_backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace chess_backend.Controllers
{
    [ApiController]
    public class UserController : Controller
    {
        private readonly UserFunctions _db;
        private readonly IConfiguration _configuration;
        public UserController(EFCore._EFCore ef_DataContext, IConfiguration configuration)
        {
            _db = new UserFunctions(ef_DataContext);
            _configuration = configuration;
        }

        [HttpPost]
        [Route("api/[controller]/Register")]
        public async Task<IActionResult> Register(UserModel userModel)
        {
            try
            {
                var user = _db.Register(userModel);
                var claims = new[] {
                    new Claim(JwtRegisteredClaimNames.Sub, _configuration["Jwt:Subject"]),
                    new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
                    new Claim(JwtRegisteredClaimNames.Iat, DateTime.UtcNow.ToString()),
                    new Claim("UserId", user.UserId.ToString()),
                    new Claim("UserName", user.Username),

            };
                var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_configuration["Jwt:Key"]));
                var signIn = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
                var token = new JwtSecurityToken(
                    _configuration["Jwt:Issuer"],
                    _configuration["Jwt:Audience"], 
                    claims,
                    expires: DateTime.UtcNow.AddMinutes(100),
                    signingCredentials: signIn);


                var accessToken = new JwtSecurityTokenHandler().WriteToken(token);
                UserModel result = new UserModel()
                {
                    UserId = user.UserId,
                    Username = user.Username,
                    CreatedAt = user.CreatedAt,
                    profilePicture = user.profilePicture,
                    AccessToken = accessToken
                };
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpPost]
        [Route("api/[controller]/Login")]
        public async Task<IActionResult> Login(UserModel _userData)
        {
            try
            {
                _userData = _db.Login(_userData.Username, _userData.Password);
                var claims = new[] {
                    new Claim(JwtRegisteredClaimNames.Sub, _configuration["Jwt:Subject"]),
                    new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
                    new Claim(JwtRegisteredClaimNames.Iat, DateTime.UtcNow.ToString()),
                    new Claim("UserId", _userData.UserId.ToString()),
                    new Claim("UserName", _userData.Username),

            };
                var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_configuration["Jwt:Key"]));
                var signIn = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
                var token = new JwtSecurityToken(
                    _configuration["Jwt:Issuer"],
                    _configuration["Jwt:Audience"],
                    claims,
                    expires: DateTime.UtcNow.AddMinutes(100),
                    signingCredentials: signIn);


                _userData.AccessToken = new JwtSecurityTokenHandler().WriteToken(token);
                return Ok(_userData);

            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }
        [HttpPost]
        [Route("api/[controller]/UploadImage")]
        public async Task<IActionResult> UploadImage()
        {
            try
            {
                int userId = int.Parse(Request.Form["userID"]!);
                var files = Request.Form.Files;

                await _db.UpladImages(Request);

                return Ok();
            }
            catch (Exception ex)
            {
                using (StreamWriter writer = new StreamWriter("assets2/errorLog.txt"))
                {
                    writer.WriteLine(ex.Message);
                }
                Console.WriteLine(ex.Message + ex.StackTrace);
                return BadRequest(ex);
            }
        }
        [HttpGet, Authorize]
        [Route("api/[controller]/GetUserById")]
        public IActionResult getUserById([FromQuery] int userId)
        {
            try
            {
                UserModel user = _db.GetUserById(userId);

                return Ok(user);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }
        [HttpGet]
        [Route("api/[controller]/UserNameAndPicture/{userId}")]
        public async Task<IActionResult> GetUserNameAndPicture(int userId)
        {
            var dto = await _db.GetUserNameAndPictureAsync(userId);
            return dto is null ? NotFound() : Ok(dto);
        }
    }
}
