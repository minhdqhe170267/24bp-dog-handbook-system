export interface LoginRequest {
    username: string;
    password: string;
}

export interface UserInfo {
    userId: number;
    username: string;
    fullName: string;
    role: string;
    militaryRank?: string;
    unit?: string;
}

export interface LoginResponse {
    token: string;
    tokenType: string;
    expiresIn: number;
    user: UserInfo;
}
