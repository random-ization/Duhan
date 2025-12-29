
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const email = 'ssunhr@gmail.com'; // User Identified as Admin

    console.log(`Searching for user: ${email}...`);

    const user = await prisma.user.update({
        where: { email },
        data: {
            tier: 'FREE',
            subscriptionType: 'FREE',
            subscriptionExpiry: null,
        },
    });

    console.log(`✅ Successfully downgraded user ${user.email} (${user.name})`);
    console.log(`   - Tier: ${user.tier}`);
    console.log(`   - Subscription: ${user.subscriptionType}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
