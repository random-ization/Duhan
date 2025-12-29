
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany({
        select: {
            id: true,
            email: true,
            name: true,
            role: true,
            tier: true,
            subscriptionType: true,
        },
        take: 10,
    });

    console.log('--- User List ---');
    users.forEach((u) => {
        console.log(`[${u.role}] ${u.name} (${u.email}) - Tier: ${u.tier}, Sub: ${u.subscriptionType}`);
    });
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
