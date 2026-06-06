import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private readonly dataSource: DataSource) {}

  async getOverview() {
    try {
      // 1. Total users
      const userRes = await this.dataSource.query('SELECT COUNT(*) as count FROM users');
      const totalUsers = parseInt(userRes[0]?.count || '0', 10);

      // 2. Active users (logged in within 30 days)
      const activeUserRes = await this.dataSource.query(
        "SELECT COUNT(*) as count FROM users WHERE last_login_at >= NOW() - INTERVAL '30 days'"
      );
      const activeUsers = parseInt(activeUserRes[0]?.count || '0', 10);

      // 3. Subscription counts and total revenue
      const subRes = await this.dataSource.query('SELECT COUNT(*) as count FROM subscriptions WHERE expires_at > NOW()');
      const activeSubscriptions = parseInt(subRes[0]?.count || '0', 10);

      const revRes = await this.dataSource.query(
        "SELECT SUM(amount_inr) as total FROM payments WHERE status = 'success'"
      );
      const totalRevenue = parseFloat(revRes[0]?.total || '0');

      // 4. Plays and watch time totals
      const playsRes = await this.dataSource.query(
        'SELECT SUM(total_plays) as plays, SUM(total_watch_seconds) as watch_seconds FROM content'
      );
      const totalPlays = parseInt(playsRes[0]?.plays || '0', 10);
      const totalWatchSeconds = parseInt(playsRes[0]?.watch_seconds || '0', 10);

      return {
        totalUsers,
        activeUsers,
        activeSubscriptions,
        totalRevenue,
        totalPlays,
        totalWatchSeconds,
      };
    } catch (err) {
      this.logger.error(`Failed to get analytics overview: ${err.message}`);
      throw err;
    }
  }

  async getPlaybackTrends() {
    try {
      const sql = `
        SELECT 
          COALESCE(DATE_TRUNC('day', created_at)::DATE::TEXT, 'Unknown') as date,
          COUNT(*)::INT as plays,
          COUNT(DISTINCT user_id)::INT as users
        FROM watch_history
        WHERE created_at >= NOW() - INTERVAL '14 days'
        GROUP BY date
        ORDER BY date ASC;
      `;
      return await this.dataSource.query(sql);
    } catch (err) {
      this.logger.error(`Failed to get playback trends: ${err.message}`);
      throw err;
    }
  }

  async getSubscriptionBreakdown() {
    try {
      const sql = `
        SELECT 
          sp.name as plan_name,
          sp.plan_type as plan_type,
          COUNT(s.id)::INT as count,
          COALESCE(SUM(p.amount_inr), 0)::FLOAT as revenue
        FROM subscription_plans sp
        LEFT JOIN subscriptions s ON s.plan_id = sp.id AND s.expires_at > NOW()
        LEFT JOIN payments p ON p.subscription_id = s.id AND p.status = 'success'
        GROUP BY sp.id, sp.name, sp.plan_type
        ORDER BY sp.price_inr ASC;
      `;
      return await this.dataSource.query(sql);
    } catch (err) {
      this.logger.error(`Failed to get subscription breakdown: ${err.message}`);
      throw err;
    }
  }

  async getRevenueTrends() {
    try {
      const sql = `
        SELECT
          DATE_TRUNC('day', p.created_at)::DATE::TEXT as date,
          SUM(p.amount_inr)::FLOAT as revenue,
          COUNT(s.id)::INT as signups
        FROM payments p
        LEFT JOIN subscriptions s ON p.subscription_id = s.id
        WHERE p.status = 'success' AND p.created_at >= NOW() - INTERVAL '30 days'
        GROUP BY date
        ORDER BY date ASC;
      `;
      return await this.dataSource.query(sql);
    } catch (err) {
      this.logger.error(`Failed to get revenue trends: ${err.message}`);
      throw err;
    }
  }

  async getDeviceBreakdown() {
    try {
      const sql = `
        SELECT 
          device_type::TEXT as device_type,
          COUNT(*)::INT as count
        FROM devices
        GROUP BY device_type;
      `;
      return await this.dataSource.query(sql);
    } catch (err) {
      this.logger.error(`Failed to get device breakdown: ${err.message}`);
      throw err;
    }
  }

  async getTopContent() {
    try {
      const sql = `
        SELECT 
          id,
          title,
          type::TEXT as type,
          total_plays::INT as plays,
          total_watch_seconds::INT as watch_seconds
        FROM content
        WHERE status = 'published'
        ORDER BY total_plays DESC
        LIMIT 10;
      `;
      return await this.dataSource.query(sql);
    } catch (err) {
      this.logger.error(`Failed to get top content: ${err.message}`);
      throw err;
    }
  }

  async getSearchAnalytics() {
    try {
      const sql = `
        SELECT 
          query,
          COUNT(*)::INT as count,
          AVG(result_count)::FLOAT as avg_results
        FROM search_queries
        GROUP BY query
        ORDER BY count DESC
        LIMIT 15;
      `;
      return await this.dataSource.query(sql);
    } catch (err) {
      this.logger.error(`Failed to get search analytics: ${err.message}`);
      throw err;
    }
  }

  async getGenrePerformance() {
    try {
      const sql = `
        SELECT 
          g.name as genre_name,
          COUNT(wh.id)::INT as plays,
          COALESCE(SUM(wh.watched_seconds), 0)::INT as watch_seconds
        FROM genres g
        JOIN content_genres cg ON cg.genre_id = g.id
        JOIN watch_history wh ON wh.content_id = cg.content_id
        GROUP BY g.id, g.name
        ORDER BY plays DESC;
      `;
      return await this.dataSource.query(sql);
    } catch (err) {
      this.logger.error(`Failed to get genre performance: ${err.message}`);
      throw err;
    }
  }
}
