const fs = require('fs').promises;
const path = require('path');
const pool = require('../config/database.js');

class CleanupService {
  constructor() {
    this.IMAGE_DIR = path.join(__dirname, '..', 'images');
    this.BATCH_SIZE = 100;
    this.isRunning = false;
    
    // Default: 365 days
    this.config = {
      value: 365,
      unit: 'days'
    };
    
    this.intervalId = null;
  }

  async start() {
    console.log('🧹 Cleanup service initialized');
    console.log(`   Delete posts older than: ${this.config.value} ${this.config.unit}`);
    console.log(`   Image directory: ${this.IMAGE_DIR}`);
    
    this.scheduleCleanup();
    
  }

  scheduleCleanup() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }

    let checkInterval;
    switch (this.config.unit) {
      case 'seconds':
        checkInterval = 1000; // Check every second
        break;
      case 'minutes':
        checkInterval = 10000; // Check every 10 seconds
        break;
      case 'hours':
        checkInterval = 60000; // Check every minute
        break;
      case 'days':
      default:
        checkInterval = 3600000; // Check every hour
        break;
    }

    console.log(`⏰ Auto-checking every ${checkInterval / 1000} seconds`);

    this.intervalId = setInterval(async () => {
      await this.safeCleanup();
    }, checkInterval);
  }

  setSeconds(seconds) {
    this.config = { value: seconds, unit: 'seconds' };
    console.log(`⚙️ Delete after: ${seconds} seconds`);
    this.scheduleCleanup();
  }

  setMinutes(minutes) {
    this.config = { value: minutes, unit: 'minutes' };
    console.log(`⚙️ Delete after: ${minutes} minutes`);
    this.scheduleCleanup();
  }

  setHours(hours) {
    this.config = { value: hours, unit: 'hours' };
    console.log(`⚙️ Delete after: ${hours} hours`);
    this.scheduleCleanup();
  }

  setDays(days) {
    this.config = { value: days, unit: 'days' };
    console.log(`⚙️ Delete after: ${days} days`);
    this.scheduleCleanup();
  }

  setTime(value, unit) {
    this.config = { value, unit };
    console.log(`⚙️ Delete after: ${value} ${unit}`);
    this.scheduleCleanup();
  }

  getConfig() {
    return { ...this.config };
  }

  getIntervalSQL() {
    const unitMap = {
      'seconds': 'SECOND',
      'minutes': 'MINUTE',
      'hours': 'HOUR',
      'days': 'DAY'
    };
    return `${this.config.value} ${unitMap[this.config.unit]}`;
  }

  async safeCleanup() {
    if (this.isRunning) return { skipped: true };
    return await this.cleanup();
  }

  async cleanup() {
    this.isRunning = true;
    const startTime = Date.now();

    let stats = {
      postsDeleted: 0,
      imagesDeleted: 0,
      skipped: 0
    };

    try {
      // Get expired posts (both soft-deleted and active)
      const [posts] = await pool.query(
        `SELECT id, filenames, is_deleted
         FROM posts 
         WHERE created_at <= DATE_SUB(NOW(), INTERVAL ${this.getIntervalSQL()})
         LIMIT ?`,
        [this.BATCH_SIZE]
      );

      if (posts.length === 0) {
        this.isRunning = false;
        return stats;
      }

      console.log(`\n🗑️ Found ${posts.length} posts to delete (older than ${this.config.value} ${this.config.unit})`);

      for (const post of posts) {
        try {
          // Delete associated image files
          if (post.filenames) {
            const filenames = post.filenames.split(',').map(f => f.trim()).filter(f => f);
            
            for (const filename of filenames) {
              const deleted = await this.deleteFile(filename);
              if (deleted) stats.imagesDeleted++;
            }
          }

          // Delete post from database
          await pool.query('DELETE FROM posts WHERE id = ?', [post.id]);
          stats.postsDeleted++;
          
          console.log(`   ✅ Deleted post #${post.id} (${post.is_deleted ? 'was soft-deleted' : 'active'})`);
          
        } catch (err) {
          console.error(`   ❌ Failed to delete post #${post.id}:`, err.message);
          stats.skipped++;
        }
      }

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      
      console.log(`\n✅ Cleanup complete (${duration}s):`);
      console.log(`   Posts deleted: ${stats.postsDeleted}`);
      console.log(`   Images deleted: ${stats.imagesDeleted}`);
      if (stats.skipped > 0) console.log(`   Skipped (errors): ${stats.skipped}`);

    } catch (err) {
      console.error('❌ Cleanup failed:', err.message);
    } finally {
      this.isRunning = false;
    }

    return stats;
  }

  async deleteFile(filename) {
    try {
      if (!filename) return false;

      // Handle different filename formats
      // Could be: "image.jpg" or "/uploads/image.jpg" or "http://domain.com/uploads/image.jpg"
      let cleanFilename = filename;
      
      // Remove URL prefix if present
      if (cleanFilename.includes('/')) {
        cleanFilename = path.basename(cleanFilename);
      }
      
      const filePath = path.join(this.IMAGE_DIR, cleanFilename);
      
      try {
        await fs.access(filePath);
        await fs.unlink(filePath);
        console.log(`   🖼️ Deleted image: ${cleanFilename}`);
        return true;
      } catch {
        // File doesn't exist - that's OK
        console.log(`   ⚠️ Image not found: ${cleanFilename}`);
        return false;
      }
    } catch (err) {
      console.error(`   ❌ Failed to delete image: ${filename}`, err.message);
      return false;
    }
  }

  // Manual delete single post
  async deletePost(postId) {
    const [posts] = await pool.query('SELECT * FROM posts WHERE id = ?', [postId]);
    if (posts.length === 0) return false;

    const post = posts[0];
    
    // Delete images
    if (post.filenames) {
      const filenames = post.filenames.split(',').map(f => f.trim()).filter(f => f);
      for (const filename of filenames) {
        await this.deleteFile(filename);
      }
    }

    // Delete from database
    await pool.query('DELETE FROM posts WHERE id = ?', [postId]);
    return true;
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('⏹️ Cleanup service stopped');
    }
  }
}

const cleanupService = new CleanupService();
module.exports = cleanupService;