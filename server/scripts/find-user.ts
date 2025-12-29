
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const partialId = '0fca6e60';
    console.log(`Searching for user with ID starting with: ${partialId}...`);

    const users = await prisma.user.findMany({
        where: {
            id: {
                startsWith: partialId
            }
        },
        select: {
            id: true,
            email: true,
            name: true,
            tier: true,
            subscriptionType: true
        }
    });

    if (users.length === 0) {
        console.log('❌ No user found.');
    } else {
        console.log('✅ User(s) found:');
        users.forEach(u => {
            console.log(`- ID: ${u.id}`);
            console.log(`  Email: ${u.email}`);
            console.log(`  Current Tier: ${u.tier}`);
        });
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
