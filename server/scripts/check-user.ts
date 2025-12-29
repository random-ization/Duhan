
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const userId = '0fca6e60-5d55-4aaf-8580-207151c688b7'; // ssunhr@gmail.com
    console.log(`Checking subscription status for user: ${userId}...`);

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            email: true,
            name: true,
            tier: true,
            subscriptionType: true,
            subscriptionExpiry: true
        }
    });

    if (!user) {
        console.log('❌ User not found.');
    } else {
        console.log('✅ User found:');
        console.log(`  Name: ${user.name}`);
        console.log(`  Email: ${user.email}`);
        console.log(`  Tier: ${user.tier}`);
        console.log(`  Subscription: ${user.subscriptionType}`);
        console.log(`  Expiry: ${user.subscriptionExpiry}`);
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
