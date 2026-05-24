import { AuthService } from './auth.service';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    register(dto: any): Promise<{
        accessToken: string;
        refreshToken: string;
        user: any;
    }>;
    login(dto: any): Promise<{
        accessToken: string;
        refreshToken: string;
        user: any;
    }>;
    googleLogin(dto: any): Promise<{
        accessToken: string;
        refreshToken: string;
        user: any;
    }>;
    requestPhoneOtp(phone: string): Promise<{
        message: string;
        phone: string;
        expiresIn: number;
    }>;
    verifyPhoneOtp(phone: string, otp: string): Promise<{
        accessToken: string;
        refreshToken: string;
        user: any;
    }>;
    refresh(refreshToken: string): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    logout(req: any): Promise<{
        message: string;
    }>;
    verifyEmail(token: string): Promise<{
        message: string;
    }>;
}
