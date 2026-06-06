import 'dotenv/config';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import AppDataSource from '../data-source';

async function runSeeds(ds: DataSource) {
  const queryRunner = ds.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    console.log('🌱 Running database seeds...\n');

    // ── Superadmin user ─────────────────────────────────────
    const passwordHash = await bcrypt.hash('Admin@1234', 12);

    await queryRunner.query(`
      INSERT INTO users (email, password_hash, display_name, role, is_active, is_email_verified)
      VALUES ($1, $2, $3, 'superadmin', true, true)
      ON CONFLICT (email) DO UPDATE
        SET role = 'superadmin', is_active = true
    `, ['admin@ssooss.store', passwordHash, 'Super Admin']);

    console.log('✅ Superadmin created: admin@ssooss.store / Admin@1234');

    // ── Test movie (draft, no video yet) ────────────────────
    const movieResult = await queryRunner.query(`
      INSERT INTO content
        (type, title, slug, description, short_description, language,
         release_year, duration_seconds, age_rating, status, is_premium,
         imdb_rating)
      VALUES
        ('movie', 'Sample Movie', 'sample-movie',
         'A sample movie for testing the OTT platform.',
         'A sample movie for testing.',
         'en', 2024, 7200, 'U/A', 'draft', false, 8.5)
      ON CONFLICT (slug) DO NOTHING
      RETURNING id
    `);

    if (movieResult.length > 0) {
      const movieId = movieResult[0].id;
      // Tag with Action genre (id=1)
      await queryRunner.query(`
        INSERT INTO content_genres (content_id, genre_id) VALUES ($1, 1)
        ON CONFLICT DO NOTHING
      `, [movieId]);
      console.log(`✅ Sample movie created: ${movieId}`);
    }

    // ── Test series ─────────────────────────────────────────
    const seriesResult = await queryRunner.query(`
      INSERT INTO content
        (type, title, slug, description, language, release_year, status)
      VALUES
        ('series', 'Sample Series', 'sample-series',
         'A sample web series for testing.', 'en', 2024, 'draft')
      ON CONFLICT (slug) DO NOTHING
      RETURNING id
    `);

    if (seriesResult.length > 0) {
      const seriesId = seriesResult[0].id;

      // Season 1
      const s1 = await queryRunner.query(`
        INSERT INTO seasons (content_id, season_number, title, total_episodes)
        VALUES ($1, 1, 'Season 1', 2)
        ON CONFLICT DO NOTHING
        RETURNING id
      `, [seriesId]);

      if (s1.length > 0) {
        const seasonId = s1[0].id;
        // Two episodes
        for (let ep = 1; ep <= 2; ep++) {
          await queryRunner.query(`
            INSERT INTO episodes (content_id, season_id, episode_number, title, status)
            VALUES ($1, $2, $3, $4, 'draft')
            ON CONFLICT DO NOTHING
          `, [seriesId, seasonId, ep, `Episode ${ep}`]);
        }
        console.log(`✅ Sample series created: ${seriesId} (S1E1, S1E2)`);
      }
    }

    // ── App config verification ──────────────────────────────
    const configCount = await queryRunner.query(
      `SELECT COUNT(*) FROM app_config`,
    );
    console.log(`✅ App config rows: ${configCount[0].count}`);

    // ── Subscription plans verification ─────────────────────
    const planCount = await queryRunner.query(
      `SELECT COUNT(*) FROM subscription_plans`,
    );
    console.log(`✅ Subscription plans: ${planCount[0].count}`);

    await queryRunner.commitTransaction();
    console.log('\n✅ All seeds completed successfully');

  } catch (err) {
    await queryRunner.rollbackTransaction();
    console.error('❌ Seed failed:', err.message);
    throw err;
  } finally {
    await queryRunner.release();
  }
}

// Bootstrap
AppDataSource.initialize()
  .then((ds) => runSeeds(ds))
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
