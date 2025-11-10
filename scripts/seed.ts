// Скрипт для начальной инициализации базы данных
import { PrismaClient } from '@prisma/client'
import { Role } from '../lib/rbac'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Начинаем инициализацию базы данных...')

  // Создание администратора по умолчанию
  const adminEmail = 'admin@alex.kz'
  const adminPassword = 'Admin123!'

  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  })

  if (existingAdmin) {
    console.log('✅ Администратор уже существует')
  } else {
    const hashedPassword = await bcrypt.hash(adminPassword, 10)
    const admin = await prisma.user.create({
      data: {
        email: adminEmail,
        password: hashedPassword,
        name: 'Администратор',
        role: Role.ADMIN,
        isActive: true,
      },
    })
    console.log('✅ Создан администратор:')
    console.log(`   Email: ${adminEmail}`)
    console.log(`   Пароль: ${adminPassword}`)
    console.log(`   ⚠️  ВАЖНО: Измените пароль после первого входа!`)
  }

  // Создание тестовых пользователей для разработки
  const testUsers = [
    {
      email: 'purchaser@alex.kz',
      password: 'Test123!',
      name: 'Закупщик Тестовый',
      role: Role.PURCHASER,
    },
    {
      email: 'manager@alex.kz',
      password: 'Test123!',
      name: 'Руководитель Тестовый',
      role: Role.MANAGER,
    },
    {
      email: 'viewer@alex.kz',
      password: 'Test123!',
      name: 'Наблюдатель Тестовый',
      role: Role.VIEWER,
    },
  ]

  for (const userData of testUsers) {
    const existing = await prisma.user.findUnique({
      where: { email: userData.email },
    })

    if (!existing) {
      const hashedPassword = await bcrypt.hash(userData.password, 10)
      await prisma.user.create({
        data: {
          email: userData.email,
          password: hashedPassword,
          name: userData.name,
          role: userData.role,
          isActive: true,
        },
      })
      console.log(`✅ Создан тестовый пользователь: ${userData.email}`)
    }
  }

  // Создание шаблонов сообщений
  const templates = [
    {
      name: 'whatsapp_request',
      channel: 'whatsapp',
      subject: null,
      body: `Здравствуйте!

Компания ТОО "Alex" рассматривает возможность закупки следующих позиций:

{positions}

Заявка №: {request_id}
Срок поставки: {deadline}

Просим предоставить коммерческое предложение с указанием цены, сроков поставки и условий оплаты.

С уважением,
Отдел закупок ТОО "Alex"`,
    },
    {
      name: 'email_request',
      channel: 'email',
      subject: 'Запрос коммерческого предложения - Заявка №{request_id}',
      body: `Здравствуйте!

Компания ТОО "Alex" рассматривает возможность закупки следующих позиций:

{positions}

Реквизиты заявки:
- Номер заявки: {request_id}
- Срок предоставления КП: {deadline}

Просим предоставить коммерческое предложение с указанием:
- Цены за единицу и общей стоимости
- Сроков поставки
- Условий оплаты
- Гарантийных обязательств

Коммерческое предложение просим отправить в ответ на это письмо.

С уважением,
Отдел закупок ТОО "Alex"
Контактный телефон: +7 (XXX) XXX-XX-XX`,
    },
  ]

  for (const template of templates) {
    const existing = await prisma.messageTemplate.findUnique({
      where: { name: template.name },
    })

    if (!existing) {
      await prisma.messageTemplate.create({
        data: template,
      })
      console.log(`✅ Создан шаблон: ${template.name}`)
    }
  }

  // Создание системных настроек
  const settings = [
    { key: 'max_requests_per_month', value: '1000', type: 'number' },
    { key: 'max_parallel_tasks', value: '10', type: 'number' },
    { key: 'price_weight', value: '0.7', type: 'number' },
    { key: 'delivery_weight', value: '0.2', type: 'number' },
    { key: 'rating_weight', value: '0.1', type: 'number' },
    { key: 'default_currency', value: 'KZT', type: 'string' },
    { key: 'critical_deadline_hours', value: '48', type: 'number' },
    { key: 'suppliers_to_contact', value: '3', type: 'number' }, // Количество поставщиков для контакта (1-10)
  ]

  for (const setting of settings) {
    const existing = await prisma.systemSetting.findUnique({
      where: { key: setting.key },
    })

    if (!existing) {
      await prisma.systemSetting.create({
        data: setting,
      })
      console.log(`✅ Создана настройка: ${setting.key}`)
    }
  }

  console.log('🎉 Инициализация завершена!')
  console.log('')
  console.log('📝 Учетные данные для входа:')
  console.log('   Администратор: admin@alex.kz / Admin123!')
  console.log('   Закупщик: purchaser@alex.kz / Test123!')
  console.log('   Руководитель: manager@alex.kz / Test123!')
  console.log('   Наблюдатель: viewer@alex.kz / Test123!')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ Ошибка при инициализации:', e)
    await prisma.$disconnect()
    process.exit(1)
  })

