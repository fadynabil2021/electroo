import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../prisma/redis.service';
import { JwtService } from '@nestjs/jwt';
export declare class AuthService {
    private readonly prisma;
    private readonly redisService;
    private readonly jwtService;
    constructor(prisma: PrismaService, redisService: RedisService, jwtService: JwtService);
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
    refreshToken(token: string): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    logout(userId: string): Promise<{
        message: string;
    }>;
    private generateTokens;
    private sanitizeUser;
}
