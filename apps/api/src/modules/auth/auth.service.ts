import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../prisma/redis.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: any) {
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
      throw new ConflictException('Email or phone already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email,
        phone: dto.phone,
        passwordHash,
        role: dto.role || 'CUSTOMER',
        isEmailVerified: true, // Auto verify for MVP speed
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

  async login(dto: any) {
    const email = dto.email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is suspended');
    }

    const tokens = await this.generateTokens(user.id, user.role);
    return { user: this.sanitizeUser(user), ...tokens };
  }

  async googleLogin(dto: any) {
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
    } else if (!user.googleId) {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { googleId: dto.googleId, authProvider: 'GOOGLE' },
      });
    }

    const tokens = await this.generateTokens(user.id, user.role);
    return { user: this.sanitizeUser(user), ...tokens };
  }

  async requestPhoneOtp(phone: string) {
    if (!/^\+20[0-9]{10}$/.test(phone)) {
      throw new BadRequestException('Phone must be a valid Egyptian number (+20XXXXXXXXXX)');
    }

    // Rate limiting check
    const attemptsKey = `otp_attempts:${phone}`;
    const attempts = await this.redisService.get(attemptsKey);
    if (attempts && parseInt(attempts) >= 5) {
      throw new BadRequestException('Too many OTP attempts. Please try again in an hour.');
    }

    // Generate 6-digit OTP (for development, use 123456 as default, otherwise random)
    const otp = process.env.NODE_ENV === 'production' 
      ? Math.floor(100000 + Math.random() * 90000).toString()
      : '123456';

    // Store OTP in redis with 5-minute TTL
    await this.redisService.set(`otp:${phone}`, otp, 300);

    // Increment attempts
    const newAttempts = attempts ? parseInt(attempts) + 1 : 1;
    await this.redisService.set(attemptsKey, newAttempts.toString(), 3600);

    // 16. Twilio SMS OTP Delivery
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
        } else {
          console.log(`[Twilio SMS] Successfully sent OTP code to ${phone}`);
        }
      } catch (err) {
        console.error('[Twilio SMS Exception]', err);
      }
    } else {
      console.log(`[SMS-MOCK] Twilio not configured. Sent OTP ${otp} to phone ${phone}`);
    }

    return { message: 'OTP sent successfully', phone, expiresIn: 300 };
  }

  async verifyPhoneOtp(phone: string, otp: string) {
    const storedOtp = await this.redisService.get(`otp:${phone}`);
    if (!storedOtp || storedOtp !== otp) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    // Clear OTP
    await this.redisService.del(`otp:${phone}`);

    let user = await this.prisma.user.findUnique({
      where: { phone },
    });

    if (!user) {
      // Create guest/new user
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

  async refreshToken(token: string) {
    try {
      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_REFRESH_SECRET || 'different-super-secret-refresh-token-key-256-bit-long-value-for-security',
      });

      const storedHash = await this.redisService.get(`refresh_token:${payload.sub}`);
      const incomingHash = crypto.createHash('sha256').update(token).digest('hex');

      if (!storedHash || storedHash !== incomingHash) {
        throw new UnauthorizedException('Invalid or revoked refresh token');
      }

      const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user || !user.isActive) {
        throw new UnauthorizedException('User no longer exists or is suspended');
      }

      const tokens = await this.generateTokens(user.id, user.role);
      return tokens;
    } catch (err) {
      throw new UnauthorizedException('Token refresh failed');
    }
  }

  async logout(userId: string) {
    await this.redisService.del(`refresh_token:${userId}`);
    return { message: 'Logout successful' };
  }

  private async generateTokens(userId: string, role: string) {
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

  private sanitizeUser(user: any) {
    const { passwordHash, ...sanitized } = user;
    return sanitized;
  }
}
