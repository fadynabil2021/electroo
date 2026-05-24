"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const redis_service_1 = require("../../prisma/redis.service");
const jwt_1 = require("@nestjs/jwt");
const bcrypt = __importStar(require("bcrypt"));
const crypto = __importStar(require("crypto"));
let AuthService = class AuthService {
    prisma;
    redisService;
    jwtService;
    constructor(prisma, redisService, jwtService) {
        this.prisma = prisma;
        this.redisService = redisService;
        this.jwtService = jwtService;
    }
    async register(dto) {
        const email = dto.email.toLowerCase().trim();
        const existing = await this.prisma.user.findFirst({
            where: {
                OR: [
                    { email },
                    { phone: dto.phone }
                ]
            }
        });
        if (existing) {
            throw new common_1.ConflictException('Email or phone already registered');
        }
        const passwordHash = await bcrypt.hash(dto.password, 12);
        const user = await this.prisma.user.create({
            data: {
                name: dto.name,
                email,
                phone: dto.phone,
                passwordHash,
                role: dto.role || 'CUSTOMER',
                isEmailVerified: true,
                isPhoneVerified: true,
            },
        });
        if (dto.role === 'RIDER') {
            await this.prisma.riderProfile.create({
                data: {
                    userId: user.id,
                    vehicleType: 'Motorcycle',
                    plateNumber: 'EGP-1234',
                }
            });
        }
        const tokens = await this.generateTokens(user.id, user.role);
        return { user: this.sanitizeUser(user), ...tokens };
    }
    async login(dto) {
        const email = dto.email.toLowerCase().trim();
        const user = await this.prisma.user.findUnique({
            where: { email },
        });
        if (!user || !user.passwordHash) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
        if (!isMatch) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        if (!user.isActive) {
            throw new common_1.UnauthorizedException('Account is suspended');
        }
        const tokens = await this.generateTokens(user.id, user.role);
        return { user: this.sanitizeUser(user), ...tokens };
    }
    async googleLogin(dto) {
        let user = await this.prisma.user.findUnique({
            where: { email: dto.email.toLowerCase() },
        });
        if (!user) {
            user = await this.prisma.user.create({
                data: {
                    name: dto.name,
                    email: dto.email.toLowerCase(),
                    authProvider: 'GOOGLE',
                    googleId: dto.googleId,
                    role: 'CUSTOMER',
                    isEmailVerified: true,
                },
            });
        }
        else if (!user.googleId) {
            user = await this.prisma.user.update({
                where: { id: user.id },
                data: { googleId: dto.googleId, authProvider: 'GOOGLE' },
            });
        }
        const tokens = await this.generateTokens(user.id, user.role);
        return { user: this.sanitizeUser(user), ...tokens };
    }
    async requestPhoneOtp(phone) {
        if (!/^\+20[0-9]{10}$/.test(phone)) {
            throw new common_1.BadRequestException('Phone must be a valid Egyptian number (+20XXXXXXXXXX)');
        }
        const attemptsKey = `otp_attempts:${phone}`;
        const attempts = await this.redisService.get(attemptsKey);
        if (attempts && parseInt(attempts) >= 5) {
            throw new common_1.BadRequestException('Too many OTP attempts. Please try again in an hour.');
        }
        const otp = process.env.NODE_ENV === 'production'
            ? Math.floor(100000 + Math.random() * 90000).toString()
            : '123456';
        await this.redisService.set(`otp:${phone}`, otp, 300);
        const newAttempts = attempts ? parseInt(attempts) + 1 : 1;
        await this.redisService.set(attemptsKey, newAttempts.toString(), 3600);
        const twilioSid = process.env.TWILIO_ACCOUNT_SID;
        const twilioToken = process.env.TWILIO_AUTH_TOKEN;
        const twilioFrom = process.env.TWILIO_FROM_NUMBER;
        if (twilioSid && twilioToken && twilioFrom) {
            try {
                const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`;
                const auth = Buffer.from(`${twilioSid}:${twilioToken}`).toString('base64');
                const params = new URLSearchParams();
                params.append('To', phone);
                params.append('From', twilioFrom);
                params.append('Body', `Your Alex Food activation code is: ${otp}. Valid for 5 minutes.`);
                const response = await fetch(twilioUrl, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Basic ${auth}`,
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: params.toString(),
                });
                if (!response.ok) {
                    const errData = await response.json();
                    console.error('[Twilio Error]', errData);
                }
                else {
                    console.log(`[Twilio SMS] Successfully sent OTP code to ${phone}`);
                }
            }
            catch (err) {
                console.error('[Twilio SMS Exception]', err);
            }
        }
        else {
            console.log(`[SMS-MOCK] Twilio not configured. Sent OTP ${otp} to phone ${phone}`);
        }
        return { message: 'OTP sent successfully', phone, expiresIn: 300 };
    }
    async verifyPhoneOtp(phone, otp) {
        const storedOtp = await this.redisService.get(`otp:${phone}`);
        if (!storedOtp || storedOtp !== otp) {
            throw new common_1.BadRequestException('Invalid or expired OTP');
        }
        await this.redisService.del(`otp:${phone}`);
        let user = await this.prisma.user.findUnique({
            where: { phone },
        });
        if (!user) {
            user = await this.prisma.user.create({
                data: {
                    name: `User_${phone.slice(-4)}`,
                    phone,
                    authProvider: 'PHONE',
                    role: 'CUSTOMER',
                    isPhoneVerified: true,
                },
            });
        }
        const tokens = await this.generateTokens(user.id, user.role);
        return { user: this.sanitizeUser(user), ...tokens };
    }
    async refreshToken(token) {
        try {
            const payload = this.jwtService.verify(token, {
                secret: process.env.JWT_REFRESH_SECRET || 'different-super-secret-refresh-token-key-256-bit-long-value-for-security',
            });
            const storedHash = await this.redisService.get(`refresh_token:${payload.sub}`);
            const incomingHash = crypto.createHash('sha256').update(token).digest('hex');
            if (!storedHash || storedHash !== incomingHash) {
                throw new common_1.UnauthorizedException('Invalid or revoked refresh token');
            }
            const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
            if (!user || !user.isActive) {
                throw new common_1.UnauthorizedException('User no longer exists or is suspended');
            }
            const tokens = await this.generateTokens(user.id, user.role);
            return tokens;
        }
        catch (err) {
            throw new common_1.UnauthorizedException('Token refresh failed');
        }
    }
    async logout(userId) {
        await this.redisService.del(`refresh_token:${userId}`);
        return { message: 'Logout successful' };
    }
    async generateTokens(userId, role) {
        const payload = { sub: userId, role };
        const accessToken = await this.jwtService.signAsync(payload, {
            secret: process.env.JWT_ACCESS_SECRET || 'super-secret-access-token-key-256-bit-long-value-for-security',
            expiresIn: '15m',
        });
        const refreshToken = await this.jwtService.signAsync(payload, {
            secret: process.env.JWT_REFRESH_SECRET || 'different-super-secret-refresh-token-key-256-bit-long-value-for-security',
            expiresIn: '7d',
        });
        const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
        await this.redisService.set(`refresh_token:${userId}`, tokenHash, 7 * 24 * 60 * 60);
        return { accessToken, refreshToken };
    }
    sanitizeUser(user) {
        const { passwordHash, ...sanitized } = user;
        return sanitized;
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        redis_service_1.RedisService,
        jwt_1.JwtService])
], AuthService);
//# sourceMappingURL=auth.service.js.map