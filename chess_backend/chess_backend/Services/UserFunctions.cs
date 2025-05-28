using chess_backend.EFCore;
using chess_backend.Migrations;
using chess_backend.Models;
using Microsoft.EntityFrameworkCore;

namespace chess_backend.Services
{
    public class UserFunctions
    {
        private EFCore._EFCore _DataContext;
        public UserFunctions(EFCore._EFCore dataContext)
        {
            _DataContext = dataContext;
        }

        public UserModel Login(string username, string password)
        {
            try
            {
                User user = _DataContext.Users.FirstOrDefault(x => x.Username == username);
                if (user == null)
                {
                    throw new Exception("Wrong username");
                }

                bool isPasswordValid = BCrypt.Net.BCrypt.Verify(password, user.Password);
                if (!isPasswordValid)
                {
                    throw new Exception("Wrong password");
                }

                UserModel result = new UserModel()
                {
                    UserId = user.UserId,
                    Username = username,
                    CreatedAt = user.CreatedAt,
                    profilePicture = user.profilePicture
                };

                return result;

            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error: {ex.Message}");
                throw ex;
            }
        }

        public User Register(UserModel user)
        {
            try
            {
                string salt = BCrypt.Net.BCrypt.GenerateSalt(12);
                string hashedPassword = BCrypt.Net.BCrypt.HashPassword(user.Password, salt);

                User newUser = new User()
                {
                    Username = user.Username,
                    Password = hashedPassword,
                    CreatedAt = DateTime.UtcNow
                };

                _DataContext.Users.Add(newUser);
                _DataContext.SaveChanges();

                return newUser; 
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error: {ex.Message}");
                throw ex;
            }
        }
        public UserModel GetUserById(int id)
        {
            try
            {
                User _user = _DataContext.Users.FirstOrDefault(x => x.UserId == id);
                UserModel user = new UserModel()
                {
                    UserId = _user.UserId,
                    Username = _user.Username,
                    CreatedAt = _user.CreatedAt
                };
                return user;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error: {ex.Message}");
                throw ex;
            }
        }
        public async Task UpladImages(HttpRequest request)
        {
            try
            {
                string image = "";
                int userId = int.Parse(request.Form["userID"]);
                var files = request.Form.Files;

                foreach (var file in files)
                {
                    if (file.Length > 0)
                    {

                        string uniqueFileName = Guid.NewGuid().ToString();

                        string fileExtension = Path.GetExtension(file.FileName);

                        string fileName = uniqueFileName + fileExtension;


                        string uploadPath = Path.Combine("assets2", "images");

                        if (!Directory.Exists(uploadPath))
                        {
                            Directory.CreateDirectory(uploadPath);
                        }

                        string filePath = Path.Combine(uploadPath, fileName);

                        using (var fileStream = new FileStream(filePath, FileMode.Create))
                        {
                            await file.CopyToAsync(fileStream);
                        }

                        image = Path.Combine(uploadPath, fileName);

                    }
                }
                
                var user = _DataContext.Users.Where(rev => rev.UserId.Equals(userId)).FirstOrDefault();
                if (user != null)
                {
                    user.profilePicture = image;
                }


            }
            catch (Exception ex)
            {
                using (StreamWriter writer = new StreamWriter("assets2/errorLog.txt"))
                {
                    writer.WriteLine(ex.Message);
                }
                throw new Exception(message: ex.Message);
            }

            _DataContext.SaveChanges();
        }
        public record UserNamePicDto(string UserName, string ProfilePicture);

        public async Task<UserNamePicDto?> GetUserNameAndPictureAsync(int userId)
        {
            var user = await _DataContext.Users
                                         .Where(u => u.UserId == userId)
                                         .Select(u => new UserNamePicDto(
                                             u.Username,
                                             u.profilePicture
                                         ))
                                         .SingleOrDefaultAsync();

            return user;
        }
    }
}

