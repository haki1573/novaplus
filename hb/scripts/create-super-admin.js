const path = require('path');
const crypto = require('crypto');
const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');

async function createSuperAdmin() {
  const email = process.env.SUPER_ADMIN_EMAIL
    ?.trim()
    .toLowerCase();

  const password = process.env.SUPER_ADMIN_PASSWORD;
  const firstName =
    process.env.SUPER_ADMIN_FIRST_NAME?.trim() ||
    'NovaPlus';

  const lastName =
    process.env.SUPER_ADMIN_LAST_NAME?.trim() ||
    'Admin';

  if (!email) {
    throw new Error(
      'SUPER_ADMIN_EMAIL bilgisi eksik.',
    );
  }

  if (!password || password.length < 8) {
    throw new Error(
      'SUPER_ADMIN_PASSWORD en az 8 karakter olmalıdır.',
    );
  }

  const databasePath = path.resolve(
    process.cwd(),
    'database.db',
  );

  const database = new Database(databasePath);

  try {
    const existingUser = database
      .prepare(
        `
          SELECT
            id,
            email,
            role
          FROM users
          WHERE LOWER(email) = LOWER(?)
          LIMIT 1
        `,
      )
      .get(email);

    const passwordHash = await bcrypt.hash(
      password,
      12,
    );

    const now = new Date().toISOString();

    if (existingUser) {
      database
        .prepare(
          `
            UPDATE users
            SET
              passwordHash = ?,
              firstName = ?,
              lastName = ?,
              role = 'SUPER_ADMIN',
              gymId = NULL,
              isActive = 1,
              updatedAt = ?
            WHERE id = ?
          `,
        )
        .run(
          passwordHash,
          firstName,
          lastName,
          now,
          existingUser.id,
        );

      console.log(
        `✅ Mevcut kullanıcı SUPER_ADMIN olarak güncellendi: ${email}`,
      );

      return;
    }

    database
      .prepare(
        `
          INSERT INTO users (
            id,
            email,
            passwordHash,
            firstName,
            lastName,
            role,
            gymId,
            isActive,
            createdAt,
            updatedAt
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
      )
      .run(
        crypto.randomUUID(),
        email,
        passwordHash,
        firstName,
        lastName,
        'SUPER_ADMIN',
        null,
        1,
        now,
        now,
      );

    console.log(
      `✅ SUPER_ADMIN hesabı oluşturuldu: ${email}`,
    );
  } finally {
    database.close();
  }
}

createSuperAdmin().catch((error) => {
  console.error(
    '❌ Super Admin oluşturulamadı:',
    error.message,
  );

  process.exit(1);
});