import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const hash = await bcrypt.hash('password123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@discador.dev' },
    update: { passwordHash: hash, role: 'ADMIN', ramalId: '1000' },
    create: {
      name: 'Admin Discador',
      email: 'admin@discador.dev',
      passwordHash: hash,
      role: 'ADMIN',
      ramalId: '1000',
    },
  });

  await prisma.user.upsert({
    where: { email: 'supervisor@discador.dev' },
    update: { passwordHash: hash, role: 'SUPERVISOR', ramalId: '1001' },
    create: {
      name: 'Supervisor',
      email: 'supervisor@discador.dev',
      passwordHash: hash,
      role: 'SUPERVISOR',
      ramalId: '1001',
    },
  });

  const agent = await prisma.user.upsert({
    where: { email: 'agent@discador.dev' },
    update: { passwordHash: hash, role: 'AGENT', ramalId: '1002' },
    create: {
      name: 'Agente Demo',
      email: 'agent@discador.dev',
      passwordHash: hash,
      role: 'AGENT',
      ramalId: '1002',
    },
  });

  await prisma.doNotCall.upsert({
    where: { phone: '+5511900000000' },
    update: {},
    create: { phone: '+5511900000000', reason: 'Lista Não Me Perturbe (seed)' },
  });

  const leads = [
    { name: 'Maria Silva', phone: '+5511988880001', tags: ['vip'] },
    { name: 'João Souza', phone: '+5511988880002', tags: ['novo'] },
    { name: 'Ana Costa', phone: '+5511988880003', tags: [] },
    { name: 'Pedro Lima', phone: '+5511988880004', tags: ['retorno'] },
    {
      name: 'Bloqueado DNC',
      phone: '+5511900000000',
      tags: ['dnc'],
      dncBlocked: true,
    },
  ];

  const leadIds: string[] = [];
  for (const lead of leads) {
    const row = await prisma.lead.upsert({
      where: { phone: lead.phone },
      update: { name: lead.name, tags: lead.tags, dncBlocked: lead.dncBlocked ?? false },
      create: lead,
    });
    leadIds.push(row.id);
  }

  const campaign = await prisma.campaign.upsert({
    where: { id: '11111111-1111-1111-1111-111111111111' },
    update: {
      name: 'Campanha piloto',
      script:
        'Olá, aqui é da equipe comercial. Esta ligação pode ser gravada. Temos uma condição especial hoje — posso falar um minuto?',
      dialMode: 'POWER',
      active: true,
    },
    create: {
      id: '11111111-1111-1111-1111-111111111111',
      name: 'Campanha piloto',
      script:
        'Olá, aqui é da equipe comercial. Esta ligação pode ser gravada. Temos uma condição especial hoje — posso falar um minuto?',
      dialMode: 'POWER',
      gravarAudio: true,
      windowStart: '00:00',
      windowEnd: '23:59',
      timeZone: 'America/Sao_Paulo',
    },
  });

  await prisma.campaignLead.deleteMany({ where: { campaignId: campaign.id } });
  let position = 0;
  for (const leadId of leadIds.filter((_, index) => leads[index] && !leads[index].dncBlocked)) {
    await prisma.campaignLead.create({
      data: { campaignId: campaign.id, leadId, position },
    });
    position += 1;
  }

  console.log('Seed concluído.');
  console.log('Logins:');
  console.log('  admin@discador.dev / password123');
  console.log('  supervisor@discador.dev / password123');
  console.log(`  agent@discador.dev / password123  (id ${agent.id})`);
  console.log(`Campanha piloto: ${campaign.id}`);
  console.log(`Admin: ${admin.id}`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
