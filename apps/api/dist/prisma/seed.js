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
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt = __importStar(require("bcrypt"));
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('Seeding database...');
    const passwordHash = await bcrypt.hash('password123', 12);
    const admin = await prisma.user.upsert({
        where: { email: 'admin@alexfood.com' },
        update: {},
        create: {
            email: 'admin@alexfood.com',
            name: 'Adel Admin',
            phone: '+201011111111',
            passwordHash,
            role: 'ADMIN',
            isEmailVerified: true,
            isPhoneVerified: true,
        },
    });
    const riderUser = await prisma.user.upsert({
        where: { email: 'rider@alexfood.com' },
        update: {},
        create: {
            email: 'rider@alexfood.com',
            name: 'Ramy Rider',
            phone: '+201022222222',
            passwordHash,
            role: 'RIDER',
            isEmailVerified: true,
            isPhoneVerified: true,
        },
    });
    const riderProfile = await prisma.riderProfile.upsert({
        where: { userId: riderUser.id },
        update: {},
        create: {
            userId: riderUser.id,
            vehicleType: 'Scooter',
            plateNumber: 'س ي ر ٩٦٢٥',
            isOnline: true,
            lastLatitude: 31.2001,
            lastLongitude: 29.9187,
        },
    });
    const customer = await prisma.user.upsert({
        where: { email: 'customer@alexfood.com' },
        update: {},
        create: {
            email: 'customer@alexfood.com',
            name: 'Karim Customer',
            phone: '+201033333333',
            passwordHash,
            role: 'CUSTOMER',
            isEmailVerified: true,
            isPhoneVerified: true,
        },
    });
    const catEgyptian = await prisma.category.upsert({
        where: { slug: 'egyptian' },
        update: {},
        create: {
            nameEn: 'Traditional Egyptian',
            nameAr: 'أكلات مصرية شعبية',
            slug: 'egyptian',
            description: 'Authentic local Egyptian food',
            displayOrder: 1,
        },
    });
    const catSeafood = await prisma.category.upsert({
        where: { slug: 'seafood' },
        update: {},
        create: {
            nameEn: 'Sea Food',
            nameAr: 'مأكولات بحرية',
            slug: 'seafood',
            description: 'Fresh seafood from the Mediterranean Sea',
            displayOrder: 2,
        },
    });
    const catDesserts = await prisma.category.upsert({
        where: { slug: 'desserts' },
        update: {},
        create: {
            nameEn: 'Desserts',
            nameAr: 'حلويات',
            slug: 'desserts',
            description: 'Sweet Egyptian and Alexandrian desserts',
            displayOrder: 3,
        },
    });
    const koshary = await prisma.menuItem.upsert({
        where: { slug: 'koshary' },
        update: {},
        create: {
            categoryId: catEgyptian.id,
            nameEn: 'Koshary Alexandria',
            nameAr: 'كشري اسكندراني',
            slug: 'koshary',
            descriptionEn: 'Traditional Egyptian dish with lentils, rice, pasta, and spicy tomato sauce',
            descriptionAr: 'طبق كشري مصري تقليدي بالعدس والأرز والمكرونة والصلصة الحارة والتقلية',
            basePrice: 45.00,
            isAvailable: true,
            isFeatured: true,
            displayOrder: 1,
            calories: 650,
            modifierGroups: {
                create: [
                    {
                        nameEn: 'Size',
                        nameAr: 'الحجم',
                        minSelection: 1,
                        maxSelection: 1,
                        isRequired: true,
                        displayOrder: 1,
                        options: {
                            create: [
                                { nameEn: 'Small', nameAr: 'صغير', additionalPrice: 0, isDefault: true },
                                { nameEn: 'Medium', nameAr: 'وسط', additionalPrice: 15.00 },
                                { nameEn: 'Large', nameAr: 'كبير', additionalPrice: 25.00 },
                            ],
                        },
                    },
                    {
                        nameEn: 'Additions',
                        nameAr: 'إضافات',
                        minSelection: 0,
                        maxSelection: 3,
                        isRequired: false,
                        displayOrder: 2,
                        options: {
                            create: [
                                { nameEn: 'Extra Sauce', nameAr: 'صلصة زيادة', additionalPrice: 5.00 },
                                { nameEn: 'Extra Onion', nameAr: 'بصل مقرمش زيادة', additionalPrice: 5.00 },
                                { nameEn: 'Extra Daqqa', nameAr: 'دقة زيادة', additionalPrice: 3.00 },
                            ],
                        },
                    },
                ],
            },
        },
    });
    await prisma.menuItem.upsert({
        where: { slug: 'hawawshi' },
        update: {},
        create: {
            categoryId: catEgyptian.id,
            nameEn: 'Hawawshi Baladi',
            nameAr: 'حواوشي بلدي اسكندراني',
            slug: 'hawawshi',
            descriptionEn: 'Spiced minced meat baked in a crispy Egyptian baladi bread',
            descriptionAr: 'لحم مفروم متبل يخبز داخل خبز بلدي مصري مقرمش',
            basePrice: 65.00,
            isAvailable: true,
            isFeatured: true,
            displayOrder: 2,
            calories: 550,
        },
    });
    await prisma.menuItem.upsert({
        where: { slug: 'branzo' },
        update: {},
        create: {
            categoryId: catSeafood.id,
            nameEn: 'Alexandrian Branzo',
            nameAr: 'قاروص سنجاري اسكندراني',
            slug: 'branzo',
            descriptionEn: 'Baked Mediterranean Sea Bass fish with Alexandrian Singari herbs and vegetables',
            descriptionAr: 'سمك قاروص البحر المتوسط مشوي بالخلطة السنجاري الاسكندرانية بالخضار والبهارات',
            basePrice: 180.00,
            isAvailable: true,
            isFeatured: true,
            displayOrder: 1,
        },
    });
    await prisma.menuItem.upsert({
        where: { slug: 'sayadiya-rice' },
        update: {},
        create: {
            categoryId: catSeafood.id,
            nameEn: 'Sayadiya Rice',
            nameAr: 'أرز صيادية بالبصل',
            slug: 'sayadiya-rice',
            descriptionEn: 'Traditional dark caramelized onion rice served with seafood',
            descriptionAr: 'أرز بني صيادية مطبوخ بالبصل المكرمل يقدم مع المأكولات البحرية',
            basePrice: 30.00,
            isAvailable: true,
            displayOrder: 2,
        },
    });
    await prisma.menuItem.upsert({
        where: { slug: 'umm-ali' },
        update: {},
        create: {
            categoryId: catDesserts.id,
            nameEn: 'Umm Ali (Traditional Pudding)',
            nameAr: 'أم علي بالمكسرات والقشطة',
            slug: 'umm-ali',
            descriptionEn: 'Baked puff pastry pudding with milk, cream, and fresh nuts',
            descriptionAr: 'طاجن أم علي بالرقاق المخبوز باللبن والقشطة والمسكرات الطازجة',
            basePrice: 45.00,
            isAvailable: true,
            isFeatured: true,
            displayOrder: 1,
        },
    });
    await prisma.menuItem.upsert({
        where: { slug: 'roz-bel-laban' },
        update: {},
        create: {
            categoryId: catDesserts.id,
            nameEn: 'Roz bel Laban',
            nameAr: 'أرز باللبن اسكندراني بالجيلاتي',
            slug: 'roz-bel-laban',
            descriptionEn: 'Creamy Egyptian rice pudding topped with local vanilla ice cream',
            descriptionAr: 'أرز باللبن كريمي مثلج مغطى ببولة آيس كريم فانيليا',
            basePrice: 30.00,
            isAvailable: true,
            displayOrder: 2,
        },
    });
    await prisma.coupon.upsert({
        where: { code: 'ALEX10' },
        update: {},
        create: {
            code: 'ALEX10',
            type: 'PERCENTAGE',
            value: 10,
            minOrderAmount: 50.00,
            isActive: true,
            validFrom: new Date(),
            validUntil: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
        },
    });
    await prisma.coupon.upsert({
        where: { code: 'FREE50' },
        update: {},
        create: {
            code: 'FREE50',
            type: 'FREE_DELIVERY',
            value: 0,
            minOrderAmount: 100.00,
            isActive: true,
            validFrom: new Date(),
            validUntil: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
        },
    });
    await prisma.setting.upsert({
        where: { key: 'restaurant_status' },
        update: {},
        create: {
            key: 'restaurant_status',
            value: 'OPEN',
        },
    });
    console.log('Seeding finished successfully.');
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map