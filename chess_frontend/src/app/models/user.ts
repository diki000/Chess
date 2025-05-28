export class User {
    constructor(
        public userId: number,
        public username: string,
        public password: string,
        public gamesPlayed: number,
        public gamesWon: number,
        public profilePicture: string,
        public accessToken: string
    ) {
        this.userId = userId;
        this.username = username;
        this.password = password;
        this.gamesPlayed = gamesPlayed;
        this.gamesWon = gamesWon;
        this.profilePicture = profilePicture;
        this.accessToken = accessToken;
    }
}
